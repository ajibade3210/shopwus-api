import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError } from "../../lib/errors";
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
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getAnalyticsOverviewService(
    businessId,
    request.query.timeframe,
  );
  return reply.success(result, "Analytics overview retrieved");
}

export async function getRevenueChartHandler(
  request: FastifyRequest<{ Querystring: AnalyticsQuery }>,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getRevenueTimeSeriesService(
    businessId,
    request.query.timeframe,
  );
  return reply.success(result, "Revenue chart data retrieved");
}

export async function getFunnelHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getFunnelMetricsService(businessId);
  return reply.success(result, "Pipeline conversion funnel retrieved");
}

export async function getServicesPerformanceHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const businessId = request.user.businessId;
  if (!businessId)
    throw new ForbiddenError("Account is not linked to a business");
  const result = await getServicesPerformanceService(businessId);
  return reply.success(result, "Services performance ranking retrieved");
}
