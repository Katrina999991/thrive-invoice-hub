import { useState } from "react";
import { BarcodeScanner, SupportedFormat } from "@capacitor-community/barcode-scanner";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

export const useBarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();

  const checkPermission = async (): Promise<boolean> => {
    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        return true;
      }
      
      if (status.denied) {
        toast({
          title: language === "fr" ? "Permission refusée" : "Permission Denied",
          description: language === "fr" 
            ? "Veuillez autoriser l'accès à la caméra dans les paramètres" 
            : "Please allow camera access in settings",
          variant: "destructive"
        });
        return false;
      }
      
      if (status.neverAsked) {
        const result = await BarcodeScanner.checkPermission({ force: true });
        return result.granted || false;
      }
      
      return false;
    } catch (error) {
      console.error("Permission check error:", error);
      return false;
    }
  };

  const startScan = async (): Promise<string | null> => {
    try {
      const hasPermission = await checkPermission();
      if (!hasPermission) {
        return null;
      }

      setIsScanning(true);
      
      // Make background transparent for camera view
      document.querySelector('body')?.classList.add('scanner-active');
      
      await BarcodeScanner.hideBackground();
      
      const result = await BarcodeScanner.startScan({
        targetedFormats: [
          SupportedFormat.EAN_13,
          SupportedFormat.EAN_8,
          SupportedFormat.UPC_A,
          SupportedFormat.UPC_E,
          SupportedFormat.CODE_39,
          SupportedFormat.CODE_93,
          SupportedFormat.CODE_128,
          SupportedFormat.QR_CODE
        ]
      });

      await stopScan();

      if (result.hasContent && result.content) {
        toast({
          title: language === "fr" ? "Code détecté" : "Code Detected",
          description: result.content
        });
        return result.content;
      }
      
      return null;
    } catch (error) {
      console.error("Scan error:", error);
      await stopScan();
      toast({
        title: language === "fr" ? "Erreur de scan" : "Scan Error",
        description: language === "fr" 
          ? "Impossible de scanner le code-barres. Vérifiez que vous utilisez l'app native." 
          : "Unable to scan barcode. Make sure you're using the native app.",
        variant: "destructive"
      });
      return null;
    }
  };

  const stopScan = async () => {
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.querySelector('body')?.classList.remove('scanner-active');
    } catch (error) {
      console.error("Stop scan error:", error);
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    startScan,
    stopScan
  };
};
