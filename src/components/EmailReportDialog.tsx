import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2, UserPlus, X, Users, ChevronDown } from "lucide-react";
import { logAuditEvent } from "@/lib/auditLogger";
import { useReportRecipients, type ReportRecipient } from "@/hooks/useReportRecipients";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";

interface EmailReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: string;
  reportTitle: string;
  pdfBlob: Blob | null;
  onGeneratePdf: () => Promise<Blob | null>;
  defaultSubject?: string;
  defaultMessage?: string;
  companyName?: string;
  companyEmail?: string;
  companyId?: string;
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
  companyName,
  companyEmail,
  companyId,
}: EmailReportDialogProps) => {
  const { language } = useLanguage();
  const { user, username } = useAuth();
  const [recipient, setRecipient] = useState(user?.email || "");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientPickerOpen, setRecipientPickerOpen] = useState(false);

  // Saved recipients
  const { recipients: savedRecipients, addRecipient: addSavedRecipient, deleteRecipient: deleteSavedRecipient, loading: recipientsLoading } = useReportRecipients(companyId || null);

  // Save new recipient inline
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("");
  const [addingRecipient, setAddingRecipient] = useState(false);

  useEffect(() => {
    if (open) {
      setSubject(defaultSubject || reportTitle);
      setMessage("");
      setShowAddForm(false);
    }
  }, [open, reportTitle, defaultSubject]);

  const handleSelectRecipient = (r: ReportRecipient) => {
    setRecipient(r.email);
    setRecipientPickerOpen(false);
  };

  const handleAddRecipient = async () => {
    if (!newName.trim() || !newEmail.trim()) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      toast.error(language === 'fr' ? "Adresse courriel invalide" : "Invalid email address");
      return;
    }
    setAddingRecipient(true);
    try {
      const saved = await addSavedRecipient(newName.trim(), newEmail.trim(), newRole.trim() || undefined);
      if (saved) {
        setRecipient(saved.email);
        toast.success(language === 'fr' ? "Destinataire enregistré" : "Recipient saved");
      }
      setNewName("");
      setNewEmail("");
      setNewRole("");
      setShowAddForm(false);
    } catch {
      toast.error(language === 'fr' ? "Erreur lors de l'enregistrement" : "Error saving recipient");
    } finally {
      setAddingRecipient(false);
    }
  };

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
      let pdf = pdfBlob;
      if (!pdf) pdf = await onGeneratePdf();
      if (!pdf) {
        toast.error(language === 'fr' ? "Erreur lors de la génération du PDF" : "Error generating PDF");
        setSending(false);
        return;
      }

      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64 = reader.result as string;
          resolve(base64.split(",")[1]);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(pdf);
      const pdfBase64 = await base64Promise;

      const replyToEmail = companyEmail || user?.email;
      if (!replyToEmail) {
        toast.error(language === 'fr' ? "Impossible d'envoyer le courriel : aucune adresse courriel valide trouvée." : "Cannot send email: no valid email address found.");
        setSending(false);
        return;
      }

      const { error } = await supabase.functions.invoke("send-report-email", {
        body: {
          recipientEmail: recipient,
          reportTitle: subject,
          reportType,
          message: message || undefined,
          pdfBase64,
          language,
          senderEmail: user?.email,
          senderName: username || user?.email?.split('@')[0] || undefined,
          companyName: companyName || undefined,
          companyEmail: companyEmail || undefined,
        },
      });

      if (error) throw error;

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

      toast.success(language === 'fr' ? `Rapport envoyé à ${recipient}` : `Report sent to ${recipient}`);
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending report email:", error);
      toast.error(language === 'fr' ? "Erreur lors de l'envoi du courriel" : "Error sending email");
    } finally {
      setSending(false);
    }
  };

  const selectedSavedRecipient = useMemo(() => {
    return savedRecipients.find(r => r.email === recipient);
  }, [savedRecipients, recipient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {language === 'fr' ? 'Envoyer par courriel' : 'Send by Email'}
          </DialogTitle>
          <DialogDescription>
            {language === 'fr'
              ? 'Envoyez le rapport en PDF à un destinataire.'
              : 'Send the report as PDF to a recipient.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Saved recipients picker */}
          {companyId && (
            <div className="grid gap-2">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {language === 'fr' ? 'Destinataires enregistrés' : 'Saved Recipients'}
              </Label>
              <div className="flex gap-2">
                <Popover open={recipientPickerOpen} onOpenChange={setRecipientPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="flex-1 justify-between font-normal"
                    >
                      {selectedSavedRecipient
                        ? `${selectedSavedRecipient.name}${selectedSavedRecipient.role_note ? ` — ${selectedSavedRecipient.role_note}` : ''}`
                        : (language === 'fr' ? 'Choisir un destinataire…' : 'Choose a recipient…')}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[340px] p-0" align="start">
                    <Command>
                      <CommandInput placeholder={language === 'fr' ? 'Rechercher…' : 'Search…'} />
                      <CommandList>
                        <CommandEmpty>
                          {language === 'fr' ? 'Aucun destinataire trouvé.' : 'No recipients found.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {savedRecipients.map((r) => (
                            <CommandItem
                              key={r.id}
                              onSelect={() => handleSelectRecipient(r)}
                              className="flex items-center justify-between"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium truncate">
                                  {r.name}
                                  {r.role_note && (
                                    <span className="ml-1.5 text-muted-foreground font-normal">— {r.role_note}</span>
                                  )}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">{r.email}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 ml-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSavedRecipient(r.id);
                                  if (recipient === r.email) setRecipient("");
                                }}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAddForm(!showAddForm)}
                  title={language === 'fr' ? 'Ajouter un destinataire' : 'Add recipient'}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>

              {/* Inline add form */}
              {showAddForm && (
                <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={language === 'fr' ? 'Nom' : 'Name'}
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <Input
                      type="email"
                      placeholder={language === 'fr' ? 'Courriel' : 'Email'}
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={language === 'fr' ? 'Rôle / note (optionnel)' : 'Role / note (optional)'}
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      className="flex-1"
                    />
                    <Button size="sm" onClick={handleAddRecipient} disabled={addingRecipient}>
                      {addingRecipient ? <Loader2 className="h-4 w-4 animate-spin" /> : (language === 'fr' ? 'Ajouter' : 'Add')}
                    </Button>
                  </div>
                </div>
              )}

              <Separator />
            </div>
          )}

          {/* Manual recipient email */}
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
              placeholder={language === 'fr' ? 'Ajoutez un message personnalisé...' : 'Add a custom message...'}
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
