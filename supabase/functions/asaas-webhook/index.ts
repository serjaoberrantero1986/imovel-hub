// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  return difference === 0;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const url = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const webhookToken = Deno.env.get("ASAAS_SANDBOX_WEBHOOK_TOKEN") || "";
  if (!url || !service || webhookToken.length < 32) return new Response("unavailable", { status: 503 });
  const receivedToken = req.headers.get("asaas-access-token") || "";
  if (!safeEqual(receivedToken, webhookToken)) return new Response("unauthorized", { status: 401 });

  let event: any;
  try { event = await req.json(); } catch { return new Response("invalid json", { status: 400 }); }
  const eventId = String(event?.id || "");
  const eventType = String(event?.event || "");
  if (!eventId || !eventType) return new Response("invalid event", { status: 400 });

  const resource = event.checkout ? ["checkout", event.checkout] : event.subscription ? ["subscription", event.subscription] : event.payment ? ["payment", event.payment] : [null, null];
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { error: insertError } = await admin.from("asaas_webhook_events").insert({
    provider_event_id: eventId,
    environment: "sandbox",
    event_type: eventType,
    resource_type: resource[0],
    external_resource_id: resource[1]?.id ? String(resource[1].id) : null,
    payload: event,
  });
  if (insertError && insertError.code !== "23505") return new Response("storage failure", { status: 500 });

  try {
    const { error } = await admin.rpc("process_asaas_billing_event", { p_event_id: eventId });
    if (error) throw error;
    return new Response(insertError?.code === "23505" ? "duplicate" : "ok", { status: 200 });
  } catch (error) {
    console.error("Asaas event processing failed", eventId, error?.message || error);
    return new Response("processing failure", { status: 500 });
  }
});
