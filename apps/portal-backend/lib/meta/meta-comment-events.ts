export type MetaCommentChannel = "instagram" | "facebook";

export type ParsedMetaCommentEvent = {
  channel: MetaCommentChannel;
  senderId: string;
  commentId: string;
  commentText: string;
  mediaId: string;
  displayName?: string;
  username?: string;
};

export function isMetaCommentChange(
  channel: MetaCommentChannel,
  change: Record<string, any>
) {
  const value = (change.value || {}) as Record<string, any>;

  return (
    (channel === "instagram" && change.field === "comments") ||
    (channel === "facebook" &&
      (change.field === "feed" || change.field === "comments") &&
      (value.item === "comment" || typeof value.comment_id === "string"))
  );
}

export function extractMetaCommentEvents(payload: unknown): ParsedMetaCommentEvent[] {
  const data = payload as Record<string, any>;

  if (!data || (data.object !== "instagram" && data.object !== "page")) {
    return [];
  }

  const channel: MetaCommentChannel = data.object === "page" ? "facebook" : "instagram";
  const comments: ParsedMetaCommentEvent[] = [];

  for (const entry of Array.isArray(data.entry) ? data.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const typedChange = change as Record<string, any>;
      const value = (typedChange.value || {}) as Record<string, any>;

      if (!isMetaCommentChange(channel, typedChange)) {
        continue;
      }

      const senderId = typeof value.from?.id === "string" ? value.from.id : "";
      const commentId =
        typeof value.comment_id === "string"
          ? value.comment_id
          : typeof value.id === "string"
            ? value.id
            : "";
      const commentText =
        typeof value.message === "string"
          ? value.message
          : typeof value.text === "string"
            ? value.text
            : "";
      const mediaId =
        typeof value.post_id === "string"
          ? value.post_id
          : typeof value.media?.id === "string"
            ? value.media.id
            : "";

      if (!senderId || !commentId || !commentText) {
        continue;
      }

      comments.push({
        channel,
        senderId,
        commentId,
        commentText,
        mediaId,
        displayName: typeof value.from?.name === "string" ? value.from.name : undefined,
        username: typeof value.from?.username === "string" ? value.from.username : undefined
      });
    }
  }

  return comments;
}
