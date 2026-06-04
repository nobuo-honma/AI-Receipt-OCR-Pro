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

    // 学習データ（過去の修正履歴）を取得してプロンプトに混ぜ込む（Few-Shot Learning）
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

    // ⭐️ 修正：Gemini 1.5 Flash に APIリクエストを送信
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? ""
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    const systemPrompt = `あなたは優秀なレシート解析AIです。画像から商品名、単価、個数を抽出してください。
単価は1個あたりの最終的な数値を計算して入れてください。
出力は【必ず】以下のJSONフォーマットのみにしてください。マークダウンや解説は一切不要です。
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
        contents: [{ parts: [{ text: systemPrompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }],
        // ⭐️ 魔法の設定：AIの出力形式を強制的に「JSON」に指定する！（これで余計な文字が絶対に出なくなります）
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    })

    const aiData = await response.json()
    let rawAiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // 念のためのクレンジング（マークダウンのバッククォートを剥がす）
    if (rawAiText.includes("```")) {
      rawAiText = rawAiText.replace(/```json/g, "").replace(/```/g, "")
    }
    rawAiText = rawAiText.trim()

    // ⭐️ JSONの抽出をより強力に
    const jsonMatch = rawAiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error("AIからの生データ:", rawAiText); // 何が返ってきたかログに残す
      throw new Error("AIの応答から有効なJSON構造が検出されませんでした。");
    }

    const cleanJsonText = jsonMatch[0]
    let parsedData;
    try {
      parsedData = JSON.parse(cleanJsonText)
    } catch (parseErr) {
      console.error("パース失敗したテキスト:", cleanJsonText);
      throw new Error(`JSONパースエラー: AIの生成データが破損しています。`)
    }

    // 正常にパースできたらReactに返す
    return new Response(JSON.stringify(parsedData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

  } catch (error) {
    console.error("Edge Function エラー:", error);
    return new Response(JSON.stringify({ items: [], error: error instanceof Error ? error.message : "Internal Error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
  }
})