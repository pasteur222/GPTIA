import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { linkWhatsAppNumber } from '../lib/whatsapp-verification';
import BackButton from '../components/BackButton';

const WhatsAppVerification: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleVerification = async () => {
    setLoading(true);
    try {
      const response = await linkWhatsAppNumber();
      
      if (response.success || response.id) {
        setResult({
          success: true,
          message: "Votre numéro WhatsApp Business a été vérifié avec succès!"
        });
      } else {
        setResult({
          success: false,
          message: response.error?.message || "Une erreur est survenue lors de la vérification."
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Une erreur inconnue est survenue."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4">
        <BackButton />
      </div>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Vérification WhatsApp Business</h1>
            <p className="mt-2 text-gray-600">
              Liez votre numéro WhatsApp Business avec votre certificat validé
            </p>
          </div>

          <div className="p-6">
            {result ? (
              <div className="text-center py-8">
                {result.success ? (
                  <>
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Vérification réussie</h3>
                    <p className="text-gray-600 mb-6">{result.message}</p>
                    <button
                      onClick={() => navigate('/whatsapp')}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Aller à WhatsApp
                    </button>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Échec de la vérification</h3>
                    <p className="text-red-600 mb-6">{result.message}</p>
                    <button
                      onClick={() => setResult(null)}
                      className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Réessayer
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800 mb-2">Informations de vérification</h3>
                  <p className="text-sm text-blue-700">
                    Vous êtes sur le point de lier votre numéro WhatsApp Business avec le certificat validé par Meta.
                    Assurez-vous que votre numéro est déjà vérifié dans le Business Manager de Meta.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ID du numéro WhatsApp
                    </label>
                    <input
                      type="text"
                      value="571480576058954"
                      readOnly
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Certificat
                    </label>
                    <textarea
                      value="CmsKJwiKlrG8kciLAxIGZW50OndhIg5DYXB0ZWNobm9sb2dpZVCrudfABhpAX95AFxoHbjQT3ONKFMAPErZGoHmP8J+hMyZqN9YmNbhEZjZiRWkpJ5wguezIdtxlwO0JUtSeP2bosh0+iRCmAxIvbRYQkoqqjdnzWrKwnK5tLJVe7ONdzfIF7XVWiIsc/Dqa6fONLrwkJWWyBhnkVp4="
                      readOnly
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={handleVerification}
                    disabled={loading}
                    className="w-full flex justify-center items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Vérification en cours...
                      </>
                    ) : (
                      'Vérifier le numéro'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppVerification;