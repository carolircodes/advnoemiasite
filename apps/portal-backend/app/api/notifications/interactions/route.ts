import { z } from "zod";

import { recordNotificationInteraction } from "@/lib/notifications/action-tracking";
import {
  createObservedJsonResponse,
  logObservedRequest,
  startRequestObservation
} from "@/lib/observability/request-observability";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const interactionSchema = z.object({
  notificationId: z.string().trim().uuid(),
  interactionType: z.enum(["deep_link_opened", "action_completed"]),
  pagePath: z.string().trim().max(300).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export async function POST(request: Request) {
  const observation = startRequestObservation(request, {
    flow: "notification_interactions",
    provider: "portal"
  });

  try {
    const body = interactionSchema.parse(await request.json());
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    await recordNotificationInteraction({
      notificationId: body.notificationId,
      interactionType: body.interactionType,
      profileId: user?.id || null,
      pagePath: body.pagePath || null,
      metadata: body.metadata || {}
    });

    logObservedRequest("info", "NOTIFICATION_INTERACTION_API_RECORDED", observation, {
      interactionType: body.interactionType
    });

    return createObservedJsonResponse(observation, {
      ok: true
    });
  } catch (error) {
    logObservedRequest("warn", "NOTIFICATION_INTERACTION_API_FAILED", observation, {}, error);
    return createObservedJsonResponse(
      observation,
      {
        ok: false,
        error: "Nao foi possivel registrar a interacao agora."
      },
      {
        status: 400
      }
    );
  }
}
