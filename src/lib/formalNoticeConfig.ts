/**
 * Centralized configuration for formal notice jurisdiction, delivery methods,
 * language detection, legal guidance, and risk assessment.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type JurisdictionKey = 'CA' | 'US' | 'FR' | 'INTL';
export type RegionKey = 'QC' | 'default';
export type DeliveryMethod =
  | 'email'
  | 'standard_mail'
  | 'registered_mail'
  | 'certified_mail'
  | 'courier'
  | 'bailiff'
  | 'lrar';
export type ProofStatus = 'none' | 'sent' | 'received';
export type RiskLevel = 'low' | 'medium' | 'high';
export type NoticeLang = 'fr' | 'en';

interface BilingualText {
  en: string;
  fr: string;
}

interface RegionRules {
  recommendation: BilingualText;
  emailWarning: BilingualText;
  preferredMethods: DeliveryMethod[];
}

// ─── Legal Rules ─────────────────────────────────────────────────────────────

export const legalRules: Record<JurisdictionKey, Record<string, RegionRules>> = {
  CA: {
    default: {
      recommendation: {
        en: 'It is recommended to use a delivery method that provides proof of mailing or delivery, such as registered mail or courier.',
        fr: "Il est recommandé d'utiliser un mode d'envoi qui fournit une preuve d'expédition ou de livraison, comme le courrier recommandé ou un service de messagerie.",
      },
      emailWarning: {
        en: 'Email alone may be harder to prove later. Consider a method with delivery proof.',
        fr: "Un envoi uniquement par courriel peut être plus difficile à prouver. Envisagez un mode d'envoi avec preuve.",
      },
      preferredMethods: ['registered_mail', 'courier'],
    },
    QC: {
      recommendation: {
        en: 'In Quebec, it is strongly recommended to keep proof that the notice reached the recipient. Registered mail or bailiff service are commonly used.',
        fr: "Au Québec, il est fortement recommandé de conserver une preuve que la mise en demeure est parvenue au destinataire. Le courrier recommandé ou l'huissier sont couramment utilisés.",
      },
      emailWarning: {
        en: 'Email alone may be contested if receipt is denied.',
        fr: 'Un envoi uniquement par courriel peut être contesté si la réception est niée.',
      },
      preferredMethods: ['registered_mail', 'bailiff'],
    },
  },
  US: {
    default: {
      recommendation: {
        en: 'In the United States, certified mail is commonly used to document delivery of demand letters.',
        fr: 'Aux États-Unis, le courrier certifié est couramment utilisé pour documenter la livraison.',
      },
      emailWarning: {
        en: 'Email alone may not be sufficient depending on the situation.',
        fr: 'Un simple courriel peut être insuffisant selon la situation.',
      },
      preferredMethods: ['certified_mail'],
    },
  },
  FR: {
    default: {
      recommendation: {
        en: 'In France, registered letter with acknowledgment of receipt (LRAR) is commonly used.',
        fr: "En France, la lettre recommandée avec accusé de réception (LRAR) est couramment utilisée.",
      },
      emailWarning: {
        en: 'Email is less protective than LRAR for formal notice.',
        fr: "Un courriel est moins protecteur qu'une LRAR pour une mise en demeure.",
      },
      preferredMethods: ['lrar'],
    },
  },
  INTL: {
    default: {
      recommendation: {
        en: 'Use a delivery method that provides proof of sending and receipt.',
        fr: "Utilisez un mode d'envoi avec preuve d'envoi et de réception.",
      },
      emailWarning: {
        en: 'Email alone may not provide sufficient proof.',
        fr: 'Un simple courriel peut ne pas fournir une preuve suffisante.',
      },
      preferredMethods: ['courier'],
    },
  },
};

// ─── Delivery Method Config ──────────────────────────────────────────────────

export interface DeliveryMethodOption {
  value: DeliveryMethod;
  label: BilingualText;
}

export const deliveryMethods: DeliveryMethodOption[] = [
  { value: 'email', label: { en: 'Email', fr: 'Courriel' } },
  { value: 'standard_mail', label: { en: 'Standard Mail', fr: 'Courrier standard' } },
  { value: 'registered_mail', label: { en: 'Registered Mail', fr: 'Courrier recommandé' } },
  { value: 'certified_mail', label: { en: 'Certified Mail', fr: 'Courrier certifié' } },
  { value: 'courier', label: { en: 'Courier', fr: 'Messagerie / Courrier express' } },
  { value: 'bailiff', label: { en: 'Bailiff / Legal Officer', fr: 'Huissier de justice' } },
  { value: 'lrar', label: { en: 'LRAR (France)', fr: 'LRAR (France)' } },
];

// ─── Disclaimer ──────────────────────────────────────────────────────────────

export const legalDisclaimer: BilingualText = {
  en: 'This information is provided for informational purposes only and is not legal advice.',
  fr: "Cette information est fournie à titre informatif seulement et ne constitue pas un avis juridique.",
};

// ─── Risk Labels ─────────────────────────────────────────────────────────────

export const riskLabels: Record<RiskLevel, BilingualText> = {
  low: { en: 'Low documentation risk', fr: 'Risque faible' },
  medium: { en: 'Medium documentation risk', fr: 'Risque moyen' },
  high: { en: 'High documentation risk', fr: 'Risque élevé' },
};

// ─── Helper Functions ────────────────────────────────────────────────────────

/** Normalize a country string to a JurisdictionKey */
export function normalizeCountry(country?: string | null): JurisdictionKey {
  if (!country) return 'INTL';
  const c = country.trim().toUpperCase();
  if (['CANADA', 'CA'].includes(c)) return 'CA';
  if (['UNITED STATES', 'US', 'USA', 'ÉTATS-UNIS', 'ETATS-UNIS'].includes(c)) return 'US';
  if (['FRANCE', 'FR'].includes(c)) return 'FR';
  return 'INTL';
}

