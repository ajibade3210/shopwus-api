import type { FastifyReply, FastifyRequest } from "fastify";
import type {
  CreateExpenseInput,
  ExpenseIdParams,
  ListExpensesQuery,
  UpdateExpenseInput,
} from "./schema/expense.schema";
import {
  createExpenseService,
  deleteExpenseService,
  getExpenseByIdService,
  listExpensesService,
  updateExpenseService,
} from "./services/expense.service";
import {
  exportExpensesCsvService,
  getExpenseCategoryBreakdownService,
  getExpenseSummaryService,
} from "./services/expense-analytics.service";

export async function listExpensesHandler(
  request: FastifyRequest<{ Querystring: ListExpensesQuery }>,
  reply: FastifyReply,
) {
  const result = await listExpensesService(request.businessId, request.query);
  return reply.success(result, "Expenses retrieved");
}

export async function getExpenseSummaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getExpenseSummaryService(request.businessId);
  return reply.success(result, "Expense summary retrieved");
}

export async function getExpenseCategoriesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getExpenseCategoryBreakdownService(request.businessId);
  return reply.success(result, "Expense categories retrieved");
}

export async function getExpenseHandler(
  request: FastifyRequest<{ Params: ExpenseIdParams }>,
  reply: FastifyReply,
) {
  const result = await getExpenseByIdService(request.params.id, request.businessId);
  return reply.success(result, "Expense retrieved");
}

export async function createExpenseHandler(
  request: FastifyRequest<{ Body: CreateExpenseInput }>,
  reply: FastifyReply,
) {
  const result = await createExpenseService(request.businessId, request.body);
  return reply.success(result, "Expense created successfully", 201);
}

export async function updateExpenseHandler(
  request: FastifyRequest<{
    Params: ExpenseIdParams;
    Body: UpdateExpenseInput;
  }>,
  reply: FastifyReply,
) {
  const result = await updateExpenseService(
    request.params.id,
    request.businessId,
    request.body,
  );
  return reply.success(result, "Expense updated successfully");
}

export async function deleteExpenseHandler(
  request: FastifyRequest<{ Params: ExpenseIdParams }>,
  reply: FastifyReply,
) {
  const result = await deleteExpenseService(request.params.id, request.businessId);
  return reply.success(result, "Expense deleted successfully");
}

export async function exportExpensesHandler(
  request: FastifyRequest<{
    Querystring: {
      q?: string;
      category?: string;
      startDate?: string;
      endDate?: string;
    };
  }>,
  reply: FastifyReply,
) {
  const csv = await exportExpensesCsvService(request.businessId, request.query);

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header(
    "Content-Disposition",
    `attachment; filename="expenses-${new Date().toISOString().split("T")[0]}.csv"`,
  );
  return reply.send(csv);
}

