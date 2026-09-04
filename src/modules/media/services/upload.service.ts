import type { MultipartFile } from "@fastify/multipart";
import sharp from "sharp";
import { MEDIA_OPTIMIZATION } from "../../../config/constants/media";
import { env } from "../../../config/env";
import { PayloadTooLargeError, ValidationError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";
import { storageService } from "../../../lib/mediaUpload";
import type { UploadResult } from "../../../types";
import type { UploadMediaInput } from "../schema/media.schema";

function getUploadConfig(mimetype: string, typeHint?: string) {
  if (mimetype.startsWith("image/")) {
    return { resourceType: "image" as const, folder: "images" };
  }
  if (mimetype.startsWith("video/")) {
    return { resourceType: "video" as const, folder: "videos" };
  }
  if (mimetype === "application/pdf" || typeHint === "document") {
    return { resourceType: "auto" as const, folder: "documents" };
  }
  if (typeHint === "video")
    return { resourceType: "video" as const, folder: "videos" };
  return { resourceType: "auto" as const, folder: "images" };
}

function getMediaTypeFromFolder(folder: string): string {
  if (folder === "videos") return "video";
  if (folder === "documents") return "document";
  return "image";
}

async function optimizeImageBuffer(
  rawBuffer: Buffer,
  mimetype: string,
): Promise<{ buffer: Buffer; mimetype: string }> {
  if (
    !mimetype.startsWith("image/") ||
    mimetype === "image/svg+xml" ||
    mimetype === "image/gif"
  ) {
    return { buffer: rawBuffer, mimetype };
  }

  try {
    const image = sharp(rawBuffer, { failOnError: false });
    const metadata = await image.metadata();

    let pipeline = image.rotate();

    if (
      (metadata.width && metadata.width > MEDIA_OPTIMIZATION.MAX_DIMENSION) ||
      (metadata.height && metadata.height > MEDIA_OPTIMIZATION.MAX_DIMENSION)
    ) {
      pipeline = pipeline.resize(
        MEDIA_OPTIMIZATION.MAX_DIMENSION,
        MEDIA_OPTIMIZATION.MAX_DIMENSION,
        {
          fit: "inside",
          withoutEnlargement: true,
        },
      );
    }

    let outputMimetype = mimetype;
    if (mimetype === "image/png") {
      pipeline = pipeline.png({
        palette: true,
        quality: MEDIA_OPTIMIZATION.PNG_QUALITY,
        compressionLevel: MEDIA_OPTIMIZATION.PNG_COMPRESSION_LEVEL,
      });
    } else if (mimetype === "image/webp") {
      pipeline = pipeline.webp({ quality: MEDIA_OPTIMIZATION.WEBP_QUALITY });
    } else {
      pipeline = pipeline.jpeg({
        quality: MEDIA_OPTIMIZATION.JPEG_QUALITY,
        mozjpeg: true,
      });
      outputMimetype = "image/jpeg";
    }

    const optimizedBuffer = await pipeline.toBuffer();
    if (optimizedBuffer.length < rawBuffer.length) {
      return { buffer: optimizedBuffer, mimetype: outputMimetype };
    }
  } catch (error) {
    logger.warn(
      { error },
      "Failed to optimize image buffer; uploading original buffer",
    );
  }

  return { buffer: rawBuffer, mimetype };
}

export async function uploadMediaService(
  file: MultipartFile,
  query: UploadMediaInput,
  userId: string,
): Promise<UploadResult & { publicId: string; type: string }> {
  const { type } = query;
  const rawBuffer = await file.toBuffer();

  const maxSize = file.mimetype.startsWith("video/")
    ? env.MAX_VIDEO_SIZE
    : env.MAX_FILE_SIZE;
  if (file.file.truncated || rawBuffer.length > maxSize) {
    throw new PayloadTooLargeError(
      `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
    );
  }

  const { buffer, mimetype } = await optimizeImageBuffer(
    rawBuffer,
    file.mimetype,
  );
  const config = getUploadConfig(mimetype, type);
  const folder = `shopwus/${userId}/${config.folder}`;

  const result = await storageService.upload(buffer, {
    resource_type: config.resourceType,
    folder,
    mimetype,
  });

  return {
    ...result,
    publicId: result.public_id,
    type: getMediaTypeFromFolder(config.folder),
  };
}

// Configure Sharp memory limits for constrained container environments
sharp.cache(false);
sharp.concurrency(1);

export async function uploadMultiMediaService(
  files: AsyncIterableIterator<MultipartFile>,
  userId: string,
): Promise<(UploadResult & { publicId: string; type: string })[]> {
  type FormattedResult = UploadResult & { publicId: string; type: string };
  const results: FormattedResult[] = [];

  try {
    for await (const file of files) {
      const rawBuffer = await file.toBuffer();
      const maxSize = file.mimetype.startsWith("video/")
        ? env.MAX_VIDEO_SIZE
        : env.MAX_FILE_SIZE;

      if (file.file.truncated || rawBuffer.length > maxSize) {
        throw new PayloadTooLargeError(
          `File ${file.filename} exceeds the allowed size limit`,
        );
      }

      const { buffer, mimetype } = await optimizeImageBuffer(
        rawBuffer,
        file.mimetype,
      );
      const config = getUploadConfig(mimetype);
      const folder = `shopwus/${userId}/${config.folder}`;

      const uploadResult = await storageService.upload(buffer, {
        resource_type: config.resourceType,
        folder,
        mimetype,
      });

      results.push({
        ...uploadResult,
        publicId: uploadResult.public_id,
        type: getMediaTypeFromFolder(config.folder),
      });
    }
  } catch (error) {
    // Drain any remaining files from generator on failure to prevent premature close
    try {
      for await (const file of files) {
        file.file.resume();
      }
    } catch (_) {
      // Ignore errors during stream cleanup
    }

    if (results.length > 0) {
      await Promise.allSettled(
        results.map((res) => storageService.delete(res.publicId)),
      );
    }
    throw error;
  }

  if (results.length === 0) {
    throw new ValidationError("No valid files uploaded");
  }

  return results;
}

export async function uploadExcelExportService(
  buffer: Buffer,
  folderName: string,
  userId: string,
  fileName: string,
): Promise<{ url: string | null; message?: string }> {
  const mimetype =
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  const folder = `shopwus/exports/excel/${userId}/${folderName}`;

  const result = await storageService.upload(buffer, {
    resource_type: "raw",
    folder,
    public_id: `${fileName}_${Date.now()}`,
    mimetype,
  });

  return { url: result.url };
}

export async function uploadPdfFileService(
  filePath: string,
  folderName: string,
  fileName: string,
): Promise<{ url: string }> {
  const folder = `shopwus/exports/pdf/${folderName}`;
  const result = await storageService.upload(filePath, {
    resource_type: "raw",
    folder,
    public_id: `${fileName}_${Date.now()}`,
  });
  return { url: result.url };
}
