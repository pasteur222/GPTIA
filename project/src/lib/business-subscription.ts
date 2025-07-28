import { supabase } from './supabase';

export interface BusinessPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  messageLimit: number | null;
  shortFeatures?: string[]; // Short list for initial display
  detailedDescription?: string; // Additional description for "See more" view
}

export const BUSINESS_PLANS: BusinessPlan[] = [
  {
    id: 'basic',
    name: 'Basique',
    price: 70000,
    shortFeatures: [
      'Messages illimités par mois',
      'Module WhatsApp: Envoi en masse de messages marketing',
      'Filtrage de numéros WhatsApp',
      'Module Business: Automatisation des réponses',
      'Importation de contacts depuis fichiers'
    ],
    features: [
      'Messages illimités par mois',
      'Module WhatsApp: Envoi en masse de messages marketing et promotionnels à vos clients sur WhatsApp de manière légale.',
      'Personnalisation des messages avec les prénoms, noms et autres variables de vos clients.',
      'Filtrage de numéros: Identifiez et sélectionnez uniquement les numéros actifs sur WhatsApp à partir de vos fichiers de contacts.',
      'Module Business: Automatisation des réponses sans nécessiter d\'API externe.',
      'Importation de contacts depuis des fichiers TXT ou CSV.',
      'Programmation d\'envois de messages pour plus tard.',
      'Création et réutilisation de modèles de messages.',
      'Envoi de médias enrichis: vidéos, PDF, images et fichiers audio.',
      'Statistiques de base sur les envois et les taux de livraison.'
    ],
    detailedDescription: 'Le plan Basique est idéal pour les petites entreprises qui débutent avec le marketing WhatsApp. Il offre toutes les fonctionnalités essentielles pour gérer vos communications avec vos clients, filtrer vos listes de contacts et automatiser vos réponses.',
    messageLimit: null
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 200000,
    shortFeatures: [
      'Messages illimités par mois',
      'Toutes les fonctionnalités du plan Basique',
      'Module Service Client avec IA',
      'Base de connaissances personnalisable',
      'Support prioritaire'
    ],
    features: [
      'Messages illimités par mois',
      'Module WhatsApp: Envoi en masse de messages marketing et promotionnels à vos clients sur WhatsApp de manière légale.',
      'Personnalisation des messages avec les prénoms, noms et autres variables de vos clients.',
      'Filtrage de numéros: Identifiez et sélectionnez uniquement les numéros actifs sur WhatsApp à partir de vos fichiers de contacts.',
      'Module Business: Automatisation des réponses sans nécessiter d\'API externe.',
      'Importation de contacts depuis des fichiers TXT ou CSV.',
      'Programmation d\'envois de messages pour plus tard.',
      'Création et réutilisation de modèles de messages.',
      'Envoi de médias enrichis: vidéos, PDF, images et fichiers audio.',
      'Module Service Client: Assistant virtuel IA pour répondre automatiquement aux questions fréquentes de vos clients.',
      'Base de connaissances personnalisable pour votre entreprise.',
      'Analyse des intentions des clients et réponses contextuelles.',
      'Détection automatique des problèmes et escalade vers un agent humain si nécessaire.',
      'Rapports détaillés sur les interactions clients et les taux de satisfaction.',
      'Automatisation avancée avec variables de personnalisation multiples.',
      'Analyses détaillées des performances de vos campagnes.',
      'Segmentation avancée de votre audience.',
      'Support prioritaire par email et téléphone.',
      'Formation personnalisée à l\'utilisation de la plateforme.'
    ],
    detailedDescription: 'Le plan Pro est conçu pour les entreprises qui souhaitent optimiser leur service client et leur marketing. En plus de toutes les fonctionnalités du plan Basique, vous bénéficiez d\'un assistant virtuel IA pour automatiser vos réponses aux questions fréquentes, d\'analyses avancées et d\'un support prioritaire.',
    messageLimit: null
  },
  {
    id: 'enterprise',
    name: 'Entreprise',
    price: 300000,
    shortFeatures: [
      'Messages illimités par mois',
      'Toutes les fonctionnalités du plan Pro',
      'Module Quiz interactif',
      'API dédiée et intégrations',
      'Assistance technique 24/7'
    ],
    features: [
      'Messages illimités par mois',
      'Module WhatsApp: Envoi en masse de messages marketing et promotionnels à vos clients sur WhatsApp de manière légale.',
      'Personnalisation des messages avec les prénoms, noms et autres variables de vos clients.',
      'Filtrage de numéros: Identifiez et sélectionnez uniquement les numéros actifs sur WhatsApp à partir de vos fichiers de contacts.',
      'Module Business: Automatisation des réponses sans nécessiter d\'API externe.',
      'Importation de contacts depuis des fichiers TXT ou CSV.',
      'Programmation d\'envois de messages pour plus tard.',
      'Création et réutilisation de modèles de messages.',
      'Envoi de médias enrichis: vidéos, PDF, images et fichiers audio.',
      'Module Service Client: Assistant virtuel IA pour répondre automatiquement aux questions fréquentes de vos clients.',
      'Base de connaissances personnalisable pour votre entreprise.',
      'Analyse des intentions des clients et réponses contextuelles.',
      'Détection automatique des problèmes et escalade vers un agent humain si nécessaire.',
      'Rapports détaillés sur les interactions clients et les taux de satisfaction.',
      'Module Quiz: Création de quiz interactifs pour engager votre audience.',
      'Jeux-concours et sondages personnalisables avec classements automatiques.',
      'Collecte de données clients via des quiz ludiques et éducatifs.',
      'Analyse des résultats et segmentation basée sur les réponses.',
      'Programmation de quiz récurrents et campagnes de fidélisation.',
      'API dédiée pour intégration avec vos systèmes existants.',
      'Personnalisation complète de la plateforme selon vos besoins.',
      'Assistance technique dédiée 24/7.',
      'Tableau de bord analytique avancé avec rapports personnalisés.',
      'Gestion multi-utilisateurs avec différents niveaux d\'accès.',
      'Hébergement sur serveurs dédiés pour une performance optimale.',
      'Contrat de niveau de service (SLA) garantissant une disponibilité de 99,9%.'
    ],
    detailedDescription: 'Le plan Entreprise est notre offre la plus complète, idéale pour les grandes entreprises et organisations. En plus de toutes les fonctionnalités du plan Pro, vous bénéficiez de messages illimités, du module Quiz interactif pour engager votre audience, d\'une API dédiée pour des intégrations personnalisées, et d\'une assistance technique disponible 24/7.',
    messageLimit: null
  }
];

