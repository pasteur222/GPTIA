import { supabase } from './supabase';

/**
 * OCR Integration utility for enhanced text extraction from images
 * Provides both client-side (Tesseract.js) and server-side (Google Vision) options
 */

// Client-side OCR using Tesseract.js
export async function extractTextWithTesseract(imageFile: File): Promise<{
  text: string;
  confidence: number;
  language: string;
}> {
  try {
    // Dynamic import to avoid loading Tesseract.js unless needed
    const { createWorker } = await import('tesseract.js');
    
    const worker = await createWorker('fra+eng'); // French and English
    
    const { data } = await worker.recognize(imageFile);
    
    await worker.terminate();
    
    return {
      text: data.text.trim(),
      confidence: data.confidence / 100, // Convert to 0-1 scale
      language: data.text.match(/[a-zA-Z]/) ? 'mixed' : 'unknown'
    };
  } catch (error) {
    console.error('Tesseract OCR error:', error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

// Server-side OCR using Google Cloud Vision API (via Edge Function)
export async function extractTextWithGoogleVision(imageUrl: string): Promise<{
  text: string;
  confidence: number;
  language: string;
  textAnnotations: any[];
}> {
  try {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ocr-processor`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        imageUrl: imageUrl,
        features: ['TEXT_DETECTION', 'DOCUMENT_TEXT_DETECTION']
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'OCR API request failed');
    }

    const data = await response.json();
    
    return {
      text: data.fullText || '',
      confidence: data.confidence || 0.8,
      language: data.detectedLanguage || 'unknown',
      textAnnotations: data.textAnnotations || []
    };
  } catch (error) {
    console.error('Google Vision OCR error:', error);
    throw new Error(`OCR extraction failed: ${error.message}`);
  }
}

// Hybrid OCR approach - tries Google Vision first, falls back to Tesseract
export async function extractTextHybrid(
  imageFile: File, 
  imageUrl?: string
): Promise<{
  text: string;
  confidence: number;
  language: string;
  method: 'google' | 'tesseract' | 'failed';
}> {
  // Try Google Vision first if we have a URL
  if (imageUrl) {
    try {
      const googleResult = await extractTextWithGoogleVision(imageUrl);
      return {
        ...googleResult,
        method: 'google'
      };
    } catch (googleError) {
      console.warn('Google Vision OCR failed, falling back to Tesseract:', googleError);
    }
  }

  // Fallback to Tesseract.js
  try {
    const tesseractResult = await extractTextWithTesseract(imageFile);
    return {
      ...tesseractResult,
      method: 'tesseract'
    };
  } catch (tesseractError) {
    console.error('Both OCR methods failed:', tesseractError);
    return {
      text: '',
      confidence: 0,
      language: 'unknown',
      method: 'failed'
    };
  }
}

// Enhanced image analysis that combines OCR with Groq vision
export async function analyzeImageWithOCR(
  imageFile: File,
  imageUrl: string,
  userMessage: string
): Promise<{
  extractedText: string;
  ocrConfidence: number;
  ocrMethod: string;
  contentType: 'text' | 'math' | 'science' | 'mixed' | 'unknown';
  recommendations: string[];
}> {
  try {
    // Extract text using hybrid OCR
    const ocrResult = await extractTextHybrid(imageFile, imageUrl);
    
    // Analyze the extracted text to determine content type
    const contentType = analyzeTextContent(ocrResult.text);
    
    // Generate recommendations based on analysis
    const recommendations = generateContentRecommendations(
      ocrResult.text, 
      contentType, 
      userMessage,
      ocrResult.confidence
    );
    
    return {
      extractedText: ocrResult.text,
      ocrConfidence: ocrResult.confidence,
      ocrMethod: ocrResult.method,
      contentType,
      recommendations
    };
  } catch (error) {
    console.error('Enhanced image analysis failed:', error);
    return {
      extractedText: '',
      ocrConfidence: 0,
      ocrMethod: 'failed',
      contentType: 'unknown',
      recommendations: ['OCR analysis failed. Please describe the content of your image.']
    };
  }
}

function analyzeTextContent(text: string): 'text' | 'math' | 'science' | 'mixed' | 'unknown' {
  if (!text || text.trim().length === 0) {
    return 'unknown';
  }

  const lowerText = text.toLowerCase();
  
  // Math indicators
  const mathKeywords = [
    'équation', 'equation', 'calcul', 'résoudre', 'solve', 'x =', 'y =', 'f(x)',
    'dérivée', 'derivative', 'intégrale', 'integral', 'limite', 'limit',
    'fonction', 'function', 'graphique', 'graph', 'courbe', 'curve'
  ];
  
  // Science indicators
  const scienceKeywords = [
    'expérience', 'experiment', 'hypothèse', 'hypothesis', 'observation',
    'réaction', 'reaction', 'formule chimique', 'chemical formula',
    'physique', 'physics', 'chimie', 'chemistry', 'biologie', 'biology'
  ];
  
  // Text/literature indicators
  const textKeywords = [
    'lettre', 'letter', 'dissertation', 'essay', 'rédaction', 'composition',
    'paragraphe', 'paragraph', 'phrase', 'sentence', 'mot', 'word',
    'grammaire', 'grammar', 'orthographe', 'spelling', 'littérature', 'literature'
  ];

  const mathScore = mathKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const scienceScore = scienceKeywords.filter(keyword => lowerText.includes(keyword)).length;
  const textScore = textKeywords.filter(keyword => lowerText.includes(keyword)).length;

  // Check for mathematical symbols
  const mathSymbols = /[+\-*/=<>∫∑√π∞αβγδε]/g;
  const mathSymbolCount = (text.match(mathSymbols) || []).length;

  if (mathScore > 0 || mathSymbolCount > 3) {
    if (textScore > 0) return 'mixed';
    return 'math';
  }
  
  if (scienceScore > 0) {
    if (textScore > 0) return 'mixed';
    return 'science';
  }
  
  if (textScore > 0 || text.length > 50) {
    return 'text';
  }

  return 'unknown';
}

function generateContentRecommendations(
  extractedText: string,
  contentType: string,
  userMessage: string,
  confidence: number
): string[] {
  const recommendations: string[] = [];

  if (confidence < 0.5) {
    recommendations.push('OCR confidence is low. Consider taking a clearer photo.');
  }

  switch (contentType) {
    case 'text':
      recommendations.push('This appears to be a text document. I can help with:');
      recommendations.push('• Grammar and spelling correction');
      recommendations.push('• Text structure and style analysis');
      recommendations.push('• Writing improvement suggestions');
      break;
      
    case 'math':
      recommendations.push('This appears to be a mathematical document. I can help with:');
      recommendations.push('• Step-by-step problem solving');
      recommendations.push('• Concept explanations');
      recommendations.push('• Formula derivations');
      break;
      
    case 'science':
      recommendations.push('This appears to be a scientific document. I can help with:');
      recommendations.push('• Concept explanations');
      recommendations.push('• Experiment analysis');
      recommendations.push('• Scientific calculations');
      break;
      
    case 'mixed':
      recommendations.push('This document contains mixed content. Please specify:');
      recommendations.push('• Which part you need help with');
      recommendations.push('• The type of assistance required');
      break;
      
    default:
      recommendations.push('Content type unclear. Please describe what you need help with.');
  }

  if (extractedText.length > 500) {
    recommendations.push('This is a long document. Consider asking about specific sections.');
  }

  return recommendations;
}