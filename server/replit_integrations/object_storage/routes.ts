import type { Express } from "express";
import { ObjectStorageService, ObjectNotFoundError, objectStorageClient } from "./objectStorage";
import multer from "multer";
import { processImage } from "../../image-processor";
import { randomUUID } from "crypto";

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 7 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
      "application/octet-stream",
    ];
    if (allowedTypes.includes(file.mimetype.toLowerCase()) || file.originalname.toLowerCase().endsWith(".heic")) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  },
});

/**
 * Register object storage routes for file uploads.
 *
 * This provides example routes for the presigned URL upload flow:
 * 1. POST /api/uploads/request-url - Get a presigned URL for uploading
 * 2. The client then uploads directly to the presigned URL
 *
 * IMPORTANT: These are example routes. Customize based on your use case:
 * - Add authentication middleware for protected uploads
 * - Add file metadata storage (save to database after upload)
 * - Add ACL policies for access control
 */
export function registerObjectStorageRoutes(app: Express): void {
  const objectStorageService = new ObjectStorageService();

  /**
   * Request a presigned URL for file upload.
   *
   * Request body (JSON):
   * {
   *   "name": "filename.jpg",
   *   "size": 12345,
   *   "contentType": "image/jpeg"
   * }
   *
   * Response:
   * {
   *   "uploadURL": "https://storage.googleapis.com/...",
   *   "objectPath": "/objects/uploads/uuid"
   * }
   *
   * IMPORTANT: The client should NOT send the file to this endpoint.
   * Send JSON metadata only, then upload the file directly to uploadURL.
   */
  app.post("/api/uploads/request-url", async (req, res) => {
    try {
      const { name, size, contentType } = req.body;

      if (!name) {
        return res.status(400).json({
          error: "Missing required field: name",
        });
      }

      const uploadURL = await objectStorageService.getObjectEntityUploadURL();

      // Extract object path from the presigned URL for later reference
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      res.json({
        uploadURL,
        objectPath,
        // Echo back the metadata for client convenience
        metadata: { name, size, contentType },
      });
    } catch (error) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  /**
   * Serve uploaded objects.
   *
   * GET /objects/:objectPath(*)
   *
   * This serves files from object storage. For public files, no auth needed.
   * For protected files, add authentication middleware and ACL checks.
   */
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectPath = req.params.objectPath; const privateObjectDir = objectStorageService.getPrivateObjectDir(); const { bucketName } = parseObjectPath(privateObjectDir); const gcsUrl = "https://storage.googleapis.com/" + bucketName + "/" + objectPath; res.redirect(301, gcsUrl); return;
      
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  app.post("/api/uploads/optimized", imageUpload.array("images", 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No images provided" });
      }

      console.log(`[optimized-upload] Processing ${files.length} image(s) in parallel`);

      const privateObjectDir = process.env.PRIVATE_OBJECT_DIR || "";
      if (!privateObjectDir) {
        return res.status(500).json({ error: "Object storage not configured" });
      }

      const { bucketName } = parseObjectPath(privateObjectDir);
      const bucket = objectStorageClient.bucket(bucketName);

      const processAndUpload = async (file: Express.Multer.File): Promise<{ main: string; thumbnail?: string }> => {
        console.log(`[optimized-upload] Processing: ${file.originalname} (${(file.size / 1024).toFixed(1)}KB)`);
        
        const { main, thumbnail } = await processImage(file.buffer, {
          maxWidth: 1600,
          maxHeight: 1600,
          quality: 90,
          format: "webp",
          generateThumbnail: true,
          thumbnailWidth: 600,
        });

        const mainId = randomUUID();
        const mainPath = `${privateObjectDir}/uploads/${mainId}.webp`.replace(/^\//, "");
        const mainObjectName = mainPath.split("/").slice(1).join("/");
        const mainUrl = `https://storage.googleapis.com/${bucketName}/uploads/${mainId}.webp`;

        const uploadPromises: Promise<void>[] = [];

        uploadPromises.push(
          bucket.file(mainObjectName).save(main.buffer, {
            contentType: "image/webp",
            metadata: {
              originalName: file.originalname,
              processedAt: new Date().toISOString(),
            },
          })
        );

        let thumbnailUrl: string | undefined;
        if (thumbnail) {
          const thumbId = `${mainId}_thumb`;
          const thumbPath = `${privateObjectDir}/uploads/${thumbId}.webp`.replace(/^\//, "");
          const thumbObjectName = thumbPath.split("/").slice(1).join("/");
          thumbnailUrl = `https://storage.googleapis.com/${bucketName}/uploads/${thumbId}.webp`;

          uploadPromises.push(
            bucket.file(thumbObjectName).save(thumbnail.buffer, {
              contentType: "image/webp",
              metadata: {
                originalName: `${file.originalname}_thumb`,
                processedAt: new Date().toISOString(),
              },
            })
          );
        }

        await Promise.all(uploadPromises);
        console.log(`[optimized-upload] Uploaded: ${mainUrl}`);
        
        return { main: mainUrl, thumbnail: thumbnailUrl };
      };

      const results = await Promise.all(files.map(processAndUpload));

      res.json({
        success: true,
        images: results,
        count: results.length,
      });
    } catch (error) {
      console.error("[optimized-upload] Error:", error);
      res.status(500).json({ error: "Failed to upload images" });
    }
  });
}

function parseObjectPath(path: string): { bucketName: string; objectName: string } {
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const pathParts = path.split("/");
  if (pathParts.length < 3) {
    throw new Error("Invalid path: must contain at least a bucket name");
  }
  const bucketName = pathParts[1];
  const objectName = pathParts.slice(2).join("/");
  return { bucketName, objectName };
}

