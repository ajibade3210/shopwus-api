import type { FastifyReply, FastifyRequest } from "fastify";
import type { AnalyticsQuery } from "./schema/analytics.schema";
import {
  getFunnelMetricsService,
  getServicesPerformanceService,
} from "./services/analytics-funnel.service";
import { getAnalyticsOverviewService } from "./services/analytics-overview.service";
import { getRevenueTimeSeriesService } from "./services/analytics-revenue.service";

export async function getAnalyticsOverviewHandler(
  request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
  reply: FastifyReply,
) {
  const result = await getAnalyticsOverviewService(
    request.businessId,
    request.query.timeframe,
  );
  return reply.success(result, "Analytics overview retrieved");
}

export async function getRevenueChartHandler(
  request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
  reply: FastifyReply,
) {
  const result = await getRevenueTimeSeriesService(
    request.businessId,
    request.query.timeframe,
  );
  return reply.success(result, "Revenue chart data retrieved");
}

export async function getFunnelHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getFunnelMetricsService(request.businessId);
  return reply.success(result, "Pipeline conversion funnel retrieved");
}

export async function getServicesPerformanceHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await getServicesPerformanceService(request.businessId);
  return reply.success(result, "Services performance ranking retrieved");
}
