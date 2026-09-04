import type { MultipartFile } from "@fastify/multipart";
import { env } from "../../../config/env";
import { PayloadTooLargeError, ValidationError } from "../../../lib/errors";
import { storageService } from "../../../lib/mediaUpload";
import type { UploadResult } from "../../../types";
import type {
  GetPresignedUrlInput,
  GetPresignedUrlsInput,
  UploadMediaInput,
} from "../schema/media.schema";

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

export async function uploadMediaService(
  file: MultipartFile,
  query: UploadMediaInput,
  userId: string,
): Promise<UploadResult & { publicId: string; type: string }> {
  try {
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

    const config = getUploadConfig(file.mimetype, type);
    const folder = `shopwus/${userId}/${config.folder}`;

    // Upload exact original file directly to preserve 100% premium quality without re-encoding or lossy compression
    const result = await storageService.upload(rawBuffer, {
      resource_type: config.resourceType,
      folder,
      mimetype: file.mimetype,
    });

    return {
      ...result,
      publicId: result.public_id,
      type: getMediaTypeFromFolder(config.folder),
    };
  } finally {
    if (global.gc) {
      try {
        global.gc();
      } catch (_) {}
    }
  }
}

export async function uploadMultiMediaService(
  files: AsyncIterableIterator<MultipartFile>,
  userId: string,
): Promise<(UploadResult & { publicId: string; type: string })[]> {
  type FormattedResult = UploadResult & { publicId: string; type: string };
  const uploadPromises: Promise<FormattedResult>[] = [];
  const successfulResults: FormattedResult[] = [];

  try {
    for await (const file of files) {
      if (uploadPromises.length >= 20) {
        throw new ValidationError("Maximum 20 files allowed per upload batch");
      }

      const rawBuffer = await file.toBuffer();
      const maxSize = file.mimetype.startsWith("video/")
        ? env.MAX_VIDEO_SIZE
        : env.MAX_FILE_SIZE;

      if (file.file.truncated || rawBuffer.length > maxSize) {
        throw new PayloadTooLargeError(
          `File ${file.filename} exceeds the allowed size limit`,
        );
      }

      const config = getUploadConfig(file.mimetype);
      const folder = `shopwus/${userId}/${config.folder}`;

      // Upload original file directly to Cloudflare R2 concurrently without altering quality
      const uploadPromise = storageService
        .upload(rawBuffer, {
          resource_type: config.resourceType,
          folder,
          mimetype: file.mimetype,
        })
        .then((res) => {
          const formatted = {
            ...res,
            publicId: res.public_id,
            type: getMediaTypeFromFolder(config.folder),
          };
          successfulResults.push(formatted);
          return formatted;
        });

      uploadPromises.push(uploadPromise);
    }

    if (uploadPromises.length === 0) {
      throw new ValidationError("No valid files uploaded");
    }

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    // Drain any remaining files from generator on failure to prevent premature close
    try {
      for await (const file of files) {
        file.file.resume();
      }
    } catch (_) {
      // Ignore errors during stream cleanup
    }

    // Await any in-flight uploads to settle so we don't leave orphaned files on R2
    await Promise.allSettled(uploadPromises);

    if (successfulResults.length > 0) {
      await Promise.allSettled(
        successfulResults.map((res) => storageService.delete(res.publicId)),
      );
    }
    throw error;
  } finally {
    if (global.gc) {
      try {
        global.gc();
      } catch (_) {}
    }
  }
}

export async function getPresignedUrlService(
  input: GetPresignedUrlInput,
  userId: string,
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  signedContentType: string;
  type: string;
}> {
  const maxSize = input.mimetype.startsWith("video/")
    ? env.MAX_VIDEO_SIZE
    : env.MAX_FILE_SIZE;

  if (input.size && input.size > maxSize) {
    throw new PayloadTooLargeError(
      `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
    );
  }

  const config = getUploadConfig(input.mimetype, input.type);
  const folder = `shopwus/${userId}/${config.folder}`;

  const result = await storageService.getPresignedUploadUrl({
    folder,
    filename: input.filename,
    mimetype: input.mimetype,
  });

  return {
    ...result,
    type: getMediaTypeFromFolder(config.folder),
  };
}

export async function getPresignedUrlsService(
  input: GetPresignedUrlsInput,
  userId: string,
): Promise<
  Array<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    signedContentType: string;
    type: string;
  }>
> {
  return Promise.all(
    input.files.map((file) => getPresignedUrlService(file, userId)),
  );
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
