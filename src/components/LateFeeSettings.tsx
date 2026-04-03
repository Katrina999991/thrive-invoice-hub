import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/hooks/useLanguage";
import { useCompanies } from "@/hooks/useCompanies";
import { AlertTriangle, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function LateFeeSettings() {
  const { language } = useLanguage();
  const { companies, updateCompany } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState({
    late_fee_enabled: false,
    late_fee_type: "none" as string,
    late_fee_rate: "",
    late_fee_amount: "",
    late_fee_grace_days: "5",
    late_fee_terms_text: "",
    late_fee_auto_apply_enabled: false,
    late_fee_auto_apply_mode: "manual_only" as string,
    late_fee_cap_amount: "",
  });

  useEffect(() => {
    if (companies.length > 0 && !selectedCompanyId) {
      setSelectedCompanyId(companies[0].id);
    }
  }, [companies]);

  useEffect(() => {
    if (selectedCompanyId && companies.length > 0) {
      const company = companies.find(c => c.id === selectedCompanyId) as any;
      if (company) {
        setSettings({
          late_fee_enabled: company.late_fee_enabled || false,
          late_fee_type: company.late_fee_type || "none",
          late_fee_rate: company.late_fee_rate?.toString() || "",
          late_fee_amount: company.late_fee_amount?.toString() || "",
          late_fee_grace_days: (company.late_fee_grace_days ?? 5).toString(),
          late_fee_terms_text: company.late_fee_terms_text || "",
          late_fee_auto_apply_enabled: company.late_fee_auto_apply_enabled || false,
          late_fee_auto_apply_mode: company.late_fee_auto_apply_mode || "manual_only",
          late_fee_cap_amount: company.late_fee_cap_amount?.toString() || "",
        });
      }
    }
  }, [selectedCompanyId, companies]);

  const handleSave = async () => {
    if (!selectedCompanyId) return;
    setIsSaving(true);
    try {
      await updateCompany(selectedCompanyId, {
        late_fee_enabled: settings.late_fee_enabled,
        late_fee_type: settings.late_fee_type,
        late_fee_rate: settings.late_fee_rate ? parseFloat(settings.late_fee_rate) : null,
        late_fee_amount: settings.late_fee_amount ? parseFloat(settings.late_fee_amount) : null,
        late_fee_grace_days: parseInt(settings.late_fee_grace_days) || 5,
        late_fee_terms_text: settings.late_fee_terms_text || null,
        late_fee_auto_apply_enabled: settings.late_fee_auto_apply_enabled,
        late_fee_auto_apply_mode: settings.late_fee_auto_apply_mode,
        late_fee_cap_amount: settings.late_fee_cap_amount ? parseFloat(settings.late_fee_cap_amount) : null,
      } as any);

      toast({
        title: language === "fr" ? "Succès" : "Success",
        description: language === "fr"
          ? "Paramètres de frais de retard enregistrés"
          : "Late fee settings saved",
      });
    } catch (error: any) {
      console.error("Error saving late fee settings:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {language === "fr" ? "Frais de retard" : "Late Fees"}
        </CardTitle>
        <CardDescription>
          {language === "fr"
            ? "Configurez les frais de retard appliqués aux factures en souffrance"
            : "Configure late fees applied to overdue invoices"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {companies.length > 1 && (
          <div className="space-y-2">
            <Label>{language === "fr" ? "Entreprise" : "Company"}</Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {companies.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{language === "fr" ? "Activer les frais de retard" : "Enable late fees"}</Label>
            <p className="text-sm text-muted-foreground">
              {language === "fr"
                ? "Permet d'appliquer des frais de retard aux factures en souffrance"
                : "Allow applying late fees to overdue invoices"}
            </p>
          </div>
          <Switch
            checked={settings.late_fee_enabled}
            onCheckedChange={(checked) =>
              setSettings({ ...settings, late_fee_enabled: checked })
            }
          />
        </div>

        {settings.late_fee_enabled && (
          <>
            <div className="space-y-2">
              <Label>{language === "fr" ? "Type de frais" : "Fee type"}</Label>
              <Select
                value={settings.late_fee_type}
                onValueChange={(value) =>
                  setSettings({ ...settings, late_fee_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    {language === "fr" ? "Aucun" : "None"}
                  </SelectItem>
                  <SelectItem value="monthly_percentage">
                    {language === "fr" ? "Pourcentage mensuel" : "Monthly percentage"}
                  </SelectItem>
                  <SelectItem value="fixed_once">
                    {language === "fr" ? "Montant fixe (une fois)" : "Fixed amount (once)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {settings.late_fee_type === "monthly_percentage" && (
              <div className="space-y-2">
                <Label>{language === "fr" ? "Taux mensuel (%)" : "Monthly rate (%)"}</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="1.5"
                  value={settings.late_fee_rate}
                  onChange={(e) => setSettings({ ...settings, late_fee_rate: e.target.value })}
                />
              </div>
            )}

            {settings.late_fee_type === "fixed_once" && (
              <div className="space-y-2">
                <Label>{language === "fr" ? "Montant fixe ($)" : "Fixed amount ($)"}</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="25.00"
                  value={settings.late_fee_amount}
                  onChange={(e) => setSettings({ ...settings, late_fee_amount: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>{language === "fr" ? "Jours de grâce" : "Grace days"}</Label>
              <Input
                type="number"
                min="0"
                placeholder="5"
                value={settings.late_fee_grace_days}
                onChange={(e) => setSettings({ ...settings, late_fee_grace_days: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {language === "fr"
                  ? "Nombre de jours après l'échéance avant que les frais ne soient applicables"
                  : "Number of days after due date before late fees become applicable"}
              </p>
            </div>

            {/* Cap Amount */}
            <div className="space-y-2">
              <Label>{language === "fr" ? "Plafond des frais ($)" : "Maximum fee cap ($)"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={language === "fr" ? "Aucune limite" : "No limit"}
                value={settings.late_fee_cap_amount}
                onChange={(e) => setSettings({ ...settings, late_fee_cap_amount: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {language === "fr"
                  ? "Montant maximum total des frais de retard par facture. Laissez vide pour aucune limite."
                  : "Maximum total late fee amount per invoice. Leave empty for no limit."}
              </p>
            </div>

            {/* Auto-apply */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{language === "fr" ? "Application automatique" : "Auto-apply"}</Label>
                  <p className="text-sm text-muted-foreground">
                    {language === "fr"
                      ? "Appliquer automatiquement les frais de retard aux factures éligibles"
                      : "Automatically apply late fees to eligible invoices"}
                  </p>
                </div>
                <Switch
                  checked={settings.late_fee_auto_apply_enabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, late_fee_auto_apply_enabled: checked })
                  }
                />
              </div>

              {settings.late_fee_auto_apply_enabled && (
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Mode d'application" : "Apply mode"}</Label>
                  <Select
                    value={settings.late_fee_auto_apply_mode}
                    onValueChange={(value) =>
                      setSettings({ ...settings, late_fee_auto_apply_mode: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual_only">
                        {language === "fr" ? "Manuel uniquement" : "Manual only"}
                      </SelectItem>
                      <SelectItem value="auto_once_when_eligible">
                        {language === "fr" ? "Automatique (une seule fois)" : "Auto (once when eligible)"}
                      </SelectItem>
                      {settings.late_fee_type === "monthly_percentage" && (
                        <SelectItem value="auto_recurring_monthly">
                          {language === "fr" ? "Automatique récurrent (mensuel)" : "Auto recurring (monthly)"}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Terms text */}
            <div className="space-y-2">
              <Label>
                {language === "fr" ? "Note sur les frais de retard (facultatif)" : "Late fee terms note (optional)"}
              </Label>
              <Textarea
                placeholder={
                  language === "fr"
                    ? "Des frais de retard de 1.5% par mois peuvent s'appliquer..."
                    : "Late fees of 1.5% per month may apply..."
                }
                value={settings.late_fee_terms_text}
                onChange={(e) => setSettings({ ...settings, late_fee_terms_text: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {language === "fr"
                  ? "Ce texte apparaîtra sur les factures et les PDF. Si vide, un texte par défaut sera généré."
                  : "This text will appear on invoices and PDFs. If empty, default text will be generated."}
              </p>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-300">
                  {settings.late_fee_auto_apply_enabled
                    ? (language === "fr"
                      ? "Les frais de retard seront appliqués automatiquement aux factures éligibles lors de leur consultation."
                      : "Late fees will be automatically applied to eligible invoices when they are viewed.")
                    : (language === "fr"
                      ? "Les frais de retard ne sont jamais appliqués automatiquement. Vous devrez les appliquer manuellement depuis la page des factures."
                      : "Late fees are never applied automatically. You will need to apply them manually from the invoices page.")}
                </p>
              </div>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving
            ? (language === "fr" ? "Enregistrement..." : "Saving...")
            : (language === "fr" ? "Enregistrer" : "Save")}
        </Button>
      </CardContent>
    </Card>
  );
}
