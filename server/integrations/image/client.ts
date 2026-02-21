import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Analyze an image using GPT-4o vision and extract search keywords.
 * Returns brand, item type, style, colors, and other identifying features.
 */
export async function analyzeImageForSearch(imageBase64: string): Promise<{
  brand: string | null;
  brandVariants: string[];
  itemType: string;
  category: string;
  keywords: string[];
  description: string;
  model: string | null;
  colors: string[];
  material: string | null;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert luxury product identifier specializing in watches, jewelry, and collectibles. Your task is to analyze product images with HIGH ACCURACY for brand recognition.

CRITICAL: Focus heavily on identifying the BRAND. Look for:
- Logo on the dial, case, or band
- Crown shape and position
- Case design unique to specific brands
- Font style of numbers/text
- Known watch face designs (Submariner, Speedmaster, Royal Oak, etc.)

Common watch brands to look for:
- Luxury: Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, IWC, Breitling, TAG Heuer, Panerai, Hublot, Tudor
- Mid-range: Tissot, Longines, Hamilton, Seiko, Citizen, Orient, Casio G-Shock
- Fashion: Fossil, Michael Kors, Armani, Guess, Diesel

Respond in JSON:
{
  "brand": "exact brand name if identifiable, null only if truly unrecognizable",
  "brandVariants": ["alternative spellings", "Arabic name", "common misspellings"],
  "model": "specific model name if known (e.g., Submariner, Speedmaster)",
  "itemType": "specific type (wristwatch, pocket watch, necklace, ring, etc.)",
  "category": "ساعات for watches, مجوهرات for jewelry, إكسسوارات for accessories",
  "colors": ["primary color", "secondary colors"],
  "material": "gold, steel, leather, etc.",
  "keywords": ["brand-specific terms", "style descriptors", "Arabic terms"],
  "description": "وصف قصير بالعربية يتضمن الماركة والنوع"
}

IMPORTANT: 
- If you see ANY brand indicators, identify the brand - don't default to null
- Include brand name in multiple formats in keywords (English, Arabic transliteration)
- Be specific about the watch style and distinguishing features`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product image carefully. Focus on identifying the BRAND first by examining logos, design elements, and distinctive features. Then extract all identifying details:"
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              detail: "high"
            }
          }
        ]
      }
    ],
    max_tokens: 500,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      brand: null,
      brandVariants: [],
      itemType: "unknown",
      category: "أخرى",
      keywords: [],
      description: "",
      model: null,
      colors: [],
      material: null
    };
  }

  try {
    const parsed = JSON.parse(content);
    return {
      brand: parsed.brand || null,
      brandVariants: Array.isArray(parsed.brandVariants) ? parsed.brandVariants : [],
      itemType: parsed.itemType || "unknown",
      category: parsed.category || "أخرى",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      description: parsed.description || "",
      model: parsed.model || null,
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      material: parsed.material || null
    };
  } catch {
    return {
      brand: null,
      brandVariants: [],
      itemType: "unknown",
      category: "أخرى",
      keywords: [],
      description: "",
      model: null,
      colors: [],
      material: null
    };
  }
}
