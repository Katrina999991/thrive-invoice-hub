import { useState, useEffect } from "react";
import { Download, Share, MoreVertical, Smartphone, Monitor, CheckCircle2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

// Global variable to capture the prompt early
let globalDeferredPrompt: BeforeInstallPromptEvent | null = null;

// Capture the event as early as possible
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalDeferredPrompt = e as BeforeInstallPromptEvent;
  });
}

// Detect browser and platform
const getBrowserInfo = () => {
  if (typeof navigator === "undefined") return { isIOS: false, isSafari: false, isChrome: false, isAndroid: false, isMobile: false };
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/i.test(ua);
  
  return { isIOS, isSafari, isChrome, isAndroid, isMobile };
};

export function PWAInstallSection() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(globalDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const { language } = useLanguage();
  const browserInfo = getBrowserInfo();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check for navigator.standalone (iOS)
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    // Use global prompt if available
    if (globalDeferredPrompt) {
      setDeferredPrompt(globalDeferredPrompt);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      globalDeferredPrompt = prompt;
      setDeferredPrompt(prompt);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Listen for successful installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      globalDeferredPrompt = null;
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Direct installation available
      setIsInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          setIsInstalled(true);
        }
      } catch (error) {
        console.error("PWA install error:", error);
      } finally {
        setIsInstalling(false);
        setDeferredPrompt(null);
        globalDeferredPrompt = null;
      }
    } else {
      // Show manual instructions
      setShowInstructions(true);
    }
  };

  const getInstructions = () => {
    if (browserInfo.isIOS) {
      return {
        title: language === 'fr' ? "Installation sur iOS (iPhone/iPad)" : "Install on iOS (iPhone/iPad)",
        steps: language === 'fr' 
          ? [
              "Ouvrez ce site dans Safari (si ce n'est pas déjà fait)",
              "Appuyez sur le bouton Partager (carré avec flèche vers le haut)",
              "Faites défiler et appuyez sur « Sur l'écran d'accueil »",
              "Appuyez sur « Ajouter » en haut à droite"
            ]
          : [
              "Open this site in Safari (if not already)",
              "Tap the Share button (square with arrow pointing up)",
              "Scroll down and tap 'Add to Home Screen'",
              "Tap 'Add' in the top right"
            ],
        icon: <Share className="w-5 h-5" />
      };
    }
    
    if (browserInfo.isAndroid) {
      return {
        title: language === 'fr' ? "Installation sur Android" : "Install on Android",
        steps: language === 'fr'
          ? [
              "Appuyez sur le menu (⋮) en haut à droite du navigateur",
              "Sélectionnez « Installer l'application » ou « Ajouter à l'écran d'accueil »",
              "Confirmez l'installation"
            ]
          : [
              "Tap the menu (⋮) in the top right of your browser",
              "Select 'Install app' or 'Add to Home Screen'",
              "Confirm the installation"
            ],
        icon: <MoreVertical className="w-5 h-5" />
      };
    }

    // Desktop
    return {
      title: language === 'fr' ? "Installation sur ordinateur" : "Install on Desktop",
      steps: language === 'fr'
        ? [
            "Cliquez sur l'icône d'installation dans la barre d'adresse (⊕ ou ⬇)",
            "Ou ouvrez le menu du navigateur (⋮) et cliquez sur « Installer »",
            "Confirmez l'installation"
          ]
        : [
            "Click the install icon in the address bar (⊕ or ⬇)",
            "Or open the browser menu (⋮) and click 'Install'",
            "Confirm the installation"
          ],
      icon: <Monitor className="w-5 h-5" />
    };
  };

  const instructions = getInstructions();

  if (isInstalled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            {language === "fr" ? "Application installée" : "App Installed"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <CheckCircle2 className="h-6 w-6 text-green-500" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                {language === "fr" ? "L'application est installée!" : "The app is installed!"}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === "fr" 
                  ? "Vous pouvez la lancer depuis votre écran d'accueil."
                  : "You can launch it from your home screen."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          {language === "fr" ? "Installer l'application" : "Install App"}
        </CardTitle>
        <CardDescription>
          {language === "fr" 
            ? "Installez GestionFlow sur votre appareil pour un accès rapide et une expérience optimale."
            : "Install GestionFlow on your device for quick access and an optimal experience."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Install button - always visible */}
        <Button 
          onClick={handleInstall} 
          disabled={isInstalling}
          className="w-full"
          size="lg"
        >
          {deferredPrompt ? (
            <>
              <Download className="w-5 h-5 mr-2" />
              {isInstalling 
                ? (language === "fr" ? "Installation..." : "Installing...")
                : (language === "fr" ? "Installer maintenant" : "Install Now")
              }
            </>
          ) : (
            <>
              <ExternalLink className="w-5 h-5 mr-2" />
              {language === "fr" ? "Voir les instructions" : "View Instructions"}
            </>
          )}
        </Button>

        {/* Manual instructions - always visible or when button clicked */}
        {(showInstructions || !deferredPrompt) && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-3">
              {instructions.icon}
              <h3 className="font-medium">{instructions.title}</h3>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground">
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{language === "fr" ? "Accès rapide" : "Quick access"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{language === "fr" ? "Fonctionne hors ligne" : "Works offline"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{language === "fr" ? "Plein écran" : "Full screen"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span>{language === "fr" ? "Notifications" : "Notifications"}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
