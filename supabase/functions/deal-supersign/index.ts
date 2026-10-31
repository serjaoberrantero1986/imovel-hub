// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";
const API = "https://api.sandbox.supersign.com.br/v4/api";
const headers = (key: string, idem?: string) => ({
  Authorization: `Bearer ${key}`,
  "Content-Type": "application/json",
  ...(idem ? { "Idempotency-Key": idem } : {}),
});
const api = async (key: string, path: string, init: RequestInit = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...headers(
        key,
        init.method === "POST"
          ? (init.headers as any)?.["Idempotency-Key"]
          : undefined,
      ),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body: any = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }
  if (!res.ok)
    throw new Error(
      body?.error?.code || body?.code || `SUPERSIGN_HTTP_${res.status}`,
    );
  return body;
};
const hash = async (bytes: Uint8Array) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  )
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
const statusMap: Record<string, string> = {
  DRAFT: "preparing",
  PROCESSING: "uploading",
  SENT: "sent",
  IN_PROGRESS: "partially_signed",
  COMPLETED: "completed",
  DECLINED: "declined",
  EXPIRED: "expired",
  VOIDED: "voided",
};
Deno.serve(async (req) => {
  const requestOrigin = req.headers.get("Origin"),
    allowed =
      requestOrigin &&
      /^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(requestOrigin)
        ? requestOrigin
        : "https://www.webimoveis.site",
    out = (b: any, s = 200) =>
      new Response(JSON.stringify(b), {
        status: s,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowed,
          "Access-Control-Allow-Headers":
            "authorization,apikey,content-type,x-client-info",
          "Access-Control-Allow-Methods": "POST,OPTIONS",
          Vary: "Origin",
        },
      });
  if (req.method === "OPTIONS") return out({});
  try {
    const url = Deno.env.get("SUPABASE_URL"),
      anon = Deno.env.get("SUPABASE_ANON_KEY"),
      service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      key = Deno.env.get("SUPERSIGN_SANDBOX_API_KEY");
    if (!url || !anon || !service)
      return out({ error: "DEAL_SERVICE_UNAVAILABLE" }, 503);
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      return out({ error: "DEAL_AUTH_REQUIRED" }, 401);
    const client = createClient(url, anon, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
      }),
      admin = createClient(url, service, { auth: { persistSession: false } }),
      { data: u } = await client.auth.getUser(auth.slice(7));
    if (!u.user) return out({ error: "DEAL_AUTH_REQUIRED" }, 401);
    const body = await req.json();
    if (!key) return out({ error: "SUPERSIGN_SANDBOX_NOT_CONFIGURED" }, 503);
    if (body.action === "account") {
      const me = await api(key, "/me");
      const account = await api(key, "/account/entitlements");
      return out({ environment: "sandbox", me, entitlements: account });
    }
    const { data: dossier } = await admin
      .from("deal_dossiers")
      .select("id,owner_id")
      .eq("id", body.dossierId)
      .single();
    if (!dossier || dossier.owner_id !== u.user.id)
      return out({ error: "DEAL_ACCESS_DENIED" }, 403);
    if (body.action === "status") {
      const { data: e } = await admin
        .from("deal_signature_envelopes")
        .select("*")
        .eq("dossier_id", dossier.id)
        .eq("environment", "sandbox")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!e?.external_envelope_id) return out({ envelope: e || null });
      const remote = await api(key, `/envelopes/${e.external_envelope_id}`);
      const mapped =
        statusMap[String(remote.status || "").toUpperCase()] || e.status;
      await admin
        .from("deal_signature_envelopes")
        .update({
          status: mapped,
          updated_at: new Date().toISOString(),
          completed_at:
            mapped === "completed" ? new Date().toISOString() : null,
        })
        .eq("id", e.id);
      return out({ envelope: { ...e, status: mapped }, remote });
    }
    if (body.action !== "create")
      return out({ error: "DEAL_ACTION_INVALID" }, 400);
    const { data: version } = await admin
      .from("deal_contract_versions")
      .select(
        "id,version,status,contract_id,preview_pdf_path,preview_pdf_hash,deal_contracts!inner(dossier_id)",
      )
      .eq("id", body.contractVersionId)
      .single();
    if (
      !version ||
      version.deal_contracts.dossier_id !== dossier.id ||
      version.status !== "final"
    )
      return out({ error: "DEAL_FINAL_CONTRACT_REQUIRED" }, 400);
    const { data: existing } = await admin
      .from("deal_signature_envelopes")
      .select("*")
      .eq("contract_version_id", version.id)
      .eq("environment", "sandbox")
      .maybeSingle();
    if (existing?.external_envelope_id)
      return out({ envelope: existing, reused: true });
    const { data: parts } = await admin
      .from("deal_participants")
      .select("id,name,email,role")
      .eq("dossier_id", dossier.id)
      .in("role", [
        "owner",
        "co_owner",
        "buyer",
        "tenant",
        "spouse",
        "representative",
      ])
      .neq("status", "inactive")
      .order("created_at");
    if (!parts?.length || parts.some((p) => !p.email))
      return out({ error: "DEAL_SIGNERS_EMAIL_REQUIRED" }, 400);
    const signers = parts.map((p, i) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      order: i + 1,
      qualification:
        p.role === "owner" || p.role === "co_owner"
          ? "Cedente/Vendedor"
          : p.role === "buyer"
            ? "Cessionário/Comprador"
            : p.role === "tenant"
              ? "Locatário"
              : p.role === "spouse"
                ? "Cônjuge anuente"
                : "Interveniente",
    }));
    if (!version.preview_pdf_path || !version.preview_pdf_hash)
      return out({ error: "DEAL_CONTRACT_PREVIEW_REQUIRED" }, 400);
    const { data: preview, error: previewError } = await admin.storage
      .from("deal-contracts")
      .download(version.preview_pdf_path);
    if (previewError || !preview)
      return out({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
    const bytes = new Uint8Array(await preview.arrayBuffer());
    if ((await hash(bytes)) !== version.preview_pdf_hash)
      return out({ error: "DEAL_CONTRACT_PREVIEW_MISMATCH" }, 409);
    const idem = `webimoveis-${version.id}-sandbox-v2`;
    let local = existing;
    if (!local) {
      const { data } = await admin
        .from("deal_signature_envelopes")
        .insert({
          dossier_id: dossier.id,
          contract_version_id: version.id,
          environment: "sandbox",
          idempotency_key: idem,
          created_by: u.user.id,
        })
        .select()
        .single();
      local = data;
    }
    const payload = {
      title: `Contrato imobiliário - versão ${version.version}`,
      message:
        "Documento aprovado por todas as partes no Web Imóveis. Assine eletronicamente.",
      documents: [
        {
          ref: "contrato",
          filename: `contrato-versao-${version.version}.pdf`,
          contentType: "application/pdf",
          fileSize: bytes.byteLength,
        },
      ],
      signatories: signers.map((s, i) => ({
        ref: `signer-${i + 1}`,
        deliveryMethod: "EMAIL",
        locale: "pt-BR",
        name: s.name,
        email: s.email,
        qualification: s.qualification,
        order: s.order,
        type: "INDIVIDUAL",
      })),
      fields: signers.map((s, i) => ({
        documentRef: "contrato",
        signatoryRef: `signer-${i + 1}`,
        type: "SIGNATURE",
        anchor: { text: `\\assinatura-${s.id}\\`, offset: { x: 0, y: -38 } },
        size: { width: 180, height: 50 },
        properties: {},
      })),
    };
    const created = await api(key, "/envelopes/send-now", {
      method: "POST",
      headers: { "Idempotency-Key": idem },
      body: JSON.stringify(payload),
    });
    const envelopeId = created.envelopeId || created.id || created.envelope?.id,
      upload =
        created.uploadDetails?.[0] ||
        created.documents?.[0] ||
        created.uploads?.[0];
    if (!envelopeId || !upload?.uploadUrl)
      throw new Error("SUPERSIGN_UPLOAD_DATA_MISSING");
    let uploaded: Response;
    if (upload.uploadFields) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(upload.uploadFields))
        fd.append(k, String(v));
      fd.append(
        "file",
        new Blob([bytes], { type: "application/pdf" }),
        `contrato-versao-${version.version}.pdf`,
      );
      uploaded = await fetch(upload.uploadUrl, { method: "POST", body: fd });
    } else {
      uploaded = await fetch(upload.uploadUrl, {
        method: "PUT",
        headers: Object.fromEntries(
          Object.entries(upload.uploadHeaders || {}).map(([k, v]) => [
            k,
            String(v),
          ]),
        ),
        body: bytes,
      });
    }
    if (!uploaded.ok) throw new Error("SUPERSIGN_UPLOAD_FAILED");
    await admin
      .from("deal_signature_envelopes")
      .update({
        external_envelope_id: envelopeId,
        document_id: upload.documentId || null,
        status: "uploading",
        updated_at: new Date().toISOString(),
      })
      .eq("id", local.id);
    await admin
      .from("deal_signature_participants")
      .insert(
        signers.map((s) => ({
          envelope_id: local.id,
          deal_participant_id: s.id,
          external_participant_id: s.id,
          signing_order: s.order,
          qualification: s.qualification,
        })),
      );
    await admin
      .from("deal_audit_events")
      .insert({
        dossier_id: dossier.id,
        actor_profile_id: u.user.id,
        actor_label: "Profissional responsável",
        event_type: "signature_envelope_created",
        entity_type: "signature_envelope",
        entity_id: local.id,
        description: "Envelope de assinatura criado no Sandbox da SuperSign.",
        metadata: {
          environment: "sandbox",
          external_envelope_id: envelopeId,
          contract_version: version.version,
        },
      });
    return out({
      envelope: {
        ...local,
        external_envelope_id: envelopeId,
        status: "uploading",
      },
      reused: false,
    });
  } catch (e) {
    return out(
      { error: String(e?.message || "DEAL_SERVICE_UNAVAILABLE") },
      400,
    );
  }
});
