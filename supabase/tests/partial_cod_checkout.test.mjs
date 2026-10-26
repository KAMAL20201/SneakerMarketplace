import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadSource(relativePath, modules = {}) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8")
    .replaceAll("import.meta.env", "({})");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => modules[name] ?? require(name), console, crypto: { randomUUID: () => "checkout-id" } });
  return exports;
}
const enums = loadSource("../../src/constants/enums.ts");
const helpers = loadSource("../../src/lib/orderPayment.ts", { "../constants/enums": enums });
const options = loadSource("../../src/components/checkout/PaymentOptions.tsx", {
  "@/constants/enums": enums, "@/lib/orderPayment": helpers,
});
const whatsapp = loadSource("../../src/lib/whatsappService.ts", { "@/constants/enums": enums });

test("payment options expose exact totals, fee and a single selected radio", () => {
  for (const value of ["prepaid", "partial_cod"]) {
    const html = renderToStaticMarkup(React.createElement(options.PaymentOptions, { amount: 10000, value, onChange() {} }));
    assert.ok(html.includes("₹7,070"));
    assert.ok(html.includes("₹3,030"));
    assert.ok(html.includes("₹100 extra"));
    assert.equal((html.match(/checked=""/g) ?? []).length, 1);
    assert.ok(html.includes(value === "partial_cod" ? "₹10,100" : "₹10,000"));
  }
});

test("fractional totals disclose round off while both payment amounts are whole rupees", () => {
  const html = renderToStaticMarkup(React.createElement(options.PaymentOptions, { amount: 10796.14, value: "partial_cod", onChange() {} }));
  assert.ok(html.includes("₹7,627"));
  assert.ok(html.includes("₹3,269"));
  assert.ok(html.includes("Round off"));
  assert.ok(html.includes("₹0.14"));
});

test("cart and Buy Now show a collapsed summary above payment options with no courier tagline", () => {
  const item = { id: "item", productId: "product", price: 10000, quantity: 1, size: "9", brand: "Test", productName: "Test shoe", shippingCharges: 0 };
  const div = ({ children }) => React.createElement("div", null, children);
  const modules = {
    react: { ...React, useState: (initial) => [initial === "shipping" ? "payment" : initial, () => {}] },
    "@/constants/enums": enums, "@/lib/orderPayment": helpers,
    "@/components/checkout/PaymentOptions": options, "./PaymentOptions": options,
    "@/components/ui/button": { Button: div },
    "@/components/ui/dialog": { Dialog: div, DialogContent: div, DialogHeader: div, DialogTitle: div },
    "@/components/Cart/steps/ShippingStep": { ShippingStep: () => null },
    "@/components/PaymentButton": { PaymentButton: () => null },
    "@/components/CouponInput": { CouponInput: () => null },
    "@/constants/sizeCharts": { formatDisplaySize: (_brand, size) => size },
    "@/contexts/CartContext": {
      COURIER_OPTIONS: [{ label: "Delhivery / BlueDart" }],
      useCart: () => ({ items: [item], totalPrice: 10000, shippingFee: 0, selectedCourier: { label: "Delhivery / BlueDart" }, discountedTotal: 10000 }),
    },
  };
  const cart = loadSource("../../src/components/Cart/steps/PaymentStep.tsx", modules).PaymentStep;
  const buyNow = loadSource("../../src/components/checkout/BuyNowModal.tsx", modules).BuyNowModal;
  for (const [component, props] of [[cart, { shippingAddress: {}, onBack() {} }], [buyNow, { open: true, onOpenChange() {}, amount: 10000, item }]]) {
    const html = renderToStaticMarkup(React.createElement(component, props));
    assert.ok(html.indexOf("Order Summary") < html.indexOf("How would you like to pay?"));
    assert.ok(html.includes("<details"));
    assert.ok(!/<details[^>]*\sopen/.test(html));
    assert.ok(!html.includes("BlueDart"));
    assert.ok(!html.includes("Delhivery"));
  }
});

test("partial COD WhatsApp message distinguishes advance from balance", () => {
  const payment = helpers.calculatePaymentBreakdown(10000, "partial_cod");
  const message = whatsapp.WhatsAppService.formatOrderMessage(["123456789"], "SAVE", 500, "Courier", payment);
  for (const text of ["70% advance", "Partial COD", "7070", "3030", "10100", "100 COD fee", "SAVE", "Courier"]) {
    assert.ok(message.includes(text), text);
  }
  assert.ok(!message.includes("completed my payment"));
});

