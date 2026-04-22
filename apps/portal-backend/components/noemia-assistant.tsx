"use client";

import { useEffect, useState, useTransition } from "react";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type NoemiaAssistantProps = {
  audience: "visitor" | "client" | "staff";
  displayName: string;
  suggestedPrompts: string[];
  currentPath?: string;
  ctaLabel?: string;
  articleTitle?: string;
  contentId?: string;
};

const audienceCopy = {
  visitor: {
    welcome:
      "Ola. Sou a NoemIA. Posso te ajudar a organizar seu caso, esclarecer as duvidas iniciais e indicar o proximo passo mais adequado com a equipe.",
    modeLabel: "Concierge juridica inicial",
    usageHint:
      "Pergunte sobre triagem, consulta, documentos iniciais, funcionamento do escritorio ou diga que quer iniciar seu atendimento.",
    placeholder:
      "Ex.: Quero entender meu melhor proximo passo e se ja faz sentido marcar uma consulta.",
    pendingText:
      "Estou organizando sua resposta com base no fluxo publico do escritorio para te indicar o melhor caminho agora...",
    successText: "Resposta pronta com orientacao inicial e proximo passo sugerido.",
    errorText:
      "Nao consegui responder com seguranca neste instante. Tente novamente em alguns segundos."
  },
  client: {
    welcome:
      "Ola. Sou a NoemIA. Posso traduzir o que aparece no seu portal com linguagem clara, resumir status, agenda, documentos e indicar o proximo passo pratico.",
    modeLabel: "Leitura clara do seu portal",
    usageHint:
      "Pergunte sobre status, documentos, agenda, pendencias ou o significado de uma etapa do seu caso.",
    placeholder:
      "Ex.: O que significa o estagio atual do meu caso e o que eu preciso fazer agora?",
    pendingText:
      "Estou cruzando o contexto disponivel do seu portal para responder com mais precisao...",
    successText: "Resposta pronta com base no que esta visivel no seu portal.",
    errorText: "Nao consegui acessar seu contexto agora. Tente novamente em instantes."
  },
  staff: {
    welcome:
      "Ola. Sou a NoemIA. Posso resumir triagens, destacar prioridades, sugerir proximos passos internos e acelerar a resposta operacional da equipe.",
    modeLabel: "Cockpit operacional",
    usageHint:
      "Peca leitura de prioridades, resumo de triagens, proximo passo interno ou um rascunho de retorno ao cliente.",
    placeholder:
      "Ex.: Resuma as prioridades de hoje e diga onde ha maior chance de avanco comercial ou risco operacional.",
    pendingText:
      "Estou cruzando operacao, telemetria e filas internas para responder com visao mais acionavel...",
    successText: "Analise operacional pronta com foco em decisao rapida.",
    errorText: "Nao consegui acessar os dados operacionais agora. Tente novamente."
  }
} as const;

