// supabase/functions/analyze-receipt/index.ts
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// セキュリティ設定（React画面からの通信を許可する）
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // ブラウザの事前確認（CORS）への対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Reactから送られてきた画像（Base64形式）を受け取る
    const { imageBase64 } = await req.json()
    if (!imageBase64) throw new Error("画像データがありません")

    // 2. Supabaseに登録したGoogleのAPIキーを取り出す
    // @ts-ignore
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_VISION_API_KEY')
    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_API_KEY}`

    // 3. Google Vision API (テキスト検出) に画像を投げる
    const visionResponse = await fetch(visionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [
          {
            image: { content: imageBase64 },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION' }]
          }
        ]
      })
    })

    const visionResult = await visionResponse.json()

    // 4. 解析された「全文のテキスト」を抜き出す
    const fullText = visionResult.responses?.[0]?.fullTextAnnotation?.text || ""

    // 5. テキストをReactに返す
    return new Response(
      JSON.stringify({ text: fullText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || String(error) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})