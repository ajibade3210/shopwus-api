import { z } from "zod";
import { ReqHeaderSchema } from "../../../utils";

export const timeframeEnum = z.enum([
  "daily",
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
]);

export const analyticsQuerySchema = z.object({
  timeframe: timeframeEnum.optional().default("monthly"),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;

export const getAnalyticsOverviewRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: analyticsQuerySchema,
};

export const getRevenueChartRouteSchema = {
  headers: ReqHeaderSchema,
  querystring: analyticsQuerySchema,
};

export const getFunnelRouteSchema = {
  headers: ReqHeaderSchema,
};

export const getServicesPerformanceRouteSchema = {
  headers: ReqHeaderSchema,
};
