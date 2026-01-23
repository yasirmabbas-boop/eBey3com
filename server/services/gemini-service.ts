import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ProductAnalysis {
  title: string;
  price: number;
  description: string;
  category: 'Clothing' | 'Home' | 'Electronics' | 'Other';
  tags: string[];
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

    const prompt = `You are an expert product listing assistant for an Iraqi e-commerce marketplace. Analyze this product image and generate listing data to help sellers list their items faster.

CRITICAL: Return ONLY a valid JSON object with these exact fields (no markdown, no code blocks, no explanations):

{
  "title": "Bilingual title - English | العنوان بالعربي",
  "price": 50000,
  "description": "وصف المنتج باللهجة العراقية. جملتين تقنع المشتري بشراء المنتج.",
  "category": "One of: Clothing, Home, Electronics, or Other",
  "tags": ["#english1", "#عربي1", "#english2", "#عربي2", "#english3"]
}

Rules:
1. title: Bilingual format "English Title | العنوان العربي" (max 80 characters total). Include both English and Arabic versions separated by |
2. price: Integer only (no decimals), suggest a reasonable Iraqi Dinar (IQD) price based on the item's apparent quality and type. Common ranges: cheap items 10,000-50,000, medium 50,000-200,000, expensive 200,000-1,000,000+
3. description: Write in IRAQI ARABIC DIALECT (اللهجة العراقية). Exactly 2 sentences that would convince an Iraqi buyer to purchase. Use casual Iraqi expressions.
4. category: Must be one of: Clothing, Home, Electronics, Other
5. tags: Exactly 5 hashtags - mix of English AND Arabic tags (include #, no spaces in tags). Example: #vintage, #عتيق, #electronics, #الكترونيات, #iphoneلايفون

Analyze the image carefully and create compelling, accurate listing data for the Iraqi market.`;

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
    
    if (analysis.title.length > 50) {
      analysis.title = analysis.title.substring(0, 47) + '...';
    }
    
    analysis.price = Math.round(analysis.price);
    
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
