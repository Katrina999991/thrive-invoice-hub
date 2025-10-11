import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "fr";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const translations = {
  en: {
    // Settings
    "settings.title": "Settings",
    "settings.description": "Manage your account settings",
    "settings.account.title": "Account Information",
    "settings.account.description": "Your personal information",
    "settings.account.email": "Email",
    "settings.appearance.title": "Appearance",
    "settings.appearance.description": "Customize the application appearance according to your preferences",
    "settings.appearance.displayMode": "Display Mode",
    "settings.appearance.light": "Light",
    "settings.appearance.dark": "Dark",
    "settings.appearance.colorTheme": "Color Theme",
    "settings.appearance.classic": "Classic (Blue)",
    "settings.appearance.modern": "Modern (Purple)",
    "settings.appearance.warm": "Warm (Orange)",
    "settings.appearance.nature": "Nature (Green)",
    "settings.language.title": "Language",
    "settings.language.description": "Choose your preferred language",
    "settings.language.english": "English",
    "settings.language.french": "Français",
    
    // Password Change
    "password.title": "Change Password",
    "password.description": "Update your password to secure your account",
    "password.new": "New Password",
    "password.confirm": "Confirm New Password",
    "password.button": "Change Password",
    "password.updating": "Updating...",
    "password.error.length": "New password must be at least 6 characters",
    "password.error.match": "Passwords do not match",
    "password.success.title": "Success",
    "password.success.description": "Your password has been successfully updated.",
    "password.error.title": "Error",
  },
  fr: {
    // Settings
    "settings.title": "Paramètres",
    "settings.description": "Gérez les paramètres de votre compte",
    "settings.account.title": "Informations du compte",
    "settings.account.description": "Vos informations personnelles",
    "settings.account.email": "Email",
    "settings.appearance.title": "Apparence",
    "settings.appearance.description": "Personnalisez l'apparence de l'application selon vos préférences",
    "settings.appearance.displayMode": "Mode d'affichage",
    "settings.appearance.light": "Clair",
    "settings.appearance.dark": "Sombre",
    "settings.appearance.colorTheme": "Thème de couleur",
    "settings.appearance.classic": "Classique (Bleu)",
    "settings.appearance.modern": "Moderne (Violet)",
    "settings.appearance.warm": "Chaleureux (Orange)",
    "settings.appearance.nature": "Nature (Vert)",
    "settings.language.title": "Langue",
    "settings.language.description": "Choisissez votre langue préférée",
    "settings.language.english": "English",
    "settings.language.french": "Français",
    
    // Password Change
    "password.title": "Changer le mot de passe",
    "password.description": "Modifiez votre mot de passe pour sécuriser votre compte",
    "password.new": "Nouveau mot de passe",
    "password.confirm": "Confirmer le nouveau mot de passe",
    "password.button": "Changer le mot de passe",
    "password.updating": "Modification en cours...",
    "password.error.length": "Le nouveau mot de passe doit contenir au moins 6 caractères",
    "password.error.match": "Les mots de passe ne correspondent pas",
    "password.success.title": "Succès",
    "password.success.description": "Votre mot de passe a été modifié avec succès.",
    "password.error.title": "Erreur",
  }
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLanguage = localStorage.getItem("app-language") as Language;
    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "fr")) {
      setLanguageState(savedLanguage);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app-language", lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
