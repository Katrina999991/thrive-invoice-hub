import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Star, TrendingUp, FileText, Users, BarChart } from "lucide-react";
import logo from "@/assets/gestionflow-logo.png";

const Index = () => {
  const navigate = useNavigate();

  const reviews = [
    {
      name: "Sophie Martin",
      role: "Directrice Financière",
      comment: "GestionFlow a transformé notre gestion comptable. Simple et efficace!",
      rating: 5,
    },
    {
      name: "Pierre Dubois",
      role: "Entrepreneur",
      comment: "Parfait pour gérer mes factures et suivre mes dépenses en temps réel.",
      rating: 5,
    },
    {
      name: "Marie Lambert",
      role: "Consultante",
      comment: "Interface intuitive et rapports détaillés. Je recommande vivement!",
      rating: 5,
    },
  ];

  const features = [
    {
      icon: FileText,
      title: "Gestion des factures",
      description: "Créez et gérez vos factures en quelques clics",
    },
    {
      icon: TrendingUp,
      title: "Suivi des dépenses",
      description: "Contrôlez vos dépenses en temps réel",
    },
    {
      icon: Users,
      title: "Gestion clients",
      description: "Centralisez toutes vos informations clients",
    },
    {
      icon: BarChart,
      title: "Rapports détaillés",
      description: "Analysez vos performances avec des rapports précis",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="flex justify-center mb-8">
          <img src={logo} alt="GestionFlow" className="h-24" />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-6">
          Simplifiez votre gestion d'entreprise
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Factures, dépenses, clients - tout en un seul endroit. Gérez votre
          entreprise avec simplicité et efficacité.
        </p>
        <div className="flex gap-4 justify-center">
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="text-lg px-8 py-6"
          >
            Sign up for free
          </Button>
          <Button
            onClick={() => navigate("/auth")}
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6"
          >
            Sign in
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-foreground mb-12">
          Fonctionnalités principales
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border-border">
              <CardContent className="pt-6">
                <feature.icon className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="bg-muted py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">
            Ce que disent nos utilisateurs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {reviews.map((review, index) => (
              <Card key={index} className="border-border">
                <CardContent className="pt-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(review.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{review.comment}"</p>
                  <div>
                    <p className="font-semibold text-foreground">{review.name}</p>
                    <p className="text-sm text-muted-foreground">{review.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold text-foreground mb-6">
          Prêt à commencer?
        </h2>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Rejoignez des centaines d'entreprises qui font confiance à GestionFlow
        </p>
        <Button
          onClick={() => navigate("/auth")}
          size="lg"
          className="text-lg px-8 py-6"
        >
          Commencer gratuitement
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center gap-6">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <img src={logo} alt="GestionFlow" className="h-16 brightness-0 invert" />
              </div>
              <p className="text-primary-foreground/80 mb-2">
                La solution complète pour gérer votre entreprise
              </p>
              <p className="text-primary-foreground/80">
                info@gestionflow.net
              </p>
            </div>
          </div>
          <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
            <p>&copy; 2024 GestionFlow. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
