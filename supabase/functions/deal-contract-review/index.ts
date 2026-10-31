// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.112.4";
import { buildDealContractPdf } from "../_shared/deal-contract-pdf.ts";
const origin = (o: string | null) =>
  o && /^https:\/\/([a-z0-9-]+\.)?webimoveis\.site$/i.test(o)
    ? o
    : "https://www.webimoveis.site";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ] || c,
  );
const hash = async (bytes: Uint8Array) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
Deno.serve(async (req) => {
  const o = origin(req.headers.get("Origin")),
    headers = {
      "Access-Control-Allow-Origin": o,
      "Access-Control-Allow-Headers":
        "authorization,apikey,content-type,x-client-info",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Content-Type": "application/json",
      Vary: "Origin",
    },
    reply = (b: any, s = 200) =>
      new Response(JSON.stringify(b), { status: s, headers });
  if (req.method === "OPTIONS") return reply({});
  try {
    const url = Deno.env.get("SUPABASE_URL"),
      anon = Deno.env.get("SUPABASE_ANON_KEY"),
      service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !anon || !service)
      return reply({ error: "DEAL_SERVICE_UNAVAILABLE" }, 503);
    const body = await req.json(),
      admin = createClient(url, service, { auth: { persistSession: false } });
    if (body.action === "view") {
      const { data, error } = await admin.rpc("get_public_contract_review", {
        p_token: String(body.token || ""),
      });
      if (error) return reply({ error: "DEAL_LINK_INVALID" }, 404);
      const { data: signed, error: se } = await admin.storage
        .from("deal-contracts")
        .createSignedUrl(data.pdf_path, 900);
      if (se) return reply({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
      delete data.pdf_path;
      return reply({ ...data, pdf_url: signed.signedUrl });
    }
    if (body.action === "submit") {
      const { data, error } = await admin.rpc("submit_public_contract_review", {
        p_token: String(body.token || ""),
        p_decision: body.decision,
        p_comment: body.comment || null,
        p_annotations: body.annotations || [],
      });
      if (error)
        return reply(
          {
            error: /DEAL_[A-Z_]+/.test(error.message)
              ? error.message
              : "DEAL_REVIEW_INVALID",
          },
          400,
        );
      return reply(data);
    }
    if (!["preview", "create"].includes(body.action))
      return reply({ error: "DEAL_ACTION_INVALID" }, 400);
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer "))
      return reply({ error: "DEAL_AUTH_REQUIRED" }, 401);
    const client = createClient(url, anon, {
        global: { headers: { Authorization: auth } },
        auth: { persistSession: false },
      }),
      token = auth.slice(7);
    const { data: u, error: ue } = await client.auth.getUser(token);
    if (ue || !u.user) return reply({ error: "DEAL_AUTH_REQUIRED" }, 401);
    const { data: version, error: ve } = await admin
      .from("deal_contract_versions")
      .select(
        "id,version,status,content,content_hash,preview_pdf_path,preview_pdf_hash,preview_generated_at,deal_contracts!inner(dossier_id,created_by)",
      )
      .eq("id", body.contractVersionId)
      .single();
    if (ve || version.deal_contracts.created_by !== u.user.id)
      return reply({ error: "DEAL_ACCESS_DENIED" }, 403);
    if (body.action === "preview") {
      let path = version.preview_pdf_path,
        digest = version.preview_pdf_hash,
        generatedAt = version.preview_generated_at;
      if (!path?.endsWith("-compositor-v2.pdf") || !digest) {
        const bytes = await buildDealContractPdf(version.content);
        digest = await hash(bytes);
        path = `${version.deal_contracts.dossier_id}/${version.id}-${version.content_hash}-compositor-v2.pdf`;
        const { error: up } = await admin.storage
          .from("deal-contracts")
          .upload(path, bytes, {
            contentType: "application/pdf",
            upsert: false,
          });
        if (up) {
          const { data: stored, error: down } = await admin.storage
            .from("deal-contracts")
            .download(path);
          if (
            down ||
            !stored ||
            (await hash(new Uint8Array(await stored.arrayBuffer()))) !== digest
          )
            return reply({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
        }
        generatedAt = new Date().toISOString();
        const { error: saved } = await admin
          .from("deal_contract_versions")
          .update({
            preview_pdf_path: path,
            preview_pdf_hash: digest,
            preview_generated_at: generatedAt,
          })
          .eq("id", version.id);
        if (saved) return reply({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
        await admin
          .from("deal_audit_events")
          .insert({
            dossier_id: version.deal_contracts.dossier_id,
            actor_profile_id: u.user.id,
            actor_label: "Profissional responsável",
            event_type: "contract_preview_generated",
            entity_type: "contract_version",
            entity_id: version.id,
            description:
              "Prévia integral humanizada do contrato gerada antes do envio.",
            metadata: {
              version: version.version,
              pdf_hash: digest,
              content_hash: version.content_hash,
              composer_version: 2,
            },
          });
      }
      const { data: signed, error: se } = await admin.storage
        .from("deal-contracts")
        .createSignedUrl(path, 900);
      if (se || !signed?.signedUrl)
        return reply({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
      return reply({ url: signed.signedUrl, pdfHash: digest, generatedAt });
    }
    if (version.status !== "ready")
      return reply({ error: "DEAL_CONTRACT_NOT_READY" }, 400);
    if (!version.preview_pdf_path || !version.preview_pdf_hash)
      return reply({ error: "DEAL_CONTRACT_PREVIEW_REQUIRED" }, 400);
    const { data: stored, error: down } = await admin.storage
      .from("deal-contracts")
      .download(version.preview_pdf_path);
    if (down || !stored) return reply({ error: "DEAL_PDF_UNAVAILABLE" }, 503);
    const storedHash = await hash(new Uint8Array(await stored.arrayBuffer()));
    if (storedHash !== version.preview_pdf_hash)
      return reply({ error: "DEAL_CONTRACT_PREVIEW_MISMATCH" }, 409);
    const { data: prepared, error: pe } = await admin.rpc(
      "prepare_contract_review",
      {
        p_actor: u.user.id,
        p_contract_version_id: version.id,
        p_pdf_path: version.preview_pdf_path,
        p_pdf_hash: version.preview_pdf_hash,
        p_participant_ids: Array.isArray(body.participantIds)
          ? body.participantIds.map(String)
          : [],
        p_valid_days: Number(body.validDays || 10),
      },
    );
    if (pe)
      return reply(
        {
          error: /DEAL_[A-Z_]+/.test(pe.message)
            ? pe.message
            : "DEAL_REVIEW_FAILED",
        },
        400,
      );
    const key = Deno.env.get("RESEND_API_KEY"),
      from =
        Deno.env.get("DOCUMENT_REQUEST_FROM_EMAIL") ||
        Deno.env.get("PARTNERSHIP_OTP_FROM_EMAIL");
    if (!key || !from) return reply({ error: "DEAL_EMAIL_UNAVAILABLE" }, 503);
    const sends = await Promise.allSettled(
      prepared.reviewers.map(async (r: any) => {
        const link = `${o}/#contract_review=${r.token}`,
          html = `<div style="font-family:Arial;max-width:560px;margin:auto;padding:28px"><h1 style="color:#e00038">Revisão da minuta</h1><p>Olá, ${esc(r.name)}.</p><p>A versão ${prepared.version} da minuta está disponível para sua análise.</p><p><a href="${esc(link)}" style="display:inline-block;background:#e00038;color:white;padding:14px 20px;border-radius:12px;text-decoration:none;font-weight:bold">Revisar minuta</a></p><p style="color:#64748b;font-size:12px">O link é pessoal. Não o encaminhe.</p></div>`;
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `contract-review-${prepared.round_id}-${r.reviewer_id}`,
          },
          body: JSON.stringify({
            from,
            to: [r.email],
            subject: `Minuta disponível para revisão — versão ${prepared.version}`,
            html,
          }),
        });
        if (!res.ok) throw new Error("email");
      }),
    );
    const failed = sends.filter((x) => x.status === "rejected").length;
    return reply({
      roundId: prepared.round_id,
      reviewers: prepared.reviewers.length,
      failed,
    });
  } catch (e) {
    return reply({ error: "DEAL_SERVICE_UNAVAILABLE" }, 503);
  }
});
