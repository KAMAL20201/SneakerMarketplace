import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
function loadSource(relativePath, modules = {}) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => modules[name] ?? require(name) });
  return exports;
}

const enums = loadSource("../../src/constants/enums.ts");
const { calculatePaymentBreakdown, getOrderPaymentBreakdown } = loadSource("../../src/lib/orderPayment.ts", {
  "../constants/enums": enums,
});
const { PAYMENT_TYPES } = enums;

test("prepaid remains the default, with no COD fee or balance", () => {
  const result = calculatePaymentBreakdown(10000);
  assert.equal(result.paymentType, PAYMENT_TYPES.PREPAID);
  assert.equal(result.codFee, 0);
  assert.equal(result.totalAmount, 10000);
  assert.equal(result.advanceAmount, 10000);
  assert.equal(result.codAmount, 0);
});

test("adds the fee before splitting the total 70/30", () => {
  const result = calculatePaymentBreakdown(10000, PAYMENT_TYPES.PARTIAL_COD);
  assert.equal(result.totalAmount, 10100);
  assert.equal(result.advanceAmount, 7070);
  assert.equal(result.codAmount, 3030);
});

test("uses the final amount after coupons and shipping, with one checkout fee", () => {
  const finalAmount = 4500 + 5500 - 1000 + 250;
  const result = calculatePaymentBreakdown(finalAmount, PAYMENT_TYPES.PARTIAL_COD);
  assert.equal(result.codFee, 100);
  assert.equal(result.totalAmount, 9350);
  assert.equal(result.advanceAmount, 6545);
  assert.equal(result.codAmount, 2805);
});

test("rounds the partial COD total and both payments to whole rupees", () => {
  const result = calculatePaymentBreakdown(999.99, PAYMENT_TYPES.PARTIAL_COD);
  assert.equal(result.advanceAmount, 770);
  assert.equal(result.codAmount, 330);
  for (let paise = 0; paise < 20000; paise++) {
    const split = calculatePaymentBreakdown(paise / 100, PAYMENT_TYPES.PARTIAL_COD);
    assert.equal(Math.round(split.advanceAmount * 100) + Math.round(split.codAmount * 100), Math.round((paise + 10000) / 100) * 100);
    assert.ok(Number.isInteger(split.advanceAmount));
    assert.ok(Number.isInteger(split.codAmount));
  }
});

test("handles zero and fractional rupees consistently", () => {
  assert.equal(calculatePaymentBreakdown(0).totalAmount, 0);
  assert.equal(calculatePaymentBreakdown(0, PAYMENT_TYPES.PARTIAL_COD).advanceAmount, 70);
  assert.equal(calculatePaymentBreakdown(0.1 + 0.2).advanceAmount, 0.3);
});

test("rejects negative, non-finite, and unsafe amounts", () => {
  for (const amount of [-1, -0.001, NaN, Infinity, -Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.throws(() => calculatePaymentBreakdown(amount));
  }
});

test("rejects unsupported payment types at runtime", () => {
  assert.throws(() => calculatePaymentBreakdown(1000, "cod"));
});

test("legacy orders are prepaid without assuming payment was received", () => {
  const result = getOrderPaymentBreakdown({ amount: 1200 });
  assert.equal(result.paymentType, PAYMENT_TYPES.PREPAID);
  assert.equal(result.advanceAmount, 1200);
  assert.equal(result.codAmount, 0);
});

test("reads allocated order snapshots without adding another fee", () => {
  const result = getOrderPaymentBreakdown({
    amount: 5000, payment_type: PAYMENT_TYPES.PARTIAL_COD,
    payment_total: 5050, cod_fee: 50, advance_amount: 3535, cod_amount: 1515,
  });
  assert.equal(result.codFee, 50);
  assert.equal(result.totalAmount, 5050);
});

test("rejects missing or inconsistent partial COD snapshots", () => {
  assert.throws(() => getOrderPaymentBreakdown({ amount: 1000, payment_type: PAYMENT_TYPES.PARTIAL_COD }));
  assert.throws(() => getOrderPaymentBreakdown({
    amount: 1000, payment_type: PAYMENT_TYPES.PARTIAL_COD,
    payment_total: 1100, cod_fee: 100, advance_amount: 700, cod_amount: 300,
  }));
});
