import React, { useState, useEffect } from 'react';
import { MessageSquare, Bot, Settings, RefreshCw, AlertCircle, Plus, X, Save, Database, Edit, Trash2, Search, Filter, CheckCircle, Code, Copy, ExternalLink, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { initializeWhatsAppWebhook } from '../lib/whatsapp-client';
import BackButton from '../components/BackButton';
import GroqApiCheck from '../components/GroqApiCheck';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  phoneNumber: string;
  intent?: string;
}

interface KnowledgeBaseEntry {
  id: string;
  intent: string;
  patterns: string[];
  responses: string[];
  created_at: string;
  updated_at: string;
}

interface SimulationQuestion {
  question: string;
  correct_answer: boolean;
  explanation: string;
  category: string;
}

const CustomerService = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 0,
    responseTime: 0,
    accuracy: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [showChatbotWeb, setShowChatbotWeb] = useState(false);
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeBaseEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingEntry, setEditingEntry] = useState<KnowledgeBaseEntry | null>(null);
  const [newEntry, setNewEntry] = useState<Partial<KnowledgeBaseEntry>>({
    intent: '',
    patterns: [],
    responses: []
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [chatbotColor, setChatbotColor] = useState('#ffcc00'); // MTN Yellow
  const [chatbotTitle, setChatbotTitle] = useState('Service Client');
  const [chatbotPosition, setChatbotPosition] = useState('right');
  const [chatbotCode, setChatbotCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<{type: 'question' | 'game', id: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [simulationInput, setSimulationInput] = useState('');
  const [simulationHistory, setSimulationHistory] = useState<SimulationQuestion[]>([]);
  const [showSimulation, setShowSimulation] = useState(false);

  useEffect(() => {
    const setupWhatsApp = async () => {
      try {
        setIsProcessing(true);
        const result = await initializeWhatsAppWebhook();
        
        if (!result) {
          setError('La configuration WhatsApp n\'est pas complète. Veuillez vérifier vos paramètres.');
          return;
        }

        if (result.error) {
          switch (result.error) {
            case 'Token expired':
              setError('Le token WhatsApp a expiré. Veuillez le renouveler dans les paramètres.');
              break;
            case 'Configuration incomplete':
              setError('La configuration WhatsApp est incomplète. Veuillez vérifier tous les paramètres requis.');
              break;
            case 'Invalid token format':
              setError('Le format du token WhatsApp est invalide. Veuillez vérifier le token.');
              break;
            default:
              setError(`Une erreur est survenue lors de l'initialisation de WhatsApp: ${result.error}`);
          }
          return;
        }

        if (result.success) {
          setError(null);
          console.log('WhatsApp webhook initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize WhatsApp webhook:', error);
        setError(`Erreur lors de l'initialisation de WhatsApp: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsProcessing(false);
      }
    };

    setupWhatsApp();

    const messagesRef = supabase
      .channel('custom-all-channel')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'customer_conversations' 
        },
        (payload) => {
          const newMessage = {
            id: payload.new.id,
            content: payload.new.content,
            sender: payload.new.sender,
            timestamp: new Date(payload.new.created_at),
            phoneNumber: payload.new.phone_number,
            intent: payload.new.intent
          };
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_conversations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (error) {
          console.error('Error loading messages:', error);
          setError('Erreur lors du chargement des messages');
          return;
        }

        const formattedMessages = data.map(msg => ({
          id: msg.id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.created_at),
          phoneNumber: msg.phone_number,
          intent: msg.intent
        }));

        setMessages(formattedMessages.reverse());
      } catch (err) {
        console.error('Error in loadMessages:', err);
        setError('Erreur lors du chargement des messages');
      }
    };

    loadMessages();
    loadKnowledgeBase();

    return () => {
      messagesRef.unsubscribe();
    };
  }, [isRetrying]);

  useEffect(() => {
    const updateStats = async () => {
      try {
        const { data: conversations, error } = await supabase
          .from('customer_conversations')
          .select('*');

        if (error) {
          console.error('Error fetching stats:', error);
          return;
        }

        const totalMessages = conversations.length;
        const responseTimes = conversations
          .filter(msg => msg.response_time)
          .map(msg => msg.response_time);
        
        const avgResponseTime = responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : 0;

        setStats({
          totalMessages,
          responseTime: avgResponseTime,
          accuracy: 0.85
        });
      } catch (err) {
        console.error('Error in updateStats:', err);
      }
    };

    updateStats();
  }, [messages]);

  useEffect(() => {
    // Generate embed code when chatbot settings change
    const userId = supabase.auth.getUser().then(({ data }) => data.user?.id);
    
    const generateCode = async () => {
      const user = await userId;
      if (!user) return;
      
      const code = `
<!-- MTN GPT Chatbot Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${window.location.origin}/chatbot-widget.js';
    script.async = true;
    script.dataset.userId = '${user}';
    script.dataset.color = '${chatbotColor}';
    script.dataset.title = '${chatbotTitle}';
    script.dataset.position = '${chatbotPosition}';
    script.dataset.apiUrl = '${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-chatbot';
    script.dataset.apiKey = '${import.meta.env.VITE_SUPABASE_ANON_KEY}';
    document.head.appendChild(script);
  })();
</script>
<!-- End MTN GPT Chatbot Widget -->`;
      
      setChatbotCode(code);
    };
    
    generateCode();
  }, [chatbotColor, chatbotTitle, chatbotPosition]);

  const loadKnowledgeBase = async () => {
    try {
      const { data, error } = await supabase
        .from('knowledge_base')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading knowledge base:', error);
        setError('Erreur lors du chargement de la base de connaissances');
        return;
      }

      setKnowledgeBase(data || []);
    } catch (err) {
      console.error('Error in loadKnowledgeBase:', err);
      setError('Erreur lors du chargement de la base de connaissances');
    }
  };

  const handleRetry = () => {
    setIsRetrying(prev => !prev);
    setError(null);
  };

  const handleCreateEntry = () => {
    setIsCreating(true);
    setEditingEntry(null);
    setNewEntry({
      intent: '',
      patterns: [],
      responses: []
    });
  };

  const handleEditEntry = (entry: KnowledgeBaseEntry) => {
    setEditingEntry(entry);
    setNewEntry({
      intent: entry.intent,
      patterns: entry.patterns,
      responses: entry.responses
    });
    setIsCreating(false);
  };

  const handleSaveEntry = async () => {
    if (!newEntry.intent || !newEntry.patterns?.length || !newEntry.responses?.length) {
      setError('Tous les champs sont obligatoires');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('knowledge_base')
          .update({
            intent: newEntry.intent,
            patterns: newEntry.patterns,
            responses: newEntry.responses,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingEntry.id);

        if (error) throw error;
        setSuccessMessage('Entrée mise à jour avec succès');
      } else {
        // Create new entry
        const { error } = await supabase
          .from('knowledge_base')
          .insert({
            intent: newEntry.intent,
            patterns: newEntry.patterns,
            responses: newEntry.responses
          });

        if (error) throw error;
        setSuccessMessage('Nouvelle entrée créée avec succès');
      }

      // Refresh knowledge base
      await loadKnowledgeBase();
      
      // Reset form
      setEditingEntry(null);
      setNewEntry({
        intent: '',
        patterns: [],
        responses: []
      });
      setIsCreating(false);

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Error saving knowledge base entry:', err);
      setError('Erreur lors de l\'enregistrement de l\'entrée');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    setShowDeleteConfirmation({type: 'question', id: id});
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirmation) return;
    
    setIsDeleting(true);
    
    try {
      if (showDeleteConfirmation.type === 'question') {
        const { error } = await supabase
          .from('knowledge_base')
          .delete()
          .eq('id', showDeleteConfirmation.id);

        if (error) throw error;
        
        // Update local state to immediately remove the deleted question
        setKnowledgeBase(prevEntries => 
          prevEntries.filter(entry => entry.id !== showDeleteConfirmation.id)
        );
      }
      
      // Close the confirmation dialog
      setShowDeleteConfirmation(null);
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handlePatternChange = (value: string) => {
    const patterns = value.split('\n').filter(p => p.trim() !== '');
    setNewEntry(prev => ({ ...prev, patterns }));
  };

  const handleResponseChange = (value: string) => {
    const responses = value.split('\n').filter(r => r.trim() !== '');
    setNewEntry(prev => ({ ...prev, responses }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow Enter key to create new lines
    if (e.key === 'Enter') {
      // Don't prevent default to allow the newline character
      return;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(chatbotCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const simulateQuestion = () => {
    if (!simulationInput.trim()) return;

    const simulation: SimulationQuestion = {
      question: simulationInput,
      correct_answer: Math.random() > 0.5,
      explanation: `Explication pour la question: ${simulationInput}`,
      category: 'Simulation'
    };

    setSimulationHistory(prev => [...prev, simulation]);
    setSimulationInput('');
  };

  const addSimulatedQuestion = async (simulation: SimulationQuestion) => {
    try {
      const { error } = await supabase
        .from('quiz_questions')
        .insert([{
          text: simulation.question,
          correct_answer: simulation.correct_answer,
          explanation: simulation.explanation,
          category: simulation.category
        }]);

      if (error) throw error;
      
      // Refresh questions list
      setSuccessMessage('Question ajoutée avec succès');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error adding simulated question:', error);
      setError('Erreur lors de l\'ajout de la question');
    }
  };

  const filteredKnowledgeBase = knowledgeBase.filter(entry => 
    entry.intent.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.patterns.some(pattern => pattern.toLowerCase().includes(searchTerm.toLowerCase())) ||
    entry.responses.some(response => response.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 bg-gray-50">
          <BackButton />
        </div>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
              Erreur de Configuration
            </h2>
            <p className="text-gray-600 text-center mb-6">
              {error}
            </p>
            <div className="space-y-4">
              <button
                onClick={handleRetry}
                className="w-full bg-yellow-500 text-white py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Réessayer
              </button>
              <button
                onClick={() => window.location.href = '/settings'}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configurer WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showChatbotWeb) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <BackButton />
            <button
              onClick={() => setShowChatbotWeb(false)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
              Retour au service client
            </button>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Intégration Chatbot Web</h1>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Personnalisation du Chatbot</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Titre du Chatbot
                  </label>
                  <input
                    type="text"
                    value={chatbotTitle}
                    onChange={(e) => setChatbotTitle(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="Service Client"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Couleur du Chatbot
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={chatbotColor}
                      onChange={(e) => setChatbotColor(e.target.value)}
                      className="w-10 h-10 rounded border-0 p-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={chatbotColor}
                      onChange={(e) => setChatbotColor(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      placeholder="#ffcc00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position du Chatbot
                  </label>
                  <select
                    value={chatbotPosition}
                    onChange={(e) => setChatbotPosition(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="right">Droite</option>
                    <option value="left">Gauche</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Aperçu et Code d'Intégration</h2>
              
              <div className="mb-6">
                <div className="border border-gray-200 rounded-lg p-4 relative h-96 overflow-hidden">
                  {/* Chatbot Preview */}
                  <div className="absolute bottom-4 right-4 w-72 shadow-lg rounded-lg overflow-hidden" style={{ display: 'flex', flexDirection: 'column', maxHeight: '80%' }}>
                    <div className="p-3 text-white" style={{ backgroundColor: chatbotColor }}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{chatbotTitle}</span>
                        <X className="w-5 h-5 cursor-pointer" />
                      </div>
                    </div>
                    <div className="bg-white p-4 h-64 overflow-y-auto flex flex-col">
                      <div className="flex flex-col space-y-3 flex-1">
                        <div className="bg-gray-100 p-2 rounded-lg self-start max-w-[80%]">
                          <p className="text-sm">Bonjour, comment puis-je vous aider ?</p>
                        </div>
                        <div className="bg-blue-100 p-2 rounded-lg self-end max-w-[80%]">
                          <p className="text-sm">J'ai une question sur votre service.</p>
                        </div>
                        <div className="bg-gray-100 p-2 rounded-lg self-start max-w-[80%]">
                          <p className="text-sm">Bien sûr, je serais ravi de vous aider. Quelle est votre question ?</p>
                        </div>
                      </div>
                      <div className="mt-4 border-t pt-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Tapez votre message..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none"
                            style={{ borderColor: chatbotColor }}
                          />
                          <button className="p-2 rounded-full text-white" style={{ backgroundColor: chatbotColor }}>
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Chat button */}
                  <div 
                    className="absolute bottom-4 rounded-full shadow-lg p-3 text-white cursor-pointer"
                    style={{ 
                      backgroundColor: chatbotColor,
                      right: chatbotPosition === 'right' ? '4px' : 'auto',
                      left: chatbotPosition === 'left' ? '4px' : 'auto'
                    }}
                  >
                    <MessageSquare className="w-6 h-6" />
                  </div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Code d'intégration</h3>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-sm text-yellow-600 hover:text-yellow-800"
                  >
                    {codeCopied ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Copié !
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copier
                      </>
                    )}
                  </button>
                </div>
                <div className="bg-gray-800 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap">{chatbotCode}</pre>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  Copiez ce code et collez-le juste avant la balise de fermeture &lt;/body&gt; de votre site web.
                </p>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Documentation
                </h3>
                <p className="text-sm text-blue-600">
                  Le widget de chatbot utilise la même base de connaissances que votre service client. 
                  Toutes les modifications apportées à la base de connaissances seront automatiquement 
                  reflétées dans le chatbot de votre site web.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showKnowledgeBase) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <BackButton />
            <button
              onClick={() => setShowKnowledgeBase(false)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <X className="w-5 h-5" />
              Retour au service client
            </button>
          </div>
        </div>
        
        <div className="max-w-6xl mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Base de Connaissances</h1>
            <button
              onClick={handleCreateEntry}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              <Plus className="w-4 h-4" />
              Nouvelle Entrée
            </button>
          </div>

          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {(isCreating || editingEntry) ? (
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {editingEntry ? 'Modifier une entrée' : 'Nouvelle entrée'}
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intention
                  </label>
                  <input
                    type="text"
                    value={newEntry.intent}
                    onChange={(e) => setNewEntry(prev => ({ ...prev, intent: e.target.value }))}
                    placeholder="Ex: greeting, billing_question, technical_support"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    L'intention représente la catégorie ou le type de question du client
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Modèles de reconnaissance (un par ligne)
                  </label>
                  <textarea
                    value={newEntry.patterns?.join('\n')}
                    onChange={(e) => handlePatternChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: bonjour&#10;salut&#10;bonsoir&#10;hey"
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Les modèles sont les mots ou phrases qui déclenchent cette intention
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Réponses (une par ligne)
                  </label>
                  <textarea
                    value={newEntry.responses?.join('\n')}
                    onChange={(e) => handleResponseChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ex: Bonjour ! Comment puis-je vous aider aujourd'hui ?&#10;Salut ! Je suis là pour répondre à vos questions."
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Les réponses sont sélectionnées aléatoirement parmi cette liste
                  </p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => {
                      setIsCreating(false);
                      setEditingEntry(null);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEntry}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher dans la base de connaissances..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {!isCreating && !editingEntry && (
            <div className="space-y-4">
              {filteredKnowledgeBase.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune entrée trouvée</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm ? 
                      'Aucune entrée ne correspond à votre recherche.' : 
                      'Commencez par ajouter des entrées à votre base de connaissances.'}
                  </p>
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Effacer la recherche
                    </button>
                  )}
                </div>
              ) : (
                filteredKnowledgeBase.map(entry => (
                  <div key={entry.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                          <MessageSquare className="w-5 h-5 text-yellow-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">{entry.intent}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <Filter className="w-4 h-4 text-gray-500" />
                          Modèles de reconnaissance
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex flex-wrap gap-2">
                            {entry.patterns.map((pattern, index) => (
                              <span key={index} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm">
                                {pattern}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-gray-500" />
                          Réponses
                        </h4>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <ul className="space-y-2 text-sm text-gray-700">
                            {entry.responses.map((response, index) => (
                              <li key={index} className="border-l-2 border-gray-300 pl-3">
                                {response}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                      Dernière mise à jour: {new Date(entry.updated_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (showSimulation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-2xl w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Simulation de questions</h2>
            <button
              onClick={() => setShowSimulation(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={simulationInput}
                onChange={(e) => setSimulationInput(e.target.value)}
                placeholder="Entrez une question..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                onKeyPress={(e) => e.key === 'Enter' && simulateQuestion()}
              />
              <button
                onClick={simulateQuestion}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
              >
                Tester
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {simulationHistory.map((sim, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">
                    Réponse: <span className={sim.correct_answer ? 'text-green-600' : 'text-red-600'}>
                      {sim.correct_answer ? 'Vrai' : 'Faux'}
                    </span>
                  </span>
                  <button
                    onClick={() => addSimulatedQuestion(sim)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter à la base
                  </button>
                </div>
                <p className="text-gray-900 mb-2">{sim.question}</p>
                <p className="text-gray-600 bg-gray-50 p-3 rounded">{sim.explanation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Delete confirmation modal
  if (showDeleteConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-start gap-4 mb-4">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Confirmer la suppression</h3>
              <p className="text-gray-600 mt-1">
                {showDeleteConfirmation.type === 'question' 
                  ? "Êtes-vous sûr de vouloir supprimer cette entrée ? Cette action est irréversible."
                  : "Êtes-vous sûr de vouloir supprimer ce jeu ? Toutes les données associées seront également supprimées. Cette action est irréversible."}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowDeleteConfirmation(null)}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
              disabled={isDeleting}
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <GroqApiCheck>
        <div className="p-4 bg-gray-50">
          <BackButton />
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="p-6 bg-white border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-8 h-8 text-yellow-500" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Service Client WhatsApp</h1>
                    <p className="text-sm text-gray-500">Assistant virtuel intégré à WhatsApp Business</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowSimulation(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Code className="w-4 h-4" />
                    Simuler
                  </button>
                  <button
                    onClick={() => setShowChatbotWeb(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Code className="w-4 h-4" />
                    ChatbotWeb
                  </button>
                  <button
                    onClick={() => setShowKnowledgeBase(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    <Database className="w-4 h-4" />
                    Base de Connaissances
                  </button>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                    isProcessing ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      isProcessing ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-sm">
                      {isProcessing ? 'Traitement en cours...' : 'En attente de messages'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 p-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Messages traités</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalMessages}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <RefreshCw className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">Temps de réponse</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.responseTime.toFixed(1)}s</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-medium text-gray-900">Précision</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{(stats.accuracy * 100).toFixed(1)}%</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p>Aucun message pour le moment</p>
                    <p className="text-sm mt-2">Les conversations apparaîtront ici</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-lg rounded-lg p-4 ${
                        message.sender === 'bot'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-medium">
                            {message.sender === 'bot' ? 'Assistant' : message.phoneNumber}
                          </span>
                          {message.intent && (
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              message.sender === 'bot'
                                ? 'bg-white bg-opacity-20 text-white'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {message.intent}
                            </span>
                          )}
                          <span className="text-xs opacity-75">
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </GroqApiCheck>
    </div>
  );
};

export default CustomerService;