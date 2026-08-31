import { useCallback, useEffect, useMemo, useState } from "react";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import {
  getDesktopAppVersion,
  getDesktopPlatform,
  isTauriRuntime,
  openExternalUrl,
  type DesktopPlatform,
} from "@/lib/desktopRuntime";

const GITHUB_REPO = "Katrina999991/thrive-invoice-hub";
const GITHUB_LATEST_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const DOWNLOAD_PAGE_URL = "https://gestionflow.net";
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const CACHE_KEY = "gf-desktop-update-cache";

export interface DesktopReleaseAsset {
  name: string;
  browser_download_url: string;
}

export interface DesktopUpdateState {
  isDesktop: boolean;
  platform: DesktopPlatform;
  currentVersion: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
  downloadUrl: string | null;
  downloadName: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
  checking: boolean;
  error: string | null;
  websiteUrl: string;
}

interface GithubRelease {
  tag_name?: string;
  html_url?: string;
  body?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
  }>;
}

interface CachedCheck {
  checkedAt: number;
  currentVersion: string | null;
  latestVersion: string | null;
  downloadUrl: string | null;
  downloadName: string | null;
  releaseUrl: string | null;
  releaseNotes: string | null;
}

function normalizeVersion(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().replace(/^v/i, "");
  return trimmed.length > 0 ? trimmed : null;
}

export function compareVersions(current: string, latest: string): number {
  const parse = (value: string) =>
    value
      .split(/[.-]/)
      .map((part) => {
        const numeric = parseInt(part, 10);
        return Number.isNaN(numeric) ? 0 : numeric;
      });

  const a = parse(current);
  const b = parse(latest);
  const length = Math.max(a.length, b.length);

  for (let i = 0; i < length; i += 1) {
    const left = a[i] ?? 0;
    const right = b[i] ?? 0;
    if (left > right) return 1;
    if (left < right) return -1;
  }

  return 0;
}

function pickAsset(
  assets: DesktopReleaseAsset[],
  platform: DesktopPlatform,
): DesktopReleaseAsset | null {
  const by = (pattern: RegExp) => assets.find((asset) => pattern.test(asset.name)) ?? null;

  if (platform === "windows") {
    return by(/x64-setup\.exe$/i) || by(/_x64_en-US\.msi$/i) || by(/\.msi$/i);
  }

  if (platform === "linux") {
    return by(/amd64\.AppImage$/i) || by(/\.AppImage$/i) || by(/amd64\.deb$/i);
  }

  if (platform === "macos") {
    return by(/aarch64\.dmg$/i) || by(/\.dmg$/i);
  }

  return null;
}

function readCache(): CachedCheck | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedCheck;
    if (!parsed || typeof parsed.checkedAt !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache: CachedCheck) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Ignore quota / private-mode failures.
  }
}

let inFlightCheck: Promise<GithubRelease> | null = null;

async function fetchLatestRelease(): Promise<GithubRelease> {
  if (inFlightCheck) return inFlightCheck;

  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "GestionFlow",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  inFlightCheck = (async () => {
    const response = isTauriRuntime()
      ? await tauriFetch(GITHUB_LATEST_URL, { method: "GET", headers })
      : await fetch(GITHUB_LATEST_URL, { method: "GET", headers });

    if (!response.ok) {
      throw new Error(`GitHub release check failed (${response.status})`);
    }

    return (await response.json()) as GithubRelease;
  })();

  try {
    return await inFlightCheck;
  } finally {
    inFlightCheck = null;
  }
}

const initialState: DesktopUpdateState = {
  isDesktop: false,
  platform: "unknown",
  currentVersion: null,
  latestVersion: null,
  updateAvailable: false,
  downloadUrl: null,
  downloadName: null,
  releaseUrl: null,
  releaseNotes: null,
  checking: false,
  error: null,
  websiteUrl: DOWNLOAD_PAGE_URL,
};

