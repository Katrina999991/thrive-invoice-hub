import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import Footer from "@/components/Footer";
import { useSEO } from "@/hooks/useSEO";
import { useLanguage } from "@/hooks/useLanguage";

const ComparisonFreshBooks = () => {
  const { language } = useLanguage();
  const currentLang = language.toUpperCase() as "FR" | "EN";

  const translations = {
    FR: {
      seo: {
        title: "GestionFlow vs FreshBooks - Comparaison complète",
        description: "Comparez GestionFlow et FreshBooks : fonctionnalités, gestion multi-entreprises, vision globale. Découvrez quelle solution convient le mieux à votre entreprise.",
        keywords: "GestionFlow vs FreshBooks, comparaison logiciel gestion, alternative FreshBooks, logiciel facturation freelance, gestion entreprise PME"
      },
      backLink: "Retour aux comparaisons",
      title: "GestionFlow vs FreshBooks",
      subtitle: "Comparez une vision globale de la gestion d'entreprise avec un outil centré sur la facturation",
      introTitle: "Introduction",
      introText: "FreshBooks et GestionFlow sont populaires auprès des freelances et PME, mais leur vision de la gestion d'entreprise est différente.",
      solutionsTitle: "Présentation des solutions",
      gestionflowDesc: "GestionFlow offre une gestion complète : clients, factures, dépenses, paiements, suivi des heures",
      gestionflowHighlight: "inclus dans tous les plans",
      gestionflowDescEnd: ", rapports et gestion multi-entreprises.",
      freshbooksDesc: "FreshBooks est principalement orienté vers la facturation et le suivi du temps pour les freelances. Il offre des fonctionnalités ciblées pour les professionnels indépendants.",
      tableTitle: "Tableau comparatif",
      featureCol: "Fonctionnalité",
      conclusionTitle: "Conclusion",
      conclusionFreshbooks: "est un bon choix pour la facturation et le suivi du temps.",
      conclusionGestionflow: "est plus adapté pour une vision globale, évolutive et multi-entreprises.",
      ctaTitle: "Prêt à essayer GestionFlow ?",
      ctaText: "Découvrez par vous-même pourquoi des entrepreneurs choisissent GestionFlow pour gérer leur entreprise simplement.",
      ctaButton: "Essayer GestionFlow gratuitement",
      ctaPricing: "Voir les tarifs",
      footer: "© 2024 GestionFlow. Tous droits réservés.",
      comparisonData: [
        { feature: "Gestion multi-entreprises", gestionflowNote: "Pro", freshbooksNote: "Non" },
        { feature: "Facturation", gestionflowNote: "Oui", freshbooksNote: "Oui" },
        { feature: "Gestion des dépenses", gestionflowNote: "Oui", freshbooksNote: "Basique" },
        { feature: "Suivi des heures", gestionflowNote: "Inclus dans tous les plans", freshbooksNote: "Oui" },
        { feature: "Clients illimités", gestionflowNote: "Premium+", freshbooksNote: "Selon plan" },
        { feature: "Rapports financiers", gestionflowNote: "Avancés", freshbooksNote: "Limités" },
        { feature: "Rapports de taxes", gestionflowNote: "Premium+", freshbooksNote: "Limité" },
        { feature: "Paiements Stripe", gestionflowNote: "Oui", freshbooksNote: "Autres options" },
        { feature: "Personnalisation des emails", gestionflowNote: "Pro", freshbooksNote: "Limitée" },
        { feature: "Tarification simple", gestionflowNote: "Oui", freshbooksNote: "Variable" },
      ]
    },
    EN: {
      seo: {
        title: "GestionFlow vs FreshBooks - Complete Comparison",
        description: "Compare GestionFlow and FreshBooks: features, multi-company management, global vision. Find out which solution best suits your business.",
        keywords: "GestionFlow vs FreshBooks, management software comparison, FreshBooks alternative, freelance invoicing software, SMB business management"
      },
      backLink: "Back to comparisons",
      title: "GestionFlow vs FreshBooks",
      subtitle: "Compare a global business management vision with an invoicing-focused tool",
      introTitle: "Introduction",
      introText: "FreshBooks and GestionFlow are popular with freelancers and SMBs, but their vision of business management is different.",
      solutionsTitle: "Solutions Overview",
      gestionflowDesc: "GestionFlow offers complete management: clients, invoices, expenses, payments, time tracking",
      gestionflowHighlight: "included in all plans",
      gestionflowDescEnd: ", reports and multi-company management.",
      freshbooksDesc: "FreshBooks is primarily focused on invoicing and time tracking for freelancers. It offers targeted features for independent professionals.",
      tableTitle: "Comparison Table",
      featureCol: "Feature",
      conclusionTitle: "Conclusion",
      conclusionFreshbooks: "is a good choice for invoicing and time tracking.",
      conclusionGestionflow: "is more suitable for a global, scalable, multi-company vision.",
      ctaTitle: "Ready to try GestionFlow?",
      ctaText: "See for yourself why entrepreneurs choose GestionFlow to manage their business simply.",
      ctaButton: "Try GestionFlow for Free",
      ctaPricing: "View Pricing",
      footer: "© 2024 GestionFlow. All rights reserved.",
      comparisonData: [
        { feature: "Multi-company management", gestionflowNote: "Pro", freshbooksNote: "No" },
        { feature: "Invoicing", gestionflowNote: "Yes", freshbooksNote: "Yes" },
        { feature: "Expense management", gestionflowNote: "Yes", freshbooksNote: "Basic" },
        { feature: "Time tracking", gestionflowNote: "Included in all plans", freshbooksNote: "Yes" },
        { feature: "Unlimited clients", gestionflowNote: "Premium+", freshbooksNote: "Plan dependent" },
        { feature: "Financial reports", gestionflowNote: "Advanced", freshbooksNote: "Limited" },
        { feature: "Tax reports", gestionflowNote: "Premium+", freshbooksNote: "Limited" },
        { feature: "Stripe payments", gestionflowNote: "Yes", freshbooksNote: "Other options" },
        { feature: "Email customization", gestionflowNote: "Pro", freshbooksNote: "Limited" },
        { feature: "Simple pricing", gestionflowNote: "Yes", freshbooksNote: "Variable" },
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
    { gestionflow: "check", freshbooks: "no" },
    { gestionflow: "check", freshbooks: "check" },
    { gestionflow: "check", freshbooks: "warning" },
    { gestionflow: "check", freshbooks: "check" },
    { gestionflow: "check", freshbooks: "warning" },
    { gestionflow: "check", freshbooks: "warning" },
    { gestionflow: "check", freshbooks: "no" },
    { gestionflow: "check", freshbooks: "warning" },
    { gestionflow: "check", freshbooks: "no" },
    { gestionflow: "check", freshbooks: "no" },
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
                <h3 className="text-2xl font-semibold text-foreground mb-4">FreshBooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {t.freshbooksDesc}
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
                        FreshBooks
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
                            {renderIcon(comparisonDataWithStatus[index].freshbooks)}
                            <span className="text-sm text-muted-foreground">
                              {row.freshbooksNote}
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
                <strong className="text-foreground">FreshBooks</strong> {t.conclusionFreshbooks}
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

export default ComparisonFreshBooks;
