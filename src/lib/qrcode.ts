import QRCode from "qrcode";
import sharp from "sharp";
import type { QRCodeOptions } from "../types";
import { slugify } from "../utils/string.utils";
import { storageService } from "./mediaUpload";

export async function generateAndUploadQRCode(
  qrcodeData: string,
  options: QRCodeOptions,
): Promise<string> {
  const qrBuffer = await QRCode.toBuffer(qrcodeData, {
    width: options.width || 500,
    errorCorrectionLevel: options.errorCorrectionLevel || "H",
  });

  let compositeInput: Buffer | null = null;

  if (options.logoUrl) {
    try {
      const response = await fetch(options.logoUrl);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        compositeInput = Buffer.from(arrayBuffer);
      }
    } catch (error) {
      console.error("Failed to load logo, falling back to initial:", error);
    }
  }

  if (!compositeInput) {
    const initial = options.name.charAt(0).toUpperCase() || "A";
    const svg = `
      <svg width="120" height="120">
        <circle cx="60" cy="60" r="50" fill="black" />
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="60" fill="white">${initial}</text>
      </svg>`;
    compositeInput = Buffer.from(svg);
  }

  let finalBuffer = qrBuffer;

  if (compositeInput) {
    const size = 120;
    const radius = 30;

    const roundedMask = Buffer.from(`
      <svg width="${size}" height="${size}">
        <rect x="0" y="0" width="${size}" height="${size}" rx="${radius}" ry="${radius}" />
      </svg>
    `);

    const overlay = await sharp(compositeInput)
      .resize(size, size)
      .composite([{ input: roundedMask, blend: "dest-in" }])
      .png()
      .toBuffer();

    finalBuffer = await sharp(qrBuffer)
      .composite([{ input: overlay, gravity: "center" }])
      .toBuffer();
  }

  const base64 = finalBuffer.toString("base64");
  const dataUri = `data:image/png;base64,${base64}`;

  const folder = `${slugify(options.name)}/qrcodes`;
  const result = await storageService.uploadImage(dataUri, folder);

  return result.url;
}

export const qrCodeService = {
  generateAndUpload: generateAndUploadQRCode,
};
