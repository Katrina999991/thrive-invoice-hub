import { useState, useEffect, useMemo } from 'react';

interface CurrencyInfo {
  currency: string;
  locale: string;
  symbol: string;
}

// Country code to currency mapping - comprehensive list
const countryToCurrency: Record<string, string> = {
  // North America
  'CA': 'CAD',
  'US': 'USD',
  'MX': 'MXN',
  // Europe - EUR countries
  'FR': 'EUR', 'DE': 'EUR', 'ES': 'EUR', 'IT': 'EUR', 'NL': 'EUR',
  'BE': 'EUR', 'AT': 'EUR', 'PT': 'EUR', 'IE': 'EUR', 'FI': 'EUR',
  'GR': 'EUR', 'LU': 'EUR', 'MT': 'EUR', 'CY': 'EUR', 'SK': 'EUR',
  'SI': 'EUR', 'EE': 'EUR', 'LV': 'EUR', 'LT': 'EUR', 'HR': 'EUR',
  // Europe - Non-EUR
  'GB': 'GBP', 'CH': 'CHF', 'SE': 'SEK', 'NO': 'NOK', 'DK': 'DKK',
  'PL': 'PLN', 'CZ': 'CZK', 'HU': 'HUF', 'RO': 'RON', 'BG': 'BGN',
  // Asia Pacific
  'AU': 'AUD', 'NZ': 'NZD', 'JP': 'JPY', 'CN': 'CNY', 'HK': 'HKD',
  'SG': 'SGD', 'KR': 'KRW', 'IN': 'INR', 'TH': 'THB', 'MY': 'MYR',
  'ID': 'IDR', 'PH': 'PHP', 'VN': 'VND', 'TW': 'TWD',
  // Middle East
  'AE': 'AED', 'SA': 'SAR', 'IL': 'ILS', 'TR': 'TRY',
  // South America
  'BR': 'BRL', 'AR': 'ARS', 'CL': 'CLP', 'CO': 'COP',
  // Africa
  'ZA': 'ZAR', 'EG': 'EGP', 'NG': 'NGN',
};

// Currencies supported by Stripe for display (approximate rates from CAD)
const exchangeRatesFromCAD: Record<string, number> = {
  CAD: 1,
  USD: 0.74,
  EUR: 0.68,
  GBP: 0.58,
  AUD: 1.12,
  NZD: 1.18,
  JPY: 110,
  CHF: 0.64,
  SEK: 7.8,
  NOK: 7.9,
  DKK: 5.1,
  PLN: 2.95,
  CZK: 17.2,
  HUF: 268,
  RON: 3.4,
  BRL: 3.70,
  MXN: 12.8,
  INR: 61.5,
  SGD: 0.99,
  HKD: 5.78,
  AED: 2.72,
  SAR: 2.78,
  ZAR: 13.5,
  TRY: 21.5,
  KRW: 980,
  ILS: 2.72,
  THB: 26,
  MYR: 3.45,
  IDR: 11600,
  PHP: 41.5,
  VND: 18200,
  CNY: 5.35,
};

// Currencies that don't use decimals
const zeroDecimalCurrencies = ['JPY', 'KRW', 'VND', 'IDR', 'HUF'];

