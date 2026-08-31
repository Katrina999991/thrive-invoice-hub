export type DesktopPlatform = "windows" | "linux" | "macos" | "unknown";

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function getDesktopPlatform(): DesktopPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const ua = navigator.userAgent;
  const platform = navigator.platform || "";

  if (/windows|win32|win64/i.test(ua) || /win/i.test(platform)) {
    return "windows";
  }
  if (/mac/i.test(platform) || /macintosh|mac os x/i.test(ua)) {
    return "macos";
  }
  if (/linux/i.test(ua) || /linux/i.test(platform)) {
    return "linux";
  }

  return "unknown";
}

export async function getDesktopAppVersion(): Promise<string | null> {
  if (!isTauriRuntime()) return null;

  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    return await getVersion();
  } catch (error) {
    console.error("Could not read desktop app version:", error);
    return null;
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (!isTauriRuntime()) {
    window.open(url, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("open_external_url", { url });
  } catch (error) {
    console.error("Could not open URL via Tauri, falling back to window.open:", error);
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
