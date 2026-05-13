import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Star, 
  TrendingUp, 
  FileText, 
  Users, 
  BarChart, 
  Globe, 
  CreditCard, 
  Clock, 
  Building2,
  Receipt,
  Bell,
  PieChart,
  Palette,
  Shield,
  Check,
  ArrowRight,
  Zap,
  CheckCircle2,
  ZoomIn
} from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import dashboardPreview from "@/assets/dashboard-preview-fr-new.jpg";
import dashboardPreviewEn from "@/assets/dashboard-preview-en-new.jpg";
import categoriesPreview from "@/assets/dashboard-preview-categories.jpg";
import invoicesPreview from "@/assets/invoices-preview-fr.jpg";
import categoriesPreviewEn from "@/assets/dashboard-preview-categories-en.jpg";
import invoicesPreviewEn from "@/assets/invoices-preview-en.jpg";
import timeTrackingPreview from "@/assets/dashboard-preview-time-tracking.jpg";
import reportsPreview from "@/assets/dashboard-preview-reports.jpg";
import { useLanguage } from "@/hooks/useLanguage";
import { useState, useEffect } from "react";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import ImageLightbox from "@/components/ImageLightbox";
import Footer from "@/components/Footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
  const footerLogo = isDark ? logo : logoDark;
  const currentLang = language.toUpperCase() as "FR" | "EN";
  
  const currentDashboardPreview = currentLang === "EN" ? dashboardPreviewEn : dashboardPreview;
  const currentInvoicesPreview = currentLang === "EN" ? invoicesPreviewEn : invoicesPreview;

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  const lightboxImages = [
    { src: currentDashboardPreview, alt: currentLang === "EN" ? "Dashboard preview" : "Aperçu du tableau de bord" },
    { src: currentInvoicesPreview, alt: currentLang === "EN" ? "Invoices preview" : "Aperçu des factures" },
  ];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

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
        badge: "Logiciel de gestion d'entreprise",
        title: "Gérez votre entreprise",
        titleHighlight: "simplement et efficacement",
        subtitle: "GestionFlow est le logiciel de gestion tout-en-un pour les travailleurs autonomes, consultants et PME. Factures, clients, dépenses, paiements et rapports — tout est centralisé pour vous faire gagner du temps.",
        cta: "Commencer gratuitement",
        ctaSecondary: "Voir les tarifs",
        noCard: "Plan gratuit disponible • Aucune carte requise"
      },
      socialProof: {
        companies: "entreprises gérées",
        invoices: "factures créées",
        satisfaction: "de satisfaction"
      },
      benefits: {
        title: "Pourquoi choisir GestionFlow ?",
        subtitle: "Une solution pensée pour les besoins réels des entrepreneurs",
        items: [
          {
            icon: "Building2",
            title: "Gestion multi-entreprises",
            description: "Gérez plusieurs entreprises depuis un seul compte. Parfait pour les consultants et agences avec plusieurs activités."
          },
          {
            icon: "FileText",
            title: "Facturation professionnelle",
            description: "Créez des factures en quelques clics, envoyez-les par courriel et suivez les paiements en temps réel."
          },
          {
            icon: "PieChart",
            title: "Rapports clairs",
            description: "Visualisez vos revenus et taxes en un coup d'œil. Exports PDF et Excel inclus dans tous les plans."
          },
          {
            icon: "CreditCard",
            title: "Paiements en ligne",
            description: "Vos clients paient directement depuis leurs factures via Stripe. Moins de retards, plus de trésorerie."
          }
        ]
      },
      features: {
        title: "Tout ce dont vous avez besoin",
        subtitle: "pour gérer votre entreprise efficacement",
        items: [
          {
            icon: "Building2",
            title: "Gestion multi-entreprises",
            description: "Créez et gérez plusieurs entreprises avec des paramètres distincts pour chacune."
          },
          {
            icon: "Users",
            title: "Clients centralisés",
            description: "Coordonnées complètes, tarifs horaires personnalisés et historique complet par client."
          },
          {
            icon: "FileText",
            title: "Facturation professionnelle",
            description: "Créez des factures en quelques clics. Statuts clairs, archivage et téléchargement PDF."
          },
          {
            icon: "Bell",
            title: "Rappels automatiques",
            description: "Réduisez les retards de paiement avec des rappels automatiques pour factures impayées."
          },
          {
            icon: "CreditCard",
            title: "Paiements Stripe",
            description: "Vos clients peuvent payer directement depuis la facture. Intégration simple et sécurisée."
          },
          {
            icon: "Receipt",
            title: "Gestion des dépenses",
            description: "Suivez vos dépenses par catégorie et par entreprise. Intégration aux rapports financiers."
          },
          {
            icon: "Clock",
            title: "Suivi du temps",
            description: "Enregistrez vos heures par client et convertissez-les directement en factures."
          },
          {
            icon: "BarChart",
            title: "Rapports détaillés",
            description: "Revenus, produits, dépenses, clients, taxes et factures. Export PDF et Excel inclus."
          },
          {
            icon: "Palette",
            title: "Personnalisation complète",
            description: "Modèles de factures, courriels personnalisés et thèmes de couleurs à votre image."
          }
        ]
      },
      showcase: {
        dashboard: {
          title: "Tableau de bord intuitif",
          description: "Visualisez toutes vos données importantes en un coup d'œil. Statistiques en temps réel, activités récentes et actions rapides pour une gestion efficace."
        },
        invoices: {
          title: "Facturation simplifiée",
          description: "Créez, envoyez et suivez vos factures professionnelles. Statuts de paiement, dates d'échéance et rappels automatiques intégrés."
        }
      },
      howItWorks: {
        title: "Commencez en 3 étapes simples",
        steps: [
          {
            number: "1",
            title: "Ajoutez vos entreprises et clients",
            description: "Configurez vos entreprises avec leurs taxes et logo, puis ajoutez vos clients."
          },
          {
            number: "2",
            title: "Créez vos factures et suivez vos dépenses",
            description: "Facturez en quelques clics, envoyez par courriel et enregistrez vos dépenses."
          },
          {
            number: "3",
            title: "Consultez vos rapports et recevez vos paiements",
            description: "Visualisez vos revenus et taxes. Vos clients paient en ligne, vous êtes payé plus vite."
          }
        ]
      },
      pricing: {
        title: "Des forfaits adaptés à chaque besoin",
        subtitle: "Plan gratuit disponible • La plupart des entreprises choisissent Premium",
        free: {
          name: "Gratuit",
          price: "0$ CAD",
          period: "/mois",
          description: "Pour commencer",
          features: [
            "1 entreprise",
            "10 clients",
            "15 factures/mois",
            "10 dépenses/mois",
            "Téléchargement PDF des factures et soumissions",
            "Rapport de revenus"
          ]
        },
        premium: {
          name: "Premium",
          price: "19,99$ CAD",
          period: "/mois",
          description: "Le choix idéal pour petites entreprises",
          popular: "Recommandé",
          features: [
            "1% de frais Stripe (au lieu de 2%)",
            "Téléchargement PDF des factures",
            "Rapports : Revenus + Taxes",
            "Gestion des catégories",
            "Modèle de facture moderne"
          ]
        },
        pro: {
          name: "Pro",
          price: "34,99$ CAD",
          period: "/mois",
          description: "Pour agences et multi-entreprises",
          features: [
            "Entreprises illimitées",
            "Tous les rapports",
            "Tous les modèles de factures",
            "Personnalisation des courriels",
            "0,5% de frais Stripe"
          ]
        },
        cta: "Voir tous les forfaits"
      },
      reviews: {
        title: "Ils nous font confiance",
        subtitle: "Découvrez ce que nos utilisateurs disent de GestionFlow",
        items: [
          {
            name: "Sophie Martin",
            role: "Consultante indépendante",
            comment: "GestionFlow a transformé ma gestion quotidienne. Je gère maintenant mes 3 entreprises depuis un seul compte. Simple et efficace!",
            avatar: "SM"
          },
          {
            name: "Pierre Dubois",
            role: "Entrepreneur",
            comment: "Parfait pour gérer mes factures et suivre mes dépenses. Les rappels automatiques m'ont fait récupérer des paiements en retard.",
            avatar: "PD"
          },
          {
            name: "Marie Lambert",
            role: "Graphiste freelance",
            comment: "Interface intuitive et rapports détaillés. Le suivi du temps et la conversion en factures me font gagner des heures chaque semaine.",
            avatar: "ML"
          }
        ]
      },
      faq: {
        title: "Questions fréquentes",
        items: [
          {
            question: "Puis-je vraiment gérer plusieurs entreprises?",
            answer: "Oui! Avec le plan Pro, vous pouvez créer et gérer plusieurs entreprises avec des paramètres distincts pour chacune (taxes, numérotation, logo). Toutes vos données sont accessibles depuis un seul compte."
          },
          {
            question: "Le plan gratuit est-il vraiment gratuit?",
            answer: "Absolument. Le plan gratuit inclut 1 entreprise, 10 clients, 15 factures et 10 dépenses par mois, ainsi que le rapport de revenus. Aucune carte de crédit n'est requise pour commencer."
          },
          {
            question: "Comment fonctionnent les paiements Stripe?",
            answer: "Vous avez deux options : connecter votre compte Stripe existant ou créer un nouveau compte Stripe Connect directement depuis GestionFlow en quelques clics. Une fois configuré, vos clients peuvent payer directement depuis leurs factures."
          },
          {
            question: "Mes données sont-elles sécurisées?",
            answer: "Oui, vos données sont protégées avec un chiffrement de niveau bancaire. Nous utilisons des serveurs sécurisés et ne partageons jamais vos informations avec des tiers."
          },
          {
            question: "Puis-je annuler mon abonnement à tout moment?",
            answer: "Oui, vous pouvez annuler votre abonnement à tout moment. Il n'y a pas de frais cachés ni d'engagement. Vous conservez l'accès jusqu'à la fin de votre période de facturation."
          }
        ]
      },
      cta: {
        title: "Prêt à simplifier votre gestion?",
        subtitle: "Rejoignez des centaines d'entrepreneurs qui font confiance à GestionFlow.",
        button: "Créer mon compte gratuit",
        noCard: "Plan gratuit disponible • Pas de carte requise"
      },
      footer: {
        description: "La solution complète de gestion d'entreprise pour les travailleurs autonomes, consultants et PME.",
        links: {
          product: "Produit",
          software: "Logiciel",
          pricing: "Tarifs",
          company: "Entreprise",
          about: "À propos",
          contact: "Contact",
          legal: "Légal",
          privacy: "Politique de confidentialité",
          terms: "Conditions d'utilisation"
        },
        copyright: "© 2024 GestionFlow. Tous droits réservés."
      }
    },
    EN: {
      nav: {
        home: "Home",
        software: "Management Software",
        pricing: "Pricing",
        comparison: "Comparison",
        login: "Login",
        getStarted: "Get Started Free"
      },
      hero: {
        badge: "Business Management Software",
        title: "Manage your business",
        titleHighlight: "simply and efficiently",
        subtitle: "GestionFlow is the all-in-one management software for freelancers, consultants, and SMBs. Invoices, clients, expenses, payments, and reports — everything is centralized to save you time.",
        cta: "Get Started Free",
        ctaSecondary: "View Pricing",
        noCard: "Free plan available • No credit card required"
      },
      socialProof: {
        companies: "companies managed",
        invoices: "invoices created",
        satisfaction: "satisfaction rate"
      },
      benefits: {
        title: "Why choose GestionFlow?",
        subtitle: "A solution built for the real needs of entrepreneurs",
        items: [
          {
            icon: "Building2",
            title: "Multi-company management",
            description: "Manage multiple businesses from a single account. Perfect for consultants and agencies with multiple activities."
          },
          {
            icon: "FileText",
            title: "Professional invoicing",
            description: "Create invoices in a few clicks, send them by email, and track payments in real time."
          },
          {
            icon: "PieChart",
            title: "Clear reports",
            description: "View your revenue and taxes at a glance. PDF and Excel exports included in all plans."
          },
          {
            icon: "CreditCard",
            title: "Online payments",
            description: "Your clients pay directly from their invoices via Stripe. Fewer delays, better cash flow."
          }
        ]
      },
      features: {
        title: "Everything you need",
        subtitle: "to manage your business efficiently",
        items: [
          {
            icon: "Building2",
            title: "Multi-company management",
            description: "Create and manage multiple companies with distinct settings for each."
          },
          {
            icon: "Users",
            title: "Centralized clients",
            description: "Complete contact details, custom hourly rates, and full history per client."
          },
          {
            icon: "FileText",
            title: "Professional invoicing",
            description: "Create invoices in a few clicks. Clear statuses, archiving, and PDF download."
          },
          {
            icon: "Bell",
            title: "Automatic reminders",
            description: "Reduce late payments with automatic reminders for unpaid invoices."
          },
          {
            icon: "CreditCard",
            title: "Stripe payments",
            description: "Your clients can pay directly from the invoice. Simple and secure integration."
          },
          {
            icon: "Receipt",
            title: "Expense management",
            description: "Track your expenses by category and company. Integration with financial reports."
          },
          {
            icon: "Clock",
            title: "Time tracking",
            description: "Record your hours by client and convert them directly into invoices."
          },
          {
            icon: "BarChart",
            title: "Detailed reports",
            description: "Revenue, products, expenses, clients, taxes, and invoices. PDF and Excel export included."
          },
          {
            icon: "Palette",
            title: "Full customization",
            description: "Invoice templates, custom emails, and color themes to match your brand."
          }
        ]
      },
      showcase: {
        dashboard: {
          title: "Intuitive dashboard",
          description: "View all your important data at a glance. Real-time statistics, recent activities, and quick actions for efficient management."
        },
        invoices: {
          title: "Simplified invoicing",
          description: "Create, send, and track your professional invoices. Payment statuses, due dates, and automatic reminders built-in."
        }
      },
      howItWorks: {
        title: "Get started in 3 simple steps",
        steps: [
          {
            number: "1",
            title: "Add your companies and clients",
            description: "Set up your companies with their taxes and logo, then add your clients."
          },
          {
            number: "2",
            title: "Create invoices and track expenses",
            description: "Invoice in a few clicks, send by email, and record your expenses."
          },
          {
            number: "3",
            title: "View reports and get paid",
            description: "Visualize your revenue and taxes. Your clients pay online, you get paid faster."
          }
        ]
      },
      pricing: {
        title: "Plans that fit every need",
        subtitle: "Free plan available • Most businesses choose Premium",
        free: {
          name: "Free",
          price: "$0 CAD",
          period: "/month",
          description: "To get started",
          features: [
            "1 company",
            "10 clients",
            "15 invoices/month",
            "10 expenses/month",
            "Invoice & quote PDF download",
            "Revenue report"
          ]
        },
        premium: {
          name: "Premium",
          price: "$19.99 CAD",
          period: "/month",
          popular: "Recommended",
          description: "The smart choice for small businesses",
          features: [
            "1% Stripe fee (instead of 2%)",
            "Invoice PDF download",
            "Reports: Revenue + Tax",
            "Category management",
            "Modern invoice template"
          ]
        },
        pro: {
          name: "Pro",
          price: "$29.99 CAD",
          period: "/month",
          description: "For agencies and multi-company",
          features: [
            "Unlimited companies",
            "All reports",
            "All invoice templates",
            "Custom email templates",
            "0.5% Stripe fee"
          ]
        },
        cta: "View all plans"
      },
      reviews: {
        title: "They trust us",
        subtitle: "Discover what our users say about GestionFlow",
        items: [
          {
            name: "Sophie Martin",
            role: "Independent Consultant",
            comment: "GestionFlow has transformed my daily management. I now manage my 3 businesses from a single account. Simple and effective!",
            avatar: "SM"
          },
          {
            name: "Pierre Dubois",
            role: "Entrepreneur",
            comment: "Perfect for managing my invoices and tracking expenses. The automatic reminders helped me recover late payments.",
            avatar: "PD"
          },
          {
            name: "Marie Lambert",
            role: "Freelance Designer",
            comment: "Intuitive interface and detailed reports. Time tracking and invoice conversion save me hours every week.",
            avatar: "ML"
          }
        ]
      },
      faq: {
        title: "Frequently asked questions",
        items: [
          {
            question: "Can I really manage multiple companies?",
            answer: "Yes! With the Pro plan, you can create and manage multiple companies with distinct settings for each (taxes, numbering, logo). All your data is accessible from a single account."
          },
          {
            question: "Is the free plan really free?",
            answer: "Absolutely. The free plan includes 1 company, 10 clients, 15 invoices and 10 expenses per month, plus the revenue report. No credit card required to get started."
          },
          {
            question: "How do Stripe payments work?",
            answer: "You have two options: connect your existing Stripe account or create a new Stripe Connect account directly from GestionFlow in just a few clicks. Once set up, your clients can pay directly from their invoices."
          },
          {
            question: "Is my data secure?",
            answer: "Yes, your data is protected with bank-level encryption. We use secure servers and never share your information with third parties."
          },
          {
            question: "Can I cancel my subscription anytime?",
            answer: "Yes, you can cancel your subscription at any time. There are no hidden fees or commitments. You keep access until the end of your billing period."
          }
        ]
      },
      cta: {
        title: "Ready to simplify your management?",
        subtitle: "Join hundreds of entrepreneurs who trust GestionFlow.",
        button: "Create my free account",
        noCard: "Free plan available • No credit card required"
      },
      footer: {
        description: "The complete business management solution for freelancers, consultants, and SMBs.",
        links: {
          product: "Product",
          software: "Software",
          pricing: "Pricing",
          company: "Company",
          about: "About",
          contact: "Contact",
          legal: "Legal",
          privacy: "Privacy Policy",
          terms: "Terms of Service"
        },
        copyright: "© 2024 GestionFlow. All rights reserved."
      }
    }
  };

  const t = translations[currentLang];

  // SEO Configuration with structured data
  useSEO({
    title: currentLang === "EN" 
      ? "GestionFlow - Multi-Company Business Management Software | Invoices, Expenses, Time Tracking"
      : "GestionFlow - Logiciel de Gestion Multi-Entreprises | Factures, Dépenses, Suivi du Temps",
    description: currentLang === "EN"
      ? "Business management software for freelancers, consultants and SMBs. Manage multiple companies, clients, invoices, expenses, payments and time tracking in one place. Free plan available."
      : "Logiciel de gestion pour travailleurs autonomes, consultants et PME. Gérez plusieurs entreprises, clients, factures, dépenses, paiements et suivi du temps au même endroit. Plan gratuit disponible.",
    keywords: currentLang === "EN"
      ? "multi-company management, invoice software, expense tracking, time tracking, freelancer software, small business management, Stripe payments, business reports"
      : "gestion multi-entreprises, logiciel de facturation, suivi des dépenses, suivi du temps, logiciel freelance, gestion PME, paiements Stripe, rapports d'entreprise",
    structuredData: {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "GestionFlow",
      "description": t.hero.subtitle,
      "url": "https://gestionflow.net",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "offers": [
        {
          "@type": "Offer",
          "name": "Free",
          "price": "0",
          "priceCurrency": "CAD"
        },
        {
          "@type": "Offer",
          "name": "Premium",
          "price": "14.99",
          "priceCurrency": "CAD"
        },
        {
          "@type": "Offer",
          "name": "Pro",
          "price": "24.99",
          "priceCurrency": "CAD"
        }
      ],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "5",
        "ratingCount": "3",
        "reviewCount": "3"
      },
      "review": t.reviews.items.map(review => ({
        "@type": "Review",
        "author": {
          "@type": "Person",
          "name": review.name
        },
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": "5",
          "bestRating": "5"
        },
        "reviewBody": review.comment
      }))
    }
  });

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getIcon = (iconName: string, className: string): React.ReactNode => {
    const icons: Record<string, React.ReactNode> = {
      Building2: <Building2 className={className} />,
      Zap: <Zap className={className} />,
      PieChart: <PieChart className={className} />,
      Shield: <Shield className={className} />,
      Users: <Users className={className} />,
      FileText: <FileText className={className} />,
      Bell: <Bell className={className} />,
      CreditCard: <CreditCard className={className} />,
      Receipt: <Receipt className={className} />,
      Clock: <Clock className={className} />,
      BarChart: <BarChart className={className} />,
      Palette: <Palette className={className} />,
    };
    return icons[iconName] || null;
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation onScrollToSection={scrollToSection} />

      <main>
      {/* Hero Section */}
      <section id="hero" className="container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            {t.hero.badge}
          </div>
          
          {/* Main Title */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t.hero.title}{" "}
            <span className="text-primary">{t.hero.titleHighlight}</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {t.hero.subtitle}
          </p>
          
          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-4">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="text-lg px-8 py-6 gap-2"
            >
              {t.hero.cta}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => navigate('/pricing')}
              variant="outline"
              size="lg"
              className="text-lg px-8 py-6"
            >
              {t.hero.ctaSecondary}
            </Button>
          </div>
          
          {/* No card required */}
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            {t.hero.noCard}
          </p>
        </div>
        
        {/* Hero Image */}
        <div className="mt-12 md:mt-16 max-w-5xl mx-auto">
          <div className="rounded-xl overflow-hidden shadow-2xl border border-border bg-muted/50 p-2">
            <img 
              src={currentDashboardPreview} 
              alt={currentLang === "EN" 
                ? "GestionFlow dashboard - Multi-company business management software" 
                : "Tableau de bord GestionFlow - Logiciel de gestion multi-entreprises"} 
              className="w-full h-auto rounded-lg"
              loading="eager"
              width="1200"
              height="800"
            />
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section className="py-8 bg-muted/50 border-y border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">500+</p>
              <p className="text-sm text-muted-foreground">{t.socialProof.companies}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">10,000+</p>
              <p className="text-sm text-muted-foreground">{t.socialProof.invoices}</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-primary">98%</p>
              <p className="text-sm text-muted-foreground">{t.socialProof.satisfaction}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.benefits.title}
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t.benefits.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {t.benefits.items.map((benefit, index) => (
              <Card key={index} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    {getIcon(benefit.icon, "h-6 w-6 text-primary")}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {benefit.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {benefit.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcase - Dashboard */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.showcase.dashboard.title}
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {t.showcase.dashboard.description}
              </p>
              <Button onClick={() => navigate("/auth")} className="gap-2">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div 
              className="rounded-xl overflow-hidden shadow-xl border border-border cursor-pointer group relative"
              onClick={() => openLightbox(0)}
            >
              <img 
                src={currentDashboardPreview} 
                alt={t.showcase.dashboard.title}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/70 rounded-full p-3">
                  <ZoomIn className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Showcase - Invoices */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div 
              className="order-2 lg:order-1 rounded-xl overflow-hidden shadow-xl border border-border cursor-pointer group relative"
              onClick={() => openLightbox(1)}
            >
              <img 
                src={currentInvoicesPreview} 
                alt={t.showcase.invoices.title}
                className="w-full h-auto transition-transform duration-300 group-hover:scale-[1.02]"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-black/70 rounded-full p-3">
                  <ZoomIn className="h-6 w-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {t.showcase.invoices.title}
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                {t.showcase.invoices.description}
              </p>
              <Button onClick={() => navigate("/auth")} className="gap-2">
                {t.hero.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* All Features Grid */}
      <section id="features" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.features.title} <span className="text-primary">{t.features.subtitle}</span>
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.features.items.map((feature, index) => (
              <Card key={index} className="border-border hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    {getIcon(feature.icon, "h-5 w-5 text-primary")}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {t.howItWorks.title}
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {t.howItWorks.steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.pricing.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.pricing.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <Card className="border-border">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{t.pricing.free.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.pricing.free.price}</span>
                  <span className="text-muted-foreground">{t.pricing.free.period}</span>
                </div>
                <p className="text-muted-foreground mb-6">{t.pricing.free.description}</p>
                <ul className="space-y-3 mb-6">
                  {t.pricing.free.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate("/auth")}>
                  {t.hero.cta}
                </Button>
              </CardContent>
            </Card>
            
            {/* Premium Plan */}
            <Card className="border-primary border-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-full">
                  {t.pricing.premium.popular}
                </span>
              </div>
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{t.pricing.premium.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.pricing.premium.price}</span>
                  <span className="text-muted-foreground">{t.pricing.premium.period}</span>
                </div>
                <p className="text-muted-foreground mb-6">{t.pricing.premium.description}</p>
                <ul className="space-y-3 mb-6">
                  {t.pricing.premium.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full" onClick={() => navigate("/pricing")}>
                  {t.pricing.cta}
                </Button>
              </CardContent>
            </Card>
            
            {/* Pro Plan */}
            <Card className="border-border">
              <CardContent className="pt-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">{t.pricing.pro.name}</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-foreground">{t.pricing.pro.price}</span>
                  <span className="text-muted-foreground">{t.pricing.pro.period}</span>
                </div>
                <p className="text-muted-foreground mb-6">{t.pricing.pro.description}</p>
                <ul className="space-y-3 mb-6">
                  {t.pricing.pro.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" className="w-full" onClick={() => navigate("/pricing")}>
                  {t.pricing.cta}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t.reviews.title}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t.reviews.subtitle}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.reviews.items.map((review, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-6 italic">"{review.comment}"</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {review.avatar}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{review.name}</p>
                      <p className="text-sm text-muted-foreground">{review.role}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              {t.faq.title}
            </h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              {t.faq.items.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left text-foreground">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center bg-primary rounded-2xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              {t.cta.title}
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8">
              {t.cta.subtitle}
            </p>
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 gap-2"
            >
              {t.cta.button}
              <ArrowRight className="h-5 w-5" />
            </Button>
            <p className="text-sm text-primary-foreground/60 mt-4">
              {t.cta.noCard}
            </p>
          </div>
        </div>
      </section>

<Footer />

      {/* Image Lightbox */}
      <ImageLightbox
        images={lightboxImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
};

export default Index;
