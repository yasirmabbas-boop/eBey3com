// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  BACKGROUND_TOO_COMPLEX_MESSAGE,
  parseGeminiPhotoCleanupResponse,
  UNCLEAR_SUBJECT_TOKEN,
} from "./gemini-photo-cleanup";

describe("parseGeminiPhotoCleanupResponse", () => {
  it("returns unclear_subject when model outputs the token", () => {
    const json = {
      candidates: [
        {
          content: {
            parts: [{ text: UNCLEAR_SUBJECT_TOKEN }],
          },
        },
      ],
    };

    expect(parseGeminiPhotoCleanupResponse(json)).toEqual({ kind: "unclear_subject" });
  });

  it("fails closed when model outputs token and an image", () => {
    const payload = Buffer.from("test-image-bytes");
    const json = {
      candidates: [
        {
          content: {
            parts: [
              { text: UNCLEAR_SUBJECT_TOKEN },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: payload.toString("base64"),
                },
              },
            ],
          },
        },
      ],
    };

    expect(parseGeminiPhotoCleanupResponse(json)).toEqual({ kind: "unclear_subject" });
  });

  it("returns unclear_subject when model outputs the exact fail-closed sentence", () => {
    const json = {
      candidates: [
        {
          content: {
            parts: [{ text: BACKGROUND_TOO_COMPLEX_MESSAGE }],
          },
        },
      ],
    };

    expect(parseGeminiPhotoCleanupResponse(json)).toEqual({ kind: "unclear_subject" });
  });

  it("extracts inline_data image parts (REST snake_case)", () => {
    const payload = Buffer.from("test-image-bytes");
    const json = {
      candidates: [
        {
          content: {
            parts: [
              {
                inline_data: {
                  mime_type: "image/png",
                  data: payload.toString("base64"),
                },
              },
            ],
          },
        },
      ],
    };

    const result = parseGeminiPhotoCleanupResponse(json);
    expect(result.kind).toBe("image");
    if (result.kind === "image") {
      expect(result.mimeType).toBe("image/png");
      expect(result.imageBuffer.equals(payload)).toBe(true);
    }
  });

  it("throws when no image is returned and no unclear token", () => {
    const json = { candidates: [{ content: { parts: [{ text: "something else" }] } }] };
    expect(() => parseGeminiPhotoCleanupResponse(json)).toThrow(/did not return an image/i);
  });
});

