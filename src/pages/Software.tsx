import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Building2, Users, Package, FileText, Bell, CreditCard, 
  Receipt, Clock, BarChart3, Settings, Check, Star, Rocket,
  ArrowRight, Globe, Menu, X
} from "lucide-react";
import { useState } from "react";
import logoLight from "@/assets/gestionflow-logo.png";
import logoDark from "@/assets/gestionflow-logo-dark.png";

const Software = () => {
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSEO({
    title: language === 'fr' 
      ? "Logiciel de gestion d'entreprise | GestionFlow" 
      : "Business Management Software | GestionFlow",
    description: language === 'fr'
      ? "Logiciel de gestion d'entreprise simple, complet et multi-entreprises. Gérez clients, facturation, dépenses et temps."
      : "Simple, complete and multi-business management software. Manage clients, invoicing, expenses and time."
  });

  const isDark = document.documentElement.classList.contains('dark');

  const features = [
    {
      icon: Building2,
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
      icon: Users,
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
      icon: Package,
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
      icon: FileText,
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
      icon: Bell,
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
      icon: CreditCard,
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
      icon: Receipt,
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
      icon: Clock,
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
      icon: BarChart3,
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
      icon: Settings,
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
  ];

  const plans = [
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
  ];

  const whyChoose = [
    "Pensé pour les besoins réels des entrepreneurs",
    "Gestion multi-entreprises incluse",
    "Interface moderne et intuitive",
    "Rapports inclus pour tous les plans",
    "Évolution continue basée sur les retours utilisateurs"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="flex items-center gap-2">
              <img 
                src={isDark ? logoDark : logoLight} 
                alt="GestionFlow" 
                className="h-8 w-auto"
              />
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => navigate('/')} 
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Accueil
              </button>
              <button 
                onClick={() => navigate('/software')} 
                className="text-primary font-medium"
              >
                Logiciel de gestion
              </button>
              <button 
                onClick={() => navigate('/pricing')} 
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Tarifs
              </button>
              <button 
                onClick={() => navigate('/comparison')} 
                className="text-foreground hover:text-primary transition-colors font-medium"
              >
                Comparaison
              </button>
            </nav>

            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                  className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Connexion
              </Button>
              <Button onClick={() => navigate('/auth')}>
                Essai gratuit
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
            <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
              <button 
                onClick={() => { navigate('/'); setMobileMenuOpen(false); }} 
                className="text-foreground hover:text-primary transition-colors font-medium text-left px-2"
              >
                Accueil
              </button>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="text-primary font-medium text-left px-2"
              >
                Logiciel de gestion
              </button>
              <button 
                onClick={() => { navigate('/pricing'); setMobileMenuOpen(false); }} 
                className="text-foreground hover:text-primary transition-colors font-medium text-left px-2"
              >
                Tarifs
              </button>
              <button 
                onClick={() => { navigate('/comparison'); setMobileMenuOpen(false); }} 
                className="text-foreground hover:text-primary transition-colors font-medium text-left px-2"
              >
                Comparaison
              </button>
              <div className="flex items-center gap-2 px-2 pt-2 border-t border-border">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'fr' | 'en')}
                  className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                >
                  <option value="fr">FR</option>
                  <option value="en">EN</option>
                </select>
              </div>
              <div className="flex flex-col gap-2 px-2">
                <Button variant="ghost" onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                  Connexion
                </Button>
                <Button onClick={() => { navigate('/auth'); setMobileMenuOpen(false); }}>
                  Essai gratuit
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            Logiciel de gestion d'entreprise{" "}
            <span className="text-primary">simple, complet</span> et multi-entreprises
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed">
            GestionFlow est un logiciel de gestion d'entreprise conçu pour les travailleurs autonomes, 
            consultants et PME qui veulent gérer plusieurs entreprises, leurs clients, la facturation, 
            les dépenses, les paiements, les rapports et le suivi du temps, sans complexité inutile.
          </p>
          <p className="text-lg text-foreground mb-8">
            Tout est centralisé dans une interface moderne, rapide et facile à utiliser.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
            👉 Essayez GestionFlow gratuitement dès maintenant
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Sections */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="space-y-24">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-8 md:gap-16 items-center`}
              >
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <feature.icon className="h-8 w-8 text-primary" />
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
                  <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                    <CardContent className="p-12 flex items-center justify-center">
                      <feature.icon className="h-32 w-32 text-primary/30" />
                    </CardContent>
                  </Card>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-24 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-4">
            Des plans adaptés à chaque besoin
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Choisissez le forfait qui correspond à vos besoins actuels et évoluez quand vous êtes prêt.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.highlighted ? 'border-primary shadow-lg scale-105' : 'border-border'}`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
                    Populaire
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
              Voir tous les détails des tarifs
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-12">
            Pourquoi choisir GestionFlow ?
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyChoose.map((reason, index) => (
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
            Essayez GestionFlow gratuitement
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            👉 Créez votre compte gratuitement et simplifiez la gestion de votre entreprise dès aujourd'hui.
          </p>
          <Button size="lg" className="text-lg px-8 py-6" onClick={() => navigate('/auth')}>
            Créer mon compte gratuit
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} GestionFlow. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default Software;
