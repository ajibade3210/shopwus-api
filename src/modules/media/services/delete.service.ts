import { MediaType } from "../../../config/constants/media";
import { TechnicalError } from "../../../lib/errors";
import { storageService } from "../../../lib/mediaUpload";
import type { ResourceType } from "../../../types";
import type { DeleteMediaInput } from "../schema/media.schema";

export async function deleteMediaService(data: DeleteMediaInput) {
  const { publicId, type = MediaType.IMAGE } = data;

  const resourceType: ResourceType =
    type === MediaType.VIDEO ? "video" : "image";

  const result = await storageService.delete(publicId, resourceType);

  if (result.result !== "ok" && result.result !== "not found") {
    throw new TechnicalError("Failed to delete media");
  }

  return { message: "Media deleted successfully" };
}
