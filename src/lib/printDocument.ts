/**
 * Universal document print utility.
 * 
 * Supports: Web browsers, PWA, and future native apps (Capacitor/WebView).
 * 
 * Strategy:
 * 1. Native handler (Capacitor plugin or custom bridge) — if available
 * 2. Hidden iframe + print() — reliable cross-browser approach
 * 3. Fallback: open blob in new tab
 */

declare global {
  interface Window {
    /** Native print handler injected by Capacitor or WebView bridge */
    nativePrintHandler?: (blobUrl: string) => void;
    /** Capacitor global object */
    Capacitor?: { isNativePlatform: () => boolean };
  }
}

export type PrintEnvironment = 'native' | 'web';

/** Detect current execution environment */
export const detectEnvironment = (): PrintEnvironment => {
  if (window.Capacitor?.isNativePlatform?.()) return 'native';
  if (window.nativePrintHandler) return 'native';
  return 'web';
};

/**
 * Print a PDF blob reliably across all environments.
 * 
 * @param blob - The PDF blob to print
 * @returns A cleanup function, or void
 */
export const printPdfBlob = (blob: Blob): void => {
  const blobUrl = URL.createObjectURL(blob);
  const env = detectEnvironment();

  // --- Native path (Capacitor / WebView bridge) ---
  if (env === 'native' && window.nativePrintHandler) {
    window.nativePrintHandler(blobUrl);
    return;
  }

  // --- Web / PWA path: iframe with blob URL ---
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  iframe.src = blobUrl;
  document.body.appendChild(iframe);

  iframe.onload = () => {
    // Delay to let the browser's built-in PDF viewer fully render the content
    setTimeout(() => {
      try {
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Iframe print failed:', e);
        window.open(blobUrl, '_blank');
      } finally {
        setTimeout(() => {
          try { document.body.removeChild(iframe); } catch { /* noop */ }
          URL.revokeObjectURL(blobUrl);
        }, 60_000);
      }
    }, 1000);
  };

  iframe.onerror = () => {
    console.error('Iframe failed to load.');
    window.open(blobUrl, '_blank');
    try { document.body.removeChild(iframe); } catch { /* noop */ }
    URL.revokeObjectURL(blobUrl);
  };
};

/**
 * Download a PDF blob as a file (universal fallback).
 */
export const downloadPdfBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
};
