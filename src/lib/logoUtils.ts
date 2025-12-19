/**
 * Centralized logo utility for consistent logo handling across UI and PDFs
 * 
 * This module provides:
 * - Consistent sizing constraints for logos
 * - Aspect ratio preservation (contain behavior)
 * - Support for transparent, white, or colored backgrounds
 * - Fallback handling when logo fails to load
 */

// ============= LOGO SIZE CONSTANTS =============
// These ensure consistent logo display across the application

export const LOGO_SIZES = {
  // UI containers
  ui: {
    companyCard: { maxWidth: 40, maxHeight: 40 },      // Company list cards
    companyHeader: { maxWidth: 64, maxHeight: 64 },    // Company detail headers
    invoicePreview: { maxWidth: 80, maxHeight: 40 },   // Invoice preview in UI
  },
  // PDF containers (in mm for jsPDF)
  pdf: {
    invoice: { maxWidth: 45, maxHeight: 25 },          // Invoice/Quote headers
    report: { maxWidth: 40, maxHeight: 20 },           // Report headers
  }
} as const;

// ============= LOGO DATA INTERFACE =============
export interface LogoData {
  data: string;          // Base64 data URL
  format: string;        // Image format (PNG, JPEG, etc.)
  width: number;         // Natural width in pixels
  height: number;        // Natural height in pixels
}

export interface ScaledLogoDimensions {
  width: number;
  height: number;
}

// ============= LOGO LOADING =============

/**
 * Load a logo from URL and get its dimensions
 * Returns null if the logo fails to load
 */
export async function loadLogo(logoUrl: string): Promise<LogoData | null> {
  try {
    const response = await fetch(logoUrl);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    
    // Determine format from MIME type
    let format = 'PNG';
    if (blob.type.includes('jpeg') || blob.type.includes('jpg')) format = 'JPEG';
    else if (blob.type.includes('gif')) format = 'GIF';
    else if (blob.type.includes('webp')) format = 'WEBP';
    else if (blob.type.includes('svg')) format = 'SVG';

    return new Promise((resolve) => {
      const reader = new FileReader();
      const img = new Image();
      
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        img.onload = () => {
          resolve({ 
            data: dataUrl, 
            format, 
            width: img.naturalWidth, 
            height: img.naturalHeight 
          });
        };
        img.onerror = () => {
          // Return with default dimensions if image fails to load
          resolve({ data: dataUrl, format, width: 100, height: 100 });
        };
        img.src = dataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ============= LOGO SCALING =============

/**
 * Calculate scaled dimensions for a logo to fit within a container
 * Uses "contain" behavior - logo fits inside without cropping or distortion
 * Does NOT scale up beyond natural resolution
 * 
 * @param naturalWidth - Original width of the logo
 * @param naturalHeight - Original height of the logo
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @param allowUpscale - Whether to scale up small logos (default: false)
 */
export function calculateLogoDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
  maxHeight: number,
  allowUpscale: boolean = false
): ScaledLogoDimensions {
  // Handle edge cases
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return { width: maxWidth, height: maxHeight };
  }

  const aspectRatio = naturalWidth / naturalHeight;
  
  let width = naturalWidth;
  let height = naturalHeight;
  
  // Scale down if larger than container
  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  // Only scale up if explicitly allowed (not recommended for logos)
  if (allowUpscale && width < maxWidth && height < maxHeight) {
    const scaleX = maxWidth / width;
    const scaleY = maxHeight / height;
    const scale = Math.min(scaleX, scaleY);
    width *= scale;
    height *= scale;
  }
  
  return { width, height };
}

/**
 * Calculate logo dimensions for PDF placement
 * Returns dimensions in mm for jsPDF
 */
export function calculatePdfLogoDimensions(
  logo: LogoData,
  context: 'invoice' | 'report' = 'invoice'
): ScaledLogoDimensions {
  const constraints = LOGO_SIZES.pdf[context];
  return calculateLogoDimensions(
    logo.width,
    logo.height,
    constraints.maxWidth,
    constraints.maxHeight,
    false // Never upscale in PDFs
  );
}

// ============= CSS CLASS HELPERS =============

/**
 * Get CSS classes for logo container (UI display)
 * Ensures proper contain behavior with centered alignment
 */
export function getLogoContainerClasses(size: keyof typeof LOGO_SIZES.ui = 'companyCard'): string {
  const baseClasses = 'flex items-center justify-center overflow-hidden';
  
  switch (size) {
    case 'companyCard':
      return `${baseClasses} w-10 h-10`;
    case 'companyHeader':
      return `${baseClasses} w-16 h-16`;
    case 'invoicePreview':
      return `${baseClasses} w-20 h-10`;
    default:
      return `${baseClasses} w-10 h-10`;
  }
}

/**
 * Get CSS classes for the logo image itself
 * Uses object-contain to preserve aspect ratio without cropping
 */
export function getLogoImageClasses(): string {
  return 'max-w-full max-h-full w-auto h-auto object-contain';
}

// ============= REACT COMPONENT HELPERS =============

/**
 * Get inline styles for logo container with custom dimensions
 */
export function getLogoContainerStyle(maxWidth: number, maxHeight: number): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: maxWidth,
    height: maxHeight,
    overflow: 'hidden',
  };
}

/**
 * Get inline styles for logo image with contain behavior
 */
export function getLogoImageStyle(): React.CSSProperties {
  return {
    maxWidth: '100%',
    maxHeight: '100%',
    width: 'auto',
    height: 'auto',
    objectFit: 'contain' as const,
  };
}
