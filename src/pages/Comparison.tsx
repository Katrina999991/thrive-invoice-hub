import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Users, Building2, Briefcase, Rocket, CheckCircle2, FileSpreadsheet, BarChart3, Clock, Smartphone } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import Footer from "@/components/Footer";

const Comparison = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      seo: {
        title: "Comparer GestionFlow | Alternatives aux logiciels de gestion",
        description: "Comparez GestionFlow aux principaux logiciels de gestion d'entreprise comme QuickBooks, Wave et FreshBooks. Trouvez la meilleure solution pour votre PME.",
        keywords: "comparaison logiciel gestion, alternative QuickBooks, alternative Wave, alternative FreshBooks, logiciel PME, gestion entreprise"
      },
      header: {
        title: "Comparer GestionFlow",
        subtitle: "Comparez GestionFlow aux principaux logiciels de gestion d'entreprise"
      },
      intro: {
        text1: "Choisir un logiciel de gestion d'entreprise est une décision importante.",
        text2: "Nous avons créé ces pages de comparaison pour vous aider à comprendre les différences entre GestionFlow et d'autres solutions populaires, de manière claire, honnête et transparente."
      },
      features: {
        title: "Fonctionnalités clés de GestionFlow",
        items: [
          {
            icon: "Building2",
            title: "Gestion multi-entreprises",
            description: "Gérez plusieurs entreprises depuis un seul compte"
          },
          {
            icon: "Clock",
            title: "Suivi du temps",
            description: "Suivez votre temps de travail et convertissez-le directement en factures"
          },
          {
            icon: "FileSpreadsheet",
            title: "Export CSV des rapports",
            description: "Exportez vos rapports de dépenses et de revenus en CSV (Premium & Pro)"
          },
          {
            icon: "BarChart3",
            title: "Rapports clairs et ciblés",
            description: "Rapports de dépenses, revenus et taxes pour vos activités quotidiennes"
          },
          {
            icon: "Smartphone",
            title: "Application installable",
            description: "Installez GestionFlow sur votre ordinateur et mobile (PWA)"
          }
        ]
      },
      comparisons: {
        title: "Comparaisons disponibles",
        items: [
          {
            title: "GestionFlow vs QuickBooks",
            description: "Comparez une solution moderne et multi-entreprises à un logiciel comptable traditionnel.",
            slug: "quickbooks"
          },
          {
            title: "GestionFlow vs Wave",
            description: "Découvrez les différences entre une solution gratuite et une plateforme évolutive.",
            slug: "wave"
          },
          {
            title: "GestionFlow vs FreshBooks",
            description: "Comparez une vision globale de la gestion d'entreprise avec un outil centré sur la facturation.",
            slug: "freshbooks"
          }
        ],
        cta: "Voir la comparaison"
      },
      audience: {
        title: "À qui s'adresse GestionFlow ?",
        description: "GestionFlow est conçu pour celles et ceux qui recherchent une solution simple, moderne et évolutive pour gérer leur entreprise au quotidien.",
        items: [
          { icon: "Users", label: "Travailleurs autonomes" },
          { icon: "Briefcase", label: "Freelances" },
          { icon: "Building2", label: "Petites et moyennes entreprises" },
          { icon: "Rocket", label: "Entrepreneurs gérant plusieurs entreprises" }
        ]
      },
      cta: {
        text: "Vous hésitez encore ? Essayez GestionFlow gratuitement et voyez si la solution correspond à vos besoins.",
        button: "Essayer GestionFlow gratuitement"
      },
      footer: {
        copyright: "© 2024 GestionFlow. Tous droits réservés."
      }
    },
    EN: {
      seo: {
        title: "Compare GestionFlow | Business Management Software Alternatives",
        description: "Compare GestionFlow to leading business management software like QuickBooks, Wave, and FreshBooks. Find the best solution for your SMB.",
        keywords: "management software comparison, QuickBooks alternative, Wave alternative, FreshBooks alternative, SMB software, business management"
      },
      header: {
        title: "Compare GestionFlow",
        subtitle: "Compare GestionFlow to leading business management software"
      },
      intro: {
        text1: "Choosing business management software is an important decision.",
        text2: "We've created these comparison pages to help you understand the differences between GestionFlow and other popular solutions, in a clear, honest, and transparent way."
      },
      features: {
        title: "Key GestionFlow Features",
        items: [
          {
            icon: "Building2",
            title: "Multi-Company Management",
            description: "Manage multiple businesses from a single account"
          },
          {
            icon: "Clock",
            title: "Time Tracking",
            description: "Track your work time and convert it directly into invoices"
          },
          {
            icon: "FileSpreadsheet",
            title: "CSV Report Export",
            description: "Export your expense and revenue reports to CSV (Premium & Pro)"
          },
          {
            icon: "BarChart3",
            title: "Clear and Focused Reports",
            description: "Expense, revenue, and tax reports for day-to-day business insights"
          },
          {
            icon: "Smartphone",
            title: "Installable App",
            description: "Install GestionFlow on your desktop and mobile (PWA)"
          }
        ]
      },
      comparisons: {
        title: "Available Comparisons",
        items: [
          {
            title: "GestionFlow vs QuickBooks",
            description: "Compare a modern, multi-company solution to traditional accounting software.",
            slug: "quickbooks"
          },
          {
            title: "GestionFlow vs Wave",
            description: "Discover the differences between a free solution and a scalable platform.",
            slug: "wave"
          },
          {
            title: "GestionFlow vs FreshBooks",
            description: "Compare a comprehensive business management vision with an invoicing-focused tool.",
            slug: "freshbooks"
          }
        ],
        cta: "View Comparison"
      },
      audience: {
        title: "Who is GestionFlow for?",
        description: "GestionFlow is designed for those looking for a simple, modern, and scalable solution to manage their business daily.",
        items: [
          { icon: "Users", label: "Self-employed workers" },
          { icon: "Briefcase", label: "Freelancers" },
          { icon: "Building2", label: "Small and medium businesses" },
          { icon: "Rocket", label: "Entrepreneurs managing multiple businesses" }
        ]
      },
      cta: {
        text: "Still hesitating? Try GestionFlow for free and see if it fits your needs.",
        button: "Try GestionFlow for Free"
      },
      footer: {
        copyright: "© 2024 GestionFlow. All rights reserved."
      }
    }
  };

  const t = translations[currentLang];

  useSEO({
    title: t.seo.title,
    description: t.seo.description,
    keywords: t.seo.keywords
  });

  const iconMap: Record<string, React.ReactNode> = {
    Users: <Users className="h-6 w-6" />,
    Briefcase: <Briefcase className="h-6 w-6" />,
    Building2: <Building2 className="h-6 w-6" />,
    Rocket: <Rocket className="h-6 w-6" />,
    FileSpreadsheet: <FileSpreadsheet className="h-6 w-6" />,
    BarChart3: <BarChart3 className="h-6 w-6" />,
    Clock: <Clock className="h-6 w-6" />,
    Smartphone: <Smartphone className="h-6 w-6" />
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      
      {/* Header */}
      <section className="pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              {t.header.title}
            </h1>
            <p className="text-xl text-muted-foreground">
              {t.header.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-foreground mb-4">
              {t.intro.text1}
            </p>
            <p className="text-muted-foreground">
              {t.intro.text2}
            </p>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t.features.title}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.features.items.map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-4 p-6 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors"
              >
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {iconMap[item.icon]}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparisons Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t.comparisons.title}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {t.comparisons.items.map((item, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50 cursor-pointer"
                onClick={() => navigate(`/comparison/${item.slug}`)}
              >
                <CardHeader>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    {t.comparisons.cta}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Audience Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
              {t.audience.title}
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              {t.audience.description}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {t.audience.items.map((item, index) => (
                <div 
                  key={index}
                  className="flex flex-col items-center p-6 bg-background rounded-xl border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                    {iconMap[item.icon]}
                  </div>
                  <span className="text-sm font-medium text-center text-foreground">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-lg text-muted-foreground mb-8">
              {t.cta.text}
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")}
              className="text-lg px-8 py-6"
            >
              {t.cta.button}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Comparison;
