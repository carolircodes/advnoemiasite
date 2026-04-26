import "server-only";

import { z } from "zod";

import { createAdminSupabaseClient } from "../supabase/admin.ts";
import { recordProductEvent } from "./public-intake.ts";
import {
  getTelegramChannelConfig,
  publishTelegramChannelMessage
} from "../telegram/telegram-service.ts";

const publishTelegramPostSchema = z.object({
  content: z.string().trim().min(12).max(4000),
  title: z.string().trim().max(160).optional(),
  editorialSource: z.string().trim().max(120).optional(),
  topic: z.string().trim().max(120).optional(),
  ctaLabel: z.string().trim().max(120).optional(),
  ctaUrl: z.string().trim().url().max(300).optional(),
  relatedContentId: z.string().trim().max(160).optional(),
  signalType: z
    .enum(["editorial_bridge", "premium_signal", "waitlist_signal", "founder_signal"])
    .optional()
});

type TelegramPublicationRow = {
  id: string;
  channel_key: string;
  channel_username: string;
  publication_type: string;
  title: string | null;
  body: string;
  editorial_source: string | null;
  topic: string | null;
  cta_label: string | null;
  cta_url: string | null;
  related_content_id: string | null;
  signal_type: string | null;
  status: string;
  provider_message_id: string | null;
  provider_status: string | null;
  error_message: string | null;
  posted_at: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  created_by: string | null;
  created_by_name: string | null;
};

export type TelegramDistributionOverview = {
  channel: {
    mode: "channel_broadcast";
    username: string;
    url: string;
    botConfigured: boolean;
    futureGroupReady: boolean;
  };
  metrics: {
    totalPosts: number;
    sentPosts: number;
    failedPosts: number;
    premiumSignals: number;
    waitlistSignals: number;
    founderSignals: number;
    editorialBridges: number;
    postsLast7Days: number;
  };
  recentPosts: Array<{
    id: string;
    title: string | null;
    bodyPreview: string;
    status: string;
    signalType: string | null;
    topic: string | null;
    editorialSource: string | null;
    ctaLabel: string | null;
    ctaUrl: string | null;
    postedAt: string | null;
    createdAt: string;
    createdByName: string | null;
  }>;
  discipline: {
    officialRole: string;
    whenToUse: string[];
    whenNotToUse: string[];
    futureGroupReadiness: string;
  };
};

class TelegramDistributionService {
  private supabase = createAdminSupabaseClient();

  async getOverview(): Promise<TelegramDistributionOverview> {
    const config = getTelegramChannelConfig();
    const { data } = await this.supabase
      .from("telegram_channel_publications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const rows = (data || []) as TelegramPublicationRow[];
    const now = Date.now();

    return {
      channel: {
        mode: config.mode,
        username: config.channelUsername,
        url: config.channelUrl,
        botConfigured: config.botConfigured,
        futureGroupReady: config.readyForFutureGroup
      },
      metrics: {
        totalPosts: rows.length,
        sentPosts: rows.filter((row) => row.status === "sent").length,
        failedPosts: rows.filter((row) => row.status === "failed").length,
        premiumSignals: rows.filter((row) => row.signal_type === "premium_signal").length,
        waitlistSignals: rows.filter((row) => row.signal_type === "waitlist_signal").length,
        founderSignals: rows.filter((row) => row.signal_type === "founder_signal").length,
        editorialBridges: rows.filter((row) => row.signal_type === "editorial_bridge").length,
        postsLast7Days: rows.filter((row) => now - new Date(row.created_at).getTime() <= 7 * 86400000).length
      },
      recentPosts: rows.map((row) => ({
        id: row.id,
        title: row.title,
        bodyPreview: row.body.slice(0, 220),
        status: row.status,
        signalType: row.signal_type,
        topic: row.topic,
        editorialSource: row.editorial_source,
        ctaLabel: row.cta_label,
        ctaUrl: row.cta_url,
        postedAt: row.posted_at,
        createdAt: row.created_at,
        createdByName: row.created_by_name
      })),
      discipline: {
        officialRole:
          "Telegram opera como canal de distribuicao premium e ponte editorial do ecossistema, sem competir com inbox privada.",
        whenToUse: [
          "avisos premium e publicacoes curatoriais",
          "ponte para portal, site, artigos e biblioteca",
          "sinais de founder, waitlist e pertencimento"
        ],
        whenNotToUse: [
          "atendimento 1:1 ou handoff de thread",
          "substituir WhatsApp, Instagram DM ou site chat",
          "abrir discussao em grupo nesta fase"
        ],
        futureGroupReadiness:
          "A trilha de publicacao fica separada da semantica de thread para permitir grupo futuro sem refatorar broadcast."
      }
    };
  }

  async publishPost(input: unknown, actor: { id: string; name: string }) {
    const parsed = publishTelegramPostSchema.parse(input);
    const config = getTelegramChannelConfig();
    const formattedMessage = this.formatMessage(parsed);
    const sendResult = await publishTelegramChannelMessage({
      text: formattedMessage,
      disablePreview: false
    });
    const now = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("telegram_channel_publications")
      .insert({
        channel_key: "telegram_channel_main",
        channel_username: config.channelUsername,
        publication_type: "channel_post",
        title: parsed.title || null,
        body: parsed.content,
        editorial_source: parsed.editorialSource || null,
        topic: parsed.topic || null,
        cta_label: parsed.ctaLabel || null,
        cta_url: parsed.ctaUrl || null,
        related_content_id: parsed.relatedContentId || null,
        signal_type: parsed.signalType || null,
        status: sendResult.ok ? "sent" : "failed",
        provider_message_id: sendResult.messageId,
        provider_status: sendResult.status,
        error_message: sendResult.error,
        posted_at: sendResult.ok ? now : null,
        metadata: {
          channelMode: "channel_broadcast",
          channelUrl: config.channelUrl,
          botConfigured: config.botConfigured,
          futureGroupReady: true
        },
        created_by: actor.id,
        created_by_name: actor.name
      })
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message || "Nao foi possivel registrar a publicacao do Telegram.");
    }

