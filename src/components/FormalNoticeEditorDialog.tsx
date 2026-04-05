import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
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
  AlertTriangle, Shield, ShieldAlert, ShieldCheck, ShieldPlus, Info, CheckCircle2, PenLine,
} from "lucide-react";
import { useFormalNoticeAttachments } from "@/hooks/useFormalNoticeAttachments";
import { ProofFileSection } from "@/components/ProofFileSection";
import { useLanguage } from "@/hooks/useLanguage";
import { useFormalNotices, type FormalNotice, type FormalNoticeInput } from "@/hooks/useFormalNotices";
import { generateFormalNoticePdf, type FormalNoticePdfData, type SignatureData } from "@/lib/formalNoticePdf";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/SignaturePad";
import { useUserSignature } from "@/hooks/useUserSignature";
import { useAuth } from "@/hooks/useAuth";
import {
  detectNoticeLanguage,
  normalizeCountry,
  normalizeRegion,
  getJurisdictionRules,
  getDefaultDeliveryMethod,
  deriveDeliveryStatus,
  calculateDocumentationRisk,
  deliveryMethods,
  legalDisclaimer,
  documentationRiskLabels,
  deliveryStatusLabels,
  deliveryStatusColors,
  type DeliveryMethod,
  type DeliveryStatus,
  type DocumentationRisk,
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
    late_fee_applied_total?: number;
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
  const { user, username } = useAuth();
  const { toast } = useToast();
  const { notices, latestNotice, createNotice, updateNotice, markAsSent, refetch } = useFormalNotices(invoice.id);
  const { signature: userSignature, hasSignature } = useUserSignature();
  const [activeTab, setActiveTab] = useState("editor");
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [editingNotice, setEditingNotice] = useState<FormalNotice | null>(null);
  const noticeAttachments = useFormalNoticeAttachments(editingNotice?.id);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signatureApplied, setSignatureApplied] = useState(false);
  const signaturePadRef = useRef<HTMLDivElement>(null);

  // Auto-apply signature when user has one and dialog opens
  useEffect(() => {
    if (open && hasSignature && userSignature) {
      setSignatureApplied(true);
    }
  }, [open, hasSignature, userSignature]);

  // Auto-fill feedback messages
  const [autoMessages, setAutoMessages] = useState<string[]>([]);
  const autoMessageTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addAutoMessage = (msg: string) => {
    setAutoMessages(prev => [...prev, msg]);
    if (autoMessageTimeoutRef.current) clearTimeout(autoMessageTimeoutRef.current);
    autoMessageTimeoutRef.current = setTimeout(() => setAutoMessages([]), 6000);
  };

  // Email sub-dialog
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailTone, setEmailTone] = useState<'standard' | 'firm' | 'soft'>('standard');

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

  // ─── Payment Deadline Delay ──────────────────────────────────────────
  const [delayDays, setDelayDays] = useState<number>(10);

  const delayOptions = [
    { value: 5, labelFr: '5 jours (Urgent)', labelEn: '5 days (Urgent)' },
    { value: 10, labelFr: '10 jours (Standard)', labelEn: '10 days (Standard)' },
    { value: 15, labelFr: '15 jours (Souple)', labelEn: '15 days (Flexible)' },
  ];

  // Smart suggestion based on overdue status
  const overdueSuggestion = useMemo(() => {
    if (!invoice.due_date) return null;
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue > 60) return { days: 5, reason: language === 'fr' ? 'Facture très en retard — délai urgent suggéré.' : 'Invoice very overdue — urgent deadline suggested.' };
    if (daysOverdue > 30) return { days: 10, reason: language === 'fr' ? 'Délai standard recommandé.' : 'Standard timeframe recommended.' };
    if (daysOverdue <= 30 && daysOverdue > 0) return { days: 15, reason: language === 'fr' ? 'Retard modéré — délai souple suggéré.' : 'Moderate delay — flexible timeframe suggested.' };
    return null;
  }, [invoice.due_date, language]);

  // ─── Delivery & Proof State ──────────────────────────────────────────
  const [sendingMethod, setSendingMethod] = useState<DeliveryMethod>(() => getDefaultDeliveryMethod(clientCountry, clientRegion));
  const [proofSending, setProofSending] = useState(false);
  const [proofReceipt, setProofReceipt] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [deliveredDate, setDeliveredDate] = useState("");
  const [sentDate, setSentDate] = useState("");
  const [trackingNotes, setTrackingNotes] = useState("");

  // Derived status & risk
  const effectiveProofSending = proofSending || noticeAttachments.hasProofFiles;
  const effectiveProofReceipt = proofReceipt || noticeAttachments.hasReceiptFiles;

  const deliveryStatus: DeliveryStatus = useMemo(() => deriveDeliveryStatus({
    proofOfReceipt: effectiveProofReceipt,
    deliveredDate,
    proofOfSending: effectiveProofSending,
    trackingNumber,
    sentAt: editingNotice?.sent_at || null,
    sentDate,
  }), [effectiveProofReceipt, deliveredDate, effectiveProofSending, trackingNumber, editingNotice?.sent_at, sentDate]);

  const docRisk: DocumentationRisk = useMemo(
    () => calculateDocumentationRisk(
      sendingMethod,
      effectiveProofSending,
      effectiveProofReceipt,
      trackingNumber,
    ),
    [sendingMethod, effectiveProofSending, effectiveProofReceipt, trackingNumber],
  );

  // ─── Smart Field Interactions ────────────────────────────────────────
  const prevTrackingRef = useRef(trackingNumber);

  // Auto-check proof of sending when tracking number is entered
  useEffect(() => {
    const wasEmpty = !prevTrackingRef.current;
    const isNowFilled = !!trackingNumber.trim();
    prevTrackingRef.current = trackingNumber;

    if (wasEmpty && isNowFilled && !proofSending) {
      setProofSending(true);
      addAutoMessage(
        language === 'fr'
          ? 'Numéro de suivi détecté. La preuve d\'envoi a été cochée automatiquement.'
          : 'Tracking number detected. Proof of sending was marked automatically.',
      );
    }
  }, [trackingNumber]);

  // Auto-fill sent date when proof of sending is checked
  const handleProofSendingChange = (checked: boolean) => {
    setProofSending(checked);
    if (checked && !sentDate) {
      const today = getLocalDateIso();
      setSentDate(today);
      addAutoMessage(
        language === 'fr'
          ? "Date d'envoi remplie automatiquement."
          : 'Sending date filled automatically.',
      );
    }
  };

  // Auto-fill delivered date + suggest proof of sending when proof of receipt is checked
  const handleProofReceiptChange = (checked: boolean) => {
    setProofReceipt(checked);
    if (checked) {
      if (!deliveredDate) {
        const today = getLocalDateIso();
        setDeliveredDate(today);
        addAutoMessage(
          language === 'fr'
            ? 'Date de livraison remplie automatiquement.'
            : 'Delivery date filled automatically.',
        );
      }
      if (!proofSending) {
        setProofSending(true);
        if (!sentDate) {
          setSentDate(getLocalDateIso());
        }
        addAutoMessage(
          language === 'fr'
            ? "Preuve d'envoi cochée automatiquement."
            : 'Proof of sending was checked automatically.',
        );
      }
    }
  };

  // Auto-suggest proof of receipt when delivered date is entered
  const handleDeliveredDateChange = (val: string) => {
    setDeliveredDate(val);
    if (val && !proofReceipt) {
      addAutoMessage(
        language === 'fr'
          ? 'Date de livraison saisie. Pensez à cocher la preuve de réception si vous en disposez.'
          : 'Delivery date entered. Consider checking proof of receipt if you have one.',
      );
    }
  };

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

  const parseLocalDateString = (value: string): Date => {
    const isoDateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

    if (isoDateOnlyPattern.test(value)) {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(year, month - 1, day);
    }

    return new Date(value);
  };

  const getLocalDateIso = (sourceDate = new Date()) => {
    const year = sourceDate.getFullYear();
    const month = String(sourceDate.getMonth() + 1).padStart(2, '0');
    const day = String(sourceDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateValue: string | Date) => {
    const formatter = new Intl.DateTimeFormat(noticeLang === 'fr' ? 'fr-CA' : 'en-CA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return formatter.format(typeof dateValue === 'string' ? parseLocalDateString(dateValue) : dateValue);
  };

  const getDocumentDateIso = () => getLocalDateIso();
  const getDocumentDateDisplay = () => formatDate(getDocumentDateIso());

  const defaultDueDate = new Date();
  defaultDueDate.setDate(defaultDueDate.getDate() + delayDays);

  const defaultBody = noticeLang === 'fr'
    ? `{{client_salutation}},

Malgré nos rappels précédents, le solde de la facture no. {{invoice_number}}, concernant {{invoice_description}}, d'un montant de {{amount_due}}, demeure impayé à ce jour.

Cette facture était exigible depuis le {{invoice_due_date}}.

Par la présente, nous vous mettons formellement en demeure de procéder au paiement complet de cette somme au plus tard le {{formal_notice_due_date}}.

À défaut de recevoir votre paiement dans ce délai, nous nous verrons dans l'obligation d'entreprendre les recours nécessaires afin de recouvrer la somme due, sans autre avis, incluant notamment toute démarche appropriée auprès des instances compétentes, le tout à vos frais, incluant les intérêts et frais applicables.${invoice.payment_link ? `

Vous pouvez également effectuer le paiement en ligne à l'adresse suivante :
{{invoice_payment_link}}` : ''}

Veuillez agréer, Madame, Monsieur, nos salutations distinguées.




{{company_name}}`
    : `Dear {{client_salutation}},

Despite our previous reminders, the balance of invoice {{invoice_number}}, regarding {{invoice_description}}, in the amount of {{amount_due}}, remains unpaid.

This invoice was due on {{invoice_due_date}}.

We hereby formally demand that you proceed with the full payment of the amount owed no later than {{formal_notice_due_date}}.

If payment is not received within this timeframe, we will be required to take the necessary steps to recover the amount due, without further notice, including any appropriate actions before the competent authorities, at your expense, including applicable interest and fees.${invoice.payment_link ? `

You can make your payment online at the following address:
{{invoice_payment_link}}` : ''}

Sincerely,




{{company_name}}`;

  // ─── Form State ──────────────────────────────────────────────────────
  const [title, setTitle] = useState(noticeLang === 'fr' ? 'Mise en demeure' : 'Formal Notice');
  const [recipient, setRecipient] = useState(clientName);
  const [recipientAddr, setRecipientAddr] = useState(clientAddress);
  const [subject, setSubject] = useState(
    noticeLang === 'fr'
      ? `Mise en demeure concernant la facture ${invoice.invoice_number}`
      : `Formal notice regarding invoice ${invoice.invoice_number}`,
  );
  const [body, setBody] = useState(defaultBody);
  const [dueAt, setDueAt] = useState(getLocalDateIso(defaultDueDate));

  // ─── Unsaved Changes Detection ──────────────────────────────────────
  type FormSnapshot = {
    recipient: string; recipientAddr: string; subject: string; body: string;
    dueAt: string; delayDays: number; sendingMethod: DeliveryMethod;
    proofSending: boolean; proofReceipt: boolean; trackingNumber: string;
    deliveredDate: string; sentDate: string; trackingNotes: string; signatureApplied: boolean;
  };

  const getCurrentSnapshot = useCallback((): FormSnapshot => ({
    recipient, recipientAddr, subject, body, dueAt, delayDays, sendingMethod,
    proofSending, proofReceipt, trackingNumber, deliveredDate, sentDate, trackingNotes, signatureApplied,
  }), [recipient, recipientAddr, subject, body, dueAt, delayDays, sendingMethod,
    proofSending, proofReceipt, trackingNumber, deliveredDate, sentDate, trackingNotes, signatureApplied]);

  const [initialSnapshot, setInitialSnapshot] = useState<FormSnapshot | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshot) return false;
    const current = getCurrentSnapshot();
    return (Object.keys(initialSnapshot) as (keyof FormSnapshot)[]).some(
      key => current[key] !== initialSnapshot[key]
    );
  }, [initialSnapshot, getCurrentSnapshot]);

  // Capture snapshot after form is loaded
  const captureInitialSnapshot = useCallback(() => {
    // Use a microtask to ensure all state updates from loading have settled
    setTimeout(() => setInitialSnapshot(getCurrentSnapshot()), 0);
  }, [getCurrentSnapshot]);

  const attemptClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
    } else {
      onOpenChange(false);
    }
  }, [hasUnsavedChanges, onOpenChange]);

  const handleSaveAndClose = async () => {
    setShowUnsavedDialog(false);
    await handleSave(editingNotice?.status === 'sent' ? 'sent' : 'draft');
    // After successful save, snapshot is updated and we close
    onOpenChange(false);
  };

  const handleDiscardAndClose = () => {
    setShowUnsavedDialog(false);
    onOpenChange(false);
  };

  // ─── Load Existing Notice ────────────────────────────────────────────
  useEffect(() => {
    if (open && latestNotice) {
      setEditingNotice(latestNotice);
      if (latestNotice.status !== 'sent') {
        setRecipient(latestNotice.recipient || clientName);
        setRecipientAddr(latestNotice.recipient_address || clientAddress);
        setSubject(latestNotice.subject || subject);
        setBody(latestNotice.body || defaultBody);
        const savedDueAt = latestNotice.due_at || getLocalDateIso(defaultDueDate);
        setDueAt(savedDueAt);

        if (latestNotice.due_at && latestNotice.created_at) {
          const created = parseLocalDateString(latestNotice.created_at.split('T')[0]);
          const due = parseLocalDateString(latestNotice.due_at);
          const diffDays = Math.round((due.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
          if ([5, 10, 15].includes(diffDays)) {
            setDelayDays(diffDays);
          } else {
            const closest = [5, 10, 15].reduce((prev, curr) =>
              Math.abs(curr - diffDays) < Math.abs(prev - diffDays) ? curr : prev
            );
            setDelayDays(closest);
          }
        }
      }
      if (latestNotice.sending_method) setSendingMethod(latestNotice.sending_method as DeliveryMethod);
      setProofSending(latestNotice.proof_of_sending ?? (latestNotice.proof_status === 'sent' || latestNotice.proof_status === 'received'));
      setProofReceipt(latestNotice.proof_of_receipt ?? latestNotice.proof_status === 'received');
      setTrackingNumber(latestNotice.tracking_number || '');
      prevTrackingRef.current = latestNotice.tracking_number || '';
      setDeliveredDate(latestNotice.delivered_date || '');
      setSentDate(latestNotice.sent_at ? latestNotice.sent_at.split('T')[0] : '');
      setTrackingNotes(latestNotice.tracking_notes || '');
    } else if (open) {
      setEditingNotice(null);
    }
  }, [open, latestNotice]);

  // Capture initial snapshot after load settles
  useEffect(() => {
    if (open) {
      captureInitialSnapshot();
    } else {
      setInitialSnapshot(null);
    }
  }, [open, latestNotice]);

  const signerDisplayName = useMemo(() => {
    if (userSignature?.signer_name?.trim()) return userSignature.signer_name.trim();
    if (username?.trim()) return username.trim();
    if (user?.email) return user.email.split('@')[0];
    return company?.name || '';
  }, [company?.name, user?.email, userSignature?.signer_name, username]);

  const replaceVariables = (text: string, currentDate = getDocumentDateIso()): string =>
    text
      .replace(/\{\{client_salutation\}\}/g, clientSalutation)
      .replace(/\{\{client_name\}\}/g, clientName)
      .replace(/\{\{client_address\}\}/g, clientAddress)
      .replace(/\{\{invoice_number\}\}/g, invoice.invoice_number)
      .replace(/\{\{invoice_description\}\}/g, invoiceDescription)
      .replace(/\{\{amount_due\}\}/g, `$${(invoice.total + (invoice.late_fee_applied_total || 0)).toFixed(2)}`)
      .replace(/\{\{invoice_due_date\}\}/g, invoice.due_date ? formatDate(invoice.due_date) : 'N/A')
      .replace(/\{\{formal_notice_due_date\}\}/g, formatDate(dueAt))
      .replace(/\{\{today_date\}\}/g, formatDate(currentDate))
      .replace(/\{\{company_name\}\}/g, signerDisplayName)
      .replace(/\{\{company_address\}\}/g, companyAddress)
      .replace(/\{\{invoice_payment_link\}\}/g, invoice.payment_link || '');

  const previewDocumentDateIso = getDocumentDateIso();
  const previewDocumentDateDisplay = formatDate(previewDocumentDateIso);
  const previewBody = replaceVariables(body, previewDocumentDateIso);
  const previewSubject = replaceVariables(subject, previewDocumentDateIso);

  const buildSignatureData = (documentDateIso: string): SignatureData | null => {
    if (!signatureApplied || !hasSignature || !userSignature) return null;
    return {
      type: userSignature.signature_type,
      value: userSignature.signature_value,
      signerName: userSignature.signer_name || undefined,
      signerTitle: userSignature.signer_title || undefined,
      companyName: company?.name || undefined,
      signedDate: formatDate(documentDateIso),
      signedDateLabel: noticeLang === 'fr' ? 'Signé le' : 'Signed on',
      legalNote: noticeLang === 'fr'
        ? 'Cette signature est fournie à titre de représentation numérique.'
        : 'This signature is a digital representation.',
    };
  };

  const getPdfData = (withSignature = false): FormalNoticePdfData => {
    const documentDateIso = getDocumentDateIso();

    return {
      title,
      date: formatDate(documentDateIso),
      recipientName: recipient,
      recipientAddress: recipientAddr,
      senderName: signerDisplayName,
      senderAddress: companyAddress,
      subject: replaceVariables(subject, documentDateIso),
      body: replaceVariables(body, documentDateIso),
      dueDate: formatDate(dueAt),
      signature: withSignature ? buildSignatureData(documentDateIso) : undefined,
    };
  };

  // ─── Build save data ────────────────────────────────────────────────
  const proofStatus = effectiveProofReceipt ? 'received' : effectiveProofSending ? 'sent' : 'none';

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
    risk_level: docRisk,
    delivery_status: deliveryStatus,
    proof_of_sending: proofSending,
    proof_of_receipt: proofReceipt,
    tracking_notes: trackingNotes || undefined,
  });

  const buildTrackingData = (): FormalNoticeInput => ({
    sending_method: sendingMethod,
    proof_status: proofStatus,
    tracking_number: trackingNumber || undefined,
    delivered_date: deliveredDate || null,
    risk_level: docRisk,
    delivery_status: deliveryStatus,
    proof_of_sending: proofSending,
    proof_of_receipt: proofReceipt,
    tracking_notes: trackingNotes || undefined,
  });

  // ─── Actions ─────────────────────────────────────────────────────────
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
      // Update snapshot so changes are no longer "unsaved"
      setInitialSnapshot(getCurrentSnapshot());
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!editingNotice) return;
    setIsSavingTracking(true);
    try {
      await updateNotice(editingNotice.id, buildTrackingData(), invoice.invoice_number);
      toast({
        title: language === 'fr' ? 'Succès' : 'Success',
        description: language === 'fr'
          ? 'Informations de suivi enregistrées'
          : 'Tracking information saved',
      });
    } catch {
      toast({
        title: language === 'fr' ? 'Erreur' : 'Error',
        description: language === 'fr'
          ? "Impossible d'enregistrer les informations de suivi"
          : 'Unable to save tracking information',
        variant: 'destructive',
      });
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleDownloadPdf = () => generateFormalNoticePdf(getPdfData(signatureApplied && hasSignature), 'download');
  const handleDownloadSignedPdf = () => {
    if (!hasSignature || !signatureApplied) {
      setShowSignaturePad(true);
      return;
    }
    generateFormalNoticePdf(getPdfData(true), 'download');
  };

  const getEmailTemplate = (tone: 'standard' | 'firm' | 'soft') => {
    const deadlineDate = formatDate(dueAt);
    const senderName = signerDisplayName || company?.name || '';

    if (noticeLang === 'fr') {
      const templates = {
        standard: `Madame, Monsieur,

Veuillez trouver ci-joint une mise en demeure concernant la facture no ${invoice.invoice_number}, demeurée impayée à ce jour.

Nous vous demandons de procéder au paiement complet au plus tard le ${deadlineDate}.

À défaut de paiement dans ce délai, nous nous réservons le droit d'entreprendre les recours nécessaires.

Nous vous remercions de votre attention.

Cordialement,${senderName ? `\n${senderName}` : ''}`,

        firm: `Madame, Monsieur,

Veuillez trouver ci-joint une mise en demeure relativement à la facture no ${invoice.invoice_number}, toujours impayée à ce jour.

Nous vous mettons en demeure de procéder au paiement complet au plus tard le ${deadlineDate}.

À défaut de paiement dans ce délai, nous nous réservons le droit d'exercer les recours appropriés, sans autre avis.

Cordialement,${senderName ? `\n${senderName}` : ''}`,

        soft: `Bonjour,

Veuillez trouver ci-joint la mise en demeure relative à la facture no ${invoice.invoice_number}, qui demeure impayée.

Nous vous invitons à procéder au paiement au plus tard le ${deadlineDate}.

N'hésitez pas à nous contacter si vous souhaitez discuter de la situation.

Cordialement,${senderName ? `\n${senderName}` : ''}`,
      };
      return templates[tone];
    }

    const templates = {
      standard: `Dear Sir/Madam,

Please find attached a formal notice regarding invoice no. ${invoice.invoice_number}, which remains unpaid.

We kindly request that you proceed with full payment no later than ${deadlineDate}.

Should payment not be received within this timeframe, we reserve the right to take the necessary steps to recover the amount due.

Thank you for your attention.

Sincerely,${senderName ? `\n${senderName}` : ''}`,

      firm: `Dear Sir/Madam,

Please find attached a formal notice regarding invoice no. ${invoice.invoice_number}, which remains unpaid as of today.

We hereby demand full payment no later than ${deadlineDate}.

Failure to comply within this timeframe will result in further action without additional notice.

Sincerely,${senderName ? `\n${senderName}` : ''}`,

      soft: `Hello,

Please find attached a formal notice regarding invoice no. ${invoice.invoice_number}, which remains outstanding.

We kindly invite you to arrange payment by ${deadlineDate}.

Please feel free to contact us if you wish to discuss the matter.

Best regards,${senderName ? `\n${senderName}` : ''}`,
    };
    return templates[tone];
  };

  const handleSendEmail = () => {
    setEmailRecipient(invoice.clients?.email || '');
    setEmailSubject(
      noticeLang === 'fr'
        ? `Mise en demeure – Facture no ${invoice.invoice_number}`
        : `Formal Notice – Invoice no. ${invoice.invoice_number}`,
    );
    setEmailTone('standard');
    setEmailMessage(getEmailTemplate('standard'));
    setShowEmailDialog(true);
  };

  const handleToneChange = (tone: 'standard' | 'firm' | 'soft') => {
    setEmailTone(tone);
    setEmailMessage(getEmailTemplate(tone));
  };

  const sendEmail = async () => {
    if (!emailRecipient) return;
    setIsSending(true);
    try {
      // Ensure notice is saved first; capture the notice id
      let noticeId = editingNotice?.id;
      if (!noticeId) {
        const notice = await createNotice(invoice.id, buildSaveData('generated'), invoice.invoice_number);
        if (notice) {
          setEditingNotice(notice);
          noticeId = notice.id;
        }
      }

      const pdfBlob = generateFormalNoticePdf(getPdfData(signatureApplied && hasSignature), 'blob') as Blob;
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(pdfBlob);
      });
      const base64Pdf = await base64Promise;
      const { error } = await supabase.functions.invoke('send-invoice-email', {
        body: {
          invoiceId: invoice.id,
          emailType: 'new',
          customRecipient: emailRecipient,
          customSubject: emailSubject,
          customMessage: emailMessage,
          isFormalNotice: true,
          formalNoticePdfBase64: base64Pdf,
        },
      });
      if (error) throw error;

      // Mark as sent only after successful email delivery
      if (noticeId) {
        await markAsSent(noticeId, emailRecipient, invoice.invoice_number);
      }

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

  const DeliveryStatusBadge = ({ status }: { status: DeliveryStatus }) => {
    const label = deliveryStatusLabels[status]?.[language === 'fr' ? 'fr' : 'en'] || status;
    const color = deliveryStatusColors[status] || 'bg-muted text-muted-foreground';
    return <Badge className={color}>{label}</Badge>;
  };

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
    const icons: Record<DocumentationRisk, React.ReactNode> = {
      very_low: <ShieldPlus className="h-4 w-4" />,
      low: <ShieldCheck className="h-4 w-4" />,
      medium: <Shield className="h-4 w-4" />,
      high: <ShieldAlert className="h-4 w-4" />,
    };
    const colors: Record<DocumentationRisk, string> = {
      very_low: 'text-green-700 dark:text-green-300',
      low: 'text-green-600 dark:text-green-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      high: 'text-destructive',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${colors[docRisk]}`}>
        {icons[docRisk]} {documentationRiskLabels[docRisk][language === 'fr' ? 'fr' : 'en']}
      </span>
    );
  };

  // ─── Soft Warnings ──────────────────────────────────────────────────
  const warnings = useMemo(() => {
    const w: string[] = [];
    if (proofSending && !sentDate && !editingNotice?.sent_at) {
      w.push(t(
        "Preuve d'envoi cochée mais aucune date d'envoi saisie.",
        'Proof of sending checked but no sending date entered.',
      ));
    }
    if (proofReceipt && !deliveredDate) {
      w.push(t(
        'Preuve de réception cochée mais aucune date de livraison saisie.',
        'Proof of receipt checked but no delivery date entered.',
      ));
    }
    if (proofReceipt && !proofSending) {
      w.push(t(
        "Preuve de réception sans preuve d'envoi. Envisagez de cocher aussi la preuve d'envoi.",
        'Proof of receipt without proof of sending. Consider checking proof of sending too.',
      ));
    }
    if (sendingMethod === 'standard_mail' && proofSending && !trackingNumber) {
      w.push(t(
        "Courrier standard avec preuve d'envoi mais sans numéro de suivi ou référence.",
        'Standard mail with proof of sending but no tracking number or reference.',
      ));
    }
    if (deliveredDate && sentDate && deliveredDate < sentDate) {
      w.push(t(
        "La date de livraison est antérieure à la date d'envoi.",
        'Delivery date is earlier than sending date.',
      ));
    }
    return w;
  }, [proofSending, proofReceipt, sentDate, deliveredDate, trackingNumber, sendingMethod, editingNotice?.sent_at, language]);

  // ─── Load history notice into editor ────────────────────────────────
  const loadNoticeIntoEditor = (notice: FormalNotice, contentToo: boolean) => {
    setEditingNotice(notice);
    if (contentToo) {
      setRecipient(notice.recipient || clientName);
      setRecipientAddr(notice.recipient_address || clientAddress);
      setSubject(notice.subject || '');
      setBody(notice.body || '');
      setDueAt(notice.due_at || getLocalDateIso(defaultDueDate));
    }
    if (notice.sending_method) setSendingMethod(notice.sending_method as DeliveryMethod);
    setTrackingNumber(notice.tracking_number || '');
    prevTrackingRef.current = notice.tracking_number || '';
    setProofSending(notice.proof_of_sending ?? (notice.proof_status === 'sent' || notice.proof_status === 'received'));
    setProofReceipt(notice.proof_of_receipt ?? notice.proof_status === 'received');
    setDeliveredDate(notice.delivered_date || '');
    setSentDate(notice.sent_at ? notice.sent_at.split('T')[0] : '');
    setTrackingNotes(notice.tracking_notes || '');
    setActiveTab('editor');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) attemptClose(); }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <FileText className="h-5 w-5 text-destructive" />
              {t('Mise en demeure', 'Formal Notice')} — {invoice.invoice_number}
              {editingNotice && (
                <>
                  <span className="ml-2">{statusBadge(editingNotice.status)}</span>
                  <DeliveryStatusBadge status={deliveryStatus} />
                </>
              )}
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
                  <Input type="text" value={getDocumentDateDisplay()} readOnly />
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

              {/* Payment Deadline Selector */}
              <div className="space-y-3">
                <Label>{t('Délai de paiement', 'Payment deadline')}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {delayOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      variant={delayDays === opt.value ? 'default' : 'outline'}
                      size="sm"
                      className={delayDays === opt.value ? '' : ''}
                      onClick={() => {
                        setDelayDays(opt.value);
                        const newDate = new Date();
                        newDate.setDate(newDate.getDate() + opt.value);
                        setDueAt(getLocalDateIso(newDate));
                      }}
                    >
                      {language === 'fr' ? opt.labelFr : opt.labelEn}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {delayDays === 10
                    ? t('10 jours est le délai standard recommandé.', '10 days is the recommended standard timeframe.')
                    : delayDays === 5
                    ? t('Délai court pour situations urgentes.', 'Short deadline for urgent situations.')
                    : t('Délai étendu pour plus de flexibilité.', 'Extended deadline for more flexibility.')}
                </p>

                {/* Smart suggestion */}
                {overdueSuggestion && overdueSuggestion.days !== delayDays && (
                  <div className="flex items-start gap-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-2.5">
                    <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-blue-700 dark:text-blue-300">
                      <p>{overdueSuggestion.reason}</p>
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs text-blue-600 dark:text-blue-400"
                        onClick={() => {
                          setDelayDays(overdueSuggestion.days);
                          const newDate = new Date();
                          newDate.setDate(newDate.getDate() + overdueSuggestion.days);
                          setDueAt(getLocalDateIso(newDate));
                        }}
                      >
                        {t(`Utiliser ${overdueSuggestion.days} jours`, `Use ${overdueSuggestion.days} days`)}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Computed deadline date */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{t('Date limite calculée', 'Computed deadline date')}</Label>
                  <Input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                </div>
              </div>

              <Separator />

              {/* ── Delivery Method & Proof Tracking ── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{t('Mode d\'envoi et preuve', 'Delivery Method & Proof')}</h3>
                  <DeliveryStatusBadge status={deliveryStatus} />
                </div>

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

                {/* Dates row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Date d'envoi", 'Sending date')}</Label>
                    <Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Date de livraison', 'Delivery date')}</Label>
                    <Input type="date" value={deliveredDate} onChange={(e) => handleDeliveredDateChange(e.target.value)} />
                  </div>
                </div>

                {/* Email warning */}
                {sendingMethod === 'email' && (
                  <div className="flex items-start gap-2 rounded-md border border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 p-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">{rules.emailWarning[noticeLang]}</p>
                  </div>
                )}

                {/* Proof checkboxes with helper text */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox id="proof-sending" checked={proofSending} onCheckedChange={(v) => handleProofSendingChange(!!v)} />
                      <Label htmlFor="proof-sending" className="cursor-pointer">
                        {nt('Preuve d\'envoi', 'Proof of sending')}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t(
                        "Confirme que vous avez une preuve que la mise en demeure a été envoyée (ex. reçu postal, suivi, preuve de messagerie).",
                        "Confirms that you have evidence the formal notice was sent (e.g. postal receipt, tracking, courier proof).",
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Checkbox id="proof-receipt" checked={proofReceipt} onCheckedChange={(v) => handleProofReceiptChange(!!v)} />
                      <Label htmlFor="proof-receipt" className="cursor-pointer">
                        {nt('Preuve de réception', 'Proof of receipt')}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground ml-6">
                      {t(
                        "Confirme que vous avez une preuve que le destinataire a reçu la mise en demeure.",
                        "Confirms that you have evidence the recipient received the formal notice.",
                      )}
                    </p>
                  </div>
                </div>

                {/* Tracking notes */}
                <div className="space-y-2">
                  <Label>{t('Notes de suivi', 'Tracking notes')}</Label>
                  <Textarea
                    value={trackingNotes}
                    onChange={(e) => setTrackingNotes(e.target.value)}
                    rows={2}
                    placeholder={t('Notes optionnelles sur la livraison...', 'Optional delivery notes...')}
                    className="text-sm"
                  />
                </div>

                {/* Proof of sending files */}
                {editingNotice && (
                  <ProofFileSection
                    attachments={noticeAttachments.proofOfSendingFiles}
                    uploading={noticeAttachments.uploading}
                    hasProofFiles={noticeAttachments.hasProofFiles}
                    maxFiles={noticeAttachments.MAX_FILES}
                    onUpload={async (file) => {
                      const result = await noticeAttachments.uploadFile(file, 'proof_of_sending', language);
                      if (result && !proofSending) {
                        setProofSending(true);
                        if (!sentDate) setSentDate(getLocalDateIso());
                        addAutoMessage(
                          language === 'fr'
                            ? "Fichier de preuve détecté. La preuve d'envoi a été cochée automatiquement."
                            : 'Proof file detected. Proof of sending was marked automatically.',
                        );
                      }
                      return result;
                    }}
                    onDelete={async (att) => noticeAttachments.deleteAttachment(att, language)}
                    onDownload={(att) => noticeAttachments.downloadFile(att)}
                    onGetSignedUrl={(path) => noticeAttachments.getSignedUrl(path)}
                    lang={language === 'fr' ? 'fr' : 'en'}
                  />
                )}

                {/* Proof of receipt files */}
                {editingNotice && (
                  <ProofFileSection
                    attachments={noticeAttachments.proofOfReceiptFiles}
                    uploading={noticeAttachments.uploading}
                    hasProofFiles={noticeAttachments.hasReceiptFiles}
                    maxFiles={noticeAttachments.MAX_FILES}
                    sectionTitle={t('Fichiers de preuve de réception', 'Proof of receipt files')}
                    uploadLabel={t('Ajouter une preuve de réception', 'Upload receipt proof')}
                    helperText={t(
                      "Ajoutez un accusé de réception, une confirmation de livraison signée, un rapport d'huissier ou tout autre document confirmant la réception par le destinataire.",
                      'Upload a delivery confirmation, signed receipt, bailiff report, or any document confirming the recipient received the formal notice.',
                    )}
                    onUpload={async (file) => {
                      const result = await noticeAttachments.uploadFile(file, 'proof_of_receipt', language);
                      if (result && !proofReceipt) {
                        setProofReceipt(true);
                        if (!deliveredDate) {
                          setDeliveredDate(getLocalDateIso());
                          addAutoMessage(
                            language === 'fr'
                              ? 'Date de réception remplie automatiquement.'
                              : 'Delivery date filled automatically.',
                          );
                        }
                        if (!proofSending) {
                          setProofSending(true);
                          if (!sentDate) setSentDate(getLocalDateIso());
                        }
                        addAutoMessage(
                          language === 'fr'
                            ? 'Fichier de réception détecté. La preuve de réception a été cochée automatiquement.'
                            : 'Receipt proof detected. Proof of receipt was marked automatically.',
                        );
                      }
                      return result;
                    }}
                    onDelete={async (att) => noticeAttachments.deleteAttachment(att, language)}
                    onDownload={(att) => noticeAttachments.downloadFile(att)}
                    onGetSignedUrl={(path) => noticeAttachments.getSignedUrl(path)}
                    lang={language === 'fr' ? 'fr' : 'en'}
                  />
                )}

                {autoMessages.length > 0 && (
                  <div className="flex items-start gap-2 rounded-md border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-3">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                      {autoMessages.map((msg, i) => <p key={i}>{msg}</p>)}
                    </div>
                  </div>
                )}

                {/* Soft warnings */}
                {warnings.length > 0 && (
                  <div className="space-y-1">
                    {warnings.map((w, i) => (
                      <p key={i} className="text-xs text-yellow-600 dark:text-yellow-400 flex items-start gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {w}
                      </p>
                    ))}
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
                    <span>{effectiveProofSending ? '✓' : '—'} {nt("Preuve d'envoi", 'Proof of sending')}</span>
                    <span>{noticeAttachments.hasProofFiles ? '✓' : '—'} {nt("Fichiers preuve d'envoi", 'Sending proof files')}</span>
                    <span>{effectiveProofReceipt ? '✓' : '—'} {nt('Preuve de réception', 'Proof of receipt')}</span>
                    <span>{noticeAttachments.hasReceiptFiles ? '✓' : '—'} {nt('Fichiers preuve de réception', 'Receipt proof files')}</span>
                  </div>
                </div>

                {/* Save tracking button */}
                {editingNotice && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveTracking}
                    disabled={isSavingTracking}
                  >
                    {isSavingTracking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Save className="h-4 w-4 mr-2" />
                    {t('Enregistrer le suivi', 'Save tracking')}
                  </Button>
                )}
              </div>

              <Separator />

              {/* ── Signature Section ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <PenLine className="h-4 w-4" />
                    {t('Signature', 'Signature')}
                  </h3>
                  {signatureApplied && hasSignature && (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {t('Appliquée', 'Applied')}
                    </Badge>
                  )}
                </div>

                {!showSignaturePad && hasSignature && userSignature ? (
                  <Card className="border-muted">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          {userSignature.signature_type === 'typed' ? (
                            <p className="text-lg italic font-serif text-foreground">{userSignature.signature_value}</p>
                          ) : (
                            <img src={userSignature.signature_value} alt="Signature" className="max-h-12 object-contain" />
                          )}
                          {userSignature.signer_title && (
                            <div className="text-xs text-muted-foreground mt-1">
                              <p>{userSignature.signer_title}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant={signatureApplied ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSignatureApplied(!signatureApplied)}
                          >
                            {signatureApplied
                              ? t('Retirer', 'Remove')
                              : t('Appliquer', 'Apply')}
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => {
                            console.log('[FormalNotice] Modifier signature clicked');
                            setShowSignaturePad(true);
                            setTimeout(() => signaturePadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
                          }}>
                            {t('Modifier', 'Edit')}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : !showSignaturePad ? (
                  <Button variant="outline" size="sm" onClick={() => setShowSignaturePad(true)}>
                    <PenLine className="h-4 w-4 mr-2" />
                    {t('Créer une signature', 'Create a signature')}
                  </Button>
                ) : null}

                {showSignaturePad && (
                  <div className="space-y-2" ref={signaturePadRef}>
                    <SignaturePad
                      notifyOnLoad={false}
                      onSignatureReady={(val) => {
                        console.log('[FormalNotice] Signature ready:', !!val);
                        if (val) {
                          setSignatureApplied(true);
                          setShowSignaturePad(false);
                        }
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowSignaturePad(false)}>
                      {t('Annuler', 'Cancel')}
                    </Button>
                  </div>
                )}
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
                {hasSignature && signatureApplied && (
                  <Button variant="outline" onClick={handleDownloadSignedPdf}>
                    <PenLine className="h-4 w-4 mr-2" />
                    {t('Télécharger la mise en demeure signée', 'Download signed notice')}
                  </Button>
                )}
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
                    <p className="text-sm text-muted-foreground">{getDocumentDateDisplay()}</p>
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
                  <div className="whitespace-pre-line text-sm leading-relaxed">
                    {signatureApplied && hasSignature && userSignature
                      ? (() => {
                          const lines = previewBody.split('\n');
                          let lastNonEmpty = lines.length - 1;
                          while (lastNonEmpty >= 0 && lines[lastNonEmpty].trim() === '') lastNonEmpty--;
                          return lines.slice(0, lastNonEmpty).join('\n');
                        })()
                      : previewBody
                    }
                  </div>
                  {signatureApplied && hasSignature && userSignature && (
                    <div className="mt-4 space-y-1 border-t pt-4">
                      {userSignature.signature_type === 'typed' ? (
                        <p className="text-lg italic font-serif">{userSignature.signature_value}</p>
                      ) : (
                        <img src={userSignature.signature_value} alt="Signature" className="max-h-16 object-contain" />
                      )}
                      {userSignature.signer_title && <p className="text-xs text-muted-foreground">{userSignature.signer_title}</p>}
                      {company?.name && <p className="text-sm">{company.name}</p>}
                      <p className="text-xs text-muted-foreground italic">
                        {noticeLang === 'fr' ? `Signé le ${getDocumentDateDisplay()}` : `Signed on ${getDocumentDateDisplay()}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70 italic">
                        {noticeLang === 'fr'
                          ? 'Cette signature est fournie à titre de représentation numérique.'
                          : 'This signature is a digital representation.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Delivery info summary */}
              <Card className="mt-3 border-muted">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <DeliveryStatusBadge status={deliveryStatus} />
                    <span className="text-muted-foreground">·</span>
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
                  </div>
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    {proofSending && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {t("Preuve d'envoi", 'Proof of sending')}</span>}
                    {proofReceipt && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {t('Preuve de réception', 'Proof of receipt')}</span>}
                    {sentDate && <span>{t("Envoyé le", 'Sent on')}: {sentDate}</span>}
                    {deliveredDate && <span>{t('Livré le', 'Delivered on')}: {deliveredDate}</span>}
                  </div>
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
                  {notices.map((notice) => {
                    const nDeliveryStatus = deriveDeliveryStatus({
                      proofOfReceipt: notice.proof_of_receipt,
                      deliveredDate: notice.delivered_date || '',
                      proofOfSending: notice.proof_of_sending,
                      trackingNumber: notice.tracking_number || '',
                      sentAt: notice.sent_at,
                    });
                    return (
                      <Card key={notice.id} className="border">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              {statusBadge(notice.status)}
                              <DeliveryStatusBadge status={nDeliveryStatus} />
                            </div>
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
                            {notice.delivered_date && <p><span className="text-muted-foreground">{t('Livrée le', 'Delivered on')}:</span> {formatDate(notice.delivered_date)}</p>}
                            <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                              {notice.proof_of_sending && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {t("Preuve d'envoi", 'Proof of sending')}</span>}
                              {notice.proof_of_receipt && <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" /> {t('Preuve de réception', 'Proof of receipt')}</span>}
                            </div>
                            {notice.tracking_notes && (
                              <p className="text-xs text-muted-foreground italic mt-1">{notice.tracking_notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2 mt-2">
                            {notice.status !== 'sent' && (
                              <Button variant="outline" size="sm" onClick={() => loadNoticeIntoEditor(notice, true)}>
                                {t('Modifier', 'Edit')}
                              </Button>
                            )}
                            {notice.status === 'sent' && (
                              <Button variant="outline" size="sm" onClick={() => loadNoticeIntoEditor(notice, false)}>
                                {t('Modifier le suivi', 'Edit tracking')}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={attemptClose}>
              {t('Fermer', 'Close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══════════ Unsaved Changes Confirmation ══════════ */}
      <AlertDialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('Modifications non sauvegardées', 'Unsaved Changes')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                'Vous avez des modifications non sauvegardées. Voulez-vous enregistrer avant de fermer ?',
                'You have unsaved changes. Would you like to save before closing?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUnsavedDialog(false)}>
              {t('Annuler', 'Cancel')}
            </Button>
            <Button variant="ghost" onClick={handleDiscardAndClose}>
              {t('Fermer sans enregistrer', 'Close without saving')}
            </Button>
            <Button onClick={handleSaveAndClose} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              {t('Enregistrer et fermer', 'Save and close')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              <Label>{t('Ton du message', 'Message tone')}</Label>
              <Select value={emailTone} onValueChange={(v) => handleToneChange(v as 'standard' | 'firm' | 'soft')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">{t('Standard', 'Standard')}</SelectItem>
                  <SelectItem value="firm">{t('Ferme', 'Firm')}</SelectItem>
                  <SelectItem value="soft">{t('Souple', 'Soft')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("Message d'accompagnement", 'Accompanying message')}</Label>
              <Textarea value={emailMessage} onChange={(e) => setEmailMessage(e.target.value)} rows={10} />
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
