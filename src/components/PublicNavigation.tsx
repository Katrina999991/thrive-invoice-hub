import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { Globe, Menu, X } from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import { useLanguage } from "@/hooks/useLanguage";

interface PublicNavigationProps {
  onScrollToSection?: (sectionId: string) => void;
}

const PublicNavigation = ({ onScrollToSection }: PublicNavigationProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      home: "Accueil",
      software: "Logiciel de gestion",
      pricing: "Tarifs",
      comparison: "Comparaison",
      login: "Connexion",
      getStarted: "Commencer gratuitement"
    },
    EN: {
      home: "Home",
      software: "Management Software",
      pricing: "Pricing",
      comparison: "Comparison",
      login: "Login",
      getStarted: "Get Started Free"
    }
  };

  const t = translations[currentLang];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  };

  const handleHomeClick = () => {
    if (location.pathname === '/' && onScrollToSection) {
      onScrollToSection('hero');
    } else {
      navigate('/');
    }
    setMobileMenuOpen(false);
  };

  const handleLogoClick = () => {
    if (location.pathname === '/' && onScrollToSection) {
      onScrollToSection('hero');
    } else {
      navigate('/');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <img 
              src={currentLogo} 
              alt="GestionFlow" 
              className="h-10 md:h-12 cursor-pointer"
              onClick={handleLogoClick}
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <button 
              onClick={handleHomeClick} 
              className={`transition-colors font-medium ${isActive('/') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              {t.home}
            </button>
            <button 
              onClick={() => navigate('/software')} 
              className={`transition-colors font-medium ${isActive('/software') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              {t.software}
            </button>
            <button 
              onClick={() => navigate('/pricing')} 
              className={`transition-colors font-medium ${isActive('/pricing') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              {t.pricing}
            </button>
            <button 
              onClick={() => navigate('/comparison')} 
              className={`transition-colors font-medium ${isActive('/comparison') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
            >
              {t.comparison}
            </button>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Selector */}
            <div className="flex items-center gap-1 border border-border rounded-lg p-1">
              <Globe className="h-4 w-4 text-muted-foreground ml-1" />
              <Button
                variant={currentLang === "FR" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLanguage("fr")}
                className="h-7 px-2 text-xs"
              >
                FR
              </Button>
              <Button
                variant={currentLang === "EN" ? "default" : "ghost"}
                size="sm"
                onClick={() => setLanguage("en")}
                className="h-7 px-2 text-xs"
              >
                EN
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
            >
              {t.login}
            </Button>
            <Button
              onClick={() => navigate("/auth")}
            >
              {t.getStarted}
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border py-4">
            <nav className="flex flex-col gap-4">
              <button 
                onClick={handleHomeClick} 
                className={`transition-colors font-medium text-left px-2 ${isActive('/') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
              >
                {t.home}
              </button>
              <button 
                onClick={() => { navigate('/software'); setMobileMenuOpen(false); }} 
                className={`transition-colors font-medium text-left px-2 ${isActive('/software') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
              >
                {t.software}
              </button>
              <button 
                onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} 
                className={`transition-colors font-medium text-left px-2 ${isActive('/pricing') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
              >
                {t.pricing}
              </button>
              <button 
                onClick={() => { navigate('/comparison'); setMobileMenuOpen(false); }} 
                className={`transition-colors font-medium text-left px-2 ${isActive('/comparison') ? 'text-primary' : 'text-foreground hover:text-primary'}`}
              >
                {t.comparison}
              </button>
              <div className="flex items-center gap-2 px-2 pt-2 border-t border-border">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant={currentLang === "FR" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage("fr")}
                  className="h-8 px-3"
                >
                  FR
                </Button>
                <Button
                  variant={currentLang === "EN" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLanguage("en")}
                  className="h-8 px-3"
                >
                  EN
                </Button>
              </div>
              <div className="flex flex-col gap-2 px-2 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                  className="w-full"
                >
                  {t.login}
                </Button>
                <Button
                  onClick={() => { navigate("/auth"); setMobileMenuOpen(false); }}
                  className="w-full"
                >
                  {t.getStarted}
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default PublicNavigation;
