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
    const detectCurrency = () => {
      // Get browser locale
      const browserLocale = navigator.language || 'en-CA';
      
      // Extract country code from locale (e.g., "fr-CA" -> "CA", "en-US" -> "US")
      const parts = browserLocale.split('-');
      const countryCode = parts.length > 1 ? parts[1].toUpperCase() : null;
      
      // Check if user is in Canada via timezone (most reliable for Canadian users)
      let isInCanada = false;
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone && [
          'America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton',
          'America/Winnipeg', 'America/Halifax', 'America/St_Johns', 'America/Regina',
          'America/Whitehorse', 'America/Yellowknife', 'America/Iqaluit', 'America/Moncton',
          'America/Goose_Bay', 'America/Glace_Bay', 'America/Dawson', 'America/Rankin_Inlet'
        ].includes(timezone)) {
          isInCanada = true;
        }
      } catch (e) {
        // Timezone detection failed
      }
      
      let detectedCurrency: string | undefined;
      
      // Priority 1: If user is in Canada (by timezone), always use CAD
      if (isInCanada) {
        detectedCurrency = 'CAD';
      }
      // Priority 2: Use country code from locale if available
      else if (countryCode && countryToCurrency[countryCode]) {
        detectedCurrency = countryToCurrency[countryCode];
      }
      
      // Default to CAD if no match
      const currency = detectedCurrency || 'CAD';
      
      // Get currency symbol
      const formatter = new Intl.NumberFormat(browserLocale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      
      const symbolParts = formatter.formatToParts(0);
      const symbolPart = symbolParts.find(p => p.type === 'currency');
      const symbol = symbolPart?.value || '$';
      
      setCurrencyInfo({
        currency,
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
      const convertedPrice = Math.round(priceInCAD * rate);
      
      if (showCurrency) {
        return new Intl.NumberFormat(locale, {
          style: 'currency',
          currency,
          minimumFractionDigits: currency === 'JPY' ? 0 : 2,
          maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(convertedPrice);
      }
      
      return convertedPrice.toString();
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
