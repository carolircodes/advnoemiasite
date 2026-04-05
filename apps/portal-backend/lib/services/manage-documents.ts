import "server-only";

import { assertStaffActor } from "../auth/guards";
import {
  allowedDocumentExtensions,
  allowedDocumentMimeTypes,
  documentRequestStatusLabels,
  documentStatusLabels,
  formatPortalDateTime,
  registerCaseDocumentSchema,
  requestCaseDocumentSchema,
  updateDocumentRequestStatusSchema
} from "../domain/portal";
import { queueCaseEventNotification } from "../notifications/outbox";
import { createAdminSupabaseClient } from "../supabase/admin";
import { createServerSupabaseClient } from "../supabase/server";

export const CASE_DOCUMENTS_BUCKET = "portal-case-documents";

const fallbackMimeTypeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif"
};

function resolveDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
}

function extractFileExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() || "" : "";
}

function sanitizeStorageSegment(value: string) {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase();

  return normalized.slice(0, 140) || "arquivo";
}

function resolveUploadedFileMimeType(file: File) {
  const extension = extractFileExtension(file.name);

  if (file.type && allowedDocumentMimeTypes.includes(file.type as (typeof allowedDocumentMimeTypes)[number])) {
    return file.type;
  }

  if (extension && fallbackMimeTypeByExtension[extension]) {
    return fallbackMimeTypeByExtension[extension];
  }

  return "";
}

function validateUploadedFile(file: File | null) {
  if (!(file instanceof File) || !file.size) {
    throw new Error("Selecione um arquivo PDF, imagem ou documento para continuar.");
  }

  if (file.size > 20 * 1024 * 1024) {
    throw new Error("O arquivo excede o limite de 20 MB para upload no portal.");
  }

  const extension = extractFileExtension(file.name);
  const hasAllowedExtension = allowedDocumentExtensions.includes(
    extension as (typeof allowedDocumentExtensions)[number]
  );
  const mimeType = resolveUploadedFileMimeType(file);

  if (!hasAllowedExtension || !mimeType) {
    throw new Error(
      "Formato de arquivo nao suportado. Envie PDF, DOC, DOCX, JPG, PNG, WEBP ou GIF."
    );
  }

  return {
    fileName: file.name,
    mimeType,
    extension
  };
}

function buildStoragePath(input: {
  clientId: string;
  caseId: string;
  documentId: string;
  fileName: string;
}) {
  const safeFileName = sanitizeStorageSegment(input.fileName);
  return `clients/${input.clientId}/cases/${input.caseId}/documents/${input.documentId}/${safeFileName}`;
}

async function uploadDocumentFile(input: {
  storagePath: string;
  file: File;
  mimeType: string;
}) {
  const supabase = createAdminSupabaseClient();
  const fileBuffer = Buffer.from(await input.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(CASE_DOCUMENTS_BUCKET)
    .upload(input.storagePath, fileBuffer, {
      contentType: input.mimeType,
      upsert: false
    });

  if (error) {
    throw new Error(`Nao foi possivel enviar o arquivo para o storage: ${error.message}`);
  }
}

async function removeDocumentFile(storagePath: string | null) {
  if (!storagePath) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.storage.from(CASE_DOCUMENTS_BUCKET).remove([storagePath]);

  if (error) {
    console.error("[documents.storage] Failed to remove storage object", {
      storagePath,
      message: error.message
    });
  }
}

function buildDocumentPublicSummary(status: string, description: string) {
  if (description) {
    return description;
  }

  const statusLabel =
    documentStatusLabels[status as keyof typeof documentStatusLabels] || "Registrado";

  return `A equipe liberou um documento no portal com status ${statusLabel.toLowerCase()}.`;
}

async function resolveCaseContext(caseId: string) {
  const supabase = createAdminSupabaseClient();

  const { data: caseRecord, error: caseError } = await supabase
    .from("cases")
    .select("id,client_id,title")
    .eq("id", caseId)
    .single();

  if (caseError || !caseRecord) {
    throw new Error(caseError?.message || "Caso nao encontrado para esta operacao.");
  }

  const { data: clientRecord, error: clientError } = await supabase
    .from("clients")
    .select("id,profile_id")
    .eq("id", caseRecord.client_id)
    .single();

  if (clientError || !clientRecord) {
    throw new Error(clientError?.message || "Cliente nao encontrado para este caso.");
  }

  const { data: profileRecord, error: profileError } = await supabase
    .from("profiles")
    .select("id,email,full_name")
    .eq("id", clientRecord.profile_id)
    .single();

  if (profileError || !profileRecord) {
    throw new Error(profileError?.message || "Perfil do cliente nao encontrado.");
  }

  return {
    supabase,
    caseRecord,
    clientRecord,
    profileRecord
  };
}

async function resolveDocumentRequestContext(requestId: string) {
  const supabase = createAdminSupabaseClient();
  const { data: requestRecord, error: requestError } = await supabase
    .from("document_requests")
    .select("id,case_id,title,status,visible_to_client,due_at")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRecord) {
    throw new Error(requestError?.message || "Solicitacao de documento nao encontrada.");
  }

  const context = await resolveCaseContext(requestRecord.case_id);

  return {
    ...context,
    requestRecord
  };
}

