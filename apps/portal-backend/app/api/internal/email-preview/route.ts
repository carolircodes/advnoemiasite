import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import { renderNotificationEmail } from "@/lib/notifications/email-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Dados de amostra realistas para cada tier
const SAMPLES = {
  "novo-cliente": {
    template_key: "client-invite",
    subject: "Seu acesso ao portal jurídico foi preparado",
    payload: {
      fullName: "Maria Clara Oliveira",
      caseAreaLabel: "Direito Previdenciário"
    }
  },
  "em-andamento": {
    template_key: "case-update",
    subject: "Atualização: recurso administrativo protocolado",
    payload: {
      title: "Recurso administrativo protocolado com sucesso",
      publicSummary:
        "O recurso administrativo referente à revisão do benefício foi protocolado junto ao INSS na data de hoje. O processo segue para análise da autarquia, com prazo estimado de 30 a 45 dias para retorno. A equipe acompanha e informa qualquer movimentação assim que registrada no sistema.",
      eventLabel: "Atualização do caso"
    }
  },
  "pendencia": {
    template_key: "document-request-reminder",
    subject: "Lembrete: documento pendente no seu portal",
    payload: {
      fullName: "Maria Clara Oliveira",
      caseTitle: "Revisão de Aposentadoria — Maria Clara Oliveira",
      requestTitle: "Extrato de contribuição dos últimos 12 meses",
      dueAtLabel: "20 de maio de 2026 às 18h",
      reminderStage: "upcoming",
      instructions:
        "Solicite o documento pelo aplicativo Meu INSS ou compareça a uma agência. O extrato deve cobrir o período de maio de 2025 a maio de 2026. Salve em PDF antes de enviar.",
      destinationPath: "/documentos#solicitacoes-abertas"
    }
  },
  "vip": {
    template_key: "new-appointment",
    subject: "Audiência designada no TRF — data confirmada",
    payload: {
      title: "Audiência de instrução e julgamento — TRF 4ª Região",
      publicSummary:
        "A audiência foi designada para 22 de maio de 2026 às 14h, perante a 3ª Vara Federal Previdenciária de Curitiba. Este é um momento decisivo para o seu caso. A equipe enviará orientações específicas sobre comparecimento com antecedência. Não é necessária nenhuma ação sua neste momento.",
      eventLabel: "Compromisso criado",
      casePriority: "urgente",
      clientTier: "vip"
    }
  }
} as const;

type PreviewTier = keyof typeof SAMPLES;

export async function GET(request: Request) {
  const auth = await requireInternalApiProfile();

  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const tier = url.searchParams.get("tier") as PreviewTier | null;
  const format = url.searchParams.get("format") || "html";

  if (!tier || !(tier in SAMPLES)) {
    const available = Object.keys(SAMPLES).join(", ");
    return NextResponse.json(
      { error: `Parâmetro "tier" inválido. Opções: ${available}` },
      { status: 400 }
    );
  }

  const sample = SAMPLES[tier];
  const rendered = renderNotificationEmail(sample);

  if (format === "text") {
    return new NextResponse(rendered.text, {
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }

  return new NextResponse(rendered.html, {
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
