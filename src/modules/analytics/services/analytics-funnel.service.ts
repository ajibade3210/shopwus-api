import { prisma } from "../../../lib/prisma";
import type {
  FunnelMetricsDto,
  ServicePerformanceDto,
} from "../dto/analytics.dto";

export async function getFunnelMetricsService(
  businessId: string,
): Promise<FunnelMetricsDto> {
  const [leads, customers] = await Promise.all([
    prisma.lead.findMany({ where: { businessId } }),
    prisma.customer.findMany({
      where: { businessId },
      include: { services: true },
    }),
  ]);

  const totalInquiries = leads.length;
  const contactedCount = leads.filter((l) => l.status !== "new").length;
  const qualifiedCount = leads.filter(
    (l) => l.status === "qualified" || l.status === "converted",
  ).length;
  const convertedCount = leads.filter((l) => l.status === "converted").length;

  const wonRevenue = customers.reduce(
    (acc, c) => acc + Number(c.totalRevenue),
    0,
  );

  const stages = [
    {
      stage: "inquiries",
      label: "Inbound Inquiries",
      count: totalInquiries,
      percentage: 100,
      dropoffRate:
        totalInquiries > 0
          ? Math.round(
              ((totalInquiries - contactedCount) / totalInquiries) * 100,
            )
          : 0,
    },
    {
      stage: "contacted",
      label: "Contacted / Discovery",
      count: contactedCount,
      percentage:
        totalInquiries > 0
          ? Math.round((contactedCount / totalInquiries) * 100)
          : 0,
      dropoffRate:
        contactedCount > 0
          ? Math.round(
              ((contactedCount - qualifiedCount) / contactedCount) * 100,
            )
          : 0,
    },
    {
      stage: "qualified",
      label: "Proposal Qualified",
      count: qualifiedCount,
      percentage:
        totalInquiries > 0
          ? Math.round((qualifiedCount / totalInquiries) * 100)
          : 0,
      dropoffRate:
        qualifiedCount > 0
          ? Math.round(
              ((qualifiedCount - convertedCount) / qualifiedCount) * 100,
            )
          : 0,
    },
    {
      stage: "converted",
      label: "Closed & Onboarded",
      count: convertedCount,
      percentage:
        totalInquiries > 0
          ? Math.round((convertedCount / totalInquiries) * 100)
          : 0,
      dropoffRate: 0,
    },
  ];

  return {
    stages,
    totalInquiries,
    convertedLeads: convertedCount,
    conversionRate:
      totalInquiries > 0
        ? Math.round((convertedCount / totalInquiries) * 100)
        : 0,
    wonRevenue,
  };
}

export async function getServicesPerformanceService(
  businessId: string,
): Promise<ServicePerformanceDto[]> {
  const customerServices = await prisma.customerService.findMany({
    where: { businessId },
  });

  const performanceMap = new Map<
    string,
    {
      id: string;
      name: string;
      category: string;
      price: number;
      dealsCount: number;
      totalRevenue: number;
      activeCount: number;
    }
  >();

  for (const cs of customerServices) {
    const key = cs.name;
    const existing = performanceMap.get(key) || {
      id: cs.id,
      name: cs.name,
      category: cs.service || "",
      price: Number(cs.amount),
      dealsCount: 0,
      totalRevenue: 0,
      activeCount: 0,
    };

    existing.dealsCount += 1;
    existing.totalRevenue += Number(cs.amount);
    if (cs.status === "active" || cs.status === "pending") {
      existing.activeCount += 1;
    }

    performanceMap.set(key, existing);
  }

  return Array.from(performanceMap.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );
}
