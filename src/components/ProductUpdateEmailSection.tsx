import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Loader2, Mail, TestTube } from "lucide-react";

export function ProductUpdateEmailSection() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  
  // Test mode
  const [isTestMode, setIsTestMode] = useState(false);
  const [testEmails, setTestEmails] = useState(""); // Supports comma-separated emails
  
  // French fields
  const [subjectFr, setSubjectFr] = useState("");
  const [titleFr, setTitleFr] = useState("");
  const [contentFr, setContentFr] = useState("");
  
  // English fields
  const [subjectEn, setSubjectEn] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [contentEn, setContentEn] = useState("");

  const handleSendUpdate = async () => {
    // Validate that at least one language version is complete
    const hasFrench = subjectFr.trim() && titleFr.trim() && contentFr.trim();
    const hasEnglish = subjectEn.trim() && titleEn.trim() && contentEn.trim();

    if (!hasFrench && !hasEnglish) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Veuillez remplir au moins une version (FR ou EN)" 
          : "Please fill in at least one version (FR or EN)",
        variant: "destructive",
      });
      return;
    }

    // Validate test emails if in test mode
    const emailList = testEmails.split(',').map(e => e.trim()).filter(e => e);
    if (isTestMode && emailList.length === 0) {
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: language === "fr" 
          ? "Veuillez entrer au moins une adresse email de test" 
          : "Please enter at least one test email address",
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
      const convertToHtml = (text: string) => 
        text.split('\n').map(line => line.trim() ? `<p>${line}</p>` : '').join('');

      const response = await fetch(
        `https://dkinzkawntfzkabroeib.supabase.co/functions/v1/send-product-update`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            fr: hasFrench ? {
              subject: subjectFr,
              title: titleFr,
              content: convertToHtml(contentFr),
            } : null,
            en: hasEnglish ? {
              subject: subjectEn,
              title: titleEn,
              content: convertToHtml(contentEn),
            } : null,
            testEmails: isTestMode ? emailList : undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send emails");
      }

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: isTestMode
          ? (language === "fr"
            ? `${result.sentCount} email(s) de test envoyé(s)`
            : `${result.sentCount} test email(s) sent`)
          : (language === "fr"
            ? `${result.sentCount} email(s) envoyé(s) avec succès`
            : `${result.sentCount} email(s) sent successfully`),
      });

      // Refresh logs table
      queryClient.invalidateQueries({ queryKey: ["product-update-logs"] });

      // Only reset form if not in test mode
      if (!isTestMode) {
        setSubjectFr("");
        setTitleFr("");
        setContentFr("");
        setSubjectEn("");
        setTitleEn("");
        setContentEn("");
      }
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
            ? "Rédigez les versions FR et EN. Chaque utilisateur recevra l'email dans sa langue préférée."
            : "Write FR and EN versions. Each user will receive the email in their preferred language."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Test Mode Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-muted-foreground" />
            <div>
              <Label htmlFor="test-mode" className="text-sm font-medium">
                {language === "fr" ? "Mode test" : "Test Mode"}
              </Label>
              <p className="text-xs text-muted-foreground">
                {language === "fr" 
                  ? "Envoyer uniquement à une adresse spécifique" 
                  : "Send only to a specific address"}
              </p>
            </div>
          </div>
          <Switch
            id="test-mode"
            checked={isTestMode}
            onCheckedChange={setIsTestMode}
          />
        </div>

        {isTestMode && (
          <div className="space-y-2">
            <Label htmlFor="test-emails">
              {language === "fr" ? "Emails de test" : "Test Emails"}
            </Label>
            <Input
              id="test-emails"
              type="text"
              value={testEmails}
              onChange={(e) => setTestEmails(e.target.value)}
              placeholder="email1@example.com, email2@example.com"
            />
            <p className="text-xs text-muted-foreground">
              {language === "fr" 
                ? "Séparez les adresses par des virgules" 
                : "Separate addresses with commas"}
            </p>
          </div>
        )}

        <Tabs defaultValue="fr" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
            <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
          </TabsList>
          
          <TabsContent value="fr" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject-fr">Objet de l'email</Label>
              <Input
                id="email-subject-fr"
                value={subjectFr}
                onChange={(e) => setSubjectFr(e.target.value)}
                placeholder="Ex: Nouvelle fonctionnalité GestionFlow!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-title-fr">Titre dans l'email</Label>
              <Input
                id="email-title-fr"
                value={titleFr}
                onChange={(e) => setTitleFr(e.target.value)}
                placeholder="Ex: Découvrez nos nouvelles fonctionnalités"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-content-fr">Contenu de l'email</Label>
              <Textarea
                id="email-content-fr"
                value={contentFr}
                onChange={(e) => setContentFr(e.target.value)}
                placeholder="Décrivez les nouvelles fonctionnalités ou mises à jour..."
                rows={6}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="en" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email-subject-en">Email Subject</Label>
              <Input
                id="email-subject-en"
                value={subjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
                placeholder="Ex: New GestionFlow Feature!"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-title-en">Email Title</Label>
              <Input
                id="email-title-en"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                placeholder="Ex: Discover our new features"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-content-en">Email Content</Label>
              <Textarea
                id="email-content-en"
                value={contentEn}
                onChange={(e) => setContentEn(e.target.value)}
                placeholder="Describe the new features or updates..."
                rows={6}
              />
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-muted-foreground">
          {language === "fr"
            ? "Chaque ligne sera convertie en paragraphe. Si une version n'est pas remplie, l'autre version sera envoyée à tous."
            : "Each line will be converted to a paragraph. If one version is missing, the other will be sent to everyone."}
        </p>

        <Button 
          onClick={handleSendUpdate} 
          disabled={isLoading}
          className="w-full sm:w-auto"
          variant={isTestMode ? "secondary" : "default"}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {language === "fr" ? "Envoi en cours..." : "Sending..."}
            </>
          ) : (
            <>
              {isTestMode ? <TestTube className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
              {isTestMode 
                ? (language === "fr" ? "Envoyer le test" : "Send Test")
                : (language === "fr" ? "Envoyer la mise à jour" : "Send Update")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}