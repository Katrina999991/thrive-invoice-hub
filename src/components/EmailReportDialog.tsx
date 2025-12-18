import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { logAuditEvent } from "@/lib/auditLogger";

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  reportTitle: string;
  pdfBlob: Blob | null;
  onGeneratePdf: () => Promise<Blob | null>;
  defaultSubject?: string;
  defaultMessage?: string;
}

export const EmailReportDialog = ({
  open,
  onOpenChange,
  reportType,
  reportTitle,
  pdfBlob,
  onGeneratePdf,
  defaultSubject,
  defaultMessage,
}: EmailReportDialogProps) => {
  const { t, language } = useLanguage();
  const { user, username } = useAuth();
  const [recipient, setRecipient] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Reset subject and message when dialog opens
  useEffect(() => {
    if (open) {
      setSubject(defaultSubject || reportTitle);
      setMessage("");
    }
  }, [open, reportTitle, defaultSubject]);

  const handleSend = async () => {
    if (!recipient) {
      toast.error(language === 'fr' ? "Veuillez entrer une adresse courriel" : "Please enter an email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipient)) {
      toast.error(language === 'fr' ? "Adresse courriel invalide" : "Invalid email address");
      return;
    }

    if (!subject.trim()) {
      toast.error(language === 'fr' ? "Veuillez entrer un objet" : "Please enter a subject");
      return;
    }

    setSending(true);

    try {
      // Generate PDF if not already generated
      let pdf = pdfBlob;
      if (!pdf) {
        pdf = await onGeneratePdf();
      }

      if (!pdf) {
        toast.error(language === 'fr' ? "Erreur lors de la génération du PDF" : "Error generating PDF");
        setSending(false);
        return;
      }

      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove the data:application/pdf;base64, prefix
          const base64Data = base64.split(",")[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdf);
      const pdfBase64 = await base64Promise;

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke("send-report-email", {
        body: {
          recipientEmail: recipient,
          reportTitle: subject,
          reportType,
          message: message || undefined,
          pdfBase64,
          language,
        },
      });

      if (error) {
        throw error;
      }

      // Log audit event
      if (user) {
        logAuditEvent({
          userId: user.id,
          userName: username || user.email?.split('@')[0] || 'User',
          category: 'exports',
          eventType: 'report_emailed',
          description: `Rapport envoyé par courriel: ${reportType}`,
          metadata: { report_type: reportType, recipient }
        });
      }

      toast.success(
        language === 'fr' 
          ? `Rapport envoyé à ${recipient}` 
          : `Report sent to ${recipient}`
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending report email:", error);
      toast.error(
        language === 'fr' 
          ? "Erreur lors de l'envoi du courriel" 
          : "Error sending email"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {language === 'fr' ? 'Envoyer par courriel' : 'Send by Email'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr' 
              ? `Envoyez le rapport en PDF à un destinataire.`
              : `Send the report as PDF to a recipient.`}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="recipient">
              {language === 'fr' ? 'Destinataire' : 'Recipient'}
            </Label>
            <Input
              id="recipient"
              type="email"
              placeholder={language === 'fr' ? 'courriel@exemple.com' : 'email@example.com'}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="subject">
              {language === 'fr' ? 'Objet' : 'Subject'}
            </Label>
            <Input
              id="subject"
              type="text"
              placeholder={language === 'fr' ? 'Objet du courriel' : 'Email subject'}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          
          <div className="grid gap-2">
            <Label htmlFor="message">
              {language === 'fr' ? 'Message (optionnel)' : 'Message (optional)'}
            </Label>
            <Textarea
              id="message"
              placeholder={language === 'fr' 
                ? 'Ajoutez un message personnalisé...' 
                : 'Add a custom message...'}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'fr' ? 'Envoi...' : 'Sending...'}
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                {language === 'fr' ? 'Envoyer' : 'Send'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
