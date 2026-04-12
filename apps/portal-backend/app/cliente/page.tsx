import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import { portalFeatures } from "@/lib/config/portal-features";
import {
  getClientAgendaSummary,
  getClientCaseSummary,
  getClientDocumentsSummary,
  getClientEventsSummary,
  getClientProfileSummary,
  getClientRequestsSummary
} from "@/lib/services/client-workspace";

import { ClientShell } from "./_components/client-shell";
import {
  ClientAgendaPreparationCard,
  ClientCaseSummaryModule,
  ClientDocumentsPreparationCard,
  ClientEventsModule,
  ClientRequestsModule
} from "./_components/client-case-summary-module";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Area do cliente",
  robots: {
    index: false,
    follow: false
  }
};

function pickFirst(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }

  return typeof value === "string" ? value : "";
}

function decodeErrorMessage(value: string) {
  if (!value) {
    return "";
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isNotice(
  value:
    | {
        tone: "success" | "error" | "warning";
        title: string;
        description: string;
      }
    | null
) {
  return value !== null;
}

export default async function ClientPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile(["cliente"]);

  if (!profile.first_login_completed_at) {
    redirect("/auth/primeiro-acesso");
  }

  const params = await searchParams;
  const successCode = pickFirst(params.success);
  const rawErrorCode = pickFirst(params.error);
  const decodedError = decodeErrorMessage(rawErrorCode);
  const errorMessage = getAccessMessage(decodedError) || decodedError;
  const [
    profileSummary,
    caseSummary,
    documentsSummary,
    agendaSummary,
    requestsSummary,
    eventsSummary
  ] = await Promise.all([
    getClientProfileSummary(profile),
    getClientCaseSummary(profile),
    getClientDocumentsSummary(profile),
    getClientAgendaSummary(profile),
    getClientRequestsSummary(profile),
    getClientEventsSummary(profile)
  ]);

  const notices = [
    successCode === "primeiro-acesso-concluido"
      ? {
          tone: "success" as const,
          title: "Primeiro acesso concluido",
          description:
            "Seu acesso foi liberado com sucesso e o shell minimo do painel ja esta disponivel."
        }
      : null,
    errorMessage
      ? {
          tone: "error" as const,
          title: "Alerta do portal",
          description: errorMessage
        }
      : null,
    {
      tone: "warning" as const,
      title: "Como usar este painel",
      description:
        "Aqui voce acompanha o resumo do caso, documentos, agenda e historico recente. Se algum bloco estiver temporariamente indisponivel, a pagina continua aberta com seguranca."
    }
  ].filter(isNotice);

  return (
    <ClientShell profile={profileSummary.data} notices={notices}>
      <ClientCaseSummaryModule
        enabled={portalFeatures.clientCaseSummary}
        result={caseSummary}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <ClientDocumentsPreparationCard
          enabled={portalFeatures.clientDocuments}
          result={documentsSummary}
        />
        <ClientAgendaPreparationCard
          enabled={portalFeatures.clientAgenda}
          result={agendaSummary}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <ClientRequestsModule
          enabled={portalFeatures.clientRequests}
          result={requestsSummary}
        />
        <ClientEventsModule
          enabled={portalFeatures.clientActivity}
          result={eventsSummary}
        />
      </div>
    </ClientShell>
  );
}
