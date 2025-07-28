import { supabase } from './supabase';

interface PaymentRequest {
  amount: number;
  phone_number: string;
  student_id: string;
}

export async function initiateAirtelMoneyPayment(payment: PaymentRequest) {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/airtel-money`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payment)
      }
    );

    if (!response.ok) {
      throw new Error('Payment initiation failed');
    }

    const result = await response.json();

    // Save transaction in database
    await supabase
      .from('transactions')
      .insert({
        student_id: payment.student_id,
        amount: payment.amount,
        status: 'pending',
        provider: 'airtel_money',
        provider_transaction_id: result.transaction?.id
      });

    return result;
  } catch (error) {
    console.error('Error initiating Airtel Money payment:', error);
    throw error;
  }
}

export async function checkTransactionStatus(transactionId: string) {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('provider_transaction_id', transactionId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error checking transaction status:', error);
    throw error;
  }
}