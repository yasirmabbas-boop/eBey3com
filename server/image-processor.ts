import sharp from "sharp";
// @ts-ignore - heic-convert doesn't have types
import heicConvert from "heic-convert";

interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  size: number;
}

interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "webp" | "png";
  generateThumbnail?: boolean;
  thumbnailWidth?: number;
}

const DEFAULT_OPTIONS: ImageProcessingOptions = {
  maxWidth: 1600,
  maxHeight: 1600,
  quality: 80,
  format: "webp",
  generateThumbnail: true,
  thumbnailWidth: 400,
};

async function isHeicBuffer(buffer: Buffer): Promise<boolean> {
  if (buffer.length < 12) return false;
  const header = buffer.slice(4, 12).toString("ascii");
  return header.includes("ftyp") && (
    header.includes("heic") || 
    header.includes("heix") || 
    header.includes("hevc") ||
    header.includes("mif1")
  );
}

async function convertHeicToJpeg(buffer: Buffer): Promise<Buffer> {
  try {
    const outputBuffer = await heicConvert({
      buffer: buffer,
      format: "JPEG",
      quality: 0.9,
    });
    return Buffer.from(outputBuffer);
  } catch (error) {
    console.error("[image-processor] HEIC conversion failed:", error);
    throw new Error("Failed to convert HEIC image");
  }
}

export async function processImage(
  inputBuffer: Buffer,
  options: ImageProcessingOptions = {}
): Promise<{ main: ProcessedImage; thumbnail?: ProcessedImage }> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let buffer = inputBuffer;

  console.log(`[image-processor] Processing image, input size: ${(buffer.length / 1024).toFixed(1)}KB`);

  if (await isHeicBuffer(buffer)) {
    console.log("[image-processor] Detected HEIC format, converting to JPEG...");
    buffer = await convertHeicToJpeg(buffer);
    console.log(`[image-processor] HEIC converted, size: ${(buffer.length / 1024).toFixed(1)}KB`);
  }

  let sharpInstance = sharp(buffer, { failOnError: false });
  const metadata = await sharpInstance.metadata();

  console.log(`[image-processor] Original dimensions: ${metadata.width}x${metadata.height}, format: ${metadata.format}`);

  sharpInstance = sharpInstance
    .rotate()
    .resize(opts.maxWidth, opts.maxHeight, {
      fit: "inside",
      withoutEnlargement: true,
    });

  let outputBuffer: Buffer;
  if (opts.format === "webp") {
    outputBuffer = await sharpInstance.webp({ quality: opts.quality }).toBuffer();
  } else if (opts.format === "png") {
    outputBuffer = await sharpInstance.png({ quality: opts.quality }).toBuffer();
  } else {
    outputBuffer = await sharpInstance.jpeg({ quality: opts.quality, mozjpeg: true }).toBuffer();
  }

  const outputMetadata = await sharp(outputBuffer).metadata();

  const mainImage: ProcessedImage = {
    buffer: outputBuffer,
    width: outputMetadata.width || 0,
    height: outputMetadata.height || 0,
    format: opts.format || "jpeg",
    size: outputBuffer.length,
  };

  console.log(`[image-processor] Main image: ${mainImage.width}x${mainImage.height}, ${(mainImage.size / 1024).toFixed(1)}KB`);

  let thumbnailImage: ProcessedImage | undefined;
  if (opts.generateThumbnail) {
    const thumbBuffer = await sharp(buffer, { failOnError: false })
      .rotate()
      .resize(opts.thumbnailWidth, opts.thumbnailWidth, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 70 })
      .toBuffer();

    const thumbMetadata = await sharp(thumbBuffer).metadata();
    thumbnailImage = {
      buffer: thumbBuffer,
      width: thumbMetadata.width || opts.thumbnailWidth || 400,
      height: thumbMetadata.height || opts.thumbnailWidth || 400,
      format: "webp",
      size: thumbBuffer.length,
    };

    console.log(`[image-processor] Thumbnail: ${thumbnailImage.width}x${thumbnailImage.height}, ${(thumbnailImage.size / 1024).toFixed(1)}KB`);
  }

  const compressionRatio = ((1 - mainImage.size / inputBuffer.length) * 100).toFixed(1);
  console.log(`[image-processor] Compression: ${compressionRatio}% reduction`);

  return { main: mainImage, thumbnail: thumbnailImage };
}

export async function processMultipleImages(
  buffers: Buffer[],
  options: ImageProcessingOptions = {}
): Promise<Array<{ main: ProcessedImage; thumbnail?: ProcessedImage }>> {
  const results = await Promise.all(
    buffers.map((buffer) => processImage(buffer, options))
  );
  return results;
}
