import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";

const translations = {
  fr: {
    description: "GestionFlow est un logiciel de gestion d'entreprise conçu pour simplifier vos opérations quotidiennes.",
    links: {
      product: "Produit",
      software: "Logiciel",
      pricing: "Tarifs",
      company: "Entreprise",
      about: "À propos",
      contact: "Contact",
      legal: "Légal",
      privacy: "Confidentialité",
      terms: "Conditions"
    },
    copyright: `© ${new Date().getFullYear()} GestionFlow. Tous droits réservés.`
  },
  en: {
    description: "GestionFlow is a business management software designed to simplify your daily operations.",
    links: {
      product: "Product",
      software: "Software",
      pricing: "Pricing",
      company: "Company",
      about: "About",
      contact: "Contact",
      legal: "Legal",
      privacy: "Privacy",
      terms: "Terms"
    },
    copyright: `© ${new Date().getFullYear()} GestionFlow. All rights reserved.`
  }
};

const Footer = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [isDark, setIsDark] = useState<boolean>(() => {
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setIsDark(root.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    window.addEventListener("storage", update);
    return () => {
      observer.disconnect();
      window.removeEventListener("storage", update);
    };
  }, []);

  const currentLogo = isDark ? logoDark : logo;

  return (
    <footer className="bg-muted border-t border-border py-12" role="contentinfo">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-8 mb-8">
          {/* Logo & Description */}
          <div className="md:flex-shrink-0">
            <img 
              src={currentLogo} 
              alt="GestionFlow" 
              className="h-20 mb-4"
              loading="lazy"
            />
            <p className="text-muted-foreground max-w-md">
              {t.description}
            </p>
          </div>
          
          {/* Links Columns */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Product Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t.links.product}</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/software')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.software}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/pricing')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.pricing}
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Company Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t.links.company}</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/about')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.about}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/contact')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.contact}
                  </button>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t.links.legal}</h4>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => navigate('/privacy')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.privacy}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => navigate('/terms')}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.links.terms}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="border-t border-border pt-8 text-center">
          <p className="text-muted-foreground text-sm">{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
