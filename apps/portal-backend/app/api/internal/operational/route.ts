import { NextRequest, NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { assistedFollowUpService } from "@/lib/services/assisted-follow-up";
import { commercialRelationshipService } from "@/lib/services/commercial-relationship";
import { followUpResponseHandler } from "@/lib/services/follow-up-response-handler";
import { operationalPanel } from "@/lib/services/operational-panel";

export async function POST(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    const {
      action,
      clientId,
      pipelineId,
      sessionId,
      filters,
      limit,
      offset,
      actionType,
      value,
      notes,
      channel,
      content,
      approvedBy,
      followUpMessageId,
      messageType,
      payload,
      ownerProfileId,
      ownerName,
      noteBody,
      noteKind,
      isSensitive,
      followUpState,
      followUpReason,
      followUpDueAt,
      nextStep,
      waitingOn
    } = body;

    if (action === "getPanelData") {
      const panelData = await operationalPanel.getPanelData(filters || {}, limit || 50, offset || 0);
      return NextResponse.json({ success: true, data: panelData });
    }

    if (action === "getContacts") {
      const contactsResult = await operationalPanel.getOperationalContacts(
        filters || {},
        limit || 50,
        offset || 0
      );
      return NextResponse.json({ success: true, data: contactsResult });
    }

    if (action === "getMetrics") {
      const metrics = await operationalPanel.getOperationalMetrics();
      return NextResponse.json({ success: true, data: metrics });
    }

    if (action === "applyAction") {
      if (!clientId || !pipelineId || !actionType) {
        return NextResponse.json(
          { error: "clientId, pipelineId, and actionType are required for applyAction" },
          { status: 400 }
        );
      }

      const success = await operationalPanel.applyOperationalAction({
        clientId,
        pipelineId,
        sessionId,
        action: actionType,
        value,
        notes,
        payload
      });

      return NextResponse.json({
        success,
        message: success ? "Action applied successfully" : "Failed to apply action"
      });
    }

    if (action === "generateSuggestedMessage") {
      if (!clientId || !pipelineId) {
        return NextResponse.json(
          { error: "clientId and pipelineId are required for generateSuggestedMessage" },
          { status: 400 }
        );
      }

      const contactsResult = await operationalPanel.getOperationalContacts({ clientId }, 1, 0);
      if (contactsResult.contacts.length === 0) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      const contact = contactsResult.contacts[0];
      return NextResponse.json({
        success: true,
        data: {
          suggestedMessage: contact.suggestedMessage,
          contact: {
            clientId: contact.clientId,
            fullName: contact.fullName,
            pipelineStage: contact.pipelineStage,
            leadTemperature: contact.leadTemperature,
            priorityLabel: contact.priorityLabel
          }
        }
      });
    }

    if (action === "sendAssistedFollowUp") {
      if (!clientId || !pipelineId || !channel || !content || !approvedBy) {
        return NextResponse.json(
          {
            error:
              "clientId, pipelineId, channel, content, and approvedBy are required for sendAssistedFollowUp"
          },
          { status: 400 }
        );
      }

      const result = await assistedFollowUpService.sendAssistedFollowUp({
        clientId,
        pipelineId,
        channel,
        content,
        approvedBy,
        followUpMessageId,
        messageType
      });

      return NextResponse.json({
        success: result.success,
        data: result,
        message: result.success
          ? "Follow-up enviado com sucesso"
          : "Falha ao enviar follow-up"
      });
    }

    if (action === "getClientChannels") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for getClientChannels" },
          { status: 400 }
        );
      }

      const channelsResult = await assistedFollowUpService.getClientAvailableChannels(clientId);
      return NextResponse.json({
        success: channelsResult.success,
        data: channelsResult.channels,
        error: channelsResult.error
      });
    }

    if (action === "getFollowUpMetrics") {
      const stats = await followUpResponseHandler.getFollowUpResponseStats(clientId);
      return NextResponse.json({ success: true, data: stats });
    }

    if (action === "getStaffOwners") {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["advogada", "admin"])
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    if (action === "assignOwner") {
      if (!sessionId) {
        return NextResponse.json(
          { error: "sessionId is required for assignOwner" },
          { status: 400 }
        );
      }

      const result = await commercialRelationshipService.assignCommercialOwner({
        sessionId,
        ownerProfileId: ownerProfileId || access.profile.id,
        ownerName: ownerName || access.profile.full_name,
        actorProfileId: access.profile.id,
        actorName: access.profile.full_name
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (action === "saveCommercialNote") {
      if (!sessionId || !noteBody) {
        return NextResponse.json(
          { error: "sessionId and noteBody are required for saveCommercialNote" },
          { status: 400 }
        );
      }

      const result = await commercialRelationshipService.addCommercialNote({
        sessionId,
        body: noteBody,
        authorId: access.profile.id,
        authorName: access.profile.full_name,
        kind: noteKind || "operational",
        isSensitive: Boolean(isSensitive)
      });

      return NextResponse.json({ success: true, data: result });
    }

    if (action === "updateCommercialFollowUp") {
      if (!sessionId) {
        return NextResponse.json(
          { error: "sessionId is required for updateCommercialFollowUp" },
          { status: 400 }
        );
      }

      const result = await commercialRelationshipService.updateCommercialFollowUp({
        sessionId,
        state: followUpState || "none",
        reason: followUpReason || null,
        dueAt: followUpDueAt || null,
        nextStep: nextStep || null,
        waitingOn: waitingOn || null,
        actorProfileId: access.profile.id,
        actorName: access.profile.full_name
      });

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Supported actions: getPanelData, getContacts, getMetrics, applyAction, generateSuggestedMessage, sendAssistedFollowUp, getClientChannels, getFollowUpMetrics, getStaffOwners, assignOwner, saveCommercialNote, updateCommercialFollowUp"
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("OPERATIONAL_PANEL_API_ERROR", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "getPanelData";
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    const filters: Record<string, unknown> = {};
    const stage = searchParams.get("stage");
    const leadTemperature = searchParams.get("leadTemperature");
    const areaInterest = searchParams.get("areaInterest");
    const sourceChannel = searchParams.get("sourceChannel");
    const priorityLabel = searchParams.get("priorityLabel");
    const followUpStatus = searchParams.get("followUpStatus");
    const isClient = searchParams.get("isClient");
    const search = searchParams.get("search");

    if (stage) filters.stage = stage;
    if (leadTemperature) filters.leadTemperature = leadTemperature;
    if (areaInterest) filters.areaInterest = areaInterest;
    if (sourceChannel) filters.sourceChannel = sourceChannel;
    if (priorityLabel) filters.priorityLabel = priorityLabel;
    if (followUpStatus) filters.followUpStatus = followUpStatus;
    if (isClient) filters.isClient = isClient === "true";
    if (search) filters.search = search;

    if (action === "getPanelData") {
      const panelData = await operationalPanel.getPanelData(filters, limit, offset);
      return NextResponse.json({ success: true, data: panelData });
    }

    if (action === "getContacts") {
      const contactsResult = await operationalPanel.getOperationalContacts(filters, limit, offset);
      return NextResponse.json({ success: true, data: contactsResult });
    }

    if (action === "getMetrics") {
      const metrics = await operationalPanel.getOperationalMetrics();
      return NextResponse.json({ success: true, data: metrics });
    }

    if (action === "getStaffOwners") {
      const supabase = createAdminSupabaseClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("role", ["advogada", "admin"])
        .eq("is_active", true)
        .order("full_name", { ascending: true });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: data || [] });
    }

    const panelData = await operationalPanel.getPanelData(filters, limit, offset);
    return NextResponse.json({ success: true, data: panelData });
  } catch (error) {
    console.error("OPERATIONAL_PANEL_API_GET_ERROR", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
