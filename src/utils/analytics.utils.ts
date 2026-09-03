import type { TimeBucket } from "../types";

export function formatCompact(val: number): string {
  if (val >= 1_000_000) {
    const m = (val / 1_000_000).toFixed(1);
    return `${m.endsWith(".0") ? m.slice(0, -2) : m}M`;
  }
  if (val >= 1_000) {
    const k = (val / 1_000).toFixed(1);
    return `${k.endsWith(".0") ? k.slice(0, -2) : k}k`;
  }
  return String(Math.round(val));
}

export function calculateNiceCeiling(maxVal: number): number {
  if (maxVal <= 0) return 1000;
  const power = 10 ** Math.floor(Math.log10(maxVal));
  const normalized = maxVal / power;
  let multiple: number;
  if (normalized <= 1) multiple = 1;
  else if (normalized <= 2) multiple = 2;
  else if (normalized <= 2.5) multiple = 2.5;
  else if (normalized <= 5) multiple = 5;
  else multiple = 10;
  return multiple * power;
}

// TimeBucket is defined in src/types/utils.ts, re-exported via src/types/index.ts
export type { TimeBucket };

export function generateTimeBuckets(
  timeframe: string,
  startDate: Date,
  endDate: Date,
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  const now = endDate;

  if (timeframe === "daily") {
    const dayStart = new Date(startDate);
    const intervals = [
      { label: "12:00 AM", hour: 0 },
      { label: "06:00 AM", hour: 6 },
      { label: "12:00 PM", hour: 12 },
      { label: "06:00 PM", hour: 18 },
      { label: "11:59 PM", hour: 24 },
    ];
    for (let i = 0; i < intervals.length - 1; i++) {
      const bStart = new Date(dayStart);
      bStart.setHours(intervals[i].hour, 0, 0, 0);
      const bEnd = new Date(dayStart);
      if (intervals[i + 1].hour === 24) {
        bEnd.setHours(23, 59, 59, 999);
      } else {
        bEnd.setHours(intervals[i + 1].hour, 0, 0, 0);
      }
      buckets.push({
        label: intervals[i].label,
        start: bStart,
        end: bEnd,
      });
    }
    buckets.push({
      label: "11:59 PM",
      start: new Date(
        dayStart.getFullYear(),
        dayStart.getMonth(),
        dayStart.getDate(),
        23,
        59,
        59,
        999,
      ),
      end: new Date(
        dayStart.getFullYear(),
        dayStart.getMonth(),
        dayStart.getDate(),
        23,
        59,
        59,
        999,
      ),
    });
  } else if (timeframe === "weekly") {
    const totalDays = 7;
    for (let i = 0; i < totalDays; i++) {
      const bStart = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const bEnd = new Date(
        startDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000,
      );
      const label = bStart.toLocaleDateString("en-US", { weekday: "short" });
      buckets.push({ label, start: bStart, end: bEnd });
    }
  } else if (timeframe === "yearly") {
    const year = startDate.getFullYear();
    const quarters = [
      { label: "Q1", startMonth: 0, endMonth: 2 },
      { label: "Q2", startMonth: 3, endMonth: 5 },
      { label: "Q3", startMonth: 6, endMonth: 8 },
      { label: "Q4", startMonth: 9, endMonth: 11 },
    ];
    for (const q of quarters) {
      const bStart = new Date(year, q.startMonth, 1);
      const bEnd = new Date(year, q.endMonth + 1, 0, 23, 59, 59, 999);
      buckets.push({ label: q.label, start: bStart, end: bEnd });
    }
    buckets.push({
      label: "Year End",
      start: new Date(year, 11, 31, 23, 59, 59, 999),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    });
  } else if (timeframe === "quarterly") {
    const startMonth = startDate.getMonth();
    const year = startDate.getFullYear();
    for (let i = 0; i < 3; i++) {
      const mDate = new Date(year, startMonth + i, 1);
      const bStart = new Date(year, startMonth + i, 1);
      const bEnd = new Date(year, startMonth + i + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: mDate.toLocaleDateString("en-US", { month: "short" }),
        start: bStart,
        end: bEnd,
      });
    }
    buckets.push({
      label: "Quarter Close",
      start: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
      end: new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999),
    });
  } else {
    // monthly default: 5 buckets (Week 1..4, Month Close)
    const year = startDate.getFullYear();
    const month = startDate.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    const weekSegments = [
      { label: "Week 1", startDay: 1, endDay: 7 },
      { label: "Week 2", startDay: 8, endDay: 14 },
      { label: "Week 3", startDay: 15, endDay: 21 },
      { label: "Week 4", startDay: 22, endDay: 28 },
      { label: "Month Close", startDay: 29, endDay: lastDayOfMonth },
    ];
    for (const w of weekSegments) {
      const bStart = new Date(year, month, w.startDay, 0, 0, 0, 0);
      const bEnd = new Date(
        year,
        month,
        Math.min(w.endDay, lastDayOfMonth),
        23,
        59,
        59,
        999,
      );
      buckets.push({ label: w.label, start: bStart, end: bEnd });
    }
  }

  return buckets;
}

export function generateSvgChartPaths(
  points: { x: number; y: number; val: number }[],
  startX = 40,
  endX = 800,
  bottomY = 240,
): { linePath: string; areaPath: string } {
  let linePath = "";
  if (points.length === 0) {
    linePath = `M ${startX} ${bottomY} L ${endX} ${bottomY}`;
  } else if (points.length === 1) {
    linePath = `M ${startX} ${points[0].y} L ${endX} ${points[0].y}`;
  } else {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp1y = prev.y;
      const cp2x = prev.x + (curr.x - prev.x) / 2;
      const cp2y = curr.y;
      linePath += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
    }
  }

  const lastPointX = points.length > 0 ? points[points.length - 1].x : endX;
  const firstPointX = points.length > 0 ? points[0].x : startX;
  const areaPath = `${linePath} L ${lastPointX} ${bottomY} L ${firstPointX} ${bottomY} Z`;

  return { linePath, areaPath };
}
