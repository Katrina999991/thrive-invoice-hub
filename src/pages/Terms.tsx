import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const translations = {
  fr: {
    title: "Conditions d'utilisation",
    lastUpdated: "Dernière mise à jour : Décembre 2025",
    intro: "En accédant ou en utilisant GestionFlow, vous acceptez ces conditions d'utilisation.",
    sections: {
      service: {
        title: "Utilisation du service",
        content: "GestionFlow fournit des outils de gestion d'entreprise incluant les factures, dépenses, rapports et données d'entreprise. Vous êtes responsable de l'exactitude des informations que vous saisissez."
      },
      accounts: {
        title: "Comptes",
        content: "Vous êtes responsable du maintien de la confidentialité de vos identifiants de compte et de toutes les activités effectuées sous votre compte."
      },
      payments: {
        title: "Paiements et abonnements",
        content: "Certaines fonctionnalités nécessitent un abonnement payant. Les paiements sont traités de manière sécurisée par des fournisseurs de paiement tiers. Les détails de l'abonnement et les tarifs sont affichés sur la page Tarifs."
      },
      acceptable: {
        title: "Utilisation acceptable",
        content: "Vous acceptez de ne pas utiliser la plateforme de manière abusive, de ne pas tenter d'accès non autorisé, ou d'utiliser le service à des fins illégales."
      },
      availability: {
        title: "Disponibilité",
        content: "Nous nous efforçons de maintenir GestionFlow disponible en permanence, mais nous ne garantissons pas un accès ininterrompu."
      },
      liability: {
        title: "Limitation de responsabilité",
        content: "GestionFlow est fourni « tel quel ». Nous ne sommes pas responsables des dommages indirects, de la perte de données ou de l'interruption des activités."
      },
      changes: {
        title: "Modifications",
        content: "Nous pouvons mettre à jour ces conditions de temps à autre. L'utilisation continue du service constitue l'acceptation des conditions mises à jour."
      },
      contact: {
        title: "Contact",
        content: "Pour toute question concernant ces conditions, contactez :",
        email: "support@gestionflow.com"
      }
    },
    back: "Retour"
  },
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated: December 2025",
    intro: "By accessing or using GestionFlow, you agree to these Terms of Service.",
    sections: {
      service: {
        title: "Use of the Service",
        content: "GestionFlow provides tools for business management including invoices, expenses, reports, and company data. You are responsible for the accuracy of the information you enter."
      },
      accounts: {
        title: "Accounts",
        content: "You are responsible for maintaining the confidentiality of your account credentials and all activities under your account."
      },
      payments: {
        title: "Payments and Subscriptions",
        content: "Some features require a paid subscription. Payments are handled securely by third-party payment providers. Subscription details and pricing are displayed on the Pricing page."
      },
      acceptable: {
        title: "Acceptable Use",
        content: "You agree not to misuse the platform, attempt unauthorized access, or use the service for illegal activities."
      },
      availability: {
        title: "Availability",
        content: "We strive to keep GestionFlow available at all times, but we do not guarantee uninterrupted access."
      },
      liability: {
        title: "Limitation of Liability",
        content: "GestionFlow is provided \"as is\". We are not liable for indirect damages, data loss, or business interruption."
      },
      changes: {
        title: "Changes",
        content: "We may update these Terms from time to time. Continued use of the service constitutes acceptance of the updated terms."
      },
      contact: {
        title: "Contact",
        content: "For questions regarding these Terms, contact:",
        email: "support@gestionflow.com"
      }
    },
    back: "Back"
  }
};

const Terms = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language as keyof typeof translations] || translations.en;

  useSEO({
    title: t.title + " | GestionFlow",
    description: t.intro
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

        <h1 className="text-3xl font-bold text-foreground mb-2">{t.title}</h1>
        <p className="text-muted-foreground mb-8">{t.lastUpdated}</p>
        
        <p className="text-foreground mb-8 leading-relaxed">{t.intro}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.service.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.service.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.accounts.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.accounts.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.payments.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.payments.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.acceptable.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.acceptable.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.availability.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.availability.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.liability.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.liability.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.changes.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.changes.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.contact.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.contact.content}</p>
          <a 
            href={`mailto:${t.sections.contact.email}`}
            className="text-primary hover:underline"
          >
            {t.sections.contact.email}
          </a>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;
