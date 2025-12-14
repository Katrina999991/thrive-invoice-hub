import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Check, 
  Crown, 
  Zap, 
  Star,
  Shield,
  CreditCard,
  HelpCircle,
  Users,
  FileText,
  Building2,
  Receipt,
  Mail,
  BarChart3,
  Percent,
  Lock
} from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";

const PublicPricing = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  
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
  
  const footerLogo = isDark ? logo : logoDark;
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      hero: {
        title: "Tarifs GestionFlow",
        subtitle: "Choisissez le plan qui correspond à votre activité"
      },
      billing: {
        monthly: "Mensuel",
        yearly: "Annuel",
        savings: "Économisez ~2 mois"
      },
      plans: {
        free: {
          name: "Gratuit",
          price: "0 $",
          yearlyPrice: "0 $",
          period: "/mois",
          description: "Idéal pour découvrir GestionFlow et démarrer votre activité",
          cta: "Commencer gratuitement",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 factures par mois", icon: "FileText" },
            { text: "10 dépenses par mois", icon: "Receipt" },
            { text: "Envoi de factures par courriel", icon: "Mail" },
            { text: "1 modèle de facture (Classique – bleu)", icon: "FileText" },
            { text: "Rapport de revenus", icon: "BarChart3" },
            { text: "Paiements Stripe (frais de 2 %)", icon: "Percent" }
          ]
        },
        premium: {
          name: "Premium",
          price: "19,99 $",
          yearlyPrice: "199 $",
          period: "/mois",
          yearlyPeriod: "/an",
          description: "Le meilleur équilibre pour freelances et petites entreprises",
          badge: "Le plus populaire",
          yearlySavings: "Économisez environ 2 mois",
          popularText: "Choisi par la majorité de nos utilisateurs",
          cta: "Passer à Premium",
          features: [
            { text: "1 entreprise", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures illimitées", icon: "FileText" },
            { text: "Dépenses illimitées", icon: "Receipt" },
            { text: "Téléchargement PDF des factures", icon: "FileText" },
            { text: "2 modèles de factures (Classique + Moderne)", icon: "FileText" },
            { text: "Gestion des catégories (produits, services, dépenses)", icon: "BarChart3" },
            { text: "Rapports : revenus + taxes", icon: "BarChart3" },
            { text: "Paiements Stripe (frais de 1 %)", icon: "Percent" }
          ]
        },
        pro: {
          name: "Pro",
          price: "34,99 $",
          yearlyPrice: "349 $",
          period: "/mois",
          yearlyPeriod: "/an",
          description: "Contrôle total pour entreprises en croissance et multi-entreprises",
          cta: "Passer à Pro",
          features: [
            { text: "Entreprises illimitées", icon: "Building2" },
            { text: "Clients illimités", icon: "Users" },
            { text: "Factures illimitées", icon: "FileText" },
            { text: "Dépenses illimitées", icon: "Receipt" },
            { text: "Tous les modèles de factures", icon: "FileText" },
            { text: "Tous les rapports (revenus, taxes, clients, produits, dépenses, factures)", icon: "BarChart3" },
            { text: "Personnalisation complète des courriels", icon: "Mail" },
            { text: "Paiements Stripe (frais de 0,5 %)", icon: "Percent" }
          ]
        }
      },
      decision: {
        title: "Quel plan choisir ?",
        items: [
          { condition: "Vous débutez ou testez l'outil ?", plan: "Gratuit", icon: "Zap" },
          { condition: "Vous facturez régulièrement et voulez travailler sans limites ?", plan: "Premium", icon: "Crown" },
          { condition: "Vous gérez plusieurs entreprises ou avez besoin de rapports avancés ?", plan: "Pro", icon: "Star" }
        ]
      },
      trust: {
        secure: "Tous les paiements sont traités de manière sécurisée via Stripe.",
        cancel: "Annulez ou changez de plan à tout moment."
      },
      cta: {
        title: "Prêt à simplifier votre gestion ?",
        subtitle: "Rejoignez des milliers d'entrepreneurs qui gagnent du temps avec GestionFlow.",
        button: "Commencer gratuitement"
      },
      footer: {
        rights: "Tous droits réservés."
      }
    },
    EN: {
      hero: {
        title: "GestionFlow Pricing",
        subtitle: "Choose the plan that fits your business"
      },
      billing: {
        monthly: "Monthly",
        yearly: "Yearly",
        savings: "Save ~2 months"
      },
      plans: {
        free: {
          name: "Free",
          price: "$0",
          yearlyPrice: "$0",
          period: "/month",
          description: "Ideal to discover GestionFlow and start your business",
          cta: "Get Started Free",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "10 clients", icon: "Users" },
            { text: "15 invoices per month", icon: "FileText" },
            { text: "10 expenses per month", icon: "Receipt" },
            { text: "Email invoice sending", icon: "Mail" },
            { text: "1 invoice template (Classic – blue)", icon: "FileText" },
            { text: "Revenue report", icon: "BarChart3" },
            { text: "Stripe payments (2% fee)", icon: "Percent" }
          ]
        },
        premium: {
          name: "Premium",
          price: "$19.99",
          yearlyPrice: "$199",
          period: "/month",
          yearlyPeriod: "/year",
          description: "The best balance for freelancers and small businesses",
          badge: "Most Popular",
          yearlySavings: "Save about 2 months",
          popularText: "Chosen by the majority of our users",
          cta: "Upgrade to Premium",
          features: [
            { text: "1 company", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices", icon: "FileText" },
            { text: "Unlimited expenses", icon: "Receipt" },
            { text: "Invoice PDF download", icon: "FileText" },
            { text: "2 invoice templates (Classic + Modern)", icon: "FileText" },
            { text: "Category management (products, services, expenses)", icon: "BarChart3" },
            { text: "Reports: revenue + taxes", icon: "BarChart3" },
            { text: "Stripe payments (1% fee)", icon: "Percent" }
          ]
        },
        pro: {
          name: "Pro",
          price: "$34.99",
          yearlyPrice: "$349",
          period: "/month",
          yearlyPeriod: "/year",
          description: "Full control for growing and multi-company businesses",
          cta: "Upgrade to Pro",
          features: [
            { text: "Unlimited companies", icon: "Building2" },
            { text: "Unlimited clients", icon: "Users" },
            { text: "Unlimited invoices", icon: "FileText" },
            { text: "Unlimited expenses", icon: "Receipt" },
            { text: "All invoice templates", icon: "FileText" },
            { text: "All reports (revenue, taxes, clients, products, expenses, invoices)", icon: "BarChart3" },
            { text: "Full email customization", icon: "Mail" },
            { text: "Stripe payments (0.5% fee)", icon: "Percent" }
          ]
        }
      },
      decision: {
        title: "Which plan to choose?",
        items: [
          { condition: "Starting out or testing the tool?", plan: "Free", icon: "Zap" },
          { condition: "Billing regularly and want to work without limits?", plan: "Premium", icon: "Crown" },
          { condition: "Managing multiple companies or need advanced reports?", plan: "Pro", icon: "Star" }
        ]
      },
      trust: {
        secure: "All payments are securely processed via Stripe.",
        cancel: "Cancel or change your plan at any time."
      },
      cta: {
        title: "Ready to simplify your business?",
        subtitle: "Join thousands of entrepreneurs saving time with GestionFlow.",
        button: "Get Started Free"
      },
      footer: {
        rights: "All rights reserved."
      }
    }
  };

  const t = translations[currentLang];

  useSEO({
    title: currentLang === "FR" 
      ? "Tarifs - GestionFlow | Logiciel de gestion d'entreprise" 
      : "Pricing - GestionFlow | Business Management Software",
    description: currentLang === "FR"
      ? "Découvrez nos tarifs simples et transparents. Plan gratuit disponible. Commencez dès aujourd'hui."
      : "Discover our simple and transparent pricing. Free plan available. Start today.",
    keywords: currentLang === "FR"
      ? "tarifs, prix, abonnement, facturation, gestion entreprise"
      : "pricing, plans, subscription, invoicing, business management"
  });

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free': return <Zap className="h-6 w-6" />;
      case 'premium': return <Crown className="h-6 w-6" />;
      case 'pro': return <Star className="h-6 w-6" />;
      default: return <Zap className="h-6 w-6" />;
    }
  };

  const getFeatureIcon = (iconName: string) => {
    const iconClass = "h-4 w-4 text-primary shrink-0";
    switch (iconName) {
      case 'Building2': return <Building2 className={iconClass} />;
      case 'Users': return <Users className={iconClass} />;
      case 'FileText': return <FileText className={iconClass} />;
      case 'Receipt': return <Receipt className={iconClass} />;
      case 'Mail': return <Mail className={iconClass} />;
      case 'BarChart3': return <BarChart3 className={iconClass} />;
      case 'Percent': return <Percent className={iconClass} />;
      default: return <Check className={iconClass} />;
    }
  };

  const getDecisionIcon = (iconName: string) => {
    const iconClass = "h-5 w-5";
    switch (iconName) {
      case 'Zap': return <Zap className={iconClass} />;
      case 'Crown': return <Crown className={iconClass} />;
      case 'Star': return <Star className={iconClass} />;
      default: return <Zap className={iconClass} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all ${
                billingCycle === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.billing.monthly}
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                billingCycle === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.billing.yearly}
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                {t.billing.savings}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8 items-start">
            {/* Free Plan */}
            <Card className="relative border-border hover:border-primary/30 transition-all duration-300 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                    {getPlanIcon('free')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.free.name}</h3>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.plans.free.price}</span>
                  <span className="text-muted-foreground ml-1">{t.plans.free.period}</span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.free.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  variant="outline" 
                  className="w-full mb-6 h-12 font-medium"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.free.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.free.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan - Highlighted */}
            <Card className="relative border-2 border-primary shadow-xl md:scale-105 bg-card">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <span className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  {t.plans.premium.badge}
                </span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    {getPlanIcon('premium')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.premium.name}</h3>
                </div>
                <div className="mb-2">
                  {billingCycle === "monthly" ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.premium.price}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.premium.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.premium.yearlyPrice}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.premium.yearlyPeriod}</span>
                    </>
                  )}
                </div>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-primary font-medium mb-2">{t.plans.premium.yearlySavings}</p>
                )}
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.premium.description}</p>
                <p className="text-xs text-primary/80 mt-2 italic">{t.plans.premium.popularText}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  className="w-full mb-6 h-12 font-medium"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.premium.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-border hover:border-primary/30 transition-all duration-300 bg-card">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2.5 rounded-xl bg-muted text-muted-foreground">
                    {getPlanIcon('pro')}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{t.plans.pro.name}</h3>
                </div>
                <div className="mb-4">
                  {billingCycle === "monthly" ? (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.pro.price}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.pro.period}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-foreground">{t.plans.pro.yearlyPrice}</span>
                      <span className="text-muted-foreground ml-1">{t.plans.pro.yearlyPeriod}</span>
                    </>
                  )}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{t.plans.pro.description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <Button 
                  variant="outline" 
                  className="w-full mb-6 h-12 font-medium"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.pro.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3">
                      {getFeatureIcon(feature.icon)}
                      <span className="text-sm text-foreground">{feature.text}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Decision Help Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{t.decision.title}</h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {t.decision.items.map((item, index) => (
              <div 
                key={index} 
                className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
                  {getDecisionIcon(item.icon)}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{item.condition}</p>
                <p className="text-lg font-bold text-primary">→ {item.plan}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lock className="h-5 w-5 text-primary" />
              <span className="text-sm">{t.trust.secure}</span>
            </div>
            <div className="flex items-center gap-3 text-muted-foreground">
              <CreditCard className="h-5 w-5 text-primary" />
              <span className="text-sm">{t.trust.cancel}</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            {t.cta.title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t.cta.subtitle}
          </p>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg font-medium"
            onClick={() => navigate("/auth")}
          >
            {t.cta.button}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src={footerLogo} alt="GestionFlow Logo" className="h-10 w-auto" />
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GestionFlow. {t.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPricing;
