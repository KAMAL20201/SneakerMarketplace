import type { PRICE_SCHEDULE_STATUSES } from "@/constants/enums";

export type PriceScheduleStatus =
  (typeof PRICE_SCHEDULE_STATUSES)[keyof typeof PRICE_SCHEDULE_STATUSES];

export interface PriceSchedule {
  id: string;
  listing_id: string;
  product_title: string;
  previous_price: number;
  new_price: number;
  effective_at: string;
  status: PriceScheduleStatus;
  created_at: string;
  completed_at: string | null;
  error_message: string | null;
}

export interface PriceScheduleProduct {
  id: string;
  title: string;
  price: number;
}
