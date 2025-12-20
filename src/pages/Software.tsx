import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Users, Package, FileText, Bell, CreditCard, 
  Receipt, Clock, BarChart3, Settings, Check,
  ArrowRight
} from "lucide-react";
import logoLight from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";
import companiesPreviewEn from "@/assets/companies-preview-en.jpg";
import companiesPreviewFr from "@/assets/companies-preview-fr.jpg";
import clientsPreviewEn from "@/assets/clients-preview-en.jpg";
import clientsPreviewFr from "@/assets/clients-preview-fr.jpg";
import productsPreviewEn from "@/assets/products-preview-en.jpg";
import productsPreviewFr from "@/assets/products-preview-fr.jpg";
import invoicesPreviewEn from "@/assets/invoices-preview-en.jpg";
import invoicesPreviewFr from "@/assets/invoices-preview-fr.jpg";
import remindersPreviewEn from "@/assets/reminders-preview-en.jpg";
import remindersPreviewFr from "@/assets/reminders-preview-fr.jpg";
import stripePreviewEn from "@/assets/stripe-preview-en.jpg";
import stripePreviewFr from "@/assets/stripe-preview-fr.jpg";
import expensesPreviewEn from "@/assets/expenses-preview-en.jpg";
import expensesPreviewFr from "@/assets/expenses-preview-fr.jpg";
import timeTrackingPreviewEn from "@/assets/time-tracking-preview-en.jpg";
import timeTrackingPreviewFr from "@/assets/time-tracking-preview-fr.jpg";
import reportsPreviewEn from "@/assets/reports-preview-en.jpg";
import reportsPreviewFr from "@/assets/reports-preview-fr.jpg";
import settingsPreview1En from "@/assets/settings-preview-1-en.jpg";
import settingsPreview1Fr from "@/assets/settings-preview-1-fr.jpg";
import settingsPreview2En from "@/assets/settings-preview-2-en.jpg";
import settingsPreview2Fr from "@/assets/settings-preview-2-fr.jpg";
import settingsPreview3En from "@/assets/settings-preview-3-en.jpg";
import settingsPreview3Fr from "@/assets/settings-preview-3-fr.jpg";
import PublicNavigation from "@/components/PublicNavigation";
import Footer from "@/components/Footer";
import ImageLightbox from "@/components/ImageLightbox";

