import { supabase } from "@/lib/supabase";
import { LISTING_STATUS, PRICE_SCHEDULE_STATUSES } from "@/constants/enums";
import type { PriceSchedule, PriceScheduleProduct } from "@/types/priceSchedule";

export const PRICE_SCHEDULE_PAGE_SIZE = 10;

/** datetime-local is intentionally interpreted as IST, regardless of browser timezone. */
export function istInputToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error("Enter a valid date and time in IST");
  }
  const date = new Date(`${value}:00+05:30`);
  if (!Number.isFinite(date.getTime())) throw new Error("Enter a valid date and time");
  if (new Date(date.getTime() + 330 * 60_000).toISOString().slice(0, 16) !== value) {
    throw new Error("Enter a valid calendar date");
  }
  return date.toISOString();
}

export function formatScheduleDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function isoToIstInput(value: string): string {
  return new Date(Date.parse(value) + 330 * 60_000).toISOString().slice(0, 16);
}

function validateScheduleInput(newPrice: number, effectiveAt: string): void {
  if (!Number.isFinite(newPrice) || newPrice <= 0 || newPrice >= 100000000 || Math.abs(newPrice * 100 - Math.round(newPrice * 100)) > 0.00001) {
    throw new Error("Enter a valid price with up to two decimal places");
  }
  if (!Number.isFinite(Date.parse(effectiveAt)) || Date.parse(effectiveAt) <= Date.now()) {
    throw new Error("Choose a future date and time");
  }
}

export async function fetchPriceSchedules(page: number, signal?: AbortSignal): Promise<{ schedules: PriceSchedule[]; count: number }> {
  let query = supabase.from("scheduled_price_changes")
    .select("id, listing_id, product_title, previous_price, new_price, effective_at, status, created_at, completed_at, error_message", { count: "exact" })
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * PRICE_SCHEDULE_PAGE_SIZE, page * PRICE_SCHEDULE_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, count, error } = await query;
  if (error) throw new Error("Could not load price schedules. Please try again.");
  return { schedules: (data ?? []) as PriceSchedule[], count: count ?? 0 };
}

export async function searchPriceScheduleProducts(search: string, page: number, signal?: AbortSignal): Promise<{ products: PriceScheduleProduct[]; count: number }> {
  // Avoid treating PostgREST filter syntax or SQL wildcard characters as user input.
  const term = search.trim().replace(/[%_\\]/g, "\\$&");
  let query = supabase.from("product_listings")
    .select("id, title, price", { count: "exact" })
    .eq("is_deleted", false).in("status", [LISTING_STATUS.ACTIVE, LISTING_STATUS.SOLD])
    .ilike("title", `%${term}%`).order("title").order("id")
    .range((page - 1) * PRICE_SCHEDULE_PAGE_SIZE, page * PRICE_SCHEDULE_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, count, error } = await query;
  if (error) throw new Error("Could not search products. Please try again.");
  return { products: (data ?? []) as PriceScheduleProduct[], count: count ?? 0 };
}

export async function createPriceSchedule(listingId: string, newPrice: number, effectiveAt: string): Promise<void> {
  validateScheduleInput(newPrice, effectiveAt);
  // Server trigger fills the title, current prices and audit fields atomically.
  const { error } = await supabase.from("scheduled_price_changes").insert({
    listing_id: listingId, new_price: newPrice, effective_at: effectiveAt,
  });
  if (error) {
    if (error.code === "23505") throw new Error("This product already has a pending price change");
    throw new Error(error.message);
  }
}

export async function updatePriceSchedule(schedule: PriceSchedule, newPrice: number, effectiveAt: string): Promise<void> {
  validateScheduleInput(newPrice, effectiveAt);
  const { data, error } = await supabase.from("scheduled_price_changes")
    .update({ new_price: newPrice, effective_at: effectiveAt })
    .eq("id", schedule.id).eq("status", PRICE_SCHEDULE_STATUSES.PENDING)
    .eq("new_price", schedule.new_price).eq("effective_at", schedule.effective_at)
    .select("id").single();
  if (error || !data) {
    throw new Error("This schedule changed or is no longer pending. Refresh and try again.");
  }
}

export async function cancelPriceSchedule(id: string): Promise<void> {
  const { data, error } = await supabase.from("scheduled_price_changes")
    .update({ status: PRICE_SCHEDULE_STATUSES.CANCELLED })
    .eq("id", id).eq("status", PRICE_SCHEDULE_STATUSES.PENDING).select("id").single();
  if (error || !data) throw new Error("This schedule could not be cancelled. Refresh to check its status.");
}
