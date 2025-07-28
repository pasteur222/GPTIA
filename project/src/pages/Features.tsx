import React from 'react';
import { MessageSquare, Bot, Brain, BookOpen, GamepadIcon, ChevronRight, Shield, Zap, Award, Users, BarChart2, Clock, Filter, Briefcase, Smartphone, RefreshCw, Send } from 'lucide-react';
import BackButton from '../components/BackButton';

const Features = () => {
  const features = [
    {
      title: 'WhatsApp Integration',
      icon: MessageSquare,
      description: 'Communication fluide via WhatsApp',
      details: [
        'Intégration native avec l\'API WhatsApp Business',
        'Messagerie automatisée intelligente',
        'Gestion des conversations en temps réel',
        'Réponses personnalisées basées sur l\'IA'
      ],
      color: 'blue'
    },
    {
      title: 'Service Client IA',
      icon: Bot,
      description: 'Assistant virtuel intelligent 24/7',
      details: [
        'Réponses automatiques intelligentes',
        'Analyse des intentions utilisateur',
        'Base de connaissances évolutive',
        'Support multilingue'
      ],
      color: 'green'
    },
    {
      title: 'Education Interactive',
      icon: BookOpen,
      description: 'Plateforme d\'apprentissage personnalisée',
      details: [
        'Sessions d\'apprentissage adaptatives',
        'Suivi des progrès en temps réel',
        'Contenu personnalisé par niveau',
        'Analyses détaillées des performances'
      ],
      color: 'red'
    },
    {
      title: 'Quiz Engageants',
      icon: GamepadIcon,
      description: 'Système de quiz interactif',
      details: [
        'Questions personnalisées par niveau',
        'Système de points et classements',
        'Statistiques de progression',
        'Challenges quotidiens'
      ],
      color: 'yellow'
    },
    {
      title: 'Filtrage des Numéros',
      icon: Filter,
      description: 'Gestion intelligente des contacts',
      details: [
        'Vérification automatique des numéros WhatsApp',
        'Filtrage par pays et opérateur',
        'Import/export de listes',
        'Validation en masse'
      ],
      color: 'red'
    },
    {
      title: 'Analyses Avancées',
      icon: BarChart2,
      description: 'Insights détaillés et rapports',
      details: [
        'Tableaux de bord en temps réel',
        'Métriques de performance',
        'Rapports personnalisables',
        'Export des données'
      ],
      color: 'indigo'
    },
    {
      title: 'Business Automation',
      icon: Briefcase,
      description: 'Automatisation des processus business',
      details: [
        'Réponses automatiques personnalisables',
        'Règles basées sur des mots-clés',
        'Variables dynamiques dans les réponses',
        'Prioritisation des règles d\'automatisation'
      ],
      color: 'orange'
    },
    {
      title: 'Marketing WhatsApp',
      icon: Send,
      description: 'Campagnes marketing via WhatsApp',
      details: [
        'Envoi en masse de messages marketing',
        'Personnalisation avec variables (nom, entreprise, etc.)',
        'Programmation d\'envois pour plus tard',
        'Importation de contacts depuis fichiers CSV/TXT'
      ],
      color: 'emerald'
    },
    {
      title: 'Médias Enrichis',
      icon: Smartphone,
      description: 'Support de médias variés',
      details: [
        'Envoi de vidéos, images et fichiers PDF',
        'Contenu audio pour une meilleure expérience',
        'Templates de messages réutilisables',
        'Galeries de médias organisées'
      ],
      color: 'pink'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <BackButton />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Nos Fonctionnalités</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez toutes les fonctionnalités innovantes qui font d'Africell AI la plateforme idéale pour votre communication et votre apprentissage.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className={`bg-${feature.color}-50 p-6`}>
                <feature.icon className={`w-12 h-12 text-${feature.color}-600 mb-4`} />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4">{feature.description}</p>
              </div>
              <div className="p-6 bg-white">
                <ul className="space-y-3">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-center gap-2">
                      <ChevronRight className={`w-4 h-4 text-${feature.color}-500`} />
                      <span className="text-gray-600">{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <Shield className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Sécurité Maximale</h3>
            <p className="mt-2 text-gray-600">
              Protection des données et confidentialité garanties selon les normes les plus strictes.
            </p>
          </div>
          <div className="text-center">
            <Zap className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Performance Optimale</h3>
            <p className="mt-2 text-gray-600">
              Système optimisé pour une réactivité maximale et une expérience fluide.
            </p>
          </div>
          <div className="text-center">
            <Award className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">Support Premium</h3>
            <p className="mt-2 text-gray-600">
              Équipe de support dédiée pour vous accompagner à chaque étape.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Features;