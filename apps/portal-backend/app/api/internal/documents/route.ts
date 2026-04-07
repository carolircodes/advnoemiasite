import { NextResponse } from "next/server";

import { requireInternalApiProfile } from "@/lib/auth/guards";
import {
  listLatestDocuments,
  registerCaseDocument
} from "@/lib/services/manage-documents";

export async function GET() {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const items = await listLatestDocuments(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const contentType = request.headers.get("content-type") || "";

    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          error:
            "Use multipart/form-data para enviar o arquivo real do documento."
        },
        { status: 415 }
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get("file");
    const result = await registerCaseDocument(
      {
        caseId: formData.get("caseId"),
        category: formData.get("category"),
        description: formData.get("description"),
        status: formData.get("status"),
        documentDate: formData.get("documentDate"),
        visibleToClient: formData.get("visibleToClient") === "on",
        shouldNotifyClient: formData.get("shouldNotifyClient") === "on"
      },
      access.profile.id,
      uploadedFile instanceof File ? uploadedFile : null
    );
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Nao foi possivel registrar o documento."
      },
      { status: 400 }
    );
  }
}