async function createCaseEventForDocumentFlow(input: {
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
  eventType: "new_document" | "document_request" | "case_update";
  title: string;
  description: string;
  publicSummary: string;
  payload: Record<string, unknown>;
  shouldNotifyClient: boolean;
  occurredAt?: string;
}) {
  const supabase = createAdminSupabaseClient();
  const { data: eventRecord, error: eventError } = await supabase
    .from("case_events")
    .insert({
      case_id: input.caseId,
      client_id: input.clientId,
      event_type: input.eventType,
      title: input.title,
      description: input.description || null,
      public_summary: input.publicSummary,
      triggered_by: input.actorProfileId,
      visible_to_client: true,
      should_notify_client: input.shouldNotifyClient,
      occurred_at: input.occurredAt || new Date().toISOString(),
      payload: input.payload
    })
    .select("id")
    .single();

  if (eventError || !eventRecord) {
    throw new Error(
      eventError?.message || "Nao foi possivel registrar o evento do documento no portal."
    );
  }

  let notificationId: string | null = null;

  try {
    if (input.shouldNotifyClient && input.clientEmail) {
      const notification = await queueCaseEventNotification({
        clientProfileId: input.clientProfileId,
        clientEmail: input.clientEmail,
        eventType: input.eventType,
        title: input.title,
        publicSummary: input.publicSummary,
        relatedId: eventRecord.id
      });

      notificationId = notification.id;
    }
  } catch (error) {
    const { error: rollbackEventError } = await supabase
      .from("case_events")
      .delete()
      .eq("id", eventRecord.id);

    if (rollbackEventError) {
      console.error("[documents.activity] Failed to rollback case event", {
        eventId: eventRecord.id,
        message: rollbackEventError.message
      });
    }

    throw error;
  }

  return {
    eventId: eventRecord.id,
    notificationId
  };
}

async function rollbackNotificationAndEvent(eventId: string | null, notificationId: string | null) {
  const supabase = createAdminSupabaseClient();

  if (notificationId) {
    const { error: notificationError } = await supabase
      .from("notifications_outbox")
      .delete()
      .eq("id", notificationId);

    if (notificationError) {
      console.error("[documents.rollback] Failed to rollback notification", {
        notificationId,
        message: notificationError.message
      });
    }
  }

  if (eventId) {
    const { error: eventError } = await supabase.from("case_events").delete().eq("id", eventId);

    if (eventError) {
      console.error("[documents.rollback] Failed to rollback case event", {
        eventId,
        message: eventError.message
      });
    }
  }
}

