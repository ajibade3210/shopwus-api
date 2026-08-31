import type { FastifyReply } from "fastify";
import { ValidationError } from "../../lib/errors";
import type { ReqHeaders, TypedRequest } from "../../utils";
import type { DeleteMediaInput, UploadMediaInput } from "./schema/media.schema";
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

export async function deleteMedia(
  req: TypedRequest<DeleteMediaInput, unknown, unknown, ReqHeaders>,
  reply: FastifyReply,
) {
  await mediaService.deleteMediaService(req.body);
  return reply.success([], "Media deleted successfully");
}
