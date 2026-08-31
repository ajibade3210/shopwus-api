import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const broadcastChannelEnum = z.enum(["whatsapp", "email", "both"]);

export const sendBroadcastSchema = z
  .object({
    channel: broadcastChannelEnum,
    customerIds: z
      .array(z.string())
      .min(1, "At least one customer recipient must be selected"),
    subject: z.string().optional(),
    message: z.string().min(1, "Broadcast message content is required"),
    imageUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (
        (data.channel === "email" || data.channel === "both") &&
        !data.subject?.trim()
      ) {
        return false;
      }
      return true;
    },
    {
      message: "Subject line is required for email and combined broadcasts",
      path: ["subject"],
    },
  );

export type SendBroadcastInput = z.infer<typeof sendBroadcastSchema>;

export const sendBroadcastRouteSchema = {
  headers: ReqHeaderSchema,
  body: sendBroadcastSchema,
};

export const getBroadcastHistoryRouteSchema = {
  headers: ReqHeaderSchema,
};
