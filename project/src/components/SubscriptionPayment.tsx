import React, { useState, useEffect } from 'react';
import { Phone, Loader2, CheckCircle, XCircle, AlertTriangle, Mail, BookOpen, Lock } from 'lucide-react';
import { initiateSubscriptionPayment } from '../lib/subscription';
import { getOrCreateStudentProfile } from '../lib/education';
import type { SubscriptionPlan } from '../lib/subscription';
import { supabase } from '../lib/supabase';

interface SubscriptionPaymentProps {
  plan: SubscriptionPlan;
  onSuccess: () => void;
  onCancel: () => void;
}

const SubscriptionPayment: React.FC<SubscriptionPaymentProps> = ({ plan, onSuccess, onCancel }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [studyLevel, setStudyLevel] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'FCFA' | 'USD'>('FCFA');
  const exchangeRate = 0.00165; // 1 FCFA = 0.00165 USD (approximate)

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment_status');
      const transactionId = urlParams.get('transaction_id');

      if (paymentStatus && transactionId) {
        if (paymentStatus === 'success') {
          setStatus('success');
          setTimeout(() => {
            onSuccess();
          }, 2000);
        } else {
          setStatus('error');
          setError('Le paiement a échoué. Veuillez réessayer.');
        }
      }
    };

    checkPaymentStatus();
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus('processing');

    try {
      if (!phoneNumber || !email || !studyLevel || !password) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }
      if (!phoneNumber.match(/^\+?[0-9]{10,15}$/)) {
        throw new Error('Numéro de téléphone invalide');
      }
      if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        throw new Error('Adresse email invalide');
      }
      if (password.length < 6) {
        throw new Error('Le mot de passe doit contenir au moins 6 caractères');
      }
      if (password !== confirmPassword) {
        throw new Error('Les mots de passe ne correspondent pas');
      }

      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;

      const student = await getOrCreateStudentProfile(formattedPhone);
      setStudentId(student.id);

      await updateStudentProfile(student.id, firstName, lastName, email, studyLevel);

      await initiateSubscriptionPayment(
        student.id,
        plan.type,
        formattedPhone
      );

      setStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (err) {
      console.error('Payment error:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const updateStudentProfile = async (id: string, firstName: string, lastName: string, email: string, level: string) => {
    try {
      await supabase
        .from('student_profiles')
        .update({
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          email: email || undefined,
          level: level || undefined
        })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating student profile:', error);
    }
  };

  const toggleCurrency = () => {
    setCurrency(currency === 'FCFA' ? 'USD' : 'FCFA');
  };

  const formatPrice = (price: number) => {
    if (currency === 'USD') {
      const usdPrice = price * exchangeRate;
      return usdPrice.toFixed(2);
    }
    return price.toLocaleString();
  };

  return (
    <div className="p-6">
      {status === 'success' ? (
        <div className="text-center py-8">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Paiement réussi !</h3>
          <p className="text-gray-600 mb-6">
            Votre abonnement {plan.name} a été activé avec succès.
          </p>
        </div>
      ) : status === 'error' ? (
        <div className="text-center py-8">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Erreur de paiement</h3>
          <p className="text-red-600 mb-6">{error}</p>
          <button
            onClick={() => setStatus('idle')}
            className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
          >
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-yellow-500" />
              <div>
                <h3 className="text-lg font-semibold">Abonnement {plan.name}</h3>
                <div className="flex items-center gap-2">
                  {currency === 'USD' ? (
                    <p className="text-sm text-gray-500">{currency} {formatPrice(plan.price)}</p>
                  ) : (
                    <p className="text-sm text-gray-500">{formatPrice(plan.price)} {currency}</p>
                  )}
                  <button 
                    onClick={toggleCurrency}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    ({currency === 'FCFA' ? 'Voir en USD' : 'Voir en FCFA'})
                  </button>
                </div>
              </div>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {plan.messageLimit ? `${plan.messageLimit} messages` : 'Messages illimités'}
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau d'études <span className="text-red-500">*</span>
              </label>
              <select
                value={studyLevel}
                onChange={(e) => setStudyLevel(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              >
                <option value="">Sélectionnez votre niveau</option>
                <option value="6ème">6ème</option>
                <option value="5ème">5ème</option>
                <option value="4ème">4ème</option>
                <option value="3ème">3ème</option>
                <option value="Seconde">Seconde</option>
                <option value="Première">Première</option>
                <option value="Terminale">Terminale</option>
                <option value="Université">Université</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="+221 XX XXX XX XX"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                    minLength={6}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-6">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div className="text-sm text-gray-500">
                  <p>En vous abonnant, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.</p>
                </div>
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      'Payer maintenant'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
};

export default SubscriptionPayment;