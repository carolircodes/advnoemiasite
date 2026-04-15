import "server-only";

import { getServerEnv } from "../config/env";

export type TelegramChannelConfig = {
  botConfigured: boolean;
  channelUsername: string;
  channelUrl: string;
  mode: "channel_broadcast";
  readyForFutureGroup: boolean;
};

export type TelegramSendResult = {
  ok: boolean;
  messageId: string | null;
  status: "sent" | "failed";
  error: string | null;
  metadata: {
    channelUsername: string;
    channelUrl: string;
    mode: "channel_broadcast" | "private_chat" | "curated_group";
    chatId: string | null;
  };
};

export type TelegramWebhookMessage = {
  updateId: string;
  messageId: string;
  chatId: string;
  chatType: "private" | "group" | "supergroup" | "channel" | "unknown";
  chatTitle: string | null;
  username: string | null;
  fromId: string | null;
  fromName: string | null;
  text: string;
  isBot: boolean;
  mentionsBot: boolean;
  isReplyToBot: boolean;
  isCommand: boolean;
  timestamp: number | null;
};

function normalizeUsername(value: string | undefined) {
  const normalized = (value || "@adv_noemia").trim();
  return normalized.startsWith("@") ? normalized : `@${normalized}`;
}

function getTelegramBotUsername() {
  const token = getServerEnv().TELEGRAM_BOT_TOKEN;
  if (!token) {
    return "AdvNoemia_bot";
  }

  return "AdvNoemia_bot";
}

export function getTelegramChannelConfig(): TelegramChannelConfig {
  const env = getServerEnv();
  const channelUsername = normalizeUsername(env.TELEGRAM_CHANNEL_USERNAME);
  const channelUrl = env.TELEGRAM_CHANNEL_URL || `https://t.me/${channelUsername.replace(/^@/, "")}`;

  return {
    botConfigured: Boolean(env.TELEGRAM_BOT_TOKEN),
    channelUsername,
    channelUrl,
    mode: "channel_broadcast",
    readyForFutureGroup: true
  };
}

async function sendTelegramMessage(input: {
  chatId: string;
  text: string;
  mode: "channel_broadcast" | "private_chat" | "curated_group";
  disablePreview?: boolean;
  replyToMessageId?: string | null;
}): Promise<TelegramSendResult> {
  const env = getServerEnv();
  const channelConfig = getTelegramChannelConfig();
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return {
      ok: false,
      messageId: null,
      status: "failed",
      error: "telegram_bot_token_missing",
      metadata: {
        channelUsername: channelConfig.channelUsername,
        channelUrl: channelConfig.channelUrl,
        mode: input.mode,
        chatId: input.chatId
      }
    };
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        disable_web_page_preview: input.disablePreview ?? false,
        reply_to_message_id: input.replyToMessageId || undefined
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || payload?.ok !== true) {
      return {
        ok: false,
        messageId: null,
        status: "failed",
        error:
          typeof payload?.description === "string"
            ? payload.description
            : "telegram_send_failed",
        metadata: {
          channelUsername: channelConfig.channelUsername,
          channelUrl: channelConfig.channelUrl,
          mode: input.mode,
          chatId: input.chatId
        }
      };
    }

    return {
      ok: true,
      messageId:
        typeof payload?.result?.message_id === "number"
          ? String(payload.result.message_id)
          : null,
      status: "sent",
      error: null,
      metadata: {
        channelUsername: channelConfig.channelUsername,
        channelUrl: channelConfig.channelUrl,
        mode: input.mode,
        chatId: input.chatId
      }
    };
  } catch (error) {
    return {
      ok: false,
      messageId: null,
      status: "failed",
      error: error instanceof Error ? error.message : "telegram_send_failed",
      metadata: {
        channelUsername: channelConfig.channelUsername,
        channelUrl: channelConfig.channelUrl,
        mode: input.mode,
        chatId: input.chatId
      }
    };
  }
}

export async function publishTelegramChannelMessage(input: {
  text: string;
  disablePreview?: boolean;
}) {
  const config = getTelegramChannelConfig();
  return sendTelegramMessage({
    chatId: config.channelUsername,
    text: input.text,
    disablePreview: input.disablePreview,
    mode: "channel_broadcast"
  });
}

