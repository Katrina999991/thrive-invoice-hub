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
    lastUpdated: "Dernière mise à jour : Janvier 2026",
    intro: "Chez GestionFlow, nous respectons votre vie privée et nous engageons à protéger vos données personnelles. Cette politique explique en termes simples comment nous collectons, utilisons et protégeons vos informations lorsque vous utilisez notre plateforme.",
    sections: {
      collect: {
        title: "1. Informations que nous collectons",
        content: "Nous collectons les types d'informations suivants pour faire fonctionner notre service :",
        items: [
          "Informations de compte : votre nom et adresse e-mail lors de l'inscription",
          "Données d'entreprise : les informations commerciales et paramètres que vous configurez",
          "Données clients : les clients, factures, devis et dépenses que vous saisissez dans le système",
          "E-mails transactionnels : les e-mails envoyés par le service en votre nom (factures, rappels)",
          "Informations de paiement : traitées de manière sécurisée par Stripe — nous ne stockons aucune donnée de carte bancaire"
        ]
      },
      usage: {
        title: "2. Comment nous utilisons vos informations",
        content: "Nous utilisons vos données pour :",
        items: [
          "Fournir et exploiter la plateforme GestionFlow",
          "Envoyer des factures, rappels de paiement et e-mails liés au système",
          "Traiter les paiements via des prestataires tiers sécurisés",
          "Améliorer et maintenir la plateforme",
          "Assurer la sécurité et prévenir la fraude"
        ]
      },
      emails: {
        title: "3. Communications par e-mail",
        content: "GestionFlow envoie des e-mails transactionnels liés à votre utilisation du service :",
        items: [
          "Ces e-mails sont nécessaires pour fournir les fonctionnalités principales (envoi de factures, rappels de paiement, confirmations)",
          "Aucun e-mail marketing n'est envoyé sans action explicite de votre part",
          "Vous pouvez gérer vos préférences e-mail dans les paramètres de votre compte"
        ]
      },
      thirdParty: {
        title: "4. Services tiers",
        content: "Nous travaillons avec des prestataires de confiance pour faire fonctionner notre plateforme :",
        items: [
          "Stripe : pour le traitement sécurisé des paiements",
          "Fournisseur d'envoi d'e-mails : pour la livraison des e-mails transactionnels",
          "Services d'hébergement et d'infrastructure : pour le stockage des données et la disponibilité du service"
        ],
        note: "Ces prestataires n'ont accès qu'aux données nécessaires pour effectuer leurs services et sont tenus de les protéger."
      },
      security: {
        title: "5. Stockage et sécurité des données",
        content: "La sécurité de vos données est notre priorité :",
        items: [
          "Les données sont stockées de manière sécurisée en utilisant des pratiques standard de l'industrie",
          "L'accès est restreint aux utilisateurs autorisés uniquement",
          "Vous gardez le contrôle total des données que vous saisissez dans le système",
          "Les connexions sont chiffrées via HTTPS"
        ]
      },
      rights: {
        title: "6. Vos droits",
        content: "Vous avez le contrôle sur vos données personnelles :",
        items: [
          "Accès : demander une copie de vos données personnelles",
          "Correction : mettre à jour ou corriger des informations inexactes",
          "Suppression : demander la suppression de vos données personnelles",
          "Export : télécharger vos données dans un format portable"
        ],
        note: "Pour exercer ces droits, contactez-nous à l'adresse ci-dessous."
      },
      retention: {
        title: "7. Conservation des données",
        content: "Nous conservons vos données aussi longtemps que nécessaire :",
        items: [
          "Les données sont conservées tant que votre compte est actif",
          "Vous pouvez demander la suppression de vos données lors de la fermeture de votre compte",
          "Certaines données peuvent être conservées pour des obligations légales ou de conformité"
        ]
      },
      contact: {
        title: "8. Nous contacter",
        content: "Si vous avez des questions concernant cette politique de confidentialité ou vos données, contactez-nous à :",
        email: "support@gestionflow.com"
      }
    },
    back: "Retour"
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: January 2026",
    intro: "At GestionFlow, we respect your privacy and are committed to protecting your personal data. This policy explains in plain language how we collect, use, and safeguard your information when you use our platform.",
    sections: {
      collect: {
        title: "1. Information We Collect",
        content: "We collect the following types of information to operate our service:",
        items: [
          "Account information: your name and email address when you sign up",
          "Company data: business details and settings you configure",
          "Client data: the customers, invoices, quotes, and expenses you enter into the system",
          "Transactional emails: emails sent by the service on your behalf (invoices, reminders)",
          "Payment information: handled securely by Stripe — we do not store any credit card data"
        ]
      },
      usage: {
        title: "2. How We Use Your Information",
        content: "We use your data to:",
        items: [
          "Provide and operate the GestionFlow platform",
          "Send invoices, payment reminders, and system-related emails",
          "Process payments through secure third-party providers",
          "Improve and maintain the platform",
          "Ensure security and prevent fraud"
        ]
      },
      emails: {
        title: "3. Email Communications",
        content: "GestionFlow sends transactional emails related to your use of the service:",
        items: [
          "These emails are required to deliver core functionality (sending invoices, payment reminders, confirmations)",
          "No marketing emails are sent without explicit action from you",
          "You can manage your email preferences in your account settings"
        ]
      },
      thirdParty: {
        title: "4. Third-Party Services",
        content: "We work with trusted providers to operate our platform:",
        items: [
          "Stripe: for secure payment processing",
          "Email delivery provider: for transactional email delivery",
          "Hosting and infrastructure services: for data storage and service availability"
        ],
        note: "These providers only access data necessary to perform their services and are required to protect it."
      },
      security: {
        title: "5. Data Storage and Security",
        content: "Your data security is our priority:",
        items: [
          "Data is stored securely using industry-standard practices",
          "Access is restricted to authorized users only",
          "You maintain full control over the data you enter into the system",
          "Connections are encrypted using HTTPS"
        ]
      },
      rights: {
        title: "6. Your Rights",
        content: "You have control over your personal data:",
        items: [
          "Access: request a copy of your personal data",
          "Correction: update or correct inaccurate information",
          "Deletion: request deletion of your personal data",
          "Export: download your data in a portable format"
        ],
        note: "To exercise these rights, contact us at the address below."
      },
      retention: {
        title: "7. Data Retention",
        content: "We retain your data for as long as needed:",
        items: [
          "Data is kept as long as your account is active",
          "You may request data deletion when closing your account",
          "Some data may be retained for legal or compliance obligations"
        ]
      },
      contact: {
        title: "8. Contact Us",
        content: "If you have any questions about this Privacy Policy or your data, contact us at:",
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
      
      <main className="container mx-auto px-4 py-12 max-w-3xl pt-24">
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

        {/* Section 1: Information We Collect */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.collect.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.collect.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.collect.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 2: How We Use Information */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.usage.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.usage.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.usage.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 3: Email Communications */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.emails.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.emails.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.emails.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 4: Third-Party Services */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.thirdParty.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.thirdParty.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.thirdParty.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-3 text-sm italic">{t.sections.thirdParty.note}</p>
        </section>

        {/* Section 5: Data Storage and Security */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.security.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.security.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.security.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 6: User Rights */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.rights.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.rights.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.rights.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
          <p className="text-muted-foreground mt-3 text-sm italic">{t.sections.rights.note}</p>
        </section>

        {/* Section 7: Data Retention */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.retention.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.retention.content}</p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
            {t.sections.retention.items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Section 8: Contact */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">{t.sections.contact.title}</h2>
          <p className="text-muted-foreground mb-2">{t.sections.contact.content}</p>
          <a 
            href={`mailto:${t.sections.contact.email}`}
            className="text-primary hover:underline font-medium"
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
