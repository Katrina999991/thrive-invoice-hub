import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Mail } from "lucide-react";
import { z } from "zod";

interface ContactFormProps {
  language: string;
  userEmail?: string;
}

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(1, "Message is required").max(5000, "Message must be less than 5000 characters"),
});

export function ContactForm({ language, userEmail }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(userEmail || "");
  const [subject, setSubject] = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const subjectOptions = language === "fr" 
    ? [
        { value: "question", label: "Question générale" },
        { value: "bug", label: "Signaler un bug" },
        { value: "feature", label: "Suggestion de fonctionnalité" },
        { value: "billing", label: "Facturation" },
        { value: "other", label: "Autre" },
      ]
    : [
        { value: "question", label: "General Question" },
        { value: "bug", label: "Report a Bug" },
        { value: "feature", label: "Feature Request" },
        { value: "billing", label: "Billing" },
        { value: "other", label: "Other" },
      ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const finalSubject = subject === "other" ? customSubject : subjectOptions.find(o => o.value === subject)?.label || subject;

    // Validate with zod
    const result = contactSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      subject: finalSubject,
      message: message.trim(),
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        if (err.path[0]) {
          const field = err.path[0] as string;
          const errorMsg = language === "fr" 
            ? getErrorMessageFr(field, err.message)
            : err.message;
          fieldErrors[field] = errorMsg;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: name.trim(),
          email: email.trim(),
          subject: finalSubject,
          message: message.trim(),
          userEmail,
        },
      });

      if (error) throw error;

      toast({
        title: language === "fr" ? "Message envoyé!" : "Message sent!",
        description: language === "fr" 
          ? "Nous vous répondrons dans les plus brefs délais." 
          : "We'll get back to you as soon as possible.",
      });

      // Reset form
      setName("");
      setEmail(userEmail || "");
      setSubject("");
      setCustomSubject("");
      setMessage("");
    } catch (error: any) {
      console.error("Error sending contact email:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Une erreur est survenue. Veuillez réessayer." 
          : "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const getErrorMessageFr = (field: string, message: string): string => {
    const translations: Record<string, Record<string, string>> = {
      name: {
        "Name is required": "Le nom est requis",
        "Name must be less than 100 characters": "Le nom doit contenir moins de 100 caractères",
      },
      email: {
        "Invalid email address": "Adresse email invalide",
        "Email must be less than 255 characters": "L'email doit contenir moins de 255 caractères",
      },
      subject: {
        "Subject is required": "Le sujet est requis",
        "Subject must be less than 200 characters": "Le sujet doit contenir moins de 200 caractères",
      },
      message: {
        "Message is required": "Le message est requis",
        "Message must be less than 5000 characters": "Le message doit contenir moins de 5000 caractères",
      },
    };
    return translations[field]?.[message] || message;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">
            {language === "fr" ? "Nom" : "Name"} *
          </Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={language === "fr" ? "Votre nom" : "Your name"}
            disabled={isSending}
            className={errors.name ? "border-destructive" : ""}
            maxLength={100}
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-email">
            {language === "fr" ? "Email" : "Email"} *
          </Label>
          <Input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={language === "fr" ? "votre@email.com" : "your@email.com"}
            disabled={isSending}
            className={errors.email ? "border-destructive" : ""}
            maxLength={255}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-subject">
          {language === "fr" ? "Sujet" : "Subject"} *
        </Label>
        <Select value={subject} onValueChange={setSubject} disabled={isSending}>
          <SelectTrigger className={errors.subject && !subject ? "border-destructive" : ""}>
            <SelectValue placeholder={language === "fr" ? "Sélectionnez un sujet" : "Select a subject"} />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {subject === "other" && (
          <Input
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder={language === "fr" ? "Précisez le sujet..." : "Specify the subject..."}
            disabled={isSending}
            className={errors.subject ? "border-destructive mt-2" : "mt-2"}
            maxLength={200}
          />
        )}
        {errors.subject && <p className="text-sm text-destructive">{errors.subject}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">
          {language === "fr" ? "Message" : "Message"} *
        </Label>
        <Textarea
          id="contact-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={language === "fr" ? "Décrivez votre demande en détail..." : "Describe your request in detail..."}
          disabled={isSending}
          className={errors.message ? "border-destructive min-h-[120px]" : "min-h-[120px]"}
          maxLength={5000}
        />
        <div className="flex justify-between">
          {errors.message && <p className="text-sm text-destructive">{errors.message}</p>}
          <p className="text-sm text-muted-foreground ml-auto">{message.length}/5000</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="h-4 w-4" />
          <span>
            {language === "fr" 
              ? "Ou envoyez un email à " 
              : "Or send an email to "}
            <a href="mailto:support@gestionflow.net" className="text-primary hover:underline">
              support@gestionflow.net
            </a>
          </span>
        </div>
        <Button type="submit" disabled={isSending}>
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === "fr" ? "Envoi..." : "Sending..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {language === "fr" ? "Envoyer" : "Send"}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
