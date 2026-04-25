import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureProfileForUser } from "@/lib/auth/guards";
import { loadNotificationPreferenceState } from "@/lib/notifications/preferences";
import {
  assessPushPilotReadiness,
  getPushPilotSubscriptionStatus,
  markPushPilotPermissionDecision,
  revokePushPilotSubscription,
  upsertPushPilotSubscription
} from "@/lib/notifications/push-pilot";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const subscribeSchema = z.object({
  mode: z.literal("subscribe"),
  endpoint: z.string().trim().url(),
  keys: z.object({
    p256dh: z.string().trim().min(10),
    auth: z.string().trim().min(10)
  }),
  deviceLabel: z.string().trim().max(120).optional(),
  platform: z.string().trim().max(120).optional()
});

const permissionSchema = z.object({
  mode: z.literal("permission"),
  permissionState: z.enum(["granted", "denied", "default"])
});

const revokeSchema = z.object({
  endpoint: z.string().trim().url().optional(),
  reason: z.string().trim().max(200).optional()
});

async function requireClientProfile() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: "Faca login para gerenciar o piloto push."
        },
        { status: 401 }
      )
    };
  }

  const profile = await ensureProfileForUser(user);

  if (!profile.is_active || profile.role !== "cliente") {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: "Apenas clientes ativos podem entrar no piloto push."
        },
        { status: 403 }
      )
    };
  }

  return {
    ok: true as const,
    profile
  };
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const actor = await requireClientProfile();
  if (!actor.ok) {
    return actor.response;
  }

  const [readiness, preferenceState, subscriptionStatus] = await Promise.all([
    assessPushPilotReadiness(),
    loadNotificationPreferenceState(actor.profile),
    getPushPilotSubscriptionStatus(actor.profile.id)
  ]);

  return NextResponse.json({
    ok: true,
    readiness,
    pushPilotInterested: preferenceState.state.pushPilotInterested,
    subscriptionStatus
  });
}

export async function POST(request: Request) {
  const actor = await requireClientProfile();
  if (!actor.ok) {
    return actor.response;
  }

  const body = await request.json();
  const readiness = await assessPushPilotReadiness();

  if (body?.mode === "permission") {
    const parsed = permissionSchema.parse(body);
    await markPushPilotPermissionDecision({
      profileId: actor.profile.id,
      decision: parsed.permissionState
    });

    return NextResponse.json({
      ok: true,
      permissionState: parsed.permissionState
    });
  }

  const parsed = subscribeSchema.parse(body);

  if (readiness.status !== "pilot_ready") {
    return NextResponse.json(
      {
        ok: false,
        error: "O piloto push ainda nao esta liberado neste ambiente."
      },
      { status: 409 }
    );
  }

  const preferenceState = await loadNotificationPreferenceState(actor.profile);
  if (!preferenceState.state.pushPilotInterested) {
    return NextResponse.json(
      {
        ok: false,
        error: "Ative o interesse no piloto push antes de registrar este dispositivo."
      },
      { status: 409 }
    );
  }

  await markPushPilotPermissionDecision({
    profileId: actor.profile.id,
    decision: "granted"
  });

  const subscription = await upsertPushPilotSubscription({
    profileId: actor.profile.id,
    endpoint: parsed.endpoint,
    p256dhKey: parsed.keys.p256dh,
    authKey: parsed.keys.auth,
    deviceLabel: parsed.deviceLabel,
    platform: parsed.platform
  });
  const subscriptionStatus = await getPushPilotSubscriptionStatus(actor.profile.id);

  return NextResponse.json({
    ok: true,
    subscription: {
      id: subscription.id,
      status: subscription.status,
      deviceLabel: subscription.device_label,
      platform: subscription.platform
    },
    subscriptionStatus
  });
}

export async function DELETE(request: Request) {
  const actor = await requireClientProfile();
  if (!actor.ok) {
    return actor.response;
  }

  const body = revokeSchema.parse(await request.json().catch(() => ({})));
  const revoked = await revokePushPilotSubscription({
    profileId: actor.profile.id,
    endpoint: body.endpoint || null,
    reason: body.reason || "user_opt_out"
  });
  const subscriptionStatus = await getPushPilotSubscriptionStatus(actor.profile.id);

  return NextResponse.json({
    ok: true,
    revokedCount: revoked.length,
    subscriptionStatus
  });
}
