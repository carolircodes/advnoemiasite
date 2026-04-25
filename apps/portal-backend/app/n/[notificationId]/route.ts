import { NextResponse } from "next/server";

import { recordNotificationInteraction } from "@/lib/notifications/action-tracking";
import {
  appendNotificationContext,
  buildSafeNotificationTarget
} from "@/lib/notifications/notification-links";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function getFallbackPath(audience: string | null) {
  return audience === "operations" || audience === "lawyer" ? "/internal/advogada" : "/cliente";
}

export async function GET(
  request: Request,
  context: {
    params: Promise<{ notificationId: string }>;
  }
) {
  const params = await context.params;
  const appOrigin = new URL(request.url).origin;
  const supabase = createAdminSupabaseClient();
  const { data } = await supabase
    .from("notifications_outbox")
    .select("id,action_url,audience,canonical_event_key,recipient_profile_id")
    .eq("id", params.notificationId)
    .maybeSingle();

  const target = buildSafeNotificationTarget({
    rawTarget: data?.action_url,
    fallbackPath: getFallbackPath(data?.audience || null),
    appOrigin
  });

  if (data?.id) {
    try {
      await recordNotificationInteraction({
        notificationId: data.id,
        interactionType: "cta_clicked",
        profileId: data.recipient_profile_id || null,
        pagePath: target.pathname,
        metadata: {
          source: "email_cta"
        }
      });
    } catch (error) {
      console.warn("[notifications.redirect] tracking_failed", {
        notificationId: data.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }

    appendNotificationContext(target, {
      notificationId: data.id,
      eventKey: data.canonical_event_key,
      source: "email"
    });
  }

  return NextResponse.redirect(target, 307);
}
