import { NextResponse } from "next/server";

import { requireStaffRouteAccess } from "@/lib/auth/api-authorization";
import { extractErrorMessage, jsonError } from "@/lib/http/api-response";
import {
  listLatestDocumentRequests,
  requestCaseDocument,
  updateDocumentRequestStatus
} from "@/lib/services/manage-documents";

export async function GET() {
  const access = await requireStaffRouteAccess({
    service: "internal_document_requests",
    action: "read"
  });

  if (!access.ok) {
    return access.response;
  }

  const items = await listLatestDocumentRequests(20);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_document_requests",
    action: "write"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const result = await requestCaseDocument(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 201 });
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel criar a solicitacao."),
      400
    );
  }
}

export async function PATCH(request: Request) {
  const access = await requireStaffRouteAccess({
    service: "internal_document_requests",
    action: "update"
  });

  if (!access.ok) {
    return access.response;
  }

  try {
    const payload = await request.json();
    const result = await updateDocumentRequestStatus(payload, access.profile.id);
    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    return jsonError(
      extractErrorMessage(error, "Nao foi possivel atualizar a solicitacao."),
      400
    );
  }
}
