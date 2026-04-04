import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import {
  listLatestDocumentRequests,
  requestCaseDocument
} from "@/lib/services/manage-documents";

export async function GET() {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const items = await listLatestDocumentRequests(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const payload = await request.json();
    const result = await requestCaseDocument(payload, access.profile.id);
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
