import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
const require = createRequire(import.meta.url);
function load(path, modules = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: name => modules[name] ?? require(name) });
  return exports;
}
const enums = load('../../src/constants/enums.ts');
const helpers = load('../../src/lib/orderPayment.ts', { '../constants/enums': enums });
const { OrderPaymentSummary } = load('../../src/components/orders/OrderPaymentSummary.tsx', { '@/constants/enums': enums, '@/lib/orderPayment': helpers });
export const trackingFixture = { order_id: 'a1234567-0000-0000-0000-000000000001', order_status: 'pending_payment', product_title: 'Test sneaker', product_brand: 'Nike', amount: 10000, order_created_at: '2026-10-26T00:00:00Z', payment_type: 'partial_cod', payment_total: 10100, advance_amount: 7070, cod_amount: 3030, cod_fee: 100, checkout_id: 'f1234567-0000-0000-0000-000000000001' };
export function renderTrackedOrder(order) {
  let index = 0;
  const { default: TrackOrder } = load('../../src/pages/TrackOrder.tsx', {
    react: { ...React, useEffect() {}, useState(initial) { const slot = index++; return [slot === 0 ? order : slot === 1 ? false : initial, () => {}]; } },
    'react-router': { useSearchParams: () => [new URLSearchParams(), () => {}], Link: ({ to, children, ...props }) => React.createElement('a', { href: to, ...props }, children) },
    '@/lib/supabase': { supabase: { rpc() { throw new Error('Unexpected payment refetch'); } }, toStorageUrl: value => value },
    '@/components/ui/OptimizedImage': { ThumbnailImage: props => React.createElement('img', props) },
    '@/constants/sizeCharts': { getEuSizeFromUk: () => null },
    '@/components/ui/button': { Button: props => React.createElement('button', props) },
    '@/components/ui/input': { Input: props => React.createElement('input', props) },
    '@/constants/enums': enums,
    '@/components/orders/OrderPaymentSummary': { OrderPaymentSummary },
  });
  return renderToStaticMarkup(React.createElement(TrackOrder));
}
test('pending customer sees saved fee and split awaiting verification', () => {
  const html = renderTrackedOrder(trackingFixture);
  for (const text of ['Partial COD', 'Awaiting advance', '₹10,100', '₹7,070', '₹3,030', '₹100', 'pending payment', 'Already transferred your advance?']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('Fully paid'));
});
test('confirmed, shipped and delivered do not imply COD collection', () => {
  for (const order_status of ['confirmed', 'shipped', 'delivered']) {
    const html = renderTrackedOrder({ ...trackingFixture, order_status, advance_received_at: '2026-10-26T01:00:00Z' });
    assert.ok(html.includes('Advance received · COD outstanding'));
    assert.ok(!html.includes('Fully paid'));
    assert.ok(html.includes('until COD collection is recorded'));
  }
});
test('recorded COD collection displays fully paid', () => {
  const html = renderTrackedOrder({ ...trackingFixture, order_status: 'delivered', advance_received_at: '2026-10-26T01:00:00Z', cod_collected_at: '2026-10-26T02:00:00Z' });
  assert.ok(html.includes('Fully paid'));
  assert.ok(html.includes('Collected'));
  assert.ok(!html.includes('until COD collection is recorded'));
});
test('legacy prepaid retains its total and has no COD messaging', () => {
  const html = renderTrackedOrder({ order_id: trackingFixture.order_id, order_status: 'confirmed', product_title: 'Prepaid sneaker', amount: 1000, order_created_at: trackingFixture.order_created_at });
  assert.ok(html.includes('₹1,000'));
  assert.ok(!html.includes('Partial COD'));
  assert.ok(!html.includes('COD balance'));
});
