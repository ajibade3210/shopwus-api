import { z } from "zod";
import { isValidPhone, ReqHeaderSchema } from "../../../utils";

export const checkSlugSchema = z.object({
  slug: z.string().min(1, "Slug is required"),
});

export const getStorefrontParamsSchema = z.object({
  slug: z.string().min(1, "Studio slug is required"),
});

export const submitReviewSchema = z.object({
  author: z.string().min(1, "Author name is required"),
  role: z.string().optional(),
  eventType: z.string().optional().default("General"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, "Review comment is required"),
  avatar: z.string().optional(),
});

export const colorSchemeSchema = z.object({
  primary: z.string().default("#000000"),
  secondary: z.string().default("#0058BE"),
  button: z.string().default("#000000"),
  pageBackground: z.string().nullish(),
  cardBackground: z.string().nullish(),
  text: z.string().default("#191C1D"),
});

export const serviceItemInputSchema = z.object({
  id: z.string().nullish(),
  name: z.string().min(1, "Service name is required"),
  category: z.string().nullish(),
  description: z.string().nullish(),
  price: z.number().nullish(),
  minPrice: z.number().nullish(),
  maxPrice: z.number().nullish(),
  priceType: z.string().nullish(),
  isFeatured: z.boolean().nullish(),
});

export const portfolioProjectInputSchema = z.object({
  id: z.string().nullish(),
  title: z.string().min(1, "Project title is required"),
  category: z.string().nullish(),
  location: z.string().nullish(),
  description: z.string().nullish(),
  image: z
    .string()
    .nullish()
    .refine((val) => !val || !val.startsWith("blob:"), {
      message: "Image must be a valid uploaded Cloudflare URL, not a local blob",
    }),
  order: z.number().nullish(),
  isCover: z.boolean().nullish(),
  gallery: z
    .array(
      z.string().refine((val) => !val.startsWith("blob:"), {
        message:
          "Gallery images must be valid uploaded Cloudflare URLs, not local blobs",
      }),
    )
    .nullish(),
  stats: z.string().nullish(),
  client: z.string().nullish(),
  year: z.string().nullish(),
});

export const socialChannelInputSchema = z
  .object({
    id: z.string().nullish(),
    type: z.string(),
    connected: z.boolean().default(false),
    label: z.string().nullish(),
    handle: z.string().nullish(),
    url: z.string().nullish(),
    description: z.string().nullish(),
    lastSynced: z.union([z.string(), z.date()]).nullish(),
  })
  .refine(
    (data) => {
      if (
        data.type?.toLowerCase() === "whatsapp" &&
        data.handle &&
        data.handle.trim()
      ) {
        return isValidPhone(data.handle);
      }
      return true;
    },
    {
      message: "Invalid WhatsApp phone number format",
      path: ["handle"],
    },
  );

export const updateStudioProfileSchema = z.object({
  slug: z.string().nullish(),
  businessName: z.string().nullish(),
  name: z.string().nullish(),
  tagline: z.string().nullish(),
  description: z.string().nullish(),
  location: z.string().nullish(),
  website: z.string().nullish(),
  email: z.string().nullish(),
  emailAddress: z.string().nullish(),
  phone: z.string().nullish(),
  whatsAppNumber: z
    .string()
    .nullish()
    .refine((val) => !val?.trim() || isValidPhone(val), {
      message: "Invalid WhatsApp phone number format",
    }),
  logoUrl: z
    .string()
    .nullish()
    .refine((val) => !val || !val.startsWith("blob:"), {
      message: "Logo must be a valid uploaded Cloudflare URL, not a local blob",
    }),
  bannerUrl: z
    .string()
    .nullish()
    .refine((val) => !val || !val.startsWith("blob:"), {
      message:
        "Banner must be a valid uploaded Cloudflare URL, not a local blob",
    }),
  emailHeaderUrl: z
    .string()
    .nullish()
    .refine((val) => !val || !val.startsWith("blob:"), {
      message:
        "Email header must be a valid uploaded Cloudflare URL, not a local blob",
    }),
  headerType: z.enum(["AUTO", "CUSTOM"]).nullish(),
  includeHeaderInInvoice: z.boolean().nullish(),
  includeHeaderInEmail: z.boolean().nullish(),
  businessType: z.string().nullish(),
  currency: z.string().nullish(),
  bankName: z.string().nullish(),
  accountName: z.string().nullish(),
  accountNumber: z.string().nullish(),
  operatingHours: z.string().nullish(),
  timeFrom: z.string().nullish(),
  timeTo: z.string().nullish(),
  byAppointmentOnly: z.boolean().nullish(),
  colors: colorSchemeSchema.nullish(),
  buttonRadius: z.string().nullish(),
  showServices: z.boolean().nullish(),
  showPortfolio: z.boolean().nullish(),
  showReviews: z.boolean().nullish(),
  showFooterCta: z.boolean().nullish(),
  footerEyebrow: z.string().nullish(),
  footerTitle: z.string().nullish(),
  footerDescription: z.string().nullish(),
  googleReviewsLink: z.string().nullish(),
  portfolioCategories: z.array(z.string()).nullish(),
  services: z.array(serviceItemInputSchema).nullish(),
  portfolio: z.array(portfolioProjectInputSchema).nullish(),
  socialChannels: z.array(socialChannelInputSchema).nullish(),
});

export const socialChannelParamsSchema = z.object({
  channelId: z.string().min(1, "Channel ID is required"),
});

export type CheckSlugQuery = z.infer<typeof checkSlugSchema>;
export type GetStorefrontParams = z.infer<typeof getStorefrontParamsSchema>;
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;
export type UpdateStudioProfileInput = z.infer<
  typeof updateStudioProfileSchema
>;
export type SocialChannelParams = z.infer<typeof socialChannelParamsSchema>;

export const checkSlugRouteSchema = {
  querystring: checkSlugSchema,
};

export const getStorefrontRouteSchema = {
  params: getStorefrontParamsSchema,
};

export const submitReviewRouteSchema = {
  params: getStorefrontParamsSchema,
  body: submitReviewSchema,
};

export const getStudioMeRouteSchema = {
  headers: ReqHeaderSchema,
};

export const updateStudioMeRouteSchema = {
  headers: ReqHeaderSchema,
  body: updateStudioProfileSchema,
};

export const publishStudioMeRouteSchema = {
  headers: ReqHeaderSchema,
};

export const socialChannelActionRouteSchema = {
  headers: ReqHeaderSchema,
  params: socialChannelParamsSchema,
};
