import { useMemo } from "react";
import { CheckCircle2, Download, Monitor, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { getUpdateInstructions, useDesktopUpdate } from "@/hooks/useDesktopUpdate";

export function DesktopUpdateSection() {
  const { language } = useLanguage();
  const update = useDesktopUpdate();
  const instructions = useMemo(
    () => getUpdateInstructions(language, update.platform, update.downloadName),
    [language, update.downloadName, update.platform],
  );

  if (!update.isDesktop) return null;

  const platformLabel =
    update.platform === "windows"
      ? "Windows"
      : update.platform === "linux"
        ? "Linux"
        : update.platform === "macos"
          ? "macOS"
          : language === "fr"
            ? "Ordinateur"
            : "Desktop";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          {language === "fr" ? "Application ordinateur" : "Desktop app"}
        </CardTitle>
        <CardDescription>
          {language === "fr"
            ? "Version installée et mises à jour de GestionFlow."
            : "Installed version and GestionFlow updates."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {language === "fr" ? "Version actuelle" : "Current version"} · {platformLabel}
            </p>
            <p className="text-lg font-semibold">v{update.currentVersion ?? "—"}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void update.checkNow(true)}
            disabled={update.checking}
          >
            <RefreshCw className={`h-4 w-4 ${update.checking ? "animate-spin" : ""}`} />
            {update.checking
              ? language === "fr"
                ? "Vérification..."
                : "Checking..."
              : language === "fr"
                ? "Vérifier les mises à jour"
                : "Check for updates"}
          </Button>
        </div>

        {update.updateAvailable ? (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <RefreshCw className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium">
                  {language === "fr"
                    ? `Mise à jour disponible : v${update.latestVersion}`
                    : `Update available: v${update.latestVersion}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {language === "fr"
                    ? "Téléchargez la nouvelle version, fermez l'application, puis installez-la par-dessus."
                    : "Download the new version, quit the app, then install it over the current one."}
                </p>
              </div>
            </div>

            <div>
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

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void update.openDownload()}>
                <Download className="h-4 w-4" />
                {language === "fr" ? "Télécharger la mise à jour" : "Download update"}
              </Button>
              <Button variant="outline" onClick={() => void update.openWebsite()}>
                {language === "fr" ? "Ouvrir le site" : "Open website"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                {language === "fr" ? "Vous avez la dernière version" : "You're on the latest version"}
              </p>
              <p className="text-sm text-muted-foreground">
                {update.latestVersion
                  ? language === "fr"
                    ? `Dernière version publiée : v${update.latestVersion}`
                    : `Latest published version: v${update.latestVersion}`
                  : language === "fr"
                    ? "La vérification se fera automatiquement au prochain lancement."
                    : "The app will check again the next time it launches."}
              </p>
            </div>
          </div>
        )}

        {update.error && !update.updateAvailable && (
          <p className="text-xs text-muted-foreground">
            {language === "fr"
              ? `Vérification impossible pour le moment. Vous pouvez aussi télécharger la dernière version sur gestionflow.net. (${update.error})`
              : `Could not check right now. You can also download the latest version from gestionflow.net. (${update.error})`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
