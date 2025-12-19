import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Footer from "@/components/Footer";

const translations = {
  fr: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : Décembre 2025",
    intro: "GestionFlow (« nous », « notre », « nos ») respecte votre vie privée et s'engage à protéger vos données personnelles. Cette politique de confidentialité explique comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre logiciel et nos services.",
    sections: {
      collect: {
        title: "Informations collectées",
        content: "Nous pouvons collecter les informations suivantes :",
        items: [
          "Informations de compte (nom, adresse e-mail)",
          "Informations d'entreprise saisies par l'utilisateur",
          "Données de facturation et d'abonnement (traitées de manière sécurisée par des fournisseurs tiers)",
          "Données d'utilisation pour améliorer nos services"
        ]
      },
      usage: {
        title: "Utilisation des données",
        content: "Nous utilisons vos informations pour :",
        items: [
          "Fournir et exploiter la plateforme GestionFlow",
          "Gérer les comptes, abonnements et la facturation",
          "Envoyer des e-mails importants liés au service (factures, rapports, mises à jour)",
          "Améliorer les performances, la sécurité et l'expérience utilisateur"
        ]
      },
      sharing: {
        title: "Partage des données",
        content: "Nous ne vendons ni ne louons vos données personnelles. Les données peuvent être partagées uniquement avec des services tiers de confiance nécessaires au fonctionnement de la plateforme (par exemple, traitement des paiements, envoi d'e-mails)."
      },
      security: {
        title: "Sécurité des données",
        content: "Nous mettons en œuvre des mesures techniques et organisationnelles raisonnables pour protéger vos données contre tout accès non autorisé, perte ou utilisation abusive."
      },
      rights: {
        title: "Vos droits",
        content: "Vous pouvez demander l'accès, la correction ou la suppression de vos données à tout moment en nous contactant."
      },
      contact: {
        title: "Contact",
        content: "Si vous avez des questions concernant cette politique de confidentialité, veuillez nous contacter à :",
        email: "support@gestionflow.com"
      }
    },
    back: "Retour"
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: December 2025",
    intro: "GestionFlow (\"we\", \"our\", \"us\") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our software and services.",
    sections: {
      collect: {
        title: "Information We Collect",
        content: "We may collect the following information:",
        items: [
          "Account information (name, email address)",
          "Company information entered by the user",
          "Billing and subscription data (processed securely by third-party providers)",
          "Usage data to improve our services"
        ]
      },
      usage: {
        title: "How We Use Your Information",
        content: "We use your information to:",
        items: [
          "Provide and operate the GestionFlow platform",
          "Manage accounts, subscriptions, and billing",
          "Send important service-related emails (invoices, reports, updates)",
          "Improve performance, security, and user experience"
        ]
      },
      sharing: {
        title: "Data Sharing",
        content: "We do not sell or rent your personal data. Data may be shared only with trusted third-party services required to operate the platform (e.g. payment processing, email delivery)."
      },
      security: {
        title: "Data Security",
        content: "We implement reasonable technical and organizational measures to protect your data against unauthorized access, loss, or misuse."
      },
      rights: {
        title: "Your Rights",
        content: "You may request access, correction, or deletion of your data at any time by contacting us."
      },
      contact: {
        title: "Contact",
        content: "If you have any questions about this Privacy Policy, please contact us at:",
        email: "support@gestionflow.com"
      }
    },
    back: "Back"
  }
};

const Privacy = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language as keyof typeof translations] || translations.en;

  useSEO({
    title: t.title + " | GestionFlow",
    description: t.intro.substring(0, 160)
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
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.collect.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.collect.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.collect.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.usage.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.usage.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.usage.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.sharing.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.sharing.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.security.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.security.content}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.rights.title}</h2>
          <p className="text-muted-foreground leading-relaxed">{t.sections.rights.content}</p>
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

export default Privacy;
