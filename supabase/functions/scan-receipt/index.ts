import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, language = "fr" } = await req.json();
    
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

    const systemPrompt = language === "fr" 
      ? `Tu es un assistant spécialisé dans l'extraction de données de factures et reçus. 
         Analyse l'image fournie et extrais les informations suivantes au format JSON strict:
         - amount: le montant total (nombre décimal, sans symbole de devise)
         - vendor: le nom du vendeur/magasin/entreprise
         - date: la date au format YYYY-MM-DD
         - description: une brève description des achats
         - category: suggère une catégorie parmi: Fournitures, Transport, Repas, Services, Équipement, Marketing, Autres
         
         Réponds UNIQUEMENT avec le JSON, sans texte supplémentaire. Si tu ne peux pas extraire une information, utilise null.`
      : `You are an assistant specialized in extracting data from invoices and receipts.
         Analyze the provided image and extract the following information in strict JSON format:
         - amount: the total amount (decimal number, without currency symbol)
         - vendor: the vendor/store/business name
         - date: the date in YYYY-MM-DD format
         - description: a brief description of the purchases
         - category: suggest a category from: Supplies, Transportation, Meals, Services, Equipment, Marketing, Other
         
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
    let extractedData;
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData 
      }),
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
