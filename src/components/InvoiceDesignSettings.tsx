import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Lock, Sparkles, Eye, Palette, Settings2 } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useSubscription } from "@/hooks/useSubscription";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

const COLOR_PRESETS = [
  { value: "blue", color: "bg-blue-600", label: { en: "Blue", fr: "Bleu" } },
  { value: "green", color: "bg-green-600", label: { en: "Green", fr: "Vert" } },
  { value: "purple", color: "bg-purple-600", label: { en: "Purple", fr: "Violet" } },
  { value: "orange", color: "bg-orange-600", label: { en: "Orange", fr: "Orange" } },
  { value: "yellow", color: "bg-yellow-600", label: { en: "Yellow", fr: "Jaune" } },
  { value: "gray", color: "bg-gray-600", label: { en: "Gray", fr: "Gris" } },
];

const TEMPLATES = [
  { 
    value: "classic", 
    label: { en: "Classic", fr: "Classique" },
    description: { en: "Clean and simple layout", fr: "Mise en page simple et épurée" },
    minPlan: "free" as const
  },
  { 
    value: "modern", 
    label: { en: "Modern", fr: "Moderne" },
    description: { en: "Contemporary design with rounded elements", fr: "Design contemporain avec éléments arrondis" },
    minPlan: "premium" as const
  },
  { 
    value: "professional", 
    label: { en: "Professional", fr: "Professionnel" },
    description: { en: "Elegant layout for business", fr: "Mise en page élégante pour les affaires" },
    minPlan: "pro" as const
  },
  { 
    value: "creative", 
    label: { en: "Creative", fr: "Créatif" },
    description: { en: "Bold and distinctive style", fr: "Style audacieux et distinctif" },
    minPlan: "pro" as const
  },
];

const LOGO_POSITIONS = [
  { value: "left", label: { en: "Left", fr: "Gauche" } },
  { value: "right", label: { en: "Right", fr: "Droite" } },
];

const LOGO_SIZES = [
  { value: "small", label: { en: "Small", fr: "Petit" } },
  { value: "medium", label: { en: "Medium", fr: "Moyen" } },
  { value: "large", label: { en: "Large", fr: "Grand" } },
];

