import { useEffect, useMemo, useState } from "react";
import { Download, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/hooks/useLanguage";
import { getUpdateInstructions, useDesktopUpdate } from "@/hooks/useDesktopUpdate";

const DISMISSED_VERSION_KEY = "gf-desktop-update-dismissed-version";

export function DesktopUpdateBanner() {
  const { language } = useLanguage();
  const update = useDesktopUpdate();
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  useEffect(() => {
    try {
      setDismissedVersion(localStorage.getItem(DISMISSED_VERSION_KEY));
    } catch {
      setDismissedVersion(null);
    }
  }, []);

  const instructions = useMemo(
    () => getUpdateInstructions(language, update.platform, update.downloadName),
    [language, update.downloadName, update.platform],
  );

  if (!update.isDesktop || !update.updateAvailable || !update.latestVersion) {
    return null;
  }

  if (dismissedVersion === update.latestVersion) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_VERSION_KEY, update.latestVersion ?? "");
    } catch {
      // Ignore storage failures.
    }
    setDismissedVersion(update.latestVersion);
    setShowSteps(false);
  };

  const title =
    language === "fr"
      ? `Mise à jour disponible — v${update.latestVersion}`
      : `Update available — v${update.latestVersion}`;
  const currentLabel =
    language === "fr"
      ? `Version actuelle : v${update.currentVersion ?? "?"}`
      : `Current version: v${update.currentVersion ?? "?"}`;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-[440px] z-50 animate-in slide-in-from-top-4 duration-500">
      <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-background shadow-2xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary" />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground tracking-tight">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{currentLabel}</p>

              {showSteps ? (
                <div className="mt-3 rounded-lg border bg-muted/40 p-3">
                  <p className="text-sm font-medium mb-2">{instructions.title}</p>
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
                  {instructions.note && (
                    <p className="mt-3 text-xs text-muted-foreground">{instructions.note}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mt-2">
                  {language === "fr"
                    ? "Une nouvelle version de l'application est prête. Téléchargez-la, puis suivez les étapes pour remplacer cette version."
                    : "A new version of the app is ready. Download it, then follow the steps to replace this version."}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-4">
                <Button size="sm" onClick={() => void update.openDownload()} disabled={!update.downloadUrl && !update.releaseUrl}>
                  <Download className="w-4 h-4" />
                  {language === "fr" ? "Télécharger" : "Download"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSteps((value) => !value)}>
                  {showSteps
                    ? language === "fr"
                      ? "Masquer les étapes"
                      : "Hide steps"
                    : language === "fr"
                      ? "Comment mettre à jour"
                      : "How to update"}
                </Button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label={language === "fr" ? "Fermer" : "Close"}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
