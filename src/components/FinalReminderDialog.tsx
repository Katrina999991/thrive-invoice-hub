import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, Send, RefreshCw } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface FinalReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    due_date: string | null;
    final_reminder_sent?: boolean;
    final_reminder_sent_at?: string | null;
    final_reminder_response_due_at?: string | null;
  };
  onSend: (invoiceId: string, responseDueDate: string) => Promise<void>;
}

export const FinalReminderDialog = ({ open, onOpenChange, invoice, onSend }: FinalReminderDialogProps) => {
  const { language } = useLanguage();
  const isResend = invoice.final_reminder_sent;
  
  // Default response due date: 7 days from now
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);
  
  const [responseDueDate, setResponseDueDate] = useState(
    invoice.final_reminder_response_due_at || defaultDueDate.toISOString().split('T')[0]
  );
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(invoice.id, responseDueDate);
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            {isResend
              ? (language === "fr" ? "Renvoyer le dernier rappel" : "Resend Final Reminder")
              : (language === "fr" ? "Envoyer le dernier rappel de paiement" : "Send Final Payment Reminder")}
          </DialogTitle>
          <DialogDescription>
            {language === "fr"
              ? `Facture ${invoice.invoice_number} — $${invoice.total.toFixed(2)}`
              : `Invoice ${invoice.invoice_number} — $${invoice.total.toFixed(2)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isResend && invoice.final_reminder_sent_at && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-300">
                {language === "fr" ? "Un dernier rappel a déjà été envoyé" : "A final reminder was already sent"}
              </p>
              <p className="text-amber-700 dark:text-amber-400 mt-1">
                {language === "fr" ? "Envoyé le" : "Sent on"}: {new Date(invoice.final_reminder_sent_at).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA")}
              </p>
            </div>
          )}

          <div className="p-3 rounded-lg bg-muted text-sm">
            <p className="text-muted-foreground">
              {language === "fr"
                ? "Ce rappel sera marqué comme le dernier avertissement avant d'éventuelles actions. Le destinataire sera informé de la date limite de réponse."
                : "This reminder will be marked as the final warning before potential action. The recipient will be informed of the response deadline."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="response-due-date">
              {language === "fr" ? "Date limite de réponse" : "Response Due Date"} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="response-due-date"
              type="date"
              value={responseDueDate}
              onChange={(e) => setResponseDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-muted-foreground">
              {language === "fr"
                ? "Le destinataire doit répondre avant cette date."
                : "The recipient must respond before this date."}
            </p>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!responseDueDate || isSending}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : isResend ? (
              <RefreshCw className="h-4 w-4 mr-2" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {isSending
              ? (language === "fr" ? "Envoi..." : "Sending...")
              : isResend
                ? (language === "fr" ? "Renvoyer" : "Resend")
                : (language === "fr" ? "Envoyer" : "Send")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
