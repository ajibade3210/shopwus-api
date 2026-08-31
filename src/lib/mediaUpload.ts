import crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "../config/env";

import type {
  ResourceType,
  UploadOptions,
  UploadResult,
} from "../types/mediaUpload";
import { logger } from "./logger";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${env.CLOUDFLARE_R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY,
    secretAccessKey: env.CLOUDFLARE_R2_SECRET_KEY,
  },
});

function parseDataUri(dataUri: string) {
  const matches = dataUri.match(/^data:([^;,]+)(?:;[^,]*)?;base64,([\s\S]+)$/);
  if (matches?.length !== 3) {
    throw new Error("Invalid data URI string");
  }
  return {
    mimetype: matches[1].toLowerCase(),
    buffer: Buffer.from(matches[2], "base64"),
  };
}

function extensionToMimetype(ext: string): string {
  const map: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    mov: "video/quicktime",
    pdf: "application/pdf",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return map[ext.toLowerCase()] ?? "application/octet-stream";
}

function mimetypeToExtension(mimetype: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  };
  return map[mimetype] ?? mimetype.split("/")[1].split("+")[0] ?? "";
}

export async function uploadToR2(
  fileData: string | Buffer,
  options: UploadOptions = {},
): Promise<UploadResult> {
  let buffer: Buffer;
  let mimetype = "application/octet-stream";
  let extension = "";

  if (Buffer.isBuffer(fileData)) {
    buffer = fileData;
    if (options.mimetype) {
      mimetype = options.mimetype;
      extension = mimetypeToExtension(mimetype);
    } else if (options.resource_type === "video") {
      mimetype = "video/mp4";
      extension = "mp4";
    }
  } else if (fileData.startsWith("data:")) {
    const parsed = parseDataUri(fileData);
    buffer = parsed.buffer;
    mimetype = parsed.mimetype;
    extension = mimetypeToExtension(mimetype);
  } else {
    buffer = await fs.promises.readFile(fileData);
    extension = path.extname(fileData).replace(".", "");
    if (extension) mimetype = extensionToMimetype(extension);
  }

  const filename = options.public_id
    ? options.public_id.includes(".")
      ? options.public_id
      : `${options.public_id}${extension ? `.${extension}` : ""}`
    : `${crypto.randomBytes(16).toString("hex")}${extension ? `.${extension}` : ""}`;

  // Determine the effective folder (prepend 'test/' in non‑production)
  const effectiveFolder = ((): string => {
    if (!options.folder) return "";
    // If we are not in production, store under a test prefix
    if (env.NODE_ENV && env.NODE_ENV !== "production") {
      return `test/${options.folder.replace(/^\//, "")}`;
    }
    return options.folder.replace(/^\//, "");
  })();

  const folder = effectiveFolder;
  const key = `${folder}${folder ? "/" : ""}${filename}`
    .replace(/\/+/g, "/")
    .replace(/^\//, "");

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
  });

  try {
    await s3.send(command);

    const publicUrl = `${env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;

    return {
      url: publicUrl,
      public_id: key,
      resource_type: options.resource_type || "auto",
      format: extension,
      bytes: buffer.length,
    };
  } catch (error) {
    logger.error(error, "R2 upload error:");
    throw error;
  }
}

export async function uploadMultiple(
  files: { filePath: string; options: UploadOptions }[],
) {
  const promises = files.map((file) => uploadToR2(file.filePath, file.options));
  return Promise.all(promises);
}

export async function uploadImage(fileData: string | Buffer, asset_path = "") {
  const folder = asset_path ? `accessa/${asset_path}/images` : "accessa/images";
  return uploadToR2(fileData, { resource_type: "image", folder });
}

export async function uploadVideo(fileData: string | Buffer, asset_path = "") {
  const folder = asset_path ? `accessa/${asset_path}/videos` : "accessa/videos";
  return uploadToR2(fileData, { resource_type: "video", folder });
}

export async function uploadDocument(
  fileData: string | Buffer,
  asset_path = "",
) {
  const folder = asset_path
    ? `accessa/${asset_path}/documents`
    : "accessa/documents";
  return uploadToR2(fileData, { resource_type: "auto", folder });
}

export async function deleteFromR2(
  publicId: string,
  _resourceType: ResourceType = "image",
) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
      Key: publicId,
    });
    await s3.send(command);
    return { result: "ok" };
  } catch (error) {
    logger.error(error, "R2 delete error:");
    throw error;
  }
}

export async function getPresignedDownloadUrl(
  key: string,
  expiresInSeconds = 3600,
  dispositionFilename?: string,
): Promise<string> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

  const command = new GetObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: dispositionFilename
      ? `inline; filename="${dispositionFilename}"`
      : undefined,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export const storageService = {
  upload: uploadToR2,
  uploadMultiple,
  uploadImage,
  uploadVideo,
  uploadDocument,
  delete: deleteFromR2,
  getPresignedDownloadUrl,
};

export default storageService;
