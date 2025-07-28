import React, { useState, useEffect } from 'react';
import { Phone, Send, Brain, BookOpen, GraduationCap, BarChart2, Clock, AlertCircle, CreditCard } from 'lucide-react';
import { analyzeStudentMessage, getOrCreateStudentProfile, startEducationSession, updateSessionStats, getStudentAnalytics } from '../lib/education';
import BackButton from '../components/BackButton';
import GroqApiCheck from '../components/GroqApiCheck';
import { supabase } from '../lib/supabase';
import { useWhatsAppWeb } from '../hooks/useWhatsAppWeb';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  phoneNumber: string;
  subject?: string;
  type?: 'question' | 'answer' | 'explanation' | 'other';
  analysis?: {
    sentiment: number;
    complexity: number;
    understanding: number;
  };
}

const DAILY_FEE = 500; // 500 FCFA per day

const Education = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(true); // Always true to grant access
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalQuestions: 0,
    exercisesSolved: 0,
    averageResponseTime: 0,
    activeStudents: 0
  });

  useWhatsAppWeb();

  useEffect(() => {
    loadMessages();
    updateStats();
  }, []);

  const loadMessages = async () => {
    try {
      const { data: conversations } = await supabase
        .from('customer_conversations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (conversations) {
        setMessages(conversations.map(conv => ({
          id: conv.id,
          content: conv.content,
          sender: conv.sender,
          timestamp: new Date(conv.created_at),
          phoneNumber: conv.phone_number,
          subject: conv.subject,
          type: conv.type
        })));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const updateStats = async () => {
    try {
      const { data: analytics } = await supabase
        .from('education_analytics')
        .select('*');

      const { data: sessions } = await supabase
        .from('education_sessions')
        .select('*');

      const { data: students } = await supabase
        .from('student_profiles')
        .select('*');

      if (analytics && sessions && students) {
        setStats({
          totalQuestions: analytics.filter(a => a.message_type === 'question').length,
          exercisesSolved: sessions.reduce((acc, session) => acc + session.correct_answers, 0),
          averageResponseTime: sessions.reduce((acc, session) => acc + (session.duration || 0), 0) / sessions.length,
          activeStudents: students.length
        });
      }
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <GroqApiCheck>
        <div className="p-4 bg-gray-50 border-b">
          <BackButton />
          {error && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-800 shadow-sm">
              <AlertCircle className="w-5 h-5" />
              <p>{error}</p>
            </div>
          )}
        </div>
        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="p-6 bg-white border-b border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8 text-red-600" />
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">Assistant Éducatif WhatsApp</h1>
                    <p className="text-sm text-gray-500 max-w-3xl">Préparation BEPC, BAC et aux concours suivants : FSSA, ENSAF, ENS, ENSP, ISG, ENAM, INJS, ISEPS, CFI-CIRAS, CASP, INTS, ENI, ENMA, JJL, ENEF</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 shadow-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-sm">
                      Accès Illimité
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500 max-w-3xl">
                  Assistant intelligent avec analyse d'images avancée - Préparation BEPC, BAC et concours
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  ✨ Nouveau: Analyse intelligente des images (textes, mathématiques, sciences)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-6 bg-gray-50">
              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Send className="w-5 h-5 text-blue-600" />
                  <h3 className="font-medium text-gray-900">Questions traitées</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalQuestions}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Brain className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-gray-900">Exercices résolus</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.exercisesSolved}</p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-red-600" />
                  <h3 className="font-medium text-gray-900">Temps moyen de réponse</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">
                  {Math.round(stats.averageResponseTime)}s
                </p>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <GraduationCap className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-medium text-gray-900">Étudiants actifs</h3>
                </div>
                <p className="text-2xl font-semibold text-gray-900">{stats.activeStudents}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
              <div className="space-y-4 max-w-4xl mx-auto">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-2xl rounded-lg p-4 ${
                      message.sender === 'bot'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium">
                          {message.sender === 'bot' ? 'Assistant' : message.phoneNumber}
                        </span>
                        {message.subject && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            message.sender === 'bot'
                              ? 'bg-white bg-opacity-20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {message.subject}
                          </span>
                        )}
                        {message.type && (
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            message.sender === 'bot'
                              ? 'bg-white bg-opacity-20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {message.type}
                          </span>
                        )}
                        <span className="text-xs opacity-75">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="prose prose-sm">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </div>
                      {message.analysis && (
                        <div className="mt-3 text-xs space-y-2 border-t pt-2 border-opacity-20 border-gray-200">
                          <div className="flex items-center gap-2">
                            <span>Sentiment:</span>
                            <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(message.analysis.sentiment + 1) * 50}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Complexité:</span>
                            <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-500"
                                style={{ width: `${message.analysis.complexity * 100}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Compréhension:</span>
                            <div className="w-24 h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500"
                                style={{ width: `${message.analysis.understanding * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs">
                  <span>🖼️ Analyse d'images intelligente</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GroqApiCheck>
    </div>
  );
};

export default Education;