export function NoemiaAssistant({
  audience,
  displayName,
  suggestedPrompts,
  currentPath = "/noemia",
  ctaLabel,
  articleTitle,
  contentId
}: NoemiaAssistantProps) {
  const copy = audienceCopy[audience];
  const welcomeMessage = {
    id: "welcome",
    role: "assistant" as const,
    content: copy.welcome
  };
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastSuccess, setLastSuccess] = useState(false);

  useEffect(() => {
    if (audience !== "visitor") {
      return;
    }

    let cancelled = false;

    async function syncConversation() {
      try {
        const response = await fetch("/api/noemia/chat", {
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || !result?.ok || !Array.isArray(result?.data?.messages)) {
          return;
        }

        const serverMessages = result.data.messages.map(
          (message: { id: string; role: "user" | "assistant"; content: string }) => ({
            id: message.id,
            role: message.role,
            content: message.content
          })
        );

        if (!cancelled) {
          setMessages(serverMessages.length ? [welcomeMessage, ...serverMessages] : [welcomeMessage]);
        }
      } catch {
        // Polling de sincronizacao fica silencioso para nao poluir a UX.
      }
    }

    void syncConversation();
    const interval = window.setInterval(() => {
      void syncConversation();
    }, 8000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [audience, welcomeMessage.content]);

  function buildPayload(cleanMessage: string, nextHistory: ChatMessage[]) {
    const url =
      typeof window !== "undefined"
        ? new URL(window.location.href)
        : new URL(`https://app.local${currentPath}`);
    const urlParams = Object.fromEntries(url.searchParams.entries());

    return {
      audience,
      channel: audience === "visitor" ? "site" : "portal",
      currentPath,
      message: cleanMessage,
      history: nextHistory
        .filter((message) => message.id !== "welcome")
        .slice(-8)
        .map((message) => ({ role: message.role, content: message.content })),
      currentUrl: typeof window !== "undefined" ? window.location.href : undefined,
      referrer: typeof document !== "undefined" ? document.referrer : undefined,
      pageTitle: typeof document !== "undefined" ? document.title : undefined,
      articleTitle,
      ctaLabel,
      contentId,
      urlParams,
      metaContext: {
        tema: urlParams.tema || "",
        origem: urlParams.origem || urlParams.source || "site",
        campanha: urlParams.campanha || urlParams.utm_campaign || "",
        video: urlParams.video || "",
        sessionId: "",
        timestamp: Date.now()
      }
    };
  }

  function sendMessage(nextMessage: string) {
    const cleanMessage = nextMessage.trim();

    if (cleanMessage.length < 5) {
      setError("Escreva uma pergunta um pouco mais completa para eu te responder com mais precisao.");
      return;
    }

    setError("");
    setLastSuccess(false);
    const userMessage = {
      id: `local-user-${Date.now()}`,
      role: "user" as const,
      content: cleanMessage
    };
    const nextHistory = [...messages, userMessage];
    setMessages(nextHistory);
    setDraft("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/noemia/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(buildPayload(cleanMessage, nextHistory))
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || typeof result?.answer !== "string") {
          setError(typeof result?.error === "string" ? result.error : copy.errorText);
          return;
        }

        setLastSuccess(true);
        setMessages((current) => [
          ...current,
          {
            id: `local-assistant-${Date.now()}`,
            role: "assistant",
            content: result.answer
          }
        ]);
      } catch {
        setError(copy.errorText);
      }
    });
  }

  return (
    <div className="stack">
      <div className="support-panel">
        <div className="support-row">
          <span className="support-label">Modo em uso</span>
          <strong>
            {audience === "client"
              ? `Portal de ${displayName}`
              : audience === "staff"
                ? `Camada interna para ${displayName}`
                : copy.modeLabel}
          </strong>
        </div>
        <div className="support-row">
          <span className="support-label">Melhor uso</span>
          <strong>{copy.usageHint}</strong>
        </div>
      </div>

      <div className="prompt-chip-grid">
        {suggestedPrompts.map((prompt) => (
          <button
            key={prompt}
            className="prompt-chip"
            type="button"
            onClick={() => sendMessage(prompt)}
            disabled={isPending}
          >
            {prompt}
          </button>
        ))}
      </div>

      {error ? <div className="error-notice">{error}</div> : null}
      {lastSuccess && !error && !isPending && messages.length > 1 ? (
        <div className="success-notice subtle">{copy.successText}</div>
      ) : null}

      <div className="conversation-feed">
        {messages.map((message, index) => (
          <article
            key={`${message.id}-${index}`}
            className={message.role === "assistant" ? "chat-bubble assistant" : "chat-bubble user"}
          >
            <span>{message.role === "assistant" ? "NoemIA" : displayName}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {isPending ? (
          <article className="chat-bubble assistant pending">
            <span>NoemIA</span>
            <p>{copy.pendingText}</p>
          </article>
        ) : null}
      </div>

      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(draft);
        }}
      >
        <div className="field-full">
          <label htmlFor="noemia-message">Sua pergunta</label>
          <textarea
            id="noemia-message"
            name="message"
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            placeholder={copy.placeholder}
          />
        </div>
        <div className="form-actions">
          <button className="button" type="submit" disabled={isPending}>
            {isPending ? "Consultando NoemIA..." : "Enviar pergunta"}
          </button>
        </div>
      </form>
    </div>
  );
}
