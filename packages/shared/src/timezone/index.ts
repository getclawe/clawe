/**
 * Timezone utilities for Clawe
 * Uses moment-timezone for timezone data and native Intl for formatting
 */

import moment from "moment-timezone";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Get current time components in a specific timezone
 */
export const getTimeInZone = (
  date: Date,
  timezone: string,
): {
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  hour: number; // 0-23
  minute: number; // 0-59
} => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);

  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "Sun";
  const hour = parts.find((p) => p.type === "hour")?.value ?? "0";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "0";

  return {
    dayOfWeek: WEEKDAY_MAP[weekday] ?? 0,
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10),
  };
};

export const DEFAULT_TIMEZONE = "America/New_York";

export interface TimezoneOption {
  value: string;
  label: string;
  group: string;
}

/**
 * Get group name from timezone string (e.g., "America/New_York" -> "America")
 */
const getGroup = (tz: string): string => {
  const parts = tz.split("/");
  if (parts.length < 2) return "Other";
  const region = parts[0];
  // Map some regions to more user-friendly names
  switch (region) {
    case "America":
      return "Americas";
    case "Pacific":
    case "Australia":
      return "Australia & Pacific";
    case "Atlantic":
    case "Indian":
      return "Other";
    default:
      return region ?? "Other";
  }
};

/**
 * Format timezone name for display (e.g., "America/New_York" -> "New York")
 */
const formatLabel = (tz: string): string => {
  const parts = tz.split("/");
  const city = parts[parts.length - 1] ?? tz;
  return city.replace(/_/g, " ");
};

/**
 * All IANA timezones from moment-timezone, grouped by region
 */
export const TIMEZONE_OPTIONS: TimezoneOption[] = moment.tz
  .names()
  .filter((tz) => {
    // Filter out legacy/deprecated timezones
    return (
      !tz.startsWith("Etc/") &&
      !tz.startsWith("SystemV/") &&
      !tz.includes("GMT") &&
      tz.includes("/")
    );
  })
  .map((tz) => ({
    value: tz,
    label: formatLabel(tz),
    group: getGroup(tz),
  }))
  .sort((a, b) => {
    // Sort by group first, then by label
    if (a.group !== b.group) {
      return a.group.localeCompare(b.group);
    }
    return a.label.localeCompare(b.label);
  });
