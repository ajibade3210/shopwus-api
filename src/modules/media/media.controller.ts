import type { FastifyReply } from "fastify";
import { ValidationError } from "../../lib/errors";
import type { ReqHeaders, TypedRequest } from "../../utils";
import type {
  DeleteMediaInput,
  GetPresignedUrlInput,
  GetPresignedUrlsInput,
  UploadMediaInput,
} from "./schema/media.schema";
import * as mediaService from "./services";

export async function uploadMedia(
  req: TypedRequest<unknown, UploadMediaInput, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const file = await req.file();
  if (!file) throw new ValidationError("No file uploaded");

  const result = await mediaService.uploadMediaService(
    file,
    req.query,
    req.user.userId,
  );
  return reply.success(result, "Media uploaded successfully", 201);
}

export async function uploadMultiMedia(
  req: TypedRequest<unknown, UploadMediaInput, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const files = req.files();
  const result = await mediaService.uploadMultiMediaService(
    files,
    req.user.userId,
  );
  return reply.success(result, "Media uploaded successfully", 201);
}

export async function getPresignedUrl(
  req: TypedRequest<GetPresignedUrlInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await mediaService.getPresignedUrlService(
    req.body,
    req.user.userId,
  );
  return reply.success(result, "Presigned upload URL generated successfully");
}

export async function getPresignedUrls(
  req: TypedRequest<GetPresignedUrlsInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  const result = await mediaService.getPresignedUrlsService(
    req.body,
    req.user.userId,
  );
  return reply.success(result, "Presigned upload URLs generated successfully");
}

export async function deleteMedia(
  req: TypedRequest<DeleteMediaInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  await mediaService.deleteMediaService(req.body);
  return reply.success([], "Media deleted successfully");
}
