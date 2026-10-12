import { supabase } from "@/lib/supabase";
import type { InventoryTable } from "@/types/inventory";

export async function adjustSizeQuantity(table: InventoryTable, sizeId: string, delta: number, expectedQuantity?: number): Promise<number> {
  if (!Number.isSafeInteger(delta) || delta === 0) throw new Error("Enter a whole-number quantity adjustment");
  const { data, error } = await supabase.rpc("adjust_size_quantity", {
    p_table: table, p_size_id: sizeId, p_delta: delta,
    p_expected_quantity: expectedQuantity ?? null,
  });
  if (error) throw new Error(error.message);
  return data as number;
}
