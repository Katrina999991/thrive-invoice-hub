import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Vendor normalization helper
function normalizeVendor(vendor: string): string {
  if (!vendor) return "";
  return vendor
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation
    .replace(/\b(inc|ltd|llc|corp|co|sa|sarl|gmbh|plc)\b/gi, "") // Remove common suffixes
    .replace(/\s+/g, " ") // Collapse whitespace
    .trim();
}

// Extract keywords from text
function extractKeywords(text: string): string[] {
  if (!text) return [];
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "le", "la", "les", "un", "une", "des", "et", "ou", "de", "du", "au", "aux", "pour", "avec", "sur", "dans"]);
  return text
    .toLowerCase()
    .replace(/[^\w\sàâäéèêëïîôùûüç]/g, " ")
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word))
    .slice(0, 10);
}

// Category keyword mapping for suggestions - includes multiple name variants
const categoryKeywords: Record<string, { names: string[]; keywords: { en: string[]; fr: string[] } }> = {
  "Transport": {
    names: ["Transport", "Travel", "Voyage", "Transportation"],
    keywords: {
      en: ["fuel", "gas", "gasoline", "diesel", "petrol", "uber", "taxi", "lyft", "parking", "transit", "bus", "train", "metro", "subway", "flight", "airline", "rental", "car", "toll", "highway"],
      fr: ["essence", "diesel", "carburant", "taxi", "uber", "stationnement", "parking", "transport", "bus", "train", "metro", "vol", "avion", "location", "voiture", "peage", "autoroute"]
    }
  },
  "Repas": {
    names: ["Repas", "Meals", "Food", "Restaurant", "Nourriture"],
    keywords: {
      en: ["restaurant", "cafe", "coffee", "food", "meal", "lunch", "dinner", "breakfast", "snack", "pizza", "burger", "sushi", "takeout", "delivery", "doordash", "ubereats", "grubhub", "muffin", "bacon", "sandwich"],
      fr: ["restaurant", "cafe", "nourriture", "repas", "dejeuner", "diner", "petit-dejeuner", "collation", "pizza", "burger", "sushi", "livraison", "muffin", "bacon", "sandwich"]
    }
  },
  "Fournitures": {
    names: ["Fournitures", "Supplies", "Office Supplies", "Office", "Bureau"],
    keywords: {
      en: ["office", "supplies", "paper", "pen", "ink", "printer", "staples", "folder", "notebook", "stationery", "envelope", "desk"],
      fr: ["bureau", "fournitures", "papier", "stylo", "encre", "imprimante", "agrafeuse", "classeur", "cahier", "papeterie", "enveloppe"]
    }
  },
  "Services": {
    names: ["Services", "Consulting", "Consultation", "Professional Services"],
    keywords: {
      en: ["subscription", "software", "saas", "cloud", "hosting", "service", "consulting", "professional", "legal", "accounting", "insurance"],
      fr: ["abonnement", "logiciel", "saas", "cloud", "hebergement", "service", "consultation", "professionnel", "juridique", "comptable", "assurance"]
    }
  },
  "Équipement": {
    names: ["Équipement", "Equipment", "Hardware", "Electronics", "Électronique", "Software", "Logiciels"],
    keywords: {
      en: ["computer", "laptop", "monitor", "keyboard", "mouse", "hardware", "equipment", "machine", "device", "electronics", "camera", "phone", "tablet", "cable", "hdmi", "usb", "adapter"],
      fr: ["ordinateur", "portable", "ecran", "clavier", "souris", "materiel", "equipement", "machine", "appareil", "electronique", "camera", "telephone", "tablette", "cable", "hdmi", "usb", "adaptateur"]
    }
  },
  "Marketing": {
    names: ["Marketing", "Advertising", "Publicité", "Promotion"],
    keywords: {
      en: ["advertising", "ads", "marketing", "promotion", "campaign", "google", "facebook", "instagram", "linkedin", "social", "media", "print", "flyer", "banner"],
      fr: ["publicite", "pub", "marketing", "promotion", "campagne", "google", "facebook", "instagram", "linkedin", "social", "media", "impression", "flyer", "banniere"]
    }
  },
  "Télécommunications": {
    names: ["Télécommunications", "Telecommunications", "Utilities", "Services publics", "Internet", "Phone"],
    keywords: {
      en: ["phone", "mobile", "cell", "telecom", "internet", "wifi", "broadband", "data"],
      fr: ["telephone", "mobile", "cellulaire", "telecom", "internet", "wifi", "donnees"]
    }
  },
  "Bureau à domicile": {
    names: ["Bureau à domicile", "Home Office", "Utilities", "Services publics"],
    keywords: {
      en: ["home", "office", "electricity", "electric", "hydro", "utility", "utilities", "heating", "cooling", "rent", "mortgage"],
      fr: ["domicile", "bureau", "electricite", "hydro", "utilite", "chauffage", "climatisation", "loyer", "hypotheque"]
    }
  },
  "Autres": {
    names: ["Autres", "Other", "Miscellaneous", "Divers"],
    keywords: {
      en: [],
      fr: []
    }
  }
};

