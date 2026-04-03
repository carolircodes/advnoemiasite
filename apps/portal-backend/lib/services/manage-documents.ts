import "server-only";

import {
  documentStatusLabels,
  formatPortalDateTime,
  registerCaseDocumentSchema,
  requestCaseDocumentSchema
} from "@/lib/domain/portal";
import { queueCaseEventNotification } from "@/lib/notifications/outbox";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function resolveDateTime(value: string) {
  if (!value) {
    return new Date().toISOString();
  }

  return new Date(value).toISOString();
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

async function createCaseEventForDocumentFlow(input: {
  caseId: string;
  clientId: string;
  actorProfileId: string;
  clientProfileId: string;
  clientEmail: string;
  eventType: "new_document" | "document_request";
  title: string;
  description: string;
  publicSummary: string;
  payload: Record<string, unknown>;
  shouldNotifyClient: boolean;
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
      occurred_at: new Date().toISOString(),
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

export async function registerCaseDocument(rawInput: unknown, actorProfileId: string) {
  const input = registerCaseDocumentSchema.parse(rawInput);
  const documentDate = resolveDateTime(input.documentDate);
  const visibleToClient = input.visibleToClient;
  const shouldNotifyClient = visibleToClient && input.shouldNotifyClient;
  const visibility = visibleToClient ? "client" : "internal";

  const { supabase, caseRecord, clientRecord, profileRecord } = await resolveCaseContext(
    input.caseId
  );

  const { data: documentRecord, error: documentError } = await supabase
    .from("documents")
    .insert({
      case_id: caseRecord.id,
      file_name: input.fileName,
      storage_path: null,
      category: input.category,
      description: input.description || null,
      status: input.status,
      document_date: documentDate,
      visibility,
      uploaded_by: actorProfileId
    })
    .select("id,file_name,status,visibility")
    .single();

  if (documentError || !documentRecord) {
    throw new Error(documentError?.message || "Nao foi possivel registrar o documento.");
  }

  let eventId: string | null = null;
  let notificationId: string | null = null;

  try {
    if (visibleToClient) {
      const eventType =
        input.status === "solicitado" || input.status === "pendente"
          ? "document_request"
          : "new_document";
      const activityTitle =
        eventType === "document_request"
          ? `Documento pendente: ${input.fileName}`
          : `Novo documento disponivel: ${input.fileName}`;
      const publicSummary =
        input.description ||
        (eventType === "document_request"
          ? "A equipe registrou uma pendencia documental no seu caso."
          : "A equipe liberou um novo documento na sua area do cliente.");
      const activity = await createCaseEventForDocumentFlow({
        caseId: caseRecord.id,
        clientId: clientRecord.id,
        actorProfileId,
        clientProfileId: profileRecord.id,
        clientEmail: profileRecord.email || "",
        eventType,
        title: activityTitle,
        description: input.description,
        publicSummary,
        payload: {
          source: "documentos",
          documentId: documentRecord.id,
          documentStatus: input.status,
          category: input.category
        },
        shouldNotifyClient
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
      eventId,
      notificationId,
      message: error instanceof Error ? error.message : String(error)
    });

    await rollbackNotificationAndEvent(eventId, notificationId);

    const { error: deleteDocumentError } = await supabase
      .from("documents")
      .delete()
      .eq("id", documentRecord.id);

    if (deleteDocumentError) {
      console.error("[documents.create] Failed to rollback document", {
        documentId: documentRecord.id,
        message: deleteDocumentError.message
      });
    }

    throw error;
  }

  return {
    documentId: documentRecord.id,
    eventId,
    notificationId
  };
}

export async function requestCaseDocument(rawInput: unknown, actorProfileId: string) {
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

export async function listLatestDocuments(limit = 20) {
  const supabase = createAdminSupabaseClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id,case_id,file_name,category,status,visibility,document_date,created_at")
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
  const supabase = createAdminSupabaseClient();
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
