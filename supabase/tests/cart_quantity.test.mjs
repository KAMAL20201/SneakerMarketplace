import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../../src/lib/stockValidationService.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});
function service(rows, failureTable) {
  const exports = {};
  const supabase = { from(table) {
    const result = { data: rows[table] ?? [], error: table === failureTable ? new Error("offline") : null };
    return { select() { return this; }, in() { return Promise.resolve(result); } };
  } };
  vm.runInNewContext(outputText, { exports, require: () => ({ supabase }), console });
  return exports.StockValidationService;
}
const item = (quantity, overrides = {}) => ({ id: "line", productId: "shoe", size: "8", quantity, ...overrides });
const rows = {
  product_listings: [{ id: "shoe", status: "active", title: "Shoe" }],
  product_listing_sizes: [{ listing_id: "shoe", size_value: "8", quantity: 3, is_sold: false }],
  product_variant_sizes: [{ variant_id: "blue", size_value: "8", quantity: 2, is_sold: false }],
};
test("allows stock limit and rejects excess, fractional, and zero quantities", async () => {
  assert.equal((await service(rows).validateCartItems([item(3)])).isValid, true);
  for (const quantity of [4, 1.5, 0]) {
    const result = await service(rows).validateCartItems([item(quantity)]);
    assert.equal(result.isValid, false);
    assert.equal(result.unavailableItems[0].availableQuantity, 3);
  }
});
test("uses variant stock independently from legacy size stock", async () => {
  assert.equal((await service(rows).validateCartItems([item(2, { variantId: "blue" })])).isValid, true);
  assert.equal((await service(rows).validateCartItems([item(3, { variantId: "blue" })])).isValid, false);
});
test("combines duplicate stock requests and defaults legacy single items to one", async () => {
  assert.equal((await service(rows).validateCartItems([item(2), item(2, { id: "duplicate" })])).isValid, false);
  assert.equal((await service(rows).validateCartItems([item(2, { size: "9" })])).isValid, false);
});
test("stock lookup errors block checkout", async () => {
  await assert.rejects(service(rows, "product_listing_sizes").validateCartItems([item(1)]));
});
