import { useState, useRef, useCallback } from "react";
import { BarcodeScanner, SupportedFormat } from "@capacitor-community/barcode-scanner";
import { Html5Qrcode } from "html5-qrcode";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/useLanguage";

// Check if running in Capacitor native app
const isNativeApp = (): boolean => {
  return !!(window as any).Capacitor?.isNativePlatform?.();
};

export const useBarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [useWebScanner, setUseWebScanner] = useState(false);
  const { toast } = useToast();
  const { language } = useLanguage();
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "html5-qrcode-scanner";

  // Native Capacitor permission check
  const checkNativePermission = async (): Promise<boolean> => {
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

  // Native Capacitor scan
  const startNativeScan = async (): Promise<string | null> => {
    try {
      const hasPermission = await checkNativePermission();
      if (!hasPermission) {
        return null;
      }

      setIsScanning(true);
      setUseWebScanner(false);
      
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

      await stopNativeScan();

      if (result.hasContent && result.content) {
        toast({
          title: language === "fr" ? "Code détecté" : "Code Detected",
          description: result.content
        });
        return result.content;
      }
      
      return null;
    } catch (error) {
      console.error("Native scan error:", error);
      await stopNativeScan();
      throw error;
    }
  };

  const stopNativeScan = async () => {
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.querySelector('body')?.classList.remove('scanner-active');
    } catch (error) {
      console.error("Stop native scan error:", error);
    }
  };

  // Web scanner using html5-qrcode
  const startWebScan = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      setIsScanning(true);
      setUseWebScanner(true);

      // Small delay to ensure the container is rendered
      setTimeout(async () => {
        try {
          const container = document.getElementById(scannerContainerId);
          if (!container) {
            throw new Error("Scanner container not found");
          }

          html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
          
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0
            },
            (decodedText) => {
              // On success
              toast({
                title: language === "fr" ? "Code détecté" : "Code Detected",
                description: decodedText
              });
              stopWebScan();
              resolve(decodedText);
            },
            () => {
              // On error (scanning continues)
            }
          );
        } catch (error: any) {
          console.error("Web scan error:", error);
          stopWebScan();
          
          if (error.message?.includes("Permission denied") || error.name === "NotAllowedError") {
            toast({
              title: language === "fr" ? "Permission refusée" : "Permission Denied",
              description: language === "fr" 
                ? "Veuillez autoriser l'accès à la caméra" 
                : "Please allow camera access",
              variant: "destructive"
            });
          } else {
            toast({
              title: language === "fr" ? "Erreur de scan" : "Scan Error",
              description: language === "fr" 
                ? "Impossible d'accéder à la caméra" 
                : "Unable to access camera",
              variant: "destructive"
            });
          }
          resolve(null);
        }
      }, 100);
    });
  }, [language, toast]);

  const stopWebScan = useCallback(async () => {
    try {
      if (html5QrCodeRef.current) {
        const state = html5QrCodeRef.current.getState();
        if (state === 2) { // SCANNING state
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    } catch (error) {
      console.error("Stop web scan error:", error);
    } finally {
      setIsScanning(false);
      setUseWebScanner(false);
    }
  }, []);

  // Main scan function - auto-detects platform
  const startScan = async (): Promise<string | null> => {
    if (isNativeApp()) {
      try {
        return await startNativeScan();
      } catch (error) {
        // Fallback to web scanner if native fails
        console.log("Native scanner failed, falling back to web scanner");
        return startWebScan();
      }
    } else {
      // Use web scanner for browser
      return startWebScan();
    }
  };

  const stopScan = async () => {
    if (useWebScanner) {
      await stopWebScan();
    } else {
      await stopNativeScan();
    }
    setIsScanning(false);
  };

  return {
    isScanning,
    useWebScanner,
    startScan,
    stopScan,
    scannerContainerId
  };
};