test("partial checkout sends catalog identities and the request ID, never client prices or split", async () => {
  let request;
  const service = loadSource("../../src/lib/orderService.ts", {
    "./supabase": { supabase: { rpc: async (name, args) => { request = { name, args }; return { data: [{ id: "saved" }], error: null }; } } },
    "./emailService": {}, "@/components/ui/Logger": { logger: {} }, "./stockValidationService": {},
  }).OrderService;
  const result = await service.processPartialCodCheckout([{ productId: "product", variantId: "variant", size: "9", quantity: 2, price: 1 }], { full_name: "Buyer" }, 10000, "request-id", "SAVE");
  assert.equal(result[0].id, "saved");
  assert.equal(request.name, "create_partial_cod_checkout");
  assert.equal(request.args.p_checkout_id, "request-id");
  assert.equal(request.args.p_expected_amount, 10000);
  assert.equal(JSON.stringify(request.args.p_items), JSON.stringify([{ product_id: "product", variant_id: "variant", size: "9", quantity: 2 }]));
  assert.ok(!JSON.stringify(request.args).includes("advance_amount"));
});

test("missing migrations fail clearly without falling back to prepaid", async () => {
  const service = loadSource("../../src/lib/orderService.ts", {
    "./supabase": { supabase: { rpc: async () => ({ data: null, error: { code: "PGRST202" } }) } },
    "./emailService": {}, "@/components/ui/Logger": { logger: {} }, "./stockValidationService": {},
  }).OrderService;
  await assert.rejects(() => service.processPartialCodCheckout([], {}, 100, "request"), /Partial COD is not ready/);
});

function createPaymentHarness() {
  const states = [];
  let calls = 0;
  const fakeReact = {
    ...React,
    createContext: () => ({ Provider: "payment-provider" }),
    useState(initial) { const slot = { value: initial }; states.push(slot); return [initial, (value) => { slot.value = value; }]; },
    useRef: (value) => ({ current: value }), useCallback: (callback) => callback,
  };
  const savedOrder = { amount: 10000, id: "saved-order", payment_type: "partial_cod", payment_total: 10100, cod_fee: 100, advance_amount: 7070, cod_amount: 3030 };
  const module = loadSource("../../src/contexts/PaymentContext.tsx", {
    react: fakeReact, "@/constants/enums": enums, "@/lib/orderPayment": helpers,
    "@/components/checkout/PaymentOptions": options,
    "@/components/ui/dialog": { Dialog: "dialog", DialogContent: "div", DialogHeader: "header", DialogTitle: "h2" },
    "./AuthContext": { useAuth: () => ({ user: null }) },
    "./CartContext": { useCart: () => ({ selectedCourier: { label: "Courier" } }) },
    "react-router": { useNavigate: () => () => {} },
    sonner: { toast: { error() {}, success() {} } },
    "@/lib/whatsappService": whatsapp,
    "../lib/orderService": { OrderService: {
      processPartialCodCheckout: async () => { calls++; return [savedOrder]; },
      processWhatsAppCheckout: async (...args) => { calls++; assert.equal(args[5], 500); return [{ id: "prepaid" }]; },
    } },
  });
  const tree = module.PaymentProvider({ children: null });
  return { initiate: tree.props.value.initiatePayment, states, callCount: () => calls };
}

test("payment dialog requests saved advance and reopens without another checkout", async () => {
  const harness = createPaymentHarness();
  const args = ["INR", { type: "cart_checkout" }, [{ productId: "product", quantity: 1 }], { full_name: "Buyer" }, 10000, null, "partial_cod", 0, "Courier"];
  await harness.initiate(...args);
  const dialog = harness.states.find((slot) => slot.value?.payment)?.value;
  assert.equal(dialog.amount, 7070);
  assert.equal(dialog.payment.codAmount, 3030);
  await harness.initiate(...args);
  assert.equal(harness.callCount(), 1);
});

test("prepaid forwards coupon discount explicitly, independently of shipping", async () => {
  const harness = createPaymentHarness();
  await harness.initiate("INR", { type: "cart_checkout" }, [{ productId: "product", quantity: 1, price: 10000 }], { full_name: "Buyer" }, 9800, "SAVE", "prepaid", 500);
  const dialog = harness.states.find((slot) => slot.value?.payment)?.value;
  assert.equal(dialog.amount, 9800);
  assert.equal(dialog.discountAmount, 500);
  assert.equal(dialog.payment.codAmount, 0);
});