    await this.recordTelemetry({
      publicationId: data.id,
      pagePath: "/internal/advogada/atendimento",
      signalType: parsed.signalType || null,
      topic: parsed.topic || null,
      editorialSource: parsed.editorialSource || null,
      ctaUrl: parsed.ctaUrl || null,
      actorName: actor.name,
      sendSucceeded: sendResult.ok
    });

    await this.supabase.from("audit_logs").insert({
      actor_profile_id: actor.id,
      action: "telegram.channel.publish",
      entity_type: "telegram_channel_publications",
      entity_id: data.id,
      payload: {
        signalType: parsed.signalType || null,
        topic: parsed.topic || null,
        editorialSource: parsed.editorialSource || null,
        channelUsername: config.channelUsername,
        status: sendResult.status
      }
    });

    return {
      ok: sendResult.ok,
      publicationId: data.id,
      messageId: sendResult.messageId,
      status: sendResult.status,
      error: sendResult.error,
      channelUrl: config.channelUrl
    };
  }

  private formatMessage(input: z.infer<typeof publishTelegramPostSchema>) {
    const parts = [
      input.title?.trim(),
      input.content.trim(),
      input.ctaLabel && input.ctaUrl ? `${input.ctaLabel}: ${input.ctaUrl}` : input.ctaUrl || null
    ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    return parts.join("\n\n");
  }

  private async recordTelemetry(input: {
    publicationId: string;
    pagePath: string;
    signalType: string | null;
    topic: string | null;
    editorialSource: string | null;
    ctaUrl: string | null;
    actorName: string;
    sendSucceeded: boolean;
  }) {
    await recordProductEvent({
      eventKey: "telegram_channel_posted",
      eventGroup: "distribution",
      pagePath: input.pagePath,
      payload: {
        publicationId: input.publicationId,
        signalType: input.signalType,
        topic: input.topic,
        editorialSource: input.editorialSource,
        actorName: input.actorName,
        sendSucceeded: input.sendSucceeded
      }
    });

    await recordProductEvent({
      eventKey: "telegram_content_distributed",
      eventGroup: "distribution",
      pagePath: input.pagePath,
      payload: {
        publicationId: input.publicationId,
        ctaUrl: input.ctaUrl,
        editorialSource: input.editorialSource,
        topic: input.topic
      }
    });

    if (input.signalType === "premium_signal") {
      await recordProductEvent({
        eventKey: "telegram_premium_signal",
        eventGroup: "ecosystem",
        pagePath: input.pagePath,
        payload: { publicationId: input.publicationId, topic: input.topic }
      });
    }

    if (input.signalType === "waitlist_signal") {
      await recordProductEvent({
        eventKey: "telegram_waitlist_signal",
        eventGroup: "ecosystem",
        pagePath: input.pagePath,
        payload: { publicationId: input.publicationId, topic: input.topic }
      });
    }

    if (input.signalType === "founder_signal") {
      await recordProductEvent({
        eventKey: "telegram_founder_signal",
        eventGroup: "ecosystem",
        pagePath: input.pagePath,
        payload: { publicationId: input.publicationId, topic: input.topic }
      });
    }

    if (input.signalType === "editorial_bridge") {
      await recordProductEvent({
        eventKey: "telegram_editorial_bridge",
        eventGroup: "ecosystem",
        pagePath: input.pagePath,
        payload: {
          publicationId: input.publicationId,
          topic: input.topic,
          editorialSource: input.editorialSource
        }
      });
    }
  }
}

export const telegramDistributionService = new TelegramDistributionService();
