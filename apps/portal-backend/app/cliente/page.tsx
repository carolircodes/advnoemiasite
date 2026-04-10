import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { ErrorBoundary } from "@/components/error-boundary";
import { getAccessMessage } from "@/lib/auth/access-control";
import { requireProfile } from "@/lib/auth/guards";
import {
  caseAreaLabels,
  clientStatusLabels,
  formatPortalDateTime
} from "@/lib/domain/portal";
import { getClientWorkspace } from "@/lib/services/dashboard";

function getStatusSummary(status: string) {
  if (status === "aguardando-primeiro-acesso") {
    return "Seu cadastro ja foi criado e aguarda a conclusao do primeiro acesso.";
  }

  if (status === "convite-enviado") {
    return "Seu convite inicial ja foi emitido e o portal esta pronto para uso.";
  }

  return "Seu cadastro esta sincronizado com a base real do portal.";
}

function getCaseStatusSummary(status: string) {
  switch (status) {
    case "triagem":
      return "A equipe esta reunindo as informacoes iniciais do atendimento.";
    case "documentos":
      return "Seu caso esta em fase de organizacao documental e conferencia do material.";
    case "analise":
      return "A documentacao ja entrou em analise para definir os proximos passos.";
    case "em-andamento":
      return "O caso esta em acompanhamento ativo pela equipe.";
    case "aguardando-retorno":
      return "Ha um retorno, resposta ou providencia pendente para seguir o fluxo.";
    case "concluido":
      return "O acompanhamento principal deste caso foi concluido.";
    default:
      return "A equipe segue acompanhando o seu caso pelo portal.";
  }
}

function isUpcomingAppointment(
  appointment: { starts_at: string; status: string },
  now: Date
) {
  return (
    new Date(appointment.starts_at) >= now &&
    appointment.status !== "cancelled" &&
    appointment.status !== "completed"
  );
}

type NoticeItem = {
  title: string;
  body: string;
  href: string;
  cta: string;
};

export const metadata: Metadata = {
  title: "Meu painel",
  robots: {
    index: false,
    follow: false
  }
};

