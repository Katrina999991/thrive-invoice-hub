import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import { useSEO } from "@/hooks/useSEO";

const ComparisonWave = () => {
  useSEO({
    title: "GestionFlow vs Wave - Comparaison complète",
    description: "Comparez GestionFlow et Wave : fonctionnalités, évolutivité, gestion multi-entreprises. Découvrez quelle solution convient le mieux à votre entreprise.",
    keywords: "GestionFlow vs Wave, comparaison logiciel gestion, alternative Wave, logiciel facturation gratuit, gestion entreprise évolutive"
  });

  const comparisonData = [
    { feature: "Version gratuite", gestionflow: "check", gestionflowNote: "Oui", wave: "check", waveNote: "Oui" },
    { feature: "Gestion multi-entreprises", gestionflow: "check", gestionflowNote: "Pro", wave: "no", waveNote: "Non" },
    { feature: "Facturation", gestionflow: "check", gestionflowNote: "Oui", wave: "check", waveNote: "Oui" },
    { feature: "Clients illimités", gestionflow: "check", gestionflowNote: "Premium+", wave: "warning", waveNote: "Limité" },
    { feature: "Gestion des dépenses", gestionflow: "check", gestionflowNote: "Oui", wave: "warning", waveNote: "Basique" },
    { feature: "Suivi des heures", gestionflow: "check", gestionflowNote: "Inclus dans tous les plans", wave: "no", waveNote: "Non" },
    { feature: "Rapports avancés", gestionflow: "check", gestionflowNote: "Pro", wave: "no", waveNote: "Limité" },
    { feature: "Rapports de taxes", gestionflow: "check", gestionflowNote: "Premium+", wave: "warning", waveNote: "Basique" },
    { feature: "Paiements Stripe", gestionflow: "check", gestionflowNote: "Oui", wave: "no", waveNote: "Autre système" },
    { feature: "Évolutivité", gestionflow: "check", gestionflowNote: "Forte", wave: "no", waveNote: "Faible" },
    { feature: "Mode clair / sombre", gestionflow: "check", gestionflowNote: "Oui", wave: "no", waveNote: "Non" },
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
      
      <main className="container mx-auto px-4 py-16">
        {/* Back Link */}
        <Link 
          to="/comparison" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux comparaisons
        </Link>

        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            GestionFlow vs Wave
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Découvrez les différences entre une solution gratuite et une plateforme évolutive
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Wave et GestionFlow sont souvent comparés par les travailleurs autonomes.
                Cependant, leur capacité d'évolution est très différente.
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
                  GestionFlow est une solution complète et évolutive qui accompagne les entreprises 
                  dès leurs débuts et tout au long de leur croissance. Il inclut le suivi des heures 
                  <strong className="text-foreground"> dans tous les plans</strong>, la facturation, 
                  les dépenses, les paiements et des rapports détaillés.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">Wave</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Wave est une solution gratuite axée sur la facturation et la comptabilité de base, 
                  avec des fonctionnalités limitées pour les entreprises en croissance.
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
                        Wave
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
                            {renderIcon(row.wave)}
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
              <h2 className="text-2xl font-semibold text-foreground mb-4">Conclusion</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">Wave</strong> est adapté aux très petites 
                activités avec des besoins simples.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">GestionFlow</strong> est plus approprié pour 
                les entreprises qui souhaitent évoluer et centraliser leur gestion.
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

export default ComparisonWave;
