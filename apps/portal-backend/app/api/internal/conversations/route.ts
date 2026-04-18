import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import { traceOperationalEvent } from "@/lib/observability/operational-trace";
import { getSchemaCompatibilityReportForSurface } from "@/lib/schema/compatibility";
import { conversationInboxService } from "@/lib/services/conversation-inbox";

async function ensureConversationInboxSchema() {
  const report = await getSchemaCompatibilityReportForSurface("internal_conversations");

  if (report.ok) {
    return null;
  }

  const missing = report.missing.map((entry) => ({
    table: entry.table,
    columns: entry.columns
  }));

  traceOperationalEvent("error", "INBOX_SCHEMA_INCOMPATIBLE", {
    service: "internal_conversations",
    action: "schema_guard"
  }, {
    surface: "internal_conversations",
    schemaVersion: report.schemaVersion,
    missing
  });

  return NextResponse.json(
    {
      error:
        "A inbox multicanal ainda nao pode operar neste ambiente porque o schema phase 13 esta incompleto.",
      code: "schema_incompatible",
      surface: "internal_conversations",
      schemaVersion: report.schemaVersion,
      missing
    },
    { status: 503 }
  );
}

export async function GET(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_conversations",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  const schemaResponse = await ensureConversationInboxSchema();
  if (schemaResponse) {
    return schemaResponse;
  }

  try {
    const { searchParams } = new URL(request.url);
    const filters = {
      search: searchParams.get("search") || undefined,
      status: (searchParams.get("status") as
        | "all"
        | "new"
        | "unread"
        | "waiting_human"
        | "waiting_client"
        | "ai_active"
        | "handoff"
        | "closed"
        | "archived"
        | null) || undefined,
      channel: (searchParams.get("channel") as
        | "all"
        | "instagram"
        | "facebook"
        | "whatsapp"
        | "site"
        | "portal"
        | "telegram"
        | null) || undefined,
      priority: (searchParams.get("priority") as "all" | "low" | "medium" | "high" | null) || undefined,
      waitingFor: (searchParams.get("waitingFor") as
        | "all"
        | "human"
        | "client"
        | "ai"
        | "none"
        | null) || undefined,
      inboxMode: (searchParams.get("inboxMode") as
        | "all"
        | "needs_human"
        | "customer_turn"
        | "ai_control"
        | "hot"
        | "follow_up_due"
        | "follow_up_overdue"
        | null) || undefined,
      founderScope: (searchParams.get("founderScope") as
        | "all"
        | "founder"
        | "waitlist"
        | null) || undefined,
      paymentState: (searchParams.get("paymentState") as
        | "all"
        | "pending"
        | "approved"
        | null) || undefined,
      includeArchived: searchParams.get("includeArchived") === "true"
    };

    const selectedThreadId = searchParams.get("selectedThreadId");
    const list = await conversationInboxService.listThreads(filters);
    const selectedThread = selectedThreadId
      ? await conversationInboxService.getThreadDetail(selectedThreadId)
      : null;

    return NextResponse.json({
      ok: true,
      data: {
        ...list,
        selectedThread
      }
    });
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel carregar a central de conversas."),
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_conversations",
    action: "write"
  });

  if (!access.ok) {
    return access.response;
  }

  const schemaResponse = await ensureConversationInboxSchema();
  if (schemaResponse) {
    return schemaResponse;
  }

  try {
    const payload = await request.json();
    const action = payload?.action;

    if (action === "sendHumanReply") {
      const result = await conversationInboxService.sendHumanReply({
        threadId: payload.threadId,
        content: payload.content,
        authorId: access.profile.id,
        authorName: access.profile.full_name
      });

      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "sendInboxFollowUp") {
      const result = await conversationInboxService.sendInboxFollowUp({
        clientId: payload.clientId,
        pipelineId: payload.pipelineId,
        channel: payload.channel || "whatsapp",
        content: payload.content,
        followUpMessageId: payload.followUpMessageId,
        messageType: payload.messageType,
        authorId: access.profile.id,
        authorName: access.profile.full_name
      });

      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "updateThreadState") {
      const result = await conversationInboxService.updateThreadState({
        threadId: payload.threadId,
        actorId: access.profile.id,
        actorName: access.profile.full_name,
        threadStatus: payload.threadStatus,
        waitingFor: payload.waitingFor,
        priority: payload.priority,
        ownerMode: payload.ownerMode,
        handoffState: payload.handoffState,
        handoffReason: payload.handoffReason,
        aiEnabled: payload.aiEnabled,
        markRead: payload.markRead,
        internalNotes: payload.internalNotes,
        nextActionHint: payload.nextActionHint,
        followUpStatus: payload.followUpStatus,
        followUpDueAt: payload.followUpDueAt,
        prioritySource: payload.prioritySource,
        sensitivityLevel: payload.sensitivityLevel
      });

      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "addThreadNote") {
      const result = await conversationInboxService.addThreadNote({
        threadId: payload.threadId,
        body: payload.body,
        kind: payload.kind,
        isSensitive: payload.isSensitive,
        authorId: access.profile.id,
        authorName: access.profile.full_name
      });

      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json(
      {
        error:
          "Acao invalida. Use sendHumanReply, sendInboxFollowUp, updateThreadState ou addThreadNote."
      },
      { status: 400 }
    );
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel operar a thread selecionada."),
      400
    );
  }
}
