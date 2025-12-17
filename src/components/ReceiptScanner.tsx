import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Upload, Loader2, Scan } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedData {
  amount: number | null;
  vendor: string | null;
  date: string | null;
  description: string | null;
  category: string | null;
}

interface ReceiptScannerProps {
  onDataExtracted: (data: ExtractedData) => void;
}

export const ReceiptScanner = ({ onDataExtracted }: ReceiptScannerProps) => {
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (file: File) => {
    setIsScanning(true);

    try {
      // Convert file to base64
      const base64 = await fileToBase64(file);
      setPreviewUrl(base64);

      // Call edge function
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { imageBase64: base64, language }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.data) {
        onDataExtracted(data.data);
        toast({
          title: language === "fr" ? "Données extraites" : "Data extracted",
          description: language === "fr" 
            ? "Les informations ont été extraites avec succès"
            : "Information has been extracted successfully",
        });
      }
    } catch (error) {
      console.error("Error scanning receipt:", error);
      toast({
        title: language === "fr" ? "Erreur" : "Error",
        description: error instanceof Error ? error.message : (language === "fr" ? "Erreur lors du scan" : "Error scanning receipt"),
        variant: "destructive",
      });
    } finally {
      setIsScanning(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">
        {language === "fr" ? "Scanner une facture" : "Scan a receipt"}
      </Label>
      
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={isScanning}
          className="flex-1"
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Camera className="h-4 w-4 mr-2" />
          )}
          {language === "fr" ? "Caméra" : "Camera"}
        </Button>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleUploadClick}
          disabled={isScanning}
          className="flex-1"
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-2" />
          )}
          {language === "fr" ? "Télécharger" : "Upload"}
        </Button>
      </div>

      {/* Hidden file inputs */}
      <Input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Preview */}
      {previewUrl && (
        <div className="relative rounded-lg overflow-hidden border">
          <img 
            src={previewUrl} 
            alt="Receipt preview" 
            className="w-full h-32 object-cover"
          />
          {isScanning && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Scan className="h-6 w-6 animate-pulse text-primary" />
                <span className="text-sm text-muted-foreground">
                  {language === "fr" ? "Analyse en cours..." : "Analyzing..."}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {language === "fr" 
          ? "Prenez une photo ou téléchargez une image de votre facture pour extraire automatiquement les données."
          : "Take a photo or upload an image of your receipt to automatically extract data."}
      </p>
    </div>
  );
};
