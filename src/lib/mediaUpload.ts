import crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

import type {
  ResourceType,
  UploadOptions,
  UploadResult,
} from "../types/mediaUpload";
import { ValidationError } from "./errors";
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
    throw new ValidationError("Invalid data URI string");
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
  return map[mimetype] ?? mimetype.split("/")[1]?.split("+")[0] ?? "";
}

function getEffectiveFolder(folder?: string): string {
  if (!folder) return "";
  const cleaned = folder.replace(/^\/+|\/+$/g, "");
  return env.NODE_ENV && env.NODE_ENV !== "production"
    ? `test/${cleaned}`
    : cleaned;
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

  const folder = getEffectiveFolder(options.folder);
  const key = [folder, filename].filter(Boolean).join("/");

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
  const folder = asset_path ? `shopwus/${asset_path}/images` : "shopwus/images";
  return uploadToR2(fileData, { resource_type: "image", folder });
}

export async function uploadVideo(fileData: string | Buffer, asset_path = "") {
  const folder = asset_path ? `shopwus/${asset_path}/videos` : "shopwus/videos";
  return uploadToR2(fileData, { resource_type: "video", folder });
}

export async function uploadDocument(
  fileData: string | Buffer,
  asset_path = "",
) {
  const folder = asset_path
    ? `shopwus/${asset_path}/documents`
    : "shopwus/documents";
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
  const command = new GetObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: dispositionFilename
      ? `attachment; filename="${dispositionFilename}"`
      : undefined,
  });

  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function getPresignedUploadUrl(params: {
  folder?: string;
  filename: string;
  mimetype: string;
  expiresInSeconds?: number;
}): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
  signedContentType: string;
}> {
  let extension = path.extname(params.filename).replace(".", "");
  if (!extension && params.mimetype) {
    extension = mimetypeToExtension(params.mimetype);
  }

  const uniqueName = `${crypto.randomBytes(16).toString("hex")}${extension ? `.${extension.toLowerCase()}` : ""}`;

  const effectiveFolder = getEffectiveFolder(params.folder);
  const key = [effectiveFolder, uniqueName].filter(Boolean).join("/");

  const signedContentType = params.mimetype || "application/octet-stream";

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET_NAME,
    Key: key,
    ContentType: signedContentType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: params.expiresInSeconds ?? 900,
  });

  const publicUrl = `${env.CLOUDFLARE_R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl, key, signedContentType };
}

export const storageService = {
  upload: uploadToR2,
  uploadMultiple,
  uploadImage,
  uploadVideo,
  uploadDocument,
  delete: deleteFromR2,
  getPresignedDownloadUrl,
  getPresignedUploadUrl,
};

export default storageService;
