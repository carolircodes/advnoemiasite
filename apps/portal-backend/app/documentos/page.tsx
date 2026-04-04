import { redirect } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { SectionCard } from "@/components/section-card";
import { getAccessMessage } from "@/lib/auth/access-control";
import { isStaffRole, requireProfile } from "@/lib/auth/guards";
import {
  documentRequestStatusLabels,
  documentStatuses,
  documentStatusLabels,
  formatPortalDateTime
} from "@/lib/domain/portal";
import { getClientWorkspace, getStaffOverview } from "@/lib/services/dashboard";
import {
  registerCaseDocument,
  requestCaseDocument
} from "@/lib/services/manage-documents";

function buildDefaultDateTimeValue() {
  const now = new Date();
  const localValue = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localValue.toISOString().slice(0, 16);
}

function getSuccessMessage(success: string) {
  switch (success) {
    case "documento-registrado":
      return "Documento registrado com sucesso. A base do caso, o historico e a fila de notificacao ficaram alinhados.";
    case "solicitacao-criada":
      return "Solicitacao de documento criada com sucesso. O cliente ja pode acompanhar a pendencia no portal.";
    default:
      return "";
  }
}

async function registerDocumentAction(formData: FormData) {
  "use server";

  const profile = await requireProfile(["advogada", "admin"]);

  try {
    await registerCaseDocument(
      {
        caseId: formData.get("caseId"),
        fileName: formData.get("fileName"),
        category: formData.get("category"),
        description: formData.get("description"),
        status: formData.get("status"),
        documentDate: formData.get("documentDate"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      profile.id
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
    const hasCases = overview.caseOptions.length > 0;

    return (
      <AppFrame
        eyebrow="Documentos"
        title="Gestao real de documentos e solicitacoes."
        description="A equipe registra documentos, abre pendencias para o cliente e prepara notificacoes futuras na mesma base do caso."
        actions={[
          { href: "/api/internal/documents", label: "API de documentos", tone: "secondary" },
          {
            href: "/api/internal/document-requests",
            label: "API de solicitacoes",
            tone: "secondary"
          }
        ]}
      >
        {error ? <div className="error-notice">{error}</div> : null}
        {success ? <div className="success-notice">{success}</div> : null}

        <div className="metric-grid">
          <div className="metric-card">
            <span>Documentos recentes</span>
            <strong>{overview.latestDocuments.length}</strong>
          </div>
          <div className="metric-card">
            <span>Solicitacoes abertas</span>
            <strong>{overview.openDocumentRequestsCount}</strong>
          </div>
          <div className="metric-card">
            <span>Casos com documentos</span>
            <strong>{overview.caseOptions.length}</strong>
          </div>
          <div className="metric-card">
            <span>E-mails pendentes</span>
            <strong>{overview.pendingNotifications}</strong>
          </div>
        </div>

        <div className="grid two">
          <SectionCard
            title="Registrar documento do caso"
            description="Cadastre o documento, o status e a visibilidade. Se ele for visivel ao cliente, o portal ja registra o evento correspondente."
          >
            <form action={registerDocumentAction} className="stack">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="caseId">Caso</label>
                  <select id="caseId" name="caseId" required disabled={!hasCases}>
                    {hasCases ? (
                      overview.caseOptions.map((caseItem) => (
                        <option key={caseItem.id} value={caseItem.id}>
                          {caseItem.title} - {caseItem.clientName} - {caseItem.statusLabel}
                        </option>
                      ))
                    ) : (
                      <option value="">Cadastre um cliente para abrir o primeiro caso</option>
                    )}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="fileName">Nome do documento</label>
                  <input id="fileName" name="fileName" type="text" required />
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
                O registro e real e fica vinculado ao caso. O upload do arquivo pode entrar depois sem mudar o fluxo operacional.
              </div>
              <div className="form-actions">
                <button className="button" type="submit" disabled={!hasCases}>
                  Registrar documento
                </button>
              </div>
            </form>
          </SectionCard>

          <SectionCard
            title="Solicitar documento ao cliente"
            description="Abra uma pendencia documental formal, com prazo e visibilidade controlados para o cliente."
          >
            <form action={requestDocumentAction} className="stack">
              <div className="fields">
                <div className="field-full">
                  <label htmlFor="requestCaseId">Caso</label>
                  <select id="requestCaseId" name="caseId" required disabled={!hasCases}>
                    {hasCases ? (
                      overview.caseOptions.map((caseItem) => (
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
                A pendencia fica gravada em `document_requests` e tambem alimenta o historico do caso quando estiver visivel ao cliente.
              </div>
              <div className="form-actions">
                <button className="button" type="submit" disabled={!hasCases}>
                  Criar solicitacao
                </button>
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="grid two">
          <SectionCard
            title="Documentos recentes"
            description="A equipe acompanha o status operacional de cada documento por caso."
          >
            {overview.latestDocuments.length ? (
              <ul className="update-feed">
                {overview.latestDocuments.map((document) => (
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
                    </div>
                    <span className="item-meta">
                      {formatPortalDateTime(document.document_date)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                Os documentos registrados para os casos aparecerao aqui.
              </p>
            )}
          </SectionCard>

          <SectionCard
            title="Solicitacoes abertas"
            description="Acompanhe o que ainda esta pendente junto ao cliente."
          >
            {overview.latestDocumentRequests.length ? (
              <ul className="update-feed">
                {overview.latestDocumentRequests.map((request) => (
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
                  </li>
                ))}
              </ul>
            ) : (
              <p className="empty-state">
                As solicitacoes documentais abertas aparecerao aqui.
              </p>
            )}
          </SectionCard>
        </div>
      </AppFrame>
    );
  }

  const workspace = await getClientWorkspace(profile);
  const params = searchParams ? await searchParams : {};
  const rawError = typeof params.error === "string" ? decodeURIComponent(params.error) : "";
  const error = getAccessMessage(rawError) || rawError;
  const availableDocuments = workspace.documents.filter(
    (document) => document.status === "recebido" || document.status === "revisado"
  );
  const pendingDocuments = workspace.documents.filter(
    (document) => document.status === "pendente" || document.status === "solicitado"
  );
  const openRequests = workspace.documentRequests.filter((request) => request.status === "pending");

  return (
    <AppFrame
      eyebrow="Documentos"
      title="Documentos e pendencias do seu caso."
      description="Aqui voce acompanha os documentos liberados pela equipe, as pendencias documentais e as solicitacoes abertas do seu atendimento."
    >
      {error ? <div className="error-notice">{error}</div> : null}
      <div className="metric-grid">
        <div className="metric-card">
          <span>Disponiveis</span>
          <strong>{availableDocuments.length}</strong>
        </div>
        <div className="metric-card">
          <span>Pendentes</span>
          <strong>{pendingDocuments.length}</strong>
        </div>
        <div className="metric-card">
          <span>Solicitacoes abertas</span>
          <strong>{openRequests.length}</strong>
        </div>
        <div className="metric-card">
          <span>Total visivel</span>
          <strong>{workspace.documents.length + workspace.documentRequests.length}</strong>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Documentos disponiveis"
          description="Arquivos ja liberados para consulta na sua area do cliente."
        >
          {availableDocuments.length ? (
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
                    <span className="pill success">{document.statusLabel}</span>
                    <span className="pill muted">
                      {formatPortalDateTime(document.document_date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Nenhum documento foi liberado para o seu portal ate o momento.
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Documentos pendentes"
          description="Itens documentais que ainda dependem de envio, revisao ou retorno."
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
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              Nenhuma pendencia documental visivel foi registrada no momento.
            </p>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Solicitacoes abertas"
        description="Pedidos documentais enviados pela equipe e ainda em acompanhamento."
      >
        {openRequests.length ? (
          <ul className="update-feed">
            {openRequests.map((request) => (
              <li key={request.id} className="update-card">
                <div className="update-head">
                  <div>
                    <strong>{request.title}</strong>
                    <span className="item-meta">{request.caseTitle}</span>
                  </div>
                  <span className="tag soft">
                    {
                      documentRequestStatusLabels[
                        request.status as keyof typeof documentRequestStatusLabels
                      ]
                    }
                  </span>
                </div>
                <p className="update-body">
                  {request.instructions || "A equipe abriu uma nova solicitacao documental."}
                </p>
                <div className="pill-row">
                  <span className="pill warning">Acao do cliente</span>
                  <span className="pill muted">
                    {request.due_at
                      ? `Prazo ${formatPortalDateTime(request.due_at)}`
                      : "Sem prazo definido"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state">
            Nenhuma solicitacao documental aberta esta visivel para voce agora.
          </p>
        )}
      </SectionCard>
    </AppFrame>
  );
}
