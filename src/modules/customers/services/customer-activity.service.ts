import type { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { AddCustomerActivityInput } from "../schema/customer.schema";

export async function getCustomerActivitiesService(
  customerId: string,
  businessId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const activities = await prisma.customerActivity.findMany({
    where: { customerId, businessId },
    orderBy: { timestamp: "desc" },
  });

  return activities.map((a) => ({
    id: a.id,
    businessId: a.businessId,
    customerId: a.customerId,
    type: a.type,
    description: a.description,
    metadata: a.metadata,
    timestamp: a.timestamp.toISOString(),
  }));
}

export async function addCustomerActivityService(
  customerId: string,
  businessId: string,
  data: AddCustomerActivityInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const activity = await prisma.customerActivity.create({
    data: {
      businessId,
      customerId,
      type: data.type.trim(),
      description: data.description.trim(),
      metadata: data.metadata
        ? (data.metadata as Prisma.InputJsonValue)
        : undefined,
    },
  });

  return {
    id: activity.id,
    businessId: activity.businessId,
    customerId: activity.customerId,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata,
    timestamp: activity.timestamp.toISOString(),
  };
}
