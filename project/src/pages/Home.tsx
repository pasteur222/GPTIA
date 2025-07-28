import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Shield, Zap, Award, MessageSquare, BookOpen, GamepadIcon, ChevronRight, Phone, Mail, MapPin, Heart, Globe, MessageCircle, ArrowRight, CheckCircle, Users, BarChart2, ChevronDown, Repeat } from 'lucide-react';
import { BUSINESS_PLANS } from '../lib/business-subscription';
import { supabase, getPricing } from '../lib/supabase';
import { useAppSettings } from '../components/AppSettingsContext';

const Home = () => {
  const navigate = useNavigate();
  const { settings } = useAppSettings();
  const [expandedPlan, setExpandedPlan] = React.useState<string | null>(null);
  const [plans, setPlans] = useState(BUSINESS_PLANS);
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
        const updatedPlans = [...BUSINESS_PLANS];
        
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
      // Keep the default pricing if there's an error
      setPlans(BUSINESS_PLANS);
    } finally {
      setLoading(false);
    }
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

  const scrollToSubscription = () => {
    navigate('/professional-subscription');
  };

  const handleSubscribe = (planId: string) => {
    navigate(`/business-payment/${planId}`);
  };

  const togglePlanDetails = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-white to-gray-50 pt-16 pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-1/2 lg:pr-12">
              <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
                <span className="block">Révolutionnez votre</span>
                <span className="block text-yellow-500">communication et apprentissage</span>
              </h1>
              <p className="mt-6 text-xl text-gray-500 max-w-3xl">
                {settings.app_name} combine l'intelligence artificielle avancée avec la puissance de WhatsApp pour transformer votre expérience éducative et professionnelle.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="px-8 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors shadow-md flex items-center gap-2"
                >
                  Se connecter
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={scrollToSubscription}
                  className="px-8 py-3 bg-white text-yellow-500 border-2 border-yellow-500 rounded-lg hover:bg-yellow-50 transition-colors shadow-sm"
                >
                  S'inscrire
                </button>
              </div>
            </div>
            <div className="mt-10 lg:mt-0 lg:w-1/2">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-2xl transform rotate-3 scale-105 opacity-10"></div>
                <img 
                  src="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2" 
                  alt="MTN GPT Platform" 
                  className="relative rounded-2xl shadow-xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-500">24/7</div>
              <p className="mt-2 text-gray-600">Assistance disponible</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-500">10k+</div>
              <p className="mt-2 text-gray-600">Utilisateurs actifs</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-500">95%</div>
              <p className="mt-2 text-gray-600">Taux de satisfaction</p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-500">14</div>
              <p className="mt-2 text-gray-600">Pays Africains couverts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Fonctionnalités principales</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Tout ce dont vous avez besoin pour votre réussite
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MessageCircle,
                title: 'MTN Chat',
                description: 'Assistant virtuel intelligent pour la préparation aux examens',
                path: '/airtel-chat',
                color: 'blue'
              },
              {
                icon: MessageSquare,
                title: 'Chat WhatsApp Intégré',
                description: 'Communiquez facilement avec vos clients via WhatsApp',
                path: '/whatsapp',
                color: 'green'
              },
              {
                icon: BookOpen,
                title: 'Service Client Intelligent',
                description: 'Un assistant virtuel disponible 24/7',
                path: '/customer-service',
                color: 'yellow'
              }
            ].map((feature, index) => (
              <div
                key={index}
                onClick={() => navigate(feature.path)}
                className="bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow cursor-pointer transform hover:-translate-y-1 transition-transform duration-300"
              >
                <feature.icon className={`w-12 h-12 text-${feature.color === 'yellow' ? 'yellow-500' : feature.color + '-600'} mb-6`} />
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{feature.title}</h3>
                <p className="text-gray-600 mb-6">{feature.description}</p>
                <div className="flex items-center text-yellow-500 font-medium">
                  <span>En savoir plus</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Business Plans Section */}
      <div className="py-24 bg-white" id="subscription-plans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Abonnements Professionnels</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Choisissez le plan qui correspond aux besoins de votre entreprise
            </p>
          </div>

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
                className={`bg-white rounded-xl shadow-lg overflow-hidden border ${
                  plan.id === 'pro' ? 'border-yellow-200 ring-2 ring-yellow-500 transform scale-105' : 'border-gray-200'
                }`}
              >
                {plan.id === 'pro' && (
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
                    <span className="text-gray-500 ml-1">/mois</span>
                  </div>

                  <ul className="space-y-4 mb-8">
                    {(plan.shortFeatures || plan.features.slice(0, 5)).map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                        <span className="text-gray-600 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {expandedPlan === plan.id && (
                    <div className="mt-4 mb-8 border-t border-gray-100 pt-4">
                      <div className="mb-4">
                        <p className="text-gray-600 text-sm mb-4">{plan.detailedDescription}</p>
                      </div>
                      <ul className="space-y-4">
                        {plan.features.slice(5).map((feature, featureIndex) => (
                          <li key={featureIndex + 5} className="flex items-start">
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mr-2" />
                            <span className="text-gray-600 text-sm">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => togglePlanDetails(plan.id)}
                      className="w-full px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1"
                    >
                      {expandedPlan === plan.id ? (
                        <>
                          Voir moins
                          <ChevronDown className="w-4 h-4 transform rotate-180" />
                        </>
                      ) : (
                        <>
                          Voir plus
                          <ChevronDown className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleSubscribe(plan.id)}
                      className={`w-full px-6 py-3 rounded-lg flex items-center justify-center gap-2 ${
                        plan.id === 'pro'
                          ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      } transition-colors shadow-sm`}
                    >
                      Choisir ce plan
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Ce que disent nos utilisateurs</h2>
            <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez comment {settings.app_name} transforme l'expérience de nos clients
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: "Marie Diop",
                role: "Étudiante en Terminale",
                quote: `Grâce à ${settings.app_name}, j'ai pu améliorer mes notes en mathématiques et physique. L'assistant répond à toutes mes questions, même tard le soir!`,
                avatar: "https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150"
              },
              {
                name: "Jean Ndiaye",
                role: "Propriétaire de boutique",
                quote: "L'intégration WhatsApp a transformé ma communication avec mes clients. Je peux maintenant envoyer des promotions et répondre aux questions automatiquement.",
                avatar: "https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150"
              },
              {
                name: "Fatou Sow",
                role: "Enseignante",
                quote: `Je recommande ${settings.app_name} à tous mes élèves. C'est comme avoir un tuteur personnel disponible à tout moment pour les aider dans leurs révisions.`,
                avatar: "https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-xl shadow-sm p-8 relative">
                <div className="absolute top-0 right-0 transform translate-x-2 -translate-y-2">
                  <div className="text-yellow-500 text-6xl leading-none">"</div>
                </div>
                <div className="relative z-10">
                  <p className="text-gray-600 mb-6 italic">{testimonial.quote}</p>
                  <div className="flex items-center">
                    <img 
                      src={testimonial.avatar} 
                      alt={testimonial.name} 
                      className="w-12 h-12 rounded-full mr-4 object-cover"
                    />
                    <div>
                      <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                      <p className="text-sm text-gray-500">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 bg-yellow-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-3/5">
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Prêt à transformer votre expérience?
              </h2>
              <p className="mt-4 text-lg text-yellow-100">
                Rejoignez des milliers d'utilisateurs qui ont déjà amélioré leur communication et leur apprentissage avec {settings.app_name}.
              </p>
            </div>
            <div className="mt-8 lg:mt-0 lg:w-2/5 lg:flex lg:justify-end">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate('/airtel-chat')}
                  className="px-8 py-3 bg-white text-yellow-500 rounded-lg hover:bg-gray-100 transition-colors shadow-md font-medium"
                >
                  Abonnement Éducatif
                </button>
                <button
                  onClick={() => navigate('/professional-subscription')}
                  className="px-8 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors shadow-md font-medium"
                >
                  Abonnement Professionnel
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Sécurisé</h3>
              <p className="mt-2 text-gray-600">
                Vos données sont protégées avec les meilleurs standards de sécurité et de confidentialité
              </p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Rapide</h3>
              <p className="mt-2 text-gray-600">
                Une plateforme optimisée pour des performances maximales et des réponses instantanées
              </p>
            </div>
            <div className="text-center">
              <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Fiable</h3>
              <p className="mt-2 text-gray-600">
                Un service disponible 24/7 avec un support réactif et une équipe dédiée
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Contactez-nous</h2>
            <p className="mt-4 text-xl text-gray-600">
              Notre équipe est là pour vous aider
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <Phone className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Téléphone</h3>
              <p className="mt-2 text-gray-600">{settings.contact_phone}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <Mail className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Email</h3>
              <p className="mt-2 text-gray-600">{settings.contact_email}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <MapPin className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900">Adresse</h3>
              <p className="mt-2 text-gray-600">{settings.contact_address}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Logo and Description */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="w-8 h-8 text-yellow-500" />
              <span className="text-xl font-semibold">{settings.app_name}</span>
            </div>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Révolutionnez votre communication et votre apprentissage avec l'intelligence artificielle
            </p>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Produits</h4>
              <ul className="space-y-2">
                <li><Link to="/airtel-chat" className="text-gray-400 hover:text-white">MTN Chat</Link></li>
                <li><Link to="/professional-subscription" className="text-gray-400 hover:text-white">Business Solutions</Link></li>
                <li><Link to="/features" className="text-gray-400 hover:text-white">Fonctionnalités</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Support</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-gray-400 hover:text-white">Centre d'aide</Link></li>
                <li><a href="#" className="text-gray-400 hover:text-white">FAQ</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Légal</h4>
              <ul className="space-y-2">
                <li><Link to="/terms-of-use" className="text-gray-400 hover:text-white">Conditions d'utilisation</Link></li>
                <li><Link to="/privacy-policy" className="text-gray-400 hover:text-white">Politique de confidentialité</Link></li>
                <li><Link to="/legal-notice" className="text-gray-400 hover:text-white">Mentions légales</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Suivez-nous</h4>
              <div className="flex space-x-4">
                {settings.social_links.facebook && (
                  <a href={settings.social_links.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="sr-only">Facebook</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" clipRule="evenodd" />
                    </svg>
                  </a>
                )}
                {settings.social_links.instagram && (
                  <a href={settings.social_links.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="sr-only">Instagram</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" clipRule="evenodd" />
                    </svg>
                  </a>
                )}
                {settings.social_links.twitter && (
                  <a href={settings.social_links.twitter} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="sr-only">Twitter</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                    </svg>
                  </a>
                )}
                {settings.social_links.linkedin && (
                  <a href={settings.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white">
                    <span className="sr-only">LinkedIn</span>
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Language Selector */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2 text-gray-400">
              <Globe className="w-5 h-5" />
              <select className="bg-transparent border-none focus:ring-0">
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-gray-400 border-t border-gray-800 pt-8">
            <p>© {new Date().getFullYear()} {settings.app_name}. Tous droits réservés.</p>
            <p className="mt-2 flex items-center justify-center gap-1">
              {settings.footer_text}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;