import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../components/AppSettingsContext';
import Navigation from '../components/Navigation';

const PrivacyPolicy = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Politique de Confidentialité</h1>
          
          <div className="prose prose-lg max-w-none">
            <p>
              Dernière mise à jour : {currentYear}
            </p>
            
            <p>
              Chez {settings.app_name}, nous accordons une grande importance à la protection de vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons, partageons et protégeons vos informations lorsque vous utilisez notre service.
            </p>
            
            <h2>1. Informations que nous collectons</h2>
            <p>
              Nous collectons les types d'informations suivants :
            </p>
            <h3>1.1 Informations que vous nous fournissez</h3>
            <ul>
              <li>Informations de compte : nom, prénom, adresse e-mail, numéro de téléphone</li>
              <li>Informations de profil : niveau d'études, matières préférées, langue préférée</li>
              <li>Contenu des messages : questions, réponses et autres communications via notre plateforme</li>
              <li>Informations de paiement : détails de transaction (nous ne stockons pas les informations complètes de carte de crédit)</li>
            </ul>
            
            <h3>1.2 Informations collectées automatiquement</h3>
            <ul>
              <li>Données d'utilisation : interactions avec notre service, fonctionnalités utilisées, temps passé</li>
              <li>Données de l'appareil : type d'appareil, système d'exploitation, identifiants uniques</li>
              <li>Données de localisation : pays et région basés sur votre adresse IP</li>
              <li>Cookies et technologies similaires : pour améliorer votre expérience et analyser l'utilisation du service</li>
            </ul>
            
            <h2>2. Comment nous utilisons vos informations</h2>
            <p>
              Nous utilisons vos informations pour :
            </p>
            <ul>
              <li>Fournir, maintenir et améliorer notre service</li>
              <li>Personnaliser votre expérience d'apprentissage ou de communication</li>
              <li>Traiter vos transactions et gérer vos abonnements</li>
              <li>Communiquer avec vous concernant votre compte, nos services, et les mises à jour</li>
              <li>Analyser l'utilisation de notre service pour améliorer nos offres</li>
              <li>Détecter, prévenir et résoudre les problèmes techniques ou de sécurité</li>
              <li>Se conformer aux obligations légales</li>
            </ul>
            
            <h2>3. Partage de vos informations</h2>
            <p>
              Nous ne vendons pas vos données personnelles. Nous pouvons partager vos informations dans les circonstances suivantes :
            </p>
            <ul>
              <li>Avec des fournisseurs de services qui nous aident à exploiter notre service (traitement des paiements, analyse de données, etc.)</li>
              <li>Pour se conformer à la loi, à une procédure judiciaire, ou à une demande gouvernementale</li>
              <li>Pour protéger les droits, la propriété ou la sécurité de {settings.app_name}, de nos utilisateurs ou du public</li>
              <li>Dans le cadre d'une fusion, acquisition ou vente d'actifs, avec votre consentement préalable</li>
            </ul>
            
            <h2>4. Sécurité des données</h2>
            <p>
              Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos informations contre l'accès non autorisé, l'altération, la divulgation ou la destruction. Ces mesures comprennent le chiffrement des données, les contrôles d'accès, et les audits de sécurité réguliers.
            </p>
            
            <h2>5. Conservation des données</h2>
            <p>
              Nous conservons vos informations aussi longtemps que nécessaire pour fournir nos services et respecter nos obligations légales. Si vous supprimez votre compte, nous supprimerons ou anonymiserons vos informations, sauf si nous devons les conserver pour des raisons légales.
            </p>
            
            <h2>6. Vos droits</h2>
            <p>
              Selon votre juridiction, vous pouvez avoir certains droits concernant vos données personnelles, notamment :
            </p>
            <ul>
              <li>Accéder à vos données personnelles</li>
              <li>Corriger vos données inexactes</li>
              <li>Supprimer vos données</li>
              <li>Restreindre ou s'opposer au traitement de vos données</li>
              <li>Portabilité des données</li>
              <li>Retirer votre consentement</li>
            </ul>
            <p>
              Pour exercer ces droits, veuillez nous contacter à {settings.contact_email}.
            </p>
            
            <h2>7. Utilisation de WhatsApp</h2>
            <p>
              Notre service utilise l'API WhatsApp Business pour communiquer avec vous. En utilisant notre service via WhatsApp, vous acceptez également les conditions d'utilisation et la politique de confidentialité de WhatsApp.
            </p>
            
            <h2>8. Transferts internationaux de données</h2>
            <p>
              Vos informations peuvent être transférées et traitées dans des pays autres que celui où vous résidez. Ces pays peuvent avoir des lois différentes sur la protection des données. Nous prenons des mesures pour garantir que vos données bénéficient d'un niveau de protection adéquat.
            </p>
            
            <h2>9. Enfants</h2>
            <p>
              Notre service n'est pas destiné aux enfants de moins de 16 ans. Nous ne collectons pas sciemment des informations personnelles d'enfants de moins de 16 ans. Si vous êtes un parent ou un tuteur et que vous pensez que votre enfant nous a fourni des informations personnelles, veuillez nous contacter.
            </p>
            
            <h2>10. Modifications de cette politique</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement important par e-mail ou par une notification sur notre service. Nous vous encourageons à consulter régulièrement cette politique.
            </p>
            
            <h2>11. Contact</h2>
            <p>
              Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à :
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

export default PrivacyPolicy;