export function useDesktopUpdate() {
  const isDesktop = isTauriRuntime();
  const platform = useMemo(() => (isDesktop ? getDesktopPlatform() : "unknown"), [isDesktop]);
  const [state, setState] = useState<DesktopUpdateState>({
    ...initialState,
    isDesktop,
    platform,
    checking: isDesktop,
  });

  const applyResult = useCallback(
    (
      currentVersion: string | null,
      latestVersion: string | null,
      asset: DesktopReleaseAsset | null,
      releaseUrl: string | null,
      releaseNotes: string | null,
      error: string | null,
    ) => {
      const updateAvailable = Boolean(
        currentVersion &&
          latestVersion &&
          compareVersions(currentVersion, latestVersion) < 0,
      );

      setState({
        isDesktop,
        platform,
        currentVersion,
        latestVersion,
        updateAvailable,
        downloadUrl: updateAvailable ? asset?.browser_download_url ?? null : null,
        downloadName: updateAvailable ? asset?.name ?? null : null,
        releaseUrl: updateAvailable ? releaseUrl : null,
        releaseNotes: updateAvailable ? releaseNotes : null,
        checking: false,
        error,
        websiteUrl: DOWNLOAD_PAGE_URL,
      });
    },
    [isDesktop, platform],
  );

  const checkNow = useCallback(
    async (force = false) => {
      if (!isDesktop) return;

      const currentVersion = await getDesktopAppVersion();
      const cached = readCache();
      const cacheIsFresh =
        cached &&
        cached.currentVersion === currentVersion &&
        Date.now() - cached.checkedAt < CHECK_INTERVAL_MS;

      if (!force && cacheIsFresh && cached) {
        applyResult(
          cached.currentVersion,
          cached.latestVersion,
          cached.downloadUrl && cached.downloadName
            ? { name: cached.downloadName, browser_download_url: cached.downloadUrl }
            : null,
          cached.releaseUrl,
          cached.releaseNotes,
          null,
        );
        return;
      }

      setState((prev) => ({ ...prev, checking: true, error: null }));

      try {
        const release = await fetchLatestRelease();
        if (release.draft || release.prerelease) {
          throw new Error("Latest GitHub release is not a stable build");
        }

        const latestVersion = normalizeVersion(release.tag_name);
        const assets: DesktopReleaseAsset[] = (release.assets ?? [])
          .filter((asset): asset is DesktopReleaseAsset =>
            Boolean(asset.name && asset.browser_download_url),
          )
          .map((asset) => ({
            name: asset.name as string,
            browser_download_url: asset.browser_download_url as string,
          }));
        const asset = pickAsset(assets, platform);

        writeCache({
          checkedAt: Date.now(),
          currentVersion,
          latestVersion,
          downloadUrl: asset?.browser_download_url ?? null,
          downloadName: asset?.name ?? null,
          releaseUrl: release.html_url ?? null,
          releaseNotes: release.body ?? null,
        });

        applyResult(
          currentVersion,
          latestVersion,
          asset,
          release.html_url ?? null,
          release.body ?? null,
          null,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update check failed";
        if (cached) {
          applyResult(
            cached.currentVersion,
            cached.latestVersion,
            cached.downloadUrl && cached.downloadName
              ? { name: cached.downloadName, browser_download_url: cached.downloadUrl }
              : null,
            cached.releaseUrl,
            cached.releaseNotes,
            message,
          );
          return;
        }

        applyResult(currentVersion, null, null, null, null, message);
      }
    },
    [applyResult, isDesktop, platform],
  );

  useEffect(() => {
    if (!isDesktop) return;
    void checkNow(false);
  }, [checkNow, isDesktop]);

  const openDownload = useCallback(async () => {
    const url = state.downloadUrl || state.releaseUrl || DOWNLOAD_PAGE_URL;
    await openExternalUrl(url);
  }, [state.downloadUrl, state.releaseUrl]);

  const openWebsite = useCallback(async () => {
    await openExternalUrl(DOWNLOAD_PAGE_URL);
  }, []);

  return {
    ...state,
    checkNow,
    openDownload,
    openWebsite,
  };
}

export function getUpdateInstructions(
  language: "fr" | "en",
  platform: DesktopPlatform,
  downloadName: string | null,
): { title: string; steps: string[]; note: string | null } {
  const fileHint = downloadName ? ` (${downloadName})` : "";

  if (language === "fr") {
    if (platform === "windows") {
      return {
        title: "Comment mettre à jour sur Windows",
        steps: [
          `Téléchargez le nouvel installateur${fileHint}.`,
          "Fermez GestionFlow complètement.",
          "Exécutez le fichier .exe téléchargé. L'installateur remplace la version actuelle.",
          "Relancez GestionFlow.",
        ],
        note: "Vous pouvez aussi le télécharger depuis gestionflow.net, section « GestionFlow sur ordinateur ».",
      };
    }

    if (platform === "linux") {
      return {
        title: "Comment mettre à jour sur Linux",
        steps: [
          `Téléchargez le nouvel AppImage${fileHint} depuis gestionflow.net.`,
          "Fermez GestionFlow complètement.",
          "Clic droit sur le nouveau fichier → Propriétés → Permissions : cochez « Allow executing file as program ».",
          "Double-cliquez le nouveau fichier (s'il demande « Exécuter », confirmez). Vous pouvez supprimer l'ancien AppImage.",
        ],
        note: "Pas de mot de passe administrateur. Si vous aviez installé le .deb, téléchargez le nouveau .deb et installez-le par-dessus.",
      };
    }

    if (platform === "macos") {
      return {
        title: "Comment mettre à jour sur macOS",
        steps: [
          `Téléchargez le nouveau fichier .dmg${fileHint}.`,
          "Fermez GestionFlow complètement.",
          "Ouvrez le .dmg et glissez GestionFlow dans le dossier Applications en remplaçant l'ancienne copie.",
          "Relancez GestionFlow.",
        ],
        note: downloadName
          ? null
          : "Le fichier macOS n'est pas encore publié. La mise à jour sera proposée ici dès qu'il sera disponible.",
      };
    }

    return {
      title: "Comment mettre à jour",
      steps: [
        "Téléchargez la nouvelle version depuis gestionflow.net.",
        "Fermez GestionFlow.",
        "Installez ou remplacez l'application, puis relancez-la.",
      ],
      note: null,
    };
  }

  if (platform === "windows") {
    return {
      title: "How to update on Windows",
      steps: [
        `Download the new installer${fileHint}.`,
        "Quit GestionFlow completely.",
        "Run the downloaded .exe file. The installer replaces the current version.",
        "Open GestionFlow again.",
      ],
      note: "You can also download it from gestionflow.net, in the “GestionFlow for desktop” section.",
    };
  }

  if (platform === "linux") {
    return {
      title: "How to update on Linux",
      steps: [
        `Download the new AppImage${fileHint} from gestionflow.net.`,
        "Quit GestionFlow completely.",
        "Right-click the new file → Properties → Permissions: check “Allow executing file as program”.",
        "Double-click the new file (if it asks to Run, confirm). You can delete the old AppImage.",
      ],
      note: "No administrator password. If you installed the .deb package, download the new .deb and install it over the current one.",
    };
  }

  if (platform === "macos") {
    return {
      title: "How to update on macOS",
      steps: [
        `Download the new .dmg file${fileHint}.`,
        "Quit GestionFlow completely.",
        "Open the .dmg and drag GestionFlow into Applications, replacing the old copy.",
        "Open GestionFlow again.",
      ],
      note: downloadName
        ? null
        : "The macOS build is not published yet. The update will appear here once it is available.",
    };
  }

  return {
    title: "How to update",
    steps: [
      "Download the new version from gestionflow.net.",
      "Quit GestionFlow.",
      "Install or replace the app, then open it again.",
    ],
    note: null,
  };
}
