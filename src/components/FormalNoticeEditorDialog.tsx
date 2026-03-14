import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Download, Printer, Send, Eye, FileText, Mail, History } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useFormalNotices, type FormalNotice, type FormalNoticeInput } from "@/hooks/useFormalNotices";
import { generateFormalNoticePdf, type FormalNoticePdfData } from "@/lib/formalNoticePdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FormalNoticeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    invoice_number: string;
    total: number;
    due_date: string | null;
    payment_link: string | null;
    status: string;
    invoice_items?: Array<{
      description: string;
    }>;
    clients?: {
      name: string;
      email: string | null;
      contact_person: string | null;
      address?: string | null;
    };
  };
  company?: {
    name: string;
    address?: string | null;
    street_address?: string | null;
    city?: string | null;
    province_state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    email?: string | null;
  };
}

export const FormalNoticeEditorDialog = ({ open, onOpenChange, invoice, company }: FormalNoticeEditorDialogProps) => {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { notices, latestNotice, createNotice, updateNotice, markAsSent, refetch } = useFormalNotices(invoice.id);

  const [activeTab, setActiveTab] = useState("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [editingNotice, setEditingNotice] = useState<FormalNotice | null>(null);

  // Email sub-dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");

  const companyAddress = [
    company?.street_address,
    [company?.city, company?.province_state, company?.postal_code].filter(Boolean).join(", "),
    company?.country
  ].filter(Boolean).join("\n");

  const clientName = invoice.clients?.contact_person || invoice.clients?.name || '';
  const clientAddress = invoice.clients?.address || '';

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === 'fr' ? 'fr-CA' : 'en-CA');
  };

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 10);

  const defaultBody = language === 'fr'
    ? `Madame, Monsieur,

Malgré nos rappels précédents, le solde de la facture {{invoice_number}}, d'un montant de {{amount_due}}, demeure impayé.

Cette facture était échue depuis le {{invoice_due_date}}.

 Par la présente, nous vous mettons en demeure de procéder au paiement complet du montant dû au plus tard le {{formal_notice_due_date}}.

À défaut de recevoir le paiement ou une réponse de votre part dans ce délai, nous nous réservons le droit d'entreprendre les démarches appropriées.${invoice.payment_link ? `

Vous pouvez effectuer le paiement en ligne à l'adresse suivante :
{{invoice_payment_link}}` : ''}

Veuillez agréer nos salutations distinguées.

{{company_name}}
{{company_address}}`
    : `Dear Sir/Madam,

Despite our previous reminders, the balance of invoice {{invoice_number}}, in the amount of {{amount_due}}, remains unpaid.

This invoice was due on {{invoice_due_date}}.

We hereby formally demand that you proceed with the full payment of the amount owed no later than {{formal_notice_due_date}}.

If we do not receive payment or a response from you within this period, we reserve the right to take appropriate action.${invoice.payment_link ? `

