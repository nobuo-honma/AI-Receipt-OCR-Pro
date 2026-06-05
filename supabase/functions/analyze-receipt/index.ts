// supabase/functions/analyze-receipt/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ⭐️ 自動リトライ関数（混雑時 503 などで弾かれても最大4回まで諦めずにアタックする）
const fetchWithRetry = async (url: string, options: any, maxRetries = 4) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);

    // 成功したらそのまま返す
    if (response.ok) return response;

    const errorText = await response.text();

    // 503(混雑) または 429(リクエスト過多) の場合のみ、少し待ってから再チャレンジ！
    if (response.status === 503 || response.status === 429) {
      if (i === maxRetries - 1) {
        throw new Error(`Google API エラー: ${response.status} ${errorText}`);
      }
      console.log(`⚠️ Googleサーバー混雑中(${response.status})。${i + 1}回目の再試行を待機します...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // 1秒, 2秒, 4秒と待つ
      continue;
    }

    // それ以外の致命的なエラーはすぐに諦める
    throw new Error(`Google API エラー: ${response.status} ${errorText}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) throw new Error("画像データがありません。")

    // Supabaseへの接続と学習データ取得
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

    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? ""
    if (!apiKey) throw new Error("GEMINI_API_KEYが設定されていません。")

    // ⭐️ 修正1：確実に動く「gemini-pro-vision」に戻す
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${apiKey}`

    const systemPrompt = `あなたは優秀なレシート解析AIです。画像から商品名、単価、個数を抽出してください。
単価は1個あたりの最終的な数値を計算して入れてください。
出力は【必ず】以下のJSONフォーマットのみにしてください。マークダウンや挨拶、解説は一切不要です。
${learningPrompt}

{
  "items": [
    { "name": "商品名", "price": 100, "qty": 1 }
  ]
}`

    // ⭐️ 修正2：pro-vision は JSON強制設定(generationConfig) に未対応のため、外してシンプルに送る！
    const response = await fetchWithRetry(apiUrl, {
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
        ]
      })
    })

    const aiData = await (response as Response).json()
    let rawAiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // クレンジング処理（マークダウンブロックを剥がす）
    if (rawAiText.includes("```")) {
      rawAiText = rawAiText.replace(/```json/g, "").replace(/```/g, "")
    }
    rawAiText = rawAiText.trim()

    // JSON抽出
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