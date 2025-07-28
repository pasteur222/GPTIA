import { supabase } from './supabase';

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'daily' | 'weekly' | 'monthly';
  price: number;
  features: string[];
  messageLimit: number | null;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'daily',
    name: 'Forfait Journalier',
    type: 'daily',
    price: 500,
    features: [
      'Accès à toutes les matières',
      'Questions illimitées',
      'Disponible 24/7',
      'Explications détaillées',
      'Exercices pratiques',
      '500 messages'
    ],
    messageLimit: 500
  },
  {
    id: 'weekly',
    name: 'Forfait Hebdomadaire',
    type: 'weekly',
    price: 2500,
    features: [
      'Accès à toutes les matières',
      'Questions illimitées',
      'Disponible 24/7',
      'Explications détaillées',
      'Exercices pratiques',
      '3000 messages'
    ],
    messageLimit: 3000
  },
  {
    id: 'monthly',
    name: 'Forfait Mensuel',
    type: 'monthly',
    price: 5000,
    features: [
      'Accès à toutes les matières',
      'Questions illimitées',
      'Disponible 24/7',
      'Explications détaillées',
      'Exercices pratiques',
      'Messages illimités'
    ],
    messageLimit: null
  }
];

export async function checkSubscriptionStatus(phoneNumber: string): Promise<boolean> {
  // Always return true to grant access without subscription
  return true;
}

export async function getActiveSubscription(phoneNumber: string) {
  try {
    const { data: student } = await supabase
      .from('student_profiles')
      .select('id')
      .eq('phone_number', phoneNumber)
      .maybeSingle();

    if (!student) {
      return null;
    }

    // Create a fake active subscription with unlimited messages
    return {
      id: 'fake-subscription-id',
      student_id: student.id,
      plan_type: 'monthly',
      start_date: new Date().toISOString(),
      end_date: new Date(2099, 11, 31).toISOString(),
      status: 'active',
      messages_remaining: null // Unlimited messages
    };
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
}

export async function decrementMessageCount(phoneNumber: string): Promise<boolean> {
  // Always return true to indicate successful message sending without decrementing
  return true;
}

export async function initiateSubscriptionPayment(
  studentId: string,
  planType: string,
  phoneNumber: string
): Promise<any> {
  try {
    // Calculate end date based on plan type
    const startDate = new Date();
    const endDate = new Date(2099, 11, 31); // Far future date
    
    // Get plan price
    const plan = SUBSCRIPTION_PLANS.find(p => p.id === planType);
    if (!plan) {
      throw new Error('Plan not found');
    }

    // Get custom price from database if available
    const { data: customPrice } = await supabase
      .from('pricing')
      .select('price')
      .eq('plan tarifaire', planType)
      .maybeSingle();

    // Use custom price if available, otherwise use default price
    const price = customPrice?.price || plan.price;

    // Create subscription record with active status (bypass payment)
    const { data: subscription, error: subscriptionError } = await supabase
      .from('student_subscriptions')
      .insert({
        student_id: studentId,
        plan_type: planType,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        status: 'active', // Set as active immediately
        whatsapp_number: phoneNumber,
        messages_remaining: null // Unlimited messages
      })
      .select()
      .single();

    if (subscriptionError) throw subscriptionError;

    // Create a fake successful transaction
    await supabase
      .from('subscription_transactions')
      .insert({
        subscription_id: subscription.id,
        amount: price, // Use the custom or default price
        status: 'completed', // Mark as completed
        provider: 'system',
        provider_transaction_id: 'free-access-' + Date.now()
      });

    return {
      success: true,
      message: 'Subscription activated successfully',
      transaction: { id: 'free-access-' + Date.now() }
    };
  } catch (error) {
    console.error('Error initiating subscription payment:', error);
    throw error;
  }
}