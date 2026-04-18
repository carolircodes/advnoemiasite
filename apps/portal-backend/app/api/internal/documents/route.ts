import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import {
  listLatestDocuments,
  registerCaseDocument
} from "@/lib/services/manage-documents";

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_documents",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  const items = await listLatestDocuments(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_documents",
    action: "write"
  });

  if (!access.ok) {
    return access.response;
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
        requestId: formData.get("requestId"),
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
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel registrar o documento."),
      400
    );
  }
}
