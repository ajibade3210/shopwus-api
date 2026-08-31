import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import * as expenseController from "./expense.controller";
import * as expenseSchema from "./schema/expense.schema";

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List & Export
  typedApp.get(
    "/",
    {
      schema: expenseSchema.listExpensesRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.listExpensesHandler,
  );

  typedApp.get(
    "/summary",
    {
      preHandler: [authenticate],
    },
    expenseController.getExpenseSummaryHandler,
  );

  typedApp.get(
    "/categories",
    {
      preHandler: [authenticate],
    },
    expenseController.getExpenseCategoriesHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: expenseSchema.exportExpensesRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.exportExpensesHandler,
  );

  // CRUD
  typedApp.post(
    "/",
    {
      schema: expenseSchema.createExpenseRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.createExpenseHandler,
  );

  typedApp.get(
    "/:id",
    {
      schema: expenseSchema.getExpenseRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.getExpenseHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: expenseSchema.updateExpenseRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.updateExpenseHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: expenseSchema.deleteExpenseRouteSchema,
      preHandler: [authenticate],
    },
    expenseController.deleteExpenseHandler,
  );
}
