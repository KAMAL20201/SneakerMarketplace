import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }
  const schedulerToken = request.headers.get("x-scheduler-token");
  if (!schedulerToken || schedulerToken.length < 32) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Scheduler unavailable" }, { status: 503 });
  }
  try {
    const result = await fetch(`${supabaseUrl}/rest/v1/rpc/process_due_price_changes`, {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_scheduler_token: schedulerToken }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!result.ok) {
      const error: { code?: string } = await result.json();
      const unauthorized = error.code === "28000";
      return Response.json(
        { error: unauthorized ? "Unauthorized" : "Price scheduler failed" },
        { status: unauthorized ? 401 : 500 },
      );
    }
    return Response.json(await result.json());
  } catch {
    return Response.json({ error: "Price scheduler failed" }, { status: 500 });
  }
});
