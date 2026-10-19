import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import test from "node:test";
import ts from "typescript";

const source = fs.readFileSync(new URL("../functions/process-price-changes/index.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function createWorker({ configured = true, rpcStatus = 200, rpcBody = { applied: 2, failed: 0 }, networkFailure = false } = {}) {
  let handler;
  const requests = [];
  vm.runInNewContext(outputText, {
    exports: {}, require: () => ({}), Request, Response, AbortSignal,
    Deno: {
      serve: (callback) => { handler = callback; },
      env: { get: (name) => configured ? ({ SUPABASE_URL: "https://example.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "test-service-key" })[name] : undefined },
    },
    fetch: async (url, options) => {
      requests.push({ url, options });
      if (networkFailure) throw new Error("Network unavailable");
      return Response.json(rpcBody, { status: rpcStatus });
    },
  });
  return { handle: (request) => handler(request), requests };
}

const cronRequest = () => new Request("https://example.supabase.co/functions/v1/process-price-changes", {
  method: "POST", headers: { "x-scheduler-token": "t".repeat(64) },
});

test("rejects unsupported methods and missing credentials before contacting the database", async () => {
  const worker = createWorker();
  assert.equal((await worker.handle(new Request("https://example.test"))).status, 405);
  assert.equal((await worker.handle(new Request("https://example.test", { method: "POST" }))).status, 401);
  assert.equal(worker.requests.length, 0);
});

test("returns unavailable when server configuration is missing", async () => {
  const worker = createWorker({ configured: false });
  assert.equal((await worker.handle(cronRequest())).status, 503);
  assert.equal(worker.requests.length, 0);
});

test("forwards the Cron token to the restricted RPC and reports application counts", async () => {
  const worker = createWorker();
  const response = await worker.handle(cronRequest());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { applied: 2, failed: 0 });
  const [{ url, options }] = worker.requests;
  assert.equal(url, "https://example.supabase.co/rest/v1/rpc/process_due_price_changes");
  assert.equal(options.headers.Authorization, "Bearer test-service-key");
  assert.equal(JSON.parse(options.body).p_scheduler_token, "t".repeat(64));
});

test("rejects an invalid Vault token without exposing database details", async () => {
  const worker = createWorker({ rpcStatus: 403, rpcBody: { code: "28000", message: "Internal details" } });
  const response = await worker.handle(cronRequest());
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("database and network failures return an error instead of reporting success", async () => {
  for (const options of [{ rpcStatus: 500, rpcBody: { code: "XX000" } }, { networkFailure: true }]) {
    const response = await createWorker(options).handle(cronRequest());
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: "Price scheduler failed" });
  }
});
