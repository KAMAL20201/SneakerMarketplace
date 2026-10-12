export function parseStockQuantity(value: string): number | null {
  const quantity = Number(value);
  return value.trim() !== "" && Number.isSafeInteger(quantity) && quantity >= 0 && quantity <= 2147483647
    ? quantity
    : null;
}

export function toggleStockQuantity(value: string, initialQuantity: number): string {
  const quantity = parseStockQuantity(value);
  return quantity !== null && quantity > 0 ? "0" : String(Math.max(1, initialQuantity));
}
