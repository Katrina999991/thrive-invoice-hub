import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const translations = {
  fr: {
    title: "À propos de GestionFlow",
    paragraphs: [
      "GestionFlow est une plateforme de gestion d'entreprise conçue pour simplifier les opérations quotidiennes des travailleurs autonomes, consultants et petites entreprises.",
      "Notre objectif est de fournir un outil clair, intuitif et efficace pour gérer les factures, les dépenses, les clients, les produits, les taxes et les rapports — le tout en un seul endroit.",
      "GestionFlow a été conçu avec la flexibilité à l'esprit, permettant aux utilisateurs de gérer plusieurs entreprises, de personnaliser les documents et de générer des rapports professionnels en toute simplicité.",
      "Nous nous concentrons sur la clarté, le contrôle et la simplicité, afin que vous puissiez passer moins de temps à gérer et plus de temps à développer votre entreprise."
    ],
    back: "Retour"
  },
  en: {
    title: "About GestionFlow",
    paragraphs: [
      "GestionFlow is a business management platform designed to simplify daily operations for freelancers, consultants, and small businesses.",
      "Our goal is to provide a clean, intuitive, and efficient tool to manage invoices, expenses, clients, products, taxes, and reports — all in one place.",
      "GestionFlow was built with flexibility in mind, allowing users to manage multiple companies, customize documents, and generate professional reports with ease.",
      "We focus on clarity, control, and simplicity, so you can spend less time managing and more time growing your business."
    ],
    back: "Back"
  }
};

const About = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language as keyof typeof translations] || translations.en;

  useSEO({
    title: t.title + " | GestionFlow",
    description: t.paragraphs[0]
  });

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-8">{t.title}</h1>
        
        <div className="space-y-6">
          {t.paragraphs.map((paragraph, index) => (
            <p key={index} className="text-muted-foreground leading-relaxed text-lg">
              {paragraph}
            </p>
          ))}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
