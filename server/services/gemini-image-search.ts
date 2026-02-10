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
      model: "gemini-2.5-flash",
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

    const prompt = `You are an expert product identifier for an e-commerce marketplace. You can recognize products across ALL categories with HIGH ACCURACY for brand recognition.

CRITICAL: Focus heavily on identifying the BRAND. Look for:
- Logos, brand names, or text printed/engraved on the product
- Distinctive design elements unique to specific brands
- Packaging, labels, or tags visible in the image
- Known product designs (e.g., Submariner dial, iPhone notch, Nike swoosh, Louis Vuitton monogram)

== WATCHES & JEWELRY ==
- Luxury: Rolex, Omega, Patek Philippe, Audemars Piguet, Cartier, IWC, Breitling, TAG Heuer, Panerai, Hublot, Tudor
- Mid-range: Tissot, Longines, Hamilton, Seiko, Citizen, Orient, Casio G-Shock
- Fashion: Fossil, Michael Kors, Armani, Guess, Diesel

== ELECTRONICS ==
- Phones: Apple iPhone, Samsung Galaxy, Huawei, Xiaomi, OnePlus, Google Pixel
- Laptops: MacBook, Dell, HP, Lenovo, Asus, Acer
- Audio: AirPods, Sony, Bose, JBL, Beats, Samsung Galaxy Buds
- Gaming: PlayStation, Xbox, Nintendo Switch
- Cameras: Canon, Nikon, Sony, Fujifilm

== CLOTHING & ACCESSORIES ==
- Luxury: Louis Vuitton, Gucci, Prada, Chanel, Hermès, Dior, Burberry
- Sportswear: Nike, Adidas, Puma, New Balance, Under Armour
- Bags, shoes, sunglasses: identify brand and specific model if possible

== VEHICLES ==
- Make & model: Toyota, Mercedes, BMW, Lexus, Honda, Nissan, Kia, Hyundai
- Identify year range if visible from body style

Respond in JSON:
{
  "brand": "exact brand name if identifiable, null only if truly unrecognizable",
  "brandVariants": ["alternative spellings", "Arabic name", "common misspellings"],
  "model": "specific model name if known (e.g., Submariner, iPhone 15 Pro, Air Jordan 1)",
  "itemType": "specific type (wristwatch, smartphone, laptop, sneakers, sedan, handbag, etc.)",
  "category": "ساعات for watches, إلكترونيات for electronics, ملابس for clothing/shoes/bags, سيارات for vehicles, مجوهرات for jewelry, تحف وأثاث for antiques/furniture, أخرى for other",
  "colors": ["primary color", "secondary colors"],
  "material": "gold, steel, leather, fabric, plastic, etc.",
  "keywords": ["brand-specific terms", "style descriptors", "Arabic terms for the product"],
  "description": "وصف قصير بالعربية يتضمن الماركة والنوع"
}

IMPORTANT:
- If you see ANY brand indicators, identify the brand - don't default to null
- Include brand name in multiple formats in keywords (English, Arabic transliteration)
- Choose the most specific category from the list above
- Be specific about distinguishing features, model names, and condition

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
