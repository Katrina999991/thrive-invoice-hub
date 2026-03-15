/**
 * Universal document print utility.
 * 
 * Supports: Web browsers, PWA, and future native apps (Capacitor/WebView).
 * 
 * Strategy for web: Print HTML content via hidden iframe (no blob URLs, no new tabs).
 * Strategy for native: Delegate to native handler.
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
 * Print HTML content reliably across all environments.
 * No blob URLs, no new tabs — works in Brave, Chrome, Edge, Safari, PWA.
 *
 * @param htmlContent - Full HTML string to print
 */
export const printHtmlContent = (htmlContent: string): void => {
  const env = detectEnvironment();

  // --- Native path ---
  if (env === 'native' && window.nativePrintHandler) {
    // For native, generate a data URI and pass it
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.nativePrintHandler(blobUrl);
    return;
  }

  // --- Web / PWA path: hidden iframe with injected HTML ---
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.top = '-10000px';
  iframe.style.left = '-10000px';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) {
    console.error('Cannot access iframe document');
    document.body.removeChild(iframe);
    return;
  }

  iframeDoc.open();
  iframeDoc.write(htmlContent);
  iframeDoc.close();

  // Wait for content to render, then print
  const triggerPrint = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failed:', e);
      }
      // Cleanup after print dialog closes
      setTimeout(() => {
        try { document.body.removeChild(iframe); } catch { /* noop */ }
      }, 5000);
    }, 500);
  };

  // Listen for load (images, fonts) or use timeout
  if (iframe.contentWindow) {
    iframe.contentWindow.onload = triggerPrint;
  }
  // Fallback if onload doesn't fire
  setTimeout(triggerPrint, 2000);
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
