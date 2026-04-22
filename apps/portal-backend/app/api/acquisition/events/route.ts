import { NextRequest, NextResponse } from "next/server";

import { logAcquisitionEvent } from "@/lib/acquisition/acquisition-service";
import { requireInternalOperatorAccess } from "@/lib/auth/api-authorization";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

const VALID_EVENT_TYPES = [
  "lead_created",
  "first_message_sent",
  "qualified",
  "scheduled",
  "converted"
] as const;

async function requireAcquisitionEventsAccess(request: NextRequest, action: "read" | "write") {
  return requireInternalOperatorAccess({
    request,
    service: "acquisition_events",
    action,
    errorMessage: "A rota de acquisition events exige acesso interno autenticado."
  });
}

export async function POST(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "acquisition_events_internal",
    provider: "supabase"
  });
  try {
    const access = await requireAcquisitionEventsAccess(request, "write");

    if (!access.ok) {
      logObservedRequest("warn", "ACQUISITION_EVENTS_WRITE_DENIED", observation, {
        flow: "acquisition_events_internal",
        outcome: "denied",
        status: access.status,
        errorCategory: "boundary"
      });
      return access.response;
    }

    const body = await request.json();
    const { lead_id, event_type, metadata = {} } = body;

    if (!lead_id || !event_type) {
      logObservedRequest("warn", "ACQUISITION_EVENTS_WRITE_INVALID_BODY", observation, {
        flow: "acquisition_events_internal",
        outcome: "failed",
        status: 400,
        errorCategory: "validation"
      });
      return createObservedJsonResponse(
        observation,
        { error: "lead_id e event_type sao obrigatorios" },
        { status: 400 }
      );
    }

    if (!VALID_EVENT_TYPES.includes(event_type)) {
      logObservedRequest("warn", "ACQUISITION_EVENTS_WRITE_INVALID_TYPE", observation, {
        flow: "acquisition_events_internal",
        outcome: "failed",
        status: 400,
        errorCategory: "validation",
        eventType: event_type
      });
      return createObservedJsonResponse(
        observation,
        { error: "Tipo de evento invalido" },
        { status: 400 }
      );
    }

    await logAcquisitionEvent({
      lead_id,
      event_type,
      metadata
    });

    logObservedRequest("info", "ACQUISITION_EVENTS_RECORDED", observation, {
      flow: "acquisition_events_internal",
      outcome: "success",
      status: 200,
      lead_id,
      event_type,
      metadata
    });

    return createObservedJsonResponse(observation, {
      success: true,
      message: "Evento registrado com sucesso"
    });
  } catch (error) {
    logObservedRequest("error", "ACQUISITION_EVENTS_WRITE_FAILED", observation, {
      flow: "acquisition_events_internal",
      outcome: "failed",
      status: 500,
      errorCategory: "internal"
    }, error);
    return createObservedJsonResponse(
      observation,
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const observation = startRequestObservation(request, {
    flow: "acquisition_events_internal",
    provider: "supabase"
  });
  try {
    const access = await requireAcquisitionEventsAccess(request, "read");

    if (!access.ok) {
      logObservedRequest("warn", "ACQUISITION_EVENTS_READ_DENIED", observation, {
        flow: "acquisition_events_internal",
        outcome: "denied",
        status: access.status,
        errorCategory: "boundary"
      });
      return access.response;
    }

    const supabase = createAdminSupabaseClient();
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get("lead_id");
    const eventType = searchParams.get("event_type");
    const rawLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 50;

    if (!leadId) {
      logObservedRequest("warn", "ACQUISITION_EVENTS_READ_MISSING_LEAD", observation, {
        flow: "acquisition_events_internal",
        outcome: "failed",
        status: 400,
        errorCategory: "validation"
      });
      return createObservedJsonResponse(
        observation,
        { error: "lead_id e obrigatorio" },
        { status: 400 }
      );
    }

    let query = supabase
      .from("acquisition_events")
      .select(`
        id,
        event_type,
        source,
        campaign,
        topic,
        content_id,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_term,
        utm_content,
        metadata,
        created_at
      `)
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq("event_type", eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      logObservedRequest("error", "ACQUISITION_EVENTS_READ_QUERY_FAILED", observation, {
        flow: "acquisition_events_internal",
        outcome: "failed",
        status: 500,
        errorCategory: "provider",
        leadId
      }, error);
      return createObservedJsonResponse(
        observation,
        { error: "Erro ao buscar eventos" },
        { status: 500 }
      );
    }

    logObservedRequest("info", "ACQUISITION_EVENTS_FETCHED", observation, {
      flow: "acquisition_events_internal",
      outcome: "success",
      status: 200,
      leadId,
      total: events?.length || 0
    });

    return createObservedJsonResponse(observation, {
      success: true,
      events: events || [],
      total: events?.length || 0
    });
  } catch (error) {
    logObservedRequest("error", "ACQUISITION_EVENTS_READ_FAILED", observation, {
      flow: "acquisition_events_internal",
      outcome: "failed",
      status: 500,
      errorCategory: "internal"
    }, error);
    return createObservedJsonResponse(
      observation,
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
