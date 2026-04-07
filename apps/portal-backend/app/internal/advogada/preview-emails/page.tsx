import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Preview de e-mails",
  robots: { index: false, follow: false }
};

const TIERS = [
  {
    id: "novo-cliente",
    label: "Novo Cliente",
    description: "Convite de primeiro acesso ao portal",
    dot: "#c8a96b"
  },
  {
    id: "em-andamento",
    label: "Em Andamento",
    description: "Atualização de caso ativo",
    dot: "#9fcec1"
  },
  {
    id: "pendencia",
    label: "Pendência",
    description: "Lembrete de documento solicitado",
    dot: "#c8a96b"
  },
  {
    id: "vip",
    label: "VIP",
    description: "Compromisso urgente — tratamento prioritário",
    dot: "#ead7af"
  }
] as const;

export default async function PreviewEmailsPage() {
  const profile = await requireProfile(["admin", "advogada"]);

  if (!profile) {
    redirect("/auth/login");
  }

  return (
    <div style={{ background: "#07110f", minHeight: "100vh", padding: "32px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>

        {/* Cabeçalho da página */}
        <div style={{ marginBottom: "36px" }}>
          <p style={{
            margin: "0 0 8px",
            color: "#c8a96b",
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "monospace"
          }}>
            Área interna — Advogada
          </p>
          <h1 style={{
            margin: "0 0 10px",
            color: "#f8f3ea",
            fontSize: "32px",
            fontFamily: "Georgia, serif",
            fontWeight: 600,
            letterSpacing: "-0.02em"
          }}>
            Preview de E-mails
          </h1>
          <p style={{ margin: 0, color: "rgba(248,243,234,0.6)", fontSize: "15px", lineHeight: 1.7 }}>
            Visualização dos 4 templates de e-mail premium por tipo de cliente.
            Cada iframe renderiza o HTML exato enviado ao destinatário.
          </p>
        </div>

        {/* Grid de previews */}
        <div style={{ display: "grid", gap: "40px" }}>
          {TIERS.map((tier) => (
            <div key={tier.id}>
              {/* Label do tier */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "14px"
              }}>
                <span style={{
                  display: "inline-block",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: tier.dot,
                  flexShrink: 0
                }} />
                <div>
                  <strong style={{
                    color: "#f8f3ea",
                    fontSize: "16px",
                    fontFamily: "Georgia, serif"
                  }}>
                    {tier.label}
                  </strong>
                  <span style={{
                    marginLeft: "12px",
                    color: "rgba(248,243,234,0.5)",
                    fontSize: "13px"
                  }}>
                    {tier.description}
                  </span>
                </div>
                <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                  <a
                    href={`/api/internal/email-preview?tier=${tier.id}&format=html`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(248,243,234,0.7)",
                      fontSize: "12px",
                      textDecoration: "none",
                      fontWeight: 600,
                      letterSpacing: "0.04em"
                    }}
                  >
                    Abrir HTML ↗
                  </a>
                  <a
                    href={`/api/internal/email-preview?tier=${tier.id}&format=text`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "999px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(248,243,234,0.7)",
                      fontSize: "12px",
                      textDecoration: "none",
                      fontWeight: 600,
                      letterSpacing: "0.04em"
                    }}
                  >
                    Ver texto ↗
                  </a>
                </div>
              </div>

              {/* Iframe do e-mail */}
              <div style={{
                borderRadius: "16px",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.07)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.4)"
              }}>
                <iframe
                  src={`/api/internal/email-preview?tier=${tier.id}&format=html`}
                  style={{
                    width: "100%",
                    height: "640px",
                    border: "none",
                    display: "block",
                    background: "#e8e2d9"
                  }}
                  title={`Preview: ${tier.label}`}
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Nota de rodapé */}
        <p style={{
          marginTop: "40px",
          color: "rgba(248,243,234,0.3)",
          fontSize: "12px",
          textAlign: "center",
          lineHeight: 1.7
        }}>
          Esta página é visível apenas para a equipe interna. Os e-mails acima
          refletem exatamente o que é enviado ao cliente pelo sistema de notificações.
        </p>

      </div>
    </div>
  );
}
