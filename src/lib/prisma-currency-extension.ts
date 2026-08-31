import { Prisma } from "@prisma/client";

/**
 * Prisma Result Extension for financial amounts.
 */
export const currencyExtensionDefinition = {
  name: "currencyExtension",
  result: {},
};

export const currencyExtension = Prisma.defineExtension(
  currencyExtensionDefinition,
);
