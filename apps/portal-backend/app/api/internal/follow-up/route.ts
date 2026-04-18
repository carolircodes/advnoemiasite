import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import { getCommercialAutomationPlans, queueEligibleCommercialAutomations } from "@/lib/services/commercial-automation";
import { followUpEngine } from "@/lib/services/follow-up-engine";
import { operationalPanel } from "@/lib/services/operational-panel";

export async function POST(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_follow_up",
    action: "post"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json();
    const { action, clientId, pipelineId, channel, messageType, scheduledFor, followUpMessageId, status, limit } = body;

    if (action === "getEligible") {
      const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit || 20);
      return NextResponse.json({
        success: true,
        data: eligibleClients,
        count: eligibleClients.length
      });
    }

    if (action === "generateMessage") {
      if (!clientId || !pipelineId || !channel) {
        return NextResponse.json(
          { error: "clientId, pipelineId, and channel are required for generateMessage action" },
          { status: 400 }
        );
      }

      const message = await followUpEngine.generateFollowUpMessageForClient({
        clientId,
        pipelineId,
        channel,
        messageType
      });

      if (!message) {
        return NextResponse.json(
          { error: "Failed to generate follow-up message" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: message
      });
    }

    if (action === "scheduleFollowUp") {
      if (!clientId || !pipelineId || !channel || !messageType || !scheduledFor) {
        return NextResponse.json(
          {
            error:
              "clientId, pipelineId, channel, messageType, and scheduledFor are required for scheduleFollowUp action"
          },
          { status: 400 }
        );
      }

      const scheduled = await followUpEngine.scheduleFollowUpForClient({
        clientId,
        pipelineId,
        channel,
        messageType,
        scheduledFor: new Date(scheduledFor)
      });

      return NextResponse.json({
        success: scheduled,
        message: scheduled ? "Follow-up scheduled successfully" : "Failed to schedule follow-up"
      });
    }

    if (action === "markResult") {
      if (!followUpMessageId || !status) {
        return NextResponse.json(
          { error: "followUpMessageId and status are required for markResult action" },
          { status: 400 }
        );
      }

      const updated = await followUpEngine.markFollowUpResult({
        followUpMessageId,
        status,
        errorMessage: body.errorMessage
      });

      return NextResponse.json({
        success: updated,
        message: updated ? "Follow-up result updated successfully" : "Failed to update follow-up result"
      });
    }

    if (action === "saveMessage") {
      if (!clientId || !pipelineId || !channel || !messageType || !body.content) {
        return NextResponse.json(
          {
            error:
              "clientId, pipelineId, channel, messageType, and content are required for saveMessage action"
          },
          { status: 400 }
        );
      }

      const messageId = await followUpEngine.saveFollowUpMessage({
        clientId,
        pipelineId,
        channel,
        messageType,
        content: body.content,
        status: body.status
      });

      if (!messageId) {
        return NextResponse.json(
          { error: "Failed to save follow-up message" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: { messageId }
      });
    }

    if (action === "getPriority") {
      const priorityFollowUps = await followUpEngine.getPriorityFollowUps(limit || 20);
      return NextResponse.json({
        success: true,
        data: priorityFollowUps,
        count: priorityFollowUps.length
      });
    }

    if (action === "getScheduled") {
      const scheduledFollowUps = await followUpEngine.getScheduledFollowUps(limit || 50);
      return NextResponse.json({
        success: true,
        data: scheduledFollowUps,
        count: scheduledFollowUps.length
      });
    }

    if (action === "getCommercialPlans") {
      const contactsResult = await operationalPanel.getOperationalContacts({}, limit || 20, 0);
      const plans = await getCommercialAutomationPlans(contactsResult.contacts);

      return NextResponse.json({
        success: true,
        data: contactsResult.contacts.map((contact) => ({
          clientId: contact.clientId,
          fullName: contact.fullName,
          plan: plans.get(contact.clientId) || null
        }))
      });
    }

    if (action === "queueCommercialAutomations") {
      const contactsResult = await operationalPanel.getOperationalContacts({}, limit || 20, 0);
      const summary = await queueEligibleCommercialAutomations(contactsResult.contacts, limit || 10);

      return NextResponse.json({
        success: true,
        data: summary
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Supported actions: getEligible, generateMessage, scheduleFollowUp, markResult, saveMessage, getPriority, getScheduled, getCommercialPlans, queueCommercialAutomations"
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("FOLLOW_UP_API_ERROR", error);
    return jsonError(extractErrorMessage(error, "Internal server error"), 500);
  }
}

export async function GET(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_follow_up",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    if (action === "getEligible") {
      const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit);
      return NextResponse.json({
        success: true,
        data: eligibleClients,
        count: eligibleClients.length
      });
    }

    if (action === "getPriority") {
      const priorityFollowUps = await followUpEngine.getPriorityFollowUps(limit);
      return NextResponse.json({
        success: true,
        data: priorityFollowUps,
        count: priorityFollowUps.length
      });
    }

    if (action === "getScheduled") {
      const scheduledFollowUps = await followUpEngine.getScheduledFollowUps(limit);
      return NextResponse.json({
        success: true,
        data: scheduledFollowUps,
        count: scheduledFollowUps.length
      });
    }

    if (action === "getCommercialPlans") {
      const contactsResult = await operationalPanel.getOperationalContacts({}, limit, 0);
      const plans = await getCommercialAutomationPlans(contactsResult.contacts);

      return NextResponse.json({
        success: true,
        data: contactsResult.contacts.map((contact) => ({
          clientId: contact.clientId,
          fullName: contact.fullName,
          plan: plans.get(contact.clientId) || null
        }))
      });
    }

    const eligibleClients = await followUpEngine.getClientsEligibleForFollowUp(limit);
    return NextResponse.json({
      success: true,
      data: eligibleClients,
      count: eligibleClients.length
    });
  } catch (error) {
    console.error("FOLLOW_UP_API_GET_ERROR", error);
    return jsonError(extractErrorMessage(error, "Internal server error"), 500);
  }
}
