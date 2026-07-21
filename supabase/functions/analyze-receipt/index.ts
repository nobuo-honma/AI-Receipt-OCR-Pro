import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const fetchWithRetry = async (url: string, options: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    if (response.ok) return response;
    const errorText = await response.text();
    if (response.status === 503 || response.status === 429) {
      if (i === maxRetries - 1) throw new Error(`API エラー: ${response.status} ${errorText}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      continue;
    }
    throw new Error(`Google API エラー: ${response.status} ${errorText}`);
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { imageBase64 } = await req.json()
    if (!imageBase64) throw new Error("画像データがありません。")

    // Google Cloud Vision API でOCR
    const visionApiKey = Deno.env.get("GOOGLE_VISION_API_KEY") ?? ""
    if (!visionApiKey) throw new Error("GOOGLE_VISION_API_KEYが設定されていません。")

    const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`
    const visionResponse = await fetchWithRetry(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requests: [{
          image: { content: imageBase64 },
          features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
          imageContext: { languageHints: ["ja"] }
        }]
      })
    })

    const visionData = await (visionResponse as Response).json()

    if (visionData.responses?.[0]?.error) {
      throw new Error(`Vision API エラー: ${visionData.responses[0].error.message}`)
    }

    const fullText = visionData.responses?.[0]?.fullTextAnnotation?.text || ""
    const blocks = visionData.responses?.[0]?.textAnnotations || []

    if (!fullText || blocks.length === 0) {
      throw new Error("画像からテキストを読み取れませんでした。")
    }

    // 座標情報(blocks)をそのまま返す
    return new Response(JSON.stringify({ text: fullText, blocks: blocks }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    })

  } catch (error: any) {
    console.error("🔥 Edge Function 内部エラー:", error);
    return new Response(
      JSON.stringify({ text: "", blocks: [], error: error.message || "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    )
  }
})