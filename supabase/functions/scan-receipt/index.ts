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

// Category keyword mapping for suggestions
const categoryKeywords: Record<string, { en: string[]; fr: string[] }> = {
  "Transport": {
    en: ["fuel", "gas", "gasoline", "diesel", "petrol", "uber", "taxi", "lyft", "parking", "transit", "bus", "train", "metro", "subway", "flight", "airline", "rental", "car", "toll", "highway"],
    fr: ["essence", "diesel", "carburant", "taxi", "uber", "stationnement", "parking", "transport", "bus", "train", "metro", "vol", "avion", "location", "voiture", "peage", "autoroute"]
  },
  "Repas": {
    en: ["restaurant", "cafe", "coffee", "food", "meal", "lunch", "dinner", "breakfast", "snack", "pizza", "burger", "sushi", "takeout", "delivery", "doordash", "ubereats", "grubhub"],
    fr: ["restaurant", "cafe", "nourriture", "repas", "dejeuner", "diner", "petit-dejeuner", "collation", "pizza", "burger", "sushi", "livraison"]
  },
  "Fournitures": {
    en: ["office", "supplies", "paper", "pen", "ink", "printer", "staples", "folder", "notebook", "stationery", "envelope", "desk"],
    fr: ["bureau", "fournitures", "papier", "stylo", "encre", "imprimante", "agrafeuse", "classeur", "cahier", "papeterie", "enveloppe"]
  },
  "Services": {
    en: ["subscription", "software", "saas", "cloud", "hosting", "service", "consulting", "professional", "legal", "accounting", "insurance", "internet", "phone", "mobile"],
    fr: ["abonnement", "logiciel", "saas", "cloud", "hebergement", "service", "consultation", "professionnel", "juridique", "comptable", "assurance", "internet", "telephone", "mobile"]
  },
  "Équipement": {
    en: ["computer", "laptop", "monitor", "keyboard", "mouse", "hardware", "equipment", "machine", "device", "electronics", "camera", "phone", "tablet"],
    fr: ["ordinateur", "portable", "ecran", "clavier", "souris", "materiel", "equipement", "machine", "appareil", "electronique", "camera", "telephone", "tablette"]
  },
  "Marketing": {
    en: ["advertising", "ads", "marketing", "promotion", "campaign", "google", "facebook", "instagram", "linkedin", "social", "media", "print", "flyer", "banner"],
    fr: ["publicite", "pub", "marketing", "promotion", "campagne", "google", "facebook", "instagram", "linkedin", "social", "media", "impression", "flyer", "banniere"]
  },
  "Télécommunications": {
    en: ["phone", "mobile", "cell", "telecom", "internet", "wifi", "broadband", "data"],
    fr: ["telephone", "mobile", "cellulaire", "telecom", "internet", "wifi", "donnees"]
  },
  "Bureau à domicile": {
    en: ["home", "office", "electricity", "electric", "hydro", "utility", "utilities", "heating", "cooling", "rent", "mortgage"],
    fr: ["domicile", "bureau", "electricite", "hydro", "utilite", "chauffage", "climatisation", "loyer", "hypotheque"]
  }
};

