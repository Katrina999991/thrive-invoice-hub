export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validatePassword = (password: string, language: 'en' | 'fr' = 'fr'): PasswordValidationResult => {
  const errors: string[] = [];
  
  const messages = {
    en: {
      minLength: 'Password must be at least 8 characters long',
      uppercase: 'Password must contain at least one uppercase letter',
      lowercase: 'Password must contain at least one lowercase letter',
      number: 'Password must contain at least one number',
      special: 'Password must contain at least one special character (!@#$%^&*)',
    },
    fr: {
      minLength: 'Le mot de passe doit contenir au moins 8 caractères',
      uppercase: 'Le mot de passe doit contenir au moins une lettre majuscule',
      lowercase: 'Le mot de passe doit contenir au moins une lettre minuscule',
      number: 'Le mot de passe doit contenir au moins un chiffre',
      special: 'Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)',
    }
  };

  const msg = messages[language];

  // At least 8 characters
  if (password.length < 8) {
    errors.push(msg.minLength);
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push(msg.uppercase);
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push(msg.lowercase);
  }

  // At least one number
  if (!/\d/.test(password)) {
    errors.push(msg.number);
  }

  // At least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push(msg.special);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
