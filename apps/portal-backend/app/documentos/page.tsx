import { redirect } from "next/navigation";
import Link from "next/link";

import { AppFrame } from "@/components/app-frame";
import { ClientModuleBoundary } from "@/components/client-module-boundary";
import { ClientMobileDock } from "@/components/client-mobile-dock";
import type { ClientUploadState } from "@/components/client-document-upload";
import { ClientDocumentUploadCard } from "@/components/client-document-upload";
import { ClientPwaInstallPrompt } from "@/components/client-pwa-install-prompt";
import { ClientQuickActions } from "@/components/client-quick-actions";
import { FormSubmitButton } from "@/components/form-submit-button";
import {
  PremiumFeatureCard,
  PremiumSection,
  PremiumStatePanel
} from "@/components/portal/premium-experience";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SafeModuleCard } from "@/components/safe-module-card";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import { portalFeatures } from "@/lib/config/portal-features";
import {
  documentUploadAccept,
  documentRequestStatusLabels,
  documentStatuses,
  documentStatusLabels,
  formatFileSize,
  formatPortalDateTime
} from "@/lib/domain/portal";
import {
  buildInternalAgendaHref,
  buildInternalCaseHref,
  buildInternalClientHref
} from "@/lib/navigation";
import { getStaffOverview } from "@/lib/services/dashboard";
import {
  getClientDocumentsSummary,
  getClientRequestsSummary
} from "@/lib/services/client-workspace";
import {
  registerCaseDocument,
  requestCaseDocument,
  submitClientDocument,
  updateDocumentRequestStatus
} from "@/lib/services/manage-documents";

function buildDefaultDateTimeValue() {
  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function getStringParam(
  value: string | string[] | undefined,
  fallback = ""
) {
  return typeof value === "string" ? value.trim() : fallback;
}

function matchesSearch(query: string, values: Array<string | null | undefined>) {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "documento-registrado":
      return "Documento registrado com sucesso. A base do caso, o historico e a fila de notificacao ficaram alinhados.";
    case "solicitacao-criada":
      return "Solicitacao de documento criada com sucesso. O cliente ja pode acompanhar a pendencia no portal.";
    case "solicitacao-concluida":
      return "Pendencia documental concluida com sucesso. O portal ja refletiu essa mudanca.";
    case "solicitacao-cancelada":
      return "Solicitacao cancelada com sucesso. A equipe e o cliente passam a ver o novo estado.";
    case "documento-enviado":
      return "Documento enviado com sucesso. A equipe recebeu e vai analisar em breve.";
    default:
      return "";
  }
}

function buildDocumentHref(documentId: string, asDownload = false) {
  return asDownload ? `/api/documents/${documentId}?download=1` : `/api/documents/${documentId}`;
}

function canPreviewDocument(mimeType: string | null | undefined) {
  return !!mimeType && (mimeType === "application/pdf" || mimeType.startsWith("image/"));
}

