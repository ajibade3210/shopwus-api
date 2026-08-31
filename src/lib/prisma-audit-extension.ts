import { Prisma } from "@prisma/client";

/**
 * Prisma Extension to automatically attach audit hooks if needed.
 */
export const auditExtension = Prisma.defineExtension({
  name: "auditExtension",
  query: {},
});
