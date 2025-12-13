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
  FileText,
  ArrowDown,
  Database,
  AlertCircle,
  Building2
} from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";

const PublicPricing = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  
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
      nav: {
        home: "Accueil",
        software: "Logiciel de gestion",
        pricing: "Tarifs",
        comparison: "Comparaison",
        login: "Connexion",
        getStarted: "Commencer gratuitement"
      },
      hero: {
        title: "Des tarifs simples et transparents",
        subtitle: "Choisissez le plan qui correspond à vos besoins. Commencez gratuitement, évoluez à votre rythme."
      },
      plans: {
        free: {
          name: "Gratuit",
          price: "0 $",
          period: "/mois",
          description: "Parfait pour découvrir GestionFlow et démarrer votre activité.",
          targetAudience: "Idéal pour les nouveaux entrepreneurs",
          cta: "Commencer gratuitement",
          features: [
            "1 entreprise",
            "10 clients",
            "15 factures par mois",
            "10 dépenses par mois",
            "Envoi de factures par courriel",
            "1 modèle de facture (Classique)",
            "Rapport de revenus",
            "Paiements Stripe (frais de 2%)"
          ]
        },
        premium: {
          name: "Premium",
          price: "19,99 $",
          period: "/mois",
          description: "L'équilibre parfait pour les freelances et consultants en croissance.",
          targetAudience: "Recommandé pour la plupart des utilisateurs",
          badge: "Recommandé",
          cta: "Passer à Premium",
          features: [
            "1 entreprise",
            "50 clients",
            "100 factures par mois",
            "Dépenses illimitées",
            "Téléchargement PDF des factures",
            "2 modèles de factures (Classique + Moderne)",
            "Gestion des catégories",
            "Rapports : revenus + taxes",
            "Paiements Stripe (frais de 1%)"
          ]
        },
        pro: {
          name: "Pro",
          price: "34,99 $",
          period: "/mois",
          description: "Contrôle total pour les agences et consultants multi-entreprises.",
          targetAudience: "Pour les professionnels établis",
          cta: "Passer à Pro",
          features: [
            "Entreprises illimitées",
            "Clients illimités",
            "Factures illimitées",
            "Dépenses illimitées",
            "Tous les modèles de factures",
            "Tous les rapports disponibles",
            "Personnalisation complète des courriels",
            "Paiements Stripe (frais de 0,5%)"
          ]
        }
      },
      reassurance: {
        title: "Aucune surprise, juste de la transparence",
        items: [
          {
            icon: "Shield",
            title: "Aucun frais caché",
            description: "Les prix affichés sont les prix finaux. Pas de surprises."
          },
          {
            icon: "CreditCard",
            title: "Annulez à tout moment",
            description: "Pas d'engagement. Changez ou annulez votre plan quand vous voulez."
          },
          {
            icon: "FileText",
            title: "Exports inclus",
            description: "Tous les plans incluent l'export PDF et Excel de vos rapports."
          }
        ]
      },
      faq: {
        title: "Questions fréquentes",
        items: [
          {
            question: "Puis-je changer de plan à tout moment ?",
            answer: "Oui ! Les mises à niveau prennent effet immédiatement avec facturation au prorata. Les rétrogradations prennent effet à la fin de votre période de facturation."
          },
          {
            question: "Quels modes de paiement acceptez-vous ?",
            answer: "Nous acceptons les cartes de crédit (Visa, Mastercard, American Express) via Stripe, notre partenaire de paiement sécurisé."
          },
          {
            question: "Y a-t-il un essai gratuit ?",
            answer: "Le plan Gratuit vous permet d'essayer GestionFlow sans limite de temps. Passez à Premium quand vous êtes prêt."
          },
          {
            question: "Que se passe-t-il si je dépasse les limites de mon plan ?",
            answer: "Vous recevrez une notification vous invitant à passer au plan supérieur. Vos données restent intactes."
          }
        ]
      },
      downgrade: {
        title: "Politique de rétrogradation de plan",
        description: "Si vous passez à un plan inférieur (par exemple, de Pro à Premium), voici ce qui se passe :",
        keepData: {
          icon: "Database",
          title: "Vos données sont conservées",
          points: [
            "Vous conservez toutes vos données existantes (entreprises, clients, factures, dépenses).",
            "Vous pouvez consulter, modifier et supprimer toutes vos données à tout moment.",
            "Aucune donnée n'est supprimée automatiquement."
          ]
        },
        limits: {
          icon: "AlertCircle",
          title: "Limites du nouveau plan",
          description: "Cependant, si votre compte dépasse les limites de votre nouveau plan :",
          points: [
            "Vous ne pourrez pas créer de nouvelles entités tant que vous n'êtes pas revenu dans les limites du plan."
          ]
        },
        example: {
          title: "Exemple",
          text: "Si vous avez 3 entreprises avec le plan Pro et que vous passez à Premium (qui permet 1 entreprise), vous conservez vos 3 entreprises. Cependant, vous devez en supprimer 2 avant de pouvoir en créer une nouvelle."
        }
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
      nav: {
        home: "Home",
        software: "Management Software",
        pricing: "Pricing",
        comparison: "Comparison",
        login: "Login",
        getStarted: "Start for Free"
      },
      hero: {
        title: "Simple and transparent pricing",
        subtitle: "Choose the plan that fits your needs. Start free, upgrade when you're ready."
      },
      plans: {
        free: {
          name: "Free",
          price: "$0",
          period: "/month",
          description: "Perfect to discover GestionFlow and start your business.",
          targetAudience: "Ideal for new entrepreneurs",
          cta: "Get Started Free",
          features: [
            "1 company",
            "10 clients",
            "15 invoices per month",
            "10 expenses per month",
            "Email invoice sending",
            "1 invoice template (Classic)",
            "Revenue report",
            "Stripe payments (2% fee)"
          ]
        },
        premium: {
          name: "Premium",
          price: "$19.99",
          period: "/month",
          description: "The perfect balance for growing freelancers and consultants.",
          targetAudience: "Recommended for most users",
          badge: "Recommended",
          cta: "Upgrade to Premium",
          features: [
            "1 company",
            "50 clients",
            "100 invoices per month",
            "Unlimited expenses",
            "Invoice PDF download",
            "2 invoice templates (Classic + Modern)",
            "Category management",
            "Reports: revenue + taxes",
            "Stripe payments (1% fee)"
          ]
        },
        pro: {
          name: "Pro",
          price: "$34.99",
          period: "/month",
          description: "Full control for agencies and multi-company consultants.",
          targetAudience: "For established professionals",
          cta: "Upgrade to Pro",
          features: [
            "Unlimited companies",
            "Unlimited clients",
            "Unlimited invoices",
            "Unlimited expenses",
            "All invoice templates",
            "All reports available",
            "Full email customization",
            "Stripe payments (0.5% fee)"
          ]
        }
      },
      reassurance: {
        title: "No surprises, just transparency",
        items: [
          {
            icon: "Shield",
            title: "No hidden fees",
            description: "The prices shown are the final prices. No surprises."
          },
          {
            icon: "CreditCard",
            title: "Cancel anytime",
            description: "No commitment. Change or cancel your plan whenever you want."
          },
          {
            icon: "FileText",
            title: "Exports included",
            description: "All plans include PDF and Excel export of your reports."
          }
        ]
      },
      faq: {
        title: "Frequently asked questions",
        items: [
          {
            question: "Can I change plans at any time?",
            answer: "Yes! Upgrades take effect immediately with prorated billing. Downgrades take effect at the end of your billing period."
          },
          {
            question: "What payment methods do you accept?",
            answer: "We accept credit cards (Visa, Mastercard, American Express) via Stripe, our secure payment partner."
          },
          {
            question: "Is there a free trial?",
            answer: "The Free plan lets you try GestionFlow with no time limit. Upgrade to Premium when you're ready."
          },
          {
            question: "What happens if I exceed my plan limits?",
            answer: "You'll receive a notification to upgrade. Your data remains safe and intact."
          }
        ]
      },
      downgrade: {
        title: "Plan Downgrade Policy",
        description: "If you downgrade to a lower plan (for example, from Pro to Premium), here's what happens:",
        keepData: {
          icon: "Database",
          title: "Your data is preserved",
          points: [
            "You keep all your existing data (companies, clients, invoices, expenses).",
            "You can view, edit, and delete all your existing data at any time.",
            "No data is deleted automatically."
          ]
        },
        limits: {
          icon: "AlertCircle",
          title: "New plan limits",
          description: "However, if your account exceeds the limits of your new plan:",
          points: [
            "You will not be able to create new entities until you are back within the plan limits."
          ]
        },
        example: {
          title: "Example",
          text: "If you have 3 companies on the Pro plan and downgrade to Premium (which allows 1 company), you will keep all 3 companies. However, you must delete 2 companies before you can create a new one."
        }
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

  const getReassuranceIcon = (iconName: string) => {
    switch (iconName) {
      case 'Shield': return <Shield className="h-8 w-8 text-primary" />;
      case 'CreditCard': return <CreditCard className="h-8 w-8 text-primary" />;
      case 'FileText': return <FileText className="h-8 w-8 text-primary" />;
      case 'Database': return <Database className="h-6 w-6 text-primary" />;
      case 'AlertCircle': return <AlertCircle className="h-6 w-6 text-amber-500" />;
      default: return <Shield className="h-8 w-8 text-primary" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            {t.hero.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Free Plan */}
            <Card className="relative border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {getPlanIcon('free')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t.plans.free.name}</h3>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.plans.free.price}</span>
                  <span className="text-muted-foreground">{t.plans.free.period}</span>
                </div>
                <p className="text-muted-foreground text-sm">{t.plans.free.description}</p>
                <p className="text-xs text-primary font-medium mt-2">{t.plans.free.targetAudience}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full mb-6"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.free.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.free.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            <Card className="relative border-2 border-primary shadow-lg scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-medium">
                  {t.plans.premium.badge}
                </span>
              </div>
              <CardHeader className="pb-4 pt-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getPlanIcon('premium')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t.plans.premium.name}</h3>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.plans.premium.price}</span>
                  <span className="text-muted-foreground">{t.plans.premium.period}</span>
                </div>
                <p className="text-muted-foreground text-sm">{t.plans.premium.description}</p>
                <p className="text-xs text-primary font-medium mt-2">{t.plans.premium.targetAudience}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full mb-6 bg-primary hover:bg-primary/90"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.premium.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative border-border hover:border-primary/50 transition-colors">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-muted">
                    {getPlanIcon('pro')}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{t.plans.pro.name}</h3>
                  </div>
                </div>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.plans.pro.price}</span>
                  <span className="text-muted-foreground">{t.plans.pro.period}</span>
                </div>
                <p className="text-muted-foreground text-sm">{t.plans.pro.description}</p>
                <p className="text-xs text-primary font-medium mt-2">{t.plans.pro.targetAudience}</p>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full mb-6"
                  onClick={() => navigate("/auth")}
                >
                  {t.plans.pro.cta}
                </Button>
                <ul className="space-y-3">
                  {t.plans.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reassurance Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {t.reassurance.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {t.reassurance.items.map((item, index) => (
              <div key={index} className="text-center">
                <div className="flex justify-center mb-4">
                  {getReassuranceIcon(item.icon)}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            {t.faq.title}
          </h2>
          <div className="space-y-6">
            {t.faq.items.map((item, index) => (
              <div key={index} className="border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Downgrade Policy Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-6">
            <ArrowDown className="h-8 w-8 text-primary" />
            <h2 className="text-3xl font-bold text-foreground">
              {t.downgrade.title}
            </h2>
          </div>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t.downgrade.description}
          </p>
          
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {/* Keep Data Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getReassuranceIcon(t.downgrade.keepData.icon)}
                  <h3 className="text-lg font-semibold text-foreground">{t.downgrade.keepData.title}</h3>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {t.downgrade.keepData.points.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Limits Card */}
            <Card className="border-amber-500/20 bg-amber-500/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  {getReassuranceIcon(t.downgrade.limits.icon)}
                  <h3 className="text-lg font-semibold text-foreground">{t.downgrade.limits.title}</h3>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{t.downgrade.limits.description}</p>
                <ul className="space-y-3">
                  {t.downgrade.limits.points.map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                      <span className="text-sm text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Example Box */}
          <div className="bg-background border border-border rounded-lg p-6 max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-primary shrink-0 mt-1" />
              <div>
                <h4 className="font-semibold text-foreground mb-2">{t.downgrade.example.title}</h4>
                <p className="text-sm text-muted-foreground">{t.downgrade.example.text}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-primary/5">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            {t.cta.title}
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            {t.cta.subtitle}
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary/90 text-lg px-8"
            onClick={() => navigate("/auth")}
          >
            {t.cta.button}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src={footerLogo} alt="GestionFlow Logo" className="h-16 w-auto" />
            </div>
            <p className="text-sm text-background/70">
              © {new Date().getFullYear()} GestionFlow. {t.footer.rights}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicPricing;
