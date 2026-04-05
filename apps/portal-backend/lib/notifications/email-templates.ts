import "server-only";

import { CLIENT_LOGIN_PATH } from "@/lib/auth/access-control";
import { getServerEnv } from "@/lib/config/env";
import type { ClientTier } from "@/lib/domain/portal";

// ---------------------------------------------------------------------------
// Tipos
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

/**
 * Estrutura de um e-mail de alto padrão.
 *
 * Filosofia: uma mensagem, uma ação, muito espaço.
 * O cliente deve sentir que alguém escreveu para ele — não que um sistema disparou.
 */
type EmailInput = {
  tier: ClientTier;
  /** Linha discreta acima do título — contexto mínimo, sem ruído. */
  eyebrow: string;
  /** Frase principal. Deve funcionar sozinha. */
  title: string;
  /** Um ou dois parágrafos. Linguagem humana, sem jargão. */
  paragraphs: string[];
  /** Card de informação estruturada (documento, data) — opcional e discreto. */
  infoCard?: {
    heading: string;
    lines: string[];
  };
  /** Texto do botão — ação única, clara. */
  ctaLabel: string;
  ctaHref: string;
  /** Nota de rodapé — mínima. */
  footerNote?: string;
};

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function escapeHtml(raw: string) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildUrl(path: string) {
  return new URL(path, getServerEnv().NEXT_PUBLIC_APP_URL).toString();
}

function replyTo() {
  return getServerEnv().NOTIFICATIONS_REPLY_TO || "contato@advnoemia.com.br";
}

// ---------------------------------------------------------------------------
// Paleta por tier
//
// O dourado aparece em UMA posição por e-mail, não em várias.
// O header é sempre escuro e limpo — apenas o nome do escritório.
// A diferenciação entre tiers acontece principalmente no copy e em
// detalhes sutis: linha decorativa, acento do eyebrow, botão.
// ---------------------------------------------------------------------------

type Palette = {
  /** Cor de fundo do header. */
  headerBg: string;
  /** Cor do nome do escritório no header. */
  wordmarkColor: string;
  /** Linha fina abaixo do nome — apenas um traço de 32px. */
  rulerColor: string;
  /** Faixa de 3px no topo do card — apenas para novo-cliente e vip. */
  topAccent: string | null;
  /** Cor discreta do eyebrow no corpo. */
  eyebrowColor: string;
  /** Linha decorativa após o título — apenas para vip. */
  titleAccent: string | null;
  /** Fundo do info-card (para documentos/datas). */
  cardBg: string;
  /** Cor do botão. */
  ctaBg: string;
  /** Cor do texto do botão. */
  ctaText: string;
};

function getPalette(tier: ClientTier): Palette {
  switch (tier) {
    // NOVO CLIENTE
    // Tom: acolhimento + exclusividade de entrada.
    // O ouro aparece na faixa superior e no nome do escritório — discreto.
    case "novo-cliente":
      return {
        headerBg: "#091911",
        wordmarkColor: "#c8a96b",
        rulerColor: "rgba(200,169,107,0.4)",
        topAccent: "#c8a96b",
        eyebrowColor: "#7a5c1e",
        titleAccent: null,
        cardBg: "#faf7f2",
        ctaBg: "#0d2419",
        ctaText: "#ead7af"
      };

    // EM ANDAMENTO
    // Tom: segurança + profissionalismo.
    // Nenhum acento excessivo — o verde já diz tudo.
    case "em-andamento":
      return {
        headerBg: "#0d2419",
        wordmarkColor: "#c8d8d3",
        rulerColor: "rgba(159,206,193,0.3)",
        topAccent: null,
        eyebrowColor: "#3d7d6e",
        titleAccent: null,
        cardBg: "#f5faf8",
        ctaBg: "#0d2419",
        ctaText: "#ead7af"
      };

    // PENDÊNCIA
    // Tom: urgência elegante — clareza sem alarme.
    // Sem vermelho. Sem exagero. Ouro morno como lembrete.
    case "pendencia":
      return {
        headerBg: "#1a1008",
        wordmarkColor: "#c8a96b",
        rulerColor: "rgba(200,169,107,0.35)",
        topAccent: null,
        eyebrowColor: "#8b6408",
        titleAccent: null,
        cardBg: "#fffcf5",
        ctaBg: "#2e1e00",
        ctaText: "#ead7af"
      };

    // VIP
    // Tom: exclusividade máxima — sentir-se o único cliente do escritório.
    // Faixa dourada discreta no topo. Linha dourada após o título.
    // Tudo mais espaçado. O botão tem textura dourada.
    case "vip":
      return {
        headerBg: "#0c0900",
        wordmarkColor: "#ead7af",
        rulerColor: "rgba(234,215,175,0.45)",
        topAccent: "linear-gradient(90deg,rgba(139,101,8,0) 0%,#c8a96b 30%,#ead7af 50%,#c8a96b 70%,rgba(139,101,8,0) 100%)",
        eyebrowColor: "#8b6810",
        titleAccent: "linear-gradient(90deg,#c8a96b,#ead7af)",
        cardBg: "#fffef9",
        ctaBg: "linear-gradient(135deg,#c8a96b 0%,#ead7af 100%)",
        ctaText: "#0c0900"
      };
  }
}

