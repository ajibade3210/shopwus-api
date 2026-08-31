import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { authenticate } from "../../middlewares/auth";
import * as analyticsController from "./analytics.controller";
import * as analyticsSchema from "./schema/analytics.schema";

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // Studio Overview Metrics
  typedApp.get(
    "/overview",
    {
      schema: analyticsSchema.getAnalyticsOverviewRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getAnalyticsOverviewHandler,
  );

  // Alias for root GET /api/analytics
  typedApp.get(
    "/",
    {
      schema: analyticsSchema.getAnalyticsOverviewRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getAnalyticsOverviewHandler,
  );

  // Revenue vs Expense Time Series Charts
  typedApp.get(
    "/revenue",
    {
      schema: analyticsSchema.getRevenueChartRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getRevenueChartHandler,
  );

  typedApp.get(
    "/revenue-chart",
    {
      schema: analyticsSchema.getRevenueChartRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getRevenueChartHandler,
  );

  // Conversion Funnel Metrics
  typedApp.get(
    "/funnel",
    {
      schema: analyticsSchema.getFunnelRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getFunnelHandler,
  );

  // Services Performance Ranking
  typedApp.get(
    "/services-performance",
    {
      schema: analyticsSchema.getServicesPerformanceRouteSchema,
      preHandler: [authenticate],
    },
    analyticsController.getServicesPerformanceHandler,
  );
}
