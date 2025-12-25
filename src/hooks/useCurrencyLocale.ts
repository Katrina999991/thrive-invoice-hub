import { useState, useEffect, useMemo } from 'react';

interface CurrencyInfo {
  currency: string;
  locale: string;
  symbol: string;
}

// Map browser locales to likely currencies
const localeToCurrency: Record<string, string> = {
  'en-US': 'USD',
  'en-CA': 'CAD',
  'fr-CA': 'CAD',
  'fr-FR': 'EUR',
  'de-DE': 'EUR',
  'es-ES': 'EUR',
  'it-IT': 'EUR',
  'pt-BR': 'BRL',
  'en-GB': 'GBP',
  'en-AU': 'AUD',
  'ja-JP': 'JPY',
  'zh-CN': 'CNY',
  'en-IN': 'INR',
  'es-MX': 'MXN',
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
      
      // Try exact match first
      let detectedCurrency = localeToCurrency[browserLocale];
      
      // Try language-only match
      if (!detectedCurrency) {
        const languageOnly = browserLocale.split('-')[0];
        const matchingLocale = Object.keys(localeToCurrency).find(
          locale => locale.startsWith(languageOnly)
        );
        if (matchingLocale) {
          detectedCurrency = localeToCurrency[matchingLocale];
        }
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
      
      const parts = formatter.formatToParts(0);
      const symbolPart = parts.find(p => p.type === 'currency');
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
