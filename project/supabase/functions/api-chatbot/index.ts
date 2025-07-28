import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "npm:@supabase/supabase-js@2"
import { createGroqClient, getSystemGroqClient } from "../_shared/groq-client.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
}

interface ProcessingLog {
  step: string
  timestamp: string
  data: any
  success: boolean
  error?: string
}

interface ContentAnalysis {
  contentType: 'text' | 'math' | 'science' | 'mixed' | 'unknown'
  subject: string
  confidence: number
  hasEquations: boolean
  hasText: boolean
  hasHandwriting: boolean
  textContent?: string
  reasoning: string
}

interface UserContextAnalysis {
  intent: 'text_help' | 'math_help' | 'science_help' | 'general_help' | 'unknown'
  keywords: string[]
  confidence: number
  reasoning: string
}

interface ChatbotRequest {
  from?: string // Phone number for WhatsApp
  webUserId?: string // UUID for web users
  sessionId?: string // Session tracking
  source?: 'whatsapp' | 'web'
  text?: string
  imageUrl?: string
  chatbotType?: string
  userAgent?: string
}

serve(async (req: Request) => {
  const processingLogs: ProcessingLog[] = []
  
  const addLog = (step: string, data: any, success: boolean = true, error?: string) => {
    processingLogs.push({
      step,
      timestamp: new Date().toISOString(),
      data,
      success,
      error
    })
  }

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    })
  }

  try {
    addLog('REQUEST_START', { method: req.method, url: req.url })

    const requestData: ChatbotRequest = await req.json()
    addLog('MESSAGE_PARSED', { 
      hasFrom: !!requestData.from,
      hasWebUserId: !!requestData.webUserId,
      hasText: !!requestData.text,
      hasImageUrl: !!requestData.imageUrl,
      source: requestData.source,
      chatbotType: requestData.chatbotType 
    })

    // Validate request data based on source
    const { from, webUserId, sessionId, source = 'whatsapp', text, imageUrl, chatbotType, userAgent } = requestData

    // Determine user identifier based on source
    let userIdentifier: string
    if (source === 'web') {
      if (!webUserId) {
        addLog('VALIDATION_ERROR', { source, webUserId }, false, 'Missing webUserId for web source')
        return new Response(
          JSON.stringify({ 
            error: 'Missing required field: webUserId for web source',
            processingLogs 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
      userIdentifier = webUserId
    } else {
      if (!from) {
        addLog('VALIDATION_ERROR', { source, from }, false, 'Missing from field for WhatsApp source')
        return new Response(
          JSON.stringify({ 
            error: 'Missing required field: from for WhatsApp source',
            processingLogs 
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        )
      }
      userIdentifier = from
    }

    if (!text && !imageUrl) {
      addLog('VALIDATION_ERROR', { hasText: !!text, hasImageUrl: !!imageUrl }, false, 'Missing text or imageUrl')
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: text or imageUrl',
          processingLogs 
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      )
    }

    // Route to appropriate chatbot handler
    let response: string
    let whatsappSent = false

    switch (chatbotType) {
      case 'education':
        addLog('EDUCATION_START', { userIdentifier, source, messageLength: text?.length || 0 })
        response = await handleEducationMessage(userIdentifier, source, text, imageUrl, sessionId, userAgent, processingLogs, addLog)
        break
      case 'client':
        addLog('CLIENT_START', { userIdentifier, source })
        response = await handleClientMessage(userIdentifier, source, text, sessionId, userAgent, processingLogs, addLog)
        break
      case 'quiz':
        addLog('QUIZ_START', { userIdentifier, source })
        response = await handleQuizMessage(userIdentifier, source, text, sessionId, userAgent, processingLogs, addLog)
        break
      default:
        addLog('DEFAULT_EDUCATION', { chatbotType })
        response = await handleEducationMessage(userIdentifier, source, text, imageUrl, sessionId, userAgent, processingLogs, addLog)
    }

    addLog('PROCESSING_COMPLETE', { 
      responseLength: response.length,
      whatsappSent,
      chatbotType,
      source 
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        response,
        chatbotType,
        whatsappSent,
        source,
        processingLogs
      }),
      {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  } catch (error) {
    addLog('GLOBAL_ERROR', { error: error.message }, false, error.message)
    console.error('❌ [API-CHATBOT] Global error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        processingLogs
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})

// Enhanced Groq API call with retry mechanism
async function callGroqWithRetry(
  groq: any,
  messages: any[],
  model: string,
  temperature: number = 0.7,
  maxTokens: number = 2048,
  maxRetries: number = 3,
  addLog: Function
): Promise<any> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      addLog('GROQ_API_CALL', { attempt, model, messageCount: messages.length })
      
      const completion = await groq.chat.completions.create({
        messages,
        model,
        temperature,
        max_tokens: maxTokens,
      })
      
      addLog('GROQ_API_SUCCESS', { attempt, responseLength: completion.choices[0]?.message?.content?.length || 0 })
      return completion
      
    } catch (error) {
      lastError = error
      addLog('GROQ_API_ERROR', { attempt, error: error.message }, false, error.message)
      
      // Check if it's a rate limit error
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff: 2s, 4s, 8s
          addLog('GROQ_RETRY_DELAY', { attempt, delay })
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
      
      // Check if it's a deprecated model error
      if (error.message?.includes('decommissioned') || error.message?.includes('deprecated')) {
        if (model !== 'llama3-70b-8192') {
          addLog('GROQ_MODEL_FALLBACK', { originalModel: model, fallbackModel: 'llama3-70b-8192' })
          // Retry with the default model
          try {
            const completion = await groq.chat.completions.create({
              messages,
              model: 'llama3-70b-8192',
              temperature,
              max_tokens: maxTokens,
            })
            addLog('GROQ_FALLBACK_SUCCESS', { model: 'llama3-70b-8192' })
            return completion
          } catch (fallbackError) {
            addLog('GROQ_FALLBACK_ERROR', { error: fallbackError.message }, false)
            throw fallbackError
          }
        }
      }
      
      // For other errors, don't retry
      if (!error.message?.includes('429') && !error.message?.includes('rate limit')) {
        throw error
      }
    }
  }
  
  // All retries exhausted
  addLog('GROQ_RETRIES_EXHAUSTED', { maxRetries }, false, lastError?.message)
  throw lastError || new Error('Groq API call failed after retries')
}

async function handleEducationMessage(
  userIdentifier: string,
  source: string,
  text: string | undefined,
  imageUrl: string | undefined,
  sessionId: string | undefined,
  userAgent: string | undefined,
  processingLogs: ProcessingLog[],
  addLog: Function
): Promise<string> {
  try {
    addLog('IMAGE_CHECK', { hasImage: !!imageUrl, hasText: !!text, source })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Handle different sources
    let student: any = null
    if (source === 'whatsapp') {
      // Get or create student profile for WhatsApp users
      student = await getOrCreateStudentProfile(userIdentifier, supabase, addLog)
      addLog('STUDENT_PROFILE', { studentId: student.id, level: student.level, source })

      // Create or get active education session
      const session = await getOrCreateEducationSession(student.id, supabase, addLog)
      addLog('EDUCATION_SESSION', { sessionId: session.id, source })
    } else {
      // For web users, create a minimal profile for processing
      student = {
        id: userIdentifier,
        phone_number: userIdentifier,
        level: '3ème', // Default level for web users
        user_id: null,
        source: 'web'
      }
      addLog('WEB_USER_PROFILE', { webUserId: userIdentifier, source })
    }

    // Get Groq configuration
    const groqConfig = await getGroqConfigForEducation(student, supabase, addLog)
    addLog('GROQ_CONFIG', { hasApiKey: !!groqConfig.apiKey, model: groqConfig.model, source })

    // Enhanced response generation with robust error handling
    let response: string
    try {
      addLog('ENHANCED_RESPONSE_START', { hasImage: !!imageUrl, source })
      response = await generateEnhancedEducationalResponse(
        text, 
        imageUrl, 
        student, 
        groqConfig, 
        addLog
      )
      addLog('ENHANCED_RESPONSE_SUCCESS', { responseLength: response.length, source })
    } catch (enhancedError) {
      addLog('ENHANCED_RESPONSE_ERROR', { error: enhancedError.message }, false, enhancedError.message)
      console.error('❌ [EDUCATION] Enhanced response failed:', enhancedError)
      
      // Robust fallback to basic response
      try {
        addLog('FALLBACK_RESPONSE_START', { source })
        response = await generateBasicEducationalResponse(text || 'Question sans texte', student, groqConfig, addLog)
        addLog('FALLBACK_RESPONSE_SUCCESS', { responseLength: response.length, source })
      } catch (fallbackError) {
        addLog('FALLBACK_RESPONSE_ERROR', { error: fallbackError.message }, false, fallbackError.message)
        console.error('❌ [EDUCATION] Fallback response also failed:', fallbackError)
        
        // Final fallback - contextual error message
        if (imageUrl) {
          response = "Je rencontre des difficultés pour analyser cette image. Pourriez-vous me décrire ce que vous souhaitez que je vous aide à comprendre ? Par exemple : 'Aidez-moi avec cette lettre' ou 'Expliquez-moi ce problème de mathématiques'."
        } else {
          response = "Je rencontre des difficultés techniques temporaires. Pourriez-vous reformuler votre question ou être plus spécifique sur le type d'aide dont vous avez besoin ?"
        }
        addLog('FINAL_FALLBACK_USED', { responseLength: response.length, source })
      }
    }

    // Save the conversation with proper source handling
    await saveEducationConversation(userIdentifier, source, text, response, sessionId, userAgent, supabase, addLog)
    
    addLog('RESPONSE_GENERATED', { 
      responseLength: response.length,
      hasImage: !!imageUrl,
      source 
    })

    return response

  } catch (error) {
    addLog('EDUCATION_ERROR', { error: error.message, source }, false, error.message)
    console.error('❌ [EDUCATION] Error:', error)
    
    // Return contextual error message based on source
    if (source === 'web') {
      return "Je rencontre des difficultés techniques. Veuillez actualiser la page et réessayer."
    } else {
      return "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard."
    }
  }
}

async function generateEnhancedEducationalResponse(
  text: string | undefined,
  imageUrl: string | undefined,
  student: any,
  groqConfig: any,
  addLog: Function
): Promise<string> {
  try {
    const groq = await createGroqClient(groqConfig.userId)

    if (imageUrl) {
      addLog('IMAGE_PROCESSING_START', { imageUrl: imageUrl.substring(0, 50) + '...' })
      
      // Step 1: Analyze user context from text message
      let userContext: UserContextAnalysis
      try {
        userContext = await analyzeUserContext(text || '', groq, addLog)
        addLog('USER_CONTEXT_ANALYSIS', { 
          intent: userContext.intent, 
          confidence: userContext.confidence 
        })
      } catch (contextError) {
        addLog('USER_CONTEXT_ERROR', { error: contextError.message }, false)
        // Use safe defaults if context analysis fails
        userContext = {
          intent: 'unknown',
          keywords: [],
          confidence: 0.3,
          reasoning: 'Context analysis failed, using defaults'
        }
      }

      // Step 2: Analyze image content with context-aware prompting
      let contentAnalysis: ContentAnalysis
      try {
        contentAnalysis = await analyzeImageContent(imageUrl, userContext, groq, addLog)
        addLog('IMAGE_CONTENT_ANALYSIS', { 
          contentType: contentAnalysis.contentType,
          subject: contentAnalysis.subject,
          confidence: contentAnalysis.confidence 
        })
      } catch (analysisError) {
        addLog('IMAGE_ANALYSIS_ERROR', { error: analysisError.message }, false)
        // Use safe defaults if image analysis fails
        contentAnalysis = {
          contentType: 'unknown',
          subject: 'général',
          confidence: 0.3,
          hasEquations: false,
          hasText: true,
          hasHandwriting: false,
          reasoning: 'Image analysis failed, using safe defaults'
        }
      }

      // Step 3: Generate response with content-specific prompting
      let response: string
      try {
        response = await generateContextualImageResponse(
          text || '', 
          imageUrl, 
          userContext, 
          contentAnalysis, 
          student, 
          groq, 
          addLog
        )
      } catch (responseError) {
        addLog('CONTEXTUAL_RESPONSE_ERROR', { error: responseError.message }, false)
        // Fallback to basic image response
        response = await generateBasicImageResponse(text || '', imageUrl, student, groq, addLog)
      }

      // Step 4: Validate response for hallucinations
      try {
        const validatedResponse = validateEducationalResponse(
          response, 
          userContext, 
          contentAnalysis, 
          text || '',
          addLog
        )
        addLog('IMAGE_PROCESSING_COMPLETE', { 
          finalResponseLength: validatedResponse.length,
          contentType: contentAnalysis.contentType 
        })
        return validatedResponse
      } catch (validationError) {
        addLog('VALIDATION_ERROR', { error: validationError.message }, false)
        // Return unvalidated response if validation fails
        return response
      }

    } else {
      addLog('TEXT_PROCESSING_START', { textLength: text?.length || 0 })
      
      // Handle text-only message with robust error handling
      let userContext: UserContextAnalysis
      try {
        userContext = await analyzeUserContext(text || '', groq, addLog)
        addLog('TEXT_CONTEXT_ANALYSIS', { 
          intent: userContext.intent, 
          confidence: userContext.confidence 
        })
      } catch (contextError) {
        addLog('TEXT_CONTEXT_ERROR', { error: contextError.message }, false)
        userContext = {
          intent: 'general_help',
          keywords: [],
          confidence: 0.5,
          reasoning: 'Context analysis failed, using general help'
        }
      }

      try {
        const completion = await callGroqWithRetry(
          groq,
          [
            {
              role: "system",
              content: generateTextSystemPrompt(student, userContext)
            },
            { role: "user", content: text || 'Question sans contenu spécifique' }
          ],
          groqConfig.model,
          0.7,
          2048,
          3,
          addLog
        )

        const response = completion.choices[0]?.message?.content || 
          "Je suis désolé, je n'ai pas pu générer une réponse appropriée à votre question."

        addLog('TEXT_PROCESSING_COMPLETE', { responseLength: response.length })
        return response
      } catch (groqError) {
        addLog('TEXT_GROQ_ERROR', { error: groqError.message }, false)
        throw new Error(`Erreur lors de la génération de la réponse: ${groqError.message}`)
      }
    }
  } catch (error) {
    addLog('ENHANCED_RESPONSE_FATAL_ERROR', { error: error.message }, false)
    throw error
  }
}

async function generateBasicImageResponse(
  text: string,
  imageUrl: string,
  student: any,
  groq: any,
  addLog: Function
): Promise<string> {
  try {
    addLog('BASIC_IMAGE_RESPONSE_START', { hasText: !!text })
    
    const completion = await callGroqWithRetry(
      groq,
      [
        {
          role: "system",
          content: `Vous êtes un assistant éducatif pour les élèves de ${student.level}. 
          Analysez cette image éducative et aidez l'étudiant de manière appropriée.
          Si vous n'êtes pas sûr du contenu, demandez des clarifications.
          Répondez toujours en français.`
        },
        { 
          role: "user", 
          content: [
            { type: "text", text: text || "Veuillez analyser cette image éducative." },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      'llama3-70b-8192',
      0.7,
      1500,
      3,
      addLog
    )

    const response = completion.choices[0]?.message?.content || 
      "Je ne peux pas analyser cette image pour le moment. Pourriez-vous me décrire ce que vous voyez ou poser une question spécifique ?"

    addLog('BASIC_IMAGE_RESPONSE_SUCCESS', { responseLength: response.length })
    return response

  } catch (error) {
    addLog('BASIC_IMAGE_RESPONSE_ERROR', { error: error.message }, false)
    return "Je rencontre des difficultés pour analyser cette image. Pourriez-vous me décrire le contenu ou poser votre question sous forme de texte ?"
  }
}

async function analyzeUserContext(text: string, groq: any, addLog: Function): Promise<UserContextAnalysis> {
  try {
    if (!text || text.trim().length === 0) {
      return {
        intent: 'unknown',
        keywords: [],
        confidence: 0.3,
        reasoning: 'Empty or missing text'
      }
    }

    const contextPrompt = `Analyze this student message to understand their intent and the type of help they need.

Message: "${text}"

Determine:
1. What type of help they're seeking (text/literature vs math vs science vs general)
2. Key indicators in their language
3. Confidence level of your assessment

Respond in JSON format:
{
  "intent": "text_help|math_help|science_help|general_help|unknown",
  "keywords": ["keyword1", "keyword2"],
  "confidence": 0.8,
  "reasoning": "explanation of your analysis"
}`

    const completion = await callGroqWithRetry(
      groq,
      [
        { role: "system", content: "You are an expert at understanding student intent from their messages." },
        { role: "user", content: contextPrompt }
      ],
      "llama3-70b-8192",
      0.1,
      300,
      2,
      addLog
    )

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    
    return {
      intent: result.intent || 'unknown',
      keywords: result.keywords || [],
      confidence: result.confidence || 0.5,
      reasoning: result.reasoning || 'No analysis available'
    }
  } catch (error) {
    addLog('USER_CONTEXT_ERROR', { error: error.message }, false)
    return {
      intent: 'unknown',
      keywords: [],
      confidence: 0.3,
      reasoning: 'Analysis failed, using fallback'
    }
  }
}

async function analyzeImageContent(
  imageUrl: string, 
  userContext: UserContextAnalysis, 
  groq: any, 
  addLog: Function
): Promise<ContentAnalysis> {
  try {
    const analysisPrompt = `You are an expert educational content analyst. Analyze this image carefully.

User Context: The student's message suggests they want "${userContext.intent}" (confidence: ${userContext.confidence})
Keywords from user: ${userContext.keywords.join(', ')}

CRITICAL INSTRUCTIONS:
1. First, identify what you actually SEE in the image
2. Don't assume content type based on user context alone
3. Look for actual mathematical symbols, equations, numbers vs. text, letters, words
4. Consider handwriting vs. printed text
5. Note any diagrams, charts, or visual elements

Respond in JSON format:
{
  "contentType": "text|math|science|mixed|unknown",
  "subject": "specific subject detected",
  "confidence": 0.9,
  "hasEquations": false,
  "hasText": true,
  "hasHandwriting": true,
  "textContent": "brief description of visible text",
  "reasoning": "detailed explanation of what you see and why you classified it this way"
}`

    const completion = await callGroqWithRetry(
      groq,
      [
        { role: "system", content: "You are an expert at analyzing educational images and identifying their content type accurately." },
        { 
          role: "user", 
          content: [
            { type: "text", text: analysisPrompt },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      "llama3-70b-8192",
      0.05,
      500,
      2,
      addLog
    )

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    
    addLog('IMAGE_ANALYSIS_RESULT', {
      contentType: result.contentType,
      confidence: result.confidence,
      reasoning: result.reasoning?.substring(0, 100) + '...'
    })

    return {
      contentType: result.contentType || 'unknown',
      subject: result.subject || 'général',
      confidence: result.confidence || 0.5,
      hasEquations: result.hasEquations || false,
      hasText: result.hasText || false,
      hasHandwriting: result.hasHandwriting || false,
      textContent: result.textContent || '',
      reasoning: result.reasoning || 'No analysis available'
    }
  } catch (error) {
    addLog('IMAGE_ANALYSIS_ERROR', { error: error.message }, false)
    return {
      contentType: 'unknown',
      subject: 'général',
      confidence: 0.3,
      hasEquations: false,
      hasText: true,
      hasHandwriting: false,
      reasoning: 'Analysis failed, using safe defaults'
    }
  }
}

async function generateContextualImageResponse(
  text: string,
  imageUrl: string,
  userContext: UserContextAnalysis,
  contentAnalysis: ContentAnalysis,
  student: any,
  groq: any,
  addLog: Function
): Promise<string> {
  try {
    // Generate content-specific system prompt
    const systemPrompt = generateImageSystemPrompt(student, userContext, contentAnalysis)
    addLog('SYSTEM_PROMPT_GENERATED', { 
      contentType: contentAnalysis.contentType,
      promptLength: systemPrompt.length 
    })

    // Create user message with context
    const userMessage = text ? 
      `${text}\n\n[Image analysée - Type détecté: ${contentAnalysis.contentType}, Confiance: ${contentAnalysis.confidence}]` :
      `Veuillez analyser cette image éducative. Type détecté: ${contentAnalysis.contentType}`

    const completion = await callGroqWithRetry(
      groq,
      [
        { role: "system", content: systemPrompt },
        { 
          role: "user", 
          content: [
            { type: "text", text: userMessage },
            { type: "image_url", image_url: { url: imageUrl } }
          ]
        }
      ],
      "llama3-70b-8192",
      0.7,
      2000,
      3,
      addLog
    )

    const response = completion.choices[0]?.message?.content || 
      "Je suis désolé, je n'ai pas pu analyser correctement cette image."

    addLog('CONTEXTUAL_RESPONSE_GENERATED', { responseLength: response.length })
    return response

  } catch (error) {
    addLog('CONTEXTUAL_RESPONSE_ERROR', { error: error.message }, false)
    throw error
  }
}

function generateImageSystemPrompt(
  student: any, 
  userContext: UserContextAnalysis, 
  contentAnalysis: ContentAnalysis
): string {
  let basePrompt = `Vous êtes un assistant éducatif spécialisé pour les élèves de ${student.level}.

ANALYSE DU CONTENU:
- Type détecté: ${contentAnalysis.contentType}
- Sujet: ${contentAnalysis.subject}
- Confiance: ${contentAnalysis.confidence}
- Contient des équations: ${contentAnalysis.hasEquations ? 'Oui' : 'Non'}
- Contient du texte: ${contentAnalysis.hasText ? 'Oui' : 'Non'}
- Écriture manuscrite: ${contentAnalysis.hasHandwriting ? 'Oui' : 'Non'}

CONTEXTE UTILISATEUR:
- Intention: ${userContext.intent}
- Mots-clés: ${userContext.keywords.join(', ')}
- Confiance: ${userContext.confidence}`

  // Content-specific instructions
  switch (contentAnalysis.contentType) {
    case 'text':
      basePrompt += `

🔤 CONTENU TEXTUEL DÉTECTÉ
Votre rôle est d'aider avec:
- Lecture et compréhension de textes
- Analyse littéraire et interprétation
- Correction grammaticale et orthographique
- Structure d'essais et argumentation
- Compréhension linguistique

⚠️ CRITIQUE: Ce contenu semble être du texte/littérature. 
NE créez PAS d'équations mathématiques ou de formules scientifiques sauf si elles sont clairement visibles dans l'image.
Concentrez-vous sur la langue, l'écriture et l'analyse littéraire.`
      break

    case 'math':
      basePrompt += `

🔢 CONTENU MATHÉMATIQUE DÉTECTÉ
Votre rôle est d'aider avec:
- Résolution de problèmes mathématiques étape par étape
- Explication de concepts mathématiques
- Travail sur équations et calculs
- Raisonnement mathématique

✅ Ce contenu contient des mathématiques. Vous pouvez utiliser des équations et des calculs.`
      break

    case 'science':
      basePrompt += `

🔬 CONTENU SCIENTIFIQUE DÉTECTÉ
Votre rôle est d'aider avec:
- Explication de concepts scientifiques
- Analyse de problèmes et expériences scientifiques
- Compréhension de principes scientifiques
- Calculs scientifiques

✅ Ce contenu contient des sciences. Vous pouvez utiliser des formules et des concepts scientifiques.`
      break

    case 'mixed':
      basePrompt += `

🔀 CONTENU MIXTE DÉTECTÉ
Analysez soigneusement l'image et:
- Identifiez clairement les différents types de contenu
- Répondez de manière appropriée à chaque partie
- Soyez explicite sur ce que vous observez
- Adaptez votre aide en conséquence`
      break

    default:
      basePrompt += `

❓ CONTENU INCERTAIN
- Analysez d'abord soigneusement ce que vous voyez
- Identifiez clairement le type de contenu
- Demandez des clarifications si nécessaire
- Ne faites pas d'hypothèses sur le contenu`
  }

  basePrompt += `

INSTRUCTIONS GÉNÉRALES:
- Répondez toujours en français
- Soyez encourageant et éducatif
- Adaptez votre niveau au niveau de l'élève (${student.level})
- Si vous n'êtes pas sûr du contenu, demandez des clarifications
- Ne jamais inventer du contenu qui n'est pas visible dans l'image`

  return basePrompt
}

function validateEducationalResponse(
  response: string,
  userContext: UserContextAnalysis,
  contentAnalysis: ContentAnalysis,
  originalText: string,
  addLog: Function
): string {
  addLog('VALIDATION_START', { 
    userIntent: userContext.intent,
    contentType: contentAnalysis.contentType 
  })

  const lowerResponse = response.toLowerCase()
  const lowerText = originalText.toLowerCase()

  // Define indicators
  const mathIndicators = [
    'équation', 'equation', 'x =', 'y =', 'f(x)', 'calcul', 'résoudre',
    'formule', 'formula', 'dérivée', 'intégrale', 'cos(', 'sin(', 'tan(',
    'variable', 'fonction', 'graphique'
  ]

  const textIndicators = [
    'lettre', 'letter', 'dissertation', 'essay', 'texte', 'rédaction',
    'paragraphe', 'composition', 'récit', 'story', 'poème', 'poem',
    'analyse littéraire', 'français', 'littérature', 'grammaire'
  ]

  const hasMathInResponse = mathIndicators.some(term => lowerResponse.includes(term))
  const userWantsTextHelp = (
    userContext.intent === 'text_help' ||
    textIndicators.some(term => lowerText.includes(term)) ||
    contentAnalysis.contentType === 'text'
  )

  // Detect potential hallucination
  const isPotentialHallucination = (
    userWantsTextHelp && 
    hasMathInResponse && 
    !contentAnalysis.hasEquations &&
    contentAnalysis.confidence > 0.6
  )

  if (isPotentialHallucination) {
    addLog('HALLUCINATION_DETECTED', { 
      userIntent: userContext.intent,
      contentType: contentAnalysis.contentType,
      hasMathInResponse 
    }, false, 'Math content in text response')

    const clarificationPrompt = `

🚨 **Attention - Vérification nécessaire**

Il semble que votre image contienne du texte ou de la littérature, mais ma réponse mentionne des éléments mathématiques.

**Veuillez préciser le type de contenu**:
📝 S'agit-il d'une lettre, dissertation, rédaction ou texte littéraire ?
🔢 Ou contient-elle réellement des équations mathématiques ?

**Type d'aide souhaité**:
- ✏️ Correction orthographique/grammaticale
- 📖 Analyse littéraire ou stylistique  
- ✍️ Aide à la rédaction
- 🧮 Explication d'un concept mathématique

Cela m'aidera à vous donner une réponse plus précise et adaptée à votre besoin réel.`

    return response + clarificationPrompt
  }

  // Add confidence warning for low-confidence analysis
  if (contentAnalysis.confidence < 0.6) {
    addLog('LOW_CONFIDENCE_WARNING', { confidence: contentAnalysis.confidence })
    
    const uncertaintyNote = `

🤔 **Note de confiance**: Mon analyse de l'image n'est pas totalement certaine (${(contentAnalysis.confidence * 100).toFixed(0)}% de confiance). 

Si ma réponse ne correspond pas au contenu de votre image, n'hésitez pas à me corriger et à préciser:
- Le type de document (lettre, exercice, dissertation, etc.)
- La matière concernée
- Le type d'aide souhaité`

    return response + uncertaintyNote
  }

  addLog('VALIDATION_COMPLETE', { 
    hallucinationDetected: false,
    confidenceOk: contentAnalysis.confidence >= 0.6 
  })

  return response
}

function generateTextSystemPrompt(student: any, userContext: UserContextAnalysis): string {
  let prompt = `Vous êtes un assistant éducatif pour les élèves de ${student.level}.

CONTEXTE UTILISATEUR:
- Intention détectée: ${userContext.intent}
- Confiance: ${userContext.confidence}
- Mots-clés: ${userContext.keywords.join(', ')}`

  switch (userContext.intent) {
    case 'text_help':
      prompt += `

Vous aidez avec du contenu textuel/littéraire:
- Analyse et compréhension de textes
- Correction grammaticale et orthographique
- Structure d'écriture et argumentation
- Analyse littéraire`
      break

    case 'math_help':
      prompt += `

Vous aidez avec des mathématiques:
- Résolution de problèmes étape par étape
- Explication de concepts mathématiques
- Calculs et équations`
      break

    case 'science_help':
      prompt += `

Vous aidez avec les sciences:
- Concepts scientifiques
- Expériences et observations
- Calculs scientifiques`
      break

    default:
      prompt += `

Aide générale - adaptez-vous au contenu de la question:
- Identifiez d'abord le type de contenu
- Répondez de manière appropriée
- Demandez des clarifications si nécessaire`
  }

  prompt += `

Répondez toujours en français, soyez encourageant et éducatif.`

  return prompt
}

async function generateBasicEducationalResponse(
  text: string,
  student: any,
  groqConfig: any,
  addLog: Function
): Promise<string> {
  try {
    addLog('BASIC_RESPONSE_START', { textLength: text.length })
    
    const groq = await createGroqClient(groqConfig.userId)
    
    const completion = await callGroqWithRetry(
      groq,
      [
        {
          role: "system",
          content: `Vous êtes un assistant éducatif pour les élèves de ${student.level}. 
          Aidez l'étudiant avec sa question de manière claire et encourageante.
          Répondez toujours en français.`
        },
        { role: "user", content: text }
      ],
      groqConfig.model,
      0.7,
      1500,
      3,
      addLog
    )

    const response = completion.choices[0]?.message?.content || 
      "Je suis désolé, je n'ai pas pu générer une réponse appropriée à votre question."

    addLog('BASIC_RESPONSE_SUCCESS', { responseLength: response.length })
    return response

  } catch (error) {
    addLog('BASIC_RESPONSE_ERROR', { error: error.message }, false)
    return "Je rencontre des difficultés pour traiter votre question. Pourriez-vous la reformuler ou être plus spécifique ?"
  }
}

async function handleClientMessage(
  userIdentifier: string,
  source: string,
  text: string | undefined,
  sessionId: string | undefined,
  userAgent: string | undefined,
  processingLogs: ProcessingLog[],
  addLog: Function
): Promise<string> {
  try {
    const groq = await getSystemGroqClient()
    
    const completion = await callGroqWithRetry(
      groq,
      [
        {
          role: "system",
          content: `Vous êtes un assistant de service client pour une entreprise de télécommunications.
          Votre objectif est d'aider les clients avec leurs demandes, problèmes et questions.
          Soyez professionnel, courtois et orienté solution.
          ${source === 'web' ? 'L\'utilisateur vous contacte via votre site web.' : 'L\'utilisateur vous contacte via WhatsApp.'}`
        },
        { role: "user", content: text || 'Demande d\'assistance' }
      ],
      "llama3-70b-8192",
      0.7,
      1500,
      3,
      addLog
    )

    const response = completion.choices[0]?.message?.content || 
      "Je suis désolé, je n'ai pas pu traiter votre demande. Un agent vous contactera bientôt."

    // Save conversation
    await saveClientConversation(userIdentifier, source, text, response, sessionId, userAgent, addLog)

    return response

  } catch (error) {
    addLog('CLIENT_ERROR', { error: error.message, source }, false)
    if (source === 'web') {
      return "Merci pour votre message. Notre équipe du service client vous répondra dans les plus brefs délais."
    } else {
      return "Merci pour votre message. Un agent du service client vous répondra dans les plus brefs délais."
    }
  }
}

async function handleQuizMessage(
  userIdentifier: string,
  source: string,
  text: string | undefined,
  sessionId: string | undefined,
  userAgent: string | undefined,
  processingLogs: ProcessingLog[],
  addLog: Function
): Promise<string> {
  try {
    const groq = await getSystemGroqClient()
    
    const completion = await callGroqWithRetry(
      groq,
      [
        {
          role: "system",
          content: `Vous êtes un maître de quiz qui crée des quiz éducatifs engageants.
          Votre objectif est de rendre l'apprentissage amusant grâce à des questions et défis interactifs.
          Soyez enthousiaste, encourageant et fournissez des commentaires informatifs.
          ${source === 'web' ? 'L\'utilisateur participe via votre site web.' : 'L\'utilisateur participe via WhatsApp.'}`
        },
        { role: "user", content: text || 'Commencer le quiz' }
      ],
      "llama3-70b-8192",
      0.7,
      1500,
      3,
      addLog
    )

    const response = completion.choices[0]?.message?.content || 
      "Bienvenue au quiz ! Êtes-vous prêt à tester vos connaissances ?"

    // Save conversation
    await saveQuizConversation(userIdentifier, source, text, response, sessionId, userAgent, addLog)

    return response

  } catch (error) {
    addLog('QUIZ_ERROR', { error: error.message, source }, false)
    return "Bienvenue au quiz ! Posez-moi une question ou demandez un défi."
  }
}

async function getOrCreateStudentProfile(phoneNumber: string, supabase: any, addLog: Function) {
  try {
    // Check if student exists
    const { data: existingStudent } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .maybeSingle()

    if (existingStudent) {
      // Update last active timestamp
      await supabase
        .from('student_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', existingStudent.id)

      return existingStudent
    }

    // Create new student profile
    const { data: newStudent, error } = await supabase
      .from('student_profiles')
      .insert({
        phone_number: phoneNumber,
        level: '3ème',
        subjects: [],
        preferred_language: 'french'
      })
      .select()
      .single()

    if (error) throw error
    return newStudent

  } catch (error) {
    addLog('STUDENT_PROFILE_ERROR', { error: error.message }, false)
    throw error
  }
}

async function getOrCreateEducationSession(studentId: string, supabase: any, addLog: Function) {
  try {
    // Check for active session
    const { data: activeSession } = await supabase
      .from('education_sessions')
      .select('*')
      .eq('student_id', studentId)
      .is('end_time', null)
      .maybeSingle()

    if (activeSession) {
      return activeSession
    }

    // Create new session
    const { data: newSession, error } = await supabase
      .from('education_sessions')
      .insert({
        student_id: studentId,
        subject: 'général',
        start_time: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return newSession

  } catch (error) {
    addLog('EDUCATION_SESSION_ERROR', { error: error.message }, false)
    throw error
  }
}

async function getGroqConfigForEducation(student: any, supabase: any, addLog: Function) {
  try {
    // Try to get user_id from student profile
    let userId = student.user_id

    if (!userId && student.source !== 'web') {
      // Try to get from profils_utilisateurs
      const { data: userProfile } = await supabase
        .from('profils_utilisateurs')
        .select('id')
        .eq('phone_number', student.phone_number)
        .maybeSingle()

      if (userProfile) {
        userId = userProfile.id
      }
    }

    if (!userId) {
      // Get any available Groq config as fallback
      const { data: anyConfig } = await supabase
        .from('user_groq_config')
        .select('user_id, api_key, model')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (anyConfig) {
        return {
          userId: anyConfig.user_id,
          apiKey: anyConfig.api_key,
          model: anyConfig.model || 'llama3-70b-8192'
        }
      }

      throw new Error('No Groq configuration found')
    }

    // Get user's specific config
    const { data: userConfig } = await supabase
      .from('user_groq_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (userConfig) {
      return {
        userId: userId,
        apiKey: userConfig.api_key,
        model: userConfig.model || 'llama3-70b-8192'
      }
    }

    throw new Error('No Groq configuration found for user')

  } catch (error) {
    addLog('GROQ_CONFIG_ERROR', { error: error.message }, false)
    throw error
  }
}

async function saveEducationConversation(
  userIdentifier: string,
  source: string,
  userMessage: string | undefined,
  botResponse: string,
  sessionId: string | undefined,
  userAgent: string | undefined,
  supabase: any,
  addLog: Function
) {
  try {
    // Save user message if provided
    if (userMessage) {
      await supabase
        .from('customer_conversations')
        .insert({
          phone_number: source === 'whatsapp' ? userIdentifier : null,
          web_user_id: source === 'web' ? userIdentifier : null,
          session_id: sessionId,
          source: source,
          content: userMessage,
          sender: 'user',
          intent: 'education',
          user_agent: userAgent,
          created_at: new Date().toISOString()
        })
    }

    // Save bot response
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: source === 'whatsapp' ? userIdentifier : null,
        web_user_id: source === 'web' ? userIdentifier : null,
        session_id: sessionId,
        source: source,
        content: botResponse,
        sender: 'bot',
        intent: 'education',
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })

    addLog('CONVERSATION_SAVED', { 
      userIdentifier,
      source,
      responseLength: botResponse.length 
    })

  } catch (error) {
    addLog('CONVERSATION_SAVE_ERROR', { error: error.message }, false)
    // Don't throw - this is not critical for the response
    console.error('❌ [EDUCATION] Failed to save conversation:', error)
  }
}

async function saveClientConversation(
  userIdentifier: string,
  source: string,
  userMessage: string | undefined,
  botResponse: string,
  sessionId: string | undefined,
  userAgent: string | undefined,
  addLog: Function
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Save user message if provided
    if (userMessage) {
      await supabase
        .from('customer_conversations')
        .insert({
          phone_number: source === 'whatsapp' ? userIdentifier : null,
          web_user_id: source === 'web' ? userIdentifier : null,
          session_id: sessionId,
          source: source,
          content: userMessage,
          sender: 'user',
          intent: 'client',
          user_agent: userAgent,
          created_at: new Date().toISOString()
        })
    }

    // Save bot response
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: source === 'whatsapp' ? userIdentifier : null,
        web_user_id: source === 'web' ? userIdentifier : null,
        session_id: sessionId,
        source: source,
        content: botResponse,
        sender: 'bot',
        intent: 'client',
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })

    addLog('CLIENT_CONVERSATION_SAVED', { userIdentifier, source })

  } catch (error) {
    addLog('CLIENT_CONVERSATION_SAVE_ERROR', { error: error.message }, false)
    console.error('❌ [CLIENT] Failed to save conversation:', error)
  }
}

async function saveQuizConversation(
  userIdentifier: string,
  source: string,
  userMessage: string | undefined,
  botResponse: string,
  sessionId: string | undefined,
  userAgent: string | undefined,
  addLog: Function
) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

    // Save user message if provided
    if (userMessage) {
      await supabase
        .from('customer_conversations')
        .insert({
          phone_number: source === 'whatsapp' ? userIdentifier : null,
          web_user_id: source === 'web' ? userIdentifier : null,
          session_id: sessionId,
          source: source,
          content: userMessage,
          sender: 'user',
          intent: 'quiz',
          user_agent: userAgent,
          created_at: new Date().toISOString()
        })
    }

    // Save bot response
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: source === 'whatsapp' ? userIdentifier : null,
        web_user_id: source === 'web' ? userIdentifier : null,
        session_id: sessionId,
        source: source,
        content: botResponse,
        sender: 'bot',
        intent: 'quiz',
        user_agent: userAgent,
        created_at: new Date().toISOString()
      })

    addLog('QUIZ_CONVERSATION_SAVED', { userIdentifier, source })

  } catch (error) {
    addLog('QUIZ_CONVERSATION_SAVE_ERROR', { error: error.message }, false)
    console.error('❌ [QUIZ] Failed to save conversation:', error)
  }
}