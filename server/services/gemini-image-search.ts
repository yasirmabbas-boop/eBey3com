import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Analyze an image using Gemini vision and extract search keywords.
 * Returns brand, item type, style, colors, and other identifying features.
 * This replaces the OpenAI GPT-4o implementation with Gemini for consistency and cost savings.
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
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[gemini-image-search] GEMINI_API_KEY not found in environment variables");
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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash-exp",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
      }
    });

    // Parse base64 string - handle data:image/...;base64, prefix
    let base64Data = imageBase64;
    let mimeType = 'image/jpeg';
    
    if (imageBase64.startsWith('data:')) {
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        // Fallback: try to extract base64 part
        const base64Index = imageBase64.indexOf('base64,');
        if (base64Index !== -1) {
          base64Data = imageBase64.substring(base64Index + 7);
        }
      }
    }

    const prompt = `You are an expert luxury product identifier specializing in watches, jewelry, and collectibles. Your task is to analyze product images with HIGH ACCURACY for brand recognition.

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
- Be specific about the watch style and distinguishing features

Analyze this product image carefully. Focus on identifying the BRAND first by examining logos, design elements, and distinctive features. Then extract all identifying details:`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    if (!text) {
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
      const parsed = JSON.parse(text);
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
    } catch (parseError) {
      console.error("[gemini-image-search] Failed to parse JSON response:", parseError);
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
  } catch (error) {
    console.error("[gemini-image-search] Error analyzing image:", error);
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
