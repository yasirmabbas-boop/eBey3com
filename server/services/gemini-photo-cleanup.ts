export const UNCLEAR_SUBJECT_TOKEN = "UNCLEAR_SUBJECT" as const;
export const BACKGROUND_TOO_COMPLEX_MESSAGE =
  "Background too complex to clean. Please try a clearer photo." as const;

export type PhotoCleanupResult =
  | { kind: "image"; imageBuffer: Buffer; mimeType: string }
  | { kind: "unclear_subject" };

function buildSystemInstruction(): string {
  // User-provided policy. MUST be followed as written.
  return `You are a professional e-commerce photo editor.
Your ONLY task is to replace the background of the provided photo. The item must remain exactly the same in appearance.

ALLOWED EDITS (background only):
Replace the background with a single, solid, uniform color using ONLY ONE of:
White #FFFFFF
Light gray #F2F2F2
Choose the color that provides clear contrast with the item so the item is easy to see (typically #F2F2F2 for very light/silver items; #FFFFFF for darker items).
Background must be flat: no gradients, textures, patterns, shadows, vignettes, reflections, or added surfaces.

STRICTLY FORBIDDEN (item must be unchanged):
Do NOT change the item in ANY way. Do NOT add/remove details. Do NOT alter scratches, patina, dust, texture, sharpness, noise, engraving, logos, dial text, watch hands, indices, bezel, case edges, or reflections on the item.
Do NOT perform “enhancement” of the item: no denoise, no sharpen, no smoothing, no color correction, no relighting of the item.
Do NOT crop, rotate, warp, resize, or change perspective.
Do NOT add text, watermarks, props, or any new elements.

OUTPUT RULES:
If you can do this safely, output ONLY the edited image.
If you cannot confidently separate the item from the background without changing the item, output EXACTLY this token and nothing else:
${UNCLEAR_SUBJECT_TOKEN}`;
}

export function parseGeminiPhotoCleanupResponse(json: unknown): PhotoCleanupResult {
  const root = json as any;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  const parts = candidates?.[0]?.content?.parts;
  const safeParts = Array.isArray(parts) ? parts : [];

  // If an image is present, we treat it as the output and ignore any accompanying text.
  for (const part of safeParts) {
    const inline = part?.inline_data ?? part?.inlineData;
    const data = inline?.data;
    const mimeType = inline?.mime_type ?? inline?.mimeType ?? "image/png";
    if (typeof data === "string" && data.length > 0) {
      return { kind: "image", imageBuffer: Buffer.from(data, "base64"), mimeType };
    }
  }

  for (const part of safeParts) {
    const text = typeof part?.text === "string" ? part.text.trim() : "";
    if (text === BACKGROUND_TOO_COMPLEX_MESSAGE || text === `“${BACKGROUND_TOO_COMPLEX_MESSAGE}”`) {
      return { kind: "unclear_subject" };
    }
    if (text === UNCLEAR_SUBJECT_TOKEN) {
      return { kind: "unclear_subject" };
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
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const systemInstruction = buildSystemInstruction();
    const base64Image = imageBuffer.toString("base64");

    const payload = {
      system_instruction: { parts: [{ text: systemInstruction }] },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Replace ONLY the background per the system rules. Do not modify the item. If unsure, output UNCLEAR_SUBJECT.",
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
      // Don't leak provider internals (caller maps to a generic 502).
      throw new Error(`Gemini request failed with status ${res.status}`);
    }

    const json = text ? (JSON.parse(text) as unknown) : {};
    return parseGeminiPhotoCleanupResponse(json);
  } finally {
    clearTimeout(timeout);
  }
}

