import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../components/AppSettingsContext';
import Navigation from '../components/Navigation';

const LegalNotice = () => {
  const { settings } = useAppSettings();
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-6">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Mentions Légales</h1>
          
          <div className="prose prose-lg max-w-none">
            <p>
              Dernière mise à jour : {currentYear}
            </p>
            
            <h2>1. Informations légales</h2>
            <p>
              Le site {settings.app_name} est édité par :
            </p>
            <p>
              <strong>{settings.company_name}</strong><br />
              Adresse : {settings.contact_address}<br />
              Email : {settings.contact_email}<br />
              Téléphone : {settings.contact_phone}
            </p>
            <p>
              Directeur de la publication : Directeur Général de {settings.company_name}
            </p>
            
            <h2>2. Hébergement</h2>
            <p>
              Le site {settings.app_name} est hébergé par :
            </p>
            <p>
              Supabase, Inc.<br />
              Adresse : 444 De Haro Street, Suite 100, San Francisco, CA 94107, États-Unis<br />
              Site web : https://supabase.com
            </p>
            
            <h2>3. Propriété intellectuelle</h2>
            <p>
              L'ensemble du contenu du site {settings.app_name} (architecture, textes, images, logos, icônes, sons, logiciels, etc.) est la propriété exclusive de {settings.company_name} ou de ses partenaires. Toute reproduction, représentation, modification, publication, adaptation de tout ou partie des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite, sauf autorisation écrite préalable de {settings.company_name}.
            </p>
            <p>
              Toute exploitation non autorisée du site ou de l'un quelconque des éléments qu'il contient sera considérée comme constitutive d'une contrefaçon et poursuivie conformément aux dispositions des articles L.335-2 et suivants du Code de Propriété Intellectuelle.
            </p>
            
            <h2>4. Données personnelles</h2>
            <p>
              Les informations concernant la collecte et le traitement des données personnelles sont détaillées dans notre <Link to="/privacy-policy" className="text-red-600 hover:text-red-800">Politique de Confidentialité</Link>.
            </p>
            
            <h2>5. Cookies</h2>
            <p>
              Le site {settings.app_name} utilise des cookies pour améliorer l'expérience utilisateur. En naviguant sur notre site, vous acceptez l'utilisation de cookies conformément à notre politique de confidentialité.
            </p>
            
            <h2>6. Limitations de responsabilité</h2>
            <p>
              {settings.company_name} ne pourra être tenue responsable des dommages directs ou indirects causés au matériel de l'utilisateur, lors de l'accès au site {settings.app_name}, et résultant soit de l'utilisation d'un matériel ne répondant pas aux spécifications techniques requises, soit de l'apparition d'un bug ou d'une incompatibilité.
            </p>
            <p>
              {settings.company_name} ne pourra également être tenue responsable des dommages indirects (tels par exemple qu'une perte de marché ou perte d'une chance) consécutifs à l'utilisation du site {settings.app_name}.
            </p>
            
            <h2>7. Liens hypertextes</h2>
            <p>
              Le site {settings.app_name} peut contenir des liens hypertextes vers d'autres sites. {settings.company_name} n'a pas la possibilité de vérifier le contenu des sites ainsi visités, et n'assumera en conséquence aucune responsabilité de ce fait.
            </p>
            
            <h2>8. Droit applicable et juridiction compétente</h2>
            <p>
              Tout litige en relation avec l'utilisation du site {settings.app_name} est soumis au droit congolais. Il est fait attribution exclusive de juridiction aux tribunaux compétents de Brazzaville.
            </p>
            
            <h2>9. Contact</h2>
            <p>
              Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à :
            </p>
            <p>
              Email : {settings.contact_email}<br />
              Téléphone : {settings.contact_phone}<br />
              Adresse : {settings.contact_address}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalNotice;