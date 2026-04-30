/**
 * Detects whether the app is running on the dedicated admin host.
 *
 * The admin app is served on `admin.gestionflow.net`. For local/preview
 * testing you can also force admin mode with `?admin=1` in the URL.
 */
export function isAdminHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  if (host === "admin.gestionflow.net") return true;
  if (host.startsWith("admin.")) return true;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin") === "1") {
      sessionStorage.setItem("force_admin_app", "1");
      return true;
    }
    if (sessionStorage.getItem("force_admin_app") === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}
