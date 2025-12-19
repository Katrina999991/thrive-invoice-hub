import { useState, useEffect } from "react";
import { X, Download, Sparkles } from "lucide-react";
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

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useLanguage();

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

    // Listen for future events
    const handleBeforeInstallPrompt = (e: Event) => {
      console.log("PWA Banner: beforeinstallprompt event received");
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowBanner(false);
      localStorage.setItem(STORAGE_KEY, "installed");
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem(STORAGE_KEY, "dismissed");
  };

  if (!showBanner) return null;

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
