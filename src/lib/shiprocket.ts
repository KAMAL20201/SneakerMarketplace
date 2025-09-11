import { supabase } from "@/lib/supabase";

export type ServiceabilityQuery = {
  pickup_postcode: string;
  delivery_postcode: string;
  weight: number; // in kg
};

export type CourierCompany = {
  courier_company_id: number;
  courier_name: string;
  rate: number;
  etd?: string;
  estimated_delivery_days?: number;
  is_surface?: boolean;
  is_air?: boolean;
  rating?: number;
  cod_charges?: number;
};

export type ServiceabilityResponse = {
  status: number;
  message?: string;
  data?: {
    available_courier_companies?: CourierCompany[];
  };
};

export async function fetchServiceability(
  query: ServiceabilityQuery
): Promise<ServiceabilityResponse> {
  const { data, error } = await supabase.functions.invoke(
    "shiprocket-courier-partners",
    {
      body: {
        pickup_pincode: query.pickup_postcode,
        delivery_pincode: query.delivery_postcode,
        weight: query.weight,
      },
    }
  );

  if (error) {
    return { status: 500, message: error.message };
  }
  return data as ServiceabilityResponse;
}

// Add pickup address to Shiprocket via Supabase Edge Function
// Reads function name from env `VITE_SHIPROCKET_ADD_PICKUP_FN` or falls back to `shiprocket-add-pickup`.
export type ShiprocketPickupInput = {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export async function addPickupToShiprocket(address: ShiprocketPickupInput) {
  const fnName = "shiprocket-pickup-address";
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: { address },
  });
  if (error) throw error;
  return data;
}

// Create Shiprocket order via Supabase Edge Function
// Reads function name from env `VITE_SHIPROCKET_CREATE_ORDER_FN` or falls back to `shiprocket-create-order`.
export async function createShiprocketOrder(orderPayload: Record<string, any>) {
  const fnName = "shiprocket-create-order";
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: { order: orderPayload },
  });
  if (error) throw error;
  return data as { success: boolean; order_id?: string; status?: string; data?: any };
}
