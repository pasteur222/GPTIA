import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, AlertCircle, ChevronRight, BarChart2, TrendingUp, DollarSign, Calendar, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import BackButton from '../components/BackButton';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Transaction {
  id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
  created_at: string;
  provider_transaction_id?: string;
}

interface Subscription {
  id: string;
  plan_type: 'daily' | 'weekly' | 'monthly';
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
  messages_remaining: number;
}

interface PaymentStats {
  totalSpent: number;
  successfulPayments: number;
  failedPayments: number;
  averageAmount: number;
  lastPaymentDate?: string;
  monthlySpending: number;
}

const Payments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalSpent: 0,
    successfulPayments: 0,
    failedPayments: 0,
    averageAmount: 0,
    monthlySpending: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (user) {
      loadPaymentData();
    }
  }, [user]);

  const loadPaymentData = async () => {
    try {
      if (!user) {
        setError('Veuillez vous connecter pour accéder à vos paiements');
        setLoading(false);
        return;
      }

      // Get user's student profile
      const { data: studentProfile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('phone_number', user.phone || '')
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching student profile:', profileError);
      }

      // Get student transactions and subscriptions if student profile exists
      if (studentProfile) {
        // Get all transactions
        const { data: transactionData, error: transactionError } = await supabase
          .from('subscription_transactions')
          .select('*')
          .order('created_at', { ascending: false });

        if (transactionError) {
          console.error('Error fetching transactions:', transactionError);
        } else {
          setTransactions(transactionData || []);
        }

        // Get all subscriptions
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('student_subscriptions')
          .select('*')
          .eq('student_id', studentProfile.id)
          .order('created_at', { ascending: false });

        if (subscriptionError) {
          console.error('Error fetching subscriptions:', subscriptionError);
        } else {
          setSubscriptions(subscriptionData || []);
        }
      }

      // Calculate statistics from all transactions
      const allTransactions = [...(transactions || [])];
      
      const completedTransactions = allTransactions.filter(t => t.status === 'completed');
      const failedTransactions = allTransactions.filter(t => t.status === 'failed');
      
      const totalSpent = completedTransactions.reduce((sum, t) => sum + t.amount, 0);
      const averageAmount = completedTransactions.length > 0 
        ? totalSpent / completedTransactions.length 
        : 0;

      // Calculate monthly spending
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyTransactions = completedTransactions.filter(t => 
        new Date(t.created_at) >= monthStart
      );
      const monthlySpending = monthlyTransactions.reduce((sum, t) => sum + t.amount, 0);

      setStats({
        totalSpent,
        successfulPayments: completedTransactions.length,
        failedPayments: failedTransactions.length,
        averageAmount,
        lastPaymentDate: completedTransactions[0]?.created_at,
        monthlySpending
      });

      // If no profiles found at all
      if (!studentProfile) {
        setNeedsProfile(true);
      }

    } catch (error) {
      console.error('Error loading payment data:', error);
      setError('Une erreur est survenue lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPlanName = (planType: string) => {
    switch (planType) {
      case 'daily': return 'Journalier';
      case 'weekly': return 'Hebdomadaire';
      case 'monthly': return 'Mensuel';
      default: return planType;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (needsProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            Profil Non Trouvé
          </h2>
          <p className="text-gray-600 text-center mb-6">
            Vous n'avez pas encore d'abonnement. Veuillez vous abonner pour accéder à l'historique des paiements.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/airtel-chat')}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              S'abonner (Éducation)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-center text-gray-900 mb-2">
            Erreur
          </h2>
          <p className="text-gray-600 text-center mb-6">
            {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="mb-12">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Historique des Paiements</h1>
        <p className="text-gray-600">
          Consultez vos statistiques de paiement et l'historique de vos transactions
        </p>
      </div>

      {/* Payment Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Total dépensé</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalSpent)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <TrendingUp className="w-4 h-4" />
            <span>Ce mois: {formatPrice(stats.monthlySpending)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <BarChart2 className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Moyenne par transaction</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.averageAmount)}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1 text-sm text-gray-500">
            <CheckCircle className="w-4 h-4" />
            <span>{stats.successfulPayments} paiements réussis</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Dernier paiement</p>
              <p className="text-lg font-bold text-gray-900">
                {stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : 'Aucun'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-gray-500">Paiements échoués</p>
              <p className="text-2xl font-bold text-gray-900">{stats.failedPayments}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Student Subscriptions */}
      {subscriptions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Abonnements Éducation</h2>
            <button
              onClick={() => navigate('/airtel-chat')}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <CreditCard className="w-4 h-4" />
              Nouvel abonnement
            </button>
          </div>

          <div className="divide-y divide-gray-200">
            {subscriptions.map((subscription) => (
              <div key={subscription.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${
                      subscription.status === 'active' 
                        ? 'bg-green-100' 
                        : subscription.status === 'expired'
                        ? 'bg-gray-100'
                        : 'bg-red-100'
                    }`}>
                      <CreditCard className={`w-6 h-6 ${
                        subscription.status === 'active'
                          ? 'text-green-600'
                          : subscription.status === 'expired'
                          ? 'text-gray-600'
                          : 'text-red-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        Abonnement {getPlanName(subscription.plan_type)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDate(subscription.start_date)} - {formatDate(subscription.end_date)}
                      </p>
                      {subscription.status === 'active' && subscription.plan_type !== 'monthly' && (
                        <p className="text-sm text-gray-500 mt-1">
                          Messages restants: <span className="font-medium">{subscription.messages_remaining}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      subscription.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : subscription.status === 'expired'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {subscription.status === 'active' ? 'Actif' :
                       subscription.status === 'expired' ? 'Expiré' : 'Annulé'}
                    </span>
                    
                    {subscription.status === 'expired' && (
                      <button
                        onClick={() => navigate('/airtel-chat')}
                        className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                      >
                        Renouveler
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Historique des Transactions</h2>
        </div>

        <div className="divide-y divide-gray-200">
          {transactions.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              Aucune transaction trouvée
            </div>
          ) : (
            transactions
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${
                        transaction.status === 'completed' 
                          ? 'bg-green-100' 
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100'
                          : 'bg-red-100'
                      }`}>
                        <CreditCard className={`w-6 h-6 ${
                          transaction.status === 'completed'
                            ? 'text-green-600'
                            : transaction.status === 'pending'
                            ? 'text-yellow-600'
                            : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatPrice(transaction.amount)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {transaction.provider}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {formatDate(transaction.created_at)}
                      </p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status === 'completed' ? 'Réussi' :
                         transaction.status === 'pending' ? 'En cours' : 'Échoué'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Payments;