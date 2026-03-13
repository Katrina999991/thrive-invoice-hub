/**
 * Default deduction percentage rules based on expense category and jurisdiction.
 * These are suggestions only — the user always has final control.
 */

// Category keyword matching (case-insensitive) → default deduction %
// Keys are lowercase partial matches against category names (en/fr)
const CATEGORY_DEFAULTS: Array<{
  keywords: string[];
  percent: number;
  label_en: string;
  label_fr: string;
}> = [
  {
    keywords: ["meal", "repas", "restaurant", "food", "nourriture", "dining"],
    percent: 50,
    label_en: "Meals & Entertainment",
    label_fr: "Repas et divertissement",
  },
  {
    keywords: ["entertainment", "divertissement", "amusement"],
    percent: 50,
    label_en: "Entertainment",
    label_fr: "Divertissement",
  },
  {
    keywords: ["vehicle", "véhicule", "auto", "car", "gas", "essence", "fuel", "carburant", "parking", "mileage", "kilométrage"],
    percent: 100,
    label_en: "Vehicle",
    label_fr: "Véhicule",
  },
  {
    keywords: ["home office", "bureau à domicile", "bureau domicile", "télétravail", "work from home"],
    percent: 100,
    label_en: "Home Office",
    label_fr: "Bureau à domicile",
  },
  {
    keywords: ["office", "bureau", "fourniture", "supplies", "stationery", "papeterie"],
    percent: 100,
    label_en: "Office Supplies",
    label_fr: "Fournitures de bureau",
  },
  {
    keywords: ["travel", "voyage", "transport", "flight", "vol", "hotel", "hôtel", "accommodation", "hébergement"],
    percent: 100,
    label_en: "Travel",
    label_fr: "Voyage",
  },
  {
    keywords: ["insurance", "assurance"],
    percent: 100,
    label_en: "Insurance",
    label_fr: "Assurance",
  },
  {
    keywords: ["professional", "professionnel", "consulting", "consultation", "legal", "juridique", "accounting", "comptabilité"],
    percent: 100,
    label_en: "Professional Services",
    label_fr: "Services professionnels",
  },
  {
    keywords: ["telephone", "téléphone", "internet", "phone", "cellulaire", "mobile", "telecom", "télécommunication"],
    percent: 100,
    label_en: "Telecommunications",
    label_fr: "Télécommunications",
  },
  {
    keywords: ["advertising", "publicité", "marketing", "promotion"],
    percent: 100,
    label_en: "Advertising & Marketing",
    label_fr: "Publicité et marketing",
  },
  {
    keywords: ["rent", "loyer", "lease", "bail"],
    percent: 100,
    label_en: "Rent",
    label_fr: "Loyer",
  },
  {
    keywords: ["utility", "utilities", "électricité", "electricity", "water", "eau", "heating", "chauffage"],
    percent: 100,
    label_en: "Utilities",
    label_fr: "Services publics",
  },
  {
    keywords: ["software", "logiciel", "subscription", "abonnement", "saas", "app"],
    percent: 100,
    label_en: "Software & Subscriptions",
    label_fr: "Logiciels et abonnements",
  },
  {
    keywords: ["equipment", "équipement", "hardware", "matériel", "tool", "outil"],
    percent: 100,
    label_en: "Equipment",
    label_fr: "Équipement",
  },
];

// Jurisdiction-specific overrides (country + optional province/state)
// These override the category defaults when applicable
const JURISDICTION_OVERRIDES: Array<{
  country: string[];
  province?: string[];
  categoryKeywords: string[];
  percent: number;
  note_en: string;
  note_fr: string;
}> = [
  // Canada - Meals are 50% deductible
  {
    country: ["canada", "ca"],
    categoryKeywords: ["meal", "repas", "restaurant", "food", "nourriture", "dining", "entertainment", "divertissement"],
    percent: 50,
    note_en: "50% deductible in Canada (CRA rules)",
    note_fr: "50% déductible au Canada (règles de l'ARC)",
  },
  // USA - Meals are 50% deductible (general rule)
  {
    country: ["united states", "usa", "us", "états-unis", "etats-unis"],
    categoryKeywords: ["meal", "repas", "restaurant", "food", "nourriture", "dining"],
    percent: 50,
    note_en: "50% deductible in the US (IRS rules)",
    note_fr: "50% déductible aux États-Unis (règles de l'IRS)",
  },
  // France - Meals are partially deductible
  {
    country: ["france", "fr"],
    categoryKeywords: ["meal", "repas", "restaurant", "food", "nourriture", "dining"],
    percent: 50,
    note_en: "Partially deductible in France",
    note_fr: "Partiellement déductible en France",
  },
];

interface DeductionSuggestion {
  percent: number;
  source: "jurisdiction" | "category" | "none";
  note_en: string;
  note_fr: string;
}

/**
 * Get suggested deduction percentage based on category name and company jurisdiction.
 * 
 * @param categoryName - The expense category name (can be en or fr)
 * @param country - Company country (optional)
 * @param provinceState - Company province/state (optional)
 * @returns DeductionSuggestion or null if no rule matches
 */
export function getDeductionSuggestion(
  categoryName: string,
  country?: string | null,
  provinceState?: string | null
): DeductionSuggestion | null {
  if (!categoryName) return null;

  const lowerCategory = categoryName.toLowerCase();

  // 1. Check jurisdiction-specific overrides first
  if (country) {
    const lowerCountry = country.toLowerCase();
    for (const rule of JURISDICTION_OVERRIDES) {
      const countryMatch = rule.country.some(c => lowerCountry.includes(c));
      if (!countryMatch) continue;

      // Check province if specified
      if (rule.province && provinceState) {
        const lowerProvince = provinceState.toLowerCase();
        if (!rule.province.some(p => lowerProvince.includes(p))) continue;
      }

      const categoryMatch = rule.categoryKeywords.some(kw => lowerCategory.includes(kw));
      if (categoryMatch) {
        return {
          percent: rule.percent,
          source: "jurisdiction",
          note_en: rule.note_en,
          note_fr: rule.note_fr,
        };
      }
    }
  }

  // 2. Fall back to category defaults
  for (const rule of CATEGORY_DEFAULTS) {
    const match = rule.keywords.some(kw => lowerCategory.includes(kw));
    if (match) {
      return {
        percent: rule.percent,
        source: "category",
        note_en: `Default for ${rule.label_en}`,
        note_fr: `Par défaut pour ${rule.label_fr}`,
      };
    }
  }

  return null;
}

/**
 * Calculate the deductible amount from the expense total and percentage.
 */
export function calculateDeductibleAmount(
  expenseAmount: number,
  deductiblePercent: number | null | undefined
): number {
  if (deductiblePercent == null || deductiblePercent < 0) return expenseAmount;
  return expenseAmount * (Math.min(deductiblePercent, 100) / 100);
}
