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
export type DeliveryStatus = 'draft' | 'sent' | 'sent_with_proof' | 'delivered';
export type DocumentationRisk = 'high' | 'medium' | 'low' | 'very_low';
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

// ─── Delivery Status Labels ─────────────────────────────────────────────────

export const deliveryStatusLabels: Record<DeliveryStatus, BilingualText> = {
  draft: { en: 'Draft', fr: 'Brouillon' },
  sent: { en: 'Sent', fr: 'Envoyée' },
  sent_with_proof: { en: 'Sent with proof', fr: 'Envoyée avec preuve' },
  delivered: { en: 'Delivered', fr: 'Livrée' },
};

export const deliveryStatusColors: Record<DeliveryStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  sent_with_proof: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

// ─── Documentation Risk ─────────────────────────────────────────────────────

export const documentationRiskLabels: Record<DocumentationRisk, BilingualText> = {
  high: { en: 'High documentation risk', fr: 'Risque documentaire élevé' },
  medium: { en: 'Medium documentation risk', fr: 'Risque documentaire moyen' },
  low: { en: 'Low documentation risk', fr: 'Risque documentaire faible' },
  very_low: { en: 'Very low documentation risk', fr: 'Risque documentaire très faible' },
};

// Keep old riskLabels for backward compat
export const riskLabels = documentationRiskLabels;

// ─── Postal vs instantaneous delivery ────────────────────────────────────────

/** Methods where the recipient does not receive the document instantly
 * (i.e. there is a transit delay). For these, the formal notice should
 * phrase the deadline as "X days from receipt" instead of a fixed date. */
export const POSTAL_DELIVERY_METHODS: DeliveryMethod[] = [
  'standard_mail',
  'registered_mail',
  'certified_mail',
  'courier',
  'bailiff',
  'lrar',
];

export function isPostalDeliveryMethod(method?: DeliveryMethod | string | null): boolean {
  if (!method) return false;
  return POSTAL_DELIVERY_METHODS.includes(method as DeliveryMethod);
}

/** Returns the deadline phrase to inject into the formal notice body.
 * - Postal methods → "dans un délai de X jours à compter de la réception …"
 * - Email / instantaneous → "au plus tard le {date}" */
export function getDeadlinePhrase(
  method: DeliveryMethod | string,
  days: number,
  formattedDueDate: string,
  lang: NoticeLang,
): string {
  if (isPostalDeliveryMethod(method)) {
    return lang === 'fr'
      ? `dans un délai de ${days} jours à compter de la réception de la présente mise en demeure`
      : `within ${days} days from the receipt of this formal notice`;
  }
  return lang === 'fr'
    ? `au plus tard le ${formattedDueDate}`
    : `no later than ${formattedDueDate}`;
}

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
  if (clientLanguage) {
    const cl = clientLanguage.trim().toLowerCase();
    if (['fr', 'french', 'français'].includes(cl)) return 'fr';
    if (['en', 'english'].includes(cl)) return 'en';
  }
  const country = normalizeCountry(clientCountry);
  const region = normalizeRegion(clientRegion);
  if (country === 'FR') return 'fr';
  if (country === 'CA' && region === 'QC') return 'fr';
  if (country === 'CA') return 'en';
  if (country === 'US') return 'en';
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

/** Derive the delivery status from proof and tracking data */
export function deriveDeliveryStatus(opts: {
  proofOfReceipt: boolean;
  deliveredDate: string;
  proofOfSending: boolean;
  trackingNumber: string;
  sentAt: string | null;
  sentDate?: string;
}): DeliveryStatus {
  if (opts.proofOfReceipt || opts.deliveredDate) return 'delivered';
  if (opts.proofOfSending || opts.trackingNumber) return 'sent_with_proof';
  if (opts.sentAt || opts.sentDate) return 'sent';
  return 'draft';
}

/** Calculate 4-level documentation risk */
export function calculateDocumentationRisk(
  method: DeliveryMethod,
  proofOfSending: boolean,
  proofOfReceipt: boolean,
  trackingNumber: string,
): DocumentationRisk {
  if (proofOfReceipt) return 'very_low';
  if (proofOfSending) return 'low';
  if (trackingNumber) return 'low';
  if (['registered_mail', 'certified_mail', 'bailiff', 'lrar'].includes(method)) return 'medium';
  if (method === 'email' || method === 'standard_mail') return 'high';
  return 'medium';
}

/** Old compat function — maps to new 4-level system but returns old type */
export function calculateRiskLevel(method: DeliveryMethod, proofStatus: ProofStatus): DocumentationRisk {
  return calculateDocumentationRisk(
    method,
    proofStatus === 'sent' || proofStatus === 'received',
    proofStatus === 'received',
    '',
  );
}

/** Extract country & region from a client address string (best-effort parsing) */
export function parseAddressForJurisdiction(address?: string | null): { country: string | null; region: string | null } {
  if (!address) return { country: null, region: null };
  const lines = address.split('\n').map(l => l.trim()).filter(Boolean);
  const lastLine = lines[lines.length - 1]?.toUpperCase() || '';
  if (['CANADA', 'CA'].some(k => lastLine.includes(k))) {
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
