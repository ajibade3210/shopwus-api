import type { FastifyInstance } from "fastify";
import { analyticsRoutes } from "../modules/analytics/analytics.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { blogRoutes } from "../modules/blog/blog.routes";
import { broadcastRoutes } from "../modules/broadcasts/broadcast.routes";
import { customerRoutes } from "../modules/customers/customer.routes";
import { expenseRoutes } from "../modules/expenses/expense.routes";
import { feedbackRoutes } from "../modules/feedback/feedback.routes";
import { invoiceRoutes } from "../modules/invoices/invoice.routes";
import { leadRoutes } from "../modules/leads/lead.routes";
import { mediaRoutes } from "../modules/media/media.routes";
import { studioRoutes } from "../modules/studios/studio.routes";
import { valuationRoutes } from "../modules/valuation/valuation.routes";

async function v1Routes(v1: FastifyInstance) {
  await v1.register(authRoutes, { prefix: "/auth" });
  await v1.register(mediaRoutes, { prefix: "/media" });
  await v1.register(studioRoutes, { prefix: "/studios" });
  await v1.register(leadRoutes, { prefix: "/leads" });
  await v1.register(customerRoutes, { prefix: "/customers" });
  await v1.register(invoiceRoutes, { prefix: "/invoices" });
  await v1.register(expenseRoutes, { prefix: "/expenses" });
  await v1.register(analyticsRoutes, { prefix: "/analytics" });
  await v1.register(valuationRoutes, { prefix: "/valuation" });
  await v1.register(broadcastRoutes, { prefix: "/broadcasts" });
  await v1.register(feedbackRoutes, { prefix: "/feedback" });
  await v1.register(blogRoutes, { prefix: "/blog" });
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(v1Routes, { prefix: "/api/v1" });
}
