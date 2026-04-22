import { NextRequest, NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import { buildYouTubeOAuthAuthorizationUrl } from "@/lib/youtube/youtube-auth";
import { getYouTubeReadinessReport } from "@/lib/youtube/youtube-config";
import {
  ingestYouTubeComment,
  registerYouTubeAsset
} from "@/lib/services/youtube-orchestration";

export async function GET(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_youtube",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";

    if (action === "status") {
      return NextResponse.json({
        ok: true,
        data: getYouTubeReadinessReport()
      });
    }

    if (action === "oauthStart") {
      const redirectTo = searchParams.get("redirectTo") || undefined;
      const mode = searchParams.get("mode") || undefined;

      return NextResponse.json({
        ok: true,
        data: {
          ...buildYouTubeOAuthAuthorizationUrl({
            redirectTo,
            mode
          }),
          readiness: getYouTubeReadinessReport()
        }
      });
    }

    return NextResponse.json(
      {
        error: "Acao invalida. Use status ou oauthStart."
      },
      { status: 400 }
    );
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel carregar o status operacional do YouTube."),
      400
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireStaffRouteAccess({
    service: "internal_youtube",
    action: "write"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const action = payload?.action;

    if (action === "registerAsset") {
      const result = await registerYouTubeAsset(payload.asset || payload);
      return NextResponse.json({ ok: true, data: result });
    }

    if (action === "ingestComment") {
      const result = await ingestYouTubeComment({
        asset: payload.asset,
        commentId: payload.commentId,
        parentCommentId: payload.parentCommentId,
        authorChannelId: payload.authorChannelId,
        authorDisplayName: payload.authorDisplayName,
        text: payload.text,
        publishedAt: payload.publishedAt,
        likeCount: payload.likeCount,
        replyCount: payload.replyCount
      });

      return NextResponse.json({ ok: true, data: result });
    }

    return NextResponse.json(
      {
        error: "Acao invalida. Use registerAsset ou ingestComment."
      },
      { status: 400 }
    );
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel operar a integracao do YouTube."),
      400
    );
  }
}
