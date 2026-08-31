import { DateTime } from "luxon";
import { env } from "../config/env";

export const APP_DEFAULT_TIMEZONE = env.APP_DEFAULT_TIMEZONE;

export function getCurrentDateInTimezone(): Date {
  return DateTime.now().setZone(APP_DEFAULT_TIMEZONE).toJSDate();
}

export function getDateTime(date?: Date): DateTime {
  if (date) {
    return DateTime.fromJSDate(date).setZone(APP_DEFAULT_TIMEZONE);
  }
  return DateTime.now().setZone(APP_DEFAULT_TIMEZONE);
}

export function parseUserDate(dateStr: string, endOfDay = false): Date {
  let dt = DateTime.fromISO(dateStr);
  if (!dt.zoneName || dateStr.length <= 10) {
    // No timezone or just YYYY-MM-DD
    dt = DateTime.fromISO(dateStr, { zone: APP_DEFAULT_TIMEZONE });
  }
  if (endOfDay) {
    dt = dt.endOf("day");
  }
  return dt.toJSDate();
}

export function formatDate(date: Date, format = "yyyy-MM-dd"): string {
  return DateTime.fromJSDate(date)
    .setZone(APP_DEFAULT_TIMEZONE)
    .toFormat(format);
}

export function parseFormattedDate(formatted: string): Date {
  return DateTime.fromFormat(formatted, "yyyy-MM-dd HH:mm:ss", {
    zone: "utc",
  }).toJSDate();
}

export function percentageIncrease(previous: number, current: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function getMonthBoundaries() {
  const now = getDateTime();

  const startOfCurrentMonth = now.startOf("month").toJSDate();
  const endOfPreviousMonth = now.minus({ months: 1 }).endOf("month").toJSDate();
  const startOfPreviousMonth = now
    .minus({ months: 1 })
    .startOf("month")
    .toJSDate();

  return {
    startOfCurrentMonth,
    startOfPreviousMonth,
    endOfPreviousMonth,
  };
}

export function addDurationToDate(date: Date, interval: string): Date {
  const dt = DateTime.fromJSDate(date).setZone(APP_DEFAULT_TIMEZONE);
  switch (interval.toUpperCase()) {
    case "DAILY":
      return dt.plus({ days: 1 }).toJSDate();
    case "WEEKLY":
      return dt.plus({ weeks: 1 }).toJSDate();
    case "MONTHLY":
      return dt.plus({ months: 1 }).toJSDate();
    case "QUARTERLY":
      return dt.plus({ quarters: 1 }).toJSDate();
    case "ANNUAL":
    case "YEARLY":
      return dt.plus({ years: 1 }).toJSDate();
    case "BI_ANNUAL":
      return dt.plus({ months: 6 }).toJSDate();
    default:
      return dt.toJSDate();
  }
}
