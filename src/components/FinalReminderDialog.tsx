import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertTriangle, Send, RefreshCw, Eye, Mail } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";

interface FinalReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    due_date: string | null;
    payment_link: string | null;
    final_reminder_sent?: boolean;
    final_reminder_sent_at?: string | null;
    final_reminder_response_due_at?: string | null;
    final_reminder_email_subject?: string | null;
    final_reminder_email_body?: string | null;
    final_reminder_recipient?: string | null;
    clients?: {
      name: string;
      email: string | null;
      contact_person: string | null;
      include_payment_link?: boolean | null;
      language?: string | null;
    };
  };
  companyName?: string;
  onSend: (invoiceId: string, data: {
    responseDueDate: string;
    recipient: string;
    subject: string;
    body: string;
  }) => Promise<void>;
}

export const FinalReminderDialog = ({ open, onOpenChange, invoice, companyName, onSend }: FinalReminderDialogProps) => {
  const { t, language } = useLanguage();
  const isResend = invoice.final_reminder_sent;

  // Use CLIENT language for email content, UI language for labels
  const clientLang = invoice.clients?.language === 'french' || invoice.clients?.language === 'fr' ? 'fr' : 'en';

  const clientName = invoice.clients?.contact_person || invoice.clients?.name || '';
  const clientEmail = invoice.clients?.email || '';
  const company = companyName || '';

  // Default response due date: 7 days from now
  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 7);

  const defaultSubject = clientLang === "fr"
    ? `Dernier rappel de paiement — Facture ${invoice.invoice_number}`
    : `Final Payment Reminder — Invoice ${invoice.invoice_number}`;

  const includePaymentLink = invoice.clients?.include_payment_link === true && !!invoice.payment_link;

  const defaultBody = clientLang === "fr"
    ? `Bonjour {{client_name}},

Ceci est un dernier rappel concernant la facture {{invoice_number}} d'un montant de {{amount_due}}.

La facture était échue le {{invoice_due_date}}. Nous vous demandons de bien vouloir effectuer le paiement ou nous répondre au plus tard le {{final_reminder_due_date}}.

Sans réponse de votre part avant cette date, nous serons dans l'obligation de prendre les mesures nécessaires.

Merci de votre attention,

{{company_name}}`
    : `Dear {{client_name}},

This is a final reminder regarding invoice {{invoice_number}} for an amount of {{amount_due}}.

The invoice was due on {{invoice_due_date}}. We kindly request that you make the payment or respond no later than {{final_reminder_due_date}}.

If we do not hear from you by this date, we will be obligated to take further action.

Thank you for your attention,

{{company_name}}`;

  // Validate that stored recipient looks like an email, not a UUID
  const storedRecipient = invoice.final_reminder_recipient;
  const isValidEmail = storedRecipient && storedRecipient.includes('@');
  
  const [recipient, setRecipient] = useState(
    isValidEmail ? storedRecipient : clientEmail
  );
  const [subject, setSubject] = useState(
    invoice.final_reminder_email_subject || defaultSubject
  );
  const [body, setBody] = useState(
    invoice.final_reminder_email_body || defaultBody
  );
  const [responseDueDate, setResponseDueDate] = useState(
    invoice.final_reminder_response_due_at || defaultDueDate.toISOString().split('T')[0]
  );
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState("compose");

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString(language === "fr" ? "fr-CA" : "en-CA");
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{client_name\}\}/g, clientName || '—')
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{amount_due\}\}/g, `$${invoice.total.toFixed(2)}`)
      .replace(/\{\{invoice_due_date\}\}/g, formatDate(invoice.due_date))
      .replace(/\{\{final_reminder_due_date\}\}/g, formatDate(responseDueDate))
      .replace(/\{\{company_name\}\}/g, company || '—');
  };

  const previewSubject = useMemo(() => replaceVariables(subject), [subject, responseDueDate, clientName, company]);
  const previewBody = useMemo(() => replaceVariables(body), [body, responseDueDate, clientName, company]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      await onSend(invoice.id, {
        responseDueDate,
        recipient,
        subject,
        body,
      });
      onOpenChange(false);
    } finally {
      setIsSending(false);
    }
  };

  const variables = [
    { key: '{{client_name}}', label: language === 'fr' ? 'Nom du client' : 'Client name' },
    { key: '{{invoice_number}}', label: language === 'fr' ? 'Numéro de facture' : 'Invoice number' },
    { key: '{{amount_due}}', label: language === 'fr' ? 'Montant dû' : 'Amount due' },
    { key: '{{invoice_due_date}}', label: language === 'fr' ? "Date d'échéance" : 'Due date' },
    { key: '{{final_reminder_due_date}}', label: language === 'fr' ? 'Date limite de réponse' : 'Response deadline' },
    { key: '{{company_name}}', label: language === 'fr' ? "Nom de l'entreprise" : 'Company name' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
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
                {language === "fr" ? "Envoyé le" : "Sent on"}: {formatDate(invoice.final_reminder_sent_at)}
                {invoice.final_reminder_recipient && (
                  <> — {language === "fr" ? "à" : "to"}: {invoice.final_reminder_recipient}</>
                )}
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="compose" className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />
                {language === "fr" ? "Composer" : "Compose"}
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                {language === "fr" ? "Aperçu" : "Preview"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="compose" className="space-y-4 mt-4">
              {/* No email warning */}
              {!clientEmail && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                  {language === "fr"
                    ? "Ce client n'a pas d'adresse email enregistrée. Veuillez saisir une adresse email ci-dessous."
                    : "This client has no email address on file. Please enter an email address below."}
                </div>
              )}

              {/* Recipient */}
              <div className="space-y-2">
                <Label htmlFor="fr-recipient">
                  {language === "fr" ? "Destinataire" : "Recipient"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fr-recipient"
                  type="email"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="email@example.com"
                />
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="fr-subject">
                  {language === "fr" ? "Objet" : "Subject"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fr-subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              {/* Response Due Date */}
              <div className="space-y-2">
                <Label htmlFor="fr-response-due-date">
                  {language === "fr" ? "Date limite de réponse" : "Response Due Date"} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fr-response-due-date"
                  type="date"
                  value={responseDueDate}
                  onChange={(e) => setResponseDueDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label htmlFor="fr-body">
                  {language === "fr" ? "Message" : "Message"} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="fr-body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
              </div>

              {/* Variables Reference */}
              <div className="p-3 rounded-lg bg-muted text-xs space-y-1">
                <p className="font-medium text-muted-foreground mb-1.5">
                  {language === "fr" ? "Variables disponibles :" : "Available variables:"}
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {variables.map(v => (
                    <div key={v.key} className="flex items-center gap-1.5">
                      <code className="bg-background px-1 py-0.5 rounded text-[11px] font-mono">{v.key}</code>
                      <span className="text-muted-foreground">{v.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment button info */}
              {includePaymentLink && (
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-foreground">
                  <p>
                    {language === "fr"
                      ? "✓ Un bouton de paiement sera automatiquement ajouté à la fin de l'email."
                      : "✓ A payment button will be automatically added at the end of the email."}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <div className="border rounded-lg overflow-hidden">
                {/* Email header preview */}
                <div className="bg-muted p-3 space-y-1.5 text-sm border-b">
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground min-w-[50px]">{language === "fr" ? "À :" : "To:"}</span>
                    <span>{recipient || '—'}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-medium text-muted-foreground min-w-[50px]">{language === "fr" ? "Objet :" : "Subject:"}</span>
                    <span className="font-medium">{previewSubject}</span>
                  </div>
                </div>
                {/* Email body preview */}
                <div className="p-4 text-sm whitespace-pre-wrap leading-relaxed bg-background">
                  {previewBody}
                </div>
                {/* Payment button preview */}
                {includePaymentLink && (
                  <div className="px-4 pb-4 bg-background">
                    <div className="mt-2 pt-2">
                      <p className="font-semibold text-sm mb-2">
                        {clientLang === "fr" ? "Payer en ligne :" : "Pay online:"}
                      </p>
                      <a
                        href={invoice.payment_link || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md font-semibold text-sm no-underline hover:opacity-90 transition-opacity"
                      >
                        {clientLang === "fr" ? "Payer la facture" : "Pay Invoice"}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 p-2 rounded bg-muted text-xs text-muted-foreground">
                <p>
                  {language === "fr"
                    ? `Date limite de réponse : ${formatDate(responseDueDate)}`
                    : `Response deadline: ${formatDate(responseDueDate)}`}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!responseDueDate || !recipient || !subject || !body || isSending}
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
