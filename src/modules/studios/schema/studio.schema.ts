import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

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
  pageBackground: z.string().optional(),
  cardBackground: z.string().optional(),
  text: z.string().default("#191C1D"),
});

export const serviceItemInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Service name is required"),
  category: z.string().optional(),
  description: z.string().optional(),
  price: z.number().optional(),
  isFeatured: z.boolean().optional(),
});

export const portfolioProjectInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Project title is required"),
  category: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  order: z.number().optional(),
  isCover: z.boolean().optional(),
  gallery: z.array(z.string()).optional(),
  stats: z.string().optional(),
  client: z.string().optional(),
  year: z.string().optional(),
});

export const socialChannelInputSchema = z.object({
  id: z.string().optional(),
  type: z.string(),
  connected: z.boolean().default(false),
  label: z.string().optional(),
  handle: z.string().optional(),
  url: z.string().optional(),
  description: z.string().optional(),
});

export const updateStudioProfileSchema = z.object({
  businessName: z.string().optional(),
  name: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  email: z.string().optional(),
  emailAddress: z.string().optional(),
  phone: z.string().optional(),
  whatsAppNumber: z.string().optional(),
  logoUrl: z.string().optional(),
  businessType: z.string().optional(),
  currency: z.string().optional(),
  operatingHours: z.string().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  byAppointmentOnly: z.boolean().optional(),
  colors: colorSchemeSchema.optional(),
  buttonRadius: z.string().optional(),
  services: z.array(serviceItemInputSchema).optional(),
  portfolio: z.array(portfolioProjectInputSchema).optional(),
  socialChannels: z.array(socialChannelInputSchema).optional(),
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
