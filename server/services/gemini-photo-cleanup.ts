export const UNCLEAR_SUBJECT_TOKEN = "UNCLEAR_SUBJECT" as const;
export const BACKGROUND_TOO_COMPLEX_MESSAGE =
  "Background too complex to clean. Please try a clearer photo." as const;

export type PhotoCleanupResult =
  | { kind: "image"; imageBuffer: Buffer; mimeType: string }
  | { kind: "unclear_subject" };

function buildSystemInstruction(): string {
  // User-provided policy. MUST be followed as written.
  return `ALLOWED EDITS (background only):
Remove/replace the background with a single, solid, neutral color selected based on the item’s tones so the item is clearly separated. Choose one of: pure white (#FFFFFF), off‑white (#FAFAFA), or light gray (#F2F2F2).
Pick the shade that provides clean contrast with the item (e.g., use light gray for very light/silver items; use white/off‑white for darker items). The goal is maximum subject readability with a natural look.
The background must remain uniform and flat (no gradients, textures, shadows, vignettes, or patterns).

STRICTLY FORBIDDEN (item must be unchanged):
Do NOT change the product in ANY way. This includes: adding/removing scratches, altering textures, smoothing, sharpening, denoising the item, changing reflections, changing colors, changing brightness/contrast on the item, altering logos/engraving, modifying watch hands, dial indices, bezel, case edges, or any small details.
Do NOT “enhance,” “beautify,” “restore,” “retouch,” “repair,” “reconstruct,” or “improve” the item.
Do NOT crop, rotate, warp, or change perspective.
Do NOT add text, watermarks, props, shadows, or any new elements.

QUALITY REQUIREMENTS:
Keep the original framing and resolution.
Preserve natural edges; avoid halos/cutout artifacts.

FAIL-CLOSED RULE:
If you cannot confidently separate the item from the background without altering the item, respond with exactly:
“${BACKGROUND_TOO_COMPLEX_MESSAGE}”

Implementation notes:
- When the FAIL-CLOSED RULE applies, output ONLY that sentence and do NOT output an image.
- Do not output any other text.`;
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
            { text: "Replace background only, following the policy exactly." },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        temperature: 0.3,
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

