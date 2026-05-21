export async function GET(request) {
  const startedAt = new Date().toISOString();
  console.log(`[cron/sync] started at ${startedAt}`);

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("[cron/sync] unauthorized — missing or invalid CRON_SECRET");
    return new Response("Unauthorized", { status: 401 });
  }

  const { createClient } = await import("@/lib/supabase/server");
  const supabase = await createClient();
  const { error } = await supabase.rpc("sync_room_statuses");

  if (error) {
    console.error("[cron/sync] sync_room_statuses failed:", error.message);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const finishedAt = new Date().toISOString();
  console.log(`[cron/sync] finished at ${finishedAt}`);

  return Response.json({ ok: true, ran: finishedAt });
}
