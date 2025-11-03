import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Star, TrendingUp, FileText, Users, BarChart, Globe } from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import dashboardPreview from "@/assets/dashboard-preview-new.jpg";
import categoriesPreview from "@/assets/dashboard-preview-categories.jpg";
import invoicesPreview from "@/assets/dashboard-preview-invoices.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  
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
      hero: {
        title: "Simplifiez votre gestion d'entreprise",
        subtitle: "Factures, dépenses, clients - tout en un seul endroit. Gérez votre entreprise avec simplicité et efficacité.",
        signUp: "Inscription gratuite",
        signIn: "Se connecter"
      },
      dashboardPreview: {
        title: "Tableau de bord intuitif",
        subtitle: "Visualisez toutes vos données importantes en un coup d'œil. Statistiques en temps réel, activités récentes et actions rapides."
      },
      categoriesPreview: {
        title: "Gestion des catégories",
        subtitle: "Organisez vos produits, services et dépenses par catégories personnalisées pour une meilleure organisation."
      },
      invoicesPreview: {
        title: "Gestion des factures",
        subtitle: "Créez, suivez et gérez toutes vos factures en un seul endroit. Suivi du statut de paiement et dates d'échéance."
      },
      features: {
        title: "Fonctionnalités principales",
        items: [
          {
            title: "Gestion des factures",
            description: "Créez et gérez vos factures en quelques clics"
          },
          {
            title: "Suivi des dépenses",
            description: "Contrôlez vos dépenses en temps réel"
          },
          {
            title: "Gestion clients",
            description: "Centralisez toutes vos informations clients"
          },
          {
            title: "Rapports détaillés",
            description: "Analysez vos performances avec des rapports précis"
          }
        ]
      },
      reviews: {
        title: "Ce que disent nos utilisateurs",
        items: [
          {
            name: "Sophie Martin",
            role: "Directrice Financière",
            comment: "GestionFlow a transformé notre gestion comptable. Simple et efficace!"
          },
          {
            name: "Pierre Dubois",
            role: "Entrepreneur",
            comment: "Parfait pour gérer mes factures et suivre mes dépenses en temps réel."
          },
          {
            name: "Marie Lambert",
            role: "Consultante",
            comment: "Interface intuitive et rapports détaillés. Je recommande vivement!"
          }
        ]
      },
      cta: {
        title: "Prêt à commencer?",
        subtitle: "Rejoignez des centaines d'entreprises qui font confiance à GestionFlow",
        button: "Commencer gratuitement"
      },
      footer: {
        description: "La solution complète pour gérer votre entreprise",
        copyright: "© 2024 GestionFlow. Tous droits réservés."
      }
    },
    EN: {
      hero: {
        title: "Simplify your business management",
        subtitle: "Invoices, expenses, clients - everything in one place. Manage your business with simplicity and efficiency.",
        signUp: "Sign up for free",
        signIn: "Sign in"
      },
      dashboardPreview: {
        title: "Intuitive dashboard",
        subtitle: "View all your important data at a glance. Real-time statistics, recent activities and quick actions."
      },
      categoriesPreview: {
        title: "Category management",
        subtitle: "Organize your products, services and expenses by custom categories for better organization."
      },
      invoicesPreview: {
        title: "Invoice management",
        subtitle: "Create, track and manage all your invoices in one place. Payment status tracking and due dates."
      },
      features: {
        title: "Key features",
        items: [
          {
            title: "Invoice management",
            description: "Create and manage your invoices in a few clicks"
          },
          {
            title: "Expense tracking",
            description: "Control your expenses in real time"
          },
          {
            title: "Client management",
            description: "Centralize all your client information"
          },
          {
            title: "Detailed reports",
            description: "Analyze your performance with accurate reports"
          }
        ]
      },
      reviews: {
        title: "What our users say",
        items: [
          {
            name: "Sophie Martin",
            role: "Financial Director",
            comment: "GestionFlow has transformed our accounting management. Simple and effective!"
          },
          {
            name: "Pierre Dubois",
            role: "Entrepreneur",
            comment: "Perfect for managing my invoices and tracking my expenses in real time."
          },
          {
            name: "Marie Lambert",
            role: "Consultant",
            comment: "Intuitive interface and detailed reports. I highly recommend it!"
          }
        ]
      },
      cta: {
        title: "Ready to get started?",
        subtitle: "Join hundreds of businesses that trust GestionFlow",
        button: "Start for free"
      },
      footer: {
        description: "The complete solution to manage your business",
        copyright: "© 2024 GestionFlow. All rights reserved."
      }
    }
  };

  const t = translations[currentLang];

  return (
    <div className="min-h-screen bg-background">
      {/* Language Selector */}
      <div className="fixed top-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-2">
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
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-8">
          <img src={currentLogo} alt="GestionFlow" className="h-24" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-6">
          {t.hero.title}
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t.hero.subtitle}
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="text-lg px-8 py-6"
          >
            {t.hero.signUp}
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6"
          >
            {t.hero.signIn}
          </Button>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t.dashboardPreview.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.dashboardPreview.subtitle}
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="rounded-lg overflow-hidden shadow-2xl border border-border">
              <img 
                src={dashboardPreview} 
                alt="Dashboard Preview" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Preview Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t.categoriesPreview.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.categoriesPreview.subtitle}
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="rounded-lg overflow-hidden shadow-2xl border border-border">
              <img 
                src={categoriesPreview} 
                alt="Categories Preview" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Invoices Preview Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">
              {t.invoicesPreview.title}
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              {t.invoicesPreview.subtitle}
            </p>
          </div>
          <div className="max-w-6xl mx-auto">
            <div className="rounded-lg overflow-hidden shadow-2xl border border-border">
              <img 
                src={invoicesPreview} 
                alt="Invoices Preview" 
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          {t.features.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {t.features.items.map((feature, index) => (
            <Card key={index} className="border-border">
              <CardContent className="pt-6">
                {index === 0 && <FileText className="h-12 w-12 text-primary mb-4" />}
                {index === 1 && <TrendingUp className="h-12 w-12 text-primary mb-4" />}
                {index === 2 && <Users className="h-12 w-12 text-primary mb-4" />}
                {index === 3 && <BarChart className="h-12 w-12 text-primary mb-4" />}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {t.reviews.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.reviews.items.map((review, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{review.comment}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{review.name}</p>
                    <p className="text-sm text-muted-foreground">{review.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-6">
          {t.cta.title}
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          {t.cta.subtitle}
        </p>
        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="text-lg px-8 py-6"
        >
          {t.cta.button}
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img src={logoDark} alt="GestionFlow" className="h-16" />
              </div>
              <p className="text-primary-foreground/80 mb-2">
                {t.footer.description}
              </p>
              <p className="text-primary-foreground/80">
                info@gestionflow.net
              </p>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>{t.footer.copyright}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