You can make your payment online at the following address:
{{invoice_payment_link}}` : ''}

Sincerely,

{{company_name}}
{{company_address}}`;

  // Form state
  const [title, setTitle] = useState(language === 'fr' ? 'Mise en demeure' : 'Formal Notice');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState(clientName);
  const [recipientAddr, setRecipientAddr] = useState(clientAddress);
  const [subject, setSubject] = useState(
    language === 'fr'
      ? `Mise en demeure concernant la facture ${invoice.invoice_number}`
      : `Formal notice regarding invoice ${invoice.invoice_number}`
  );
  const [body, setBody] = useState(defaultBody);
  const [dueAt, setDueAt] = useState(defaultDueDate.toISOString().split('T')[0]);

  // Load existing notice data if editing
  useEffect(() => {
    if (open && latestNotice && latestNotice.status !== 'sent') {
      setEditingNotice(latestNotice);
      setRecipient(latestNotice.recipient || clientName);
      setRecipientAddr(latestNotice.recipient_address || clientAddress);
      setSubject(latestNotice.subject || subject);
      setBody(latestNotice.body || defaultBody);
      setDueAt(latestNotice.due_at || defaultDueDate.toISOString().split('T')[0]);
    } else if (open) {
      setEditingNotice(null);
    }
  }, [open, latestNotice]);

  const replaceVariables = (text: string): string => {
    return text
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{client_address\}\}/g, clientAddress)
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{amount_due\}\}/g, `$${invoice.total.toFixed(2)}`)
      .replace(/\{\{invoice_due_date\}\}/g, invoice.due_date ? formatDate(invoice.due_date) : 'N/A')
      .replace(/\{\{formal_notice_due_date\}\}/g, formatDate(dueAt))
      .replace(/\{\{today_date\}\}/g, formatDate(date))
      .replace(/\{\{company_name\}\}/g, company?.name || '')
      .replace(/\{\{company_address\}\}/g, companyAddress)
      .replace(/\{\{invoice_payment_link\}\}/g, invoice.payment_link || '');
  };

  const previewBody = useMemo(() => replaceVariables(body), [body, dueAt, date]);
  const previewSubject = useMemo(() => replaceVariables(subject), [subject, dueAt, date]);

  const getPdfData = (): FormalNoticePdfData => ({
    title,
    date: formatDate(date),
    recipientName: recipient,
    recipientAddress: recipientAddr,
    senderName: company?.name || '',
    senderAddress: companyAddress,
    subject: previewSubject,
    body: previewBody,
    dueDate: formatDate(dueAt),
  });

  const handleSave = async (status: string = 'draft') => {
    setIsSaving(true);
    try {
      const data: FormalNoticeInput = {
        recipient,
        recipient_address: recipientAddr,
        subject: body, // store raw template
        body,
        due_at: dueAt,
        status,
      };

      // Actually store the subject field properly
      data.subject = subject;

      if (editingNotice) {
        await updateNotice(editingNotice.id, data, invoice.invoice_number);
      } else {
        const notice = await createNotice(invoice.id, data, invoice.invoice_number);
        if (notice) setEditingNotice(notice);
      }

      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: language === 'fr'
          ? (status === 'draft' ? "Brouillon enregistré" : "Mise en demeure enregistrée")
          : (status === 'draft' ? "Draft saved" : "Formal notice saved"),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => {
    generateFormalNoticePdf(getPdfData(), 'download');
  };

  const handlePrint = () => {
    generateFormalNoticePdf(getPdfData(), 'print');
  };

  const handleSendEmail = () => {
    setEmailRecipient(invoice.clients?.email || '');
    setEmailSubject(previewSubject);
    setEmailMessage(language === 'fr'
      ? `Veuillez trouver ci-joint la mise en demeure concernant la facture ${invoice.invoice_number}.`
      : `Please find attached the formal notice regarding invoice ${invoice.invoice_number}.`
    );
    setShowEmailDialog(true);
  };

  const sendEmail = async () => {
    if (!emailRecipient) return;
    setIsSending(true);
    try {
      // First save the notice if not saved yet
      if (!editingNotice) {
        await handleSave('generated');
      }

      // Generate PDF blob
      const pdfBlob = generateFormalNoticePdf(getPdfData(), 'blob') as Blob;
      
      // Convert blob to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.readAsDataURL(pdfBlob);
      });
      const base64Pdf = await base64Promise;

      // Send via edge function
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          emailType: 'overdue',
          customRecipient: emailRecipient,
          customSubject: emailSubject,
          customBody: emailMessage,
          isFormalNotice: true,
          formalNoticePdfBase64: base64Pdf,
        }
      });

      if (error) throw error;

      // Mark as sent
      if (editingNotice) {
        await markAsSent(editingNotice.id, emailRecipient, invoice.invoice_number);
      }

      toast({
        title: language === 'fr' ? "Succès" : "Success",
        description: language === 'fr'
          ? `Mise en demeure envoyée à ${emailRecipient}`
          : `Formal notice sent to ${emailRecipient}`,
      });

      setShowEmailDialog(false);
      await refetch();
    } catch (error) {
      console.error("Error sending formal notice email:", error);
      toast({
        title: language === 'fr' ? "Erreur" : "Error",
        description: language === 'fr' ? "Impossible d'envoyer l'email" : "Failed to send email",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: "bg-muted text-muted-foreground",
      generated: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    };
    const labels: Record<string, string> = {
      draft: language === 'fr' ? 'Brouillon' : 'Draft',
      generated: language === 'fr' ? 'Générée' : 'Generated',
      sent: language === 'fr' ? 'Envoyée' : 'Sent',
    };
    return <Badge className={colors[status] || ""}>{labels[status] || status}</Badge>;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" />
              {language === 'fr' ? 'Mise en demeure' : 'Formal Notice'} — {invoice.invoice_number}
              {editingNotice && <span className="ml-2">{statusBadge(editingNotice.status)}</span>}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor">
                <FileText className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Éditeur' : 'Editor'}
              </TabsTrigger>
              <TabsTrigger value="preview">
                <Eye className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Aperçu' : 'Preview'}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-1" />
                {language === 'fr' ? 'Historique' : 'History'}
              </TabsTrigger>
            </TabsList>

            {/* Editor Tab */}
            <TabsContent value="editor" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Titre du document' : 'Document title'}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Date' : 'Date'}</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Destinataire' : 'Recipient'}</Label>
                  <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'fr' ? 'Adresse du destinataire' : 'Recipient address'}</Label>
                  <Textarea value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} rows={2} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Objet' : 'Subject'}</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Corps du texte' : 'Body text'}</Label>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={12}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {language === 'fr' ? 'Variables disponibles' : 'Available variables'}:{' '}
                  <code className="text-xs">{'{{client_name}}'}</code>,{' '}
                  <code className="text-xs">{'{{invoice_number}}'}</code>,{' '}
                  <code className="text-xs">{'{{amount_due}}'}</code>,{' '}
                  <code className="text-xs">{'{{invoice_due_date}}'}</code>,{' '}
                  <code className="text-xs">{'{{formal_notice_due_date}}'}</code>,{' '}
                  <code className="text-xs">{'{{company_name}}'}</code>,{' '}
                  <code className="text-xs">{'{{company_address}}'}</code>,{' '}
                  <code className="text-xs">{'{{invoice_payment_link}}'}</code>
                </p>
              </div>

              <div className="space-y-2">
                <Label>{language === 'fr' ? 'Date limite de paiement / réponse' : 'Payment / response deadline'}</Label>
                <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Enregistrer brouillon' : 'Save draft'}
                </Button>
                <Button variant="outline" onClick={() => handleSave('generated')} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Sauvegarder version finale' : 'Save final version'}
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Imprimer' : 'Print'}
                </Button>
                <Button onClick={handleSendEmail} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Mail className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Envoyer par email' : 'Send by email'}
                </Button>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="mt-4">
              <Card className="border-destructive/20">
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{company?.name}</p>
                      <p className="whitespace-pre-line">{companyAddress}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium">{recipient}</p>
                    <p className="whitespace-pre-line text-muted-foreground">{recipientAddr}</p>
                  </div>

                  <div className="text-center">
                    <h2 className="text-xl font-bold text-destructive">{title}</h2>
                    <Separator className="mt-2 bg-destructive/30" />
                  </div>

                  <p className="font-semibold text-sm">Objet : {previewSubject}</p>

                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {previewBody}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="h-4 w-4 mr-2" />
                  {language === 'fr' ? 'Imprimer' : 'Print'}
                </Button>
              </div>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="mt-4">
              {notices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {language === 'fr' ? 'Aucune mise en demeure pour cette facture.' : 'No formal notices for this invoice.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <Card key={notice.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          {statusBadge(notice.status)}
                          <span className="text-xs text-muted-foreground">
                            {formatDate(notice.created_at)}
                          </span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">{language === 'fr' ? 'Destinataire' : 'Recipient'}:</span> {notice.recipient}</p>
                          <p><span className="text-muted-foreground">{language === 'fr' ? 'Objet' : 'Subject'}:</span> {notice.subject}</p>
                          {notice.due_at && (
                            <p><span className="text-muted-foreground">{language === 'fr' ? 'Date limite' : 'Deadline'}:</span> {formatDate(notice.due_at)}</p>
                          )}
                          {notice.sent_at && (
                            <p><span className="text-muted-foreground">{language === 'fr' ? 'Envoyée le' : 'Sent on'}:</span> {formatDate(notice.sent_at)}</p>
                          )}
                          {notice.sent_to && (
                            <p><span className="text-muted-foreground">{language === 'fr' ? 'Envoyée à' : 'Sent to'}:</span> {notice.sent_to}</p>
                          )}
                        </div>
                        {notice.status !== 'sent' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              setEditingNotice(notice);
                              setRecipient(notice.recipient || clientName);
                              setRecipientAddr(notice.recipient_address || clientAddress);
                              setSubject(notice.subject || '');
                              setBody(notice.body || '');
                              setDueAt(notice.due_at || defaultDueDate.toISOString().split('T')[0]);
                              setActiveTab("editor");
                            }}
                          >
                            {language === 'fr' ? 'Modifier' : 'Edit'}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Email Sub-Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {language === 'fr' ? 'Envoyer la mise en demeure' : 'Send formal notice'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Destinataire' : 'Recipient'}</Label>
              <Input
                type="email"
                value={emailRecipient}
                onChange={(e) => setEmailRecipient(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'fr' ? 'Objet' : 'Subject'}</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'fr' ? "Message d'accompagnement" : 'Accompanying message'}</Label>
              <Textarea
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
                {language === 'fr' ? 'Annuler' : 'Cancel'}
              </Button>
              <Button onClick={sendEmail} disabled={isSending || !emailRecipient}>
                {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                {language === 'fr' ? 'Envoyer' : 'Send'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