export function InvoiceDesignSettings() {
  const { language } = useLanguage();
  const { planLimits } = useSubscription();
  const navigate = useNavigate();
  
  const [invoiceTemplate, setInvoiceTemplate] = useState<string>("classic");
  const [invoiceColor, setInvoiceColor] = useState<string>("blue");
  const [customColor, setCustomColor] = useState<string>("#2563eb");
  const [logoPosition, setLogoPosition] = useState<string>("right");
  const [logoSize, setLogoSize] = useState<string>("medium");
  const [hidePdfBranding, setHidePdfBranding] = useState<boolean>(false);
  
  // Invoice defaults
  const [invoiceFooterText, setInvoiceFooterText] = useState<string>("");
  const [defaultInvoiceTerms, setDefaultInvoiceTerms] = useState<string>("");
  
  // Quote defaults
  const [quoteFooterText, setQuoteFooterText] = useState<string>("");
  const [defaultQuoteTerms, setDefaultQuoteTerms] = useState<string>("");
  
  // Shared defaults
  const [defaultNotes, setDefaultNotes] = useState<string>("");

  useEffect(() => {
    const savedInvoiceTemplate = localStorage.getItem("invoice-template") || "classic";
    const savedInvoiceColor = localStorage.getItem("invoice-color") || "blue";
    const savedCustomColor = localStorage.getItem("invoice-custom-color") || "#2563eb";
    const savedLogoPosition = localStorage.getItem("invoice-logo-position") || "right";
    const savedLogoSize = localStorage.getItem("invoice-logo-size") || "medium";
    const savedHidePdfBranding = localStorage.getItem("hide-pdf-branding") === "true";
    const savedInvoiceFooterText = localStorage.getItem("invoice-footer-text") || "";
    const savedDefaultInvoiceTerms = localStorage.getItem("invoice-default-terms") || "";
    const savedQuoteFooterText = localStorage.getItem("quote-footer-text") || "";
    const savedDefaultQuoteTerms = localStorage.getItem("quote-default-terms") || "";
    const savedDefaultNotes = localStorage.getItem("invoice-default-notes") || "";
    
    setInvoiceTemplate(savedInvoiceTemplate);
    setInvoiceColor(savedInvoiceColor);
    setCustomColor(savedCustomColor);
    setLogoPosition(savedLogoPosition);
    setLogoSize(savedLogoSize);
    setHidePdfBranding(savedHidePdfBranding);
    setInvoiceFooterText(savedInvoiceFooterText);
    setDefaultInvoiceTerms(savedDefaultInvoiceTerms);
    setQuoteFooterText(savedQuoteFooterText);
    setDefaultQuoteTerms(savedDefaultQuoteTerms);
    setDefaultNotes(savedDefaultNotes);
  }, []);

  const handleInvoiceTemplateChange = (value: string) => {
    setInvoiceTemplate(value);
    localStorage.setItem("invoice-template", value);
  };

  const handleInvoiceColorChange = (value: string) => {
    setInvoiceColor(value);
    localStorage.setItem("invoice-color", value);
  };

  const handleCustomColorChange = (value: string) => {
    setCustomColor(value);
    localStorage.setItem("invoice-custom-color", value);
    setInvoiceColor("custom");
    localStorage.setItem("invoice-color", "custom");
  };

  const handleLogoPositionChange = (value: string) => {
    setLogoPosition(value);
    localStorage.setItem("invoice-logo-position", value);
  };

  const handleLogoSizeChange = (value: string) => {
    setLogoSize(value);
    localStorage.setItem("invoice-logo-size", value);
  };

  const handleHidePdfBrandingChange = (checked: boolean) => {
    if (planLimits?.plan_type !== 'pro') return;
    setHidePdfBranding(checked);
    localStorage.setItem("hide-pdf-branding", checked.toString());
  };

  const handleInvoiceFooterTextChange = (value: string) => {
    setInvoiceFooterText(value);
    localStorage.setItem("invoice-footer-text", value);
  };

  const handleDefaultInvoiceTermsChange = (value: string) => {
    setDefaultInvoiceTerms(value);
    localStorage.setItem("invoice-default-terms", value);
  };

  const handleQuoteFooterTextChange = (value: string) => {
    setQuoteFooterText(value);
    localStorage.setItem("quote-footer-text", value);
  };

  const handleDefaultQuoteTermsChange = (value: string) => {
    setDefaultQuoteTerms(value);
    localStorage.setItem("quote-default-terms", value);
  };

  const handleDefaultNotesChange = (value: string) => {
    setDefaultNotes(value);
    localStorage.setItem("invoice-default-notes", value);
  };

  const isPro = planLimits?.plan_type === 'pro';
  const isPremiumOrHigher = planLimits?.plan_type === 'premium' || planLimits?.plan_type === 'pro';

  const canUseTemplate = (minPlan: "free" | "premium" | "pro") => {
    if (minPlan === "free") return true;
    if (minPlan === "premium") return isPremiumOrHigher;
    if (minPlan === "pro") return isPro;
    return false;
  };

  const getPlanBadge = (minPlan: "free" | "premium" | "pro") => {
    if (minPlan === "free") return null;
    if (minPlan === "premium" && !isPremiumOrHigher) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Lock className="h-3 w-3" />
          Premium
        </Badge>
      );
    }
    if (minPlan === "pro" && !isPro) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 text-xs">
          <Lock className="h-3 w-3" />
          Pro
        </Badge>
      );
    }
    return null;
  };

  // Get active color for preview
  const getActiveColor = () => {
    if (invoiceColor === "custom" && isPro) {
      return customColor;
    }
    const preset = COLOR_PRESETS.find(c => c.value === invoiceColor);
    switch (preset?.value) {
      case "blue": return "#2563eb";
      case "green": return "#16a34a";
      case "purple": return "#9333ea";
      case "orange": return "#ea580c";
      case "yellow": return "#ca8a04";
      case "gray": return "#4b5563";
      default: return "#2563eb";
    }
  };

  const activeColor = getActiveColor();

  return (
    <div className="space-y-6">
      {/* Section 1: Invoice Template */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === "fr" ? "Modèle de facture" : "Invoice Template"}
          </CardTitle>
          <CardDescription>
            {language === "fr" 
              ? "Choisissez la mise en page utilisée pour vos factures et devis."
              : "Choose the invoice layout used for your invoices and quotes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEMPLATES.map((template) => {
              const isAvailable = canUseTemplate(template.minPlan);
              const badge = getPlanBadge(template.minPlan);
              const isSelected = invoiceTemplate === template.value;
              
              return (
                <div
                  key={template.value}
                  onClick={() => isAvailable && handleInvoiceTemplateChange(template.value)}
                  className={cn(
                    "relative flex flex-col p-4 rounded-lg border-2 transition-all",
                    isSelected && isAvailable
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50",
                    !isAvailable && "opacity-60 cursor-not-allowed",
                    isAvailable && "cursor-pointer"
                  )}
                >
                  {badge && (
                    <div className="absolute top-2 right-2">
                      {badge}
                    </div>
                  )}
                  
                  {/* Mini preview */}
                  <div className="mb-3 bg-background rounded border p-2 h-20 flex flex-col justify-between">
                    <TemplatePreviewMini template={template.value} color={activeColor} />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div 
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                        isSelected ? "border-primary" : "border-muted-foreground/50"
                      )}
                    >
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <span className="font-medium">
                      {template.label[language]}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 ml-6">
                    {template.description[language]}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Color Presets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {language === "fr" ? "Couleur de la facture" : "Invoice Color"}
          </CardTitle>
          <CardDescription>
            {language === "fr"
              ? "Sélectionnez une couleur d'accent pour vos documents."
              : "Select an accent color for your documents."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = invoiceColor === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => handleInvoiceColorChange(preset.value)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/50"
                  )}
                >
                  <div className={cn("w-5 h-5 rounded-full", preset.color)} />
                  <span className="text-sm font-medium">
                    {preset.label[language]}
                  </span>
                </button>
              );
            })}
            
            {/* Custom color for Pro */}
            {isPro && (
              <button
                onClick={() => handleInvoiceColorChange("custom")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all",
                  invoiceColor === "custom"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50"
                )}
              >
                <div 
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: customColor }}
                />
                <span className="text-sm font-medium">
                  {language === "fr" ? "Personnalisée" : "Custom"}
                </span>
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Advanced Customization (Pro only) */}
      <Card className={cn(!isPro && "opacity-75")}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              {language === "fr" ? "Personnalisation avancée" : "Advanced Customization"}
            </CardTitle>
            {!isPro && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Lock className="h-3 w-3" />
                Pro
              </Badge>
            )}
          </div>
          <CardDescription>
            {language === "fr"
              ? "Ces paramètres s'appliquent uniquement aux factures et devis PDF. Ils définissent l'image de marque et le contenu par défaut pour les nouveaux documents."
              : "These settings apply to PDF invoices and quotes only. They define default branding and content for new documents."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!isPro ? (
            <div className="text-center py-6 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {language === "fr" 
                  ? "Passez au plan Pro pour débloquer la personnalisation complète des documents."
                  : "Upgrade to Pro to unlock full document customization."}
              </p>
              <Button variant="outline" className="mt-4" size="sm" onClick={() => navigate("/dashboard/pricing")}>
                {language === "fr" ? "Voir les plans" : "View Plans"}
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* SECTION 1: Branding (Shared) */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-base font-semibold">{language === "fr" ? "Image de marque" : "Branding"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Personnalisez l'apparence par défaut de vos documents PDF."
                      : "Customize the default appearance of your PDF documents."}
                  </p>
                </div>

                {/* Custom color picker */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Couleur personnalisée" : "Custom Accent Color"}</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border"
                    />
                    <Input
                      value={customColor}
                      onChange={(e) => handleCustomColorChange(e.target.value)}
                      placeholder="#2563eb"
                      className="w-32"
                    />
                  </div>
                </div>

                {/* Logo position & size */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === "fr" ? "Position du logo" : "Logo Position"}</Label>
                    <Select value={logoPosition} onValueChange={handleLogoPositionChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOGO_POSITIONS.map((pos) => (
                          <SelectItem key={pos.value} value={pos.value}>
                            {pos.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{language === "fr" ? "Taille du logo" : "Logo Size"}</Label>
                    <Select value={logoSize} onValueChange={handleLogoSizeChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOGO_SIZES.map((size) => (
                          <SelectItem key={size.value} value={size.value}>
                            {size.label[language]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Remove branding */}
                <div className="flex items-center justify-between pt-2">
                  <div className="space-y-0.5">
                    <Label>
                      {language === "fr" 
                        ? "Supprimer la signature GestionFlow des PDF" 
                        : "Remove GestionFlow branding from PDFs"}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {language === "fr"
                        ? "Masquer la mention \"Généré avec GestionFlow\" sur les documents."
                        : "Hide the \"Generated with GestionFlow\" mention on documents."}
                    </p>
                  </div>
                  <Switch
                    checked={hidePdfBranding}
                    onCheckedChange={handleHidePdfBrandingChange}
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 2: Invoice Defaults */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-base font-semibold">{language === "fr" ? "Valeurs par défaut des factures" : "Invoice Defaults"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Définissez le contenu par défaut appliqué aux nouvelles factures."
                      : "Set default content applied to new invoices."}
                  </p>
                </div>

                {/* Invoice Footer Text */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Texte de pied de page de facture" : "Invoice Footer Text"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Ce texte apparaît en bas des factures PDF."
                      : "This text appears at the bottom of PDF invoices."}
                  </p>
                  <Input
                    value={invoiceFooterText}
                    onChange={(e) => handleInvoiceFooterTextChange(e.target.value)}
                    placeholder={language === "fr" ? "Merci pour votre confiance!" : "Thank you for your business!"}
                  />
                </div>

                {/* Default Invoice Terms */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Conditions par défaut des factures" : "Default Invoice Terms"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Ces conditions sont automatiquement pré-remplies lors de la création d'une nouvelle facture."
                      : "These terms are automatically pre-filled when creating a new invoice."}
                  </p>
                  <Textarea
                    value={defaultInvoiceTerms}
                    onChange={(e) => handleDefaultInvoiceTermsChange(e.target.value)}
                    placeholder={language === "fr" ? "Paiement dû dans les 30 jours..." : "Payment due within 30 days..."}
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 3: Quote Defaults */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-base font-semibold">{language === "fr" ? "Valeurs par défaut des devis" : "Quote Defaults"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Définissez le contenu par défaut appliqué aux nouveaux devis."
                      : "Set default content applied to new quotes."}
                  </p>
                </div>

                {/* Quote Footer Text */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Texte de pied de page de devis" : "Quote Footer Text"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Ce texte apparaît en bas des devis PDF."
                      : "This text appears at the bottom of PDF quotes."}
                  </p>
                  <Input
                    value={quoteFooterText}
                    onChange={(e) => handleQuoteFooterTextChange(e.target.value)}
                    placeholder={language === "fr" ? "Merci de considérer nos services!" : "Thank you for considering our services!"}
                  />
                </div>

                {/* Default Quote Terms */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Conditions par défaut des devis" : "Default Quote Terms"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Ces conditions sont automatiquement pré-remplies lors de la création d'un nouveau devis."
                      : "These terms are automatically pre-filled when creating a new quote."}
                  </p>
                  <Textarea
                    value={defaultQuoteTerms}
                    onChange={(e) => handleDefaultQuoteTermsChange(e.target.value)}
                    placeholder={language === "fr" ? "Ce devis est valide 30 jours..." : "This quote is valid for 30 days..."}
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* SECTION 4: Shared Defaults */}
              <div className="space-y-4">
                <div className="border-b pb-2">
                  <h3 className="text-base font-semibold">{language === "fr" ? "Valeurs partagées par défaut" : "Shared Defaults"}</h3>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Contenu par défaut appliqué aux factures et aux devis."
                      : "Default content applied to both invoices and quotes."}
                  </p>
                </div>

                {/* Default notes */}
                <div className="space-y-2">
                  <Label>{language === "fr" ? "Notes par défaut" : "Default Notes"}</Label>
                  <p className="text-xs text-muted-foreground">
                    {language === "fr" 
                      ? "Ces notes sont pré-remplies sur les nouvelles factures et devis."
                      : "These notes are pre-filled on new invoices and quotes."}
                  </p>
                  <Textarea
                    value={defaultNotes}
                    onChange={(e) => handleDefaultNotesChange(e.target.value)}
                    placeholder={language === "fr" ? "Notes additionnelles..." : "Additional notes..."}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {language === "fr" ? "Aperçu" : "Preview"}
          </CardTitle>
          <CardDescription>
            {language === "fr"
              ? "Aperçu de l'apparence de vos factures et devis."
              : "Preview how your invoices and quotes will look."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-muted/30">
            <InvoicePreview
              template={invoiceTemplate}
              color={activeColor}
              logoPosition={logoPosition}
              logoSize={logoSize}
              footerText={invoiceFooterText || (language === "fr" ? "Merci pour votre confiance!" : "Thank you for your business!")}
              hideBranding={hidePdfBranding}
              language={language}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Mini preview for template selection
function TemplatePreviewMini({ template, color }: { template: string; color: string }) {
  const baseStyle = { borderColor: color };
  
  if (template === "classic") {
    return (
      <div className="h-full flex flex-col text-[6px] text-muted-foreground">
        <div className="flex justify-between items-start">
          <div className="w-8 h-3 bg-muted rounded" />
          <div className="text-right">
            <div className="font-bold" style={{ color }}>INVOICE</div>
          </div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full h-2 bg-muted/50 rounded" />
        </div>
        <div className="text-right font-bold" style={{ color }}>$100.00</div>
      </div>
    );
  }
  
  if (template === "modern") {
    return (
      <div className="h-full flex flex-col text-[6px] text-muted-foreground">
        <div className="flex justify-between items-start">
          <div className="w-8 h-3 bg-muted rounded" />
          <div className="font-bold" style={{ color }}>INVOICE</div>
        </div>
        <div className="flex-1 flex items-center">
          <div className="w-full h-3 rounded" style={{ backgroundColor: `${color}20` }} />
        </div>
        <div className="h-4 rounded text-white text-right px-1 flex items-center justify-end" style={{ backgroundColor: color }}>
          $100.00
        </div>
      </div>
    );
  }
  
  if (template === "professional") {
    return (
      <div className="h-full flex flex-col text-[6px] text-muted-foreground border-l-2" style={baseStyle}>
        <div className="pl-1">
          <div className="font-bold" style={{ color }}>INVOICE</div>
          <div className="w-8 h-2 bg-muted rounded mt-1" />
        </div>
        <div className="flex-1" />
        <div className="border-t pt-1 text-right font-bold" style={{ borderColor: color, color }}>
          $100.00
        </div>
      </div>
    );
  }
  
  // Creative
  return (
    <div className="h-full flex flex-col text-[6px] text-muted-foreground">
      <div className="h-4 rounded-t flex items-center justify-center text-white font-bold" style={{ backgroundColor: color }}>
        INVOICE
      </div>
      <div className="flex-1 flex items-center px-1">
        <div className="w-full h-2 bg-muted/50 rounded" />
      </div>
      <div className="text-right font-bold" style={{ color }}>$100.00</div>
    </div>
  );
}

// Full preview component
function InvoicePreview({ 
  template, 
  color, 
  logoPosition,
  logoSize,
  footerText,
  hideBranding,
  language
}: { 
  template: string; 
  color: string;
  logoPosition: string;
  logoSize: string;
  footerText: string;
  hideBranding: boolean;
  language: string;
}) {
  const logoSizeClass = logoSize === "small" ? "w-8 h-6" : logoSize === "large" ? "w-14 h-10" : "w-10 h-8";
  
  const Logo = () => (
    <div className={`${logoSizeClass} bg-muted rounded flex items-center justify-center text-[8px] text-muted-foreground`}>
      Logo
    </div>
  );

  const CompanyInfo = () => (
    <div>
      <div className="font-bold text-sm" style={{ color }}>ACME Company</div>
      <div className="text-muted-foreground text-xs">123 Main St, City</div>
      <div className="text-muted-foreground text-xs">contact@acme.com</div>
    </div>
  );

  const Footer = () => (
    <div className="border-t pt-2 mt-3 text-center text-[10px] text-muted-foreground">
      <p>{footerText}</p>
      {!hideBranding && (
        <p className="mt-1 opacity-60">
          {language === "fr" ? "Créé avec GestionFlow" : "Created with GestionFlow"}
        </p>
      )}
    </div>
  );

  if (template === "classic") {
    return (
      <div className="bg-background border rounded p-4 space-y-3 text-xs">
        <div className={`flex justify-between items-start pb-2 ${logoPosition === "right" ? "flex-row" : "flex-row-reverse"}`}>
          <CompanyInfo />
          <Logo />
        </div>
        <div className="border-t pt-2" style={{ borderColor: `${color}30` }}>
          <div className="flex justify-between items-start">
            <div>
              <div className="font-semibold mb-1 text-foreground">
                {language === "fr" ? "Facturé à:" : "Bill To:"}
              </div>
              <div className="text-muted-foreground">Client Name</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-foreground">INVOICE #001</div>
              <div className="text-muted-foreground text-[10px]">
                {language === "fr" ? "Date:" : "Issue Date:"} 2024-01-15
              </div>
              <div className="text-muted-foreground text-[10px]">
                {language === "fr" ? "Échéance:" : "Due Date:"} 2024-01-30
              </div>
            </div>
          </div>
        </div>
        <div className="border-t pt-2 space-y-1">
          <div className="flex justify-between font-semibold text-foreground p-1 rounded" style={{ backgroundColor: `${color}15` }}>
            <span>{language === "fr" ? "Article" : "Item"}</span>
            <span>{language === "fr" ? "Montant" : "Amount"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service 1</span>
            <span>$100.00</span>
          </div>
        </div>
        <div className="border-t pt-2" style={{ borderColor: `${color}30` }}>
          <div className="flex justify-between font-bold" style={{ color }}>
            <span>Total</span>
            <span>$100.00</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (template === "modern") {
    return (
      <div className="bg-background border rounded p-4 space-y-3 text-xs">
        <div className={`flex justify-between items-start ${logoPosition === "right" ? "flex-row" : "flex-row-reverse"}`}>
          <CompanyInfo />
          <Logo />
        </div>
        <div className="rounded p-2" style={{ backgroundColor: `${color}10` }}>
          <div className="font-semibold mb-1 text-foreground">
            {language === "fr" ? "Facturé à:" : "Bill To:"}
          </div>
          <div className="text-muted-foreground">Client Name</div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground p-1 rounded" style={{ backgroundColor: `${color}15` }}>
            <span>{language === "fr" ? "Article" : "Item"}</span>
            <span>{language === "fr" ? "Montant" : "Amount"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service 1</span>
            <span>$100.00</span>
          </div>
        </div>
        <div className="text-white p-2 rounded" style={{ backgroundColor: color }}>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span>$100.00</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (template === "professional") {
    return (
      <div className="bg-background border-2 rounded p-4 space-y-3 text-xs" style={{ borderColor: color }}>
        <div className={`border-b-2 pb-2 flex justify-between items-start ${logoPosition === "right" ? "flex-row" : "flex-row-reverse"}`} style={{ borderColor: color }}>
          <CompanyInfo />
          <Logo />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="font-semibold mb-1 text-foreground">
              {language === "fr" ? "Facturé à:" : "Bill To:"}
            </div>
            <div className="text-muted-foreground">Client Name</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-foreground">INVOICE #001</div>
            <div className="text-muted-foreground text-[10px]">2024-01-15</div>
          </div>
        </div>
        <div className="border-t pt-2 space-y-1" style={{ borderColor: `${color}50` }}>
          <div className="flex justify-between font-semibold text-foreground p-1 rounded" style={{ backgroundColor: `${color}15` }}>
            <span>{language === "fr" ? "Article" : "Item"}</span>
            <span>{language === "fr" ? "Montant" : "Amount"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service 1</span>
            <span>$100.00</span>
          </div>
        </div>
        <div className="border-t-2 pt-2" style={{ borderColor: color }}>
          <div className="flex justify-between font-bold" style={{ color }}>
            <span>Total</span>
            <span>$100.00</span>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Creative
  return (
    <div className="bg-background border rounded overflow-hidden text-xs">
      <div className="text-white p-3 flex justify-between items-center" style={{ backgroundColor: color }}>
        <div>
          <div className="font-bold text-sm">ACME Company</div>
          <div className="text-white/80 text-[10px]">123 Main St, City</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-lg">INVOICE</div>
          <div className="text-white/80 text-[10px]">#001</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold mb-1 text-foreground">
              {language === "fr" ? "Facturé à:" : "Bill To:"}
            </div>
            <div className="text-muted-foreground">Client Name</div>
          </div>
          <div className="text-right text-muted-foreground text-[10px]">
            <div>2024-01-15</div>
            <div>{language === "fr" ? "Échéance:" : "Due:"} 2024-01-30</div>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between font-semibold text-foreground p-1 rounded" style={{ backgroundColor: `${color}15` }}>
            <span>{language === "fr" ? "Article" : "Item"}</span>
            <span>{language === "fr" ? "Montant" : "Amount"}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Service 1</span>
            <span>$100.00</span>
          </div>
        </div>
        <div className="rounded p-2" style={{ backgroundColor: `${color}15` }}>
          <div className="flex justify-between font-bold" style={{ color }}>
            <span>Total</span>
            <span>$100.00</span>
          </div>
        </div>
        <Footer />
      </div>
    </div>
  );
}
