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
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Loader2, Save, Download, Send, Eye, FileText, Mail, History,
  AlertTriangle, Shield, ShieldAlert, ShieldCheck, Info,
} from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useFormalNotices, type FormalNotice, type FormalNoticeInput } from "@/hooks/useFormalNotices";
import { generateFormalNoticePdf, type FormalNoticePdfData } from "@/lib/formalNoticePdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  detectNoticeLanguage,
  normalizeCountry,
  normalizeRegion,
  getJurisdictionRules,
  getDefaultDeliveryMethod,
  calculateRiskLevel,
  deliveryMethods,
  legalDisclaimer,
  riskLabels,
  type DeliveryMethod,
  type ProofStatus,
  type NoticeLang,
  parseAddressForJurisdiction,
} from "@/lib/formalNoticeConfig";

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
    invoice_items?: Array<{ description: string }>;
    clients?: {
      name: string;
      email: string | null;
      contact_person: string | null;
      contact_title?: string | null;
      address?: string | null;
      language?: string | null;
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
  const { language } = useLanguage();
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

  // ─── Jurisdiction & Language Detection ───────────────────────────────
  const clientAddress = invoice.clients?.address || '';
  const parsedAddr = useMemo(() => parseAddressForJurisdiction(clientAddress), [clientAddress]);

  const clientCountry = parsedAddr.country || company?.country || null;
  const clientRegion = parsedAddr.region || company?.province_state || null;

  const noticeLang: NoticeLang = useMemo(
    () => detectNoticeLanguage(invoice.clients?.language, clientCountry, clientRegion),
    [invoice.clients?.language, clientCountry, clientRegion],
  );

  const jKey = normalizeCountry(clientCountry);
  const rKey = normalizeRegion(clientRegion);
  const rules = useMemo(() => getJurisdictionRules(clientCountry, clientRegion), [clientCountry, clientRegion]);

  // ─── Delivery & Proof State ──────────────────────────────────────────
  const [sendingMethod, setSendingMethod] = useState<DeliveryMethod>(() => getDefaultDeliveryMethod(clientCountry, clientRegion));
  const [proofSending, setProofSending] = useState(false);
  const [proofReceipt, setProofReceipt] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");

  const proofStatus: ProofStatus = proofReceipt ? 'received' : proofSending ? 'sent' : 'none';
  const riskLevel = useMemo(() => calculateRiskLevel(sendingMethod, proofStatus), [sendingMethod, proofStatus]);

  // ─── Company / Client ────────────────────────────────────────────────
  const companyAddress = [
    company?.street_address,
    [company?.city, company?.province_state, company?.postal_code].filter(Boolean).join(", "),
    company?.country,
  ].filter(Boolean).join("\n");

  const contactPerson = invoice.clients?.contact_person;
  const contactTitle = invoice.clients?.contact_title;
  const clientName = contactTitle && contactPerson ? `${contactTitle} ${contactPerson}` : (contactPerson || invoice.clients?.name || '');

  const clientSalutation = useMemo(() => {
    if (contactPerson && contactPerson.trim()) {
      const formatted = contactTitle ? `${contactTitle} ${contactPerson.trim()}` : contactPerson.trim();
      return formatted + ',';
    }
    return noticeLang === 'fr' ? 'Madame, Monsieur,' : 'Dear Sir/Madam,';
  }, [contactPerson, contactTitle, noticeLang]);

  const invoiceDescription = useMemo(() => {
    const items = invoice.invoice_items || [];
    if (items.length === 0) return '';
    const firstDesc = items[0].description || '';
    const truncated = firstDesc.length > 80 ? firstDesc.slice(0, 77) + '...' : firstDesc;
    if (items.length === 1) return truncated;
    const suffix = noticeLang === 'fr' ? ' et autres articles' : ' and other items';
    const maxLen = 80 - suffix.length;
    const base = firstDesc.length > maxLen ? firstDesc.slice(0, maxLen - 3) + '...' : firstDesc;
    return base + suffix;
  }, [invoice.invoice_items, noticeLang]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(noticeLang === 'fr' ? 'fr-CA' : 'en-CA');

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + 10);

  const defaultBody = noticeLang === 'fr'
    ? `{{client_salutation}}

Malgré nos rappels précédents, le solde de la facture no. {{invoice_number}}, concernant {{invoice_description}}, d'un montant de {{amount_due}}, demeure impayé à ce jour.

Cette facture était exigible depuis le {{invoice_due_date}}.

Par la présente, nous vous mettons formellement en demeure de procéder au paiement complet de cette somme au plus tard le {{formal_notice_due_date}}.

À défaut de recevoir le paiement ou une réponse de votre part dans ce délai, nous nous verrons dans l'obligation d'entreprendre les procédures nécessaires afin de recouvrer cette somme, sans autre avis.${invoice.payment_link ? `

Vous pouvez également effectuer le paiement en ligne à l'adresse suivante :
{{invoice_payment_link}}` : ''}

Veuillez agréer, Madame, Monsieur, nos salutations distinguées.




{{company_name}}`
    : `{{client_salutation}}

Despite our previous reminders, the balance of invoice {{invoice_number}}, regarding {{invoice_description}}, in the amount of {{amount_due}}, remains unpaid.

This invoice was due on {{invoice_due_date}}.

We hereby formally demand that you proceed with the full payment of the amount owed no later than {{formal_notice_due_date}}.

If we do not receive payment or a response from you within this period, we reserve the right to take appropriate action.${invoice.payment_link ? `

You can make your payment online at the following address:
{{invoice_payment_link}}` : ''}

Sincerely,




{{company_name}}`;

  // ─── Form State ──────────────────────────────────────────────────────
  const [title, setTitle] = useState(noticeLang === 'fr' ? 'Mise en demeure' : 'Formal Notice');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState(clientName);
  const [recipientAddr, setRecipientAddr] = useState(clientAddress);
  const [subject, setSubject] = useState(
    noticeLang === 'fr'
      ? `Mise en demeure concernant la facture ${invoice.invoice_number}`
      : `Formal notice regarding invoice ${invoice.invoice_number}`,
  );
  const [body, setBody] = useState(defaultBody);
  const [dueAt, setDueAt] = useState(defaultDueDate.toISOString().split('T')[0]);

  // ─── Load Existing Notice ────────────────────────────────────────────
  useEffect(() => {
    if (open && latestNotice && latestNotice.status !== 'sent') {
      setEditingNotice(latestNotice);
      setRecipient(latestNotice.recipient || clientName);
      setRecipientAddr(latestNotice.recipient_address || clientAddress);
      setSubject(latestNotice.subject || subject);
      setBody(latestNotice.body || defaultBody);
      setDueAt(latestNotice.due_at || defaultDueDate.toISOString().split('T')[0]);
      if (latestNotice.sending_method) setSendingMethod(latestNotice.sending_method as DeliveryMethod);
      if (latestNotice.proof_status === 'sent') setProofSending(true);
      if (latestNotice.proof_status === 'received') { setProofSending(true); setProofReceipt(true); }
      if (latestNotice.tracking_number) setTrackingNumber(latestNotice.tracking_number);
      if (latestNotice.delivered_date) setDeliveredDate(latestNotice.delivered_date);
    } else if (open) {
      setEditingNotice(null);
    }
  }, [open, latestNotice]);

  // ─── Variable Replacement ────────────────────────────────────────────
  const replaceVariables = (text: string): string =>
    text
      .replace(/\{\{client_salutation\}\}/g, clientSalutation)
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{client_address\}\}/g, clientAddress)
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{invoice_description\}\}/g, invoiceDescription)
      .replace(/\{\{amount_due\}\}/g, `$${invoice.total.toFixed(2)}`)
      .replace(/\{\{invoice_due_date\}\}/g, invoice.due_date ? formatDate(invoice.due_date) : 'N/A')
      .replace(/\{\{formal_notice_due_date\}\}/g, formatDate(dueAt))
      .replace(/\{\{today_date\}\}/g, formatDate(date))
      .replace(/\{\{company_name\}\}/g, company?.name || '')
      .replace(/\{\{company_address\}\}/g, companyAddress)
      .replace(/\{\{invoice_payment_link\}\}/g, invoice.payment_link || '');

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

  // ─── Actions ─────────────────────────────────────────────────────────
  const buildSaveData = (status: string): FormalNoticeInput => ({
    recipient,
    recipient_address: recipientAddr,
    subject,
    body,
    due_at: dueAt,
    status,
    sending_method: sendingMethod,
    proof_status: proofStatus,
    tracking_number: trackingNumber || undefined,
    delivered_date: deliveredDate || null,
    client_language: noticeLang,
    country: jKey,
    region: rKey !== 'default' ? rKey : undefined,
    risk_level: riskLevel,
  });

  const handleSave = async (status: string = 'draft') => {
    setIsSaving(true);
    try {
      const data = buildSaveData(status);
      if (editingNotice) {
        await updateNotice(editingNotice.id, data, invoice.invoice_number);
      } else {
        const notice = await createNotice(invoice.id, data, invoice.invoice_number);
        if (notice) setEditingNotice(notice);
      }
      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr'
          ? (status === 'draft' ? 'Brouillon enregistré' : 'Mise en demeure enregistrée')
          : (status === 'draft' ? 'Draft saved' : 'Formal notice saved'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = () => generateFormalNoticePdf(getPdfData(), 'download');

  const handleSendEmail = () => {
    setEmailRecipient(invoice.clients?.email || '');
    setEmailSubject(previewSubject);
    setEmailMessage(
      noticeLang === 'fr'
        ? `Veuillez trouver ci-joint la mise en demeure concernant la facture ${invoice.invoice_number}.`
        : `Please find attached the formal notice regarding invoice ${invoice.invoice_number}.`,
    );
    setShowEmailDialog(true);
  };

  const sendEmail = async () => {
    if (!emailRecipient) return;
    setIsSending(true);
    try {
      if (!editingNotice) await handleSave('generated');
      const pdfBlob = generateFormalNoticePdf(getPdfData(), 'blob') as Blob;
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });
      const base64Pdf = await base64Promise;
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          emailType: 'overdue',
          customRecipient: emailRecipient,
          customSubject: emailSubject,
          customBody: emailMessage,
          isFormalNotice: true,
          formalNoticePdfBase64: base64Pdf,
        },
      });
      if (error) throw error;
      if (editingNotice) await markAsSent(editingNotice.id, emailRecipient, invoice.invoice_number);
      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr'
          ? `Mise en demeure envoyée à ${emailRecipient}`
          : `Formal notice sent to ${emailRecipient}`,
      });
      setShowEmailDialog(false);
      await refetch();
    } catch (error) {
      console.error('Error sending formal notice email:', error);
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr' ? "Impossible d'envoyer l'email" : 'Failed to send email',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────
  const t = (fr: string, en: string) => (language === 'fr' ? fr : en);
  const nt = (fr: string, en: string) => (noticeLang === 'fr' ? fr : en);

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-muted text-muted-foreground',
      generated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      sent: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    };
    const labels: Record<string, string> = {
      draft: t('Brouillon', 'Draft'),
      generated: t('Générée', 'Generated'),
      sent: t('Envoyée', 'Sent'),
    };
    return <Badge className={colors[status] || ''}>{labels[status] || status}</Badge>;
  };

  const RiskBadge = () => {
    const icon = riskLevel === 'low' ? <ShieldCheck className="h-4 w-4" /> : riskLevel === 'medium' ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />;
    const color = riskLevel === 'low' ? 'text-green-600 dark:text-green-400' : riskLevel === 'medium' ? 'text-yellow-600 dark:text-yellow-400' : 'text-destructive';
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${color}`}>
        {icon} {riskLabels[riskLevel][noticeLang]}
      </span>
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-destructive" />
              {t('Mise en demeure', 'Formal Notice')} — {invoice.invoice_number}
              {editingNotice && <span className="ml-2">{statusBadge(editingNotice.status)}</span>}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="editor"><FileText className="h-4 w-4 mr-1" />{t('Éditeur', 'Editor')}</TabsTrigger>
              <TabsTrigger value="preview"><Eye className="h-4 w-4 mr-1" />{t('Aperçu', 'Preview')}</TabsTrigger>
              <TabsTrigger value="history"><History className="h-4 w-4 mr-1" />{t('Historique', 'History')}</TabsTrigger>
            </TabsList>

            {/* ══════════ Editor Tab ══════════ */}
            <TabsContent value="editor" className="space-y-4 mt-4">
              {/* Jurisdiction & Risk Banner */}
              <Card className="border-muted">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {t('Juridiction', 'Jurisdiction')}: <strong>{jKey}{rKey !== 'default' ? ` / ${rKey}` : ''}</strong>
                        {' · '}
                        {t('Langue du document', 'Document language')}: <strong>{noticeLang === 'fr' ? t('Français', 'French') : t('Anglais', 'English')}</strong>
                      </span>
                    </div>
                    <RiskBadge />
                  </div>
                  <p className="text-sm text-muted-foreground">{rules.recommendation[noticeLang]}</p>
                  <p className="text-xs text-muted-foreground italic">{legalDisclaimer[noticeLang]}</p>
                </CardContent>
              </Card>

              {/* Document Title & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Titre du document', 'Document title')}</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* Recipient */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Destinataire', 'Recipient')}</Label>
                  <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>{t('Adresse du destinataire', 'Recipient address')}</Label>
                  <Textarea value={recipientAddr} onChange={(e) => setRecipientAddr(e.target.value)} rows={2} />
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label>{t('Objet', 'Subject')}</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <Label>{t('Corps du texte', 'Body text')}</Label>
                <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="font-mono text-sm" />
                <p className="text-xs text-muted-foreground">
                  {t('Variables disponibles', 'Available variables')}:{' '}
                  {['client_salutation', 'client_name', 'invoice_number', 'invoice_description', 'amount_due', 'invoice_due_date', 'formal_notice_due_date', 'company_name', 'company_address', 'invoice_payment_link'].map((v) => (
                    <span key={v}><code className="text-xs">{`{{${v}}}`}</code>{' '}</span>
                  ))}
                </p>
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label>{t('Date limite de paiement / réponse', 'Payment / response deadline')}</Label>
                <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>

              <Separator />

              {/* ── Delivery Method & Proof Tracking ── */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold">{t('Mode d\'envoi et preuve', 'Delivery Method & Proof')}</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('Mode d\'envoi', 'Delivery method')}</Label>
                    <Select value={sendingMethod} onValueChange={(v) => setSendingMethod(v as DeliveryMethod)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {deliveryMethods.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label[noticeLang]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Numéro de suivi', 'Tracking number')}</Label>
                    <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder={t('Optionnel', 'Optional')} />
                  </div>
                </div>

                {/* Email warning */}
                {sendingMethod === 'email' && (
                  <div className="flex items-start gap-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{rules.emailWarning[noticeLang]}</p>
                  </div>
                )}

                {/* Proof checkboxes */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Checkbox id="proof-sending" checked={proofSending} onCheckedChange={(v) => setProofSending(!!v)} />
                    <Label htmlFor="proof-sending" className="cursor-pointer">
                      {nt('Preuve d\'envoi', 'Proof of sending')}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox id="proof-receipt" checked={proofReceipt} onCheckedChange={(v) => setProofReceipt(!!v)} />
                    <Label htmlFor="proof-receipt" className="cursor-pointer">
                      {nt('Preuve de réception', 'Proof of receipt')}
                    </Label>
                  </div>
                </div>

                {proofReceipt && (
                  <div className="space-y-2">
                    <Label>{t('Date de livraison', 'Delivery date')}</Label>
                    <Input type="date" value={deliveredDate} onChange={(e) => setDeliveredDate(e.target.value)} />
                  </div>
                )}

                {/* Supporting documents checklist */}
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-sm font-medium">{nt('Documents et informations vérifiés', 'Supporting documents checklist')}</p>
                  <div className="grid grid-cols-2 gap-y-1.5 text-sm text-muted-foreground">
                    <span>✓ {nt('Facture jointe / référencée', 'Invoice attached / referenced')}</span>
                    <span>✓ {nt('Montant clairement indiqué', 'Amount clearly stated')}</span>
                    <span>✓ {nt('Date limite incluse', 'Deadline included')}</span>
                    <span>{invoice.payment_link ? '✓' : '—'} {nt('Mode de paiement inclus', 'Payment method included')}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" onClick={() => handleSave('draft')} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {t('Enregistrer brouillon', 'Save draft')}
                </Button>
                <Button variant="outline" onClick={() => handleSave('generated')} disabled={isSaving}>
                  {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Save className="h-4 w-4 mr-2" />
                  {t('Sauvegarder version finale', 'Save final version')}
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
                <Button onClick={handleSendEmail} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Mail className="h-4 w-4 mr-2" />
                  {t('Envoyer par email', 'Send by email')}
                </Button>
              </div>
            </TabsContent>

            {/* ══════════ Preview Tab ══════════ */}
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
                  <p className="font-semibold text-sm">
                    {noticeLang === 'fr' ? 'Objet' : 'Subject'} : {previewSubject}
                  </p>
                  <div className="whitespace-pre-line text-sm leading-relaxed">{previewBody}</div>
                </CardContent>
              </Card>

              {/* Delivery info summary */}
              <Card className="mt-3 border-muted">
                <CardContent className="p-4 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-muted-foreground">{t('Mode d\'envoi', 'Delivery')}:</span>
                  <strong>{deliveryMethods.find(m => m.value === sendingMethod)?.label[noticeLang]}</strong>
                  <span className="text-muted-foreground">·</span>
                  <RiskBadge />
                  {trackingNumber && (
                    <>
                      <span className="text-muted-foreground">·</span>
                      <span>{t('Suivi', 'Tracking')}: {trackingNumber}</span>
                    </>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-2 mt-4">
                <Button variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
              </div>
            </TabsContent>

            {/* ══════════ History Tab ══════════ */}
            <TabsContent value="history" className="mt-4">
              {notices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('Aucune mise en demeure pour cette facture.', 'No formal notices for this invoice.')}
                </p>
              ) : (
                <div className="space-y-3">
                  {notices.map((notice) => (
                    <Card key={notice.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          {statusBadge(notice.status)}
                          <span className="text-xs text-muted-foreground">{formatDate(notice.created_at)}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          <p><span className="text-muted-foreground">{t('Destinataire', 'Recipient')}:</span> {notice.recipient}</p>
                          <p><span className="text-muted-foreground">{t('Objet', 'Subject')}:</span> {notice.subject}</p>
                          {notice.due_at && <p><span className="text-muted-foreground">{t('Date limite', 'Deadline')}:</span> {formatDate(notice.due_at)}</p>}
                          {notice.sending_method && (
                            <p><span className="text-muted-foreground">{t('Mode d\'envoi', 'Delivery')}:</span> {deliveryMethods.find(m => m.value === notice.sending_method)?.label[language === 'fr' ? 'fr' : 'en'] || notice.sending_method}</p>
                          )}
                          {notice.tracking_number && <p><span className="text-muted-foreground">{t('Suivi', 'Tracking')}:</span> {notice.tracking_number}</p>}
                          {notice.sent_at && <p><span className="text-muted-foreground">{t('Envoyée le', 'Sent on')}:</span> {formatDate(notice.sent_at)}</p>}
                          {notice.sent_to && <p><span className="text-muted-foreground">{t('Envoyée à', 'Sent to')}:</span> {notice.sent_to}</p>}
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
                              if (notice.sending_method) setSendingMethod(notice.sending_method as DeliveryMethod);
                              if (notice.tracking_number) setTrackingNumber(notice.tracking_number);
                              setActiveTab('editor');
                            }}
                          >
                            {t('Modifier', 'Edit')}
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

      {/* ══════════ Email Sub-Dialog ══════════ */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              {t('Envoyer la mise en demeure', 'Send formal notice')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Email warning reminder */}
            {sendingMethod === 'email' && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800 dark:text-yellow-300">{rules.emailWarning[noticeLang]}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{t('Destinataire', 'Recipient')}</Label>
              <Input type="email" value={emailRecipient} onChange={(e) => setEmailRecipient(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('Objet', 'Subject')}</Label>
              <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("Message d'accompagnement", 'Accompanying message')}</Label>
              <Textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={4} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEmailDialog(false)}>{t('Annuler', 'Cancel')}</Button>
              <Button onClick={sendEmail} disabled={isSending || !emailRecipient}>
                {isSending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                {t('Envoyer', 'Send')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
