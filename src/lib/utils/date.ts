/**
 * Date formatting helpers built on the platform `Intl` APIs.
 *
 * Using `Intl` avoids pulling in a date library for what amounts to two
 * functions, and keeps output locale-aware.
 */

const relativeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
});

const absoluteFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

/**
 * Render an ISO timestamp as a short relative string, e.g. "2 days ago".
 *
 * Falls back to an absolute date beyond a year, where "13 months ago" is less
 * useful than the actual date.
 *
 * @param now Injectable clock, so callers (and tests) can pin the reference
 *   point instead of depending on the ambient time.
 */
export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  const seconds = Math.round((then.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(seconds);

  if (magnitude < MINUTE) return "just now";
  if (magnitude < HOUR) {
    return relativeFormatter.format(Math.round(seconds / MINUTE), "minute");
  }
  if (magnitude < DAY) {
    return relativeFormatter.format(Math.round(seconds / HOUR), "hour");
  }
  if (magnitude < WEEK) {
    return relativeFormatter.format(Math.round(seconds / DAY), "day");
  }
  if (magnitude < MONTH) {
    return relativeFormatter.format(Math.round(seconds / WEEK), "week");
  }
  if (magnitude < YEAR) {
    return relativeFormatter.format(Math.round(seconds / MONTH), "month");
  }
  return formatAbsoluteDate(iso);
}

/** Render an ISO timestamp as e.g. "Mar 4, 2026". */
export function formatAbsoluteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return absoluteFormatter.format(date);
}

/**
 * Pick the greeting for the current hour.
 *
 * Exposed as a pure function of the hour so the dashboard header can render it
 * without embedding time logic in a component.
 */
export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
