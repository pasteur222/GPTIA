import React, { useState, useEffect } from 'react';
import { Check, Brain, MessageSquare, BookOpen, Target, Clock, Calendar, CreditCard, ArrowRight, Users, Zap, Award, Repeat } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/BackButton';
import SubscriptionPayment from '../components/SubscriptionPayment';
import { SUBSCRIPTION_PLANS } from '../lib/subscription';
import { supabase, getPricing } from '../lib/supabase';

const AirtelChat = () => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [plans, setPlans] = useState(SUBSCRIPTION_PLANS);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const exchangeRate = 0.00165; // 1 FCFA = 0.00165 USD (approximate)

  useEffect(() => {
    loadCustomPricing();
  }, []);

  const loadCustomPricing = async () => {
    try {
      setLoading(true);
      const data = await getPricing();

      if (data && data.length > 0) {
        // Create a copy of the plans to modify
        const updatedPlans = [...SUBSCRIPTION_PLANS];
        
        // Update prices based on database values
        data.forEach(item => {
          const planIndex = updatedPlans.findIndex(p => p.id === item['plan tarifaire']);
          if (planIndex !== -1) {
            updatedPlans[planIndex] = {
              ...updatedPlans[planIndex],
              price: item.price
            };
          }
        });
        
        setPlans(updatedPlans);
      }
    } catch (error) {
      console.error('Error loading custom pricing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (planId: string) => {
    setSelectedPlan(planId);
    setShowPayment(true);
  };

  const handlePaymentSuccess = () => {
    navigate('/dashboard');
  };

  const handlePaymentCancel = () => {
    setShowPayment(false);
    setSelectedPlan(null);
  };

  const toggleCurrency = () => {
    if (currency === 'FCFA') {
      setCurrency('USD');
    } else {
      setCurrency('FCFA');
    }
  };

  const formatPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = price * exchangeRate;
      return usdPrice.toFixed(2);
    }
    return price.toLocaleString();
  };

  const selectedPlanDetails = plans.find(p => p.id === selectedPlan);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <BackButton />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {showPayment && selectedPlanDetails ? (
          <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <SubscriptionPayment 
              plan={selectedPlanDetails}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
            />
          </div>
        ) : (
          <>
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Brain className="w-12 h-12 text-yellow-500" />
                <h1 className="text-4xl font-bold text-gray-900">MTN Chat Éducatif</h1>
              </div>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Votre assistant personnel pour la préparation aux examens d'État et concours
              </p>
            </div>

            {/* Hero Section */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-16">
              <div className="md:flex">
                <div className="md:w-1/2 p-8 md:p-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Réussissez vos examens avec l'IA</h2>
                  <p className="text-gray-600 mb-6">
                    MTN Chat est votre tuteur personnel disponible 24/7. Posez vos questions dans toutes les matières et recevez des explications claires et adaptées à votre niveau.
                  </p>
                  <ul className="space-y-3 mb-8">
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                      <span>Préparation BEPC, BAC et concours</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                      <span>Explications détaillées et exercices pratiques</span>
                    </li>
                    <li className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                      <span>Accessible via WhatsApp sur tous les téléphones</span>
                    </li>
                  </ul>
                  <button
                    onClick={() => handleSubscribe('weekly')}
                    className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 shadow-sm flex items-center gap-2"
                  >
                    Commencer maintenant
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
                <div className="md:w-1/2">
                  <img 
                    src="https://images.pexels.com/photos/4145153/pexels-photo-4145153.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750" 
                    alt="Étudiant utilisant MTN Chat" 
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="bg-white rounded-xl p-6 shadow-sm text-center transform transition-transform hover:scale-105">
                <MessageSquare className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Chat IA Intelligent</h3>
                <p className="text-gray-600">Assistant virtuel disponible 24/7 pour répondre à vos questions dans toutes les matières</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm text-center transform transition-transform hover:scale-105">
                <BookOpen className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Contenu Personnalisé</h3>
                <p className="text-gray-600">Préparation adaptée à votre niveau et vos objectifs d'examen ou de concours</p>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-sm text-center transform transition-transform hover:scale-105">
                <Target className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Suivi de Progression</h3>
                <p className="text-gray-600">Analyses détaillées de votre progression et recommandations personnalisées</p>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-xl shadow-sm p-8 mb-16">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Comment ça marche</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Abonnez-vous</h3>
                  <p className="text-gray-600">Choisissez le forfait qui correspond à vos besoins et effectuez le paiement</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Connectez WhatsApp</h3>
                  <p className="text-gray-600">Envoyez un message à notre numéro WhatsApp pour activer votre compte</p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Commencez à apprendre</h3>
                  <p className="text-gray-600">Posez vos questions et recevez des réponses instantanées adaptées à votre niveau</p>
                </div>
              </div>
            </div>

            {/* Subscription Plans */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Choisissez votre forfait</h2>
              
              <div className="flex justify-center mb-8">
                <button
                  onClick={toggleCurrency}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Repeat className="w-4 h-4" />
                  {currency === 'FCFA' ? 'Afficher en USD' : 'Afficher en FCFA'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`bg-white rounded-xl shadow-lg overflow-hidden ${
                      plan.id === 'weekly' ? 'ring-2 ring-yellow-500 transform scale-105' : ''
                    }`}
                  >
                    {plan.id === 'weekly' && (
                      <div className="bg-yellow-500 text-white text-center py-2 text-sm font-medium">
                        Plus populaire
                      </div>
                    )}
                    <div className="p-8">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">{plan.name}</h3>
                      <div className="flex items-baseline mb-6">
                        {currency === 'USD' ? (
                          <>
                            <span className="text-gray-500 mr-1">{currency}</span>
                            <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-4xl font-bold text-gray-900">{formatPrice(plan.price)}</span>
                            <span className="text-gray-500 ml-1">{currency}</span>
                          </>
                        )}
                        <span className="text-gray-500 ml-1">/{plan.type === 'daily' ? 'jour' : plan.type === 'weekly' ? 'semaine' : 'mois'}</span>
                      </div>

                      <ul className="space-y-4 mb-8">
                        {plan.features.map((feature, featureIndex) => (
                          <li key={featureIndex} className="flex items-start">
                            <Check className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                            <span className="text-gray-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSubscribe(plan.id)}
                        className={`w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 ${
                          plan.id === 'weekly'
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                            : 'bg-gray-900 text-white hover:bg-gray-800'
                        } transition-colors shadow-sm`}
                      >
                        <CreditCard className="w-5 h-5" />
                        {plan.id === 'weekly' ? 'Meilleure offre' : 'S\'abonner maintenant'}
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="mt-16 bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Ce que disent nos étudiants</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-start gap-4">
                    <img 
                      src="https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100" 
                      alt="Student" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-gray-600 italic mb-4">"Grâce à MTN Chat, j'ai pu améliorer mes notes en mathématiques. L'assistant m'explique les concepts difficiles de façon simple et claire."</p>
                      <p className="font-medium text-gray-900">Aminata D.</p>
                      <p className="text-sm text-gray-500">Élève en Terminale S</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="flex items-start gap-4">
                    <img 
                      src="https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=100" 
                      alt="Student" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <p className="text-gray-600 italic mb-4">"Je peux poser mes questions à n'importe quelle heure et recevoir des réponses claires. C'est comme avoir un professeur particulier disponible 24/7."</p>
                      <p className="font-medium text-gray-900">Moussa T.</p>
                      <p className="text-sm text-gray-500">Préparation au BEPC</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <Clock className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Disponible 24/7</h3>
                <p className="mt-2 text-gray-600">
                  Accédez à votre assistant à tout moment, où que vous soyez
                </p>
              </div>
              <div className="text-center">
                <Calendar className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">Flexibilité</h3>
                <p className="mt-2 text-gray-600">
                  Choisissez la durée qui correspond à vos besoins
                </p>
              </div>
              <div className="text-center">
                <Brain className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">IA Avancée</h3>
                <p className="mt-2 text-gray-600">
                  Bénéficiez d'une assistance intelligente et personnalisée
                </p>
              </div>
            </div>

            {/* FAQ Section */}
            <div className="mt-16 bg-white rounded-xl shadow-sm p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Questions fréquentes</h2>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Comment puis-je accéder à MTN Chat?</h4>
                  <p className="text-gray-600">Après votre abonnement, vous recevrez un message WhatsApp avec les instructions. Il vous suffit de répondre "I want to learn" pour commencer à utiliser le service.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Quelles matières sont couvertes?</h4>
                  <p className="text-gray-600">MTN Chat couvre toutes les matières principales du programme scolaire: mathématiques, physique-chimie, SVT, français, anglais, histoire-géographie, philosophie, etc.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Comment renouveler mon abonnement?</h4>
                  <p className="text-gray-600">Vous pouvez renouveler votre abonnement à tout moment depuis votre tableau de bord ou en envoyant "Renouveler" à notre numéro WhatsApp.</p>
                </div>
                
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Puis-je changer de forfait?</h4>
                  <p className="text-gray-600">Oui, vous pouvez passer à un forfait supérieur à tout moment. La différence sera calculée au prorata de la période restante.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AirtelChat;