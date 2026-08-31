import type { CustomerServiceStatus } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import type { AddCustomerServiceInput } from "../schema/customer.schema";

export async function addCustomerServiceService(
  customerId: string,
  businessId: string,
  data: AddCustomerServiceInput,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    throw new NotFoundError("Customer not found");
  }

  const rawAmount = data.amount !== undefined ? Number(data.amount) : 0;

  return prisma.$transaction(async (tx) => {
    const service = await tx.customerService.create({
      data: {
        businessId,
        customerId: customer.id,
        name: data.name.trim(),
        service: data.service?.trim() || "",
        amount: rawAmount,
        status: data.status || "pending",
      },
    });

    await tx.customer.update({
      where: { id: customer.id },
      data: {
        totalRevenue: { increment: rawAmount },
      },
    });

    await tx.customerActivity.create({
      data: {
        businessId,
        customerId: customer.id,
        type: "service_added",
        description: `Added project scope '${service.name}' (₦${rawAmount.toLocaleString()}).`,
      },
    });

    return {
      id: service.id,
      businessId: service.businessId,
      customerId: service.customerId,
      name: service.name,
      service: service.service,
      amount: Number(service.amount),
      status: service.status,
      completedAt: service.completedAt
        ? service.completedAt.toISOString()
        : null,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
    };
  });
}

export async function updateCustomerServiceStatusService(
  customerId: string,
  serviceId: string,
  businessId: string,
  status: CustomerServiceStatus,
) {
  const service = await prisma.customerService.findFirst({
    where: { id: serviceId, customerId, businessId },
  });

  if (!service) {
    throw new NotFoundError("Customer service scope not found");
  }

  const updated = await prisma.customerService.update({
    where: { id: service.id },
    data: {
      status,
      completedAt: status === "completed" ? new Date() : null,
    },
  });

  await prisma.customerActivity.create({
    data: {
      businessId,
      customerId,
      type: "service_status_changed",
      description: `Service '${service.name}' status updated to '${status}'.`,
    },
  });

  return {
    id: updated.id,
    status: updated.status,
    completedAt: updated.completedAt ? updated.completedAt.toISOString() : null,
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteCustomerServiceService(
  customerId: string,
  serviceId: string,
  businessId: string,
) {
  const service = await prisma.customerService.findFirst({
    where: { id: serviceId, customerId, businessId },
  });

  if (!service) {
    throw new NotFoundError("Customer service scope not found");
  }

  const amountToDeduct = Number(service.amount);

  await prisma.$transaction(async (tx) => {
    await tx.customerService.delete({
      where: { id: service.id },
    });

    await tx.customer.update({
      where: { id: customerId },
      data: {
        totalRevenue: { decrement: amountToDeduct },
      },
    });

    await tx.customerActivity.create({
      data: {
        businessId,
        customerId,
        type: "service_deleted",
        description: `Removed project scope '${service.name}'.`,
      },
    });
  });

  return { id: service.id, deleted: true };
}
