import { useState } from 'react';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showFallbackIcon?: boolean;
}

const SIZE_CLASSES = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
} as const;

const ICON_SIZES = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
  xl: 'h-10 w-10',
} as const;

/**
 * CompanyLogo - A reusable component for displaying company logos
 * 
 * Features:
 * - Consistent contain behavior (no stretching or cropping)
 * - Automatic fallback to company icon when logo fails to load
 * - Support for transparent, white, or colored backgrounds
 * - Multiple size presets
 */
export function CompanyLogo({ 
  logoUrl, 
  companyName, 
  size = 'md',
  className,
  showFallbackIcon = true 
}: CompanyLogoProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const showImage = logoUrl && !imageError;
  const showFallback = !showImage && showFallbackIcon;

  return (
    <div 
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-lg bg-primary/10 flex-shrink-0',
        SIZE_CLASSES[size],
        className
      )}
      title={companyName}
    >
      {showImage && (
        <img
          src={logoUrl}
          alt={`${companyName} logo`}
          className={cn(
            'max-w-full max-h-full w-auto h-auto object-contain',
            !imageLoaded && 'opacity-0'
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}
      {showFallback && (
        <Building2 className={cn('text-primary', ICON_SIZES[size])} />
      )}
    </div>
  );
}

export default CompanyLogo;