async function rollbackDocumentRecord(documentId: string | null) {
  if (!documentId) {
    return;
  }

  const supabase = createAdminSupabaseClient();
  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  if (error) {
    console.error("[documents.rollback] Failed to rollback document", {
      documentId,
      message: error.message
    });
  }
}

async function restoreDocumentRequestStatus(requestId: string, status: string) {
  const supabase = createAdminSupabaseClient();
  const { error } = await supabase
    .from("document_requests")
    .update({ status })
    .eq("id", requestId);

  if (error) {
    console.error("[document-requests.restore] Failed to restore request status", {
      requestId,
      status,
      message: error.message
    });
  }
}

export async function registerCaseDocument(
  rawInput: unknown,
  actorProfileId: string,
  uploadedFile: File | null
) {
  await assertStaffActor(actorProfileId);
  const input = registerCaseDocumentSchema.parse(rawInput);
  const file = validateUploadedFile(uploadedFile);
  const documentDate = resolveDateTime(input.documentDate);
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const visibility = visibleToClient ? "client" : "internal";
  const relatedRequestContext = input.requestId
    ? await resolveDocumentRequestContext(input.requestId)
    : null;

  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  if (relatedRequestContext && relatedRequestContext.caseRecord.id !== caseRecord.id) {
    throw new Error("A solicitacao escolhida pertence a outro caso.");
  }

  if (relatedRequestContext && relatedRequestContext.requestRecord.status !== "pending") {
    throw new Error("A solicitacao escolhida ja nao esta pendente.");
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    clientId: clientRecord.id,
    caseId: caseRecord.id,
    documentId,
    fileName: file.fileName
  });

  await uploadDocumentFile({
    storagePath,
    file: uploadedFile as File,
    mimeType: file.mimeType
  });

  const { data: documentRecord, error: documentError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      case_id: caseRecord.id,
      file_name: file.fileName,
      storage_path: storagePath,
      category: input.category,
      description: input.description || null,
      status: input.status,
      document_date: documentDate,
      visibility,
      uploaded_by: actorProfileId,
      mime_type: file.mimeType,
      file_size_bytes: uploadedFile?.size || null
    })
    .select("id,file_name,status,visibility,storage_path,mime_type,file_size_bytes")
    .single();

  if (documentError || !documentRecord) {
    await removeDocumentFile(storagePath);
    throw new Error(documentError?.message || "Nao foi possivel registrar o documento.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;
  let resolvedRequestId: string | null = null;
  let previousRequestStatus: string | null = null;

  try {
    if (relatedRequestContext) {
      previousRequestStatus = relatedRequestContext.requestRecord.status;
      const { error: requestUpdateError } = await supabase
        .from("document_requests")
        .update({ status: "completed" })
        .eq("id", relatedRequestContext.requestRecord.id);

      if (requestUpdateError) {
        throw new Error(
          requestUpdateError.message ||
            "Nao foi possivel concluir a solicitacao relacionada a este documento."
        );
      }

      resolvedRequestId = relatedRequestContext.requestRecord.id;
    }

    if (visibleToClient) {
      const activity = await createCaseEventForDocumentFlow({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        eventType: "new_document",
        title: `Novo documento disponivel: ${file.fileName}`,
        description: input.description,
        publicSummary: buildDocumentPublicSummary(input.status, input.description),
        payload: {
          source: "documentos",
          documentId: documentRecord.id,
          requestId: resolvedRequestId,
          documentStatus: input.status,
          category: input.category,
          mimeType: file.mimeType,
          fileSizeBytes: uploadedFile?.size || null
        },
        shouldNotifyClient,
        occurredAt: documentDate
      });

      eventId = activity.eventId;
      notificationId = activity.notificationId;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: actorProfileId,
      action: "documents.create",
      entity_type: "documents",
      entity_id: documentRecord.id,
      payload: {
        caseId: caseRecord.id,
        caseTitle: caseRecord.title,
        status: input.status,
        visibility,
        requestId: resolvedRequestId,
        storagePath,
        mimeType: file.mimeType,
        fileSizeBytes: uploadedFile?.size || null,
        eventId,
        notificationId
      }
    });

    if (auditError) {
      throw new Error(`Nao foi possivel registrar a auditoria do documento: ${auditError.message}`);
    }
  } catch (error) {
    console.error("[documents.create] Rolling back document after downstream failure", {
      caseId: caseRecord.id,
      documentId: documentRecord.id,
      storagePath,
      eventId,
      notificationId,
      resolvedRequestId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);
    if (resolvedRequestId && previousRequestStatus) {
      await restoreDocumentRequestStatus(resolvedRequestId, previousRequestStatus);
    }
    await rollbackDocumentRecord(documentRecord.id);
    await removeDocumentFile(storagePath);
    throw error;
  }

  return {
    documentId: documentRecord.id,
    storagePath,
    resolvedRequestId,
    eventId,
    notificationId
  };
}

export async function requestCaseDocument(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = requestCaseDocumentSchema.parse(rawInput);
  const dueAt = input.dueAt ? resolveDateTime(input.dueAt) : null;
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;

  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  const { data: requestRecord, error: requestError } = await supabase
    .from("document_requests")
    .insert({
      case_id: caseRecord.id,
      requested_by: actorProfileId,
      title: input.title,
      instructions: input.instructions || null,
      due_at: dueAt,
      status: "pending",
      visible_to_client: visibleToClient
    })
    .select("id,title,status")
    .single();

  if (requestError || !requestRecord) {
    throw new Error(requestError?.message || "Nao foi possivel criar a solicitacao.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (visibleToClient) {
      const dueSummary = dueAt ? ` Prazo sugerido: ${formatPortalDateTime(dueAt)}.` : "";
      const publicSummary =
        (input.instructions || "A equipe solicitou um novo documento para o seu caso.") +
        dueSummary;
      const activity = await createCaseEventForDocumentFlow({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        eventType: "document_request",
        title: `Solicitacao de documento: ${input.title}`,
        description: input.instructions,
        publicSummary,
        payload: {
          source: "documentos",
          documentRequestId: requestRecord.id,
          dueAt
        },
        shouldNotifyClient
      });

      eventId = activity.eventId;
      notificationId = activity.notificationId;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: actorProfileId,
      action: "document_requests.create",
      entity_type: "document_requests",
      entity_id: requestRecord.id,
      payload: {
        caseId: caseRecord.id,
        caseTitle: caseRecord.title,
        visibleToClient,
        dueAt,
        eventId,
        notificationId
      }
    });

    if (auditError) {
      throw new Error(
        `Nao foi possivel registrar a auditoria da solicitacao: ${auditError.message}`
      );
    }
  } catch (error) {
    console.error("[document-requests.create] Rolling back request after downstream failure", {
      caseId: caseRecord.id,
      documentRequestId: requestRecord.id,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);

    const { error: deleteRequestError } = await supabase
      .from("document_requests")
      .delete()
      .eq("id", requestRecord.id);

    if (deleteRequestError) {
      console.error("[document-requests.create] Failed to rollback request", {
        documentRequestId: requestRecord.id,
        message: deleteRequestError.message
      });
    }

    throw error;
  }

  return {
    documentRequestId: requestRecord.id,
    eventId,
    notificationId
  };
}

export async function updateDocumentRequestStatus(rawInput: unknown, actorProfileId: string) {
  await assertStaffActor(actorProfileId);
  const input = updateDocumentRequestStatusSchema.parse(rawInput);
  const { supabase, caseRecord, clientRecord, profileRecord, requestRecord } =
    await resolveDocumentRequestContext(input.requestId);

  if (requestRecord.status === input.status) {
    throw new Error("A solicitacao ja esta com este status.");
  }

  const previousStatus = requestRecord.status;
  const shouldNotifyClient = requestRecord.visible_to_client && input.shouldNotifyClient;

  const { error: updateError } = await supabase
    .from("document_requests")
    .update({ status: input.status })
    .eq("id", requestRecord.id);

  if (updateError) {
    throw new Error(updateError.message || "Nao foi possivel atualizar a solicitacao.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (requestRecord.visible_to_client) {
      const nextStatusLabel =
        documentRequestStatusLabels[
          input.status as keyof typeof documentRequestStatusLabels
        ] || input.status;
      const publicSummary =
        input.status === "completed"
          ? `A pendencia documental "${requestRecord.title}" foi concluida pela equipe.`
          : `A solicitacao "${requestRecord.title}" foi cancelada e nao exige mais acao sua.`;
      const activity = await createCaseEventForDocumentFlow({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        eventType: "case_update",
        title: `Solicitacao atualizada: ${requestRecord.title}`,
        description: `A solicitacao documental foi atualizada para ${nextStatusLabel.toLowerCase()}.`,
        publicSummary,
        payload: {
          source: "documentos",
          documentRequestId: requestRecord.id,
          previousStatus,
          nextStatus: input.status
        },
        shouldNotifyClient
      });

      eventId = activity.eventId;
      notificationId = activity.notificationId;
    }

    const { error: auditError } = await supabase.from("audit_logs").insert({
      actor_profile_id: actorProfileId,
      action: "document_requests.status.update",
      entity_type: "document_requests",
      entity_id: requestRecord.id,
      payload: {
        caseId: caseRecord.id,
        previousStatus,
        nextStatus: input.status,
        eventId,
        notificationId
      }
    });

    if (auditError) {
      throw new Error(
        `Nao foi possivel registrar a auditoria da solicitacao: ${auditError.message}`
      );
    }
  } catch (error) {
    console.error("[document-requests.update] Rolling back request status after downstream failure", {
      requestId: requestRecord.id,
      previousStatus,
      nextStatus: input.status,
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);
    await restoreDocumentRequestStatus(requestRecord.id, previousStatus);
    throw error;
  }

  return {
    requestId: requestRecord.id,
    previousStatus,
    nextStatus: input.status,
    eventId,
    notificationId
  };
}

export async function submitClientDocument(
  requestId: string,
  clientProfileId: string,
  uploadedFile: File | null
) {
  const file = validateUploadedFile(uploadedFile);
  const supabase = createAdminSupabaseClient();

  // Load request and verify it's still open
  const { data: requestRecord, error: requestError } = await supabase
    .from("document_requests")
    .select("id,case_id,title,status,visible_to_client")
    .eq("id", requestId)
    .single();

  if (requestError || !requestRecord) {
    throw new Error("Solicitacao de documento nao encontrada.");
  }

  if (requestRecord.status !== "pending") {
    throw new Error("Esta solicitacao ja foi respondida ou cancelada.");
  }

  // Verify the authenticated client actually owns this case
  const { caseRecord, clientRecord } = await resolveCaseContext(requestRecord.case_id);

  if (clientRecord.profile_id !== clientProfileId) {
    throw new Error("Voce nao tem permissao para responder esta solicitacao.");
  }

  const documentId = crypto.randomUUID();
  const storagePath = buildStoragePath({
    clientId: clientRecord.id,
    caseId: caseRecord.id,
    documentId,
    fileName: file.fileName
  });

  await uploadDocumentFile({
    storagePath,
    file: uploadedFile as File,
    mimeType: file.mimeType
  });

  const { data: documentRecord, error: documentError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      case_id: caseRecord.id,
      file_name: file.fileName,
      storage_path: storagePath,
      category: requestRecord.title,
      description: `Enviado pelo cliente em resposta a solicitacao: ${requestRecord.title}`,
      status: "recebido",
      document_date: new Date().toISOString(),
      visibility: "client",
      uploaded_by: clientProfileId,
      mime_type: file.mimeType,
      file_size_bytes: uploadedFile?.size || null
    })
    .select("id")
    .single();

  if (documentError || !documentRecord) {
    await removeDocumentFile(storagePath);
    throw new Error(documentError?.message || "Nao foi possivel registrar o documento enviado.");
  }

  // Mark request as completed
  const { error: requestUpdateError } = await supabase
    .from("document_requests")
    .update({ status: "completed" })
    .eq("id", requestId);

  if (requestUpdateError) {
    await rollbackDocumentRecord(documentRecord.id);
    await removeDocumentFile(storagePath);
    throw new Error("Nao foi possivel concluir a solicitacao apos o envio.");
  }

  // Case event — visible to client + staff; no client notification (they just sent it)
  const { error: eventError } = await supabase.from("case_events").insert({
    case_id: caseRecord.id,
    client_id: clientRecord.id,
    event_type: "new_document",
    title: `Documento enviado pelo cliente: ${file.fileName}`,
    description: `Cliente respondeu a solicitacao "${requestRecord.title}" com o arquivo ${file.fileName}.`,
    public_summary: `Seu documento foi recebido com sucesso. A equipe vai analisar e te informa assim que houver retorno.`,
    triggered_by: clientProfileId,
    visible_to_client: true,
    should_notify_client: false,
    occurred_at: new Date().toISOString(),
    payload: {
      source: "client-upload",
      documentId: documentRecord.id,
      requestId,
      mimeType: file.mimeType,
      fileSizeBytes: uploadedFile?.size || null
    }
  });

  if (eventError) {
    console.warn("[client-documents.submit] Falha ao registrar evento do caso:", eventError.message);
  }

  // Audit log — non-blocking
  try {
    await supabase.from("audit_logs").insert({
      actor_profile_id: clientProfileId,
      action: "documents.client_upload",
      entity_type: "documents",
      entity_id: documentRecord.id,
      payload: {
        caseId: caseRecord.id,
        requestId,
        storagePath,
        mimeType: file.mimeType,
        fileSizeBytes: uploadedFile?.size || null
      }
    });
  } catch (auditError) {
    console.warn("[client-documents.submit] Falha no audit log:", auditError instanceof Error ? auditError.message : String(auditError));
  }

  return {
    documentId: documentRecord.id,
    storagePath,
    requestId
  };
}

export async function listLatestDocuments(limit = 20) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select(
      "id,case_id,file_name,category,status,visibility,document_date,created_at,storage_path,mime_type,file_size_bytes"
    )
    .order("document_date", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar os documentos: ${error.message}`);
  }

  return (data || []).map((item) => ({
    ...item,
    statusLabel: documentStatusLabels[item.status as keyof typeof documentStatusLabels]
  }));
}

export async function listLatestDocumentRequests(limit = 20) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("document_requests")
    .select("id,case_id,title,status,visible_to_client,due_at,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Nao foi possivel listar as solicitacoes de documentos: ${error.message}`);
  }

  return data || [];
}

export async function getAccessibleDocumentFile(documentId: string) {
  const supabase = await createServerSupabaseClient();
  const { data: documentRecord, error: documentError } = await supabase
    .from("documents")
    .select(
      "id,case_id,file_name,category,status,visibility,document_date,storage_path,mime_type,file_size_bytes"
    )
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) {
    throw new Error(`Nao foi possivel validar o acesso ao documento: ${documentError.message}`);
  }

  if (!documentRecord) {
    return null;
  }

  if (!documentRecord.storage_path) {
    throw new Error("O arquivo deste documento ainda nao foi enviado para o portal.");
  }

  const adminSupabase = createAdminSupabaseClient();
  const { data: fileBlob, error: storageError } = await adminSupabase.storage
    .from(CASE_DOCUMENTS_BUCKET)
    .download(documentRecord.storage_path);

  if (storageError || !fileBlob) {
    throw new Error(
      storageError?.message || "Nao foi possivel carregar o arquivo solicitado."
    );
  }

  return {
    document: documentRecord,
    file: fileBlob
  };
}
