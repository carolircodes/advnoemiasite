import { NextRequest, NextResponse } from "next/server";

import { requireInternalOperatorAccess } from "@/lib/auth/api-authorization";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type ProductEventRecord = {
  event_key: string;
  event_group: string;
  occurred_at: string;
  session_id: string | null;
  payload: Record<string, unknown> | null;
};

function getPayloadString(payload: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!payload) {
    return "";
  }

  for (const key of keys) {
    const value = payload[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function incrementCounter(counter: Record<string, number>, key: string) {
  counter[key] = (counter[key] || 0) + 1;
}

function formatPlatform(platform: string) {
  return platform || "unknown";
}

function normalizeTheme(theme: string) {
  return theme || "geral";
}

export async function GET(request: NextRequest) {
  const access = await requireInternalOperatorAccess({
    request,
    service: "internal_acquisition",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const supabase = createAdminSupabaseClient();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from("product_events")
      .select("event_key,event_group,occurred_at,session_id,payload")
      .gte("occurred_at", since)
      .in("event_group", ["acquisition", "social_engagement", "social_conversion", "conversion"])
      .order("occurred_at", { ascending: false })
      .limit(3000);

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          data: null
        },
        { status: 500 }
      );
    }

    const events = (data || []) as ProductEventRecord[];
    const acquisitionEvents = events.filter(
      (event) =>
        event.event_key === "social_entry_created" ||
        event.event_key === "triage_submitted" ||
        event.event_key === "comment_received" ||
        event.event_key === "dm_started_from_comment"
    );

    const platformStats: Record<string, { contents: number; acquisitions: number; conversion: number }> = {};
    const themeCounter: Record<string, { acquisitions: number; contents: Set<string> }> = {};
    const keywordCounter: Record<string, number> = {};
    const contentCounter: Record<
      string,
      {
        title: string;
        theme: string;
        platform: string;
        acquisitions: number;
        conversionSignals: number;
      }
    > = {};
    const contentSetByPlatform: Record<string, Set<string>> = {};
    const dailyCounter: Record<string, { acquisitions: number; platform: string }> = {};

    for (const event of acquisitionEvents) {
      const payload = event.payload || {};
      const platform = formatPlatform(
        getPayloadString(payload, ["sourceChannel", "channel"]) || "unknown"
      );
      const theme = normalizeTheme(
        getPayloadString(payload, ["topic", "tema", "caseArea"]) || "geral"
      );
      const keyword =
        getPayloadString(payload, ["entryType", "source", "topicLabel", "theme"]) || "social";
      const contentId = getPayloadString(payload, ["contentId", "content_id"]) || "sem-conteudo";
      const contentLabel =
        getPayloadString(payload, ["contentLabel", "content_label"]) || contentId;
      const contentType = getPayloadString(payload, ["contentType", "content_type"]) || "unknown";
      const occurredDate = event.occurred_at.split("T")[0];

      if (!platformStats[platform]) {
        platformStats[platform] = {
          contents: 0,
          acquisitions: 0,
          conversion: 0
        };
      }

      platformStats[platform].acquisitions += 1;
      if (!contentSetByPlatform[platform]) {
        contentSetByPlatform[platform] = new Set();
      }
      contentSetByPlatform[platform].add(contentId);

      if (!themeCounter[theme]) {
        themeCounter[theme] = {
          acquisitions: 0,
          contents: new Set()
        };
      }
      themeCounter[theme].acquisitions += 1;
      themeCounter[theme].contents.add(contentId);

      incrementCounter(keywordCounter, keyword);

      if (!contentCounter[contentId]) {
        contentCounter[contentId] = {
          title: contentLabel,
          theme,
          platform,
          acquisitions: 0,
          conversionSignals: 0
        };
      }
      contentCounter[contentId].acquisitions += 1;

      if (!dailyCounter[occurredDate]) {
        dailyCounter[occurredDate] = {
          acquisitions: 0,
          platform
        };
      }
      dailyCounter[occurredDate].acquisitions += 1;

      if (contentType === "instagram_dm_thread" || event.event_key === "dm_started_from_comment") {
        contentCounter[contentId].conversionSignals += 1;
      }
    }

    for (const platform of Object.keys(platformStats)) {
      platformStats[platform].contents = contentSetByPlatform[platform]?.size || 0;
      platformStats[platform].conversion =
        platformStats[platform].acquisitions > 0
          ? Number(
              (
                events.filter(
                  (event) =>
                    getPayloadString(event.payload, ["sourceChannel", "channel"]) === platform &&
                    (event.event_key === "lead_progressed_from_content" ||
                      event.event_key === "direct_conversion_signal")
                ).length / platformStats[platform].acquisitions
              ).toFixed(3)
            ) * 100
          : 0;
    }

    const themes = Object.entries(themeCounter).map(([theme, stats]) => ({
      theme,
      acquisitions: stats.acquisitions,
      contents: stats.contents.size,
      conversion:
        stats.acquisitions > 0
          ? Number(
              (
                events.filter(
                  (event) =>
                    normalizeTheme(getPayloadString(event.payload, ["topic", "tema"])) === theme &&
                    event.event_key === "lead_progressed_from_content"
                ).length / stats.acquisitions
              ).toFixed(3)
            ) * 100
          : 0
    }));

    const keywords = Object.entries(keywordCounter)
      .map(([keyword, acquisitions]) => ({
        keyword,
        acquisitions,
        conversion: acquisitions
      }))
      .sort((left, right) => right.acquisitions - left.acquisitions)
      .slice(0, 10);

    const topContents = Object.entries(contentCounter)
      .map(([id, item]) => ({
        id,
        title: item.title,
        theme: item.theme,
        platform: item.platform,
        reach: item.acquisitions,
        conversionRate:
          item.acquisitions > 0
            ? Number((item.conversionSignals / item.acquisitions).toFixed(3)) * 100
            : 0,
        acquisitions: item.acquisitions
      }))
      .sort((left, right) => right.acquisitions - left.acquisitions)
      .slice(0, 5);

    const dailyStats = Object.entries(dailyCounter)
      .map(([date, item]) => ({
        date,
        acquisitions: item.acquisitions,
        platform: item.platform
      }))
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-7);

    const recentAcquisitions = acquisitionEvents.slice(0, 10).map((event, index) => {
      const payload = event.payload || {};
      return {
        id: `${event.session_id || "session"}-${index}`,
        platform: formatPlatform(getPayloadString(payload, ["sourceChannel", "channel"]) || "unknown"),
        source: getPayloadString(payload, ["sourceLabel", "source", "entryType"]) || event.event_key,
        keyword: getPayloadString(payload, ["entryType", "topicLabel", "theme"]) || "social",
        theme: normalizeTheme(getPayloadString(payload, ["topic", "tema", "caseArea"]) || "geral"),
        capturedAt: event.occurred_at,
        sessionId: event.session_id || "sem-sessao"
      };
    });

    const totalContents = new Set(
      acquisitionEvents.map((event) => getPayloadString(event.payload, ["contentId", "content_id"]) || "sem-conteudo")
    ).size;
    const totalAcquisitions = acquisitionEvents.length;
    const todayKey = new Date().toISOString().split("T")[0];
    const capturedToday = acquisitionEvents.filter((event) => event.occurred_at.startsWith(todayKey)).length;
    const capturedThisWeek = acquisitionEvents.filter(
      (event) => new Date(event.occurred_at).getTime() >= Date.now() - 7 * 24 * 60 * 60 * 1000
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        overview: {
          totalContents,
          totalReach: totalAcquisitions,
          totalAcquisitions,
          avgConversionRate:
            totalAcquisitions > 0
              ? Number(
                  (
                    events.filter(
                      (event) =>
                        event.event_key === "lead_progressed_from_content" ||
                        event.event_key === "direct_conversion_signal"
                    ).length / totalAcquisitions
                  ).toFixed(3)
                ) * 100
              : 0,
          capturedToday,
          capturedThisWeek
        },
        platforms: platformStats,
        themes,
        keywords,
        dailyStats,
        topContents,
        recentAcquisitions
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        source: "product_events",
        totalEventsAnalyzed: events.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        data: null
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const access = await requireInternalOperatorAccess({
    request,
    service: "internal_acquisition",
    action: "write"
  });

  if (!access.ok) {
    return access.response;
  }

  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: true,
    message: "Acquisition data is now read from product_events. No write action was executed.",
    data: body
  });
}
