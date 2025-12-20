import { useState, useEffect } from "react";
import { X, Download, Sparkles, Share, MoreVertical, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-install-banner-dismissed";

// Global variable to capture the event before React mounts
let deferredPromptGlobal: BeforeInstallPromptEvent | null = null;

// Capture the event as early as possible
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    deferredPromptGlobal = e as BeforeInstallPromptEvent;
    console.log("PWA: beforeinstallprompt event captured globally");
  });
}

// Detect browser and platform
const getBrowserInfo = () => {
  if (typeof navigator === "undefined") return { isIOS: false, isSafari: false, isChrome: false, isAndroid: false };
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
  const isAndroid = /android/i.test(ua);
  
  return { isIOS, isSafari, isChrome, isAndroid };
};

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const { t, language } = useLanguage();
  const browserInfo = getBrowserInfo();

  useEffect(() => {
    console.log("PWA Banner: Component mounted");
    
    // Check if already dismissed
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) {
      console.log("PWA Banner: Already dismissed");
      return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("PWA Banner: Already installed (standalone mode)");
      return;
    }

    // Check if we already captured the event globally
    if (deferredPromptGlobal) {
      console.log("PWA Banner: Using globally captured event");
      setDeferredPrompt(deferredPromptGlobal);
      setShowBanner(true);
      return;
    }

    // For iOS or when beforeinstallprompt is not supported, show manual instructions
    if (browserInfo.isIOS) {
      console.log("PWA Banner: iOS detected, showing manual instructions");
      setShowBanner(true);
      setShowManualInstructions(true);
      return;
    }

    // Listen for future events
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("PWA Banner: beforeinstallprompt event received");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // After a delay, if no event was captured, show manual instructions for mobile
    const timeout = setTimeout(() => {
      if (!deferredPromptGlobal && !deferredPrompt && browserInfo.isAndroid) {
        console.log("PWA Banner: No beforeinstallprompt, showing manual instructions");
        setShowBanner(true);
        setShowManualInstructions(true);
      }
    }, 3000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      clearTimeout(timeout);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Show manual instructions if programmatic install not available
      setShowManualInstructions(true);
      return;
    }

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === "accepted") {
        setShowBanner(false);
        localStorage.setItem(STORAGE_KEY, "installed");
      }
    } catch (error) {
      console.error("PWA install error:", error);
      setShowManualInstructions(true);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, "dismissed");
  };

  if (!showBanner) return null;

  const getManualInstructions = () => {
    if (browserInfo.isIOS) {
      return {
        title: language === 'fr' ? "Comment installer sur iOS" : "How to install on iOS",
        steps: language === 'fr' 
          ? ["Appuyez sur le bouton Partager", "Faites défiler et appuyez sur « Sur l'écran d'accueil »", "Appuyez sur « Ajouter »"]
          : ["Tap the Share button", "Scroll down and tap 'Add to Home Screen'", "Tap 'Add'"],
        icon: <Share className="w-5 h-5" />
      };
    }
    
    // Android or other
    return {
      title: language === 'fr' ? "Comment installer" : "How to install",
      steps: language === 'fr'
        ? ["Appuyez sur le menu (⋮) du navigateur", "Sélectionnez « Installer l'application » ou « Ajouter à l'écran d'accueil »"]
        : ["Tap the browser menu (⋮)", "Select 'Install app' or 'Add to Home Screen'"],
      icon: <MoreVertical className="w-5 h-5" />
    };
  };

  const instructions = getManualInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-[420px] z-50 animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 rounded-xl shadow-2xl border border-primary-foreground/10">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-foreground/5 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative p-5">
          <div className="flex items-start gap-4">
            {/* Icon with glow effect */}
            <div className="flex-shrink-0 relative">
              <div className="absolute inset-0 bg-primary-foreground/20 rounded-xl blur-lg" />
              <div className="relative w-12 h-12 bg-primary-foreground/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-primary-foreground/20">
                <Sparkles className="w-6 h-6 text-primary-foreground" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              {!showManualInstructions ? (
                <>
                  <h3 className="font-bold text-primary-foreground text-base tracking-tight">
                    {t("pwa.install.title")}
                  </h3>
                  <p className="text-primary-foreground/80 text-sm mt-1 leading-relaxed">
                    {t("pwa.install.description")}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="h-9 px-4 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t("pwa.install.button")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="h-9 px-3 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {t("pwa.install.later")}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="font-bold text-primary-foreground text-base tracking-tight flex items-center gap-2">
                    {instructions.icon}
                    {instructions.title}
                  </h3>
                  <ol className="text-primary-foreground/90 text-sm mt-3 space-y-2">
                    {instructions.steps.map((step, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="h-9 px-3 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {language === 'fr' ? "Compris" : "Got it"}
                    </Button>
                  </div>
                </>
              )}
            </div>

            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-lg text-primary-foreground/50 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
