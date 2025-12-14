import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import PublicNavigation from "@/components/PublicNavigation";
import { useSEO } from "@/hooks/useSEO";

const ComparisonFreshBooks = () => {
  useSEO({
    title: "GestionFlow vs FreshBooks - Comparaison complète",
    description: "Comparez GestionFlow et FreshBooks : fonctionnalités, gestion multi-entreprises, vision globale. Découvrez quelle solution convient le mieux à votre entreprise.",
    keywords: "GestionFlow vs FreshBooks, comparaison logiciel gestion, alternative FreshBooks, logiciel facturation freelance, gestion entreprise PME"
  });

  const comparisonData = [
    { feature: "Gestion multi-entreprises", gestionflow: "check", gestionflowNote: "Pro", freshbooks: "no", freshbooksNote: "Non" },
    { feature: "Facturation", gestionflow: "check", gestionflowNote: "Oui", freshbooks: "check", freshbooksNote: "Oui" },
    { feature: "Gestion des dépenses", gestionflow: "check", gestionflowNote: "Oui", freshbooks: "warning", freshbooksNote: "Basique" },
    { feature: "Suivi des heures", gestionflow: "check", gestionflowNote: "Inclus dans tous les plans", freshbooks: "check", freshbooksNote: "Oui" },
    { feature: "Clients illimités", gestionflow: "check", gestionflowNote: "Premium+", freshbooks: "warning", freshbooksNote: "Selon plan" },
    { feature: "Rapports financiers", gestionflow: "check", gestionflowNote: "Avancés", freshbooks: "warning", freshbooksNote: "Limités" },
    { feature: "Rapports de taxes", gestionflow: "check", gestionflowNote: "Premium+", freshbooks: "no", freshbooksNote: "Limité" },
    { feature: "Paiements Stripe", gestionflow: "check", gestionflowNote: "Oui", freshbooks: "warning", freshbooksNote: "Autres options" },
    { feature: "Personnalisation des emails", gestionflow: "check", gestionflowNote: "Pro", freshbooks: "no", freshbooksNote: "Limitée" },
    { feature: "Tarification simple", gestionflow: "check", gestionflowNote: "Oui", freshbooks: "no", freshbooksNote: "Variable" },
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
            GestionFlow vs FreshBooks
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comparez une vision globale de la gestion d'entreprise avec un outil centré sur la facturation
          </p>
        </header>

        {/* Introduction */}
        <section className="mb-16">
          <Card className="border-border/50">
            <CardContent className="p-8">
              <h2 className="text-2xl font-semibold text-foreground mb-4">Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                FreshBooks et GestionFlow sont populaires auprès des freelances et PME, 
                mais leur vision de la gestion d'entreprise est différente.
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
                  GestionFlow offre une gestion complète : clients, factures, dépenses, paiements, 
                  suivi des heures <strong className="text-foreground">inclus dans tous les plans</strong>, 
                  rapports et gestion multi-entreprises.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-8">
                <h3 className="text-2xl font-semibold text-foreground mb-4">FreshBooks</h3>
                <p className="text-muted-foreground leading-relaxed">
                  FreshBooks est principalement orienté vers la facturation et le suivi du temps 
                  pour les freelances. Il offre des fonctionnalités ciblées pour les professionnels 
                  indépendants.
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
                        FreshBooks
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
                            {renderIcon(row.freshbooks)}
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
              <h2 className="text-2xl font-semibold text-foreground mb-4">Conclusion</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                <strong className="text-foreground">FreshBooks</strong> est un bon choix pour 
                la facturation et le suivi du temps.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                <strong className="text-foreground">GestionFlow</strong> est plus adapté pour 
                une vision globale, évolutive et multi-entreprises.
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

export default ComparisonFreshBooks;
