/**
 * Helpers for formatting pre-order batch dates across the storefront.
 */

/**
 * Formats an ISO date string into a friendly long date.
 * Example: "Sunday, 27th September"
 */
export function formatBatchOpenDate(
  dateStr: string | null | undefined,
  options?: { includeTime?: boolean },
): string {
  if (!dateStr) return "Soon";
  if (options?.includeTime) {
    return formatBatchOpenDateTime(dateStr);
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Soon";
    const weekday = d.toLocaleDateString("en-IN", { weekday: "long" });
    const day = d.getDate();
    const month = d.toLocaleDateString("en-IN", { month: "long" });
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    return `${weekday}, ${day}${suffix} ${month}`;
  } catch {
    return "Soon";
  }
}

/**
 * Formats an ISO date string into a 12-hour time.
 * Example: "6:00 PM"
 */
export function formatBatchOpenTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d
      .toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .toUpperCase();
  } catch {
    return "";
  }
}

/**
 * Formats an ISO date string into a friendly long date and time.
 * Example: "Sunday, 27th September at 6:00 PM"
 */
export function formatBatchOpenDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return "Soon";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Soon";
    const datePart = formatBatchOpenDate(dateStr);
    const timePart = formatBatchOpenTime(dateStr);
    return timePart ? `${datePart} at ${timePart}` : datePart;
  } catch {
    return "Soon";
  }
}

/**
 * Formats an ISO date string into a short date for badges or tabs.
 * Example: "27th Sept"
 */
export function formatBatchOpenShort(dateStr: string | null | undefined): string {
  if (!dateStr) return "Soon";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Soon";
    const day = d.getDate();
    const month = d.toLocaleDateString("en-IN", { month: "short" });
    const suffix =
      day % 10 === 1 && day !== 11
        ? "st"
        : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
        ? "rd"
        : "th";
    return `${day}${suffix} ${month}`;
  } catch {
    return "Soon";
  }
}
