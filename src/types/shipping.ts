export interface ShippingAddress {
  id?: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  landmark?: string;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface PincodeData {
  city: string;
  state: string;
  district: string;
  postOffice: string;
}

export interface ShippingCalculation {
  pickup_pincode: string;
  delivery_pincode: string;
  weight: number;
  dimensions: {
    length: number;
    width: number;
    height: number;
  };
  delivery_type: "standard" | "express";
}

export interface ShippingRate {
  courier_id: string;
  courier_name: string;
  cost: number;
  estimated_days: number;
  is_cod_available: boolean;
}

export type ShipmentStatus =
  | "pending"
  | "pickup_scheduled"
  | "picked_up"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "failed"
  | "returned";
