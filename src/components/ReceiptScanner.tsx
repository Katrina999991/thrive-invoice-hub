import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, Loader2, Scan, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";
import { supabase } from "@/integrations/supabase/client";

export interface ExtractedReceiptData {
  amount: number | null;
  vendor: string | null;
  date: string | null;
  description: string | null;
  description_en: string | null;
  description_fr: string | null;
  category: string | null;
  suggested_category: string | null;
  suggested_category_id: string | null;
  category_confidence: number;
  category_source: "learned_vendor" | "learned_keyword" | "ai_suggestion" | "default";
  vendor_normalized: string | null;
  extracted_keywords: string[];
  taxes?: Array<{ name: string; amount: number }>;
  line_items?: string[];
}

interface ReceiptScannerProps {
  onDataExtracted: (data: ExtractedReceiptData) => void;
  companyId?: string;
  userId?: string;
}

export const ReceiptScanner = ({ onDataExtracted, companyId, userId }: ReceiptScannerProps) => {
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

      // Call edge function with company context for smart categorization
      const { data, error } = await supabase.functions.invoke("scan-receipt", {
        body: { 
          imageBase64: base64, 
          language,
          companyId,
          userId 
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.success && data?.data) {
        const extractedData: ExtractedReceiptData = {
          amount: data.data.amount,
          vendor: data.data.vendor,
          date: data.data.date,
          description: data.data.description,
          description_en: data.data.description_en,
          description_fr: data.data.description_fr,
          category: data.data.suggested_category,
          suggested_category: data.data.suggested_category,
          suggested_category_id: data.data.suggested_category_id,
          category_confidence: data.data.category_confidence || 0,
          category_source: data.data.category_source || "default",
          vendor_normalized: data.data.vendor_normalized,
          extracted_keywords: data.data.extracted_keywords || [],
          taxes: data.data.taxes,
          line_items: data.data.line_items
        };
        
        onDataExtracted(extractedData);
        
        // Show appropriate message based on category source
        let categoryMessage = "";
        if (extractedData.category_source === "learned_vendor") {
          categoryMessage = language === "fr" 
            ? " (catégorie apprise du vendeur)"
            : " (category learned from vendor)";
        } else if (extractedData.category_source === "learned_keyword") {
          categoryMessage = language === "fr"
            ? " (catégorie apprise des mots-clés)"
            : " (category learned from keywords)";
        } else if (extractedData.category_source === "ai_suggestion" && extractedData.category_confidence > 0.5) {
          categoryMessage = language === "fr"
            ? " (catégorie suggérée par l'IA)"
            : " (AI-suggested category)";
        }
        
        toast({
          title: language === "fr" ? "Données extraites" : "Data extracted",
          description: (language === "fr" 
            ? "Les informations ont été extraites avec succès"
            : "Information has been extracted successfully") + categoryMessage,
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
      <Label className="text-sm font-medium flex items-center gap-2">
        {language === "fr" ? "Scanner une facture" : "Scan a receipt"}
        <Badge variant="secondary" className="text-xs gap-1">
          <Sparkles className="h-3 w-3" />
          {language === "fr" ? "Intelligent" : "Smart"}
        </Badge>
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
        accept="image/*,application/pdf"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
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
          ? "Prenez une photo ou téléchargez une image de votre facture. La catégorie sera suggérée automatiquement et apprend de vos corrections."
          : "Take a photo or upload an image of your receipt. Category will be auto-suggested and learns from your corrections."}
      </p>
    </div>
  );
};
