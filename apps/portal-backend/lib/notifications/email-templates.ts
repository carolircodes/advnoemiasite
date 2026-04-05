import "server-only";

import { CLIENT_LOGIN_PATH } from "@/lib/auth/access-control";
import { getServerEnv } from "@/lib/config/env";
import type { ClientTier } from "@/lib/domain/portal";

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------

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

type MetadataEntry = {
  label: string;
  value: string;
};

type EmailLayoutInput = {
  tier: ClientTier;
  eyebrow: string;
  title: string;
  intro: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  metadata?: MetadataEntry[];
  footer?: string;
};

type TierConfig = {
  headerBg: string;
  monogramBorder: string;
  monogramColor: string;
  officeNameColor: string;
  subtitleColor: string;
  hairlineColor: string;
  badgeText: string;
  badgeBg: string;
  badgeBorder: string;
  badgeColor: string;
  eyebrowColor: string;
  panelBorderColor: string;
  panelBg: string;
  ctaBg: string;
  ctaColor: string;
  ctaBorder: string;
  topBand: string | null;
  isVip: boolean;
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

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

function getReplyTo() {
  const env = getServerEnv();
  return env.NOTIFICATIONS_REPLY_TO || "contato@advnoemia.com.br";
}

// ---------------------------------------------------------------------------
// Configuração visual por tier
// ---------------------------------------------------------------------------

function getTierConfig(tier: ClientTier): TierConfig {
  switch (tier) {
    // NOVO CLIENTE — Verde-floresta profundo, ouro aquecido, sensação de boas-vindas exclusivas
    case "novo-cliente":
      return {
        headerBg: "#091a10",
        monogramBorder: "rgba(200,169,107,0.55)",
        monogramColor: "#c8a96b",
        officeNameColor: "#e8d5a8",
        subtitleColor: "rgba(248,243,234,0.38)",
        hairlineColor: "rgba(200,169,107,0.45)",
        badgeText: "Acesso preparado",
        badgeBg: "rgba(200,169,107,0.12)",
        badgeBorder: "rgba(200,169,107,0.4)",
        badgeColor: "#c8a96b",
        eyebrowColor: "#7a5a18",
        panelBorderColor: "#c8a96b",
        panelBg: "#faf7f1",
        ctaBg: "linear-gradient(135deg,#0d2419 0%,#1a3d2e 100%)",
        ctaColor: "#ead7af",
        ctaBorder: "rgba(200,169,107,0.4)",
        topBand: "linear-gradient(90deg, #7a5008 0%, #c8a96b 35%, #ead7af 50%, #c8a96b 65%, #7a5008 100%)",
        isVip: false
      };

    // EM ANDAMENTO — Verde institucional, mint suave, solidez profissional
    case "em-andamento":
      return {
        headerBg: "#0d2419",
        monogramBorder: "rgba(159,206,193,0.45)",
        monogramColor: "#9fcec1",
        officeNameColor: "#d4ede8",
        subtitleColor: "rgba(248,243,234,0.36)",
        hairlineColor: "rgba(159,206,193,0.35)",
        badgeText: "Atualização do caso",
        badgeBg: "rgba(159,206,193,0.1)",
        badgeBorder: "rgba(159,206,193,0.35)",
        badgeColor: "#9fcec1",
        eyebrowColor: "#3d7d6e",
        panelBorderColor: "#9fcec1",
        panelBg: "#f6faf9",
        ctaBg: "linear-gradient(135deg,#0d2419 0%,#1a3d2e 100%)",
        ctaColor: "#ead7af",
        ctaBorder: "rgba(159,206,193,0.35)",
        topBand: null,
        isVip: false
      };

    // PENDÊNCIA — Âmbar escuro, urgência elegante, foco na ação
    case "pendencia":
      return {
        headerBg: "#1a0e00",
        monogramBorder: "rgba(200,169,107,0.5)",
        monogramColor: "#c8a96b",
        officeNameColor: "#e8d5a8",
        subtitleColor: "rgba(248,243,234,0.36)",
        hairlineColor: "rgba(200,169,107,0.4)",
        badgeText: "Pendência em aberto",
        badgeBg: "rgba(200,169,107,0.12)",
        badgeBorder: "rgba(200,169,107,0.45)",
        badgeColor: "#c8a96b",
        eyebrowColor: "#7a5a18",
        panelBorderColor: "#c8a96b",
        panelBg: "#fffdf7",
        ctaBg: "linear-gradient(135deg,#3d2200 0%,#6b3d00 100%)",
        ctaColor: "#ead7af",
        ctaBorder: "rgba(200,169,107,0.5)",
        topBand: null,
        isVip: false
      };

    // VIP — Preto-âmbar profundo, ouro dominante, exclusividade máxima
    case "vip":
      return {
        headerBg: "#0c0700",
        monogramBorder: "rgba(234,215,175,0.6)",
        monogramColor: "#ead7af",
        officeNameColor: "#ead7af",
        subtitleColor: "rgba(234,215,175,0.45)",
        hairlineColor: "rgba(234,215,175,0.5)",
        badgeText: "Atendimento Prioritário",
        badgeBg: "rgba(234,215,175,0.12)",
        badgeBorder: "rgba(234,215,175,0.5)",
        badgeColor: "#ead7af",
        eyebrowColor: "#8b6910",
        panelBorderColor: "#ead7af",
        panelBg: "#fffef9",
        ctaBg: "linear-gradient(135deg,#8b6508 0%,#c8a96b 50%,#ead7af 100%)",
        ctaColor: "#0c0700",
        ctaBorder: "rgba(234,215,175,0.6)",
        topBand: "linear-gradient(90deg, #4a3000 0%, #8b6508 20%, #c8a96b 40%, #ead7af 50%, #c8a96b 60%, #8b6508 80%, #4a3000 100%)",
        isVip: true
      };
  }
}

// ---------------------------------------------------------------------------
// Construtor principal do HTML premium
// ---------------------------------------------------------------------------

function buildEmailHtml(input: EmailLayoutInput): string {
  const config = getTierConfig(input.tier);
  const replyTo = getReplyTo();
  const portalUrl = buildPortalUrl("/cliente");

  // Faixa superior (tiers com destaque visual no topo)
  const topBandRow = config.topBand
    ? `<tr><td height="5" style="height:5px;font-size:0;line-height:0;background:${config.topBand};">&thinsp;</td></tr>`
    : "";

  // Arredondamento do cabeçalho depende de haver faixa superior
  const headerRadius = config.topBand ? "0 0 0 0" : "18px 18px 0 0";

  // Badge VIP exclusivo — aparece antes do badge de tier
  const vipExclusiveBadge = config.isVip
    ? `<p style="margin:0 0 10px;font-size:0;">
         <span style="display:inline-block;padding:4px 12px;border-radius:999px;background:rgba(234,215,175,0.08);border:1px solid rgba(234,215,175,0.35);color:rgba(234,215,175,0.7);font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
           &#9733;&ensp;Prioridade M&aacute;xima&ensp;&#9733;
         </span>
       </p>`
    : "";

  // Separador ouro no cabeçalho
  const hairlineDivider = `<tr>
    <td style="padding:0 36px;">
      <div style="height:1px;font-size:1px;line-height:1px;background:linear-gradient(90deg,${config.hairlineColor} 0%,rgba(200,169,107,0.08) 75%,transparent 100%);"></div>
    </td>
  </tr>`;

  // Linhas de metadata
  const metadataRows =
    input.metadata?.length
      ? `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;border-collapse:collapse;">
          ${input.metadata.map((entry, i) => `
          <tr>
            <td style="padding:10px 0 10px;${i > 0 ? "border-top:1px solid rgba(0,0,0,0.055);" : ""}color:#8fa89e;font-size:12px;letter-spacing:0.01em;width:40%;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ${escapeHtml(entry.label)}
            </td>
            <td style="padding:10px 0 10px;${i > 0 ? "border-top:1px solid rgba(0,0,0,0.055);" : ""}color:#1c3028;font-size:13px;font-weight:600;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ${escapeHtml(entry.value)}
            </td>
          </tr>`).join("")}
        </table>`
      : "";

  // Footer copy
  const footerCopy = input.footer
    ? escapeHtml(input.footer)
    : `Voc&ecirc; est&aacute; recebendo esta mensagem porque &eacute; cliente do escrit&oacute;rio Adv.&nbsp;Noemia Paix&atilde;o. Portal: <a href="${escapeHtml(portalUrl)}" style="color:#8fa89e;">${escapeHtml(portalUrl)}</a> &bull; Contato: ${escapeHtml(replyTo)}`;

  return `<!DOCTYPE html>
<html lang="pt-BR" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#e8e2d9;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Wrapper externo -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8e2d9;min-width:100%;">
  <tr>
    <td align="center" valign="top" style="padding:40px 16px;">

      <!-- Coluna central — max 600px -->
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        ${topBandRow}

        <!-- ═══════════════════════════ CABEÇALHO ═══════════════════════════ -->
        <tr>
          <td style="background-color:${config.headerBg};border-radius:${headerRadius};padding:0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

              <!-- Identidade: monograma + nome -->
              <tr>
                <td style="padding:30px 36px 22px;">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <!-- Monograma circular -->
                      <td style="width:44px;padding-right:14px;vertical-align:middle;">
                        <div style="width:40px;height:40px;border-radius:50%;border:1px solid ${config.monogramBorder};text-align:center;line-height:40px;color:${config.monogramColor};font-size:13px;font-weight:700;letter-spacing:0.06em;font-family:Georgia,'Times New Roman',serif;">NP</div>
                      </td>
                      <!-- Nome e subtítulo -->
                      <td style="vertical-align:middle;">
                        <p style="margin:0 0 3px;color:${config.officeNameColor};font-size:15px;font-weight:600;letter-spacing:0.015em;font-family:Georgia,'Times New Roman',serif;">Adv.&nbsp;Noemia Paix&atilde;o</p>
                        <p style="margin:0;color:${config.subtitleColor};font-size:10px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">Portal Jur&iacute;dico</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              ${hairlineDivider}

              <!-- Badge tier + VIP mark -->
              <tr>
                <td style="padding:16px 36px 28px;">
                  ${vipExclusiveBadge}
                  <p style="margin:0;font-size:0;">
                    <span style="display:inline-block;padding:6px 16px;border-radius:999px;background:${config.badgeBg};border:1px solid ${config.badgeBorder};color:${config.badgeColor};font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                      ${escapeHtml(config.badgeText)}
                    </span>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- ════════════════════════════ CORPO ════════════════════════════ -->
        <tr>
          <td style="background-color:#ffffff;padding:38px 36px 34px;">

            <!-- Eyebrow -->
            <p style="margin:0 0 14px;color:${config.eyebrowColor};font-size:10px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ${escapeHtml(input.eyebrow)}
            </p>

            <!-- Título principal -->
            <h1 style="margin:0 0 20px;font-size:28px;line-height:1.22;letter-spacing:-0.02em;color:#0a1e13;font-family:Georgia,'Times New Roman','Palatino Linotype',serif;font-weight:600;">
              ${escapeHtml(input.title)}
            </h1>

            <!-- Separador decorativo abaixo do título (VIP only) -->
            ${config.isVip ? `<div style="height:2px;width:48px;background:linear-gradient(90deg,#c8a96b,#ead7af);margin:0 0 22px;font-size:0;line-height:0;"></div>` : ""}

            <!-- Introdução -->
            <p style="margin:0 0 26px;font-size:15px;line-height:1.85;color:#4e6258;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ${escapeHtml(input.intro)}
            </p>

            <!-- Painel de conteúdo -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
              <tr>
                <td style="background-color:${config.panelBg};border-radius:12px;padding:18px 22px;border-left:3px solid ${config.panelBorderColor};">
                  <p style="margin:0;font-size:14px;line-height:1.9;color:#243830;white-space:pre-line;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    ${escapeHtml(input.body)}
                  </p>
                </td>
              </tr>
            </table>

            ${metadataRows}

            <!-- Botão CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="border-radius:999px;background:${config.ctaBg};box-shadow:0 6px 24px rgba(0,0,0,0.18);">
                  <a href="${escapeHtml(input.ctaHref)}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;padding:15px 34px;border-radius:999px;color:${config.ctaColor};text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.06em;border:1px solid ${config.ctaBorder};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    ${escapeHtml(input.ctaLabel)}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ═══════════════════════════ RODAPÉ ═══════════════════════════ -->
        <tr>
          <td style="background-color:#f0ebe3;border-radius:0 0 18px 18px;padding:22px 36px 28px;border-top:1px solid rgba(0,0,0,0.06);">
            <p style="margin:0 0 10px;font-size:12px;font-style:italic;color:#6e8880;font-family:Georgia,'Times New Roman',serif;letter-spacing:0.01em;">
              Atendimento jur&iacute;dico especializado com &eacute;tica e dedica&ccedil;&atilde;o.
            </p>
            <p style="margin:0;font-size:11px;line-height:1.75;color:#9aada8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              ${footerCopy}
            </p>
          </td>
        </tr>

        <!-- Crédito discreto -->
        <tr>
          <td align="center" style="padding:18px 0 0;">
            <p style="margin:0;font-size:10px;color:#b0bdb9;letter-spacing:0.06em;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
              PORTAL JUR&Iacute;DICO &mdash; ADV.&nbsp;NOEMIA PAIX&Atilde;O
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`.trim();
}

// ---------------------------------------------------------------------------
// Versão texto puro (fallback para clientes sem HTML)
// ---------------------------------------------------------------------------

function buildEmailText(input: Omit<EmailLayoutInput, "tier">): string {
  const separator = "─".repeat(52);
  const lines: string[] = [
    "ADV. NOEMIA PAIXÃO — PORTAL JURÍDICO",
    separator,
    "",
    `[ ${input.eyebrow.toUpperCase()} ]`,
    "",
    input.title,
    ""
  ];

  if (input.intro) {
    lines.push(input.intro, "");
  }

  lines.push(input.body, "");

  if (input.metadata?.length) {
    lines.push(separator);
    for (const entry of input.metadata) {
      lines.push(`${entry.label}: ${entry.value}`);
    }
    lines.push("");
  }

  lines.push(`→ ${input.ctaLabel}`, `   ${input.ctaHref}`, "");

  if (input.footer) {
    lines.push(separator, input.footer);
  }

  lines.push("", separator, "Atendimento jurídico especializado com ética e dedicação.");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Detecção automática de tier
// ---------------------------------------------------------------------------

function detectClientTier(record: NotificationTemplateRecord): ClientTier {
  const payload = record.payload || {};

  if (
    payload.clientTier === "vip" ||
    payload.clientTier === "novo-cliente" ||
    payload.clientTier === "em-andamento" ||
    payload.clientTier === "pendencia"
  ) {
    return payload.clientTier as ClientTier;
  }

  if (payload.casePriority === "urgente") return "vip";

  if (record.template_key === "client-invite" || record.template_key === "invite-reminder") {
    return "novo-cliente";
  }

  if (
    record.template_key === "document-request" ||
    record.template_key === "document-request-reminder"
  ) {
    return "pendencia";
  }

  return "em-andamento";
}

// ---------------------------------------------------------------------------
// Renderizadores por tipo de template
// ---------------------------------------------------------------------------

function renderInviteTrackingEmail(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const fullName = asString(payload.fullName, "Cliente");
  const caseAreaLabel = asString(payload.caseAreaLabel, "seu atendimento");
  const tier = detectClientTier(record);

  const layout: EmailLayoutInput = {
    tier,
    eyebrow: "Primeiro acesso",
    title: `${fullName}, seu portal jurídico está pronto.`,
    intro: `A equipe preparou seu acesso exclusivo para acompanhar o ${caseAreaLabel} com clareza, segurança e organização — em qualquer dispositivo.`,
    body:
      `Ao entrar pela primeira vez, você encontrará:\n\n` +
      `• O status atualizado do seu caso\n` +
      `• Documentos organizados e disponíveis para download\n` +
      `• As próximas datas e compromissos importantes\n` +
      `• O histórico de movimentações registradas pela equipe`,
    ctaLabel: "Acessar meu portal agora",
    ctaHref: buildPortalUrl(CLIENT_LOGIN_PATH),
    footer:
      `Este e-mail acompanha o processo de onboarding no portal jurídico. ` +
      `O link de primeiro acesso foi enviado separadamente. ` +
      `Dúvidas: ${getReplyTo()}`
  };

  return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
}

function renderCaseEventEmail(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const title = asString(payload.title, "Nova movimentação no portal");
  const publicSummary = asString(
    payload.publicSummary,
    "A equipe registrou uma nova movimentação no seu caso."
  );
  const eventLabel = asString(payload.eventLabel, "Atualização");
  const tier = detectClientTier(record);

  const actionByTemplate: Record<string, { label: string; path: string }> = {
    "new-document":            { label: "Ver documento",              path: "/documentos" },
    "document-request":        { label: "Ver pendência",              path: "/documentos#solicitacoes-abertas" },
    "new-appointment":         { label: "Abrir agenda",               path: "/agenda" },
    "appointment-updated":     { label: "Ver compromisso atualizado", path: "/agenda" },
    "appointment-rescheduled": { label: "Ver novo horário",           path: "/agenda" },
    "appointment-cancelled":   { label: "Abrir agenda",               path: "/agenda" },
    "status-change":           { label: "Ver status do caso",         path: "/cliente" },
    "case-update":             { label: "Ver atualização",            path: "/cliente#historico-atualizacoes" }
  };

  const action = actionByTemplate[record.template_key] || { label: "Abrir meu painel", path: "/cliente" };

  const layout: EmailLayoutInput = {
    tier,
    eyebrow: eventLabel,
    title,
    intro: "Uma nova informação foi registrada pela equipe e já está disponível no seu portal.",
    body: publicSummary,
    ctaLabel: action.label,
    ctaHref: buildPortalUrl(action.path)
  };

  return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
}

function renderInternalTriageEmail(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const fullName = asString(payload.fullName, "Novo contato");
  const caseAreaLabel = asString(payload.caseAreaLabel, "Atendimento jurídico");
  const urgencyLabel = asString(payload.urgencyLabel, "Moderada");
  const stageLabel = asString(payload.stageLabel, "Contexto inicial");
  const submittedAtLabel = asString(payload.submittedAtLabel, "Agora");
  const caseSummary = asString(payload.caseSummary, "Triagem registrada. Revisar no painel.");
  const destinationPath = asString(payload.destinationPath, "/internal/advogada");
  const isUrgent = record.template_key === "triage-urgent";

  const layout: EmailLayoutInput = {
    tier: "em-andamento",
    eyebrow: isUrgent ? "Triagem urgente" : "Nova triagem recebida",
    title: isUrgent ? `Prioridade alta: ${fullName}` : `Nova triagem de ${fullName}`,
    intro: `${caseAreaLabel} — Urgência: ${urgencyLabel} — ${stageLabel}`,
    body: `${caseSummary}\n\nRecebida em: ${submittedAtLabel}.`,
    ctaLabel: "Abrir painel interno",
    ctaHref: buildPortalUrl(destinationPath),
    metadata: [
      { label: "Nome", value: fullName },
      { label: "Área", value: caseAreaLabel },
      { label: "Urgência", value: urgencyLabel },
      { label: "Momento atual", value: stageLabel },
      { label: "Recebida em", value: submittedAtLabel }
    ],
    footer: "Notificação operacional interna. Não encaminhe esta mensagem."
  };

  return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
}

function renderReminderEmail(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const fullName = asString(payload.fullName, "Cliente");
  const destinationPath = asString(payload.destinationPath, CLIENT_LOGIN_PATH);
  const tier = detectClientTier(record);

  if (record.template_key === "invite-reminder") {
    const invitedAtLabel = asString(payload.invitedAtLabel, "recentemente");
    const isLate = asString(payload.reminderStage, "24h") === "72h";

    const layout: EmailLayoutInput = {
      tier,
      eyebrow: "Lembrete de acesso",
      title: "Seu portal ainda está esperando por você.",
      intro: isLate
        ? `${fullName}, seu acesso foi preparado em ${invitedAtLabel} e ainda aguarda confirmação.`
        : `${fullName}, o portal jurídico está pronto desde ${invitedAtLabel}.`,
      body: isLate
        ? `Qualquer dúvida para entrar, basta responder este e-mail. A equipe está disponível para apoiar o acesso.`
        : `Ao concluir o primeiro acesso, você terá o status do caso, os documentos e as próximas datas organizados em um único lugar.`,
      ctaLabel: "Entrar no portal",
      ctaHref: buildPortalUrl(destinationPath)
    };

    return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
  }

  if (record.template_key === "document-request-reminder") {
    const requestTitle = asString(payload.requestTitle, "Documento pendente");
    const caseTitle = asString(payload.caseTitle, "seu caso");
    const dueAtLabel = asString(payload.dueAtLabel, "sem prazo definido");
    const reminderStage = asString(payload.reminderStage, "open");
    const instructions = asString(payload.instructions, "");
    const isOverdue = reminderStage === "overdue";

    const layout: EmailLayoutInput = {
      tier,
      eyebrow: isOverdue ? "Pendência em aberto" : "Lembrete documental",
      title: "Um documento aguarda envio no seu portal.",
      intro: isOverdue
        ? `${fullName}, ainda existe uma solicitação documental em aberto para ${caseTitle}.`
        : `${fullName}, a equipe aguarda um documento importante para continuar o acompanhamento de ${caseTitle}.`,
      body:
        `Documento solicitado: ${requestTitle}\nPrazo: ${dueAtLabel}` +
        (instructions ? `\n\nOrientações da equipe:\n${instructions}` : ""),
      ctaLabel: "Ver solicitação no portal",
      ctaHref: buildPortalUrl(destinationPath),
      metadata: [
        { label: "Documento", value: requestTitle },
        { label: "Caso", value: caseTitle },
        { label: "Prazo", value: dueAtLabel }
      ]
    };

    return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
  }

  if (record.template_key === "appointment-reminder") {
    const title = asString(payload.title, "Compromisso do caso");
    const caseTitle = asString(payload.caseTitle, "seu caso");
    const startsAtLabel = asString(payload.startsAtLabel, "em breve");
    const notes = asString(payload.notes, "");

    const layout: EmailLayoutInput = {
      tier,
      eyebrow: "Lembrete de compromisso",
      title,
      intro: `${fullName}, há um compromisso importante previsto para ${caseTitle}.`,
      body: `Data e hora: ${startsAtLabel}` + (notes ? `\n\nObservações da equipe:\n${notes}` : ""),
      ctaLabel: "Ver na agenda do portal",
      ctaHref: buildPortalUrl(destinationPath),
      metadata: [
        { label: "Compromisso", value: title },
        { label: "Caso", value: caseTitle },
        { label: "Data e hora", value: startsAtLabel }
      ]
    };

    return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
  }

  // Fallback genérico
  const layout: EmailLayoutInput = {
    tier,
    eyebrow: "Portal jurídico",
    title: record.subject,
    intro: `${fullName}, há uma nova movimentação aguardando atenção no portal.`,
    body: "Acesse o portal para ver os detalhes atualizados do seu atendimento.",
    ctaLabel: "Abrir portal",
    ctaHref: buildPortalUrl(destinationPath)
  };

  return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
}

// ---------------------------------------------------------------------------
// Exportação principal — despachante por template_key
// ---------------------------------------------------------------------------

export function renderNotificationEmail(record: NotificationTemplateRecord): RenderedEmail {
  switch (record.template_key) {
    case "client-invite":
      return renderInviteTrackingEmail(record);

    case "triage-submitted":
    case "triage-urgent":
      return renderInternalTriageEmail(record);

    case "invite-reminder":
    case "document-request-reminder":
    case "appointment-reminder":
      return renderReminderEmail(record);

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
      const tier = detectClientTier(record);
      const layout: EmailLayoutInput = {
        tier,
        eyebrow: "Portal jurídico",
        title: record.subject,
        intro: "Uma nova notificação foi preparada para o seu atendimento.",
        body: "A equipe registrou uma nova movimentação. Entre no portal para ver os detalhes.",
        ctaLabel: "Abrir portal",
        ctaHref: buildPortalUrl("/cliente")
      };
      return { subject: record.subject, html: buildEmailHtml(layout), text: buildEmailText(layout) };
    }
  }
}
