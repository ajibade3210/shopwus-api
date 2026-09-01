import type { Job, PgBoss } from "pg-boss";
import sharp from "sharp";
import { logger } from "../../lib/logger";
import { uploadImage } from "../../lib/mediaUpload";
import { prisma } from "../../lib/prisma";
import {
  type GenerateHeaderBannerPayload,
  generateHeaderBannerPayloadSchema,
  JOB_NAMES,
} from "../job.types";

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

export async function generateHeaderBannerBuffer(business: {
  name: string;
  tagline?: string | null;
  logoUrl?: string | null;
}): Promise<Buffer> {
  const title = (business.name || "Business Name").trim().toUpperCase();
  const caption = (business.tagline || "Shop With Us").trim();

  // Dynamic font sizing for long titles
  let titleFontSize = 64;
  if (title.length > 25) {
    titleFontSize = 42;
  } else if (title.length > 18) {
    titleFontSize = 52;
  }

  let captionFontSize = 36;
  if (caption.length > 35) {
    captionFontSize = 28;
  } else if (caption.length > 25) {
    captionFontSize = 32;
  }

  // Handle Logo image or monogram fallback
  let logoSvgContent = "";
  if (business.logoUrl) {
    try {
      const res = await fetch(business.logoUrl);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        const logoBuffer = Buffer.from(arrayBuffer);
        const optimizedLogo = await sharp(logoBuffer)
          .resize(220, 220, {
            fit: "contain",
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .png()
          .toBuffer();
        const logoBase64 = `data:image/png;base64,${optimizedLogo.toString("base64")}`;
        logoSvgContent = `<image href="${logoBase64}" x="70" y="70" width="220" height="220" preserveAspectRatio="xMidYMid meet" />`;
      }
    } catch (err) {
      logger.warn(
        { logoUrl: business.logoUrl, err },
        "Failed to fetch logo for banner generation, using monogram",
      );
    }
  }

  // Fallback monogram if no logo image could be loaded
  if (!logoSvgContent) {
    const initial = title.charAt(0) || "S";
    logoSvgContent = `<text x="180" y="225" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="140" font-weight="800" fill="#ffffff" text-anchor="middle">${escapeXml(
      initial,
    )}</text>`;
  }

  const svg = `
<svg width="1200" height="360" viewBox="0 0 1200 360" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- White Background -->
  <rect width="1200" height="360" fill="#ffffff" />
  
  <!-- Left Logo Container Box -->
  <rect x="30" y="30" width="300" height="300" rx="28" fill="#26282B" />
  ${logoSvgContent}
  
  <!-- Right Content Area -->
  <g id="text-group">
    <!-- Header Title -->
    <text x="370" y="170" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="${titleFontSize}" font-weight="800" letter-spacing="-0.03em" fill="#191C1D">
      ${escapeXml(title)}
    </text>
    
    <!-- Subtitle Caption -->
    <text x="370" y="240" font-family="'Inter', system-ui, -apple-system, sans-serif" font-size="${captionFontSize}" font-weight="600" letter-spacing="-0.01em" fill="#0058BE">
      ${escapeXml(caption)}
    </text>
  </g>
</svg>
`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}

export async function bannerWorker(
  jobs: Job<GenerateHeaderBannerPayload>[],
): Promise<void> {
  await Promise.all(
    jobs.map(async (job) => {
      const { data } = job;
      try {
        const validated = generateHeaderBannerPayloadSchema.parse(data);
        logger.info(
          { businessId: validated.businessId },
          "Generating email header banner in background",
        );

        const business = await prisma.business.findUnique({
          where: { id: validated.businessId },
          select: {
            id: true,
            name: true,
            tagline: true,
            logoUrl: true,
            headerType: true,
          },
        });

        if (!business) {
          logger.warn(
            { businessId: validated.businessId },
            "Business not found for banner generation",
          );
          return;
        }

        // Only auto-generate if headerType is AUTO
        if (business.headerType && business.headerType !== "AUTO") {
          logger.info(
            { businessId: business.id, headerType: business.headerType },
            "Skipping banner auto-generation because custom banner is set",
          );
          return;
        }

        const bannerPngBuffer = await generateHeaderBannerBuffer({
          name: business.name,
          tagline: business.tagline,
          logoUrl: business.logoUrl,
        });

        const uploadResult = await uploadImage(
          bannerPngBuffer,
          `businesses/${business.id}`,
        );

        await prisma.business.update({
          where: { id: business.id },
          data: {
            emailHeaderUrl: uploadResult.url,
          },
        });

        logger.info(
          { businessId: business.id, bannerUrl: uploadResult.url },
          "Email header banner generated and updated successfully",
        );
      } catch (error) {
        logger.error(
          { err: error, jobId: job.id, payload: job.data },
          "Failed to generate email header banner",
        );
        throw error;
      }
    }),
  );
}

export async function registerBannerWorker(boss: PgBoss): Promise<void> {
  await boss.work(
    JOB_NAMES.GENERATE_HEADER_BANNER,
    { batchSize: 5, pollingIntervalSeconds: 2 },
    bannerWorker,
  );
}