// ---------------------------------------------------------------------------
// Construtor HTML
//
// Estrutura de luxo: header limpo → espaço → título forte → texto breve → ação.
// Nada é decorativo por acidente. Cada px de padding tem motivo.
// ---------------------------------------------------------------------------

function buildHtml(input: EmailInput): string {
  const p = getPalette(input.tier);
  const footerNote = input.footerNote
    || `Você recebe esta mensagem como cliente do escritório Adv.&nbsp;Noemia Paixão. `
    + `<a href="${escapeHtml(buildUrl("/cliente"))}" style="color:#8fa898;text-decoration:underline;">Acessar portal</a>`
    + ` &bull; ${escapeHtml(replyTo())}`;

  // Faixa de cor no topo (3–4px) — só para novo-cliente e vip
  const topAccentRow = p.topAccent
    ? `<tr><td height="4" style="height:4px;line-height:4px;font-size:0;background:${p.topAccent};">&thinsp;</td></tr>`
    : "";

  // Raio de borda do header depende da faixa
  const headerRadius = p.topAccent ? "0 0 0 0" : "20px 20px 0 0";

  // Parágrafos do corpo
  const paragraphsHtml = input.paragraphs
    .map(
      (text, i) =>
        `<p style="margin:0${i < input.paragraphs.length - 1 ? " 0 18px" : ""};font-size:15px;line-height:1.9;color:#3d5248;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
          ${escapeHtml(text)}
        </p>`
    )
    .join("\n");

  // Info-card — documento solicitado, data de compromisso, etc.
  const infoCardHtml = input.infoCard
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
        <tr>
          <td style="background-color:${p.cardBg};border-radius:10px;padding:20px 24px;">
            <p style="margin:0 0 10px;font-size:13px;font-weight:600;letter-spacing:0.01em;color:#0a1e13;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              ${escapeHtml(input.infoCard.heading)}
            </p>
            ${input.infoCard.lines.map(
              (line) =>
                `<p style="margin:0 0 5px;font-size:13px;line-height:1.7;color:#5e7a6e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                  ${escapeHtml(line)}
                </p>`
            ).join("")}
          </td>
        </tr>
      </table>`
    : "";

  // Linha dourada após título — apenas VIP
  const titleAccentHtml = p.titleAccent
    ? `<div style="width:40px;height:2px;background:${p.titleAccent};margin:18px 0 24px;font-size:0;line-height:0;"></div>`
    : `<div style="height:22px;"></div>`;

  // Padding do corpo — VIP tem mais respiro
  const bodyPadding = input.tier === "vip" ? "54px 48px 50px" : "46px 44px 42px";
  const headerPadding = input.tier === "vip" ? "28px 48px 26px" : "26px 44px 24px";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(input.title)}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#e8e3db;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#e8e3db;">
  <tr>
    <td align="center" style="padding:44px 16px 52px;">

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">

        ${topAccentRow}

        <!-- ─── HEADER: apenas identidade ──────────────────────────────── -->
        <tr>
          <td style="background-color:${p.headerBg};border-radius:${headerRadius};padding:${headerPadding};">
            <p style="margin:0 0 16px;color:${p.wordmarkColor};font-size:13px;font-weight:600;letter-spacing:0.16em;text-transform:uppercase;font-family:Georgia,'Times New Roman',serif;">
              Adv.&nbsp;Noemia Paix&atilde;o
            </p>
            <div style="width:32px;height:1px;background:${p.rulerColor};font-size:0;line-height:0;"></div>
          </td>
        </tr>

        <!-- ─── CORPO: mensagem principal ──────────────────────────────── -->
        <tr>
          <td style="background-color:#ffffff;padding:${bodyPadding};">

            <p style="margin:0 0 14px;font-size:10px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${p.eyebrowColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              ${escapeHtml(input.eyebrow)}
            </p>

            <h1 style="margin:0;font-size:28px;line-height:1.25;letter-spacing:-0.022em;color:#091911;font-family:Georgia,'Times New Roman','Palatino Linotype',serif;font-weight:600;">
              ${escapeHtml(input.title)}
            </h1>

            ${titleAccentHtml}

            ${paragraphsHtml}

            ${infoCardHtml}

            <!-- CTA ──────────────────────────────────────────────────── -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:${input.infoCard ? "4px" : "36px"};">
              <tr>
                <td style="border-radius:999px;background:${p.ctaBg};">
                  <a href="${escapeHtml(input.ctaHref)}" target="_blank" rel="noopener noreferrer"
                     style="display:inline-block;padding:14px 36px;border-radius:999px;color:${p.ctaText};text-decoration:none;font-size:12px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
                    ${escapeHtml(input.ctaLabel)}
                  </a>
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <!-- ─── RODAPÉ: mínimo ─────────────────────────────────────────── -->
        <tr>
          <td style="background-color:#f0ebe3;border-radius:0 0 20px 20px;padding:20px 44px 24px;border-top:1px solid rgba(0,0,0,0.05);">
            <p style="margin:0 0 8px;font-size:11px;font-style:italic;color:#7a9490;letter-spacing:0.01em;font-family:Georgia,'Times New Roman',serif;">
              Atendimento jur&iacute;dico com aten&ccedil;&atilde;o, &eacute;tica e resultado.
            </p>
            <p style="margin:0;font-size:11px;line-height:1.75;color:#9fb0ab;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
              ${footerNote}
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
// Versão texto puro
// ---------------------------------------------------------------------------

function buildText(input: EmailInput): string {
  const lines = [
    "ADV. NOEMIA PAIXÃO",
    "─".repeat(40),
    "",
    input.eyebrow.toUpperCase(),
    "",
    input.title,
    "",
    ...input.paragraphs.flatMap((p) => [p, ""]),
  ];

  if (input.infoCard) {
    lines.push(input.infoCard.heading);
    lines.push(...input.infoCard.lines);
    lines.push("");
  }

  lines.push(`→ ${input.ctaLabel}`, `  ${input.ctaHref}`, "");
  if (input.footerNote) {
    lines.push("─".repeat(40), input.footerNote);
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Detecção de tier
// ---------------------------------------------------------------------------

function detectTier(record: NotificationTemplateRecord): ClientTier {
  const p = record.payload || {};

  if (p.clientTier === "vip" || p.clientTier === "novo-cliente"
    || p.clientTier === "em-andamento" || p.clientTier === "pendencia") {
    return p.clientTier as ClientTier;
  }

  if (p.casePriority === "urgente") return "vip";

  if (record.template_key === "client-invite" || record.template_key === "invite-reminder") {
    return "novo-cliente";
  }

  if (record.template_key === "document-request"
    || record.template_key === "document-request-reminder") {
    return "pendencia";
  }

  return "em-andamento";
}

// ---------------------------------------------------------------------------
// Templates por tipo
// ---------------------------------------------------------------------------

function renderInvite(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const name = asString(payload.fullName, "Cliente").split(" ")[0]; // primeiro nome
  const area = asString(payload.caseAreaLabel, "seu caso");

  const input: EmailInput = {
    tier: "novo-cliente",
    eyebrow: "Bem-vinda ao portal",
    title: `${name}, seu espaço está pronto.`,
    paragraphs: [
      `Preparamos um portal exclusivo para acompanhar o ${area} com clareza e segurança. `
      + `Do andamento às datas importantes, tudo organizado em um único lugar — acessível quando e onde você precisar.`,
      `O primeiro acesso leva menos de dois minutos.`
    ],
    ctaLabel: "Acessar meu portal",
    ctaHref: buildUrl(CLIENT_LOGIN_PATH)
  };

  return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
}

function renderCaseEvent(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const title = asString(payload.title, "Atualização no seu caso");
  const summary = asString(payload.publicSummary, "A equipe registrou uma movimentação no seu caso.");
  const eventLabel = asString(payload.eventLabel, "Atualização");
  const tier = detectTier(record);

  const actionMap: Record<string, { label: string; path: string }> = {
    "new-document":            { label: "Ver documento",              path: "/documentos" },
    "document-request":        { label: "Ver solicitação",            path: "/documentos#solicitacoes-abertas" },
    "new-appointment":         { label: "Abrir agenda",               path: "/agenda" },
    "appointment-updated":     { label: "Ver compromisso",            path: "/agenda" },
    "appointment-rescheduled": { label: "Ver novo horário",           path: "/agenda" },
    "appointment-cancelled":   { label: "Abrir agenda",               path: "/agenda" },
    "status-change":           { label: "Acompanhar caso",            path: "/cliente" },
    "case-update":             { label: "Ver atualização",            path: "/cliente#historico-atualizacoes" }
  };

  const action = actionMap[record.template_key] || { label: "Acessar portal", path: "/cliente" };

  // Para VIP, adicionamos uma linha de fechamento que reforça o cuidado
  const paragraphs = tier === "vip"
    ? [summary, "Acompanhamos cada detalhe com a atenção que o seu caso merece."]
    : [summary];

  const input: EmailInput = {
    tier,
    eyebrow: eventLabel,
    title,
    paragraphs,
    ctaLabel: action.label,
    ctaHref: buildUrl(action.path)
  };

  return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
}

function renderTriage(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const name = asString(payload.fullName, "Novo contato");
  const area = asString(payload.caseAreaLabel, "Atendimento");
  const urgency = asString(payload.urgencyLabel, "Moderada");
  const stage = asString(payload.stageLabel, "—");
  const receivedAt = asString(payload.submittedAtLabel, "Agora");
  const summary = asString(payload.caseSummary, "—");
  const dest = asString(payload.destinationPath, "/internal/advogada");
  const isUrgent = record.template_key === "triage-urgent";

  const input: EmailInput = {
    tier: "em-andamento",
    eyebrow: isUrgent ? "Triagem urgente" : "Nova triagem",
    title: isUrgent ? `Prioridade alta — ${name}` : `Nova triagem recebida: ${name}`,
    paragraphs: [`${area} · Urgência: ${urgency} · ${stage}`, summary],
    infoCard: {
      heading: `Recebida em ${receivedAt}`,
      lines: [
        `Contato: ${asString(payload.contactEmail, "—")}`,
        `Telefone: ${asString(payload.contactPhone, "—")}`
      ].filter((l) => !l.endsWith("—"))
    },
    ctaLabel: "Abrir painel interno",
    ctaHref: buildUrl(dest),
    footerNote: "Notificação interna. Não encaminhar."
  };

  return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
}

function renderReminder(record: NotificationTemplateRecord): RenderedEmail {
  const payload = record.payload || {};
  const firstName = asString(payload.fullName, "Cliente").split(" ")[0];
  const dest = asString(payload.destinationPath, CLIENT_LOGIN_PATH);
  const tier = detectTier(record);

  // ── Convite não utilizado ─────────────────────────────────────────────────
  if (record.template_key === "invite-reminder") {
    const isLate = asString(payload.reminderStage) === "72h";

    const input: EmailInput = {
      tier,
      eyebrow: "Acesso ao portal",
      title: "Seu portal continua esperando por você.",
      paragraphs: isLate
        ? [
            `${firstName}, seu acesso foi preparado há alguns dias e ainda está disponível. Se precisar de apoio para entrar, é só responder este e-mail — estamos à disposição.`
          ]
        : [
            `${firstName}, tudo está pronto para o seu primeiro acesso. Em poucos minutos você terá o status do caso, os documentos e as próximas datas organizados em um único lugar.`
          ],
      ctaLabel: "Entrar agora",
      ctaHref: buildUrl(dest)
    };

    return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
  }

  // ── Documento solicitado ──────────────────────────────────────────────────
  if (record.template_key === "document-request-reminder") {
    const docTitle = asString(payload.requestTitle, "Documento pendente");
    const caseTitle = asString(payload.caseTitle, "seu caso");
    const due = asString(payload.dueAtLabel, "");
    const instructions = asString(payload.instructions, "");
    const isOverdue = asString(payload.reminderStage) === "overdue";

    const opening = isOverdue
      ? `${firstName}, seu caso está aguardando um documento para seguir em frente. Assim que recebermos, retomamos imediatamente.`
      : `${firstName}, para que o ${caseTitle} avance sem interrupções, precisamos de um documento. O envio é simples e rápido.`;

    const infoLines = [due ? `Prazo: ${due}` : ""].filter(Boolean);
    if (instructions) infoLines.push(instructions);

    const input: EmailInput = {
      tier,
      eyebrow: isOverdue ? "Atenção necessária" : "Documento pendente",
      title: "Um passo para o seu caso avançar.",
      paragraphs: [opening],
      infoCard: {
        heading: docTitle,
        lines: infoLines
      },
      ctaLabel: "Enviar documento",
      ctaHref: buildUrl(dest)
    };

    return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
  }

  // ── Compromisso ───────────────────────────────────────────────────────────
  if (record.template_key === "appointment-reminder") {
    const apptTitle = asString(payload.title, "Compromisso");
    const caseTitle = asString(payload.caseTitle, "seu caso");
    const startsAt = asString(payload.startsAtLabel, "—");
    const notes = asString(payload.notes, "");

    const input: EmailInput = {
      tier,
      eyebrow: "Lembrete de compromisso",
      title: apptTitle,
      paragraphs: [
        `${firstName}, há um compromisso importante marcado para ${caseTitle}.`
        + (notes ? ` ${notes}` : "")
      ],
      infoCard: {
        heading: `Data e hora`,
        lines: [startsAt]
      },
      ctaLabel: "Ver na agenda",
      ctaHref: buildUrl(dest)
    };

    return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
  }

  // Fallback
  const input: EmailInput = {
    tier,
    eyebrow: "Portal jurídico",
    title: record.subject,
    paragraphs: [`${firstName}, há uma novidade no seu portal. Acesse para ver os detalhes.`],
    ctaLabel: "Acessar portal",
    ctaHref: buildUrl(dest)
  };

  return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
}

// ---------------------------------------------------------------------------
// Exportação principal
// ---------------------------------------------------------------------------

export function renderNotificationEmail(record: NotificationTemplateRecord): RenderedEmail {
  switch (record.template_key) {
    case "client-invite":
      return renderInvite(record);

    case "triage-submitted":
    case "triage-urgent":
      return renderTriage(record);

    case "invite-reminder":
    case "document-request-reminder":
    case "appointment-reminder":
      return renderReminder(record);

    case "case-update":
    case "new-document":
    case "new-appointment":
    case "appointment-updated":
    case "appointment-rescheduled":
    case "appointment-cancelled":
    case "document-request":
    case "status-change":
      return renderCaseEvent(record);

    default: {
      const tier = detectTier(record);
      const input: EmailInput = {
        tier,
        eyebrow: "Portal jurídico",
        title: record.subject,
        paragraphs: ["A equipe registrou uma novidade no seu atendimento. Acesse o portal para ver os detalhes."],
        ctaLabel: "Acessar portal",
        ctaHref: buildUrl("/cliente")
      };
      return { subject: record.subject, html: buildHtml(input), text: buildText(input) };
    }
  }
}
