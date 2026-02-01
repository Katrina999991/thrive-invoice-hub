/**
 * Time rounding utilities for client-based timer entries
 */

export type RoundingMethod = 'nearest' | 'up' | 'down';
export type RoundingIncrement = 3 | 6 | 15 | 30 | 60;

export interface RoundingConfig {
  enabled: boolean;
  incrementMinutes: RoundingIncrement;
  method: RoundingMethod;
}

/**
 * Round a duration in minutes according to the specified method and increment
 * @param rawMinutes - The raw duration in minutes
 * @param incrementMinutes - The rounding increment (3, 6, 15, 30, or 60 minutes)
 * @param method - The rounding method ('nearest', 'up', or 'down')
 * @returns The rounded duration in minutes (never negative, minimum of increment if raw > 0)
 */
export function roundDuration(
  rawMinutes: number,
  incrementMinutes: RoundingIncrement,
  method: RoundingMethod
): number {
  if (rawMinutes <= 0) return 0;
  
  let roundedMinutes: number;
  
  switch (method) {
    case 'up':
      roundedMinutes = Math.ceil(rawMinutes / incrementMinutes) * incrementMinutes;
      break;
    case 'down':
      roundedMinutes = Math.floor(rawMinutes / incrementMinutes) * incrementMinutes;
      break;
    case 'nearest':
    default:
      roundedMinutes = Math.round(rawMinutes / incrementMinutes) * incrementMinutes;
      break;
  }
  
  // Ensure minimum billed duration = increment when raw > 0
  if (rawMinutes > 0 && roundedMinutes === 0) {
    roundedMinutes = incrementMinutes;
  }
  
  return Math.max(0, roundedMinutes);
}

/**
 * Convert hours to minutes
 */
export function hoursToMinutes(hours: number): number {
  return Math.round(hours * 60);
}

/**
 * Convert minutes to hours with specified decimal precision
 */
export function minutesToHours(minutes: number, precision: number = 2): number {
  return parseFloat((minutes / 60).toFixed(precision));
}

/**
 * Format increment for display (e.g., "0.25h (15 min)")
 */
export function formatIncrementLabel(incrementMinutes: RoundingIncrement, language: 'fr' | 'en' = 'en'): string {
  const hourFraction = incrementMinutes / 60;
  const hourLabel = hourFraction.toFixed(2).replace(/\.?0+$/, '');
  const minLabel = language === 'fr' ? 'min' : 'min';
  return `${hourLabel}h (${incrementMinutes} ${minLabel})`;
}

/**
 * Get all available increment options with labels
 */
export function getIncrementOptions(language: 'fr' | 'en' = 'en'): Array<{ value: RoundingIncrement; label: string }> {
  const increments: RoundingIncrement[] = [15, 6, 3, 30, 60];
  return increments.map(inc => ({
    value: inc,
    label: formatIncrementLabel(inc, language)
  }));
}

/**
 * Get rounding method options with labels
 */
export function getRoundingMethodOptions(language: 'fr' | 'en' = 'en'): Array<{ value: RoundingMethod; label: string }> {
  return [
    { 
      value: 'nearest', 
      label: language === 'fr' ? 'Arrondir au plus proche' : 'Round to nearest' 
    },
    { 
      value: 'up', 
      label: language === 'fr' ? 'Arrondir au supérieur' : 'Round up' 
    },
    { 
      value: 'down', 
      label: language === 'fr' ? 'Arrondir à l\'inférieur' : 'Round down' 
    },
  ];
}

/**
 * Format duration for display showing both raw and billable
 */
export function formatDurationDisplay(
  rawMinutes: number | null | undefined,
  billedMinutes: number | null | undefined,
  hours: number,
  language: 'fr' | 'en' = 'en'
): { raw: string; billed: string; showBoth: boolean } {
  // If no raw/billed minutes data, just show hours
  if (rawMinutes === null || rawMinutes === undefined || billedMinutes === null || billedMinutes === undefined) {
    return {
      raw: `${hours.toFixed(2)}h`,
      billed: `${hours.toFixed(2)}h`,
      showBoth: false
    };
  }
  
  const rawHours = minutesToHours(rawMinutes);
  const billedHours = minutesToHours(billedMinutes);
  const showBoth = rawMinutes !== billedMinutes;
  
  return {
    raw: `${rawHours.toFixed(2)}h`,
    billed: `${billedHours.toFixed(2)}h`,
    showBoth
  };
}
