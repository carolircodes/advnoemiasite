import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordProductEvent } from "@/lib/services/public-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const supabase = await createServerSupabaseClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();
    let profileId: string | undefined;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id,is_active")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.is_active) {
        profileId = profile.id;
      }
    }

    const result = await recordProductEvent({
      ...payload,
      profileId
    });

    return NextResponse.json(
      {
        ok: true,
        eventId: result.id
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel registrar o evento agora."
      },
      { status: 400 }
    );
  }
}
