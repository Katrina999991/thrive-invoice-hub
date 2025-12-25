import { useState, useEffect, useMemo } from 'react';

interface CurrencyInfo {
  currency: string;
  locale: string;
  symbol: string;
}

// Country code to currency mapping (priority over language)
const countryToCurrency: Record<string, string> = {
  'CA': 'CAD',
  'US': 'USD',
  'GB': 'GBP',
  'AU': 'AUD',
  'NZ': 'NZD',
  'JP': 'JPY',
  'CN': 'CNY',
  'IN': 'INR',
  'MX': 'MXN',
  'BR': 'BRL',
  // EU countries
  'FR': 'EUR',
  'DE': 'EUR',
  'ES': 'EUR',
  'IT': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'AT': 'EUR',
  'PT': 'EUR',
  'IE': 'EUR',
  'FI': 'EUR',
  'GR': 'EUR',
};

// Exchange rates (approximate, for display only - Stripe handles actual conversion)
const exchangeRatesFromCAD: Record<string, number> = {
  CAD: 1,
  USD: 0.74,
  EUR: 0.68,
  GBP: 0.58,
  AUD: 1.12,
  BRL: 3.70,
  JPY: 110,
  CNY: 5.35,
  INR: 61,
  MXN: 12.8,
};

export const useCurrencyLocale = () => {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({
    currency: 'CAD',
    locale: 'en-CA',
    symbol: '$',
  });

  useEffect(() => {
    const detectCurrency = async () => {
      // Get browser locale for formatting
      const browserLocale = navigator.language || 'en-CA';
      
      let detectedCurrency: string = 'CAD'; // Default to CAD
      
      // Priority 1: Try IP-based geolocation (most reliable)
      try {
        const response = await fetch('https://ipapi.co/json/', { 
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        if (response.ok) {
          const data = await response.json();
          const countryFromIP = data.country_code?.toUpperCase();
          if (countryFromIP && countryToCurrency[countryFromIP]) {
            detectedCurrency = countryToCurrency[countryFromIP];
          }
        }
      } catch (e) {
        // IP detection failed, try fallback methods
        console.log('IP geolocation failed, using fallback detection');
        
        // Fallback: Check if any locale contains "CA" country code
        const hasCanadianLocale = navigator.languages?.some(lang => {
          const upper = lang.toUpperCase();
          return upper.includes('-CA') || upper === 'CA';
        }) || browserLocale.toUpperCase().includes('-CA');
        
        // Fallback: Check timezone
        let isInCanadianTimezone = false;
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (timezone) {
            const canadianTimezones = [
              'America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton',
              'America/Winnipeg', 'America/Halifax', 'America/St_Johns', 'America/Regina',
              'America/Whitehorse', 'America/Yellowknife', 'America/Iqaluit', 'America/Moncton'
            ];
            isInCanadianTimezone = canadianTimezones.includes(timezone);
          }
        } catch (err) {
          // Timezone detection failed
        }
        
        if (hasCanadianLocale || isInCanadianTimezone) {
          detectedCurrency = 'CAD';
        } else {
          // Try country code from locale
          const parts = browserLocale.split('-');
          const countryCode = parts.length > 1 ? parts[1].toUpperCase() : null;
          if (countryCode && countryToCurrency[countryCode]) {
            detectedCurrency = countryToCurrency[countryCode];
          }
        }
      }
      
      // Get currency symbol
      const formatter = new Intl.NumberFormat(browserLocale, {
        style: 'currency',
        currency: detectedCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      
      const symbolParts = formatter.formatToParts(0);
      const symbolPart = symbolParts.find(p => p.type === 'currency');
      const symbol = symbolPart?.value || '$';
      
      setCurrencyInfo({
        currency: detectedCurrency,
        locale: browserLocale,
        symbol,
      });
    };

    detectCurrency();
  }, []);

  const formatPrice = useMemo(() => {
    return (priceInCAD: number, options?: { showCurrency?: boolean }) => {
      const { showCurrency = true } = options || {};
      const { currency, locale } = currencyInfo;
      
      // Convert from CAD to local currency
      const rate = exchangeRatesFromCAD[currency] || 1;
      const convertedPrice = priceInCAD * rate;
      
      // For JPY, round to whole number; for others, keep 2 decimals
      const finalPrice = currency === 'JPY' ? Math.round(convertedPrice) : convertedPrice;
      
      if (showCurrency) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: currency === 'JPY' ? 0 : 2,
          maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(finalPrice);
      }
      
      return finalPrice.toFixed(currency === 'JPY' ? 0 : 2);
    };
  }, [currencyInfo]);

  const formatPriceCAD = (priceInCAD: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(priceInCAD);
  };

  return {
    ...currencyInfo,
    formatPrice,
    formatPriceCAD,
    isLocalCurrency: currencyInfo.currency !== 'CAD',
  };
};