export async function sendTelegramPrivateMessage(input: {
  chatId: string;
  text: string;
  disablePreview?: boolean;
}) {
  return sendTelegramMessage({
    chatId: input.chatId,
    text: input.text,
    disablePreview: input.disablePreview,
    mode: "private_chat"
  });
}

export async function sendTelegramGroupMessage(input: {
  chatId: string;
  text: string;
  disablePreview?: boolean;
  replyToMessageId?: string | null;
}) {
  return sendTelegramMessage({
    chatId: input.chatId,
    text: input.text,
    disablePreview: input.disablePreview,
    replyToMessageId: input.replyToMessageId,
    mode: "curated_group"
  });
}

function extractMessageText(message: Record<string, unknown>) {
  const text = typeof message.text === "string" ? message.text : "";
  if (text.trim()) {
    return text.trim();
  }

  const caption = typeof message.caption === "string" ? message.caption : "";
  if (caption.trim()) {
    return caption.trim();
  }

  return "";
}

export function normalizeTelegramWebhookUpdate(rawUpdate: unknown): TelegramWebhookMessage | null {
  const update =
    rawUpdate && typeof rawUpdate === "object" && !Array.isArray(rawUpdate)
      ? (rawUpdate as Record<string, unknown>)
      : null;
  if (!update) {
    return null;
  }

  const messageCandidate = [update.message, update.edited_message].find(
    (value) => value && typeof value === "object" && !Array.isArray(value)
  ) as Record<string, unknown> | undefined;

  if (!messageCandidate) {
    return null;
  }

  const chat =
    messageCandidate.chat &&
    typeof messageCandidate.chat === "object" &&
    !Array.isArray(messageCandidate.chat)
      ? (messageCandidate.chat as Record<string, unknown>)
      : {};
  const from =
    messageCandidate.from &&
    typeof messageCandidate.from === "object" &&
    !Array.isArray(messageCandidate.from)
      ? (messageCandidate.from as Record<string, unknown>)
      : {};
  const replyToMessage =
    messageCandidate.reply_to_message &&
    typeof messageCandidate.reply_to_message === "object" &&
    !Array.isArray(messageCandidate.reply_to_message)
      ? (messageCandidate.reply_to_message as Record<string, unknown>)
      : {};
  const replyToFrom =
    replyToMessage.from &&
    typeof replyToMessage.from === "object" &&
    !Array.isArray(replyToMessage.from)
      ? (replyToMessage.from as Record<string, unknown>)
      : {};

  const text = extractMessageText(messageCandidate);
  if (!text) {
    return null;
  }

  const botUsername = getTelegramBotUsername().toLowerCase();
  const mentionsBot = text.toLowerCase().includes(`@${botUsername}`) || text.toLowerCase().includes(botUsername.toLowerCase());
  const isReplyToBot =
    typeof replyToFrom.username === "string" &&
    replyToFrom.username.toLowerCase() === botUsername;
  const isCommand = text.trim().startsWith("/");
  const chatTypeRaw = typeof chat.type === "string" ? chat.type : "unknown";

  return {
    updateId: String(update.update_id ?? ""),
    messageId: String(messageCandidate.message_id ?? ""),
    chatId: String(chat.id ?? ""),
    chatType:
      chatTypeRaw === "private" ||
      chatTypeRaw === "group" ||
      chatTypeRaw === "supergroup" ||
      chatTypeRaw === "channel"
        ? chatTypeRaw
        : "unknown",
    chatTitle:
      typeof chat.title === "string"
        ? chat.title
        : typeof chat.username === "string"
          ? chat.username
          : null,
    username: typeof from.username === "string" ? from.username : null,
    fromId: from.id !== undefined ? String(from.id) : null,
    fromName:
      [from.first_name, from.last_name]
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .join(" ")
        .trim() || null,
    text,
    isBot: from.is_bot === true,
    mentionsBot,
    isReplyToBot,
    isCommand,
    timestamp:
      typeof messageCandidate.date === "number" ? Number(messageCandidate.date) : null
  };
}
