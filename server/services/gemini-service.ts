import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ProductAnalysis {
  title: string;
  price: number;
  description: string;
  category: 'Clothing' | 'Home' | 'Electronics' | 'Other';
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
  "title": "Bilingual title - English | العنوان بالعربي",
  "price": 50000,
  "description": "وصف تفصيلي للمنتج باللهجة العراقية يوضح المواصفات والحالة.",
  "category": "One of: Clothing, Home, Electronics, or Other",
  "tags": ["#english1", "#عربي1", "#english2", "#عربي2", "#english3"],
  "model": "Model number if visible (e.g., iPhone 14 Pro, Rolex Submariner 116610)"
}

Rules:
1. title: Bilingual format "English Title | العنوان العربي" (max 80 characters total). Include the model/brand name if visible.

2. price: Integer only (no decimals), suggest a reasonable Iraqi Dinar (IQD) price. Ranges: cheap items 10,000-50,000, medium 50,000-200,000, expensive 200,000-1,000,000+

3. description: Write in IRAQI ARABIC DIALECT (اللهجة العراقية). NOT a sales pitch! Instead, describe:
   - What the item IS (type, brand, model if visible)
   - Key specifications or features visible in the image
   - Apparent condition (new, used, any visible wear)
   - What's included if multiple items shown
   Example: "ساعة رولكس سبمارينر موديل 116610. الساعة اصلية وحالتها ممتازة، الكريستال نظيف بدون خدوش."

4. category: IMPORTANT - Choose correctly:
   - "Clothing" = ONLY clothes, shoes, bags, fashion accessories worn on body
   - "Electronics" = phones, computers, TVs, cameras, gaming consoles, audio equipment
   - "Home" = furniture, kitchenware, decor, appliances, tools
   - "Other" = watches, jewelry, collectibles, sports equipment, vehicles, anything else
   NOTE: Watches are "Other", NOT "Clothing"!

5. tags: 5 hashtags mixing English AND Arabic. Include brand/model tags if applicable.

6. model: Look carefully for any model numbers, serial numbers, or specific product names visible on the item or packaging. For watches, look for reference numbers. For electronics, look for model names. Return null if not visible.

Focus on ACCURACY and helpful buyer information, not marketing language.`;

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
    
    const validCategories = ['Clothing', 'Home', 'Electronics', 'Other'];
    if (!validCategories.includes(analysis.category)) {
      analysis.category = 'Other';
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
