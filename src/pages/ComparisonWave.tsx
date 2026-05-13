import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/hooks/useLanguage";

const ComparisonWave = () => {
  const { language } = useLanguage();
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      seo: {
        title: "GestionFlow vs Wave - Comparaison complète",
        description: "Comparez GestionFlow et Wave : fonctionnalités, évolutivité, gestion multi-entreprises. Découvrez quelle solution convient le mieux à votre entreprise.",
        keywords: "GestionFlow vs Wave, comparaison logiciel gestion, alternative Wave, logiciel facturation gratuit, gestion entreprise évolutive"
      },
      backLink: "Retour aux comparaisons",
      title: "GestionFlow vs Wave",
      subtitle: "Découvrez les différences entre une solution gratuite basique et une plateforme complète et évolutive",
      introTitle: "Introduction",
      introText: "Wave et GestionFlow sont souvent comparés par les travailleurs autonomes. Cependant, leur capacité d'évolution et leurs fonctionnalités sont très différentes. GestionFlow offre une solution plus complète pour les entreprises qui souhaitent grandir, tandis que Wave reste un outil de comptabilité gratuit avec des fonctionnalités limitées.",
      solutionsTitle: "Présentation des solutions",
      gestionflowDesc: "GestionFlow est une solution complète et évolutive qui accompagne les entreprises dès leurs débuts et tout au long de leur croissance. Il inclut le suivi des heures avec conversion directe en factures",
      gestionflowHighlight: "dans tous les plans",
      gestionflowDescEnd: ", la facturation, les dépenses, la gestion des stocks avec scan de codes-barres, les paiements en ligne et des rapports détaillés (revenus, dépenses, taxes). L'application est installable sur ordinateur et mobile (PWA).",
      waveDesc: "Wave est une solution gratuite axée sur la facturation et la comptabilité de base. Bien qu'elle soit gratuite, elle offre des fonctionnalités limitées pour les entreprises en croissance, sans gestion multi-entreprises, suivi du temps ou gestion des stocks.",
      tableTitle: "Tableau comparatif",
      featureCol: "Fonctionnalité",
      conclusionTitle: "Conclusion",
      conclusionWave: "est adapté aux très petites activités avec des besoins simples et un budget limité.",
      conclusionGestionflow: "est plus approprié pour les freelances et PME qui souhaitent évoluer, centraliser leur gestion et avoir accès à des fonctionnalités avancées.",
      ctaTitle: "Prêt à essayer GestionFlow ?",
      ctaText: "Découvrez par vous-même pourquoi des entrepreneurs choisissent GestionFlow pour gérer leur entreprise simplement.",
      ctaButton: "Essayer GestionFlow gratuitement",
      ctaPricing: "Voir les tarifs",
      footer: "© 2024 GestionFlow. Tous droits réservés.",
      comparisonData: [
        { feature: "Version gratuite", gestionflowNote: "Oui", waveNote: "Oui" },
        { feature: "Gestion multi-entreprises", gestionflowNote: "Pro", waveNote: "Non" },
        { feature: "Facturation", gestionflowNote: "Oui", waveNote: "Oui" },
        { feature: "Clients illimités", gestionflowNote: "Premium+", waveNote: "Limité" },
        { feature: "Gestion des dépenses", gestionflowNote: "Oui", waveNote: "Basique" },
        { feature: "Export CSV (dépenses/revenus)", gestionflowNote: "Premium+", waveNote: "Limité" },
        { feature: "Suivi des heures → Factures", gestionflowNote: "Inclus dans tous les plans", waveNote: "Non" },
        { feature: "Rapports de revenus", gestionflowNote: "Oui", waveNote: "Basique" },
        { feature: "Rapports de dépenses", gestionflowNote: "Oui", waveNote: "Basique" },
        { feature: "Rapports de taxes", gestionflowNote: "Premium+", waveNote: "Basique" },
        { feature: "Gestion des stocks", gestionflowNote: "Premium+", waveNote: "Non" },
        { feature: "Scan codes-barres", gestionflowNote: "Oui", waveNote: "Non" },
        { feature: "Paiements Stripe", gestionflowNote: "Oui", waveNote: "Autre système" },
        { feature: "Application installable (PWA)", gestionflowNote: "Oui", waveNote: "Non" },
        { feature: "Mode clair / sombre", gestionflowNote: "Oui", waveNote: "Non" },
        { feature: "Évolutivité", gestionflowNote: "Forte", waveNote: "Faible" },
      ]
    },
    EN: {
      seo: {
        title: "GestionFlow vs Wave - Complete Comparison",
        description: "Compare GestionFlow and Wave: features, scalability, multi-company management. Find out which solution best suits your business.",
        keywords: "GestionFlow vs Wave, management software comparison, Wave alternative, free invoicing software, scalable business management"
      },
      backLink: "Back to comparisons",
      title: "GestionFlow vs Wave",
      subtitle: "Discover the differences between a basic free solution and a complete, scalable platform",
      introTitle: "Introduction",
      introText: "Wave and GestionFlow are often compared by self-employed workers. However, their scalability and features are very different. GestionFlow offers a more complete solution for businesses that want to grow, while Wave remains a free accounting tool with limited features.",
      solutionsTitle: "Solutions Overview",
      gestionflowDesc: "GestionFlow is a complete and scalable solution that supports businesses from the start and throughout their growth. It includes time tracking with direct conversion to invoices",
      gestionflowHighlight: "in all plans",
      gestionflowDescEnd: ", invoicing, expenses, inventory management with barcode scanning, online payments and detailed reports (revenue, expenses, taxes). The app is installable on desktop and mobile (PWA).",
      waveDesc: "Wave is a free solution focused on invoicing and basic accounting. While it's free, it offers limited features for growing businesses, with no multi-company management, time tracking, or inventory management.",
      tableTitle: "Comparison Table",
      featureCol: "Feature",
      conclusionTitle: "Conclusion",
      conclusionWave: "is suitable for very small businesses with simple needs and a limited budget.",
      conclusionGestionflow: "is more appropriate for freelancers and SMBs that want to grow, centralize their management, and access advanced features.",
      ctaTitle: "Ready to try GestionFlow?",
      ctaText: "See for yourself why entrepreneurs choose GestionFlow to manage their business simply.",
      ctaButton: "Try GestionFlow for Free",
      ctaPricing: "View Pricing",
      footer: "© 2024 GestionFlow. All rights reserved.",
      comparisonData: [
        { feature: "Free version", gestionflowNote: "Yes", waveNote: "Yes" },
        { feature: "Multi-company management", gestionflowNote: "Pro", waveNote: "No" },
        { feature: "Invoicing", gestionflowNote: "Yes", waveNote: "Yes" },
        { feature: "Unlimited clients", gestionflowNote: "Premium+", waveNote: "Limited" },
        { feature: "Expense management", gestionflowNote: "Yes", waveNote: "Basic" },
        { feature: "CSV export (expenses/revenue)", gestionflowNote: "Premium+", waveNote: "Limited" },
        { feature: "Time tracking → Invoices", gestionflowNote: "Included in all plans", waveNote: "No" },
        { feature: "Revenue reports", gestionflowNote: "Yes", waveNote: "Basic" },
        { feature: "Expense reports", gestionflowNote: "Yes", waveNote: "Basic" },
        { feature: "Tax reports", gestionflowNote: "Premium+", waveNote: "Basic" },
        { feature: "Inventory management", gestionflowNote: "Premium+", waveNote: "No" },
        { feature: "Barcode scanning", gestionflowNote: "Yes", waveNote: "No" },
        { feature: "Stripe payments", gestionflowNote: "Yes", waveNote: "Other system" },
        { feature: "Installable app (PWA)", gestionflowNote: "Yes", waveNote: "No" },
        { feature: "Light / dark mode", gestionflowNote: "Yes", waveNote: "No" },
        { feature: "Scalability", gestionflowNote: "Strong", waveNote: "Weak" },
      ]
    }
  };

  const t = translations[currentLang];

  useSEO({
    title: t.seo.title,
    description: t.seo.description,
    keywords: t.seo.keywords,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": t.seo.title,
      "description": t.seo.description,
      "inLanguage": currentLang === "EN" ? "en" : "fr",
      "url": "https://gestionflow.net/comparison/wave",
      "author": { "@type": "Organization", "name": "GestionFlow" },
      "publisher": { "@type": "Organization", "name": "GestionFlow" },
    },
  });

  const comparisonDataWithStatus = [
    { gestionflow: "check", wave: "check" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "check" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "warning" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "no" },
    { gestionflow: "check", wave: "no" },
  ];

  const renderIcon = (status: string) => {
    switch (status) {
      case "check":
        return <Check className="h-5 w-5 text-green-500" />;
      case "no":
        return <X className="h-5 w-5 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      
      <main className="container mx-auto px-4 py-16 pt-24">
        {/* Back Link */}
        <div className="mb-8">
          <Link 
            to="/comparison" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.backLink}
          </Link>
        </div>

        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            {t.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            {t.subtitle}
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t.introTitle}</h2>
              <p className="text-muted-foreground leading-relaxed">
                {t.introText}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Présentation des solutions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            {t.solutionsTitle}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">GestionFlow</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t.gestionflowDesc} <strong className="text-foreground">{t.gestionflowHighlight}</strong>{t.gestionflowDescEnd}
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">Wave</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t.waveDesc}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tableau comparatif */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            {t.tableTitle}
          </h2>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-foreground min-w-[200px]">
                        {t.featureCol}
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-center min-w-[180px]">
                        GestionFlow
                      </TableHead>
                      <TableHead className="font-semibold text-foreground text-center min-w-[180px]">
                        Wave
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {t.comparisonData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">
                          {row.feature}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {renderIcon(comparisonDataWithStatus[index].gestionflow)}
                            <span className="text-sm text-muted-foreground">
                              {row.gestionflowNote}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {renderIcon(comparisonDataWithStatus[index].wave)}
                            <span className="text-sm text-muted-foreground">
                              {row.waveNote}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Conclusion */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">{t.conclusionTitle}</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Wave</strong> {t.conclusionWave}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">GestionFlow</strong> {t.conclusionGestionflow}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                {t.ctaTitle}
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                {t.ctaText}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8">
                  <Link to="/auth">{t.ctaButton}</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link to="/pricing">{t.ctaPricing}</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ComparisonWave;
