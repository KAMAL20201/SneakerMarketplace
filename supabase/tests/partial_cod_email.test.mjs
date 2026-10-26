import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

function loadEmailFunction() {
  const source = fs.readFileSync(new URL("../functions/send-order-email/index.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const context = { exports: {}, require: () => ({}), console, Deno: { serve() {}, env: { get() {} } } };
  vm.runInNewContext(outputText, context);
  return context;
}

const { buildEmailContent } = loadEmailFunction();
const baseOrder = { order_id: "abcdef12-0000-0000-0000-000000000000", product_title: "Dunk Low", currency: "INR" };
const partialCod = { payment_type: "partial_cod", payment_total: 10100, advance_amount: 7070, cod_amount: 3030, cod_fee: 100 };
const render = (type, order) =>
  buildEmailContent({ type, recipient_email: "buyer@example.com", recipient_name: "Buyer", order_data: { ...baseOrder, ...order } }).html;

test("confirmation email shows the partial COD split and cash due", () => {
  const html = render("order_confirmed", { amount: 7070, order_status: "confirmed", ...partialCod });
  assert.ok(html.includes("Order Total (incl. ₹100 COD fee)"));
  assert.ok(html.includes("Advance Paid") && html.includes("₹7,070"));
  assert.ok(html.includes("Pay on Delivery (cash)") && html.includes("₹3,030"));
  assert.ok(!html.includes("Amount Paid"));
});

test("shipping email reminds the buyer of the cash due", () => {
  const html = render("order_shipped", { amount: 10100, order_status: "shipped", ...partialCod });
  assert.ok(html.includes("Pay on Delivery (cash)") && html.includes("ready in cash"));
});

test("payment reminder asks for the advance, not the full total", () => {
  const html = render("payment_reminder", { amount: 10000, order_status: "pending_payment", ...partialCod });
  assert.ok(html.includes("Advance to Pay Now") && html.includes("₹7,070"));
  assert.ok(!html.includes("Total to Pay"));
});

test("prepaid emails are unchanged", () => {
  const confirmed = render("order_confirmed", { amount: 10000, order_status: "confirmed" });
  assert.ok(confirmed.includes("Amount Paid") && !confirmed.includes("COD"));
  const reminder = render("payment_reminder", { amount: 10000, order_status: "pending_payment" });
  assert.ok(reminder.includes("Total to Pay") && !reminder.includes("Pay on Delivery"));
});
