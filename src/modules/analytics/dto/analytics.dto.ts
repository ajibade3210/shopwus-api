export interface MetricCardDto {
  value: string;
  rawNumber: number;
  change: string;
  isPositive: boolean;
  progressPercent: number;
}

export interface ChartDataDto {
  peakValue: string;
  peakCoord: { cx: number; cy: number };
  linePath: string;
  areaPath: string;
  xLabels: string[];
  yLabels: string[];
}

export interface TrendingServiceDto {
  name: string;
  category: string;
  price: number;
  volume: number;
  image?: string;
}

export interface AnalyticsOverviewDto {
  timeframe: string;
  timeframeLabel: string;
  views: MetricCardDto;
  leads: MetricCardDto;
  revenue: MetricCardDto;
  expenses: MetricCardDto;
  netProfit: MetricCardDto;
  chart: ChartDataDto;
  trendingServices: TrendingServiceDto[];
  recentActivities?: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  invoices?: {
    paidCount: number;
    pendingCount: number;
    pendingAmount: number;
  };
  valuation?: {
    multiple: number;
    estimatedValuation: number;
  };
}

export interface RevenueTimeSeriesPointDto {
  period: string;
  revenue: number;
  expenses: number;
  netProfit: number;
}

export interface FunnelStageDto {
  stage: string;
  label: string;
  count: number;
  percentage: number;
  dropoffRate: number;
}

export interface FunnelMetricsDto {
  stages: FunnelStageDto[];
  totalInquiries: number;
  convertedLeads: number;
  conversionRate: number;
  wonRevenue: number;
}

export interface ServicePerformanceDto {
  id: string;
  name: string;
  category: string;
  price: number;
  dealsCount: number;
  totalRevenue: number;
  activeCount: number;
}
