import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/hooks/useLanguage";
import { DollarSign } from "lucide-react";

interface ClientLateFeeOverrideProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  settings: {
    late_fee_enabled_override: boolean | null;
    late_fee_type_override: string | null;
    late_fee_rate_override: string;
    late_fee_amount_override: string;
    late_fee_grace_days_override: string;
    late_fee_auto_apply_mode_override: string | null;
    late_fee_cap_amount_override: string;
  };
  onSettingsChange: (settings: ClientLateFeeOverrideProps['settings']) => void;
}

export function ClientLateFeeOverride({ enabled, onEnabledChange, settings, onSettingsChange }: ClientLateFeeOverrideProps) {
  const { language } = useLanguage();

  const update = (field: string, value: any) => {
    onSettingsChange({ ...settings, [field]: value });
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <Label className="font-medium">
          {language === "fr" ? "Frais de retard" : "Late Fees"}
        </Label>
      </div>

      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label className="text-sm">
            {language === "fr" ? "Remplacer les paramètres de l'entreprise" : "Override company settings"}
          </Label>
          <p className="text-xs text-muted-foreground">
            {language === "fr"
              ? "Utiliser des paramètres spécifiques pour ce client"
              : "Use specific settings for this client"}
          </p>
        </div>
        <Switch checked={enabled} onCheckedChange={onEnabledChange} />
      </div>

      {enabled && (
        <div className="space-y-3 pt-2 border-t">
          <div className="flex items-center justify-between">
            <Label className="text-sm">
              {language === "fr" ? "Frais de retard activés" : "Late fees enabled"}
            </Label>
            <Switch
              checked={settings.late_fee_enabled_override ?? true}
              onCheckedChange={(checked) => update('late_fee_enabled_override', checked)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-sm">{language === "fr" ? "Type" : "Type"}</Label>
            <Select
              value={settings.late_fee_type_override || "inherit"}
              onValueChange={(v) => update('late_fee_type_override', v === 'inherit' ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">
                  {language === "fr" ? "Par défaut (entreprise)" : "Default (company)"}
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">{language === "fr" ? "Taux (%)" : "Rate (%)"}</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                placeholder={language === "fr" ? "Par défaut" : "Default"}
                value={settings.late_fee_rate_override}
                onChange={(e) => update('late_fee_rate_override', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{language === "fr" ? "Montant ($)" : "Amount ($)"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={language === "fr" ? "Par défaut" : "Default"}
                value={settings.late_fee_amount_override}
                onChange={(e) => update('late_fee_amount_override', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-sm">{language === "fr" ? "Jours de grâce" : "Grace days"}</Label>
              <Input
                type="number"
                min="0"
                placeholder={language === "fr" ? "Par défaut" : "Default"}
                value={settings.late_fee_grace_days_override}
                onChange={(e) => update('late_fee_grace_days_override', e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">{language === "fr" ? "Plafond ($)" : "Cap ($)"}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={language === "fr" ? "Aucun" : "None"}
                value={settings.late_fee_cap_amount_override}
                onChange={(e) => update('late_fee_cap_amount_override', e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm">{language === "fr" ? "Mode d'application" : "Apply mode"}</Label>
            <Select
              value={settings.late_fee_auto_apply_mode_override || "inherit"}
              onValueChange={(v) => update('late_fee_auto_apply_mode_override', v === 'inherit' ? null : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">
                  {language === "fr" ? "Par défaut (entreprise)" : "Default (company)"}
                </SelectItem>
                <SelectItem value="manual_only">
                  {language === "fr" ? "Manuel uniquement" : "Manual only"}
                </SelectItem>
                <SelectItem value="auto_once_when_eligible">
                  {language === "fr" ? "Automatique (une fois)" : "Auto (once)"}
                </SelectItem>
                <SelectItem value="auto_recurring_monthly">
                  {language === "fr" ? "Automatique récurrent" : "Auto recurring"}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
