import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import { clientMergeService } from "../../../../../lib/services/client-merge.ts";

export async function POST(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_clients_merge",
    action: "post"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const body = await request.json();
    const { action, sourceClientId, targetClientId, clientId, channel, externalUserId, externalThreadId } = body;

    if (action === "merge") {
      if (!sourceClientId || !targetClientId) {
        return NextResponse.json(
          { error: "sourceClientId and targetClientId are required for merge action" },
          { status: 400 }
        );
      }

      const result = await clientMergeService.mergeClients({
        sourceClientId,
        targetClientId,
        reason: body.reason,
        mergeBy: body.mergeBy
      });

      return NextResponse.json(result);
    }

    if (action === "linkChannel") {
      if (!clientId || !channel || !externalUserId) {
        return NextResponse.json(
          { error: "clientId, channel, and externalUserId are required for linkChannel action" },
          { status: 400 }
        );
      }

      const result = await clientMergeService.linkChannelToExistingClient({
        clientId,
        channel,
        externalUserId,
        externalThreadId,
        linkBy: body.linkBy
      });

      return NextResponse.json(result);
    }

    if (action === "getCanonical") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for getCanonical action" },
          { status: 400 }
        );
      }

      const canonicalClientId = await clientMergeService.getCanonicalClientId(clientId);
      return NextResponse.json({
        originalClientId: clientId,
        canonicalClientId
      });
    }

    if (action === "getClientChannels") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for getClientChannels action" },
          { status: 400 }
        );
      }

      const channels = await clientMergeService.getClientCanonicalChannels(clientId);
      return NextResponse.json({
        clientId,
        canonicalChannels: channels
      });
    }

    if (action === "getClientPipeline") {
      if (!clientId) {
        return NextResponse.json(
          { error: "clientId is required for getClientPipeline action" },
          { status: 400 }
        );
      }

      const pipeline = await clientMergeService.getClientCanonicalPipeline(clientId);
      return NextResponse.json({
        clientId,
        canonicalPipeline: pipeline
      });
    }

    return NextResponse.json(
      {
        error:
          "Invalid action. Supported actions: merge, linkChannel, getCanonical, getClientChannels, getClientPipeline"
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("CLIENT_MERGE_API_ERROR", error);
    return jsonError(extractErrorMessage(error, "Internal server error"), 500);
  }
}

export async function GET(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_clients_merge",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get("clientId");
    const action = searchParams.get("action");

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId query parameter is required" },
        { status: 400 }
      );
    }

    if (action === "getCanonical") {
      const canonicalClientId = await clientMergeService.getCanonicalClientId(clientId);
      return NextResponse.json({
        originalClientId: clientId,
        canonicalClientId
      });
    }

    if (action === "getClientChannels") {
      const channels = await clientMergeService.getClientCanonicalChannels(clientId);
      return NextResponse.json({
        clientId,
        canonicalChannels: channels
      });
    }

    if (action === "getClientPipeline") {
      const pipeline = await clientMergeService.getClientCanonicalPipeline(clientId);
      return NextResponse.json({
        clientId,
        canonicalPipeline: pipeline
      });
    }

    const canonicalClientId = await clientMergeService.getCanonicalClientId(clientId);
    return NextResponse.json({
      originalClientId: clientId,
      canonicalClientId
    });
  } catch (error) {
    console.error("CLIENT_MERGE_API_GET_ERROR", error);
    return jsonError(extractErrorMessage(error, "Internal server error"), 500);
  }
}
