import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/hooks/useLanguage";

const ComparisonQuickBooks = () => {
  const { language } = useLanguage();
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      seo: {
        title: "GestionFlow vs QuickBooks - Comparaison complète",
        description: "Comparez GestionFlow et QuickBooks : fonctionnalités, tarifs, gestion multi-entreprises. Découvrez quelle solution convient le mieux à votre entreprise.",
        keywords: "GestionFlow vs QuickBooks, comparaison logiciel gestion, alternative QuickBooks, logiciel facturation PME, gestion entreprise"
      },
      backLink: "Retour aux comparaisons",
      title: "GestionFlow vs QuickBooks",
      subtitle: "Comparaison détaillée entre une solution moderne et multi-entreprises et un logiciel comptable traditionnel",
      introTitle: "Introduction",
      introText: "Choisir un logiciel de gestion d'entreprise dépend de vos besoins réels. GestionFlow et QuickBooks permettent tous deux de gérer factures et finances, mais leur approche est très différente.",
      solutionsTitle: "Présentation des solutions",
      gestionflowDesc: "GestionFlow est un logiciel de gestion d'entreprise moderne, conçu pour les travailleurs autonomes et les PME. Il permet de gérer plusieurs entreprises dans un seul compte, les clients, la facturation, les dépenses, le suivi des heures",
      gestionflowHighlight: "inclus dans tous les plans",
      gestionflowDescEnd: ", les paiements et des rapports clairs, sans complexité comptable inutile.",
      quickbooksDesc: "QuickBooks est un logiciel de comptabilité reconnu, principalement orienté vers la tenue de livres et la collaboration avec des comptables. Il offre des fonctionnalités comptables avancées adaptées aux entreprises ayant des besoins de comptabilité plus complexes.",
      tableTitle: "Tableau comparatif",
      featureCol: "Fonctionnalité",
      conclusionTitle: "Conclusion",
      conclusionGestionflow: "est idéal pour les entrepreneurs qui veulent une solution simple, moderne et multi-entreprises.",
      conclusionQuickbooks: "convient davantage aux entreprises ayant des besoins comptables avancés.",
      ctaTitle: "Prêt à essayer GestionFlow ?",
      ctaText: "Découvrez par vous-même pourquoi des entrepreneurs choisissent GestionFlow pour gérer leur entreprise simplement.",
      ctaButton: "Essayer GestionFlow gratuitement",
      ctaPricing: "Voir les tarifs",
      footer: "© 2024 GestionFlow. Tous droits réservés.",
      comparisonData: [
        { feature: "Gestion multi-entreprises", gestionflowNote: "Oui (Pro)", quickbooksNote: "Comptes séparés" },
        { feature: "Version gratuite", gestionflowNote: "Oui", quickbooksNote: "Essai seulement" },
        { feature: "Facturation", gestionflowNote: "Oui", quickbooksNote: "Oui" },
        { feature: "Clients illimités", gestionflowNote: "Premium+", quickbooksNote: "Selon plan" },
        { feature: "Téléchargement PDF", gestionflowNote: "Premium+", quickbooksNote: "Oui" },
        { feature: "Rappels de paiement", gestionflowNote: "Oui", quickbooksNote: "Oui" },
        { feature: "Paiements en ligne (Stripe)", gestionflowNote: "Oui", quickbooksNote: "Selon plan" },
        { feature: "Gestion des dépenses", gestionflowNote: "Oui", quickbooksNote: "Oui" },
        { feature: "Suivi des heures", gestionflowNote: "Inclus dans tous les plans", quickbooksNote: "Limité" },
        { feature: "Rapports de revenus", gestionflowNote: "Oui", quickbooksNote: "Comptables" },
        { feature: "Rapports de taxes", gestionflowNote: "Premium+", quickbooksNote: "Oui" },
        { feature: "Mode clair / sombre", gestionflowNote: "Oui", quickbooksNote: "Non" },
        { feature: "Tarification simple", gestionflowNote: "Oui", quickbooksNote: "Complexe" },
      ]
    },
    EN: {
      seo: {
        title: "GestionFlow vs QuickBooks - Complete Comparison",
        description: "Compare GestionFlow and QuickBooks: features, pricing, multi-company management. Find out which solution best suits your business.",
        keywords: "GestionFlow vs QuickBooks, management software comparison, QuickBooks alternative, SMB invoicing software, business management"
      },
      backLink: "Back to comparisons",
      title: "GestionFlow vs QuickBooks",
      subtitle: "Detailed comparison between a modern multi-company solution and traditional accounting software",
      introTitle: "Introduction",
      introText: "Choosing business management software depends on your actual needs. Both GestionFlow and QuickBooks allow you to manage invoices and finances, but their approach is very different.",
      solutionsTitle: "Solutions Overview",
      gestionflowDesc: "GestionFlow is a modern business management software designed for self-employed workers and SMBs. It allows you to manage multiple companies in a single account, clients, invoicing, expenses, time tracking",
      gestionflowHighlight: "included in all plans",
      gestionflowDescEnd: ", payments and clear reports, without unnecessary accounting complexity.",
      quickbooksDesc: "QuickBooks is a recognized accounting software, primarily focused on bookkeeping and collaboration with accountants. It offers advanced accounting features suited to businesses with more complex accounting needs.",
      tableTitle: "Comparison Table",
      featureCol: "Feature",
      conclusionTitle: "Conclusion",
      conclusionGestionflow: "is ideal for entrepreneurs who want a simple, modern, multi-company solution.",
      conclusionQuickbooks: "is more suitable for businesses with advanced accounting needs.",
      ctaTitle: "Ready to try GestionFlow?",
      ctaText: "See for yourself why entrepreneurs choose GestionFlow to manage their business simply.",
      ctaButton: "Try GestionFlow for Free",
      ctaPricing: "View Pricing",
      footer: "© 2024 GestionFlow. All rights reserved.",
      comparisonData: [
        { feature: "Multi-company management", gestionflowNote: "Yes (Pro)", quickbooksNote: "Separate accounts" },
        { feature: "Free version", gestionflowNote: "Yes", quickbooksNote: "Trial only" },
        { feature: "Invoicing", gestionflowNote: "Yes", quickbooksNote: "Yes" },
        { feature: "Unlimited clients", gestionflowNote: "Premium+", quickbooksNote: "Plan dependent" },
        { feature: "PDF download", gestionflowNote: "Premium+", quickbooksNote: "Yes" },
        { feature: "Payment reminders", gestionflowNote: "Yes", quickbooksNote: "Yes" },
        { feature: "Online payments (Stripe)", gestionflowNote: "Yes", quickbooksNote: "Plan dependent" },
        { feature: "Expense management", gestionflowNote: "Yes", quickbooksNote: "Yes" },
        { feature: "Time tracking", gestionflowNote: "Included in all plans", quickbooksNote: "Limited" },
        { feature: "Revenue reports", gestionflowNote: "Yes", quickbooksNote: "Accounting" },
        { feature: "Tax reports", gestionflowNote: "Premium+", quickbooksNote: "Yes" },
        { feature: "Light / dark mode", gestionflowNote: "Yes", quickbooksNote: "No" },
        { feature: "Simple pricing", gestionflowNote: "Yes", quickbooksNote: "Complex" },
      ]
    }
  };

  const t = translations[currentLang];

  useSEO({
    title: t.seo.title,
    description: t.seo.description,
    keywords: t.seo.keywords
  });

  const comparisonDataWithStatus = [
    { gestionflow: "check", quickbooks: "no" },
    { gestionflow: "check", quickbooks: "no" },
    { gestionflow: "check", quickbooks: "check" },
    { gestionflow: "check", quickbooks: "warning" },
    { gestionflow: "check", quickbooks: "check" },
    { gestionflow: "check", quickbooks: "check" },
    { gestionflow: "check", quickbooks: "warning" },
    { gestionflow: "check", quickbooks: "check" },
    { gestionflow: "check", quickbooks: "warning" },
    { gestionflow: "check", quickbooks: "warning" },
    { gestionflow: "check", quickbooks: "check" },
    { gestionflow: "check", quickbooks: "no" },
    { gestionflow: "check", quickbooks: "no" },
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
                <h3 className="text-2xl font-semibold text-foreground mb-4">QuickBooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t.quickbooksDesc}
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
                        QuickBooks
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
                            {renderIcon(comparisonDataWithStatus[index].quickbooks)}
                            <span className="text-sm text-muted-foreground">
                              {row.quickbooksNote}
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
                <strong className="text-foreground">GestionFlow</strong> {t.conclusionGestionflow}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">QuickBooks</strong> {t.conclusionQuickbooks}
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

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>{t.footer}</p>
        </div>
      </footer>
    </div>
  );
};

export default ComparisonQuickBooks;
