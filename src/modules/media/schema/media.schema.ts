import { z } from "zod";
import { MediaType } from "../../../config/constants/media";
import { ReqHeaderSchema } from "../../../utils";

export const mediaSchema = z.object({
  type: z.enum(MediaType).default(MediaType.IMAGE),
});

export type UploadMediaInput = z.infer<typeof mediaSchema>;

export const deleteMediaSchema = z.object({
  publicId: z.string().min(1, "Public ID is required"),
  type: z.enum(MediaType).default(MediaType.IMAGE),
});

export type DeleteMediaInput = z.infer<typeof deleteMediaSchema>;

export const uploadMediaRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: mediaSchema,
};

export const deleteMediaRouteSchema = {
  headers: ReqHeaderSchema,
  body: deleteMediaSchema,
};

export const presignedUrlItemSchema = z.object({
  filename: z.string().min(1, "Filename is required"),
  mimetype: z.string().min(1, "Mimetype is required"),
  size: z.number().int().positive().optional(),
  type: z.enum(MediaType).default(MediaType.IMAGE),
});

export const getPresignedUrlSchema = presignedUrlItemSchema;

export const getPresignedUrlsSchema = z.object({
  files: z
    .array(presignedUrlItemSchema)
    .min(1, "At least one file is required")
    .max(20, "Maximum 20 files allowed per request"),
});

export type GetPresignedUrlInput = z.infer<typeof getPresignedUrlSchema>;
export type GetPresignedUrlsInput = z.infer<typeof getPresignedUrlsSchema>;

export const presignedUrlRouteSchema = {
  headers: ReqHeaderSchema,
  body: getPresignedUrlSchema,
};

export const presignedUrlsRouteSchema = {
  headers: ReqHeaderSchema,
  body: getPresignedUrlsSchema,
};
