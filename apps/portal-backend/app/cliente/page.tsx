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
import { getClientEcosystemWorkspace } from "@/lib/services/ecosystem-platform";
import { buildClientPortalPremiumProjection } from "@/lib/services/premium-operational-model";

import { ClientEcosystemFoundation } from "./_components/client-ecosystem-foundation";
import { ClientShell } from "./_components/client-shell";
import { ClientPremiumWorkspace } from "./_components/client-premium-workspace";

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
    eventsSummary,
    ecosystemWorkspace
  ] = await Promise.all([
    getClientProfileSummary(profile),
    getClientCaseSummary(profile),
    getClientDocumentsSummary(profile),
    getClientAgendaSummary(profile),
    getClientRequestsSummary(profile),
    getClientEventsSummary(profile),
    getClientEcosystemWorkspace(profile)
  ]);

  const notices = [
    successCode === "primeiro-acesso-concluido"
      ? {
          tone: "success" as const,
          title: "Portal liberado",
          description:
            "Seu acesso foi confirmado e o acompanhamento ja esta organizado com status, proximos passos e historico recente."
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
      title: "Leitura rapida do atendimento",
      description:
        "Este portal mostra primeiro o que esta acontecendo agora, o que depende de voce e quais movimentos a equipe ja registrou no caso."
    }
  ].filter(isNotice);
  const premiumProjection = buildClientPortalPremiumProjection({
    caseSummary: caseSummary.data,
    documentsSummary: documentsSummary.data,
    agendaSummary: agendaSummary.data,
    requestsSummary: requestsSummary.data,
    eventsSummary: eventsSummary.data
  });

  return (
    <ClientShell profile={profileSummary.data} notices={notices}>
      {!portalFeatures.clientCaseSummary ||
      !portalFeatures.clientDocuments ||
      !portalFeatures.clientAgenda ||
      !portalFeatures.clientRequests ||
      !portalFeatures.clientActivity ? (
        <section className="rounded-3xl border border-[#eadfcf] bg-[#fbf7ef] px-5 py-4 text-sm leading-7 text-[#7b5c31]">
          Alguns modulos seguem em fallback seguro por flag. O portal continua priorizando clareza de status, pendencias e proximos passos com os dados ja disponiveis.
        </section>
      ) : null}

      <ClientPremiumWorkspace projection={premiumProjection} />
      <ClientEcosystemFoundation workspace={ecosystemWorkspace} />
    </ClientShell>
  );
}
