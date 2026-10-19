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
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, {
    exports, require: (name) => modules[name] ?? require(name),
  });
  return exports;
}

const helpers = loadSource("../../src/lib/priceNotice.ts");
const { default: Banner } = loadSource("../../src/components/PriceUpdateBanner.tsx", { "@/lib/priceNotice": helpers });
const notice = { previous_price: 999, new_price: 1299, effective_at: "2026-10-22T18:30:00Z" };
const render = (value, brand = "Dynafish") => renderToStaticMarkup(React.createElement(Banner, { notice: value, brand }));

test("renders the saved increase for the insoles without a product-specific restriction", () => {
  const html = render(notice);
  for (const text of ["₹999", "₹1,299", "23 October", "12:00 am", "IST", "China", "sorry"]) {
    assert.ok(html.includes(text), `Expected ${text}`);
  }
});

test("saved price/date edits flow into the strip", () => {
  const html = render({ ...notice, new_price: 1499, effective_at: "2026-10-24T04:00:00Z" });
  for (const text of ["₹1,499", "24 October", "9:30 am"]) assert.ok(html.includes(text));
  assert.ok(!html.includes("₹1,299"));
});

test("works for any other brand without attributing Dynafish's reason to it", () => {
  const html = render(notice, "Qiaodan");
  assert.ok(html.includes("₹1,299"));
  assert.ok(html.includes("sorry"));
  assert.ok(!html.includes("Dynafish"));
  assert.ok(!html.includes("China"));
});

test("hides when no notice remains after cancellation or failure", () => {
  assert.equal(render(null), "");
  assert.equal(render(undefined), "");
});

test("hides price decreases, unchanged prices and malformed notices", () => {
  for (const value of [
    {}, "invalid", { ...notice, new_price: 999 }, { ...notice, new_price: 899 },
    { ...notice, new_price: Infinity }, { ...notice, previous_price: -1 },
    { ...notice, effective_at: "invalid" }, { ...notice, new_price: "1299" },
  ]) assert.equal(render(value), "");
});
