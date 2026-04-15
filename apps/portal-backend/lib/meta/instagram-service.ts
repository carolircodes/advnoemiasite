import "server-only";

export type InstagramSendSurface = "direct_message" | "public_comment";

export type InstagramSendContext = {
  eventId?: string | null;
  externalUserId?: string | null;
  sessionId?: string | null;
  pipelineId?: string | null;
  responseType?: string | null;
  responseLength?: number | null;
  reason?: string | null;
};

export type InstagramSendResult = {
  ok: boolean;
  messageId: string | null;
  status: "sent" | "failed";
  surface: InstagramSendSurface;
  rawStatus: number | null;
  error: string | null;
  metadata: Record<string, unknown>;
};

type InstagramGraphSendResponse = {
  id?: string;
  recipient_id?: string;
  message_id?: string;
  comment_id?: string;
};

function getInstagramConfig() {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN?.trim() || "";
  const pageId = process.env.FACEBOOK_PAGE_ID?.trim() || "";

  return {
    accessToken,
    pageId,
    configured: Boolean(accessToken && pageId)
  };
}

async function postInstagramGraph(
  path: string,
  body: Record<string, unknown>
): Promise<{
  ok: boolean;
  status: number | null;
  data: InstagramGraphSendResponse | null;
  error: string | null;
}> {
  const { accessToken } = getInstagramConfig();

  if (!accessToken) {
    return {
      ok: false,
      status: null,
      data: null,
      error: "instagram_access_token_missing"
    };
  }

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const json = await response.json().catch(async () => {
      const text = await response.text().catch(() => "");
      return text ? { error: { message: text.slice(0, 500) } } : {};
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error:
          (typeof json?.error?.message === "string" && json.error.message) ||
          response.statusText ||
          "instagram_graph_error"
      };
    }

    return {
      ok: true,
      status: response.status,
      data: json as InstagramGraphSendResponse,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      data: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function sendInstagramDirectMessage(
  recipientId: string,
  messageText: string,
  context: InstagramSendContext = {}
): Promise<InstagramSendResult> {
  const { pageId, configured } = getInstagramConfig();

  if (!configured) {
    return {
      ok: false,
      messageId: null,
      status: "failed",
      surface: "direct_message",
      rawStatus: null,
      error: "instagram_direct_config_missing",
      metadata: {
        configured,
        hasPageId: Boolean(pageId),
        ...context
      }
    };
  }

  const graphResult = await postInstagramGraph(`${pageId}/messages`, {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  });

  return {
    ok: graphResult.ok,
    messageId: graphResult.data?.message_id || null,
    status: graphResult.ok ? "sent" : "failed",
    surface: "direct_message",
    rawStatus: graphResult.status,
    error: graphResult.error,
    metadata: {
      recipientId,
      responseType: context.responseType || "direct_message",
      graphRecipientId: graphResult.data?.recipient_id || null,
      ...context
    }
  };
}

export async function sendInstagramCommentReply(
  commentId: string,
  messageText: string,
  context: InstagramSendContext = {}
): Promise<InstagramSendResult> {
  const graphResult = await postInstagramGraph(`${commentId}/comments`, {
    message: messageText
  });

  return {
    ok: graphResult.ok,
    messageId: graphResult.data?.id || graphResult.data?.comment_id || null,
    status: graphResult.ok ? "sent" : "failed",
    surface: "public_comment",
    rawStatus: graphResult.status,
    error: graphResult.error,
    metadata: {
      commentId,
      responseType: context.responseType || "public_comment",
      ...context
    }
  };
}
