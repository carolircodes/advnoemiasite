"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";

export type ClientUploadState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; message: string };

type UploadAction = (
  prevState: ClientUploadState,
  formData: FormData
) => Promise<ClientUploadState>;

const KEYFRAMES = `
  @keyframes upload-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes fade-up {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0);   }
  }
  @keyframes fade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes scale-in {
    from { opacity: 0; transform: scale(0.88); }
    to   { opacity: 1; transform: scale(1);    }
  }
  @keyframes check-draw {
    from { opacity: 0; transform: scale(0.5) rotate(-10deg); }
    to   { opacity: 1; transform: scale(1)   rotate(0deg);   }
  }
`;

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function configurePicker(
  input: HTMLInputElement | null,
  mode: "file" | "camera"
) {
  if (!input) {
    return;
  }

  if (mode === "camera") {
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
  } else {
    input.accept = ".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif";
    input.removeAttribute("capture");
  }

  input.click();
}

function SubmitButton({ hasFile }: { hasFile: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="button"
      disabled={pending || !hasFile}
      style={{
        gap: "10px",
        minWidth: "200px",
        transition: "opacity 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease"
      }}
    >
      {pending ? (
        <>
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "14px",
              height: "14px",
              border: "2px solid rgba(255,250,242,0.3)",
              borderTopColor: "#fffaf2",
              borderRadius: "50%",
              animation: "upload-spin 0.7s linear infinite",
              flexShrink: 0
            }}
          />
          Enviando com seguranca...
        </>
      ) : (
        "Confirmar envio"
      )}
    </button>
  );
}

