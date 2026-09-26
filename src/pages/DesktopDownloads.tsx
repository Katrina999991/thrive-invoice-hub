import { Download, Laptop, Monitor } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/useLanguage";
import { DESKTOP_DOWNLOAD_FILES, DESKTOP_DOWNLOADS } from "@/lib/desktopDownloads";

const downloadItems = [
  { key: "windows", icon: Monitor, file: "windowsSetup" as const, label: "Windows", descriptionFr: "Installateur Windows (.exe)", descriptionEn: "Windows installer (.exe)" },
  { key: "macos", icon: Laptop, file: "macosDmg" as const, label: "macOS", descriptionFr: "Application macOS (.dmg)", descriptionEn: "macOS application (.dmg)" },
  { key: "appimage", icon: Laptop, file: "linuxAppImage" as const, label: "Linux AppImage", descriptionFr: "Recommandé pour Linux", descriptionEn: "Recommended for Linux" },
  { key: "deb", icon: Laptop, file: "linuxDeb" as const, label: "Ubuntu / Debian", descriptionFr: "Paquet .deb", descriptionEn: ".deb package" },
  { key: "rpm", icon: Laptop, file: "linuxRpm" as const, label: "Fedora / RHEL", descriptionFr: "Paquet .rpm", descriptionEn: ".rpm package" },
] as const;

export default function DesktopDownloads() {
  const { language } = useLanguage();
  const isFrench = language === "fr";

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          {isFrench ? "Télécharger GestionFlow" : "Download GestionFlow"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isFrench
            ? "Installez GestionFlow sur votre ordinateur. Les fichiers sont servis depuis votre compte GestionFlow."
            : "Install GestionFlow on your computer. Files are served from your GestionFlow account."}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            {isFrench ? "Applications natives" : "Native applications"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {downloadItems.map(({ key, icon: Icon, file, label, descriptionFr, descriptionEn }) => (
            <Card key={key} className="border-border">
              <CardContent className="flex h-full flex-col gap-4 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">{label}</h2>
                  </div>
                  {key === "appimage" && <Badge variant="secondary">{isFrench ? "Recommandé" : "Recommended"}</Badge>}
                </div>
                <p className="flex-1 text-sm text-muted-foreground">
                  {isFrench ? descriptionFr : descriptionEn}
                </p>
                <Button asChild className="w-full gap-2">
                  <a href={DESKTOP_DOWNLOADS[file]} download={DESKTOP_DOWNLOAD_FILES[file]}>
                    <Download className="h-4 w-4" />
                    {isFrench ? "Télécharger" : "Download"}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
