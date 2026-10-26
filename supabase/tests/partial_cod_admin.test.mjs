import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
const require = createRequire(import.meta.url);
function load(relativePath, modules = {}, globals = {}, suffix = "") {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8") + suffix;
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => modules[name] ?? require(name), console, Error, ...globals });
  return exports;
}
const enums = load("../../src/constants/enums.ts");
const helpers = load("../../src/lib/orderPayment.ts", { "../constants/enums": enums });
const { getPaymentEmailFields } = load("../../src/lib/emailService.ts", {
  "./supabase": { supabase: {} }, "@/components/ui/Logger": { logger: {} }, "@/constants/enums": enums, "./orderPayment": helpers,
}, { window: { location: { origin: "https://test.example.invalid" } } });
const { OrderPaymentSummary } = load("../../src/components/orders/OrderPaymentSummary.tsx", { "@/constants/enums": enums, "@/lib/orderPayment": helpers });
const fixture = {
  id: "order-123456789", buyer_id: null, seller_id: "seller", product_id: "product", amount: 10000,
  status: "pending_payment", payment_type: "partial_cod", payment_total: 10100, cod_fee: 100,
  advance_amount: 7070, cod_amount: 3030, advance_received_at: null, cod_collected_at: null,
  created_at: "2026-10-26T00:00:00Z", buyer_email: "buyer@example.invalid", buyer_name: "Buyer",
};
const receivedAt = "2026-10-26T01:00:00Z";
function elements(node) {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !node.props) return [];
  return [node, ...elements(node.props.children)];
}
function textOf(node) {
  if (Array.isArray(node)) return node.map(textOf).join("");
  return node && typeof node === "object" ? textOf(node.props?.children) : String(node ?? "");
}
function pageHarness(orders, failure = false) {
  const slots = [], refs = [], calls = [], emails = [], toasts = [];
  let cursor = 0, refCursor = 0;
  const fakeReact = { ...React, useEffect() {}, useCallback: cb => cb,
    useRef(initial) { const index = refCursor++; return refs[index] ??= { current: initial }; },
    useState(initial) { const index = cursor++; const slot = slots[index] ??= { value: index === 0 ? orders : index === 1 ? false : initial }; return [slot.value, value => { slot.value = typeof value === "function" ? value(slot.value) : value; }]; },
  };
  const ui = names => Object.fromEntries(names.map(name => [name, name.toLowerCase()]));
  const service = {
    async recordPartialCodPayment(id, stage) {
      calls.push({ id, stage });
      if (failure) throw new Error("Stock unavailable");
      const previous = slots[0].value.find(order => order.id === id);
      return { recorded: true, order: { ...previous, status: stage === "advance" ? "confirmed" : previous.status, advance_received_at: receivedAt, cod_collected_at: stage === "cod" ? receivedAt : null } };
    },
    async confirmPayment() { throw new Error("Partial COD used prepaid confirmation"); },
    async createTrackingToken() { return "token"; },
  };
  const modules = {
    react: fakeReact, "react-router": { Link: "a" }, "@/constants/enums": enums, "@/lib/orderPayment": helpers,
    "@/components/AdminRoute": { AdminRoute: "admin-route" }, "@/components/orders/OrderPaymentSummary": { OrderPaymentSummary },
    "@/components/ui/alert-dialog": ui(["AlertDialog", "AlertDialogAction", "AlertDialogCancel", "AlertDialogContent", "AlertDialogDescription", "AlertDialogFooter", "AlertDialogHeader", "AlertDialogTitle", "AlertDialogTrigger"]),
    "@/components/ui/dialog": ui(["Dialog", "DialogContent", "DialogHeader", "DialogTitle", "DialogDescription", "DialogFooter"]),
    "@/components/ui/button": ui(["Button"]), "@/components/ui/input": ui(["Input"]), "@/components/ui/label": ui(["Label"]),
    "@/components/ui/card": ui(["Card", "CardContent", "CardHeader", "CardTitle"]), "@/components/ui/badge": ui(["Badge"]),
    "@/contexts/AuthContext": { useAuth: () => ({ user: { id: "admin", email: "admin@example.invalid", user_metadata: {} } }) },
    "@/components/ui/OptimizedImage": { ThumbnailImage: "img" }, "@/lib/orderService": { OrderService: service },
    "@/lib/supabase": { supabase: { rpc() { throw new Error("Partial COD used legacy coupon redemption"); } }, toStorageUrl: value => value },
    "@/constants/sizeCharts": { getEuSizeFromUk() {}, sortSizes: sizes => sizes },
    sonner: { toast: Object.fromEntries(["success", "info", "error", "warning"].map(name => [name, message => toasts.push({ name, message })])) },
    "@/components/ShipNowModal": { default: "ship-modal" },
    "@/lib/emailService": { getPaymentEmailFields, EmailService: { async sendOrderConfirmationToBuyer(_email, _name, data) { emails.push(data); } } },
  };
  const module = load("../../src/pages/MyOrders.tsx", modules, { window: { location: { origin: "https://test.example.invalid" } } }, "\nexport { MyOrders };\n");
  return { render() { cursor = 0; refCursor = 0; return module.MyOrders(); }, slots, calls, emails, toasts };
}