const translations = {
  fr: {
    nav: {
      home: "Accueil",
      software: "Logiciel de gestion",
      pricing: "Tarifs",
      comparison: "Comparaison",
      login: "Connexion",
      freeTrial: "Essai gratuit"
    },
    hero: {
      title: "Logiciel de gestion d'entreprise",
      titleHighlight: "simple, complet",
      titleEnd: "et multi-entreprises",
      description: "GestionFlow est un logiciel de gestion d'entreprise conçu pour les travailleurs autonomes, consultants et PME qui veulent gérer plusieurs entreprises, leurs clients, la facturation, les dépenses, les paiements, les rapports et le suivi du temps, sans complexité inutile.",
      subtitle: "Tout est centralisé dans une interface moderne, rapide et facile à utiliser.",
      cta: "👉 Essayez GestionFlow gratuitement dès maintenant"
    },
    features: [
      {
        title: "Gérez plusieurs entreprises dans un seul compte",
        intro: "La majorité des logiciels obligent à créer un compte par entreprise. Avec GestionFlow, tout est réuni au même endroit.",
        items: [
          "Création et gestion de plusieurs entreprises",
          "Paramétrage des taxes par entreprise (TPS, TVQ, etc.)",
          "Numérotation de factures personnalisée par compagnie",
          "Données séparées, mais accessibles dans une seule interface",
          "Navigation rapide entre entreprises"
        ],
        footer: "Idéal pour les entrepreneurs, pigistes et gestionnaires multi-activités."
      },
      {
        title: "Clients centralisés et bien organisés",
        intro: "Gardez une vue claire de vos relations d'affaires.",
        items: [
          "Ajout et gestion des clients",
          "Association des clients à différentes entreprises",
          "Coordonnées complètes et langue du client",
          "Tarifs horaires personnalisés",
          "Historique des factures, paiements et rappels"
        ]
      },
      {
        title: "Produits et services flexibles",
        intro: "Gérez facilement ce que vous facturez.",
        items: [
          "Produits avec coût, prix et gestion du stock",
          "Services facturés à l'heure ou au forfait",
          "Catégories personnalisées",
          "Activation ou désactivation rapide",
          "Intégration directe aux factures et au suivi du temps"
        ]
      },
      {
        title: "Facturation professionnelle et efficace",
        intro: "Créez et gérez vos factures en quelques clics.",
        items: [
          "Création rapide de factures",
          "Filtres par client, entreprise et statut",
          "Statuts clairs : brouillon, envoyé, payé, en retard",
          "Archivage des factures",
          "Téléchargement PDF selon le forfait",
          "Historique complet et clair"
        ]
      },
      {
        title: "Rappels de paiement automatiques",
        intro: "Réduisez les retards de paiement sans effort.",
        items: [
          "Rappels automatiques pour factures impayées",
          "Historique détaillé des rappels envoyés",
          "Filtres par date, client et statut",
          "Envoi manuel ou automatique",
          "Chaque facture reçoit un rappel automatique unique"
        ]
      },
      {
        title: "Paiements en ligne via Stripe",
        intro: "Faites-vous payer plus rapidement.",
        items: [
          "Intégration Stripe simple et sécurisée",
          "Paiement directement depuis la facture",
          "Suivi clair des paiements reçus",
          "Frais de plateforme réduits selon le forfait"
        ]
      },
      {
        title: "Gestion des dépenses",
        intro: "Gardez le contrôle sur vos coûts.",
        items: [
          "Ajout et gestion des dépenses",
          "Catégorisation personnalisée",
          "Suivi des dépenses payées et impayées",
          "Vue claire par entreprise",
          "Intégration aux rapports financiers"
        ]
      },
      {
        title: "Suivi du temps (Time Tracking)",
        intro: "Parfait pour les services facturés à l'heure.",
        items: [
          "Enregistrement manuel ou via minuterie",
          "Suivi des heures par client",
          "Taux horaire personnalisable",
          "Statut facturé / non facturé",
          "Conversion directe des heures en factures"
        ]
      },
      {
        title: "Rapports clairs et exploitables",
        intro: "Prenez de meilleures décisions grâce à des rapports compréhensibles.",
        items: [
          "Rapport de revenus (par période personnalisée)",
          "Évolution des revenus avec graphiques",
          "Rapport des produits et services",
          "Rapport des dépenses",
          "Rapport des clients",
          "Rapport des taxes",
          "Rapport des factures et statuts"
        ],
        footer: "📄 Export PDF et Excel inclus dans tous les plans, y compris la version gratuite."
      },
      {
        title: "Personnalisation et paramètres avancés",
        intro: "Adaptez GestionFlow à votre façon de travailler.",
        items: [
          "Mode clair et mode sombre",
          "Thèmes de couleurs",
          "Modèles de factures (classique, moderne, professionnel, créatif)",
          "Personnalisation des courriels (version Pro)",
          "Messages personnalisés : Nouvelle facture, Rappel de paiement, Confirmation de paiement",
          "Paramètres de sécurité et gestion du compte"
        ]
      }
    ],
    plans: {
      title: "Des plans adaptés à chaque besoin",
      subtitle: "Choisissez le forfait qui correspond à vos besoins actuels et évoluez quand vous êtes prêt.",
      popular: "Populaire",
      viewPricing: "Voir tous les détails des tarifs",
      items: [
        {
          icon: "🆓",
          name: "Gratuit",
          items: [
            "1 entreprise",
            "Clients limités",
            "Factures et dépenses mensuelles limitées",
            "1 modèle de facture classique",
            "Rapport de revenus",
            "Exports PDF et Excel des rapports"
          ],
          footer: "Idéal pour débuter"
        },
        {
          icon: "⭐",
          name: "Premium",
          items: [
            "Clients et factures illimités",
            "Export PDF des factures",
            "Gestion des catégories",
            "Rapport des taxes",
            "Modèle de facture moderne",
            "Frais Stripe réduits"
          ],
          highlighted: true
        },
        {
          icon: "🚀",
          name: "Pro",
          items: [
            "Entreprises illimitées",
            "Dépenses illimitées",
            "Tous les rapports",
            "Tous les modèles de factures",
            "Personnalisation complète des courriels",
            "Frais Stripe les plus bas"
          ]
        }
      ]
    },
    whyChoose: {
      title: "Pourquoi choisir GestionFlow ?",
      items: [
        "Pensé pour les besoins réels des entrepreneurs",
        "Gestion multi-entreprises incluse",
        "Interface moderne et intuitive",
        "Rapports inclus pour tous les plans",
        "Évolution continue basée sur les retours utilisateurs"
      ]
    },
    cta: {
      title: "Essayez GestionFlow gratuitement",
      description: "👉 Créez votre compte gratuitement et simplifiez la gestion de votre entreprise dès aujourd'hui.",
      button: "Créer mon compte gratuit"
    },
    footer: "© {year} GestionFlow. Tous droits réservés."
  },
  en: {
    nav: {
      home: "Home",
      software: "Management Software",
      pricing: "Pricing",
      comparison: "Comparison",
      login: "Login",
      freeTrial: "Free Trial"
    },
    hero: {
      title: "Business Management Software",
      titleHighlight: "Made Simple",
      titleEnd: "and Multi-Company",
      description: "GestionFlow is a modern business management software designed for freelancers, consultants, and small to medium-sized businesses that need to manage multiple companies, clients, invoicing, expenses, payments, reports, and time tracking — all in one place.",
      subtitle: "Everything is centralized in a clean, fast, and intuitive interface.",
      cta: "👉 Try GestionFlow for free today"
    },
    features: [
      {
        title: "Manage Multiple Companies in One Account",
        intro: "Most business software requires a separate account for each company. GestionFlow lets you manage everything from a single dashboard.",
        items: [
          "Create and manage multiple companies",
          "Configure taxes per company (GST, PST, VAT, etc.)",
          "Custom invoice numbering for each business",
          "Data kept separate but accessible in one interface",
          "Switch between companies instantly"
        ],
        footer: "Perfect for entrepreneurs, freelancers, and multi-business owners."
      },
      {
        title: "Centralized Client Management",
        intro: "Keep all your client information organized and accessible.",
        items: [
          "Add and manage clients",
          "Assign clients to different companies",
          "Full contact details and client language",
          "Custom hourly rates per client",
          "Invoice, payment, and reminder history"
        ]
      },
      {
        title: "Flexible Product and Service Management",
        intro: "Easily manage what you bill.",
        items: [
          "Products with cost, price, and stock tracking",
          "Services billed hourly or as a fixed rate",
          "Custom categories",
          "Enable or disable products and services",
          "Direct integration with invoices and time tracking"
        ]
      },
      {
        title: "Professional and Efficient Invoicing",
        intro: "Create and manage invoices in just a few clicks.",
        items: [
          "Fast invoice creation",
          "Filter invoices by client, company, and status",
          "Clear statuses: draft, sent, paid, overdue",
          "Invoice archiving",
          "PDF invoice download (based on plan)",
          "Complete invoice history"
        ]
      },
      {
        title: "Automated Payment Reminders",
        intro: "Reduce late payments effortlessly.",
        items: [
          "Automatic reminders for unpaid invoices",
          "Full reminder history",
          "Filters by date, client, and status",
          "Manual or automatic sending",
          "Each invoice can receive a dedicated reminder schedule"
        ]
      },
      {
        title: "Online Payments with Stripe",
        intro: "Get paid faster and more easily.",
        items: [
          "Simple and secure Stripe integration",
          "Clients can pay directly from the invoice",
          "Clear payment tracking",
          "Reduced platform fees depending on your plan"
        ]
      },
      {
        title: "Expense Management",
        intro: "Stay in control of your business expenses.",
        items: [
          "Add and manage expenses",
          "Custom expense categories",
          "Track paid and unpaid expenses",
          "Company-level expense overview",
          "Automatic inclusion in financial reports"
        ]
      },
      {
        title: "Time Tracking",
        intro: "Ideal for hourly-based services and consultants.",
        items: [
          "Manual time entry or built-in timer",
          "Track hours by client",
          "Custom hourly rates",
          "Billed and unbilled status",
          "Convert tracked time directly into invoices"
        ]
      },
      {
        title: "Clear and Actionable Reports",
        intro: "Make better decisions with easy-to-understand reports.",
        items: [
          "Revenue reports by custom period",
          "Revenue growth charts",
          "Product and service reports",
          "Expense reports",
          "Client reports",
          "Tax reports",
          "Invoice and status reports"
        ],
        footer: "📄 PDF and Excel exports are included in all plans, including the free version."
      },
      {
        title: "Customization and Advanced Settings",
        intro: "Adapt GestionFlow to your workflow.",
        items: [
          "Light and dark mode",
          "Color themes",
          "Invoice templates (classic, modern, professional, creative)",
          "Email template customization (Pro plan)",
          "Custom messages for: New invoices, Payment reminders, Payment confirmations",
          "Account and security settings"
        ]
      }
    ],
    plans: {
      title: "Pricing Plans That Fit Your Needs",
      subtitle: "Choose the plan that fits your current needs and upgrade when you're ready.",
      popular: "Popular",
      viewPricing: "View all pricing details",
      items: [
        {
          icon: "🆓",
          name: "Free",
          items: [
            "1 company",
            "Limited clients",
            "Limited monthly invoices and expenses",
            "1 classic invoice template",
            "Revenue report",
            "PDF and Excel report exports"
          ],
          footer: "Perfect for getting started"
        },
        {
          icon: "⭐",
          name: "Premium",
          items: [
            "Unlimited clients and invoices",
            "PDF invoice downloads",
            "Category management",
            "Tax reports",
            "Modern invoice template",
            "Reduced Stripe fees"
          ],
          highlighted: true
        },
        {
          icon: "🚀",
          name: "Pro",
          items: [
            "Unlimited companies",
            "Unlimited expenses",
            "All reports",
            "All invoice templates",
            "Full email customization",
            "Lowest Stripe fees"
          ]
        }
      ]
    },
    whyChoose: {
      title: "Why Choose GestionFlow?",
      items: [
        "Built for real business needs",
        "True multi-company management",
        "Clean and modern interface",
        "Reports included in all plans",
        "Continuously improved based on user feedback"
      ]
    },
    cta: {
      title: "Try GestionFlow for Free",
      description: "👉 Create your free account and simplify your business management today.",
      button: "Create my free account"
    },
    footer: "© {year} GestionFlow. All rights reserved."
  }
};

