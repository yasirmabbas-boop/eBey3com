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
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.7,
  }
});

export async function analyzeProductImage(imageBuffer: Buffer): Promise<ProductAnalysis> {
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

    const prompt = `You are an expert product analyst for an Iraqi e-commerce marketplace. Analyze this product image and extract accurate information to help buyers understand what they're purchasing.

CRITICAL: Return ONLY a valid JSON object with these exact fields (no markdown, no code blocks, no explanations):

{
  "title": "العنوان بالعربي | English Title",
  "price": 50000,
  "description": "وصف تفصيلي للمنتج باللهجة العراقية يوضح المواصفات والحالة ورقم الموديل.",
  "category": "ساعات",
  "tags": ["#عربي1", "#english1", "#عربي2", "#english2", "#عربي3"],
  "model": "Model number if visible"
}

Rules:
1. title: ARABIC FIRST format "العنوان العربي | English Title" (max 80 characters total). Include brand and model.
   IMPORTANT for brand names: TRANSLITERATE to Arabic letters, do NOT translate!
   - Citizen → سيتيزن (NOT مواطن)
   - Rolex → رولكس
   - Samsung → سامسونج
   - Apple → آبل
   - Casio → كاسيو
   - Seiko → سيكو

2. price: Integer only (no decimals), suggest a reasonable Iraqi Dinar (IQD) price. Ranges: cheap items 10,000-50,000, medium 50,000-200,000, expensive 200,000-1,000,000+

3. description: Write in IRAQI ARABIC DIALECT (اللهجة العراقية). NOT a sales pitch! Provide factual information:
   - What the item IS (type, brand transliterated to Arabic, model)
   - Model number/reference number if visible in the image (IMPORTANT: look for numbers on the item, box, or documentation)
   - Key specifications or features visible
   - Apparent condition (new, used, any visible wear)
   - What's included if multiple items shown
   Example: "ساعة سيتيزن موديل BN0151-09L. ساعة غطس اصلية، مقاومة للماء 200 متر، حالتها ممتازة."
   IMPORTANT: Brand names must be transliterated (سيتيزن not مواطن)

4. category: Use these EXACT Arabic category names:
   - "ساعات" = watches (wristwatches, pocket watches, smart watches)
   - "إلكترونيات" = electronics (phones, computers, TVs, cameras, gaming, audio)
   - "ملابس" = clothing (clothes, shoes, bags, fashion accessories)
   - "مجوهرات" = jewelry (rings, necklaces, bracelets, precious items)
   - "تحف وأثاث" = antiques & furniture
   - "مقتنيات" = collectibles (rare items, memorabilia, art)
   - "أخرى" = other (anything that doesn't fit above)

5. tags: 5 hashtags with Arabic FIRST, then English. Include brand/model tags.

6. model: Extract any visible model numbers, reference numbers, or serial numbers from the image. Look at the item itself, packaging, documentation, or labels. Return null if not visible.

Focus on ACCURACY. Transliterate brand names, extract model numbers, provide helpful buyer information.`;

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
