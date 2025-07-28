import { supabase } from './supabase';
import { checkSubscriptionStatus } from './subscription'; 
import { createGroqClient } from './groq-config'; 
import { trackChatbotUsage } from './chatbot-router';

interface StudentProfile {
  id: string;
  phone_number: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  level: string;
  subjects: string[];
  preferred_language: string;
}

interface EducationSession {
  id: string;
  student_id: string;
  subject: string;
  topic?: string;
  start_time: Date;
  end_time?: Date;
  duration?: number;
  messages_count: number;
  questions_asked: number;
  correct_answers: number;
  comprehension_score: number;
}

interface MessageAnalysis {
  type: 'question' | 'answer' | 'explanation' | 'other';
  subject?: string;
  topic?: string;
  sentiment: number;
  complexity: number;
  understanding: number;
}

interface Message {
  phoneNumber: string;
  content: string;
  sender: 'user' | 'bot';
  imageUrl?: string;
}

export async function analyzeStudentMessage(message: string, studentId: string): Promise<MessageAnalysis> {
  try {
    // Get student profile to find user_id
    const { data: student } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('id', studentId)
      .single();

    if (!student || !student.user_id) {
      throw new Error('Student profile not found or missing user_id');
    }

    // Create Groq client with user's API key
    const groq = await createGroqClient(student.user_id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an education analyst. Analyze the following student message and provide:
            1. Message type (question/answer/explanation/other)
            2. Subject and topic if identifiable
            3. Sentiment score (-1 to 1)
            4. Complexity level (0 to 1)
            5. Understanding level (0 to 1)
            Format: JSON object with these fields.`
        },
        { role: 'user', content: message }
      ],
      model: 'mixtral-8x7b-32768',
      temperature: 0.3,
      max_tokens: 500,
    });

    const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');

    // Store analysis in database
    await supabase.from('education_analytics').insert({
      student_id: studentId,
      message_type: analysis.type,
      subject: analysis.subject,
      topic: analysis.topic,
      sentiment: analysis.sentiment,
      complexity_level: analysis.complexity,
      understanding_score: analysis.understanding
    });

    return analysis;
  } catch (error) {
    console.error('Error analyzing student message:', error);
    throw error;
  }
}

export async function analyzeStudentImage(imageUrl: string, studentId: string): Promise<MessageAnalysis> {
  try {
    console.log('🖼️ [EDUCATION] Starting enhanced image analysis for student:', studentId);
    
    // Get student profile to find user_id
    const { data: student } = await supabase
      .from('student_profiles')
      .select('user_id')
      .eq('id', studentId)
      .single();

    if (!student || !student.user_id) {
      throw new Error('Student profile not found or missing user_id');
    }

    // Create Groq client with user's API key
    const groq = await createGroqClient(student.user_id);

    // Step 1: Analyze user context if available
    const userContext = await analyzeUserContextFromProfile(student);
    console.log('👤 [EDUCATION] User context:', userContext);

    // Step 2: Enhanced image analysis with context
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: `You are an expert educational content analyst specializing in distinguishing between different types of educational content.

CRITICAL ANALYSIS FRAMEWORK:
1. VISUAL CONTENT IDENTIFICATION:
   - Look for actual mathematical symbols: +, -, =, ×, ÷, ∫, ∑, √, etc.
   - Look for equations with variables: x, y, f(x), etc.
   - Look for geometric shapes, graphs, charts
   - Look for text content: letters, words, sentences, paragraphs
   - Look for handwriting vs. printed text

2. CONTENT TYPE CLASSIFICATION:
   - "text": Letters, essays, stories, literature, written assignments
   - "math": Equations, calculations, mathematical problems, formulas
   - "science": Scientific diagrams, experiments, physics problems, chemistry
   - "mixed": Contains both text and mathematical/scientific elements
   - "unknown": Cannot clearly determine content type

3. CONFIDENCE ASSESSMENT:
   - High confidence (0.8-1.0): Clear visual indicators
   - Medium confidence (0.5-0.7): Some indicators but ambiguous
   - Low confidence (0.0-0.4): Unclear or poor image quality

Student Level: ${student.level}
User Context: ${userContext.preferredSubjects.join(', ')}

RESPOND IN JSON FORMAT:
{
  "type": "question|answer|explanation|other",
  "subject": "specific subject detected",
  "topic": "specific topic if identifiable",
  "sentiment": 0,
  "complexity": 0.5,
  "understanding": 0.5,
  "contentType": "text|math|science|mixed",
  "hasEquations": false,
  "hasText": true,
  "hasHandwriting": false,
  "textContent": "brief description of visible text content",
  "confidence": 0.8,
  "reasoning": "detailed explanation of your analysis and classification"
}`
        },
        { 
          role: 'user', 
          content: [
            { 
              type: "text", 
              text: `Analyze this educational image sent by a ${student.level} student. 
              
CRITICAL: Be extremely careful to distinguish between:
- Pure text content (letters, essays, stories) → classify as "text"
- Mathematical content (equations, calculations) → classify as "math"
- Scientific content (diagrams, experiments) → classify as "science"

Look at what is ACTUALLY visible in the image, not what you might expect.` 
            },
            { 
              type: "image_url", 
              image_url: { url: imageUrl } 
            }
          ]
        }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.05, // Extremely low for consistent analysis
      max_tokens: 500,
    });

    let analysis;
    try {
      analysis = JSON.parse(completion.choices[0]?.message?.content || '{}');
      console.log('📊 [EDUCATION] Raw image analysis:', analysis);
    } catch (parseError) {
      console.error('❌ [EDUCATION] Failed to parse analysis JSON:', parseError);
      analysis = {
        type: 'question',
        subject: 'général',
        contentType: 'unknown',
        confidence: 0.3,
        reasoning: 'Failed to parse analysis'
      };
    }

    // Enhanced validation and confidence adjustment
    analysis = validateAndEnhanceAnalysis(analysis, userContext);
    console.log('✅ [EDUCATION] Enhanced analysis:', analysis);

    // Store analysis in database
    await supabase.from('education_analytics').insert({
      student_id: studentId,
      message_type: analysis.type || 'question',
      subject: analysis.subject,
      topic: analysis.topic,
      sentiment: analysis.sentiment || 0,
      complexity_level: analysis.complexity || 0.5,
      understanding_score: analysis.understanding || 0.5
    });

    console.log('💾 [EDUCATION] Analysis saved to database');
    return analysis;
  } catch (error) {
    console.error('Error analyzing student image:', error);
    // Return default analysis if error occurs
    return {
      type: 'question',
      subject: 'général',
      topic: 'unknown',
      sentiment: 0,
      complexity: 0.5,
      understanding: 0.5
    };
  }
}

async function analyzeUserContextFromProfile(student: any): Promise<any> {
  return {
    level: student.level,
    preferredSubjects: student.subjects || [],
    preferredLanguage: student.preferred_language || 'french'
  };
}

function validateAndEnhanceAnalysis(analysis: any, userContext: any): any {
  // Ensure all required fields exist
  const enhanced = {
    type: analysis.type || 'question',
    subject: analysis.subject || 'général',
    topic: analysis.topic || 'unknown',
    sentiment: analysis.sentiment || 0,
    complexity: analysis.complexity || 0.5,
    understanding: analysis.understanding || 0.5,
    contentType: analysis.contentType || 'unknown',
    hasEquations: analysis.hasEquations || false,
    hasText: analysis.hasText !== false, // Default to true
    hasHandwriting: analysis.hasHandwriting || false,
    textContent: analysis.textContent || '',
    confidence: analysis.confidence || 0.5,
    reasoning: analysis.reasoning || 'No reasoning provided'
  };

  // Adjust confidence based on content type clarity
  if (enhanced.contentType === 'text' && enhanced.hasText && !enhanced.hasEquations) {
    enhanced.confidence = Math.max(enhanced.confidence, 0.7);
  } else if (enhanced.contentType === 'math' && enhanced.hasEquations) {
    enhanced.confidence = Math.max(enhanced.confidence, 0.7);
  } else if (enhanced.contentType === 'unknown') {
    enhanced.confidence = Math.min(enhanced.confidence, 0.4);
  }

  return enhanced;
}

export async function getOrCreateStudentProfile(phoneNumber: string): Promise<StudentProfile> {
  try {
    // Check if student exists
    const { data: existingStudent } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (existingStudent) {
      // Update last active timestamp
      await supabase
        .from('student_profiles')
        .update({ last_active_at: new Date().toISOString() })
        .eq('id', existingStudent.id);

      return existingStudent;
    }

    // Create new student profile
    const { data: newStudent, error } = await supabase
      .from('student_profiles')
      .insert({
        phone_number: phoneNumber,
        level: '3ème', // Default level
        subjects: [],
        preferred_language: 'french'
      })
      .select()
      .single();

    if (error) throw error;
    return newStudent;
  } catch (error) {
    console.error('Error managing student profile:', error);
    throw error;
  }
}

export async function startEducationSession(studentId: string, subject: string): Promise<EducationSession> {
  try {
    const { data: session, error } = await supabase
      .from('education_sessions')
      .insert({
        student_id: studentId,
        subject: subject,
        start_time: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error starting education session:', error);
    throw error;
  }
}

export async function updateSessionStats(
  sessionId: string,
  stats: Partial<EducationSession>
): Promise<void> {
  try {
    await supabase
      .from('education_sessions')
      .update(stats)
      .eq('id', sessionId);
  } catch (error) {
    console.error('Error updating session stats:', error);
    throw error;
  }
}

export async function getStudentAnalytics(studentId: string) {
  try {
    const { data: analytics } = await supabase
      .from('education_analytics')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    const { data: sessions } = await supabase
      .from('education_sessions')
      .select('*')
      .eq('student_id', studentId)
      .order('start_time', { ascending: false });

    return {
      analytics,
      sessions,
      summary: calculateStudentSummary(analytics, sessions)
    };
  } catch (error) {
    console.error('Error fetching student analytics:', error);
    throw error;
  }
}

function calculateStudentSummary(analytics: any[], sessions: any[]) {
  // Calculate overall statistics and progress
  const totalSessions = sessions?.length || 0;
  if (totalSessions === 0) {
    return {
      totalSessions: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      accuracy: 0,
      averageComprehension: 0,
      subjectProgress: {}
    };
  }

  const totalQuestions = sessions.reduce((sum, session) => sum + (session.questions_asked || 0), 0);
  const correctAnswers = sessions.reduce((sum, session) => sum + (session.correct_answers || 0), 0);
  const averageComprehension = sessions.reduce((sum, session) => sum + (session.comprehension_score || 0), 0) / totalSessions;

  // Calculate subject-specific progress
  const subjectProgress = sessions.reduce((acc: any, session) => {
    if (!acc[session.subject]) {
      acc[session.subject] = {
        sessions: 0,
        questions: 0,
        correct: 0,
        comprehension: 0
      };
    }
    
    acc[session.subject].sessions++;
    acc[session.subject].questions += session.questions_asked || 0;
    acc[session.subject].correct += session.correct_answers || 0;
    acc[session.subject].comprehension += session.comprehension_score || 0;
    
    return acc;
  }, {});

  return {
    totalSessions,
    totalQuestions,
    correctAnswers,
    accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
    averageComprehension,
    subjectProgress
  };
}

export async function processCustomerMessage(message: Message): Promise<Message> {
  const startTime = Date.now();
  let groq;
  
  console.log('🎓 [EDUCATION] Processing message:', {
    hasText: !!message.content,
    hasImage: !!message.imageUrl,
    phoneNumber: message.phoneNumber,
    contentLength: message.content?.length || 0
  });

  try {
    // Check if user has an active subscription
    const hasSubscription = await checkSubscriptionStatus(message.phoneNumber);
    
    // Save incoming message to database
    await supabase
      .from('customer_conversations')
      .insert({
        phone_number: message.phoneNumber,
        content: message.content,
        sender: message.sender,
        intent: 'education',
        created_at: new Date().toISOString()
      });
    
    // Track that education chatbot was used
    await trackChatbotUsage(message.phoneNumber, 'education');

    // Get or create student profile
    const student = await getOrCreateStudentProfile(message.phoneNumber);

    // Get user_id from student profile or from profils_utilisateurs
    let userId = null;
    
    // First try to get from student_profiles if it has user_id
    if (student && student.user_id) {
      userId = student.user_id;
    } else {
      // Try to get from profils_utilisateurs
      const { data: userProfile } = await supabase
        .from('profils_utilisateurs')
        .select('id')
        .eq('phone_number', message.phoneNumber)
        .maybeSingle();
      
      if (userProfile) {
        userId = userProfile.id;
      }
    }

    if (!userId) {
      // If no user_id found, try to get any user with Groq config as fallback
      const { data: anyGroqConfig } = await supabase
        .from('user_groq_config')
        .select('user_id')
        .limit(1)
        .maybeSingle();
        
      if (anyGroqConfig) {
        userId = anyGroqConfig.user_id;
      } else {
        throw new Error('No user with Groq configuration found');
      }
    }

    // Create Groq client with user's API key
    groq = await createGroqClient(userId);

    // 2. Process based on message type
    if (message.imageUrl) {
      console.log('🖼️ [EDUCATION] Processing image message with enhanced analysis');
      
      // Step 1: Analyze user context from text message
      const userContext = await analyzeUserContextFromMessage(message.content || '');
      console.log('👤 [EDUCATION] User context from message:', userContext);
      
      // Step 2: Analyze image content
      const analysis = await analyzeStudentImage(message.imageUrl, student.id);
      console.log('📊 [EDUCATION] Image analysis result:', analysis);
      
      // Step 3: Generate contextual system prompt
      const systemPrompt = generateContextualSystemPrompt(student, userContext, analysis);
      console.log('📝 [EDUCATION] Generated system prompt for:', analysis.contentType);

      // Step 4: Generate response with enhanced prompting
      const completion = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: [
              { 
                type: "text", 
                text: message.content || "Veuillez analyser et expliquer le contenu de cette image."
              },
              { 
                type: "image_url", 
                image_url: { url: message.imageUrl } 
              }
            ]
          }
        ],
        model: 'llama3-70b-8192',
        temperature: 0.7,
        max_tokens: 1500,
      });

      let response = completion.choices[0]?.message?.content || 
        "Je suis désolé, je n'ai pas pu analyser correctement cette image. Pourriez-vous envoyer une image plus claire ou poser votre question sous forme de texte ?";
      
      // Step 5: Validate response for hallucinations
      response = validateImageResponse(response, userContext, analysis, message.content || '');
      console.log('✅ [EDUCATION] Response validated and ready');

      // Step 6: Save and return the response
      const responseTime = (Date.now() - startTime) / 1000;
      const botResponse: Message = {
        phoneNumber: message.phoneNumber,
        content: response,
        sender: 'bot'
      };

      await supabase
        .from('customer_conversations')
        .insert({
          phone_number: botResponse.phoneNumber,
          content: botResponse.content,
          sender: botResponse.sender,
          intent: analysis.subject,
          response_time: responseTime
        });

      return botResponse;
    } else {
      // Handle text message
      // 2. Analyze the message
      const analysis = await analyzeStudentMessage(message.content, student.id);

      // 3. Generate response using Groq
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: `You are a teacher for ${student.level} students, specialized in ${analysis.subject || 'all subjects'}.
            Your goal is to help the student understand and progress.
            Current understanding level: ${analysis.understanding}
            Subject complexity: ${analysis.complexity}
            Adapt your response accordingly.`
          },
          { role: 'user', content: message.content }
        ],
        model: 'mixtral-8x7b-32768',
        temperature: 0.7,
        max_tokens: 2048,
      });

      const response = completion.choices[0]?.message?.content || "Je suis désolé, je n'ai pas pu générer une réponse appropriée.";

      // 4. Save and return the response
      const responseTime = (Date.now() - startTime) / 1000;
      const botResponse: Message = {
        phoneNumber: message.phoneNumber,
        content: response,
        sender: 'bot'
      };

      await supabase
        .from('customer_conversations')
        .insert({
          phone_number: botResponse.phoneNumber,
          content: botResponse.content,
          sender: botResponse.sender,
          intent: analysis.subject,
          response_time: responseTime
        });

      return botResponse;
    }
  } catch (error) {
    console.error('Error processing education message:', error);
    return {
      phoneNumber: message.phoneNumber,
      content: "Désolé, je rencontre des difficultés techniques. Veuillez réessayer plus tard.",
      sender: 'bot'
    };
  }
}

async function analyzeUserContextFromMessage(text: string): Promise<any> {
  const lowerText = text.toLowerCase();
  
  // Enhanced keyword detection
  const textKeywords = [
    'lettre', 'letter', 'dissertation', 'essay', 'texte', 'rédaction',
    'paragraphe', 'composition', 'récit', 'story', 'poème', 'poem',
    'analyse littéraire', 'français', 'littérature', 'grammaire',
    'orthographe', 'conjugaison', 'vocabulaire', 'lecture'
  ];
  
  const mathKeywords = [
    'mathématiques', 'math', 'calcul', 'équation', 'equation',
    'problème de math', 'exercice de math', 'algèbre', 'géométrie',
    'arithmétique', 'fonction', 'graphique', 'courbe'
  ];
  
  const scienceKeywords = [
    'physique', 'physics', 'chimie', 'chemistry', 'biologie', 'biology',
    'sciences', 'expérience', 'experiment', 'formule scientifique',
    'loi de', 'théorème', 'principe'
  ];

  const hasTextKeywords = textKeywords.some(keyword => lowerText.includes(keyword));
  const hasMathKeywords = mathKeywords.some(keyword => lowerText.includes(keyword));
  const hasScienceKeywords = scienceKeywords.some(keyword => lowerText.includes(keyword));

  let intent = 'unknown';
  let confidence = 0.5;

  if (hasTextKeywords && !hasMathKeywords && !hasScienceKeywords) {
    intent = 'text_help';
    confidence = 0.8;
  } else if (hasMathKeywords && !hasTextKeywords) {
    intent = 'math_help';
    confidence = 0.8;
  } else if (hasScienceKeywords && !hasTextKeywords) {
    intent = 'science_help';
    confidence = 0.8;
  } else if (hasTextKeywords || hasMathKeywords || hasScienceKeywords) {
    intent = 'mixed_help';
    confidence = 0.6;
  }

  return {
    intent,
    confidence,
    hasTextKeywords,
    hasMathKeywords,
    hasScienceKeywords,
    detectedKeywords: [
      ...(hasTextKeywords ? ['text'] : []),
      ...(hasMathKeywords ? ['math'] : []),
      ...(hasScienceKeywords ? ['science'] : [])
    ]
  };
}

function generateContextualSystemPrompt(student: any, userContext: any, analysis: any): string {
  let prompt = `Vous êtes un assistant éducatif expert pour les élèves de ${student.level}.

ANALYSE DU CONTENU IMAGE:
- Type détecté: ${analysis.contentType}
- Sujet: ${analysis.subject}
- Confiance: ${analysis.confidence}
- Contient équations: ${analysis.hasEquations ? 'Oui' : 'Non'}
- Contient texte: ${analysis.hasText ? 'Oui' : 'Non'}
- Écriture manuscrite: ${analysis.hasHandwriting ? 'Oui' : 'Non'}

CONTEXTE UTILISATEUR:
- Intention: ${userContext.intent}
- Confiance: ${userContext.confidence}
- Mots-clés détectés: ${userContext.detectedKeywords.join(', ')}`;

  // Content-specific instructions
  switch (analysis.contentType) {
    case 'text':
      prompt += `

🔤 CONTENU TEXTUEL CONFIRMÉ
Cette image contient principalement du texte/littérature.

VOTRE RÔLE:
- Aider avec la lecture et compréhension
- Corriger la grammaire et l'orthographe
- Analyser la structure et le style
- Fournir des conseils d'écriture
- Expliquer le vocabulaire et les expressions

⚠️ INTERDICTION ABSOLUE:
- NE créez PAS d'équations mathématiques
- NE mentionnez PAS de formules scientifiques
- NE supposez PAS de contenu mathématique
- Concentrez-vous UNIQUEMENT sur l'aspect textuel/littéraire`;
      break;

    case 'math':
      prompt += `

🔢 CONTENU MATHÉMATIQUE CONFIRMÉ
Cette image contient des mathématiques.

VOTRE RÔLE:
- Résoudre les problèmes étape par étape
- Expliquer les concepts mathématiques
- Vérifier les calculs
- Enseigner les méthodes de résolution`;
      break;

    case 'science':
      prompt += `

🔬 CONTENU SCIENTIFIQUE CONFIRMÉ
Cette image contient du contenu scientifique.

VOTRE RÔLE:
- Expliquer les concepts scientifiques
- Analyser les expériences ou diagrammes
- Clarifier les principes scientifiques
- Aider avec les calculs scientifiques`;
      break;

    default:
      prompt += `

❓ CONTENU INCERTAIN (Confiance: ${analysis.confidence})

APPROCHE PRUDENTE:
- Décrivez d'abord ce que vous voyez clairement
- Identifiez le type de contenu avant de répondre
- Demandez des clarifications si nécessaire
- Ne faites pas d'hypothèses sur le contenu`;
  }

  prompt += `

INSTRUCTIONS GÉNÉRALES:
- Répondez toujours en français
- Soyez encourageant et pédagogique
- Adaptez votre niveau à l'élève (${student.level})
- Si l'analyse est incertaine (confiance < 0.6), mentionnez-le
- Basez-vous uniquement sur ce qui est visible dans l'image`;

  return prompt;
}

/**
 * Enhanced validation to prevent hallucinations
 */
function validateImageResponse(
  response: string, 
  userContext: any, 
  analysis: any, 
  userMessage: string
): string {
  console.log('🔍 [EDUCATION] Validating response for hallucinations');
  
  const lowerResponse = response.toLowerCase();
  const lowerUserMessage = userMessage.toLowerCase();
  
  // Enhanced math detection in response
  const mathTerms = [
    'équation', 'equation', 'x =', 'y =', 'f(x)', 'calcul', 'résoudre',
    'formule', 'formula', 'dérivée', 'intégrale', 'cos(', 'sin(', 'tan(',
    'variable', 'fonction mathématique', '+ ', '- ', '= ', '∫', '∑', '√'
  ];
  
  const hasMathInResponse = mathTerms.some(term => lowerResponse.includes(term));
  
  // Detect hallucination scenarios
  const isTextContent = analysis.contentType === 'text';
  const userWantsTextHelp = userContext.intent === 'text_help' || userContext.hasTextKeywords;
  const highConfidenceTextAnalysis = isTextContent && analysis.confidence > 0.6;
  
  const isPotentialHallucination = (
    (userWantsTextHelp || highConfidenceTextAnalysis) && 
    hasMathInResponse && 
    !analysis.hasEquations
  );
  
  if (isPotentialHallucination) {
    console.log('⚠️ [EDUCATION] HALLUCINATION DETECTED: Math content in text response');
    
    const clarificationPrompt = `

🚨 **Vérification nécessaire - Possible erreur d'interprétation**

Mon analyse suggère que votre image contient du texte/littérature, mais ma réponse mentionne des éléments mathématiques.

**Veuillez confirmer le type de contenu**:
📝 Texte/Littérature: lettre, dissertation, rédaction, récit
🔢 Mathématiques: équations, calculs, problèmes mathématiques
🔬 Sciences: expériences, formules scientifiques, diagrammes

**Type d'aide souhaité**:
- ✏️ Correction et amélioration du texte
- 📖 Analyse littéraire ou stylistique
- ✍️ Conseils de rédaction
- 🧮 Résolution de problèmes mathématiques
- 🔬 Explication de concepts scientifiques

Précisez votre besoin pour une aide plus adaptée !`;
    
    return response + clarificationPrompt;
  }
  
  // Add confidence indicator for uncertain analysis
  if (analysis.confidence < 0.6) {
    console.log('⚠️ [EDUCATION] Low confidence analysis, adding uncertainty note');
    
    const uncertaintyNote = `

🤔 **Note de confiance**: Mon analyse de l'image n'est pas totalement certaine (${(analysis.confidence * 100).toFixed(0)}% de confiance).

Si ma réponse ne correspond pas au contenu de votre image, n'hésitez pas à:
- Préciser le type de document
- Mentionner la matière concernée  
- Indiquer le type d'aide souhaité

Cela m'aidera à mieux vous assister !`;
    
    return response + uncertaintyNote;
  }
  
  // Check for very short responses that might need enhancement
  if (response.length < 150 && analysis.contentType !== 'unknown') {
    const enhancementNote = `

💡 **Pour une aide plus détaillée**, n'hésitez pas à:
- Poser des questions spécifiques sur le contenu
- Demander des explications supplémentaires
- Préciser les points qui vous posent problème`;
    
    return response + enhancementNote;
  }
  
  console.log('✅ [EDUCATION] Response validation passed');
  return response;
}