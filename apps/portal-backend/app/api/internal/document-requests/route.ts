import { NextResponse } from "next/server";

import { getCurrentProfile, isStaffRole } from "@/lib/auth/guards";
import {
  listLatestDocumentRequests,
  requestCaseDocument
} from "@/lib/services/manage-documents";

export async function GET() {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatorio." }, { status: 401 });
  }

  const items = await listLatestDocumentRequests(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const profile = await getCurrentProfile();

  if (!profile || !isStaffRole(profile.role)) {
    return NextResponse.json({ error: "Acesso interno obrigatorio." }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const result = await requestCaseDocument(payload, profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Nao foi possivel criar a solicitacao."
      },
      { status: 400 }
    );
  }
}