async function registerDocumentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);
  const uploadedFile = formData.get("file");

  try {
    await registerCaseDocument(
      {
        caseId: formData.get("caseId"),
        requestId: formData.get("requestId"),
        category: formData.get("category"),
        description: formData.get("description"),
        status: formData.get("status"),
        documentDate: formData.get("documentDate"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id,
      uploadedFile instanceof File ? uploadedFile : null
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-registrar";
    redirect(`/documentos?error=${message}`);
  }

  redirect("/documentos?success=documento-registrado");
}

async function requestDocumentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await requestCaseDocument(
      {
        caseId: formData.get("caseId"),
        title: formData.get("title"),
        instructions: formData.get("instructions"),
        dueAt: formData.get("dueAt"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-solicitar";
    redirect(`/documentos?error=${message}`);
  }

  redirect("/documentos?success=solicitacao-criada");
}

async function updateRequestStatusAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);
  const status = String(formData.get("status") || "completed");

  try {
    await updateDocumentRequestStatus(
      {
        requestId: formData.get("requestId"),
        status,
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
    );
  } catch (error) {
    const message =
      error instanceof Error ? encodeURIComponent(error.message) : "erro-ao-atualizar-solicitacao";
    redirect(`/documentos?error=${message}`);
  }

  redirect(
    `/documentos?success=${
      status === "completed" ? "solicitacao-concluida" : "solicitacao-cancelada"
    }`
  );
}

async function submitClientDocumentAction(
  _prevState: ClientUploadState,
  formData: FormData
): Promise<ClientUploadState> {
  "use server";

  // requireProfile redirects to login if session expired — correct behavior
  const profile = await requireProfile(["cliente"]);
  const requestId = String(formData.get("requestId") || "").trim();
  const uploadedFile = formData.get("file");

  if (!requestId) {
    return { status: "error", message: "Solicitacao nao identificada. Recarregue a pagina e tente novamente." };
  }

  try {
    await submitClientDocument(
      requestId,
      profile.id,
      uploadedFile instanceof File ? uploadedFile : null
    );
    return { status: "success" };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar o documento. Tente novamente."
    };
  }
}

export default async function DocumentsPage({
  searchParams
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile(["cliente", "advogada", "admin"]);

  if (isStaffRole(profile.role)) {
    const overview = await getStaffOverview();
    const params = searchParams ? await searchParams : {};
    const rawError =
      typeof params.error === "string" ? decodeURIComponent(params.error) : "";
    const error = getAccessMessage(rawError) || rawError;
    const success =
      typeof params.success === "string" ? getSuccessMessage(params.success) : "";
    const query = getStringParam(params.q);
    const selectedStatus = getStringParam(params.status);
    const selectedClientId = getStringParam(params.clientId);
    const selectedCaseId = getStringParam(params.caseId);
    const pendingOnly = getStringParam(params.pending) === "1";
    const sort = getStringParam(params.sort, "recent");
    const selectedClient =
      overview.clientOptions.find((client) => client.id === selectedClientId) || null;
    const caseOptionsForDocuments = overview.caseOptions.filter(
      (caseItem) => !selectedClientId || caseItem.clientId === selectedClientId
    );
    const selectedCase =
      overview.caseOptions.find((caseItem) => caseItem.id === selectedCaseId) || null;
    const defaultCaseId = selectedCase?.id || caseOptionsForDocuments[0]?.id || undefined;
    const filteredDocuments = overview.latestDocuments
      .filter(
        (document) =>
          matchesSearch(query, [document.file_name, document.caseTitle, document.category]) &&
          (!selectedClientId || document.clientId === selectedClientId) &&
          (!selectedCaseId || document.case_id === selectedCaseId) &&
          (!selectedStatus || document.status === selectedStatus) &&
          (!pendingOnly ||
            document.status === "pendente" ||
            document.status === "solicitado")
      )
      .sort((left, right) =>
        sort === "oldest"
          ? left.document_date.localeCompare(right.document_date)
          : right.document_date.localeCompare(left.document_date)
      );
    const filteredRequests = overview.latestDocumentRequests
      .filter(
        (request) =>
          matchesSearch(query, [request.title, request.caseTitle, request.statusLabel]) &&
          (!selectedClientId || request.clientId === selectedClientId) &&
          (!selectedCaseId || request.case_id === selectedCaseId) &&
          (!pendingOnly || request.status === "pending")
      )
      .sort((left, right) =>
        sort === "oldest"
          ? left.created_at.localeCompare(right.created_at)
          : right.created_at.localeCompare(left.created_at)
      );
    const hasCases = caseOptionsForDocuments.length > 0;
    const hasFilters = !!(
      query ||
      selectedStatus ||
      selectedClientId ||
      selectedCaseId ||
      pendingOnly ||
      sort !== "recent"
    );
    const openRequests = filteredRequests.filter((request) => request.status === "pending");

    return (
      <AppFrame
        eyebrow="Documentos"
        title="Central de documentos clara para registro, solicitacao e acompanhamento."
        description="Aqui a equipe organiza uploads reais, pendencias documentais e pedidos ao cliente em um fluxo direto e facil de operar."
        utilityContent={
          <PortalSessionBanner
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            workspaceLabel="Documentos internos protegidos"
            workspaceHint="Sessao interna ativa para uploads, solicitacoes e leitura documental."
          />
        }
        navigation={[
          {
            href: selectedClient ? buildInternalClientHref(selectedClient.id) : "/internal/advogada",
            label: selectedClient ? "Cliente" : "Painel"
          },
          ...(selectedCase ? [{ href: buildInternalCaseHref(selectedCase.id), label: "Caso" }] : []),
          { href: "/documentos", label: "Documentos", active: true },
          {
            href: selectedClient
              ? buildInternalAgendaHref(selectedClient.id, selectedCase?.id || null)
              : "/agenda",
            label: "Agenda"
          }
        ]}
        highlights={[
          { label: "Documentos recentes", value: String(filteredDocuments.length) },
          { label: "Solicitacoes abertas", value: String(openRequests.length) },
          {
            label: "Pendencias documentais",
            value: String(
              filteredDocuments.filter(
                (document) =>
                  document.status === "pendente" || document.status === "solicitado"
              ).length
            )
          },
          { label: "Notificacoes pendentes", value: String(overview.pendingNotifications) }
        ]}
        actions={[
          { href: "#registrar-documento", label: "Registrar documento" },
          { href: "#solicitar-documento", label: "Solicitar documento", tone: "secondary" },
          ...(selectedCase
            ? [{ href: buildInternalCaseHref(selectedCase.id), label: "Abrir caso", tone: "secondary" as const }]
            : []),
          selectedClient
            ? {
                href: buildInternalClientHref(selectedClient.id),
                label: "Abrir ficha",
                tone: "secondary" as const
              }
            : {
                href: "/internal/advogada#cadastro-cliente",
                label: "Cadastrar cliente",
                tone: "secondary" as const
              }
        ]}
      >
        {error ? (
          <PremiumStatePanel
            tone="error"
            eyebrow="Documentos internos"
            title="A central documental precisa de atencao."
            description={error}
          />
        ) : null}
        {success ? (
          <PremiumStatePanel
            tone="success"
            eyebrow="Documentos internos"
            title="Fluxo documental atualizado com sucesso."
            description={success}
          />
        ) : null}

        <SectionCard
          title="Leitura executiva de documentos"
          description="A central destaca o que ja entrou, o que ainda depende de envio e onde a carteira documental pede acao imediata."
        >
          <div className="grid four">
            <PremiumFeatureCard
              eyebrow="Documentos recentes"
              title={`${filteredDocuments.length} item(ns) na leitura`}
              description="Arquivos e registros que a equipe pode revisar, complementar ou disponibilizar sem dispersar a operacao."
            />
            <PremiumFeatureCard
              eyebrow="Solicitacoes abertas"
              title={`${openRequests.length} pedido(s) ativos`}
              description="Pendencias documentais que ainda dependem de resposta do cliente ou fechamento interno."
            />
            <PremiumFeatureCard
              eyebrow="Casos em foco"
              title={`${caseOptionsForDocuments.length} caso(s) no recorte`}
              description="A carteira documental segue o mesmo foco de cliente e caso para manter contexto operacional."
            />
            <PremiumFeatureCard
              eyebrow="Notificacoes"
              title={`${overview.pendingNotifications} envio(s) pendente(s)`}
              description="Mensagens futuras ligadas a mudancas documentais que ainda precisam ser confirmadas."
            />
          </div>
        </SectionCard>

        <SafeModuleCard
          title="Busca e filtros"
          description="Refine a leitura por cliente, caso ou status sem perder a visao do que esta travando a carteira documental."
        >
          <form className="stack">
            <div className="fields">
              <div className="field-full">
                <label htmlFor="documents-q">Buscar por cliente, caso ou documento</label>
                <input
                  id="documents-q"
                  name="q"
                  type="search"
                  defaultValue={query}
                  placeholder="Nome do cliente, titulo do pedido, tipo do documento"
                />
              </div>
              <div className="field">
                <label htmlFor="documents-status">Status do documento</label>
                <select id="documents-status" name="status" defaultValue={selectedStatus}>
                  <option value="">Todos os status</option>
                  {documentStatuses.map((status) => (
                    <option key={status} value={status}>
                      {documentStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="documents-client">Cliente</label>
                <select id="documents-client" name="clientId" defaultValue={selectedClientId}>
                  <option value="">Todos os clientes</option>
                  {overview.clientOptions.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="documents-case">Caso</label>
                <select id="documents-case" name="caseId" defaultValue={selectedCaseId}>
                  <option value="">Todos os casos</option>
                  {caseOptionsForDocuments.map((caseItem) => (
                    <option key={caseItem.id} value={caseItem.id}>
                      {caseItem.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="documents-sort">Ordenacao</label>
                <select id="documents-sort" name="sort" defaultValue={sort}>
                  <option value="recent">Mais recentes primeiro</option>
                  <option value="oldest">Mais antigos primeiro</option>
                </select>
              </div>
            </div>
            {selectedClient || selectedCase ? (
              <div className="notice">
                {selectedClient
                  ? `${selectedClient.fullName} esta no foco desta central documental.`
                  : "Filtro de cliente ativo."}{" "}
                {selectedCase ? `Caso selecionado: ${selectedCase.title}.` : ""}
              </div>
            ) : null}
            <label className="checkbox-row" htmlFor="documents-pending">
              <input
                id="documents-pending"
                name="pending"
                type="checkbox"
                value="1"
                defaultChecked={pendingOnly}
              />
              Mostrar apenas pendencias e solicitacoes abertas
            </label>
            <div className="form-actions">
              <button className="button secondary" type="submit">
                Aplicar filtros
              </button>
              <a className="button secondary" href="/documentos">
                Limpar filtros
              </a>
              {selectedClient ? (
                <Link className="button secondary" href={buildInternalClientHref(selectedClient.id)}>
                  Voltar para o cliente
                </Link>
              ) : null}
            </div>
          </form>
        </SafeModuleCard>

        <div className="grid two">
          <SectionCard
            id="registrar-documento"
            title="Registrar documento do caso"
            description="Envie o arquivo real, vincule ao caso e mantenha o historico e a fila de notificacoes alinhados quando o item for visivel ao cliente."
          >
            <form action={registerDocumentAction} className="stack" encType="multipart/form-data">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="caseId">Caso</label>
                  <select
                    id="caseId"
                    name="caseId"
                    required
                    disabled={!hasCases}
                    defaultValue={defaultCaseId}
                  >
                    {hasCases ? (
                      caseOptionsForDocuments.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.title} - {caseItem.clientName} - {caseItem.statusLabel}
                        </option>
                      ))
                    ) : (
                      <option value="">Cadastre um cliente para abrir o primeiro caso</option>
                    )}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="file">Arquivo</label>
                  <input
                    id="file"
                    name="file"
                    type="file"
                    accept={documentUploadAccept}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="category">Tipo</label>
                  <input id="category" name="category" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="status">Status</label>
                  <select id="status" name="status" required defaultValue="recebido">
                    {documentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {documentStatusLabels[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="documentDate">Data</label>
                  <input
                    id="documentDate"
                    name="documentDate"
                    type="datetime-local"
                    defaultValue={buildDefaultDateTimeValue()}
                    required
                  />
                </div>
                <div className="field-full">
                  <label htmlFor="requestId">Concluir solicitacao relacionada</label>
                  <select id="requestId" name="requestId" defaultValue="">
                    <option value="">Nenhuma solicitacao vinculada</option>
                    {openRequests.map((request) => (
                      <option key={request.id} value={request.id}>
                        {request.title} - {request.caseTitle}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="description">Descricao curta</label>
                  <textarea id="description" name="description" />
                </div>
              </div>
              <label className="checkbox-row" htmlFor="visibleToClient">
                <input
                  id="visibleToClient"
                  name="visibleToClient"
                  type="checkbox"
                  defaultChecked
                />
                Documento visivel para o cliente
              </label>
              <label className="checkbox-row" htmlFor="shouldNotifyClient">
                <input
                  id="shouldNotifyClient"
                  name="shouldNotifyClient"
                  type="checkbox"
                  defaultChecked
                />
                Preparar notificacao por e-mail para este documento
              </label>
              <div className="notice">
                O upload envia o arquivo para o storage privado do portal, grava o documento e pode concluir uma pendencia aberta na mesma operacao.
              </div>
              <div className="form-actions">
                <FormSubmitButton pendingLabel="Registrando documento..." disabled={!hasCases}>
                  Registrar documento
                </FormSubmitButton>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            id="solicitar-documento"
            title="Solicitar documento ao cliente"
            description="Abra uma pendencia documental formal, com prazo e visibilidade controlados para o cliente."
          >
            <form action={requestDocumentAction} className="stack">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="requestCaseId">Caso</label>
                  <select
                    id="requestCaseId"
                    name="caseId"
                    required
                    disabled={!hasCases}
                    defaultValue={defaultCaseId}
                  >
                    {hasCases ? (
                      caseOptionsForDocuments.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.title} - {caseItem.clientName} - {caseItem.statusLabel}
                        </option>
                      ))
                    ) : (
                      <option value="">Cadastre um cliente para abrir o primeiro caso</option>
                    )}
                  </select>
                </div>
                <div className="field-full">
                  <label htmlFor="title">Documento solicitado</label>
                  <input id="title" name="title" type="text" required />
                </div>
                <div className="field">
                  <label htmlFor="dueAt">Prazo sugerido</label>
                  <input id="dueAt" name="dueAt" type="datetime-local" />
                </div>
                <div className="field-full">
                  <label htmlFor="instructions">Orientacoes para o cliente</label>
                  <textarea id="instructions" name="instructions" />
                </div>
              </div>
              <label className="checkbox-row" htmlFor="requestVisibleToClient">
                <input
                  id="requestVisibleToClient"
                  name="visibleToClient"
                  type="checkbox"
                  defaultChecked
                />
                Solicitacao visivel para o cliente
              </label>
              <label className="checkbox-row" htmlFor="requestShouldNotifyClient">
                <input
                  id="requestShouldNotifyClient"
                  name="shouldNotifyClient"
                  type="checkbox"
                  defaultChecked
                />
                Preparar notificacao por e-mail para esta solicitacao
              </label>
              <div className="notice">
                A pendencia fica registrada no caso e, quando estiver visivel ao cliente, tambem aparece no acompanhamento dele.
              </div>
              <div className="form-actions">
                <FormSubmitButton pendingLabel="Criando solicitacao..." disabled={!hasCases}>
                  Criar solicitacao
                </FormSubmitButton>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="grid two">
          <SectionCard
            title="Documentos recentes"
            description="A equipe acompanha o status operacional de cada documento por caso."
          >
            {filteredDocuments.length ? (
              <ul className="update-feed">
                {filteredDocuments.slice(0, 12).map((document) => (
                  <li key={document.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{document.file_name}</strong>
                        <span className="item-meta">{document.caseTitle}</span>
                      </div>
                      <span className="tag soft">{document.category}</span>
                    </div>
                    <div className="pill-row">
                      <span
                        className={`pill ${
                          document.status === "recebido" || document.status === "revisado"
                            ? "success"
                            : "warning"
                        }`}
                      >
                        {document.statusLabel}
                      </span>
                      <span
                        className={`pill ${
                          document.visibility === "client" ? "success" : "muted"
                        }`}
                      >
                        {document.visibility === "client" ? "Visivel ao cliente" : "Uso interno"}
                      </span>
                      <span className="pill muted">
                        {document.storage_path ? "Arquivo enviado" : "Sem arquivo"}
                      </span>
                    </div>
                    <span className="item-meta">
                      {formatPortalDateTime(document.document_date)}
                      {document.file_size_bytes
                        ? ` - ${formatFileSize(document.file_size_bytes)}`
                        : ""}
                    </span>
                    <div className="form-actions">
                      {document.storage_path ? (
                        <>
                          {canPreviewDocument(document.mime_type) ? (
                            <a
                              className="button secondary"
                              href={buildDocumentHref(document.id)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Visualizar arquivo
                            </a>
                          ) : null}
                          <a
                            className="button secondary"
                            href={buildDocumentHref(document.id, true)}
                          >
                            Baixar arquivo
                          </a>
                        </>
                      ) : (
                        <span className="item-meta">
                          Arquivo ainda nao enviado para este registro.
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                {hasFilters
                  ? "Nenhum documento corresponde aos filtros atuais."
                  : "Os documentos registrados para os casos aparecerao aqui."}
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Solicitacoes abertas"
            description="Acompanhe o que ainda esta pendente junto ao cliente."
          >
            {openRequests.length ? (
              <ul className="update-feed">
                {openRequests.slice(0, 12).map((request) => (
                  <li key={request.id} className="update-card">
                    <div className="update-head">
                      <div>
                        <strong>{request.title}</strong>
                        <span className="item-meta">{request.caseTitle}</span>
                      </div>
                      <span className="tag soft">{request.statusLabel}</span>
                    </div>
                    <div className="pill-row">
                      <span
                        className={`pill ${
                          request.visible_to_client ? "success" : "muted"
                        }`}
                      >
                        {request.visible_to_client ? "Cliente acompanha" : "Somente equipe"}
                      </span>
                      <span className="pill muted">
                        {request.due_at
                          ? `Prazo ${formatPortalDateTime(request.due_at)}`
                          : "Sem prazo definido"}
                      </span>
                    </div>
                    <span className="item-meta">
                      Aberta em {formatPortalDateTime(request.created_at)}
                    </span>
                    <div className="form-actions">
                      <form action={updateRequestStatusAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value="completed" />
                        <input type="hidden" name="shouldNotifyClient" value="on" />
                        <FormSubmitButton pendingLabel="Concluindo pendencia..." tone="secondary">
                          Concluir pendencia
                        </FormSubmitButton>
                      </form>
                      <form action={updateRequestStatusAction}>
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="status" value="cancelled" />
                        <input type="hidden" name="shouldNotifyClient" value="on" />
                        <FormSubmitButton
                          pendingLabel="Cancelando solicitacao..."
                          tone="danger"
                          confirmMessage="Tem certeza que deseja cancelar esta solicitacao?"
                        >
                          Cancelar solicitacao
                        </FormSubmitButton>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <PremiumStatePanel
                tone="neutral"
                eyebrow="Solicitacoes"
                title="Nenhuma solicitacao aberta nesta leitura."
                description={
                  hasFilters
                    ? "Os filtros atuais nao retornaram pedidos documentais pendentes."
                    : "Quando uma nova pendencia documental for criada, ela vai aparecer aqui para acompanhamento imediato."
                }
              />
            )}
          </SectionCard>
        </div>
      </AppFrame>
    );
  }

  const [documentsSummary, requestsSummary] = await Promise.all([
    getClientDocumentsSummary(profile),
    getClientRequestsSummary(profile)
  ]);
  const params = searchParams ? await searchParams : {};
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const successKey = typeof params.success === "string" ? params.success : "";
  const success = getSuccessMessage(successKey);
  const query = getStringParam(params.q);
  const scope = getStringParam(params.scope, "all");
  const sort = getStringParam(params.sort, "recent");
  const hasFilters = !!(query || scope !== "all" || sort !== "recent");
  const sortDocuments = <T extends { created_at: string }>(items: T[]) =>
    [...items].sort((left, right) =>
      sort === "oldest"
        ? left.created_at.localeCompare(right.created_at)
        : right.created_at.localeCompare(left.created_at)
    );
  const documentsEnabled = portalFeatures.clientDocuments;
  const requestsEnabled = portalFeatures.clientRequests;
  const availableDocuments = sortDocuments(
    documentsSummary.data.documents.filter(
      (document) =>
        (scope === "all" || scope === "available") &&
        (document.status === "recebido" || document.status === "revisado") &&
        matchesSearch(query, [document.file_name, document.caseTitle, document.category])
    )
  );
  const pendingDocuments = sortDocuments(
    documentsSummary.data.documents.filter(
      (document) =>
        (scope === "all" || scope === "pending") &&
        (document.status === "pendente" || document.status === "solicitado") &&
        matchesSearch(query, [document.file_name, document.caseTitle, document.category])
    )
  );
  const openRequests = sortDocuments(
    requestsSummary.data.documentRequests.filter(
      (request) =>
        (scope === "all" || scope === "requests") &&
        request.status === "pending" &&
        matchesSearch(query, [request.title, request.caseTitle, request.instructions])
    )
  );
  const completedRequests = requestsSummary.data.documentRequests
    .filter((request) => request.status === "completed")
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 8);

  return (
      <AppFrame
        eyebrow="Documentos"
        title="Tudo sobre os documentos do seu caso."
        description="Aqui voce encontra os arquivos liberados pela equipe, responde solicitacoes abertas e acompanha o andamento de cada entrega."
        utilityContent={
          <PortalSessionBanner
            role={profile.role}
            fullName={profile.full_name}
            email={profile.email}
            workspaceLabel="Portal autenticado"
            workspaceHint="Sessao ativa para acompanhar documentos e pendencias do proprio caso."
          />
        }
        navigation={[
          { href: "/cliente", label: "Meu painel" },
          { href: "/documentos", label: "Documentos", active: true },
          { href: "/agenda", label: "Agenda" }
        ]}
        highlights={[
          { label: "Disponiveis", value: String(availableDocuments.length) },
          { label: "Pendencias", value: String(pendingDocuments.length) },
          { label: "Solicitacoes abertas", value: String(openRequests.length) },
          {
            label: "Base segura",
            value: documentsSummary.ok && requestsSummary.ok ? "Ativa" : "Fallback"
          }
        ]}
        actions={[
          ...(openRequests.length > 0
            ? [{ href: "#solicitacoes-abertas", label: "Enviar documento" }]
            : []),
          { href: "/cliente", label: "Meu painel", tone: "secondary" as const },
          { href: "/agenda", label: "Agenda", tone: "secondary" as const }
        ]}
      >
      <ClientPwaInstallPrompt />

      <PremiumSection
        title="Como usar documentos no celular"
        description="Esta pagina foi organizada para consulta rapida, envio simples e leitura clara do que esta disponivel, pendente ou aguardando analise."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PremiumFeatureCard
            eyebrow="Disponiveis"
            title={`${availableDocuments.length} arquivo(s) pronto(s)`}
            description="Arquivos liberados pela equipe para consulta e download quando voce precisar."
          />
          <PremiumFeatureCard
            eyebrow="Envios"
            title={`${openRequests.length} pedido(s) aguardando voce`}
            description="Se houver algum documento importante para o andamento do caso, ele aparece primeiro aqui."
          />
          <PremiumFeatureCard
            eyebrow="Confianca"
            title="Fluxo seguro e objetivo"
            description="O portal mostra com clareza o que ja foi recebido, o que segue em analise e qual e o proximo passo."
          />
        </div>
      </PremiumSection>

      <ClientQuickActions
        title="Atalhos dos documentos"
        description="Retome rapido o que mais importa no celular: enviar, consultar e voltar ao acompanhamento principal."
        items={[
          {
            href: "/cliente",
            label: "Meu painel",
            description: "Voltar ao resumo principal do caso."
          },
          {
            href: "/agenda",
            label: "Agenda",
            description: "Consultar compromissos ligados ao andamento do atendimento."
          },
          {
            href: "#solicitacoes-abertas",
            label: "Enviar agora",
            description: "Ir direto para os pedidos documentais pendentes."
          }
        ]}
      />

      {error ? (
        <PremiumStatePanel
          tone="error"
          eyebrow="Documentos do cliente"
          title="Nao foi possivel carregar seus documentos como esperado."
          description={error}
        />
      ) : null}
      {success ? (
        <PremiumStatePanel
          tone="success"
          eyebrow="Documentos do cliente"
          title="Sua atualizacao documental foi recebida."
          description={success}
        />
      ) : null}

      <SectionCard
        title="Sua leitura executiva documental"
        description="A area de documentos resume o que ja esta liberado, o que ainda depende de envio e o que continua em acompanhamento."
      >
        <div className="grid three">
          <PremiumFeatureCard
            eyebrow="Disponiveis"
            title={`${availableDocuments.length} arquivo(s) liberado(s)`}
            description="Documentos prontos para consulta e download com a mesma base segura do seu portal."
          />
          <PremiumFeatureCard
            eyebrow="Pendencias"
            title={`${pendingDocuments.length} item(ns) em acompanhamento`}
            description="Arquivos que ainda dependem de revisao, liberacao ou complemento para seguir adiante."
          />
          <PremiumFeatureCard
            eyebrow="Solicitacoes"
            title={`${openRequests.length} envio(s) aguardando voce`}
            description="Pedidos documentais ativos para mostrar com clareza qual e o proximo passo do seu caso."
          />
        </div>
      </SectionCard>

      <SafeModuleCard
        title="Encontrar documentos"
        description="Use a busca para localizar documentos, pendencias e solicitacoes com clareza e sem perder o contexto do caso."
      >
        <form className="stack">
          <div className="fields">
            <div className="field-full">
              <label htmlFor="client-documents-q">Buscar documento ou solicitacao</label>
              <input
                id="client-documents-q"
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Nome do documento, tipo ou titulo da solicitacao"
              />
            </div>
            <div className="field">
              <label htmlFor="client-documents-scope">Mostrar</label>
              <select id="client-documents-scope" name="scope" defaultValue={scope}>
                <option value="all">Tudo</option>
                <option value="available">Somente disponiveis</option>
                <option value="pending">Somente pendentes</option>
                <option value="requests">Somente solicitacoes</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="client-documents-sort">Ordenacao</label>
              <select id="client-documents-sort" name="sort" defaultValue={sort}>
                <option value="recent">Mais recentes primeiro</option>
                <option value="oldest">Mais antigos primeiro</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button className="button secondary" type="submit">
              Aplicar filtros
            </button>
            <a className="button secondary" href="/documentos">
              Limpar filtros
            </a>
          </div>
        </form>
      </SafeModuleCard>

      <div className="grid two">
        <SectionCard
          id="documentos-disponiveis"
          title="Documentos disponíveis"
          description="Arquivos liberados pela equipe para consulta e download na sua area do portal."
        >
          {!documentsEnabled ? (
            <PremiumStatePanel
              tone="warning"
              eyebrow="Documentos"
              title="Este modulo esta temporariamente pausado."
              description="A visualizacao de documentos foi desligada por configuracao e volta a aparecer assim que a disponibilidade for retomada."
            />
          ) : !documentsSummary.ok && !availableDocuments.length ? (
            <PremiumStatePanel
              tone="warning"
              eyebrow="Documentos"
              title="Estamos mostrando seus documentos em modo seguro."
              description={`Motivo: ${documentsSummary.reason || "dados indisponiveis"}.`}
            />
          ) : availableDocuments.length ? (
            <ul className="update-feed">
              {availableDocuments.map((document) => (
                <li key={document.id} className="update-card featured">
                  <div className="update-head">
                    <div>
                      <strong>{document.file_name}</strong>
                      <span className="item-meta">{document.caseTitle}</span>
                    </div>
                    <span className="tag soft">{document.category}</span>
                  </div>
                  <p className="update-body">
                    {document.description || "Documento registrado e liberado pela equipe."}
                  </p>
                  <div className="pill-row">
                    <span className="pill success">
                      {document.status === "revisado" ? "Aprovado pela equipe" : "Disponível"}
                    </span>
                    <span className="pill muted">
                      {formatPortalDateTime(document.document_date)}
                      {document.file_size_bytes
                        ? ` — ${formatFileSize(document.file_size_bytes)}`
                        : ""}
                    </span>
                  </div>
                  <div className="form-actions">
                    {document.storage_path ? (
                      <>
                        {canPreviewDocument(document.mime_type) ? (
                          <a
                            className="button secondary"
                            href={buildDocumentHref(document.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visualizar arquivo
                          </a>
                        ) : null}
                        <a
                          className="button secondary"
                          href={buildDocumentHref(document.id, true)}
                        >
                          Baixar arquivo
                        </a>
                      </>
                    ) : (
                      <span className="item-meta">Arquivo ainda indisponivel no portal.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PremiumStatePanel
              tone="neutral"
              eyebrow="Documentos disponiveis"
              title="Nenhum arquivo liberado apareceu nesta leitura."
              description={
                hasFilters
                  ? "Os filtros atuais nao trouxeram documentos disponiveis para consulta."
                  : "Assim que a equipe liberar um arquivo para o seu portal, ele aparecera aqui com clareza e contexto."
              }
            />
          )}
        </SectionCard>

        <SectionCard
          id="documentos-pendentes"
          title="Em acompanhamento"
          description="Documentos que a equipe registrou como pendentes ou em revisao para o seu caso."
        >
          {pendingDocuments.length ? (
            <ul className="update-feed">
              {pendingDocuments.map((document) => (
                <li key={document.id} className="update-card">
                  <div className="update-head">
                    <div>
                      <strong>{document.file_name}</strong>
                      <span className="item-meta">{document.caseTitle}</span>
                    </div>
                    <span className="tag soft">{document.category}</span>
                  </div>
                  <p className="update-body">
                    {document.description || "A equipe registrou este documento como pendente."}
                  </p>
                  <div className="pill-row">
                    <span className="pill warning">{document.statusLabel}</span>
                    <span className="pill muted">
                      {formatPortalDateTime(document.document_date)}
                      {document.file_size_bytes
                        ? ` - ${formatFileSize(document.file_size_bytes)}`
                        : ""}
                    </span>
                  </div>
                  <div className="form-actions">
                    {document.storage_path ? (
                      <>
                        {canPreviewDocument(document.mime_type) ? (
                          <a
                            className="button secondary"
                            href={buildDocumentHref(document.id)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Visualizar arquivo
                          </a>
                        ) : null}
                        <a
                          className="button secondary"
                          href={buildDocumentHref(document.id, true)}
                        >
                          Baixar arquivo
                        </a>
                      </>
                    ) : (
                      <span className="item-meta">Arquivo ainda indisponivel no portal.</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PremiumStatePanel
              tone="neutral"
              eyebrow="Em acompanhamento"
              title="Nenhuma pendencia documental apareceu nesta leitura."
              description={
                hasFilters
                  ? "Os filtros atuais nao retornaram documentos pendentes ou solicitados."
                  : "Quando houver itens em revisao, pendencia ou solicitacao, eles vao aparecer aqui para acompanhamento claro."
              }
            />
          )}
        </SectionCard>
      </div>

      <SectionCard
        id="solicitacoes-abertas"
        title="Documentos aguardando envio"
        description="A equipe precisa destes arquivos para avançar com o seu caso. O envio e seguro e leva menos de um minuto."
      >
        {!requestsEnabled ? (
          <PremiumStatePanel
            tone="warning"
            eyebrow="Solicitacoes"
            title="As solicitacoes estao temporariamente pausadas."
            description="Esta etapa volta a ficar disponivel assim que a configuracao do modulo for retomada."
          />
        ) : !requestsSummary.ok && !openRequests.length ? (
          <PremiumStatePanel
            tone="warning"
            eyebrow="Solicitacoes"
            title="Estamos mostrando as solicitacoes em modo seguro."
            description={`Motivo: ${requestsSummary.reason || "dados indisponiveis"}.`}
          />
        ) : openRequests.length ? (
          <ClientModuleBoundary
            title="Upload temporariamente indisponivel"
            description="O cartao de envio falhou localmente, mas a pagina continua carregada com seguranca."
          >
          <ul className="update-feed">
            {openRequests.map((request) => (
              <li
                key={request.id}
                className="update-card"
                style={{ gap: "20px", padding: "24px 26px" }}
              >
                {/* Card header */}
                <div className="update-head" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: "1.08rem" }}>{request.title}</strong>
                    <span className="item-meta">{request.caseTitle}</span>
                  </div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "5px 12px",
                      borderRadius: "999px",
                      background: "rgba(142, 106, 59, 0.1)",
                      color: "var(--accent-strong)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        background: "var(--accent)",
                        display: "inline-block",
                      }}
                    />
                    Aguardando envio
                  </span>
                </div>

                <ClientDocumentUploadCard
                  requestId={request.id}
                  requestTitle={request.title}
                  instructions={request.instructions ?? null}
                  dueAtLabel={request.due_at ? formatPortalDateTime(request.due_at) : null}
                  uploadAction={submitClientDocumentAction}
                />
              </li>
            ))}
          </ul>
          </ClientModuleBoundary>
        ) : (
          <PremiumStatePanel
            tone="neutral"
            eyebrow="Solicitacoes abertas"
            title="Nenhuma acao documental esta pendente agora."
            description={
              hasFilters
                ? "Os filtros atuais nao trouxeram solicitacoes abertas."
                : "Quando a equipe precisar de um novo documento, o pedido aparecera aqui com orientacao clara do proximo passo."
            }
          />
        )}
      </SectionCard>

      {requestsEnabled && completedRequests.length > 0 ? (
        <SectionCard
          title="Histórico de envios"
          description="Documentos que voce ja enviou ao escritorio. A equipe confirma o recebimento e te avisa."
        >
          <ul className="update-feed compact">
            {completedRequests.map((request) => (
              <li key={request.id} className="update-card" style={{ padding: "16px 20px", gap: "10px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
                    <span
                      aria-hidden="true"
                      style={{
                        flexShrink: 0,
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "rgba(41, 93, 69, 0.1)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "15px",
                        color: "var(--success)",
                      }}
                    >
                      ✓
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p
                        style={{
                          margin: "0 0 2px",
                          fontWeight: 700,
                          fontSize: "0.93rem",
                          color: "var(--text)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {request.title}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                        {request.caseTitle} · {formatPortalDateTime(request.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="pill success" style={{ flexShrink: 0 }}>
                    Recebido
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </SectionCard>
      ) : null}

      <div className="h-24 md:hidden" aria-hidden="true" />
      <ClientMobileDock />
      </AppFrame>
  );
}
