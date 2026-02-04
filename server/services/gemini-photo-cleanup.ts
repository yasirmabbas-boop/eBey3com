export const UNCLEAR_SUBJECT_TOKEN = "UNCLEAR_SUBJECT" as const;

export type PhotoCleanupResult =
  | { kind: "image"; imageBuffer: Buffer; mimeType: string }
  | { kind: "unclear_subject" };

function buildSystemInstruction(): string {
  // Required instruction must appear verbatim. Guardrails appended below.
  const required = `You are a professional e-commerce image editor. Your task is to perform background removal and lighting enhancement.

REPLACE the background with a simple, solid neutral color (white, light grey, or off-white) that best fits the item context.
IMPROVE the overall lighting and clarity of the photo.
CRITICAL: Do not modify the item itself. Preserve all original scratches, textures, and signs of wear to ensure the listing remains authentic and honest.`;

  const guardrails = `

Additional required model guardrails:
- No cropping unless required to remove transparent borders; keep the original framing as much as possible.
- No logos/watermarks/text added.
- Output should be photorealistic and suitable for a marketplace listing.

Important behavior:
- If you cannot confidently identify the main subject, output ONLY the exact text "${UNCLEAR_SUBJECT_TOKEN}" and DO NOT output an image.
- Do not output any other text besides that token when you choose it.`;

  return `${required}${guardrails}`;
}

export function parseGeminiPhotoCleanupResponse(json: unknown): PhotoCleanupResult {
  const root = json as any;
  const candidates = Array.isArray(root?.candidates) ? root.candidates : [];
  const parts = candidates?.[0]?.content?.parts;
  const safeParts = Array.isArray(parts) ? parts : [];

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
            { text: "Clean the background and enhance lighting as instructed." },
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

