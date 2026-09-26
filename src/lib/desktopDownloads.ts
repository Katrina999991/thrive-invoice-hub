const DESKTOP_RELEASE_TAG = "v0.1.1";
const DESKTOP_RELEASE_BASE = `https://github.com/Katrina999991/thrive-invoice-hub/releases/download/${DESKTOP_RELEASE_TAG}`;

export const DESKTOP_DOWNLOAD_FILES = {
  windowsSetup: "GestionFlow_0.1.1_windows.zip",
  linuxAppImage: "GestionFlow_0.1.1_amd64.AppImage",
  linuxDeb: "GestionFlow_0.1.1_amd64.deb",
  linuxRpm: "GestionFlow-0.1.1-1.x86_64.rpm",
  macosDmg: "GestionFlow_0.1.1_aarch64.dmg",
} as const;

const githubUrl = (file: string) => `${DESKTOP_RELEASE_BASE}/${file}`;
const siteUrl = (file: string) => `/downloads/${file}`;

export const DESKTOP_DOWNLOADS = {
  windowsSetup: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.windowsSetup)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.windowsSetup),
  linuxAppImage: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.linuxAppImage)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.linuxAppImage),
  linuxRepo: "/rpm/gestionflow.repo",
  linuxGpgKey: "/rpm/RPM-GPG-KEY-gestionflow",
  linuxDeb: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.linuxDeb)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.linuxDeb),
  linuxRpm: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.linuxRpm)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.linuxRpm),
  macosDmg: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.macosDmg)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.macosDmg),
} as const;
