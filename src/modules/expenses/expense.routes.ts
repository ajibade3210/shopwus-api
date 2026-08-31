import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate, requireBusiness } from "../../middlewares/auth";
import * as expenseController from "./expense.controller";
import * as expenseSchema from "./schema/expense.schema";

export async function expenseRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", requireBusiness);

  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // List & Export
  typedApp.get(
    "/",
    {
      schema: expenseSchema.listExpensesRouteSchema,
    },
    expenseController.listExpensesHandler,
  );

  typedApp.get(
    "/summary",
    expenseController.getExpenseSummaryHandler,
  );

  typedApp.get(
    "/categories",
    expenseController.getExpenseCategoriesHandler,
  );

  typedApp.get(
    "/export",
    {
      schema: expenseSchema.exportExpensesRouteSchema,
    },
    expenseController.exportExpensesHandler,
  );

  // CRUD
  typedApp.post(
    "/",
    {
      schema: expenseSchema.createExpenseRouteSchema,
    },
    expenseController.createExpenseHandler,
  );

  typedApp.get(
    "/:id",
    {
      schema: expenseSchema.getExpenseRouteSchema,
    },
    expenseController.getExpenseHandler,
  );

  typedApp.put(
    "/:id",
    {
      schema: expenseSchema.updateExpenseRouteSchema,
    },
    expenseController.updateExpenseHandler,
  );

  typedApp.delete(
    "/:id",
    {
      schema: expenseSchema.deleteExpenseRouteSchema,
    },
    expenseController.deleteExpenseHandler,
  );
}
