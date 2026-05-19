// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

declare const Deno: any;

// CORSヘッダー定義
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface FilterRule {
  id: string;
  keyword: string;
  match_type: 'equals' | 'contains';
  action_type: 'exclude' | 'category_assign';
  target_category_id: string;
  is_active: boolean;
}

interface RawReceiptItem {
  name?: string;
  price?: number;
  qty?: number;
}

interface ProcessedReceiptItem {
  name: string;
  price: number;
  qty: number;
  category_id: string;
  is_filtered: boolean;
}

interface ParsedReceiptData {
  items?: RawReceiptItem[];
  error?: string;
}

// 🌟 鉄壁のブラケット平衡カウンタ型パーサー（Deno環境仕様）
const strictExtractJSON = (inputText: string): ParsedReceiptData => {
  let targetText = inputText.trim();

  // マークダウン記号の物理剥奪
  targetText = targetText.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBraceIdx = targetText.indexOf('{');
  if (firstBraceIdx === -1) {
    throw new Error("AIの応答内に有効なJSONブロック（{）が見つかりませんでした。");
  }

  let braceCount = 0;
  let lastBraceIdx = -1;
  let inString = false;
  let escapeActive = false;

  for (let i = firstBraceIdx; i < targetText.length; i++) {
    const char = targetText[i];

    if (char === '"' && !escapeActive) {
      inString = !inString;
    }

    if (char === '\\' && inString) {
      escapeActive = !escapeActive;
    } else {
      escapeActive = false;
    }

    if (!inString) {
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBraceIdx = i;
          break; // 最初の完全なJSONオブジェクトの終端に達したため走査終了
        }
      }
    }
  }

  if (lastBraceIdx === -1) {
    throw new Error("JSON構造の対応する閉じ括弧（}）が不足しているか、途中で切れています。");
  }

  const sanitizedJsonStr = targetText.substring(firstBraceIdx, lastBraceIdx + 1).trim();

  try {
    return JSON.parse(sanitizedJsonStr) as ParsedReceiptData;
  } catch (parseError: any) {
    try {
      const cleanedStr = sanitizedJsonStr
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // 制御コードの完全排除
        .replace(/\\'/g, "'");
      return JSON.parse(cleanedStr) as ParsedReceiptData;
    } catch {
      throw new Error(`JSON構文が不正です。(${parseError.message})`);
    }
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) {
      throw new Error("画像データ(imageBase64)がありません。")
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // フィルタマスタの取得
    const { data: filterRules, error: dbError } = await supabase
      .from('m_filter_rules')
      .select('*')
      .eq('is_active', true) as { data: FilterRule[] | null, error: any }

    if (dbError) throw new Error(`マスタの取得に失敗しました: ${dbError.message}`)

    // Gemini API 呼び出し
    const apiKey = Deno.env.get("GEMINI_API_KEY") ?? ""
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const systemPrompt = `画像にあるレシートから商品名(name)、個数(qty)、金額(price)を抽出して以下のJSONフォーマットのみで出力してください。
解説、挨拶、マークダウンの枠（\`\`\`json等）は一切含めず、最初の文字は必ず"{"、最後の文字は必ず"}"にしてください。
商品の数量が不明な場合はデフォルトで1を設定してください。
金額は数値型(number)で抽出してください。

{
  "items": [
    { "name": "商品名", "price": 100, "qty": 1 }
  ]
}`

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }]
      })
    })

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API エラー: ${response.status} - ${errText}`);
    }

    const aiData = await response.json()
    const rawAiText: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || ""

    // サーバー側で厳密にクレンジングを実行
    const parsedData = strictExtractJSON(rawAiText);

    // マスタフィルタリングロジックの実行
    let processedItems: ProcessedReceiptItem[] = [];

    if (parsedData.items && Array.isArray(parsedData.items)) {
      const normalizeText = (text: string) => {
        return text.toUpperCase().replace(/[\u30a1-\u30f6]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0x60))
      }

      processedItems = parsedData.items.map((item: RawReceiptItem): ProcessedReceiptItem => {
        const name = item.name ? String(item.name) : "不明な商品"
        const price = item.price ? Number(item.price) : 0
        const qty = item.qty ? Number(item.qty) : 1

        const itemNameNormalized = normalizeText(name)
        let isExcluded = false
        let assignedCategoryId = "CAT_UNKNOWN"

        for (const rule of filterRules || []) {
          const ruleKeywordNormalized = normalizeText(rule.keyword)
          let isMatch = false

          if (rule.match_type === 'equals') {
            isMatch = (itemNameNormalized === ruleKeywordNormalized)
          } else {
            isMatch = (itemNameNormalized.includes(ruleKeywordNormalized))
          }

          if (isMatch) {
            if (rule.action_type === 'exclude') {
              isExcluded = true
            } else if (rule.action_type === 'category_assign') {
              assignedCategoryId = rule.target_category_id
            }
            break
          }
        }

        return {
          name,
          price,
          qty,
          category_id: assignedCategoryId,
          is_filtered: isExcluded
        }
      })
    }

    return new Response(
      JSON.stringify({ items: processedItems }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )

  } catch (error) {
    console.error("【Edge Function内部エラー】", error);
    return new Response(
      JSON.stringify({ items: [], error: error instanceof Error ? error.message : "Internal Server Error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    )
  }
})