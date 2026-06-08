// supabase/functions/analyze-receipt/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) throw new Error("画像データがありません。")

    // Supabaseへの接続
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    const { data: learningLogs } = await supabase.from('ai_learning_logs').select('*').order('created_at', { ascending: false }).limit(100)

    let learningPrompt = "";
    if (learningLogs && learningLogs.length > 0) {
      learningPrompt = "\n【重要なルール】以下の文字が含まれている場合は、右側の正しい商品名に変換して出力してください。\n"
      const uniqueRules = new Map<string, string>();
      learningLogs.forEach((log: any) => uniqueRules.set(log.original_text, log.corrected_text));
      uniqueRules.forEach((corrected, original) => {
        learningPrompt += `・「${original}」 → 「${corrected}」\n`;
      });
    }

    // ⭐️ 修正：APIキーが空っぽの場合は、Googleに送る前にここで強制終了させる！
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey || apiKey.trim() === "") {
      throw new Error("🚨 サーバーエラー: GEMINI_API_KEY が Supabase に設定されていません。ターミナルから `supabase secrets set GEMINI_API_KEY=...` を実行してください。");
    }

    // 正しくキーが入っていれば、Googleへ送信！
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`

    const systemPrompt = `あなたは優秀なレシート解析AIです。画像から商品名、単価、個数を抽出してください。
単価は1個あたりの最終的な数値を計算して入れてください。
出力は【必ず】以下のJSONフォーマットのみにしてください。マークダウンや挨拶、解説は一切不要です。
${learningPrompt}

{
  "items": [
    { "name": "商品名", "price": 100, "qty": 1 }
  ]
}`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: systemPrompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API エラー: ${response.status} ${errorText}`);
    }

    const aiData = await response.json()
    let rawAiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    if (rawAiText.includes("```")) {
      rawAiText = rawAiText.replace(/```json/g, "").replace(/```/g, "")
    }
    rawAiText = rawAiText.trim()

    const jsonMatch = rawAiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error(`AIの応答から有効なJSON構造が検出されませんでした。\nAI応答: ${rawAiText}`);

    const cleanJsonText = jsonMatch[0]
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonText)
    } catch (parseErr) {
      throw new Error(`JSONパースエラー: AIの生成データが破損しています。\nデータ: ${cleanJsonText}`)
    }

    return new Response(JSON.stringify(parsedData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

  } catch (error: any) {
    console.error("🔥 Edge Function 内部エラー:", error);
    return new Response(
      JSON.stringify({ items: [], error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }
})