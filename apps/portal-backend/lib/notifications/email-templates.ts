import "server-only";

import { getServerEnv } from "@/lib/config/env";

type NotificationTemplateRecord = {
  template_key: string;
  subject: string;
  payload: Record<string, unknown> | null;
};

type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildPortalUrl(path: string) {
  const env = getServerEnv();
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}

function buildMessageLayout(input: {
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  footer?: string;
}) {
  const footer =
    input.footer ||
    "Se precisar revisar mais detalhes, acesse o portal juridico com o seu e-mail e senha.";
  const html = `
    <div style="background:#f5f1ea;padding:32px 16px;font-family:Georgia,'Times New Roman',serif;color:#10201d;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:28px;padding:32px;border:1px solid rgba(16,32,29,0.08);box-shadow:0 24px 64px rgba(16,32,29,0.08);">
        <div style="display:inline-block;padding:8px 12px;border-radius:999px;background:rgba(142,106,59,0.08);color:#6f512c;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
          ${escapeHtml(input.eyebrow)}
        </div>
        <h1 style="margin:16px 0 12px;font-size:32px;line-height:1;">${escapeHtml(input.title)}</h1>
        <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#4f625d;">${escapeHtml(
          input.intro
        )}</p>
        <div style="padding:18px 20px;border-radius:20px;background:#f8f4ee;border:1px solid rgba(16,32,29,0.08);font-size:15px;line-height:1.7;">
          ${escapeHtml(input.body)}
        </div>
        <div style="margin-top:24px;">
          <a href="${escapeHtml(
            input.ctaHref
          )}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:linear-gradient(135deg,#8e6a3b,#6f512c);color:#fffaf2;text-decoration:none;font-weight:700;">
            ${escapeHtml(input.ctaLabel)}
          </a>
        </div>
        <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#4f625d;">${escapeHtml(
          footer
        )}</p>
      </div>
    </div>
  `.trim();
  const text = [
    input.eyebrow,
    input.title,
    "",
    input.intro,
    "",
    input.body,
    "",
    `${input.ctaLabel}: ${input.ctaHref}`,
    "",
    footer
  ].join("\n");

  return {
    html,
    text
  };
}

function renderInviteTrackingEmail(record: NotificationTemplateRecord) {
  const payload = record.payload || {};
  const fullName = asString(payload.fullName, "Cliente");
  const caseAreaLabel = asString(payload.caseAreaLabel, "seu atendimento");

  const layout = buildMessageLayout({
    eyebrow: "Portal juridico",
    title: "Seu acesso inicial ja foi preparado",
    intro: `O convite principal do portal foi emitido pela equipe para ${fullName}.`,
    body: `Assim que voce concluir o primeiro acesso, o acompanhamento do ${caseAreaLabel} aparecera em um painel claro, com documentos, agenda e atualizacoes.`,
    ctaLabel: "Abrir portal",
    ctaHref: buildPortalUrl("/auth/login"),
    footer:
      "Este registro existe para acompanhar o onboarding no portal. O link oficial de primeiro acesso continua sendo o convite emitido pelo Supabase Auth."
  });

  return {
    subject: record.subject,
    ...layout
  };
}

function renderCaseEventEmail(record: NotificationTemplateRecord) {
  const payload = record.payload || {};
  const title = asString(payload.title, "Nova movimentacao no portal");
  const publicSummary = asString(
    payload.publicSummary,
    "A equipe registrou uma nova movimentacao no seu caso."
  );
  const eventLabel = asString(payload.eventLabel, "Atualizacao");
  const templateToAction: Record<string, { label: string; href: string }> = {
    "new-document": { label: "Ver documentos", href: "/documentos" },
    "document-request": { label: "Revisar documentos", href: "/documentos#solicitacoes-abertas" },
    "new-appointment": { label: "Abrir agenda", href: "/agenda" },
    "appointment-updated": { label: "Abrir agenda", href: "/agenda" },
    "appointment-rescheduled": { label: "Abrir agenda", href: "/agenda" },
    "appointment-cancelled": { label: "Abrir agenda", href: "/agenda" },
    "status-change": { label: "Abrir meu painel", href: "/cliente" },
    "case-update": { label: "Abrir meu painel", href: "/cliente#historico-atualizacoes" }
  };
  const action =
    templateToAction[record.template_key] || { label: "Abrir meu painel", href: "/cliente" };
  const layout = buildMessageLayout({
    eyebrow: eventLabel,
    title,
    intro: "Uma nova informacao foi registrada pela equipe e ja esta disponivel no portal.",
    body: publicSummary,
    ctaLabel: action.label,
    ctaHref: buildPortalUrl(action.href)
  });

  return {
    subject: record.subject,
    ...layout
  };
}

export function renderNotificationEmail(record: NotificationTemplateRecord): RenderedEmail {
  switch (record.template_key) {
    case "client-invite":
      return renderInviteTrackingEmail(record);
    case "case-update":
    case "new-document":
    case "new-appointment":
    case "appointment-updated":
    case "appointment-rescheduled":
    case "appointment-cancelled":
    case "document-request":
    case "status-change":
      return renderCaseEventEmail(record);
    default: {
      const layout = buildMessageLayout({
        eyebrow: "Portal juridico",
        title: record.subject,
        intro: "Uma nova notificacao foi preparada para o seu atendimento.",
        body: "A equipe registrou uma nova movimentacao no portal. Entre para ver os detalhes.",
        ctaLabel: "Abrir portal",
        ctaHref: buildPortalUrl("/cliente")
      });
      return {
        subject: record.subject,
        ...layout
      };
    }
  }
}