export const useCurrencyLocale = () => {
  const [currencyInfo, setCurrencyInfo] = useState<CurrencyInfo>({
    currency: 'USD',
    locale: 'en-US',
    symbol: '$',
  });

  useEffect(() => {
    const detectCurrency = async () => {
      const browserLocale = navigator.language || 'en-US';
      let detectedCurrency: string = 'USD'; // Default to USD
      
      // Priority 1: Try IP-based geolocation (most reliable)
      try {
        const response = await fetch('https://ipapi.co/json/', { 
          signal: AbortSignal.timeout(3000)
        });
        if (response.ok) {
          const data = await response.json();
          const countryFromIP = data.country_code?.toUpperCase();
          if (countryFromIP && countryToCurrency[countryFromIP]) {
            const countryCurrency = countryToCurrency[countryFromIP];
            // Only use if we have exchange rate for it (supported)
            if (exchangeRatesFromCAD[countryCurrency]) {
              detectedCurrency = countryCurrency;
            }
          }
        }
      } catch (e) {
        console.log('IP geolocation failed, using fallback detection');
        
        // Fallback: Check for Canadian locale
        const hasCanadianLocale = navigator.languages?.some(lang => {
          const upper = lang.toUpperCase();
          return upper.includes('-CA') || upper === 'CA';
        }) || browserLocale.toUpperCase().includes('-CA');
        
        // Fallback: Check timezone for Canada
        let isInCanadianTimezone = false;
        try {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (timezone) {
            const canadianTimezones = [
              'America/Toronto', 'America/Vancouver', 'America/Montreal', 'America/Edmonton',
              'America/Winnipeg', 'America/Halifax', 'America/St_Johns', 'America/Regina',
              'America/Whitehorse', 'America/Yellowknife', 'America/Iqaluit', 'America/Moncton',
              'America/Rankin_Inlet', 'America/Resolute', 'America/Cambridge_Bay',
              'America/Dawson', 'America/Dawson_Creek', 'America/Fort_Nelson',
              'America/Glace_Bay', 'America/Goose_Bay', 'America/Inuvik',
              'America/Nipigon', 'America/Pangnirtung', 'America/Rainy_River',
              'America/Swift_Current', 'America/Thunder_Bay'
            ];
            isInCanadianTimezone = canadianTimezones.includes(timezone);
          }
        } catch (err) {}
        
        if (hasCanadianLocale || isInCanadianTimezone) {
          detectedCurrency = 'CAD';
        } else {
          // Try country code from locale
          const parts = browserLocale.split('-');
          const countryCode = parts.length > 1 ? parts[1].toUpperCase() : null;
          if (countryCode && countryToCurrency[countryCode]) {
            const localeCurrency = countryToCurrency[countryCode];
            if (exchangeRatesFromCAD[localeCurrency]) {
              detectedCurrency = localeCurrency;
            }
          }
        }
      }
      
      // Get currency symbol - use narrowSymbol for cleaner display (£ instead of £GB)
      let symbol = '$';
      try {
        const formatter = new Intl.NumberFormat(browserLocale, {
          style: 'currency',
          currency: detectedCurrency,
          currencyDisplay: 'narrowSymbol',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        
        const symbolParts = formatter.formatToParts(0);
        const symbolPart = symbolParts.find(p => p.type === 'currency');
        symbol = symbolPart?.value || '$';
      } catch (e) {
        // Fallback if narrowSymbol not supported
        const formatter = new Intl.NumberFormat(browserLocale, {
          style: 'currency',
          currency: detectedCurrency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        
        const symbolParts = formatter.formatToParts(0);
        const symbolPart = symbolParts.find(p => p.type === 'currency');
        symbol = symbolPart?.value || '$';
      }
      
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
      const rate = exchangeRatesFromCAD[currency] || exchangeRatesFromCAD['USD'];
      const convertedPrice = priceInCAD * rate;
      
      // For zero-decimal currencies, round to whole number
      const isZeroDecimal = zeroDecimalCurrencies.includes(currency);
      const finalPrice = isZeroDecimal ? Math.round(convertedPrice) : convertedPrice;
      
      if (showCurrency) {
        try {
          const formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: isZeroDecimal ? 0 : 2,
            maximumFractionDigits: isZeroDecimal ? 0 : 2,
          }).format(finalPrice);
          // Append currency code (e.g., "£19.99 GBP")
          return `${formatted} ${currency}`;
        } catch (e) {
          // Fallback if narrowSymbol not supported
          const formatted = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: isZeroDecimal ? 0 : 2,
            maximumFractionDigits: isZeroDecimal ? 0 : 2,
          }).format(finalPrice);
          return `${formatted} ${currency}`;
        }
      }
      
      return finalPrice.toFixed(isZeroDecimal ? 0 : 2);
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
    currencyNote: {
      en: "Prices shown in your local currency when supported. Base pricing is in CAD.",
      fr: "Prix affichés dans votre devise locale si disponible. Tarification de base en CAD."
    }
  };
};
