import { prisma } from "../../../lib/prisma";
import type { RevenueTimeSeriesPointDto } from "../dto/analytics.dto";

export async function getRevenueTimeSeriesService(
  businessId: string,
  _timeframe: string = "monthly",
): Promise<RevenueTimeSeriesPointDto[]> {
  const monthsBack = 6;
  const now = new Date();
  const startDate = new Date(
    now.getFullYear(),
    now.getMonth() - (monthsBack - 1),
    1,
  );

  const [invoices, expenses] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate },
      },
    }),
    prisma.expense.findMany({
      where: {
        businessId,
        date: { gte: startDate },
      },
    }),
  ]);

  const points: RevenueTimeSeriesPointDto[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toLocaleString("en-US", { month: "short" });
    const yearMonth = `${d.getFullYear()}-${d.getMonth()}`;

    const monthInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.createdAt);
      return `${invDate.getFullYear()}-${invDate.getMonth()}` === yearMonth;
    });

    const monthExpenses = expenses.filter((e) => {
      const expDate = new Date(e.date);
      return `${expDate.getFullYear()}-${expDate.getMonth()}` === yearMonth;
    });

    const rev = monthInvoices
      .filter((inv) => inv.status === "paid")
      .reduce((acc, inv) => acc + Number(inv.total), 0);

    const exp = monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

    points.push({
      period: monthKey,
      revenue: rev,
      expenses: exp,
      netProfit: rev - exp,
    });
  }

  return points;
}
