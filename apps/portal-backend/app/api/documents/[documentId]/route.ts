import { NextResponse, type NextRequest } from "next/server";

import { canAccessPortalPath } from "@/lib/auth/access-control";
import { getCurrentProfile } from "@/lib/auth/guards";
import { getAccessibleDocumentFile } from "@/lib/services/manage-documents";
import { recordProductEvent } from "@/lib/services/public-intake";

function canPreviewInBrowser(mimeType: string | null) {
  return !!mimeType && (mimeType === "application/pdf" || mimeType.startsWith("image/"));
}

function buildDisposition(fileName: string, asDownload: boolean, mimeType: string | null) {
  const mode = asDownload || !canPreviewInBrowser(mimeType) ? "attachment" : "inline";
  return `${mode}; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ documentId: string }> }
) {
  const profile = await getCurrentProfile();

  if (!profile) {
    return NextResponse.json(
      { error: "Faca login para acessar este arquivo." },
      { status: 401 }
    );
  }

  if (!profile.is_active) {
    return NextResponse.json(
      { error: "Seu perfil do portal esta inativo." },
      { status: 403 }
    );
  }

  if (!canAccessPortalPath(profile, "/documentos")) {
    return NextResponse.json(
      { error: "Voce nao tem permissao para acessar os documentos do portal." },
      { status: 403 }
    );
  }

  const { documentId } = await context.params;

  try {
    const result = await getAccessibleDocumentFile(documentId);

    if (!result) {
      return NextResponse.json(
        { error: "Documento nao encontrado ou indisponivel para esta sessao." },
        { status: 404 }
      );
    }

    const forceDownload = request.nextUrl.searchParams.get("download") === "1";
    const fileBuffer = Buffer.from(await result.file.arrayBuffer());

    if (profile.role === "cliente") {
      try {
        await recordProductEvent({
          eventKey: forceDownload
            ? "client_document_downloaded"
            : "client_document_previewed",
          eventGroup: "portal",
          pagePath: "/documentos",
          profileId: profile.id,
          payload: {
            documentId: result.document.id,
            caseId: result.document.case_id,
            category: result.document.category,
            mimeType: result.document.mime_type || "",
            accessMode: forceDownload ? "download" : "preview"
          }
        });
      } catch (trackingError) {
        console.error("[documents.route] Failed to record document usage event", {
          documentId,
          profileId: profile.id,
          message: trackingError instanceof Error ? trackingError.message : String(trackingError)
        });
      }
    }

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": result.document.mime_type || "application/octet-stream",
        "Content-Length": String(result.document.file_size_bytes || fileBuffer.byteLength),
        "Content-Disposition": buildDisposition(
          result.document.file_name,
          forceDownload,
          result.document.mime_type
        ),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o arquivo solicitado."
      },
      { status: 400 }
    );
  }
}
