import type { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type {
  ExpenseCategorySummaryDto,
  ExpenseSummaryDto,
} from "../dto/expense.dto";

const CATEGORY_COLORS: Record<string, string> = {
  materials: "#3b82f6",
  equipment: "#8b5cf6",
  production: "#ec4899",
  logistics: "#f59e0b",
  marketing: "#10b981",
  utilities: "#6366f1",
  software: "#14b8a6",
  legal: "#64748b",
  other: "#94a3b8",
};

export async function getExpenseCategoryBreakdownService(
  businessId: string,
): Promise<ExpenseCategorySummaryDto[]> {
  const expenses = await prisma.expense.findMany({
    where: { businessId },
  });

  const total = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const e of expenses) {
    const cat = e.category.toLowerCase();
    const curr = categoryMap.get(cat) || { amount: 0, count: 0 };
    categoryMap.set(cat, {
      amount: curr.amount + Number(e.amount),
      count: curr.count + 1,
    });
  }

  const breakdown: ExpenseCategorySummaryDto[] = Array.from(
    categoryMap.entries(),
  ).map(([cat, stats]) => ({
    category: cat,
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    amount: stats.amount,
    count: stats.count,
    percentage: total > 0 ? Math.round((stats.amount / total) * 100) : 0,
    color: CATEGORY_COLORS[cat] || "#94a3b8",
  }));

  return breakdown.sort((a, b) => b.amount - a.amount);
}

export async function getExpenseSummaryService(
  businessId: string,
): Promise<ExpenseSummaryDto> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [allExpenses, monthlyExpenses, categories] = await Promise.all([
    prisma.expense.findMany({ where: { businessId } }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: startOfMonth },
      },
    }),
    getExpenseCategoryBreakdownService(businessId),
  ]);

  const totalAmount = allExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const monthlySpent = monthlyExpenses.reduce(
    (acc, e) => acc + Number(e.amount),
    0,
  );
  const topCategory = categories.length > 0 ? categories[0] : null;
  const averageExpense =
    allExpenses.length > 0 ? Math.round(totalAmount / allExpenses.length) : 0;

  const estimatedBudget = 5000000;
  const budgetUtilization =
    estimatedBudget > 0
      ? Math.round((monthlySpent / estimatedBudget) * 100)
      : 0;

  return {
    totalAmount,
    monthlySpent,
    expenseCount: allExpenses.length,
    averageExpense,
    topCategory,
    categories,
    budget: estimatedBudget,
    budgetUtilization,
  };
}

export async function exportExpensesCsvService(
  businessId: string,
  query: {
    q?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  },
): Promise<string> {
  const where: Prisma.ExpenseWhereInput = { businessId };
  if (query.category && query.category !== "all")
    where.category = query.category;

  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) where.date.gte = new Date(query.startDate);
    if (query.endDate) where.date.lte = new Date(query.endDate);
  }

  if (query.q?.trim()) {
    const term = query.q.trim();
    where.OR = [
      { description: { contains: term, mode: "insensitive" } },
      { category: { contains: term, mode: "insensitive" } },
      { vendor: { contains: term, mode: "insensitive" } },
    ];
  }

  const expenses = await prisma.expense.findMany({
    where,
    orderBy: { date: "desc" },
  });

  const headers = [
    "ID",
    "Description",
    "Amount (NGN)",
    "Category",
    "Date",
    "Payment Method",
    "Vendor",
    "Tax Deductible",
  ];

  const rows = expenses.map((e) => [
    e.id,
    `"${e.description.replace(/"/g, '""')}"`,
    Number(e.amount),
    `"${e.category}"`,
    `"${e.date.toISOString().split("T")[0]}"`,
    `"${e.paymentMethod || "Transfer"}"`,
    `"${(e.vendor || "N/A").replace(/"/g, '""')}"`,
    e.taxDeductible ? "Yes" : "No",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}
