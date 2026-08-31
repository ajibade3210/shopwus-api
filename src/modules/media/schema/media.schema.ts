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
