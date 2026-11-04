// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";

const API = "https://api-sandbox.asaas.com/v3";
const APP_URL = "https://app.webimoveis.site";

const cors = (origin: string | null) => {
  const allowed = origin && /^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(origin)
    ? origin
    : APP_URL;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Content-Type": "application/json",
    "Vary": "Origin",
  };
};

const response = (headers: Record<string,string>, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });

const addMonth = () => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() + 1);
  return date.toISOString().replace("T", " ").slice(0, 19);
};

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return response(headers, {});
  if (req.method !== "POST") return response(headers, { error: "Método não permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("ASAAS_SANDBOX_API_KEY");
  if (!url || !anon || !service) return response(headers, { error: "Serviço de contratação indisponível." }, 503);
  if (!apiKey) return response(headers, { error: "O ambiente Sandbox do Asaas ainda não foi configurado." }, 503);

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return response(headers, { error: "Entre na sua conta para contratar um plano." }, 401);

  const client = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: authData } = await client.auth.getUser(authorization.slice(7));
  const user = authData.user;
  if (!user) return response(headers, { error: "Sua sessão expirou. Entre novamente." }, 401);

  let body: { planTier?: string } = {};
  try { body = await req.json(); } catch { return response(headers, { error: "Solicitação inválida." }, 400); }
  const planTier = String(body.planTier || user.user_metadata?.selected_plan || "");
  if (!['basic','intermediate','advanced'].includes(planTier)) return response(headers, { error: "Escolha um plano válido." }, 400);

  const [{ data: profile }, { data: plan }] = await Promise.all([
    admin.from("profiles").select("id,name,email,phone,role,is_active").eq("id", user.id).single(),
    admin.from("commercial_plans").select("tier,name,description,monthly_price_cents,active").eq("tier", planTier).single(),
  ]);
  if (!profile || !profile.is_active || !['broker','agency'].includes(profile.role)) {
    return response(headers, { error: "A contratação profissional exige uma conta de corretor ou imobiliária." }, 403);
  }
  if (!plan?.active || Number(plan.monthly_price_cents) <= 0) return response(headers, { error: "Este plano não está disponível para contratação." }, 409);

  const { data: current } = await admin.from("commercial_subscriptions")
    .select("id,status,plan_tier")
    .eq("profile_id", user.id).eq("environment", "sandbox")
    .in("status", ["pending","active","past_due","suspended"])
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (current?.status === 'active' && current.plan_tier === planTier) {
    return response(headers, { active: true, message: "Este plano já está ativo na sua conta." });
  }

  const cutoff = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  const { data: reusable } = await admin.from("commercial_checkout_attempts")
    .select("id,checkout_url,asaas_checkout_id,status,expires_at")
    .eq("profile_id", user.id).eq("plan_tier", planTier).eq("environment", "sandbox")
    .in("status", ["creating","pending"]).gte("created_at", cutoff)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (reusable?.checkout_url?.startsWith("https://sandbox.asaas.com/")) {
    return response(headers, { checkoutUrl: reusable.checkout_url, reused: true });
  }
  if (reusable?.checkout_url) {
    await admin.from("commercial_checkout_attempts").update({
      status: "failed",
      failure_code: "CHECKOUT_HOST_MIGRATED",
      failure_message: "Checkout antigo apontava para o host de produção do Asaas e foi substituído pelo checkout Sandbox.",
      updated_at: new Date().toISOString(),
    }).eq("id", reusable.id);
  }

  const attemptId = crypto.randomUUID();
  const externalReference = `webimoveis:${attemptId}`;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const { error: insertError } = await admin.from("commercial_checkout_attempts").insert({
    id: attemptId,
    profile_id: user.id,
    plan_tier: planTier,
    environment: "sandbox",
    external_reference: externalReference,
    amount_cents: Number(plan.monthly_price_cents),
    status: "creating",
    expires_at: expiresAt,
  });
  if (insertError) return response(headers, { error: "Não foi possível preparar a contratação." }, 409);

  const payload = {
    billingTypes: ["CREDIT_CARD"],
    chargeTypes: ["RECURRENT"],
    minutesToExpire: 60,
    externalReference,
    callback: {
      successUrl: `${APP_URL}/?billing=success&plan=${encodeURIComponent(planTier)}`,
      cancelUrl: `${APP_URL}/?billing=canceled&plan=${encodeURIComponent(planTier)}`,
      expiredUrl: `${APP_URL}/?billing=expired&plan=${encodeURIComponent(planTier)}`,
    },
    items: [{
      name: Array.from(`Plano ${plan.name}`).slice(0, 30).join(""),
      description: plan.description,
      quantity: 1,
      value: Number(plan.monthly_price_cents) / 100,
    }],
    subscription: { cycle: "MONTHLY", nextDueDate: addMonth() },
  };

  try {
    const remote = await fetch(`${API}/checkouts`, {
      method: "POST",
      headers: {
        "access_token": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "WebImoveis/1.0",
      },
      body: JSON.stringify(payload),
    });
    const text = await remote.text();
    let result: any = {};
    try { result = text ? JSON.parse(text) : {}; } catch { result = {}; }
    if (!remote.ok || !result?.id) {
      await admin.from("commercial_checkout_attempts").update({
        status: "failed",
        failure_code: `ASAAS_HTTP_${remote.status}`,
        failure_message: String(result?.errors?.[0]?.description || result?.message || "Checkout recusado pelo provedor.").slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", attemptId);
      return response(headers, { error: "O Asaas não conseguiu iniciar o checkout. Confira os dados e tente novamente." }, 502);
    }
    // The API key is Sandbox, so the hosted checkout must use the Sandbox host too.
    // A production-hosted URL cannot resolve a checkout created in Sandbox.
    const checkoutUrl = `https://sandbox.asaas.com/checkoutSession/show?id=${encodeURIComponent(result.id)}`;
    await admin.from("commercial_checkout_attempts").update({
      asaas_checkout_id: String(result.id), checkout_url: checkoutUrl, status: "pending", updated_at: new Date().toISOString(),
    }).eq("id", attemptId);
    return response(headers, { checkoutUrl });
  } catch (error) {
    await admin.from("commercial_checkout_attempts").update({
      status: "failed", failure_code: "ASAAS_CONNECTION_ERROR",
      failure_message: String(error?.message || error).slice(0, 500), updated_at: new Date().toISOString(),
    }).eq("id", attemptId);
    return response(headers, { error: "Não foi possível conectar ao checkout do Asaas agora." }, 503);
  }
});
