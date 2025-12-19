import { useState } from "react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSEO } from "@/hooks/useSEO";
import PublicNavigation from "@/components/PublicNavigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

const translations = {
  fr: {
    title: "Contactez-nous",
    intro: "Vous avez une question, un commentaire ou besoin d'aide avec GestionFlow ?",
    weAreHere: "Nous sommes là pour vous aider.",
    formIntro: "Vous pouvez nous joindre via le formulaire ci-dessous. Nous répondons généralement dans les 24 à 48 heures.",
    supportNote: "Pour les demandes d'assistance, veuillez inclure autant de détails que possible afin que nous puissions vous aider efficacement.",
    thanks: "Merci d'utiliser GestionFlow.",
    form: {
      name: "Nom",
      namePlaceholder: "Votre nom",
      email: "Courriel",
      emailPlaceholder: "votre@email.com",
      subject: "Sujet",
      subjectPlaceholder: "Comment pouvons-nous vous aider ?",
      message: "Message",
      messagePlaceholder: "Décrivez votre demande en détail...",
      submit: "Envoyer le message",
      sending: "Envoi en cours..."
    },
    success: "Votre message a été envoyé avec succès.",
    error: "Une erreur est survenue. Veuillez réessayer.",
    back: "Retour"
  },
  en: {
    title: "Contact Us",
    intro: "Have a question, feedback, or need help with GestionFlow?",
    weAreHere: "We're here to help.",
    formIntro: "You can reach us using the contact form below. We typically respond within 24–48 hours.",
    supportNote: "For support requests, please include as much detail as possible so we can assist you efficiently.",
    thanks: "Thank you for using GestionFlow.",
    form: {
      name: "Name",
      namePlaceholder: "Your name",
      email: "Email",
      emailPlaceholder: "your@email.com",
      subject: "Subject",
      subjectPlaceholder: "How can we help you?",
      message: "Message",
      messagePlaceholder: "Describe your request in detail...",
      submit: "Send Message",
      sending: "Sending..."
    },
    success: "Your message has been sent successfully.",
    error: "An error occurred. Please try again.",
    back: "Back"
  }
};

const Contact = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  useSEO({
    title: t.title + " | GestionFlow",
    description: t.intro
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.subject.trim() || !formData.message.trim()) {
      toast.error(language === "fr" ? "Veuillez remplir tous les champs" : "Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim()
        }
      });

      if (error) throw error;

      toast.success(t.success);
      setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      console.error("Error sending contact form:", error);
      toast.error(t.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicNavigation />
      
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {t.back}
        </Button>

        <h1 className="text-3xl font-bold text-foreground mb-6">{t.title}</h1>
        
        <div className="space-y-4 mb-8">
          <p className="text-muted-foreground leading-relaxed text-lg">{t.intro}</p>
          <p className="text-muted-foreground leading-relaxed text-lg">{t.weAreHere}</p>
          <p className="text-muted-foreground leading-relaxed">{t.formIntro}</p>
          <p className="text-muted-foreground leading-relaxed">{t.supportNote}</p>
          <p className="text-muted-foreground leading-relaxed">{t.thanks}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t.form.name}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={t.form.namePlaceholder}
                value={formData.name}
                onChange={handleChange}
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t.form.email}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder={t.form.emailPlaceholder}
                value={formData.email}
                onChange={handleChange}
                maxLength={255}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">{t.form.subject}</Label>
            <Input
              id="subject"
              name="subject"
              type="text"
              placeholder={t.form.subjectPlaceholder}
              value={formData.subject}
              onChange={handleChange}
              maxLength={200}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t.form.message}</Label>
            <Textarea
              id="message"
              name="message"
              placeholder={t.form.messagePlaceholder}
              value={formData.message}
              onChange={handleChange}
              maxLength={5000}
              rows={6}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full md:w-auto gap-2">
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t.form.sending}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {t.form.submit}
              </>
            )}
          </Button>
        </form>
      </main>
      
      <Footer />
    </div>
  );
};

export default Contact;
