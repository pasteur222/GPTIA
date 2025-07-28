import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppSettings } from '../components/AppSettingsContext';
import Navigation from '../components/Navigation';

const TermsOfUse = () => {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Conditions Générales d'Utilisation</h1>
          
          <div className="prose prose-lg max-w-none">
            <p>
              Dernière mise à jour : {currentYear}
            </p>
            
            <h2>1. Acceptation des conditions</h2>
            <p>
              En accédant et en utilisant {settings.app_name}, vous acceptez d'être lié par les présentes Conditions Générales d'Utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
            
            <h2>2. Description du service</h2>
            <p>
              {settings.app_name} est une plateforme d'intelligence artificielle qui offre des services d'assistance éducative et professionnelle via WhatsApp. Nos services comprennent :
            </p>
            <ul>
              <li>Assistance éducative pour les étudiants</li>
              <li>Service client automatisé pour les entreprises</li>
              <li>Quiz interactifs et jeux éducatifs</li>
              <li>Filtrage de numéros WhatsApp</li>
              <li>Automatisation des communications marketing</li>
            </ul>
            
            <h2>3. Conditions d'utilisation</h2>
            <p>
              Pour utiliser nos services, vous devez :
            </p>
            <ul>
              <li>Être âgé d'au moins 16 ans ou avoir l'autorisation d'un parent ou tuteur légal</li>
              <li>Créer un compte avec des informations exactes et complètes</li>
              <li>Maintenir la confidentialité de vos identifiants de compte</li>
              <li>Respecter toutes les lois locales, nationales et internationales applicables</li>
              <li>Ne pas utiliser le service à des fins illégales ou non autorisées</li>
            </ul>
            
            <h2>4. Abonnements et paiements</h2>
            <p>
              Certains de nos services nécessitent un abonnement payant. En souscrivant à un abonnement, vous acceptez les conditions suivantes :
            </p>
            <ul>
              <li>Les frais d'abonnement sont facturés selon la périodicité choisie (quotidienne, hebdomadaire, mensuelle)</li>
              <li>Les abonnements se renouvellent automatiquement sauf résiliation de votre part</li>
              <li>Vous pouvez annuler votre abonnement à tout moment depuis votre compte</li>
              <li>Aucun remboursement n'est accordé pour les périodes d'abonnement partiellement utilisées</li>
            </ul>
            
            <h2>5. Propriété intellectuelle</h2>
            <p>
              Tous les contenus présents sur {settings.app_name}, y compris les textes, graphiques, logos, icônes, images, clips audio, téléchargements numériques et compilations de données, sont la propriété de {settings.company_name} ou de ses fournisseurs de contenu et sont protégés par les lois internationales sur le droit d'auteur.
            </p>
            
            <h2>6. Limitation de responsabilité</h2>
            <p>
              {settings.app_name} fournit ses services "tels quels" et "selon disponibilité". Nous ne garantissons pas que :
            </p>
            <ul>
              <li>Le service répondra à vos exigences spécifiques</li>
              <li>Le service sera ininterrompu, opportun, sécurisé ou sans erreur</li>
              <li>Les résultats obtenus en utilisant le service seront exacts ou fiables</li>
              <li>La qualité des produits, services, informations ou autres matériels achetés ou obtenus par vous répondra à vos attentes</li>
            </ul>
            
            <h2>7. Utilisation de l'IA et contenu généré</h2>
            <p>
              Notre service utilise l'intelligence artificielle pour générer du contenu et des réponses. Veuillez noter que :
            </p>
            <ul>
              <li>Le contenu généré par l'IA peut contenir des inexactitudes ou des erreurs</li>
              <li>Les réponses éducatives doivent être vérifiées et ne remplacent pas l'avis d'un professionnel qualifié</li>
              <li>Vous êtes responsable de l'évaluation critique du contenu généré</li>
              <li>Nous ne sommes pas responsables des décisions prises sur la base du contenu généré par notre IA</li>
            </ul>
            
            <h2>8. Résiliation</h2>
            <p>
              Nous nous réservons le droit de suspendre ou de résilier votre accès à notre service, sans préavis ni responsabilité, pour quelque raison que ce soit, y compris, sans limitation, si vous enfreignez les présentes Conditions Générales d'Utilisation.
            </p>
            
            <h2>9. Modifications des conditions</h2>
            <p>
              Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication sur notre site. Il est de votre responsabilité de consulter régulièrement nos conditions pour prendre connaissance des modifications.
            </p>
            
            <h2>10. Loi applicable</h2>
            <p>
              Les présentes conditions sont régies et interprétées conformément aux lois de la République du Congo, sans égard aux principes de conflits de lois.
            </p>
            
            <h2>11. Contact</h2>
            <p>
              Pour toute question concernant ces conditions, veuillez nous contacter à :
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

export default TermsOfUse;