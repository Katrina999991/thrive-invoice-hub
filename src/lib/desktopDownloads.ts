const DESKTOP_RELEASE_TAG = "v0.1.1";
const DESKTOP_RELEASE_BASE = `https://github.com/Katrina999991/thrive-invoice-hub/releases/download/${DESKTOP_RELEASE_TAG}`;

export const DESKTOP_DOWNLOADS = {
  windowsSetup: `${DESKTOP_RELEASE_BASE}/GestionFlow_0.1.1_x64-setup.exe`,
  linuxAppImage: `${DESKTOP_RELEASE_BASE}/GestionFlow_0.1.1_amd64.AppImage`,
  linuxDeb: `${DESKTOP_RELEASE_BASE}/GestionFlow_0.1.1_amd64.deb`,
  linuxRpm: `${DESKTOP_RELEASE_BASE}/GestionFlow-0.1.1-1.x86_64.rpm`,
} as const;
