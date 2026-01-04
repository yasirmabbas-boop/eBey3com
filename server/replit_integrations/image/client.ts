import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

/**
 * Analyze an image using GPT-4o-mini vision and extract search keywords.
 * Returns brand, item type, style, colors, and other identifying features.
 */
export async function analyzeImageForSearch(imageBase64: string): Promise<{
  brand: string | null;
  itemType: string;
  category: string;
  keywords: string[];
  description: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are an expert product identifier for an Iraqi marketplace. Analyze images and extract:
- Brand name (if visible or recognizable)
- Item type (watch, clothing, electronics, etc.)
- Category (ساعات, ملابس, إلكترونيات, etc. in Arabic)
- Visual features: colors, materials, style, era
- Keywords for searching similar items

Respond in JSON format:
{
  "brand": "brand name or null if unknown",
  "itemType": "specific item type in English",
  "category": "Arabic category name",
  "keywords": ["keyword1", "keyword2", ...],
  "description": "brief Arabic description for search"
}`
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Analyze this product image and extract identifying features for searching similar items:"
          },
          {
            type: "image_url",
            image_url: {
              url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
              detail: "low"
            }
          }
        ]
      }
    ],
    max_tokens: 300,
    response_format: { type: "json_object" }
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return {
      brand: null,
      itemType: "unknown",
      category: "أخرى",
      keywords: [],
      description: ""
    };
  }

  try {
    const parsed = JSON.parse(content);
    return {
      brand: parsed.brand || null,
      itemType: parsed.itemType || "unknown",
      category: parsed.category || "أخرى",
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      description: parsed.description || ""
    };
  } catch {
    return {
      brand: null,
      itemType: "unknown",
      category: "أخرى",
      keywords: [],
      description: ""
    };
  }
}