/** Normalize a province/state to a RegionKey */
export function normalizeRegion(province?: string | null): RegionKey {
  if (!province) return 'default';
  const p = province.trim().toUpperCase();
  if (['QC', 'QUEBEC', 'QUÉBEC'].includes(p)) return 'QC';
  return 'default';
}

/** Determine the notice language based on client, then company, then fallback */
export function detectNoticeLanguage(
  clientLanguage?: string | null,
  clientCountry?: string | null,
  clientRegion?: string | null,
  companyLanguage?: string | null,
): NoticeLang {
  // 1. Client preferred language
  if (clientLanguage) {
    const cl = clientLanguage.trim().toLowerCase();
    if (['fr', 'french', 'français'].includes(cl)) return 'fr';
    if (['en', 'english'].includes(cl)) return 'en';
  }
  // 2. Client country default
  const country = normalizeCountry(clientCountry);
  const region = normalizeRegion(clientRegion);
  if (country === 'FR') return 'fr';
  if (country === 'CA' && region === 'QC') return 'fr';
  if (country === 'CA') return 'en';
  if (country === 'US') return 'en';
  // 3. Company language fallback
  if (companyLanguage) {
    const compLang = companyLanguage.trim().toLowerCase();
    if (['fr', 'french', 'français'].includes(compLang)) return 'fr';
  }
  return 'en';
}

/** Get jurisdiction rules for a given country + region */
export function getJurisdictionRules(country?: string | null, region?: string | null): RegionRules {
  const jKey = normalizeCountry(country);
  const rKey = normalizeRegion(region);
  const jurisdictionGroup = legalRules[jKey];
  return jurisdictionGroup[rKey] || jurisdictionGroup['default'];
}

/** Get recommended delivery method for a jurisdiction */
export function getDefaultDeliveryMethod(country?: string | null, region?: string | null): DeliveryMethod {
  const rules = getJurisdictionRules(country, region);
  return rules.preferredMethods[0] || 'registered_mail';
}

/** Calculate documentation risk based on delivery method and proof status */
export function calculateRiskLevel(method: DeliveryMethod, proofStatus: ProofStatus): RiskLevel {
  if (method === 'email' && proofStatus === 'none') return 'high';
  if (method === 'email') return 'medium';
  if (['standard_mail'].includes(method) && proofStatus === 'none') return 'medium';
  if (proofStatus === 'received') return 'low';
  if (['registered_mail', 'certified_mail', 'bailiff', 'lrar'].includes(method)) return 'low';
  if (proofStatus === 'sent') return 'low';
  return 'medium';
}

/** Extract country & region from a client address string (best-effort parsing) */
export function parseAddressForJurisdiction(address?: string | null): { country: string | null; region: string | null } {
  if (!address) return { country: null, region: null };
  const lines = address.split('\n').map(l => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1]?.toUpperCase() || '';
  // Simple heuristics
  if (['CANADA', 'CA'].some(k => lastLine.includes(k))) {
    // Look for Quebec indicators
    const fullText = address.toUpperCase();
    if (['QC', 'QUEBEC', 'QUÉBEC'].some(k => fullText.includes(k))) {
      return { country: 'CA', region: 'QC' };
    }
    return { country: 'CA', region: null };
  }
  if (['FRANCE', 'FR'].some(k => lastLine === k || lastLine.includes('FRANCE'))) {
    return { country: 'FR', region: null };
  }
  if (['UNITED STATES', 'USA', 'US'].some(k => lastLine.includes(k))) {
    return { country: 'US', region: null };
  }
  return { country: null, region: null };
}
