import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface OCRRequest {
  imageUrl: string
  features: string[]
  languageHints?: string[]
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    const { imageUrl, features = ['TEXT_DETECTION'], languageHints = ['fr', 'en'] }: OCRRequest = await req.json()

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing imageUrl parameter' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // Get Google Cloud Vision API key from environment
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Cloud Vision API not configured',
          fallback: 'Please configure GOOGLE_CLOUD_VISION_API_KEY environment variable'
        }),
        { 
          status: 503,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        }
      )
    }

    // Prepare Google Cloud Vision API request
    const visionRequest = {
      requests: [
        {
          image: {
            source: {
              imageUri: imageUrl
            }
          },
          features: features.map(feature => ({
            type: feature,
            maxResults: 50
          })),
          imageContext: {
            languageHints: languageHints
          }
        }
      ]
    }

    // Call Google Cloud Vision API
    const visionResponse = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(visionRequest)
      }
    )

    if (!visionResponse.ok) {
      const errorData = await visionResponse.json()
      throw new Error(`Google Vision API error: ${errorData.error?.message || visionResponse.statusText}`)
    }

    const visionData = await visionResponse.json()
    const annotations = visionData.responses[0]

    if (annotations.error) {
      throw new Error(`Vision API error: ${annotations.error.message}`)
    }

    // Process text annotations
    const textAnnotations = annotations.textAnnotations || []
    const fullTextAnnotation = annotations.fullTextAnnotation

    let fullText = ''
    let confidence = 0
    let detectedLanguage = 'unknown'

    if (fullTextAnnotation) {
      fullText = fullTextAnnotation.text || ''
      
      // Calculate average confidence
      const pages = fullTextAnnotation.pages || []
      if (pages.length > 0) {
        const confidences = pages.flatMap(page => 
          page.blocks?.flatMap(block => 
            block.paragraphs?.flatMap(paragraph => 
              paragraph.words?.map(word => word.confidence || 0) || []
            ) || []
          ) || []
        )
        confidence = confidences.length > 0 
          ? confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length 
          : 0
      }

      // Detect language from text properties
      if (fullTextAnnotation.pages?.[0]?.property?.detectedLanguages?.[0]) {
        detectedLanguage = fullTextAnnotation.pages[0].property.detectedLanguages[0].languageCode
      }
    } else if (textAnnotations.length > 0) {
      // Fallback to basic text annotations
      fullText = textAnnotations[0].description || ''
      confidence = 0.7 // Default confidence for basic detection
    }

    // Analyze content type based on extracted text
    const contentAnalysis = analyzeExtractedText(fullText)

    return new Response(
      JSON.stringify({
        success: true,
        fullText,
        confidence,
        detectedLanguage,
        textAnnotations: textAnnotations.slice(0, 10), // Limit response size
        contentAnalysis,
        processingInfo: {
          method: 'google_vision',
          featuresUsed: features,
          textLength: fullText.length,
          annotationCount: textAnnotations.length
        }
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )

  } catch (error) {
    console.error('OCR processing error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'OCR processing failed',
        fallback: 'Consider using the image analysis without OCR preprocessing'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      }
    )
  }
})

function analyzeExtractedText(text: string): {
  contentType: 'text' | 'math' | 'science' | 'mixed' | 'unknown'
  indicators: {
    mathKeywords: number
    scienceKeywords: number
    textKeywords: number
    mathSymbols: number
  }
  confidence: number
} {
  if (!text || text.trim().length === 0) {
    return {
      contentType: 'unknown',
      indicators: { mathKeywords: 0, scienceKeywords: 0, textKeywords: 0, mathSymbols: 0 },
      confidence: 0
    }
  }

  const lowerText = text.toLowerCase()
  
  // Define keyword sets
  const mathKeywords = [
    'équation', 'equation', 'calcul', 'résoudre', 'solve', 'dérivée', 'derivative',
    'intégrale', 'integral', 'limite', 'limit', 'fonction', 'function',
    'variable', 'inconnue', 'unknown', 'racine', 'root', 'puissance', 'power'
  ]
  
  const scienceKeywords = [
    'expérience', 'experiment', 'hypothèse', 'hypothesis', 'observation',
    'réaction', 'reaction', 'molécule', 'molecule', 'atome', 'atom',
    'force', 'énergie', 'energy', 'vitesse', 'velocity', 'accélération'
  ]
  
  const textKeywords = [
    'lettre', 'letter', 'dissertation', 'essay', 'rédaction', 'composition',
    'paragraphe', 'paragraph', 'phrase', 'sentence', 'grammaire', 'grammar',
    'orthographe', 'spelling', 'vocabulaire', 'vocabulary', 'style', 'analyse'
  ]

  // Count keyword occurrences
  const mathCount = mathKeywords.filter(keyword => lowerText.includes(keyword)).length
  const scienceCount = scienceKeywords.filter(keyword => lowerText.includes(keyword)).length
  const textCount = textKeywords.filter(keyword => lowerText.includes(keyword)).length

  // Count mathematical symbols
  const mathSymbols = /[+\-*/=<>∫∑√π∞αβγδε()[\]{}]/g
  const mathSymbolCount = (text.match(mathSymbols) || []).length

  // Determine content type
  let contentType: 'text' | 'math' | 'science' | 'mixed' | 'unknown' = 'unknown'
  let confidence = 0

  const totalIndicators = mathCount + scienceCount + textCount + (mathSymbolCount > 5 ? 1 : 0)
  
  if (totalIndicators === 0) {
    contentType = text.length > 50 ? 'text' : 'unknown'
    confidence = text.length > 50 ? 0.6 : 0.3
  } else {
    const mathScore = mathCount + (mathSymbolCount > 5 ? 2 : 0)
    const scienceScore = scienceCount
    const textScore = textCount + (text.length > 100 ? 1 : 0)

    if (mathScore > scienceScore && mathScore > textScore) {
      contentType = textScore > 0 ? 'mixed' : 'math'
      confidence = 0.8
    } else if (scienceScore > textScore) {
      contentType = textScore > 0 ? 'mixed' : 'science'
      confidence = 0.8
    } else {
      contentType = 'text'
      confidence = 0.9
    }
  }

  return {
    contentType,
    indicators: {
      mathKeywords: mathCount,
      scienceKeywords: scienceCount,
      textKeywords: textCount,
      mathSymbols: mathSymbolCount
    },
    confidence
  }
}