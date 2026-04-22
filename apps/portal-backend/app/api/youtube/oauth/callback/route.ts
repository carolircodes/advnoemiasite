import { NextRequest, NextResponse } from "next/server";

import { exchangeYouTubeOAuthCode, verifyYouTubeOAuthState } from "@/lib/youtube/youtube-auth";
import { getYouTubeReadinessReport } from "@/lib/youtube/youtube-config";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderHtml(input: {
  title: string;
  lines: string[];
  tone?: "success" | "error";
}) {
  const tone = input.tone === "error" ? "#7f1d1d" : "#14532d";
  const background = input.tone === "error" ? "#fef2f2" : "#f0fdf4";

  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="font-family: ui-sans-serif, sans-serif; background: #fafaf9; color: #111827; padding: 32px;">
    <main style="max-width: 760px; margin: 0 auto; background: white; border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px;">
      <h1 style="margin-top: 0;">${escapeHtml(input.title)}</h1>
      <div style="background: ${background}; color: ${tone}; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        ${input.lines.map((line) => `<p style="margin: 0 0 10px 0;">${escapeHtml(line)}</p>`).join("")}
      </div>
      <p style="color: #4b5563;">Feche esta aba depois de registrar as informacoes no fluxo operacional do portal.</p>
    </main>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (error) {
    return new NextResponse(
      renderHtml({
        title: "OAuth do YouTube rejeitado",
        tone: "error",
        lines: [
          `O provedor retornou o erro ${error}.`,
          "Revise o client OAuth, o redirect URI e a tela de consentimento no Google Cloud."
        ]
      }),
      {
        status: 400,
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      }
    );
  }

  if (!code || !state) {
    return new NextResponse(
      renderHtml({
        title: "OAuth do YouTube incompleto",
        tone: "error",
        lines: [
          "O callback chegou sem code ou state.",
          "Refaca a autorizacao a partir da rota interna do portal."
        ]
      }),
      {
        status: 400,
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      }
    );
  }

  try {
    const statePayload = verifyYouTubeOAuthState(state);
    const tokenResponse = await exchangeYouTubeOAuthCode(code);
    const readiness = getYouTubeReadinessReport();

    return new NextResponse(
      renderHtml({
        title: "OAuth do YouTube concluido",
        tone: "success",
        lines: [
          `Fluxo autorizado para o modo ${statePayload.mode}.`,
          `Redirect operacional de origem: ${statePayload.redirectTo}.`,
          `Refresh token recebido: ${tokenResponse.refreshToken ? "sim" : "nao"}.`,
          `Scopes concedidos: ${tokenResponse.scope || "nao informado"}.`,
          `Prontidao atual para active reply: ${readiness.credentialState.canReply ? "completa" : "incompleta"}.`,
          tokenResponse.refreshToken
            ? `Registre o valor completo do refresh token no ambiente seguro em YOUTUBE_REFRESH_TOKEN.`
            : "Se o refresh token nao veio, refaca a autorizacao com prompt=consent e access_type=offline."
        ]
      }),
      {
        status: 200,
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      }
    );
  } catch (callbackError) {
    return new NextResponse(
      renderHtml({
        title: "OAuth do YouTube falhou",
        tone: "error",
        lines: [
          callbackError instanceof Error ? callbackError.message : String(callbackError),
          "Revise o state, as credenciais OAuth e o redirect URI configurado."
        ]
      }),
      {
        status: 400,
        headers: {
          "content-type": "text/html; charset=utf-8"
        }
      }
    );
  }
}
