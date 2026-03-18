import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { useUserSignature } from "@/hooks/useUserSignature";
import { Loader2, Trash2, Check, Type, Pen, Upload, Info } from "lucide-react";
import { toast } from "sonner";

interface SignaturePadProps {
  onSignatureReady?: (signatureData: string | null, name?: string, title?: string) => void;
  compact?: boolean;
  notifyOnLoad?: boolean;
}

export const SignaturePad = ({ onSignatureReady, compact = false, notifyOnLoad = true }: SignaturePadProps) => {
  const { language } = useLanguage();
  const { signature, isLoading, saveSignature, deleteSignature, hasSignature } = useUserSignature();
  const t = (fr: string, en: string) => language === "fr" ? fr : en;

  const [mode, setMode] = useState<"typed" | "drawn" | "uploaded">("typed");
  const [typedName, setTypedName] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerTitle, setSignerTitle] = useState("");
  const [drawnData, setDrawnData] = useState<string | null>(null);
  const [uploadedData, setUploadedData] = useState<string | null>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Load existing signature
  useEffect(() => {
    if (signature) {
      setMode(signature.signature_type);
      setSignerName(signature.signer_name || "");
      setSignerTitle(signature.signer_title || "");
      if (signature.signature_type === "typed") {
        setTypedName(signature.signature_value);
      } else if (signature.signature_type === "drawn") {
        setDrawnData(signature.signature_value);
      } else if (signature.signature_type === "uploaded") {
        setUploadedData(signature.signature_value);
      }
      if (notifyOnLoad) {
        onSignatureReady?.(signature.signature_value, signature.signer_name || undefined, signature.signer_title || undefined);
      }
    }
  }, [notifyOnLoad, onSignatureReady, signature]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || mode !== "drawn") return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Redraw existing
    if (drawnData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = drawnData;
    }
  }, [mode]);

  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    isDrawingRef.current = true;
    lastPosRef.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPosRef.current = pos;
  };

  const endDraw = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      const data = canvas.toDataURL("image/png");
      setDrawnData(data);
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setDrawnData(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error(t("Veuillez sélectionner une image.", "Please select an image file."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("L'image ne doit pas dépasser 2 Mo.", "Image must be under 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedData(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const getCurrentValue = (): string | null => {
    switch (mode) {
      case "typed": return typedName || null;
      case "drawn": return drawnData;
      case "uploaded": return uploadedData;
    }
  };

  const handleSave = async () => {
    const value = getCurrentValue();
    if (!value) {
      toast.error(t("Veuillez créer une signature.", "Please create a signature."));
      return;
    }
    try {
      await saveSignature.mutateAsync({
        signature_type: mode,
        signature_value: value,
        signer_name: signerName || undefined,
        signer_title: signerTitle || undefined,
      });
      onSignatureReady?.(value, signerName || undefined, signerTitle || undefined);
      toast.success(t("Signature enregistrée.", "Signature saved."));
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur lors de l'enregistrement.", "Error saving signature."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSignature.mutateAsync();
      setTypedName("");
      setDrawnData(null);
      setUploadedData(null);
      setSignerName("");
      setSignerTitle("");
      onSignatureReady?.(null);
      toast.success(t("Signature supprimée.", "Signature deleted."));
    } catch (err) {
      console.error(err);
      toast.error(t("Erreur lors de la suppression.", "Error deleting signature."));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Compact preview of existing signature
  if (compact && hasSignature && signature) {
    return (
      <Card className="border-muted">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">{t("Signature", "Signature")}</Label>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onSignatureReady?.(signature.signature_value, signature.signer_name || undefined, signature.signer_title || undefined)}>
                <Check className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
          {signature.signature_type === "typed" ? (
            <p className="text-lg italic font-serif text-foreground">{signature.signature_value}</p>
          ) : (
            <img
              src={signature.signature_value}
              alt="Signature"
              className="max-h-12 object-contain"
            />
          )}
          {(signature.signer_name || signature.signer_title) && (
            <div className="text-xs text-muted-foreground">
              {signature.signer_name && <p>{signature.signer_name}</p>}
              {signature.signer_title && <p>{signature.signer_title}</p>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-muted">
      <CardContent className="p-4 space-y-4">
        <Label className="text-sm font-semibold">{t("Signature", "Signature")}</Label>

        <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="typed" className="text-xs">
              <Type className="h-3.5 w-3.5 mr-1" />{t("Tapée", "Typed")}
            </TabsTrigger>
            <TabsTrigger value="drawn" className="text-xs">
              <Pen className="h-3.5 w-3.5 mr-1" />{t("Dessinée", "Drawn")}
            </TabsTrigger>
            <TabsTrigger value="uploaded" className="text-xs">
              <Upload className="h-3.5 w-3.5 mr-1" />{t("Image", "Upload")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="typed" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label className="text-xs">{t("Texte de la signature", "Signature text")}</Label>
              <Input
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                placeholder={t("Votre nom complet", "Your full name")}
              />
            </div>
            {typedName && (
              <div className="border rounded-md p-4 bg-background text-center">
                <p className="text-2xl italic font-serif text-foreground">{typedName}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="drawn" className="space-y-3 mt-3">
            <div className="relative border rounded-md bg-background">
              <canvas
                ref={canvasRef}
                className="w-full cursor-crosshair touch-none"
                style={{ height: 120 }}
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
              {!drawnData && (
                <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground pointer-events-none">
                  {t("Dessinez votre signature ici", "Draw your signature here")}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={clearCanvas}>
              {t("Effacer", "Clear")}
            </Button>
          </TabsContent>

          <TabsContent value="uploaded" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label className="text-xs">{t("Image de signature (PNG recommandé)", "Signature image (PNG recommended)")}</Label>
              <Input type="file" accept="image/*" onChange={handleFileUpload} />
            </div>
            {uploadedData && (
              <div className="border rounded-md p-4 bg-background text-center">
                <img src={uploadedData} alt="Signature" className="max-h-16 mx-auto object-contain" />
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Signer info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("Nom du signataire", "Signer name")}</Label>
            <Input
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              placeholder={t("Nom complet", "Full name")}
              className="text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("Titre (optionnel)", "Title (optional)")}</Label>
            <Input
              value={signerTitle}
              onChange={(e) => setSignerTitle(e.target.value)}
              placeholder={t("Ex: Directeur", "E.g. Director")}
              className="text-sm"
            />
          </div>
        </div>

        {/* Legal note */}
        <p className="text-xs text-muted-foreground flex items-start gap-1">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          {t(
            "Cette signature est fournie à titre de représentation numérique.",
            "This signature is a digital representation."
          )}
        </p>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!getCurrentValue() || saveSignature.isPending}
          >
            {saveSignature.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            <Check className="h-4 w-4 mr-1" />
            {t("Enregistrer la signature", "Save signature")}
          </Button>
          {hasSignature && (
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleteSignature.isPending}>
              <Trash2 className="h-4 w-4 mr-1" />
              {t("Supprimer", "Delete")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
