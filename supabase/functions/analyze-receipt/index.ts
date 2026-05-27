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

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // 1. フィルタマスタの取得
    const { data: filterRules } = await supabase.from('m_filter_rules').select('*').eq('is_active', true)

    // ⭐️ 2. 学習データ（過去の修正履歴）を取得する！
    // 直近100件の「間違えた文字」と「正解の文字」を取得して、AIへのプロンプトに混ぜ込みます。
    const { data: learningLogs } = await supabase.from('ai_learning_logs').select('*').order('created_at', { ascending: false }).limit(100)

    // 学習データから、AIへの指示文（Few-Shotプロンプト）を作る
    let learningPrompt = "";
    if (learningLogs && learningLogs.length > 0) {
      learningPrompt = "\n【過去の修正履歴（重要ルール）】\n以下の文字が含まれている場合は、右側の正しい商品名に変換して出力してください。\n"
      // 同じ修正を何度も教えないように重複を排除する
      const uniqueRules = new Map<string, string>();
      learningLogs.forEach((log: any) => uniqueRules.set(log.original_text, log.corrected_text));
      uniqueRules.forEach((corrected, original) => {
        learningPrompt += `・「${original}」と見えたら → 「${corrected}」とする\n`;
      });
    }

    // 3. Gemini API 呼び出し
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? ""
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`

    // ⭐️ プロンプトに学習データを合体させる！
    const systemPrompt = `画像にあるレシートから商品名、単価、個数を抽出して以下のJSONフォーマットのみで出力してください。
解説、挨拶、マークダウンの枠（\`\`\`json等）は一切含めず、最初の文字は必ず"{"、最後の文字は必ず"}"にしてください。
単価は割引などを加味した1個あたりの最終的な数値を計算して入れてください。
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
        contents: [{ parts: [{ text: systemPrompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] }]
      })
    })

    const aiData = await response.json()
    let rawAiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // クレンジング処理
    if (rawAiText.includes("```")) rawAiText = rawAiText.replace(/```json/g, "").replace(/```/g, "")
    rawAiText = rawAiText.trim()
    const jsonMatch = rawAiText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error("AIの応答から有効なJSON構造が検出されませんでした。")

    const cleanJsonText = jsonMatch[0]
    let parsedData
    try { parsedData = JSON.parse(cleanJsonText) } catch (err) { throw new Error(`JSONパースエラー: AIの生成データが破損しています。`) }

    // マスタフィルタリングロジック
    if (parsedData.items && Array.isArray(parsedData.items)) {
      const normalizeText = (text: string) => text.toUpperCase().normalize("NFKC")
      parsedData.items = parsedData.items.map((item: any) => {
        if (!item.name) return item
        const itemNameNormalized = normalizeText(item.name)
        let isExcluded = false; let assignedCategoryId = "CAT_UNKNOWN"

        for (const rule of filterRules || []) {
          const ruleKeywordNormalized = normalizeText(rule.keyword)
          let isMatch = rule.match_type === 'equals' ? (itemNameNormalized === ruleKeywordNormalized) : (itemNameNormalized.includes(ruleKeywordNormalized))
          if (isMatch) {
            if (rule.action_type === 'exclude') isExcluded = true
            else if (rule.action_type === 'category_assign') assignedCategoryId = rule.target_category_id
            break
          }
        }
        return { ...item, category_id: assignedCategoryId, is_filtered: isExcluded }
      })
    }

    return new Response(JSON.stringify(parsedData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })

  } catch (error) {
    return new Response(JSON.stringify({ items: [], error: error instanceof Error ? error.message : "Internal Error" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 })
  }
})