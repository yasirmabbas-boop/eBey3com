export const UNCLEAR_SUBJECT_TOKEN = "UNCLEAR_SUBJECT" as const;

// What the API returns to the UI on 422
export const BACKGROUND_TOO_COMPLEX_MESSAGE =
  "Background too complex to clean. Please try a clearer photo." as const;

export type PhotoCleanupResult =
  | { kind: "image"; imageBuffer: Buffer; mimeType: string }
  | { kind: "unclear_subject" };

function buildSystemInstruction(): string {
  return `You're a background replacement expert for photos that will be listed on online site like ebay. Most of the items are used, so it is importnat to ensure no enhancement of the item itself is done. Your work is to remove the background and replace it with a flat solid color that is akin to ebay product photos.

ABSOLUTE RULES:
- enhance the background with a FLAT SOLID COLOR: white (#FFFFFF) or light gray (#F2F2F2). Use only sold colors that give the ebay product vibe. Do not use gradients, textures, or patterns.
- The product must remain PIXEL-PERFECT IDENTICAL. Do not change, enhance, sharpen, denoise, relight, rotate, crop, resize, or modify the product in ANY way.
- Do NOT add anything: no shadows, no reflections, no surfaces, no tables, no scenery, no props, no gradients, no studio setups, no decorations.
- Output dimensions must match input dimensions exactly.


If you cannot cleanly separate the product from the background, return the text: ${UNCLEAR_SUBJECT_TOKEN}`;
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
  const model = opts.model || process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
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
              text: "Remove background only. Replace with flat solid white or gray.",
            },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["IMAGE"],
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
