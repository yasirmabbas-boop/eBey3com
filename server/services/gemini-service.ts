import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ProductAnalysis {
  title: string;
  price: number;
  description: string;
  category: 'ساعات' | 'إلكترونيات' | 'ملابس' | 'مجوهرات' | 'تحف وأثاث' | 'مقتنيات' | 'أخرى';
  tags: string[];
  model: string | null;
}

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("[gemini-service] GEMINI_API_KEY not found in environment variables");
}

const genAI = new GoogleGenerativeAI(apiKey || "");
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.7,
  }
});

export async function analyzeProductImage(imageBuffer: Buffer, language: string = 'ar'): Promise<ProductAnalysis> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }

  try {
    const base64Image = imageBuffer.toString('base64');
    
    let mimeType = 'image/jpeg';
    if (imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50) {
      mimeType = 'image/png';
    } else if (imageBuffer[0] === 0x47 && imageBuffer[1] === 0x49) {
      mimeType = 'image/gif';
    } else if (imageBuffer[0] === 0x52 && imageBuffer[1] === 0x49) {
      mimeType = 'image/webp';
    }

    const isKurdish = language === 'ku';

    const descriptionLangInstruction = isKurdish
      ? `2. description: Write in SORANI KURDISH (کوردی سۆرانی).
   - Tone: Professional but friendly, like a trusted local merchant.
   - Structure:
     * Line 1: Clear identification (Brand, Model) in Kurdish.
     * Line 2: Specific details found in images (Size, material, specs) in Kurdish.
     * Line 3: Condition & Accessories (Box, charger, scratches) in Kurdish.
   - CRITICAL: Verify material claims. Do not claim "ئەسڵی" (Original). Leave that to the seller to add if they wish.`
      : `2. description: Write in IRAQI ARABIC (اللهجة العراقية).
   - Tone: Professional but local (مثل دلالية السوق).
   - Structure:
     * Line 1: Clear identification (Brand, Model).
     * Line 2: Specific details found in images (Size, material, specs).
     * Line 3: Condition & Accessories (Box, charger, scratches).
   - CRITICAL: Verify material claims. Do not claim "Original" (أصلي). Leave that to the seller to add if they wish.`;

    const titleInstruction = isKurdish
      ? `1. title: "Kurdish Title | English Title" (Max 80 chars).
   - Format: Brand (Transliterated to Kurdish) + Model + Key Feature.
   - Transliteration Guide: Citizen→سیتیزن, Rolex→ڕۆلێکس, Apple→ئاپڵ, Samsung→سامسۆنگ, Huawei→هواوەی, Casio→کاسیۆ, Seiko→سێکۆ.
   - Example: "کاتژمێری سیتیزن ئیکۆ درایڤ پیاوانە | Citizen Eco-Drive Men's Watch"`
      : `1. title: "Arabic Title | English Title" (Max 80 chars).
   - Format: Brand (Transliterated) + Model + Key Feature.
   - Transliteration Guide: Citizen→سيتيزن, Rolex→رولكس, Apple→آبل, Samsung→سامسونج, Huawei→هواوي, Casio→كاسيو, Seiko→سيكو.
   - Example: "ساعة سيتيزن ايكو درايف رجالية | Citizen Eco-Drive Men's Watch"`;

    const tagsInstruction = isKurdish
      ? `4. tags: Array of 5 strings. Mixed Kurdish/English specific to the item.`
      : `4. tags: Array of 5 strings. Mixed Arabic/English specific to the item.`;

    const materialsWarning = isKurdish
      ? `2. MATERIALS vs. COLOR: Be skeptical. Do NOT say "زێڕ" (Gold) unless you see a hallmark (e.g., 18k, 750, 21k). If no hallmark is visible, you MUST use "ڕەنگی زێڕین" (Gold color) or "ڕووکش" (Plated).`
      : `2. MATERIALS vs. COLOR: Be skeptical. Do NOT say "Gold" (ذهب) unless you see a hallmark (e.g., 18k, 750, 21k). If no hallmark is visible, you MUST use "لون ذهبي" (Gold color) or "مطلي" (Plated).`;

    const prompt = `You are an expert Iraqi merchant and product appraiser (دلال خبير) for a Baghdad-based e-commerce platform. Your goal is to analyze a set of product images and generate a highly accurate, trustworthy sales listing.

INPUT CONTEXT:
You will be provided with one or more images of a single product. You must synthesize information from ALL images (e.g., front design, text on the back, labels on the box, included accessories) to create the most complete description possible.

STEP 1: VISUAL ANALYSIS (Internal Monologue)
Before generating JSON, you must analyze the images step-by-step. Look for:
1. TEXT & OCR: Read ALL text visible on the product, labels, and box. Identify Brand Names, Model Numbers (alphanumeric codes), and Serial Numbers.
${materialsWarning}
3. CONDITION: Look for scratches, dents, or wear. Does it have the original box?
4. CATEGORY CHECK: Is it a smart watch or analog? Is it a phone or a cover?

STEP 2: JSON GENERATION
Generate a single valid JSON object based on your analysis.

Rules for JSON Fields:
${titleInstruction}

${descriptionLangInstruction}

3. category: Choose  from: ["ساعات" "مكياج", "إلكترونيات", "ملابس", "مجوهرات", "تحف وأثاث", "مقتنيات", "أخرى"]

${tagsInstruction}

5. model: The exact alphanumeric model number found in the images (e.g., "M79230N", "SM-S908E"). If none found, return null.

OUTPUT FORMAT:
Return ONLY the JSON object. Do not output the analysis text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();
    
    const analysis = JSON.parse(text) as ProductAnalysis;
    
    const validCategories = ['ساعات', 'إلكترونيات', 'ملابس', 'مجوهرات', 'تحف وأثاث', 'مقتنيات', 'أخرى'];
    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'أخرى';
    }
    
    if (analysis.title.length > 80) {
      analysis.title = analysis.title.substring(0, 77) + '...';
    }
    
    analysis.price = Math.round(analysis.price);
    
    if (!analysis.model || analysis.model === 'null' || analysis.model === '') {
      analysis.model = null;
    }
    
    if (!Array.isArray(analysis.tags)) {
      analysis.tags = [];
    }
    while (analysis.tags.length < 5) {
      analysis.tags.push(`#product${analysis.tags.length + 1}`);
    }
    if (analysis.tags.length > 5) {
      analysis.tags = analysis.tags.slice(0, 5);
    }
    
    analysis.tags = analysis.tags.map(tag => {
      const cleaned = tag.trim().replace(/\s+/g, '');
      return cleaned.startsWith('#') ? cleaned : `#${cleaned}`;
    });
    
    console.log('[gemini-service] Successfully analyzed image:', {
      title: analysis.title,
      category: analysis.category,
      price: analysis.price
    });
    
    return analysis;
    
  } catch (error) {
    console.error('[gemini-service] Error analyzing image:', error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    }
    throw new Error('Failed to analyze image: Unknown error');
  }
}