const featureIcons = [Building2, Users, Package, FileText, Bell, CreditCard, Receipt, Clock, BarChart3, Settings];

const Software = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const t = translations[language];

  // Feature images for lightbox
  const featureImages = [
    { 
      src: language === 'fr' ? companiesPreviewFr : companiesPreviewEn, 
      alt: language === 'fr' ? "Gestion multi-entreprises" : "Multi-company management" 
    },
    { 
      src: language === 'fr' ? clientsPreviewFr : clientsPreviewEn, 
      alt: language === 'fr' ? "Gestion des clients" : "Client management" 
    },
    { 
      src: language === 'fr' ? productsPreviewFr : productsPreviewEn, 
      alt: language === 'fr' ? "Produits et services" : "Products and services" 
    },
    { 
      src: language === 'fr' ? invoicesPreviewFr : invoicesPreviewEn, 
      alt: language === 'fr' ? "Facturation" : "Invoicing" 
    },
    { 
      src: language === 'fr' ? remindersPreviewFr : remindersPreviewEn, 
      alt: language === 'fr' ? "Rappels de paiement" : "Payment reminders" 
    },
    { 
      src: language === 'fr' ? stripePreviewFr : stripePreviewEn, 
      alt: language === 'fr' ? "Paiements Stripe" : "Stripe payments" 
    },
    { 
      src: language === 'fr' ? expensesPreviewFr : expensesPreviewEn, 
      alt: language === 'fr' ? "Gestion des dépenses" : "Expense management" 
    },
    { 
      src: language === 'fr' ? timeTrackingPreviewFr : timeTrackingPreviewEn, 
      alt: language === 'fr' ? "Suivi du temps" : "Time tracking" 
    },
    { 
      src: language === 'fr' ? reportsPreviewFr : reportsPreviewEn, 
      alt: language === 'fr' ? "Rapports" : "Reports" 
    },
    { 
      src: language === 'fr' ? settingsPreview1Fr : settingsPreview1En, 
      alt: language === 'fr' ? "Personnalisation - Apparence" : "Settings - Appearance" 
    },
    { 
      src: language === 'fr' ? settingsPreview2Fr : settingsPreview2En, 
      alt: language === 'fr' ? "Personnalisation - Aperçu" : "Settings - Preview" 
    },
    { 
      src: language === 'fr' ? settingsPreview3Fr : settingsPreview3En, 
      alt: language === 'fr' ? "Personnalisation - Sécurité" : "Settings - Security" 
    }
  ];

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  useSEO({
    title: language === 'fr' 
      ? "Logiciel de gestion d'entreprise | GestionFlow" 
      : "Business Management Software | GestionFlow",
    description: language === 'fr'
      ? "Logiciel de gestion d'entreprise simple, complet et multi-entreprises. Gérez clients, facturation, dépenses et temps."
      : "Simple, complete and multi-business management software. Manage clients, invoicing, expenses and time."
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            {t.hero.title}{" "}
            <span className="text-primary">{t.hero.titleHighlight}</span>{" "}
            {t.hero.titleEnd}
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            {t.hero.description}
          </p>
          <p className="text-lg text-foreground mb-8">
            {t.hero.subtitle}
          </p>
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
            {t.hero.cta}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Sections */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-24">
            {t.features.map((feature, index) => {
              const Icon = featureIcons[index];
              return (
                <div 
                  key={index} 
                  className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center`}
                >
                  <div className="flex-1 space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary/10 rounded-xl">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                        {feature.title}
                      </h2>
                    </div>
                    <p className="text-lg text-muted-foreground">
                      {feature.intro}
                    </p>
                    <ul className="space-y-3">
                      {feature.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-foreground">{item}</span>
                        </li>
                      ))}
                    </ul>
                    {feature.footer && (
                      <p className="text-primary font-medium pt-2">
                        {feature.footer}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 w-full">
                    {index === 0 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? companiesPreviewFr : companiesPreviewEn} 
                            alt={language === 'fr' ? "Gestion multi-entreprises" : "Multi-company management"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(0)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 1 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? clientsPreviewFr : clientsPreviewEn} 
                            alt={language === 'fr' ? "Gestion des clients" : "Client management"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(1)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 2 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? productsPreviewFr : productsPreviewEn} 
                            alt={language === 'fr' ? "Produits et services" : "Products and services"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(2)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 3 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? invoicesPreviewFr : invoicesPreviewEn} 
                            alt={language === 'fr' ? "Facturation" : "Invoicing"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(3)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 4 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? remindersPreviewFr : remindersPreviewEn} 
                            alt={language === 'fr' ? "Rappels de paiement" : "Payment reminders"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(4)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 5 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? stripePreviewFr : stripePreviewEn} 
                            alt={language === 'fr' ? "Paiements Stripe" : "Stripe payments"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(5)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 6 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? expensesPreviewFr : expensesPreviewEn} 
                            alt={language === 'fr' ? "Gestion des dépenses" : "Expense management"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(6)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 7 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? timeTrackingPreviewFr : timeTrackingPreviewEn} 
                            alt={language === 'fr' ? "Suivi du temps" : "Time tracking"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(7)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 8 ? (
                      <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                        <CardContent className="p-0">
                          <img 
                            src={language === 'fr' ? reportsPreviewFr : reportsPreviewEn} 
                            alt={language === 'fr' ? "Rapports" : "Reports"}
                            className="w-full h-auto rounded-lg"
                            onClick={() => openLightbox(8)}
                          />
                        </CardContent>
                      </Card>
                    ) : index === 9 ? (
                      <div className="w-full">
                        {/* Desktop: 2-column layout */}
                        <div className="hidden md:grid md:grid-cols-2 gap-4">
                          {/* Left: Large primary image */}
                          <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                            <CardContent className="p-0">
                              <img 
                                src={language === 'fr' ? settingsPreview1Fr : settingsPreview1En} 
                                alt={language === 'fr' ? "Personnalisation - Apparence" : "Settings - Appearance"}
                                className="w-full h-full object-cover rounded-lg"
                                onClick={() => openLightbox(9)}
                              />
                            </CardContent>
                          </Card>
                          {/* Right: 2x1 grid of smaller images */}
                          <div className="grid grid-rows-2 gap-4">
                            <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                              <CardContent className="p-0">
                                <img 
                                  src={language === 'fr' ? settingsPreview2Fr : settingsPreview2En} 
                                  alt={language === 'fr' ? "Personnalisation - Aperçu" : "Settings - Preview"}
                                  className="w-full h-full object-cover rounded-lg"
                                  onClick={() => openLightbox(10)}
                                />
                              </CardContent>
                            </Card>
                            <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                              <CardContent className="p-0">
                                <img 
                                  src={language === 'fr' ? settingsPreview3Fr : settingsPreview3En} 
                                  alt={language === 'fr' ? "Personnalisation - Sécurité" : "Settings - Security"}
                                  className="w-full h-full object-cover rounded-lg"
                                  onClick={() => openLightbox(11)}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                        {/* Mobile: Stacked layout */}
                        <div className="md:hidden space-y-4">
                          <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                            <CardContent className="p-0">
                              <img 
                                src={language === 'fr' ? settingsPreview1Fr : settingsPreview1En} 
                                alt={language === 'fr' ? "Personnalisation - Apparence" : "Settings - Appearance"}
                                className="w-full h-auto rounded-lg"
                                onClick={() => openLightbox(9)}
                              />
                            </CardContent>
                          </Card>
                          <div className="grid grid-cols-2 gap-4">
                            <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                              <CardContent className="p-0">
                                <img 
                                  src={language === 'fr' ? settingsPreview2Fr : settingsPreview2En} 
                                  alt={language === 'fr' ? "Personnalisation - Aperçu" : "Settings - Preview"}
                                  className="w-full h-auto rounded-lg"
                                  onClick={() => openLightbox(10)}
                                />
                              </CardContent>
                            </Card>
                            <Card className="overflow-hidden border-primary/20 shadow-lg group cursor-zoom-in transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                              <CardContent className="p-0">
                                <img 
                                  src={language === 'fr' ? settingsPreview3Fr : settingsPreview3En} 
                                  alt={language === 'fr' ? "Personnalisation - Sécurité" : "Settings - Security"}
                                  className="w-full h-auto rounded-lg"
                                  onClick={() => openLightbox(11)}
                                />
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                        <CardContent className="p-12 flex items-center justify-center">
                          <Icon className="h-32 w-32 text-primary/30" />
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            {t.plans.title}
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            {t.plans.subtitle}
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {t.plans.items.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    {t.plans.popular}
                  </div>
                )}
                <CardContent className="p-8">
                  <div className="text-4xl mb-4">{plan.icon}</div>
                  <h3 className="text-2xl font-bold text-foreground mb-6">{plan.name}</h3>
                  <ul className="space-y-3 mb-6">
                    {plan.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.footer && (
                    <p className="text-sm text-muted-foreground italic">{plan.footer}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Button size="lg" onClick={() => navigate('/pricing')}>
              {t.plans.viewPricing}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">
            {t.whyChoose.title}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {t.whyChoose.items.map((reason, index) => (
              <Card key={index} className="border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-6 flex items-center gap-4">
                  <Check className="h-6 w-6 text-primary flex-shrink-0" />
                  <span className="text-foreground text-left">{reason}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-primary/5">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            {t.cta.title}
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {t.cta.description}
          </p>
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
            {t.cta.button}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      <Footer />

      <ImageLightbox
        images={featureImages}
        currentIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        onNavigate={setLightboxIndex}
      />
    </div>
  );
};

export default Software;
