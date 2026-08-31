import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const feedbackCategoryEnum = z.enum([
  "general",
  "storefront",
  "crm",
  "invoicing",
  "expenses",
  "analytics",
  "mobile",
]);

export const submitFeedbackSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: feedbackCategoryEnum.optional().default("general"),
  email: z.string().email().optional(),
});

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;

export const submitFeedbackRouteSchema = {
  headers: ReqHeaderSchema.optional(),
  body: submitFeedbackSchema,
};

export const getFeedbackListRouteSchema = {
  querystring: z.object({
    category: feedbackCategoryEnum.optional(),
  }),
};
