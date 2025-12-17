import { Button } from "@/components/ui/button";
import { ScanBarcode, X } from "lucide-react";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { useLanguage } from "@/hooks/useLanguage";

interface BarcodeScannerButtonProps {
  onScan: (barcode: string) => void;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

export const BarcodeScannerButton = ({
  onScan,
  variant = "outline",
  size = "default",
  className = "",
  showLabel = true
}: BarcodeScannerButtonProps) => {
  const { isScanning, useWebScanner, startScan, stopScan, scannerContainerId } = useBarcodeScanner();
  const { language } = useLanguage();

  const handleScan = async () => {
    if (isScanning) {
      await stopScan();
      return;
    }

    const result = await startScan();
    if (result) {
      onScan(result);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={handleScan}
        className={className}
        disabled={false}
      >
        {isScanning ? (
          <>
            <X className="h-4 w-4" />
            {showLabel && (
              <span className="ml-2">
                {language === "fr" ? "Annuler" : "Cancel"}
              </span>
            )}
          </>
        ) : (
          <>
            <ScanBarcode className="h-4 w-4" />
            {showLabel && (
              <span className="ml-2">
                {language === "fr" ? "Scanner" : "Scan"}
              </span>
            )}
          </>
        )}
      </Button>

      {/* Scanner overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          {useWebScanner ? (
            // Web scanner with html5-qrcode
            <div className="w-full max-w-md">
              <div className="relative">
                {/* Scanner container - html5-qrcode will render here */}
                <div 
                  id={scannerContainerId}
                  className="w-full rounded-lg overflow-hidden"
                  style={{ minHeight: '300px' }}
                />
                
                {/* Corner decorations over the video */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                  <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                  <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                  <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
                </div>
              </div>
              
              <p className="text-white mt-4 text-center text-sm">
                {language === "fr" 
                  ? "Placez le code-barres devant la caméra" 
                  : "Place the barcode in front of the camera"}
              </p>
            </div>
          ) : (
            // Native scanner overlay (Capacitor)
            <div className="relative w-64 h-64 border-2 border-primary rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning line animation */}
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary animate-pulse" />
            </div>
          )}
          
          {!useWebScanner && (
            <p className="text-white mt-6 text-center px-4">
              {language === "fr" 
                ? "Placez le code-barres dans le cadre" 
                : "Place the barcode in the frame"}
            </p>
          )}
          
          <Button
            variant="outline"
            className="mt-6"
            onClick={stopScan}
          >
            <X className="h-4 w-4 mr-2" />
            {language === "fr" ? "Annuler" : "Cancel"}
          </Button>
        </div>
      )}
    </>
  );
};
