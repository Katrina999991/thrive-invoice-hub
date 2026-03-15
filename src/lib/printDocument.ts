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

  // --- Web / PWA path: hidden iframe with embedded PDF ---
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;border:none;opacity:0;';
  document.body.appendChild(iframe);

  let hasPrinted = false;

  const doPrint = () => {
    if (hasPrinted) return;
    hasPrinted = true;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      window.open(blobUrl, '_blank');
    }
    setTimeout(() => {
      try { document.body.removeChild(iframe); } catch { /* already removed */ }
      URL.revokeObjectURL(blobUrl);
    }, 120_000);
  };

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(
      `<!DOCTYPE html><html><head><title>Print</title></head>` +
      `<body style="margin:0;padding:0;">` +
      `<embed src="${blobUrl}" type="application/pdf" width="100%" height="100%" ` +
      `style="position:fixed;top:0;left:0;width:100%;height:100%;">` +
      `</body></html>`
    );
    iframeDoc.close();

    const embed = iframeDoc.querySelector('embed');
    if (embed) {
      embed.addEventListener('load', doPrint);
    }
    // Fallback timeout in case embed load event doesn't fire
    setTimeout(doPrint, 1500);
  } else {
    window.open(blobUrl, '_blank');
    try { document.body.removeChild(iframe); } catch { /* noop */ }
    URL.revokeObjectURL(blobUrl);
  }
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
