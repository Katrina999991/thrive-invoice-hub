import { useState, useEffect, useCallback } from "react";
import { X, Download, Sparkles, Share, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "pwa-install-banner-dismissed";
const STORAGE_TIMESTAMP_KEY = "pwa-install-banner-dismissed-at";
const DISMISS_DURATION_DAYS = 7;

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
  if (typeof navigator === "undefined") return { isIOS: false, isSafari: false, isChrome: false, isAndroid: false, isMobile: false };
  
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isChrome = /chrome/i.test(ua) && !/edge/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isMobile = isIOS || isAndroid || /mobile/i.test(ua);
  
  return { isIOS, isSafari, isChrome, isAndroid, isMobile };
};

// Check if dismiss period has expired
const isDismissPeriodExpired = (): boolean => {
  const dismissedAt = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
  if (!dismissedAt) return true;
  
  const dismissedTime = parseInt(dismissedAt, 10);
  const now = Date.now();
  const daysSinceDismiss = (now - dismissedTime) / (1000 * 60 * 60 * 24);
  
  return daysSinceDismiss >= DISMISS_DURATION_DAYS;
};

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);
  const { language } = useLanguage();
  const browserInfo = getBrowserInfo();

  // Function to show banner (can be triggered externally)
  const showBannerIfEligible = useCallback(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if permanently dismissed or installed
    const dismissState = localStorage.getItem(STORAGE_KEY);
    if (dismissState === "installed" || dismissState === "permanently_dismissed") {
      return;
    }

    // Check if dismiss period expired
    if (!isDismissPeriodExpired()) {
      return;
    }

    // Show the banner
    if (deferredPromptGlobal) {
      setDeferredPrompt(deferredPromptGlobal);
      setShowBanner(true);
    } else if (browserInfo.isIOS || browserInfo.isAndroid) {
      setShowBanner(true);
      setShowManualInstructions(true);
    }
  }, [browserInfo.isIOS, browserInfo.isAndroid]);

  useEffect(() => {
    console.log("PWA Banner: Component mounted");
    
    // Check if permanently dismissed or installed
    const dismissState = localStorage.getItem(STORAGE_KEY);
    if (dismissState === "installed" || dismissState === "permanently_dismissed") {
      console.log("PWA Banner: Permanently dismissed or installed");
      return;
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      console.log("PWA Banner: Already installed (standalone mode)");
      return;
    }

    // Check if dismiss period has not expired
    if (!isDismissPeriodExpired()) {
      console.log("PWA Banner: Dismissed recently, waiting for period to expire");
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

  // Listen for custom event to trigger banner (e.g., after first invoice/expense)
  useEffect(() => {
    const handlePwaPromptEvent = () => {
      console.log("PWA Banner: Triggered via gf-pwa-prompt event");
      showBannerIfEligible();
    };

    window.addEventListener("gf-pwa-prompt", handlePwaPromptEvent);

    return () => {
      window.removeEventListener("gf-pwa-prompt", handlePwaPromptEvent);
    };
  }, [showBannerIfEligible]);

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
        localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
      }
    } catch (error) {
      console.error("PWA install error:", error);
      setShowManualInstructions(true);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    // Store timestamp for 7-day delay
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  };

  const handleDontShowAgain = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, "permanently_dismissed");
    localStorage.setItem(STORAGE_TIMESTAMP_KEY, Date.now().toString());
  };

  if (!showBanner) return null;

  // Device-specific copy
  const getDeviceSpecificCopy = () => {
    if (browserInfo.isMobile) {
      return {
        title: language === 'fr' ? "Installer GestionFlow" : "Install GestionFlow",
        description: language === 'fr' 
          ? "Ajoutez GestionFlow à votre écran d'accueil pour un accès rapide."
          : "Add GestionFlow to your Home Screen for quick access."
      };
    }
    return {
      title: language === 'fr' ? "Installer GestionFlow" : "Install GestionFlow",
      description: language === 'fr'
        ? "Installez GestionFlow sur votre ordinateur pour un accès plus rapide."
        : "Install GestionFlow on your computer for faster access."
    };
  };

  const deviceCopy = getDeviceSpecificCopy();

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
                    {deviceCopy.title}
                  </h3>
                  <p className="text-primary-foreground/80 text-sm mt-1 leading-relaxed">
                    {deviceCopy.description}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-4">
                    <Button
                      size="sm"
                      onClick={handleInstall}
                      className="h-9 px-4 bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {language === 'fr' ? "Installer" : "Install"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="h-9 px-3 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
                    >
                      {language === 'fr' ? "Plus tard" : "Later"}
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