test("summary distinguishes awaiting advance, COD outstanding and fully paid", () => {
  for (const [fields, expected] of [[{}, "Awaiting advance"], [{ advance_received_at: receivedAt }, "COD outstanding"], [{ advance_received_at: receivedAt, cod_collected_at: receivedAt }, "Fully paid"]]) {
    const html = renderToStaticMarkup(React.createElement(OrderPaymentSummary, { order: { ...fixture, ...fields } }));
    for (const text of [expected, "₹10,100", "₹7,070", "₹3,030"]) assert.ok(html.includes(text), text);
  }
  assert.equal(renderToStaticMarkup(React.createElement(OrderPaymentSummary, { order: { amount: 1000 } })), "");
});

test("incomplete partial COD data shows an error instead of inventing a paid amount", () => {
  const html = renderToStaticMarkup(React.createElement(OrderPaymentSummary, { order: { amount: 1000, payment_type: "partial_cod" } }));
  assert.ok(html.includes('role="alert"'));
  assert.ok(!html.includes("Fully paid"));
});

test("payment filter includes legacy prepaid orders and resets pagination", () => {
  const page = pageHarness([fixture, { ...fixture, id: "legacy", payment_type: undefined }]);
  let tree = page.render();
  const paginator = elements(tree).find(element => element.type?.name === "AdaptivePaginator");
  paginator.props.onPageChange(2);
  const filter = elements(tree).find(element => element.props.id === "orders-payment-type");
  filter.props.onChange({ target: { value: "partial_cod" } });
  tree = page.render();
  assert.equal(elements(tree).filter(element => element.type === "card").length, 1);
  assert.equal(elements(tree).find(element => element.type?.name === "AdaptivePaginator").props.currentPage, 1);
  filter.props.onChange({ target: { value: "prepaid" } });
  tree = page.render();
  assert.equal(elements(tree).find(element => element.type === "card").key, "legacy");
});

test("advance confirmation uses the atomic receipt RPC and emails only the advance as paid", async () => {
  const page = pageHarness([fixture]);
  const button = elements(page.render()).find(element => element.type === "button" && textOf(element).includes("Confirm advance received"));
  assert.ok(button);
  await Promise.all([button.props.onClick(), button.props.onClick()]);
  assert.equal(page.calls.length, 1);
  assert.equal(page.calls[0].stage, "advance");
  assert.equal(page.slots[0].value[0].status, "confirmed");
  assert.equal(page.slots[0].value[0].cod_collected_at, null);
  assert.equal(page.emails[0].amount, 7070);
  assert.equal(page.emails[0].payment_type, "partial_cod");
  assert.equal(page.emails[0].payment_total, 10100);
  assert.equal(page.emails[0].cod_amount, 3030);
});

test("COD collection is a separate action and updates the saved receipt", async () => {
  const page = pageHarness([{ ...fixture, status: "shipped", advance_received_at: receivedAt }]);
  const action = elements(page.render()).find(element => element.type === "alertdialogaction" && textOf(element) === "Confirm collection");
  assert.ok(action);
  await action.props.onClick();
  assert.equal(page.calls[0].stage, "cod");
  assert.equal(page.slots[0].value[0].cod_collected_at, receivedAt);
  assert.equal(page.emails.length, 0);
  assert.ok(!elements(page.render()).some(element => textOf(element) === "Mark COD collected"));
});

test("advance or stock failure leaves the order pending and sends no confirmation email", async () => {
  const page = pageHarness([fixture], true);
  const button = elements(page.render()).find(element => element.type === "button" && textOf(element).includes("Confirm advance received"));
  await button.props.onClick();
  assert.equal(page.slots[0].value[0].status, "pending_payment");
  assert.equal(page.emails.length, 0);
  assert.ok(page.toasts.some(toast => toast.name === "error" && toast.message === "Stock unavailable"));
});

test("receipt service forwards stage and rejects unverified responses", async () => {
  let request;
  const service = load("../../src/lib/orderService.ts", {
    "./supabase": { supabase: { rpc: async (name, args) => { request = { name, args }; return { data: null, error: null }; } } },
    "./emailService": {}, "@/components/ui/Logger": { logger: {} }, "./stockValidationService": {},
  }).OrderService;
  await assert.rejects(() => service.recordPartialCodPayment("order", "cod"), /could not be verified/);
  assert.equal(request.name, "record_partial_cod_payment");
  assert.equal(request.args.p_stage, "cod");
});
