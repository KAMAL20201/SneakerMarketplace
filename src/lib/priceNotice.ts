interface ScheduledPriceNotice {
  previous_price: number;
  new_price: number;
  effective_at: string;
}

export function parseScheduledPriceNotice(value: unknown): ScheduledPriceNotice | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("previous_price" in value) || !("new_price" in value) || !("effective_at" in value)) return null;
  if (typeof value.previous_price !== "number" || !Number.isFinite(value.previous_price)
    || typeof value.new_price !== "number" || !Number.isFinite(value.new_price)
    || typeof value.effective_at !== "string" || !Number.isFinite(Date.parse(value.effective_at))) return null;
  return { previous_price: value.previous_price, new_price: value.new_price, effective_at: value.effective_at };
}

export function formatPriceNoticeDate(value: string): string {
  return `${new Intl.DateTimeFormat("en-IN", {
    weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  }).format(new Date(value))} IST`;
}