// Suggest category based on vendor and description
function suggestCategory(vendor: string, description: string, lineItems: string[]): { category: string; confidence: number; keywords: string[] } {
  const normalizedVendor = normalizeVendor(vendor);
  const allText = [vendor, description, ...lineItems].join(" ");
  const keywords = extractKeywords(allText);
  
  let bestCategory = "Autres";
  let bestScore = 0;
  const matchedKeywords: string[] = [];
  
  for (const [category, categoryKws] of Object.entries(categoryKeywords)) {
    const allKws = [...categoryKws.en, ...categoryKws.fr];
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
    }
  }
  
  const confidence = Math.min(bestScore / 5, 1); // Normalize to 0-1
  return { 
    category: confidence >= 0.2 ? bestCategory : "Autres", 
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

    // Fetch learned category mappings if companyId is provided
    let learnedMappings: { key: string; category_id: string; mapping_type: string }[] = [];
    let categories: { id: string; name: string; name_en?: string; name_fr?: string }[] = [];
    
    if (companyId && userId) {
      const [mappingsResult, categoriesResult] = await Promise.all([
        supabase
          .from("expense_category_mappings")
          .select("key, category_id, mapping_type")
          .eq("company_id", companyId)
          .eq("user_id", userId),
        supabase
          .from("categories")
          .select("id, name, name_en, name_fr")
          .eq("user_id", userId)
          .eq("for_expenses", true)
      ]);
      
      if (mappingsResult.data) {
        learnedMappings = mappingsResult.data;
      }
      if (categoriesResult.data) {
        categories = categoriesResult.data;
      }
    }

    const systemPrompt = language === "fr" 
      ? `Tu es un assistant spécialisé dans l'extraction de données de factures et reçus.
         Analyse l'image fournie et extrais les informations suivantes au format JSON strict:
         - amount: le montant total (nombre décimal, sans symbole de devise)
         - vendor: le nom du vendeur/magasin/entreprise
         - date: la date au format YYYY-MM-DD
         - description_fr: une brève description des achats EN FRANÇAIS
         - description_en: une brève description des achats EN ANGLAIS (traduis si nécessaire)
         - line_items: tableau des articles achetés avec description
         - taxes: tableau des taxes avec nom et montant (ex: TPS, TVQ)
         - currency: devise détectée (CAD, USD, EUR, etc.)
         
         Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire. Si tu ne peux pas extraire une information, utilise null.`
      : `You are an assistant specialized in extracting data from invoices and receipts.
         Analyze the provided image and extract the following information in strict JSON format:
         - amount: the total amount (decimal number, without currency symbol)
         - vendor: the vendor/store/business name
         - date: the date in YYYY-MM-DD format
         - description_en: a brief description of the purchases IN ENGLISH
         - description_fr: a brief description of the purchases IN FRENCH (translate if needed)
         - line_items: array of purchased items with descriptions
         - taxes: array of taxes with name and amount (e.g., GST, PST)
         - currency: detected currency (CAD, USD, EUR, etc.)
         
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

    // Smart category suggestion
    const vendor = extractedData.vendor || "";
    const lineItems = extractedData.line_items || [];
    const descriptionText = extractedData.description_en || extractedData.description_fr || "";
    
    let suggestedCategory: string | null = null;
    let suggestedCategoryId: string | null = null;
    let categoryConfidence = 0;
    let categorySource: "learned_vendor" | "learned_keyword" | "ai_suggestion" | "default" = "default";
    
    // 1. First check learned vendor mappings
    const normalizedVendor = normalizeVendor(vendor);
    const vendorMapping = learnedMappings.find(
      m => m.mapping_type === "vendor" && m.key === normalizedVendor
    );
    
    if (vendorMapping) {
      suggestedCategoryId = vendorMapping.category_id;
      const matchedCategory = categories.find(c => c.id === suggestedCategoryId);
      suggestedCategory = matchedCategory?.name || null;
      categoryConfidence = 1;
      categorySource = "learned_vendor";
    }
    
    // 2. If no vendor mapping, check keyword mappings
    if (!suggestedCategory) {
      const keywords = extractKeywords([vendor, descriptionText, ...lineItems.map((i: any) => i?.description || i)].join(" "));
      
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
      const suggestion = suggestCategory(vendor, descriptionText, lineItemTexts);
      suggestedCategory = suggestion.category;
      categoryConfidence = suggestion.confidence;
      categorySource = "ai_suggestion";
      
      // Try to match to user's category
      const matchedCategory = categories.find(c => 
        c.name === suggestion.category || 
        c.name_en === suggestion.category || 
        c.name_fr === suggestion.category
      );
      if (matchedCategory) {
        suggestedCategoryId = matchedCategory.id;
        suggestedCategory = matchedCategory.name;
      }
    }
    
    // Build response with bilingual descriptions
    const result = {
      success: true,
      data: {
        amount: extractedData.amount,
        vendor: extractedData.vendor,
        date: extractedData.date,
        description: language === "fr" 
          ? (extractedData.description_fr || extractedData.description_en || extractedData.description)
          : (extractedData.description_en || extractedData.description_fr || extractedData.description),
        description_en: extractedData.description_en || extractedData.description,
        description_fr: extractedData.description_fr || extractedData.description,
        line_items: extractedData.line_items,
        taxes: extractedData.taxes,
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
