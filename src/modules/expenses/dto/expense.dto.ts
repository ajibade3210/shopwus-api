export interface ExpenseDto {
  id: string;
  businessId: string;
  title: string;
  description: string;
  category: string;
  amount: number;
  amountKobo?: number;
  date: string;
  paymentMethod?: string | null;
  vendor?: string | null;
  receiptUrl?: string | null;
  taxDeductible: boolean;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseCategorySummaryDto {
  category: string;
  label: string;
  amount: number;
  amountKobo?: number;
  count: number;
  percentage: number;
  color?: string;
}

export interface ExpenseSummaryDto {
  totalAmount: number;
  totalAmountKobo?: number;
  monthlySpent: number;
  monthlySpentKobo?: number;
  expenseCount: number;
  averageExpense: number;
  averageExpenseKobo?: number;
  topCategory: ExpenseCategorySummaryDto | null;
  categories: ExpenseCategorySummaryDto[];
  budget?: number;
  budgetKobo?: number;
  budgetUtilization?: number;
}

export interface ExpenseListResponseDto {
  items: ExpenseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
