import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const createExpenseSchema = z
  .object({
    description: z.string().optional(),
    title: z.string().optional(),
    category: z.string().min(1, "Category is required"),
    amount: z
      .union([z.string(), z.number()])
      .refine((val) => Number(val) >= 0, {
        message: "Amount must be greater than or equal to 0",
      }),
    date: z.string().optional(),
    paymentMethod: z.string().optional(),
    vendor: z.string().optional(),
    receiptUrl: z.string().optional(),
    taxDeductible: z.boolean().optional().default(false),
    notes: z.string().optional(),
  })
  .refine((data) => data.description || data.title, {
    message: "Either description or title is required",
    path: ["description"],
  });

export const updateExpenseSchema = z.object({
  description: z.string().optional(),
  title: z.string().optional(),
  category: z.string().optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  date: z.string().optional(),
  paymentMethod: z.string().optional(),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  taxDeductible: z.boolean().optional(),
  notes: z.string().optional(),
});

export const listExpensesQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  vendor: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const expenseIdParamsSchema = z.object({
  id: z.string().min(1, "Expense ID is required"),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type ExpenseIdParams = z.infer<typeof expenseIdParamsSchema>;

export const listExpensesRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: listExpensesQuerySchema,
};

export const createExpenseRouteSchema = {
  headers: ReqHeaderSchema,
  body: createExpenseSchema,
};

export const getExpenseRouteSchema = {
  headers: ReqHeaderSchema,
  params: expenseIdParamsSchema,
};

export const updateExpenseRouteSchema = {
  headers: ReqHeaderSchema,
  params: expenseIdParamsSchema,
  body: updateExpenseSchema,
};

export const deleteExpenseRouteSchema = {
  headers: ReqHeaderSchema,
  params: expenseIdParamsSchema,
};

export const exportExpensesRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }),
};
