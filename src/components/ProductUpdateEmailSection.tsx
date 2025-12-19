import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Send, Loader2, Mail } from "lucide-react";

// Admin user ID - only this user can send product updates
const ADMIN_USER_ID = "e6c5ca56-8437-4782-bc6a-3b0f77993ebc";

export function ProductUpdateEmailSection() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  // Only show for admin user
  if (!user || user.id !== ADMIN_USER_ID) {
    return null;
  }

  const handleSendUpdate = async () => {
    if (!subject.trim() || !title.trim() || !content.trim()) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Veuillez remplir tous les champs" 
          : "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      // Convert plain text content to HTML
      const htmlContent = content
        .split('\n')
        .map(line => line.trim() ? `<p>${line}</p>` : '')
        .join('');

      const response = await fetch(
        `https://dkinzkawntfzkabroeib.supabase.co/functions/v1/send-product-update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject,
            title,
            content: htmlContent,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send emails");
      }

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr"
          ? `${result.sentCount} email(s) envoyé(s) avec succès`
          : `${result.sentCount} email(s) sent successfully`,
      });

      // Reset form
      setSubject("");
      setTitle("");
      setContent("");
    } catch (error: any) {
      console.error("Error sending product update:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          {language === "fr" ? "Mise à jour produit" : "Product Update"}
        </CardTitle>
        <CardDescription>
          {language === "fr"
            ? "Envoyer un email de mise à jour à tous les utilisateurs qui ont activé les notifications de mise à jour produit."
            : "Send an update email to all users who have enabled product update notifications."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-subject">
            {language === "fr" ? "Objet de l'email" : "Email Subject"}
          </Label>
          <Input
            id="email-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={language === "fr" 
              ? "Ex: Nouvelle fonctionnalité GestionFlow!" 
              : "Ex: New GestionFlow Feature!"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-title">
            {language === "fr" ? "Titre dans l'email" : "Email Title"}
          </Label>
          <Input
            id="email-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={language === "fr"
              ? "Ex: Découvrez nos nouvelles fonctionnalités"
              : "Ex: Discover our new features"}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email-content">
            {language === "fr" ? "Contenu de l'email" : "Email Content"}
          </Label>
          <Textarea
            id="email-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={language === "fr"
              ? "Décrivez les nouvelles fonctionnalités ou mises à jour..."
              : "Describe the new features or updates..."}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {language === "fr"
              ? "Chaque ligne sera convertie en paragraphe dans l'email."
              : "Each line will be converted to a paragraph in the email."}
          </p>
        </div>

        <Button 
          onClick={handleSendUpdate} 
          disabled={isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === "fr" ? "Envoi en cours..." : "Sending..."}
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {language === "fr" ? "Envoyer la mise à jour" : "Send Update"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
