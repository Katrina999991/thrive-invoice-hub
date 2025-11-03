import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BarChart3, Users, FileText, TrendingUp } from "lucide-react";
import gestionflowLogo from "@/assets/gestionflow-logo.png";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: BarChart3,
      title: "Tableau de bord analytique",
      description: "Visualisez vos données en temps réel avec des graphiques interactifs"
    },
    {
      icon: Users,
      title: "Gestion des clients",
      description: "Gérez facilement votre portefeuille clients et fournisseurs"
    },
    {
      icon: FileText,
      title: "Facturation simplifiée",
      description: "Créez et envoyez des factures professionnelles en quelques clics"
    },
    {
      icon: TrendingUp,
      title: "Rapports détaillés",
      description: "Analysez vos performances avec des rapports complets"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="flex flex-col items-center text-center space-y-8">
          <img 
            src={gestionflowLogo} 
            alt="GestionFlow" 
            className="h-24 w-auto object-contain"
          />
          
          <div className="max-w-3xl space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-foreground">
              Gérez votre entreprise en toute simplicité
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground">
              La solution complète pour la gestion de votre activité : facturation, clients, dépenses et rapports en un seul endroit
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button 
              size="lg" 
              className="text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              S'inscrire gratuitement
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6"
              onClick={() => navigate("/auth")}
            >
              Se connecter
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="flex flex-col items-center text-center p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="mb-4 p-3 rounded-full bg-primary/10">
                <feature.icon className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-card-foreground">
                {feature.title}
              </h3>
              <p className="text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="bg-primary text-primary-foreground rounded-lg p-8 md:p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Prêt à optimiser votre gestion ?
          </h2>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Rejoignez des centaines d'entreprises qui nous font confiance
          </p>
          <Button 
            size="lg"
            variant="secondary"
            className="text-lg px-8 py-6"
            onClick={() => navigate("/auth")}
          >
            Commencer gratuitement
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