export default async function ClientPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  console.log("[cliente.page] === INÍCIO DA FUNÇÃO CLIENT PAGE ===");
  console.error("[cliente.page] TESTE DE ERRO FORÇADO - ESTE LOG DEVE APARECER");
  
  try {
    console.log("[cliente.page] Iniciando carregamento da página do cliente");
    
    console.log("[cliente.page] Chamando requireProfile...");
  const profile = await requireProfile(["cliente"]);
  console.log("[cliente.page] requireProfile concluído com sucesso");
  console.log("[cliente.page] Profile carregado:", {
    id: profile.id,
    email: profile.email,
    role: profile.role,
    first_login_completed_at: profile.first_login_completed_at,
    is_active: profile.is_active
  });

  if (!profile.first_login_completed_at) {
    console.log("[cliente.page] Redirecionando para primeiro acesso - first_login_completed_at é null");
    redirect("/auth/primeiro-acesso");
  }

  let workspace;
  try {
    console.log("[cliente.page] Buscando workspace do cliente...");
    console.log("[cliente.page] Chamando getClientWorkspace...");
    workspace = await getClientWorkspace(profile);
    console.log("[cliente.page] getClientWorkspace concluído com sucesso");
    console.log("[cliente.page] Workspace carregado com sucesso:", {
      clientRecord: workspace.clientRecord,
      documentsCount: workspace.documents?.length || 0,
      appointmentsCount: workspace.appointments?.length || 0,
      casesCount: workspace.cases?.length || 0,
      eventsCount: workspace.events?.length || 0
    });
  } catch (error) {
    console.error("[cliente.page] Erro ao carregar workspace do cliente", {
      profileId: profile.id,
      profileEmail: profile.email,
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Se não encontrar o registro do cliente, redirecionar para primeiro acesso
    if (error instanceof Error && error.message.includes("Nao foi possivel localizar o cadastro do cliente")) {
      console.log("[cliente.page] Cliente não encontrado, redirecionando para primeiro acesso");
      redirect("/auth/primeiro-acesso");
    }
    
    // Para outros erros, redirecionar para login com erro genérico
    console.log("[cliente.page] Erro genérico, redirecionando para login");
    redirect("/portal/login?error=erro-carregar-dados");
  }
  const params = await searchParams;
  const success = typeof params.success === "string" ? params.success : "";
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const now = new Date();
  
  console.log("[cliente.page] Processando dados do workspace...");
  
  // Verificações de segurança para evitar undefined/null
  const documents = workspace.documents || [];
  const documentRequests = workspace.documentRequests || [];
  const appointments = workspace.appointments || [];
  const cases = workspace.cases || [];
  const events = workspace.events || [];

  console.log("[cliente.page] Arrays verificados:", {
    documentsLength: documents.length,
    documentRequestsLength: documentRequests.length,
    appointmentsLength: appointments.length,
    casesLength: cases.length,
    eventsLength: events.length
  });

  const availableDocuments = documents.filter(
    (document) => document && (document.status === "recebido" || document.status === "revisado")
  );
  const pendingDocuments = documents.filter(
    (document) => document && (document.status === "pendente" || document.status === "solicitado")
  );
  const openRequests = documentRequests.filter((request) => request && request.status === "pending");
  const upcomingAppointments = appointments
    .filter((appointment) => appointment && isUpcomingAppointment(appointment, now))
    .slice(0, 4);
  const nextAppointment = upcomingAppointments[0] || null;
  const mainCase = cases[0] || null;
  const showOnboardingGuide =
    !events.length &&
    !documents.length &&
    !documentRequests.length &&
    !appointments.length;

  console.log("[cliente.page] Dados processados:", {
    availableDocumentsLength: availableDocuments.length,
    pendingDocumentsLength: pendingDocuments.length,
    openRequestsLength: openRequests.length,
    upcomingAppointmentsLength: upcomingAppointments.length,
    mainCase: mainCase ? mainCase.title : 'null',
    showOnboardingGuide
  });

  console.log("[cliente.page] Iniciando renderização do AppFrame...");
  
  try {
    console.log("[cliente.page] Montando importantNotices...");
    const importantNotices = [
    mainCase && mainCase.statusLabel
      ? {
          title: `Status atual: ${mainCase.statusLabel}`,
          body: getCaseStatusSummary(mainCase.status),
          href: "#status-caso",
          cta: "Ver status do caso"
        }
      : null,
    nextAppointment && nextAppointment.starts_at
      ? {
          title: "Proxima data importante",
          body: `${formatPortalDateTime(nextAppointment.starts_at)} - ${nextAppointment.title}.`,
          href: "/agenda#proximos-compromissos",
          cta: "Abrir agenda"
        }
      : null,
    openRequests.length > 0
      ? {
          title: "Documentos aguardando voce",
          body: `Ha ${openRequests.length} solicitacao(oes) documental(is) aberta(s) no seu portal.`,
          href: "/documentos#solicitacoes-abertas",
          cta: "Abrir documentos"
        }
      : null,
    openRequests.length === 0 && pendingDocuments.length > 0
      ? {
          title: "Documentos em acompanhamento",
          body: `A equipe segue acompanhando ${pendingDocuments.length} documento(s) pendente(s) ou solicitado(s).`,
          href: "/documentos",
          cta: "Ver documentos"
        }
      : null,
    events.length > 0 && events[0]
      ? {
          title: "Ultima atualizacao liberada",
          body:
            events[0].public_summary ||
            "A equipe registrou um novo andamento visivel no seu portal.",
          href: "#historico-atualizacoes",
          cta: "Ler historico"
        }
      : null
  ].filter(Boolean) as NoticeItem[];

  console.log("[cliente.page] Verificando propriedades críticas:", {
    profileFullName: profile.full_name,
    profileEmail: profile.email,
    profileRole: profile.role,
    workspaceClientRecord: workspace.clientRecord,
    mainCaseStatusLabel: mainCase?.statusLabel,
    mainCaseTitle: mainCase?.title
  });

  try {
    console.log("[cliente.page] Iniciando renderização principal...");
    return (
      <ErrorBoundary>
        {/* ProductEventBeacon temporariamente removido para debug */}
        
        {/* VERSÃO SIMPLIFICADA PARA DEBUG */}
        <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
          <h1>Portal do Cliente - Debug</h1>
          <p><strong>Nome:</strong> {profile.full_name || profile.email}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>ID:</strong> {profile.id}</p>
          <p><strong>Role:</strong> {profile.role}</p>
          <p><strong>First Login:</strong> {profile.first_login_completed_at || "Não concluído"}</p>
          
          <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0" }}>
            <h3>DADOS DO WORKSPACE:</h3>
            <p><strong>Documents:</strong> {documents.length}</p>
            <p><strong>Appointments:</strong> {appointments.length}</p>
            <p><strong>Cases:</strong> {cases.length}</p>
            <p><strong>Events:</strong> {events.length}</p>
            <p><strong>Main Case:</strong> {mainCase ? mainCase.title : "Nenhum"}</p>
          </div>
          
          <div style={{ marginTop: "20px" }}>
            <a href="/cliente/simple" style={{ marginRight: "10px" }}>Página Simples</a>
            <a href="/cliente/test" style={{ marginRight: "10px" }}>Página de Teste</a>
            <a href="/cliente/minimal" style={{ marginRight: "10px" }}>Página Minimal</a>
          </div>
        </div>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error("[cliente.page] Erro ao renderizar página", error);
    return <div>Erro ao carregar página</div>;
  }
}
