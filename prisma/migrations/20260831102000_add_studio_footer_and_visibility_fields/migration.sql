-- AlterTable
ALTER TABLE "Business" 
ADD COLUMN IF NOT EXISTS "showServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "showPortfolio" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "showReviews" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "showFooterCta" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "footerEyebrow" TEXT DEFAULT 'Begin Your Journey',
ADD COLUMN IF NOT EXISTS "footerTitle" TEXT DEFAULT 'Ready to Create Something Extraordinary?',
ADD COLUMN IF NOT EXISTS "footerDescription" TEXT DEFAULT 'Tell us what you''re planning and we''ll get back to you to schedule an initial consultation with our creative directors.',
ADD COLUMN IF NOT EXISTS "googleReviewsLink" TEXT,
ADD COLUMN IF NOT EXISTS "portfolioCategories" TEXT[] DEFAULT ARRAY['Brand Identity', 'UI/UX & Product', 'Packaging & Print', 'Art Direction']::TEXT[];

ALTER TABLE "Business" ALTER COLUMN "buttonRadius" SET DEFAULT 'Subtle';
ALTER TABLE "Business" ALTER COLUMN "businessType" SET DEFAULT 'sales';