// Suggest category based on vendor and description
function suggestCategory(
  vendor: string, 
  description: string, 
  lineItems: string[], 
  userCategories: { id: string; name: string; name_en?: string; name_fr?: string }[]
): { category: string; categoryId: string | null; confidence: number; keywords: string[] } {
  const normalizedVendor = normalizeVendor(vendor);
  const allText = [vendor, description, ...lineItems].join(" ");
  const keywords = extractKeywords(allText);
  
  let bestCategory = "Autres";
  let bestCategoryId: string | null = null;
  let bestScore = 0;
  const matchedKeywords: string[] = [];
  
  for (const [category, config] of Object.entries(categoryKeywords)) {
    const allKws = [...config.keywords.en, ...config.keywords.fr];
    let score = 0;
    
    for (const kw of allKws) {
      // Check vendor match (higher weight)
      if (normalizedVendor.includes(kw)) {
        score += 3;
        matchedKeywords.push(kw);
      }
      // Check keyword match
      if (keywords.some(k => k.includes(kw) || kw.includes(k))) {
        score += 1;
        matchedKeywords.push(kw);
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
      
      // Find matching user category by any name variant
      const matchedUserCategory = userCategories.find(uc => 
        config.names.some(name => 
          uc.name?.toLowerCase() === name.toLowerCase() ||
          uc.name_en?.toLowerCase() === name.toLowerCase() ||
          uc.name_fr?.toLowerCase() === name.toLowerCase()
        )
      );
      bestCategoryId = matchedUserCategory?.id || null;
      if (matchedUserCategory) {
        bestCategory = matchedUserCategory.name;
      }
    }
  }
  
  const confidence = Math.min(bestScore / 5, 1); // Normalize to 0-1
  
  // If no good match, try to find "Other" category in user categories
  if (confidence < 0.2) {
    const otherCategory = userCategories.find(uc => 
      uc.name?.toLowerCase() === "other" ||
      uc.name_en?.toLowerCase() === "other" ||
      uc.name_fr?.toLowerCase() === "autre" ||
      uc.name_fr?.toLowerCase() === "autres"
    );
    if (otherCategory) {
      return {
        category: otherCategory.name,
        categoryId: otherCategory.id,
        confidence: 0,
        keywords: [...new Set(matchedKeywords)].slice(0, 5)
      };
    }
  }
  
  return { 
    category: bestCategory,
    categoryId: bestCategoryId,
    confidence, 
    keywords: [...new Set(matchedKeywords)].slice(0, 5) 
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, language = "fr", companyId, userId } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Initialize Supabase client for fetching learned mappings
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch learned category mappings for the user (not company-specific)
    let learnedMappings: { key: string; category_id: string; mapping_type: string }[] = [];
    let categories: { id: string; name: string; name_en?: string; name_fr?: string }[] = [];
    
    console.log("User ID received:", userId);
    
    if (userId) {
      console.log("Fetching mappings for user:", userId);
      const [mappingsResult, categoriesResult] = await Promise.all([
        supabase
          .from("expense_category_mappings")
          .select("key, category_id, mapping_type")
          .eq("user_id", userId),
        supabase
          .from("categories")
          .select("id, name, name_en, name_fr")
          .eq("user_id", userId)
          .eq("for_expenses", true)
      ]);
      
      console.log("Mappings query result:", JSON.stringify(mappingsResult));
      console.log("Categories query result:", JSON.stringify(categoriesResult));
      
      if (mappingsResult.data) {
        learnedMappings = mappingsResult.data;
        console.log("Loaded learned mappings:", learnedMappings.length, "mappings for user:", userId);
      }
      if (mappingsResult.error) {
        console.error("Error loading mappings:", mappingsResult.error);
      }
      if (categoriesResult.data) {
        categories = categoriesResult.data;
        console.log("Loaded categories:", categories.length, "categories");
      }
    } else {
      console.log("No userId provided, skipping mapping lookup");
    }

    const systemPrompt = language === "fr" 
      ? `Tu es un assistant spécialisé dans l'extraction de données de factures et reçus.
         Analyse l'image fournie et extrais les informations suivantes au format JSON strict:
         - total_amount: le montant TOTAL final payé (nombre décimal, sans symbole de devise)
         - subtotal_amount: le sous-total AVANT taxes si visible (nombre décimal, null si non visible)
         - vendor: le nom du vendeur/magasin/entreprise
         - date: la date au format YYYY-MM-DD
         - description_fr: une brève description des achats EN FRANÇAIS
         - description_en: une brève description des achats EN ANGLAIS (traduis si nécessaire)
         - line_items: tableau des articles achetés avec description et prix unitaire
         - tax_lines: tableau des taxes avec pour chaque taxe: name (nom de la taxe ex: TPS, TVQ, GST, PST), amount (montant de la taxe), rate (taux en % si visible, sinon null)
         - tax_included_hint: boolean indiquant si le reçu mentionne "taxes incluses" ou similaire
         - currency: devise détectée (CAD, USD, EUR, etc.)
         
         IMPORTANT: Pour tax_lines, extrais CHAQUE taxe séparément avec son montant exact.
         Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire. Si tu ne peux pas extraire une information, utilise null.`
      : `You are an assistant specialized in extracting data from invoices and receipts.
         Analyze the provided image and extract the following information in strict JSON format:
         - total_amount: the TOTAL final amount paid (decimal number, without currency symbol)
         - subtotal_amount: the subtotal BEFORE taxes if visible (decimal number, null if not visible)
         - vendor: the vendor/store/business name
         - date: the date in YYYY-MM-DD format
         - description_en: a brief description of the purchases IN ENGLISH
         - description_fr: a brief description of the purchases IN FRENCH (translate if needed)
         - line_items: array of purchased items with description and unit price
         - tax_lines: array of taxes with for each tax: name (tax name e.g., GST, PST, TPS, TVQ), amount (tax amount), rate (rate in % if visible, otherwise null)
         - tax_included_hint: boolean indicating if the receipt mentions "taxes included" or similar
         - currency: detected currency (CAD, USD, EUR, etc.)
         
         IMPORTANT: For tax_lines, extract EACH tax separately with its exact amount.
         Respond ONLY with the JSON, no additional text. If you cannot extract information, use null.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: language === "fr" 
                  ? "Analyse cette facture/reçu et extrais les informations."
                  : "Analyze this invoice/receipt and extract the information."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: language === "fr" ? "Limite de requêtes atteinte, réessayez plus tard." : "Rate limit exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: language === "fr" ? "Crédit insuffisant. Ajoutez des fonds à votre compte." : "Insufficient credits. Please add funds to your account." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No response from AI");
    }

    // Parse the JSON response from AI
    let extractedData: any;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
      extractedData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse extracted data");
      }
    }

    // Log the scan for usage tracking (before processing)
    const totalAmount = extractedData.total_amount;
    const scanVendor = extractedData.vendor || "";
    
    try {
      await supabase.from("receipt_scan_logs").insert({
        user_id: userId,
        company_id: companyId || null,
        vendor: scanVendor,
        total_amount: totalAmount,
        status: "success"
      });
      console.log("Receipt scan logged successfully");
    } catch (logError) {
      console.error("Failed to log receipt scan:", logError);
      // Don't fail the scan if logging fails
    }

    // Smart category suggestion
    const vendor = scanVendor;
    const lineItems = extractedData.line_items || [];
    const descriptionText = extractedData.description_en || extractedData.description_fr || "";
    
    let suggestedCategory: string | null = null;
    let suggestedCategoryId: string | null = null;
    let categoryConfidence = 0;
    let categorySource: "learned_vendor" | "learned_keyword" | "ai_suggestion" | "default" = "default";
    
    // 1. First check learned vendor mappings
    const normalizedVendor = normalizeVendor(vendor);
    console.log("Checking vendor mapping for:", normalizedVendor);
    console.log("Available vendor mappings:", learnedMappings.filter(m => m.mapping_type === "vendor").map(m => m.key));
    
    const vendorMapping = learnedMappings.find(
      m => m.mapping_type === "vendor" && m.key === normalizedVendor
    );
    
    if (vendorMapping) {
      suggestedCategoryId = vendorMapping.category_id;
      const matchedCategory = categories.find(c => c.id === suggestedCategoryId);
      suggestedCategory = matchedCategory?.name || null;
      categoryConfidence = 1;
      categorySource = "learned_vendor";
      console.log("Found vendor mapping! Category:", suggestedCategory);
    }
    
    // 2. If no vendor mapping, check keyword mappings
    if (!suggestedCategory) {
      const keywords = extractKeywords([vendor, descriptionText, ...lineItems.map((i: any) => i?.description || i)].join(" "));
      console.log("Checking keyword mappings for keywords:", keywords);
      console.log("Available keyword mappings:", learnedMappings.filter(m => m.mapping_type === "keyword").map(m => m.key));
      
      for (const keyword of keywords) {
        const keywordMapping = learnedMappings.find(
          m => m.mapping_type === "keyword" && m.key === keyword
        );
        if (keywordMapping) {
          suggestedCategoryId = keywordMapping.category_id;
          const matchedCategory = categories.find(c => c.id === suggestedCategoryId);
          suggestedCategory = matchedCategory?.name || null;
          categoryConfidence = 0.8;
          categorySource = "learned_keyword";
          break;
        }
      }
    }
    
    // 3. If no learned mapping, use AI-based suggestion
    if (!suggestedCategory) {
      const lineItemTexts = lineItems.map((i: any) => typeof i === 'string' ? i : (i?.description || ''));
      const suggestion = suggestCategory(vendor, descriptionText, lineItemTexts, categories);
      suggestedCategory = suggestion.category;
      suggestedCategoryId = suggestion.categoryId;
      categoryConfidence = suggestion.confidence;
      categorySource = "ai_suggestion";
    }
    
    // Build response with bilingual descriptions and enhanced tax data
    const result = {
      success: true,
      data: {
        // Keep backward compatibility with 'amount' field
        amount: extractedData.total_amount || extractedData.amount,
        // New enhanced fields for tax splitting
        total_amount: extractedData.total_amount || extractedData.amount,
        subtotal_amount: extractedData.subtotal_amount || null,
        tax_lines: extractedData.tax_lines || extractedData.taxes || [],
        tax_included_hint: extractedData.tax_included_hint || false,
        // Other fields
        vendor: extractedData.vendor,
        date: extractedData.date,
        description: language === "fr" 
          ? (extractedData.description_fr || extractedData.description_en || extractedData.description)
          : (extractedData.description_en || extractedData.description_fr || extractedData.description),
        description_en: extractedData.description_en || extractedData.description,
        description_fr: extractedData.description_fr || extractedData.description,
        line_items: extractedData.line_items,
        taxes: extractedData.taxes, // Keep for backward compatibility
        currency: extractedData.currency,
        // Category suggestion
        suggested_category: suggestedCategory,
        suggested_category_id: suggestedCategoryId,
        category_confidence: categoryConfidence,
        category_source: categorySource,
        // For learning
        vendor_normalized: normalizedVendor,
        extracted_keywords: extractKeywords([vendor, descriptionText].join(" "))
      }
    };

    console.log("Scan result:", JSON.stringify(result, null, 2));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in scan-receipt function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
