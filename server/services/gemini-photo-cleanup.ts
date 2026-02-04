export const UNCLEAR_SUBJECT_TOKEN = "UNCLEAR_SUBJECT" as const;

// What the API returns to the UI on 422
export const BACKGROUND_TOO_COMPLEX_MESSAGE =
  "Background too complex to clean. Please try a clearer photo." as const;

export type PhotoCleanupResult =
  | { kind: "image"; imageBuffer: Buffer; mimeType: string }
  | { kind: "unclear_subject" };

function buildSystemInstruction(): string {
  return `You are an e-commerce photo background remover.

CRITICAL RULES (NEVER BREAK):
1. KEEP EXACT SAME: angle, orientation, size, position, perspective. NO rotation. NO cropping. NO resizing.
2. ITEM STAYS IDENTICAL: Every scratch, reflection, texture, detail must remain exactly as-is. NO enhancement. NO cleanup. NO modification.
3. ONLY replace background with SOLID WHITE (#FFFFFF) or LIGHT GRAY (#F2F2F2) - whichever gives better contrast.
4. NO gradients, shadows, surfaces, props, text, or any added elements.

OUTPUT:
- Success: Return ONLY the edited image (same dimensions as input).
- Cannot do safely: Return EXACTLY: ${UNCLEAR_SUBJECT_TOKEN}`;
}

export function parseGeminiPhotoCleanupResponse(json: unknown): PhotoCleanupResult {
  const root = json as any;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  const parts = candidates?.[0]?.content?.parts;
  const safeParts = Array.isArray(parts) ? parts : [];

  // FAIL-CLOSED: if token is present anywhere, treat as unclear even if an image is present.
  for (const part of safeParts) {
    const text = typeof part?.text === "string" ? part.text.trim() : "";
    if (text === UNCLEAR_SUBJECT_TOKEN) {
      return { kind: "unclear_subject" };
    }
  }

  // Optional backward-compatible fallback (in case the model outputs the sentence)
  for (const part of safeParts) {
    const text = typeof part?.text === "string" ? part.text.trim() : "";
    if (
      text === BACKGROUND_TOO_COMPLEX_MESSAGE ||
      text === `"${BACKGROUND_TOO_COMPLEX_MESSAGE}"`
    ) {
      return { kind: "unclear_subject" };
    }
  }

  // Otherwise, look for an inline image
  for (const part of safeParts) {
    const inline = part?.inline_data ?? part?.inlineData;
    const data = inline?.data;
    const mimeType = inline?.mime_type ?? inline?.mimeType ?? "image/png";
    if (typeof data === "string" && data.length > 0) {
      return { kind: "image", imageBuffer: Buffer.from(data, "base64"), mimeType };
    }
  }

  throw new Error("Gemini did not return an image");
}

export async function cleanListingPhotoWithGemini(opts: {
  apiKey: string;
  imageBuffer: Buffer;
  mimeType: string;
  model?: string;
  timeoutMs?: number;
}): Promise<PhotoCleanupResult> {
  const { apiKey, imageBuffer, mimeType } = opts;
  const model = opts.model || process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-preview-05-20";
  const timeoutMs = opts.timeoutMs ?? 60_000;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

    const systemInstruction = buildSystemInstruction();
    const base64Image = imageBuffer.toString("base64");

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Replace ONLY the background. Keep exact same angle, size, position. Output same dimensions. Do not modify the item in any way.",
            },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.0,
      },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Gemini request failed with status ${res.status}`);
    }

    const json = text ? (JSON.parse(text) as unknown) : {};
    return parseGeminiPhotoCleanupResponse(json);
  } finally {
    clearTimeout(timeout);
  }
}