export async function checkBusinessSubscriptionStatus(userId: string): Promise<{
  active: boolean;
  plan?: string;
  messagesRemaining?: number | null;
  endDate?: string;
}> {
  // Always return active enterprise subscription with unlimited messages
  return {
    active: true,
    plan: 'enterprise',
    messagesRemaining: null,
    endDate: new Date(2099, 11, 31).toISOString()
  };
}

export async function decrementBusinessMessageCount(userId: string): Promise<boolean> {
  // Always return true to indicate successful message sending without decrementing
  return true;
}

export async function getBusinessTransactions(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('business_transactions')
      .select(`
        *,
        business_subscriptions(user_id, plan)
      `)
      .eq('business_subscriptions.user_id', userId);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting business transactions:', error);
    return [];
  }
}

export async function initiateBusinessPayment(userId: string, planId: string, phoneNumber: string): Promise<any> {
  try {
    // Calculate end date (far in the future)
    const startDate = new Date();
    const endDate = new Date(2099, 11, 31);
    
    // Get plan price and message limit
    const plan = BUSINESS_PLANS.find(p => p.id === planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Try to get custom pricing from database
    const { data: pricingData } = await supabase
      .from('pricing')
      .select('*')
      .eq('plan tarifaire', planId)
      .maybeSingle();
    
    // Use custom price if available, otherwise use default price
    const price = pricingData?.price || plan.price;

    // Create subscription record with active status (bypass payment)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('business_subscriptions')
      .insert({
        user_id: userId,
        plan: planId, // Changed from plan_id to plan to match the database schema
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active', // Set as active immediately
        phone_number: phoneNumber,
        messages_remaining: null // Unlimited messages
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Create a fake successful transaction
    await supabase
      .from('business_transactions')
      .insert({
        subscription_id: subscription.id,
        amount: price, // Use the custom or default price
        status: 'completed', // Mark as completed
        provider: 'system',
        provider_transaction_id: 'free-access-' + Date.now()
      });

    return {
      success: true,
      message: 'Business subscription activated successfully',
      transaction: { id: 'free-access-' + Date.now() }
    };
  } catch (error) {
    console.error('Error initiating business payment:', error);
    throw error;
  }
}