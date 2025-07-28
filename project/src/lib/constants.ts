// Groq AI Models
export const GROQ_MODELS = [
  { id: 'llama3-70b-8192', name: 'Llama 3 70B (8K context)' },
  { id: 'llama3-8b-8192', name: 'Llama 3 8B (8K context)' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B Instruct' },
  { id: 'gemma-7b-it', name: 'Gemma 7B Instruct' }
];

// Default Groq model to use if none is specified
export const DEFAULT_GROQ_MODEL = 'llama3-70b-8192';