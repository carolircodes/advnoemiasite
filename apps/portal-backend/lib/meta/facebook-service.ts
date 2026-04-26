import "server-only";

import {
  sendMetaCommentReply,
  sendMetaDirectMessage,
  type MetaSendContext,
  type MetaSendResult
} from "./instagram-service.ts";

export function sendFacebookDirectMessage(
  recipientId: string,
  messageText: string,
  context: MetaSendContext = {}
): Promise<MetaSendResult> {
  return sendMetaDirectMessage("facebook", recipientId, messageText, context);
}

export function sendFacebookCommentReply(
  commentId: string,
  messageText: string,
  context: MetaSendContext = {}
): Promise<MetaSendResult> {
  return sendMetaCommentReply("facebook", commentId, messageText, context);
}
