const DESKTOP_RELEASE_TAG = "v0.1.1";
const DESKTOP_RELEASE_BASE = `https://github.com/Katrina999991/thrive-invoice-hub/releases/download/${DESKTOP_RELEASE_TAG}`;

export const DESKTOP_DOWNLOAD_FILES = {
  windowsSetup: "GestionFlow_0.1.1_x64-setup.exe",
  linuxAppImage: "GestionFlow_0.1.1_amd64.AppImage",
  linuxDeb: "GestionFlow_0.1.1_amd64.deb",
  linuxRpm: "GestionFlow-0.1.1-1.x86_64.rpm",
} as const;

const githubUrl = (file: string) => `${DESKTOP_RELEASE_BASE}/${file}`;
const siteUrl = (file: string) => `/downloads/${file}`;

export const DESKTOP_DOWNLOADS = {
  windowsSetup: githubUrl(DESKTOP_DOWNLOAD_FILES.windowsSetup),
  linuxAppImage: githubUrl(DESKTOP_DOWNLOAD_FILES.linuxAppImage),
  // Same-origin package files so Fedora/KDE does not open Discover
  // on application/x-rpm instead of downloading the file.
  linuxDeb: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.linuxDeb)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.linuxDeb),
  linuxRpm: import.meta.env.PROD
    ? siteUrl(DESKTOP_DOWNLOAD_FILES.linuxRpm)
    : githubUrl(DESKTOP_DOWNLOAD_FILES.linuxRpm),
} as const;
