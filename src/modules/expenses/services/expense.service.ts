import type { Prisma } from "@prisma/client";
import { NotFoundError } from "../../../lib/errors";
import { prisma } from "../../../lib/prisma";
import { toFinancialAmount } from "../../../utils/currency.utils";
import type {
  CreateExpenseInput,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "../schema/expense.schema";

export async function listExpensesService(
  businessId: string,
  query: ListExpensesQuery,
) {
  const { q, category, vendor, startDate, endDate, page, limit } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.ExpenseWhereInput = { businessId };

  if (category && category !== "all") {
    where.category = category;
  }

  if (vendor) {
    where.vendor = { contains: vendor, mode: "insensitive" };
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) where.date.gte = new Date(startDate);
    if (endDate) where.date.lte = new Date(endDate);
  }

  if (q?.trim()) {
    const term = q.trim();
    where.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { vendor: { contains: term, mode: "insensitive" } },
      { paymentMethod: { contains: term, mode: "insensitive" } },
    ];
  }

  const [total, expenses] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = expenses.map((e) => ({
    id: e.id,
    businessId: e.businessId,
    title: e.description,
    description: e.description,
    category: e.category,
    ...toFinancialAmount(e.amount, "amount"),
    date: e.date.toISOString(),
    paymentMethod: e.paymentMethod,
    vendor: e.vendor,
    receiptUrl: e.receiptUrl,
    taxDeductible: e.taxDeductible,
    notes: e.description,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getExpenseByIdService(
  expenseId: string,
  businessId: string,
) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });

  if (!expense) {
    throw new NotFoundError("Expense record not found");
  }

  return {
    id: expense.id,
    businessId: expense.businessId,
    title: expense.description,
    description: expense.description,
    category: expense.category,
    ...toFinancialAmount(expense.amount, "amount"),
    date: expense.date.toISOString(),
    paymentMethod: expense.paymentMethod,
    vendor: expense.vendor,
    receiptUrl: expense.receiptUrl,
    taxDeductible: expense.taxDeductible,
    notes: expense.description,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export async function createExpenseService(
  businessId: string,
  data: CreateExpenseInput,
) {
  const desc = (data.description || data.title || "").trim();
  const rawAmount = Number(data.amount) || 0;

  const expense = await prisma.expense.create({
    data: {
      businessId,
      description: desc,
      category: data.category.trim().toLowerCase(),
      amount: rawAmount,
      date: data.date ? new Date(data.date) : new Date(),
      paymentMethod: data.paymentMethod?.trim(),
      vendor: data.vendor?.trim(),
      receiptUrl: data.receiptUrl?.trim(),
      taxDeductible: data.taxDeductible ?? false,
    },
  });

  return {
    id: expense.id,
    businessId: expense.businessId,
    title: expense.description,
    description: expense.description,
    category: expense.category,
    ...toFinancialAmount(expense.amount, "amount"),
    date: expense.date.toISOString(),
    paymentMethod: expense.paymentMethod,
    vendor: expense.vendor,
    receiptUrl: expense.receiptUrl,
    taxDeductible: expense.taxDeductible,
    notes: expense.description,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
  };
}

export async function updateExpenseService(
  expenseId: string,
  businessId: string,
  data: UpdateExpenseInput,
) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Expense record not found");
  }

  const updatePayload: Prisma.ExpenseUpdateInput = {};
  if (data.description !== undefined || data.title !== undefined) {
    updatePayload.description = (data.description || data.title || "").trim();
  }
  if (data.category !== undefined)
    updatePayload.category = data.category.trim().toLowerCase();
  if (data.amount !== undefined) updatePayload.amount = Number(data.amount);
  if (data.date !== undefined) updatePayload.date = new Date(data.date);
  if (data.paymentMethod !== undefined)
    updatePayload.paymentMethod = data.paymentMethod?.trim();
  if (data.vendor !== undefined) updatePayload.vendor = data.vendor?.trim();
  if (data.receiptUrl !== undefined)
    updatePayload.receiptUrl = data.receiptUrl?.trim();
  if (data.taxDeductible !== undefined)
    updatePayload.taxDeductible = data.taxDeductible;

  const updated = await prisma.expense.update({
    where: { id: existing.id },
    data: updatePayload,
  });

  return {
    id: updated.id,
    businessId: updated.businessId,
    title: updated.description,
    description: updated.description,
    category: updated.category,
    ...toFinancialAmount(updated.amount, "amount"),
    date: updated.date.toISOString(),
    paymentMethod: updated.paymentMethod,
    vendor: updated.vendor,
    receiptUrl: updated.receiptUrl,
    taxDeductible: updated.taxDeductible,
    notes: updated.description,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

export async function deleteExpenseService(
  expenseId: string,
  businessId: string,
) {
  const existing = await prisma.expense.findFirst({
    where: { id: expenseId, businessId },
  });

  if (!existing) {
    throw new NotFoundError("Expense record not found");
  }

  await prisma.expense.delete({
    where: { id: existing.id },
  });

  return { id: existing.id, deleted: true };
}
