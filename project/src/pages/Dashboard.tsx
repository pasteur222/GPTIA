import React, { useState, useEffect } from 'react';
import { Activity, Users, MessageSquare, BookOpen, Brain, Trophy, Clock, BarChart2, Calendar, CheckCircle, XCircle, Gauge, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardCharts from '../components/DashboardCharts';

interface DashboardStats {
  whatsapp: {
    totalMessages: number;
    deliveryRate: number;
    activeChats: number;
  };
  education: {
    activeStudents: number;
    totalSessions: number;
    averageScore: number;
    subjectDistribution: Record<string, number>;
  };
  customerService: {
    totalTickets: number;
    responseTime: number;
    satisfactionRate: number;
    commonTopics: Array<{ topic: string; count: number }>;
  };
  quiz: {
    activeGames: number;
    totalParticipants: number;
    averageScore: number;
    completionRate: number;
  };
}

interface SubscriptionInfo {
  active: boolean;
  planType?: string;
  endDate?: string;
  daysRemaining?: number;
  messagesRemaining?: number;
}

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    whatsapp: { totalMessages: 0, deliveryRate: 0, activeChats: 0 },
    education: { activeStudents: 0, totalSessions: 0, averageScore: 0, subjectDistribution: {} },
    customerService: { totalTickets: 0, responseTime: 0, satisfactionRate: 0, commonTopics: [] },
    quiz: { activeGames: 0, totalParticipants: 0, averageScore: 0, completionRate: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>({ 
    active: true,
    planType: 'monthly',
    endDate: new Date(2099, 11, 31).toLocaleDateString(),
    daysRemaining: 9999,
    messagesRemaining: null
  });
  const [activeModule, setActiveModule] = useState<'whatsapp' | 'education' | 'customerService' | 'quiz'>('whatsapp');

  useEffect(() => {
    fetchDashboardStats();
  }, [user, isAdmin]);

  const fetchDashboardStats = async () => {
    try {
      // WhatsApp Stats
      const { data: whatsappMessages } = await supabase
        .from('customer_conversations')
        .select('*');

      // Fix: Use the correct table name 'user_whatsapp_config' instead of 'whatsapp_config'
      const { data: whatsappConfig } = await supabase
        .from('user_whatsapp_config')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      // Education Stats
      const { data: educationSessions } = await supabase
        .from('education_sessions')
        .select('*');

      const { data: students } = await supabase
        .from('student_profiles')
        .select('*');

      // Quiz Stats
      const { data: quizGames } = await supabase
        .from('quiz_games')
        .select('*');

      const { data: quizParticipants } = await supabase
        .from('quiz_participants')
        .select('*');

      // Customer Service Stats
      const { data: customerMessages } = await supabase
        .from('customer_conversations')
        .select('*')
        .eq('sender', 'user');

      // Calculer les statistiques
      setStats({
        whatsapp: {
          totalMessages: whatsappMessages?.length || 0,
          deliveryRate: calculateDeliveryRate(whatsappMessages || []),
          activeChats: calculateActiveChats(whatsappMessages || [])
        },
        education: {
          activeStudents: students?.length || 0,
          totalSessions: educationSessions?.length || 0,
          averageScore: calculateAverageScore(educationSessions || []),
          subjectDistribution: calculateSubjectDistribution(educationSessions || [])
        },
        customerService: {
          totalTickets: customerMessages?.length || 0,
          responseTime: calculateAverageResponseTime(customerMessages || []),
          satisfactionRate: 85, // À implémenter: calcul réel
          commonTopics: calculateCommonTopics(customerMessages || [])
        },
        quiz: {
          activeGames: quizGames?.filter(g => g.status === 'active').length || 0,
          totalParticipants: quizParticipants?.length || 0,
          averageScore: calculateQuizAverageScore(quizParticipants || []),
          completionRate: calculateQuizCompletionRate(quizParticipants || [])
        }
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setIsLoading(false);
    }
  };

  const calculateDeliveryRate = (messages: any[]) => {
    const delivered = messages.filter(m => m.status === 'delivered').length;
    return messages.length > 0 ? (delivered / messages.length) * 100 : 0;
  };

  const calculateActiveChats = (messages: any[]) => {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const uniqueNumbers = new Set(
      messages
        .filter(m => new Date(m.created_at) > last24Hours)
        .map(m => m.phone_number)
    );
    return uniqueNumbers.size;
  };

  const calculateAverageScore = (sessions: any[]) => {
    if (sessions.length === 0) return 0;
    const totalScore = sessions.reduce((acc, session) => acc + (session.comprehension_score || 0), 0);
    return (totalScore / sessions.length) * 100;
  };

  const calculateSubjectDistribution = (sessions: any[]) => {
    return sessions.reduce((acc: Record<string, number>, session) => {
      if (session.subject) {
        acc[session.subject] = (acc[session.subject] || 0) + 1;
      }
      return acc;
    }, {});
  };

  const calculateAverageResponseTime = (messages: any[]) => {
    const responseTimes = messages
      .filter(m => m.response_time)
      .map(m => m.response_time);
    return responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  };

  const calculateCommonTopics = (messages: any[]) => {
    const topics = messages.reduce((acc: Record<string, number>, message) => {
      if (message.intent) {
        acc[message.intent] = (acc[message.intent] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(topics)
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateQuizAverageScore = (participants: any[]) => {
    if (participants.length === 0) return 0;
    const totalScore = participants.reduce((acc, p) => acc + (p.score || 0), 0);
    return totalScore / participants.length;
  };

  const calculateQuizCompletionRate = (participants: any[]) => {
    if (participants.length === 0) return 0;
    const completed = participants.filter(p => p.total_answers > 0).length;
    return (completed / participants.length) * 100;
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'daily': return 'Journalier';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return planType;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tableau de Bord</h1>

      {/* Subscription Status */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Educational Subscription Status */}
        {!isAdmin && (
          <div className="p-6 rounded-xl bg-green-50 border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-green-600" />
                <div>
                  <h2 className="text-lg font-semibold">
                    Abonnement Éducatif {getPlanName(subscription.planType || '')}
                  </h2>
                  <p className="text-sm">
                    Accès illimité jusqu'au {subscription.endDate}
                  </p>
                  <p className="text-sm mt-1">
                    Messages: <span className="font-medium">Illimités</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Module Selector */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={() => setActiveModule('whatsapp')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            activeModule === 'whatsapp' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          WhatsApp
        </button>
        <button
          onClick={() => setActiveModule('education')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            activeModule === 'education' 
              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Éducation
        </button>
        <button
          onClick={() => setActiveModule('customerService')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            activeModule === 'customerService' 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          Service Client
        </button>
        <button
          onClick={() => setActiveModule('quiz')}
          className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
            activeModule === 'quiz' 
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Trophy className="w-5 h-5" />
          Quiz
        </button>
      </div>

      {/* Charts */}
      <div className="mb-8">
        <DashboardCharts moduleType={activeModule} />
      </div>

      {/* WhatsApp */}
      {activeModule === 'whatsapp' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-green-600" />
            WhatsApp
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Messages envoyés</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.whatsapp.totalMessages}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Taux de livraison</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.whatsapp.deliveryRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Conversations actives</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.whatsapp.activeChats}</p>
            </div>
          </div>
        </div>
      )}

      {/* Éducation */}
      {activeModule === 'education' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            Éducation
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Étudiants actifs</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.education.activeStudents}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Brain className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Sessions totales</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.education.totalSessions}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Score moyen</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.education.averageScore.toFixed(1)}%</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <BarChart2 className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Matières populaires</h3>
              </div>
              <div className="space-y-2 mt-4">
                {Object.entries(stats.education.subjectDistribution).map(([subject, count]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{subject}</span>
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Client */}
      {activeModule === 'customerService' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-yellow-500" />
            Service Client
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Tickets traités</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.customerService.totalTickets}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Temps de réponse</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.customerService.responseTime.toFixed(1)}s</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Satisfaction client</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.customerService.satisfactionRate}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Quiz */}
      {activeModule === 'quiz' && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Quiz
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <h3 className="font-medium text-gray-900">Jeux actifs</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.quiz.activeGames}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Users className="w-5 h-5 text-green-600" />
                <h3 className="font-medium text-gray-900">Participants</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.quiz.totalParticipants}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Score moyen</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.quiz.averageScore.toFixed(1)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-medium text-gray-900">Taux de complétion</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{stats.quiz.completionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;