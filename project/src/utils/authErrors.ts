// Mapping des codes d'erreur Supabase vers des messages en français
export const getAuthErrorMessage = (error: any): string => {
  const errorCode = error?.message || '';
  
  const errorMessages: Record<string, string> = {
    'Invalid login credentials': 'Email ou mot de passe incorrect',
    'Email not confirmed': 'Veuillez confirmer votre adresse email',
    'Invalid email': 'Adresse email invalide',
    'User already registered': 'Un compte existe déjà avec cette adresse email',
    'Signup requires email': 'L\'adresse email est requise',
    'Password is too short': 'Le mot de passe doit contenir au moins 6 caractères',
    'Email link is invalid or has expired': 'Le lien de confirmation est invalide ou a expiré',
    'Rate limit exceeded': 'Trop de tentatives, veuillez réessayer plus tard',
    'Network error': 'Erreur de connexion, veuillez vérifier votre connexion internet',
    'Server error': 'Une erreur est survenue, veuillez réessayer plus tard',
    'Invalid email or password': 'Email ou mot de passe incorrect',
    'Email already confirmed': 'Email déjà confirmé',
    'New password should be different from the old password': 'Le nouveau mot de passe doit être différent de l\'ancien',
    'Password recovery requires email': 'L\'adresse email est requise pour réinitialiser le mot de passe',
  };

  // Rechercher un message d'erreur correspondant
  for (const [key, message] of Object.entries(errorMessages)) {
    if (errorCode.includes(key)) {
      return message;
    }
  }

  // Message par défaut si aucune correspondance n'est trouvée
  return 'Une erreur est survenue. Veuillez réessayer.';
};

// Fonction pour formater les erreurs de validation
export const getValidationErrorMessage = (field: string): string => {
  const validationMessages: Record<string, string> = {
    email: 'Veuillez entrer une adresse email valide',
    password: 'Le mot de passe doit contenir au moins 6 caractères',
    firstName: 'Le prénom est requis',
    lastName: 'Le nom est requis',
    phoneNumber: 'Le numéro de téléphone est requis',
    confirmPassword: 'Les mots de passe ne correspondent pas',
  };

  return validationMessages[field] || 'Ce champ est requis';
};

// Fonction pour vérifier la force du mot de passe
export const validatePassword = (password: string): {
  isValid: boolean;
  message: string;
} => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins 6 caractères'
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins une majuscule'
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      isValid: false,
      message: 'Le mot de passe doit contenir au moins un chiffre'
    };
  }

  return {
    isValid: true,
    message: 'Mot de passe valide'
  };
};