function SuccessCard() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "grid",
        gap: "18px",
        padding: "24px",
        borderRadius: "18px",
        background:
          "linear-gradient(160deg, rgba(41,93,69,0.07) 0%, rgba(41,93,69,0.04) 100%)",
        border: "1px solid rgba(41, 93, 69, 0.2)",
        animation: "fade-up 0.38s ease"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "16px" }}>
        <span
          aria-hidden="true"
          style={{
            flexShrink: 0,
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            background: "rgba(41, 93, 69, 0.13)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--success)",
            animation: "check-draw 0.35s ease 0.1s both"
          }}
        >
          OK
        </span>
        <div>
          <p
            style={{
              margin: "0 0 5px",
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "var(--success)",
              letterSpacing: "-0.01em"
            }}
          >
            Documento recebido
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--muted)",
              lineHeight: 1.65
            }}
          >
            A Dra. Noemia e a equipe ja foram notificadas.
            <br />
            Vamos analisar o arquivo e confirmar o recebimento em breve.
          </p>
        </div>
      </div>

      <div
        aria-label="Etapas: Recebido, Em analise, Confirmado"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0",
          paddingTop: "4px",
          borderTop: "1px solid rgba(41, 93, 69, 0.12)",
          animation: "fade-in 0.4s ease 0.2s both"
        }}
      >
        {(
          [
            { label: "Recebido", done: true },
            { label: "Em analise", done: false },
            { label: "Confirmado", done: false }
          ] as const
        ).map((step, i, arr) => (
          <div
            key={step.label}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < arr.length - 1 ? 1 : undefined
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: step.done ? "var(--success)" : "rgba(14,31,27,0.15)",
                  flexShrink: 0,
                  transition: "background 0.3s"
                }}
              />
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: step.done ? 700 : 400,
                  color: step.done ? "var(--success)" : "var(--muted)",
                  letterSpacing: "0.01em",
                  whiteSpace: "nowrap"
                }}
              >
                {step.label}
              </span>
            </div>
            {i < arr.length - 1 ? (
              <div
                aria-hidden="true"
                style={{
                  flex: 1,
                  height: "1px",
                  background: "rgba(14,31,27,0.1)",
                  margin: "0 10px",
                  marginBottom: "16px"
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClientDocumentUploadCard({
  requestId,
  requestTitle,
  instructions,
  dueAtLabel,
  notificationId,
  uploadAction
}: {
  requestId: string;
  requestTitle: string;
  instructions: string | null;
  dueAtLabel: string | null;
  notificationId?: string | null;
  uploadAction: UploadAction;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHoveringZone, setIsHoveringZone] = useState(false);
  const [state, formAction] = useActionState(uploadAction, { status: "idle" });

  useEffect(() => {
    if (state.status === "success") {
      const t = setTimeout(() => router.refresh(), 4000);
      return () => clearTimeout(t);
    }
  }, [state.status, router]);

  if (state.status === "success") {
    return (
      <>
        <style>{KEYFRAMES}</style>
        <SuccessCard />
      </>
    );
  }

  const zoneBorder = isDragging
    ? "2px dashed rgba(142, 106, 59, 0.55)"
    : selectedFile
      ? "2px dashed rgba(41, 93, 69, 0.35)"
      : isHoveringZone
        ? "2px dashed rgba(14, 31, 27, 0.28)"
        : "2px dashed rgba(14, 31, 27, 0.15)";

  const zoneBg = isDragging
    ? "rgba(142, 106, 59, 0.04)"
    : selectedFile
      ? "rgba(41, 93, 69, 0.04)"
      : isHoveringZone
        ? "rgba(14, 31, 27, 0.02)"
        : "transparent";

  return (
    <>
      <style>{KEYFRAMES}</style>

      <form
        action={formAction}
        encType="multipart/form-data"
        style={{ display: "grid", gap: "18px" }}
        noValidate
      >
        <input type="hidden" name="requestId" value={requestId} />
        {notificationId ? (
          <input type="hidden" name="notificationId" value={notificationId} />
        ) : null}

        <div
          style={{
            padding: "16px 18px 16px 20px",
            borderRadius: "14px",
            background: "rgba(142, 106, 59, 0.045)",
            borderLeft: "3px solid rgba(142, 106, 59, 0.5)",
            border: "1px solid rgba(142, 106, 59, 0.13)",
            borderLeftWidth: "3px"
          }}
        >
          <p
            style={{
              margin: "0 0 5px",
              fontSize: "0.74rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--accent)"
            }}
          >
            O que enviar
          </p>
          <p
            style={{
              margin: "0",
              fontWeight: 700,
              fontSize: "0.97rem",
              color: "var(--text)",
              lineHeight: 1.4
            }}
          >
            {requestTitle}
          </p>
          {instructions ? (
            <p
              style={{
                margin: "8px 0 0",
                fontSize: "0.88rem",
                color: "var(--muted)",
                lineHeight: 1.7
              }}
            >
              {instructions}
            </p>
          ) : null}
          {dueAtLabel ? (
            <p
              style={{
                margin: "10px 0 0",
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--accent-strong)",
                display: "flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <span aria-hidden="true">•</span> Prazo: {dueAtLabel}
            </p>
          ) : null}
        </div>

        <div
          style={{
            display: "grid",
            gap: "10px",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))"
          }}
        >
          <button
            type="button"
            className="button secondary"
            onClick={() => configurePicker(inputRef.current, "file")}
          >
            Escolher arquivo
          </button>
          <button
            type="button"
            className="button secondary"
            onClick={() => configurePicker(inputRef.current, "camera")}
          >
            Usar camera do celular
          </button>
        </div>

        <div
          role="button"
          tabIndex={0}
          aria-label={
            selectedFile
              ? `Arquivo selecionado: ${selectedFile.name}. Clique para trocar.`
              : "Clique ou arraste para selecionar o arquivo"
          }
          onClick={() => configurePicker(inputRef.current, "file")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              configurePicker(inputRef.current, "file");
            }
          }}
          onMouseEnter={() => setIsHoveringZone(true)}
          onMouseLeave={() => setIsHoveringZone(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsDragging(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const dropped = e.dataTransfer.files[0];
            if (dropped && inputRef.current) {
              const dt = new DataTransfer();
              dt.items.add(dropped);
              inputRef.current.files = dt.files;
              setSelectedFile(dropped);
            }
          }}
          style={{
            padding: selectedFile ? "14px 18px" : "30px 18px",
            border: zoneBorder,
            borderRadius: "14px",
            background: zoneBg,
            cursor: "pointer",
            transition: "padding 0.22s ease, border-color 0.2s ease, background 0.2s ease",
            textAlign: selectedFile ? "left" : "center",
            outline: "none"
          }}
        >
          {selectedFile ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "13px",
                animation: "scale-in 0.2s ease"
              }}
            >
              <span aria-hidden="true" style={{ fontSize: "24px", flexShrink: 0 }}>
                PDF
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 3px",
                    fontWeight: 700,
                    fontSize: "0.94rem",
                    color: "var(--text)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap"
                  }}
                >
                  {selectedFile.name}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.82rem",
                    color: "var(--success)",
                    fontWeight: 600
                  }}
                >
                  {formatBytes(selectedFile.size)} · pronto para enviar
                </p>
              </div>
              <button
                type="button"
                aria-label="Remover arquivo selecionado"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                style={{
                  flexShrink: 0,
                  width: "30px",
                  height: "30px",
                  background: "rgba(14, 31, 27, 0.07)",
                  border: "none",
                  borderRadius: "50%",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "17px",
                  color: "var(--muted)",
                  lineHeight: 1,
                  transition: "background 0.15s ease"
                }}
              >
                ×
              </button>
            </div>
          ) : (
            <div style={{ animation: "fade-in 0.2s ease" }}>
              <p
                style={{
                  margin: "0 0 6px",
                  fontSize: "0.97rem",
                  fontWeight: 600,
                  color: isDragging ? "var(--accent-strong)" : "var(--text)",
                  transition: "color 0.18s ease"
                }}
              >
                {isDragging ? "Solte o arquivo aqui" : "Clique ou arraste o arquivo aqui"}
              </p>
              <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--muted)" }}>
                PDF, DOC, DOCX, JPG e PNG · maximo de 20 MB
              </p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            name="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.gif"
            required
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {state.status === "error" ? (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
              padding: "13px 16px",
              borderRadius: "12px",
              background: "rgba(142, 67, 59, 0.07)",
              border: "1px solid rgba(142, 67, 59, 0.15)",
              animation: "fade-up 0.22s ease"
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flexShrink: 0,
                marginTop: "1px",
                width: "18px",
                height: "18px",
                borderRadius: "50%",
                background: "rgba(142, 67, 59, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "11px",
                color: "var(--danger)",
                fontWeight: 700
              }}
            >
              !
            </span>
            <p
              style={{
                margin: 0,
                fontSize: "0.9rem",
                color: "var(--danger)",
                lineHeight: 1.55
              }}
            >
              {state.message}
            </p>
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "12px"
          }}
        >
          <SubmitButton hasFile={!!selectedFile} />
          {selectedFile ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Cancelar
            </button>
          ) : null}
        </div>

        <p
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.78rem",
            color: "rgba(79, 98, 93, 0.65)",
            lineHeight: 1.5
          }}
        >
          <span aria-hidden="true" style={{ fontSize: "12px" }}>
            Seg
          </span>
          Seus documentos sao enviados com criptografia e armazenados com seguranca.
        </p>
      </form>
    </>
  );
}
