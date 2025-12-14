import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import { useSEO } from "@/hooks/useSEO";

const ComparisonQuickBooks = () => {
  useSEO({
    title: "GestionFlow vs QuickBooks - Comparaison complète",
    description: "Comparez GestionFlow et QuickBooks : fonctionnalités, tarifs, gestion multi-entreprises. Découvrez quelle solution convient le mieux à votre entreprise.",
    keywords: "GestionFlow vs QuickBooks, comparaison logiciel gestion, alternative QuickBooks, logiciel facturation PME, gestion entreprise"
  });

  const comparisonData = [
    { feature: "Gestion multi-entreprises", gestionflow: "check", gestionflowNote: "Oui (Pro)", quickbooks: "no", quickbooksNote: "Comptes séparés" },
    { feature: "Version gratuite", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "no", quickbooksNote: "Essai seulement" },
    { feature: "Facturation", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "check", quickbooksNote: "Oui" },
    { feature: "Clients illimités", gestionflow: "check", gestionflowNote: "Premium+", quickbooks: "warning", quickbooksNote: "Selon plan" },
    { feature: "Téléchargement PDF", gestionflow: "check", gestionflowNote: "Premium+", quickbooks: "check", quickbooksNote: "Oui" },
    { feature: "Rappels de paiement", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "check", quickbooksNote: "Oui" },
    { feature: "Paiements en ligne (Stripe)", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "warning", quickbooksNote: "Selon plan" },
    { feature: "Gestion des dépenses", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "check", quickbooksNote: "Oui" },
    { feature: "Suivi des heures", gestionflow: "check", gestionflowNote: "Inclus dans tous les plans", quickbooks: "warning", quickbooksNote: "Limité" },
    { feature: "Rapports de revenus", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "warning", quickbooksNote: "Comptables" },
    { feature: "Rapports de taxes", gestionflow: "check", gestionflowNote: "Premium+", quickbooks: "check", quickbooksNote: "Oui" },
    { feature: "Mode clair / sombre", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "no", quickbooksNote: "Non" },
    { feature: "Tarification simple", gestionflow: "check", gestionflowNote: "Oui", quickbooks: "no", quickbooksNote: "Complexe" },
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
            Retour aux comparaisons
          </Link>
        </div>

        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            GestionFlow vs QuickBooks
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comparaison détaillée entre une solution moderne et multi-entreprises et un logiciel comptable traditionnel
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Choisir un logiciel de gestion d'entreprise dépend de vos besoins réels.
                GestionFlow et QuickBooks permettent tous deux de gérer factures et finances, 
                mais leur approche est très différente.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Présentation des solutions */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Présentation des solutions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">GestionFlow</h3>
                <p className="text-muted-foreground leading-relaxed">
                  GestionFlow est un logiciel de gestion d'entreprise moderne, conçu pour les 
                  travailleurs autonomes et les PME. Il permet de gérer plusieurs entreprises 
                  dans un seul compte, les clients, la facturation, les dépenses, le suivi des 
                  heures <strong className="text-foreground">inclus dans tous les plans</strong>, 
                  les paiements et des rapports clairs, sans complexité comptable inutile.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">QuickBooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  QuickBooks est un logiciel de comptabilité reconnu, principalement orienté 
                  vers la tenue de livres et la collaboration avec des comptables. Il offre 
                  des fonctionnalités comptables avancées adaptées aux entreprises ayant des 
                  besoins de comptabilité plus complexes.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Tableau comparatif */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-8 text-center">
            Tableau comparatif
          </h2>
          <Card className="border-border/50 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold text-foreground min-w-[200px]">
                        Fonctionnalité
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
                    {comparisonData.map((row, index) => (
                      <TableRow key={index} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-foreground">
                          {row.feature}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {renderIcon(row.gestionflow)}
                            <span className="text-sm text-muted-foreground">
                              {row.gestionflowNote}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {renderIcon(row.quickbooks)}
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
              <h2 className="text-2xl font-semibold text-foreground mb-4">Conclusion</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">GestionFlow</strong> est idéal pour les 
                entrepreneurs qui veulent une solution simple, moderne et multi-entreprises.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">QuickBooks</strong> convient davantage aux 
                entreprises ayant des besoins comptables avancés.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Call to Action */}
        <section className="text-center">
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-12">
              <h2 className="text-2xl font-semibold text-foreground mb-4">
                Prêt à essayer GestionFlow ?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Découvrez par vous-même pourquoi des entrepreneurs choisissent GestionFlow 
                pour gérer leur entreprise simplement.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-lg px-8">
                  <Link to="/auth">Essayer GestionFlow gratuitement</Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8">
                  <Link to="/pricing">Voir les tarifs</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 mt-16">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 GestionFlow. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
};

export default ComparisonQuickBooks;
