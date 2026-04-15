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
      "Olá. Sou a NoemIA. Posso te orientar com clareza sobre triagem, consulta, funcionamento do escritório e o próximo passo mais adequado.",
    modeLabel: "Orientação inicial premium",
    usageHint:
      "Pergunte sobre triagem, áreas atendidas, consulta, portal e próximos passos.",
    placeholder:
      "Ex.: Meu caso parece urgente. Como funciona a análise inicial e qual é o próximo passo?",
    pendingText:
      "Estou organizando sua resposta com base no fluxo público e institucional do escritório...",
    successText: "Resposta pronta com o melhor próximo passo disponível agora.",
    errorText:
      "Não consegui responder com segurança neste instante. Tente novamente em alguns segundos."
  },
  client: {
    welcome:
      "Olá. Sou a NoemIA. Posso traduzir o que aparece no seu portal com linguagem clara, resumir status, agenda, documentos e indicar o próximo passo prático.",
    modeLabel: "Leitura clara do seu portal",
    usageHint:
      "Pergunte sobre status, documentos, agenda, pendências ou o significado de uma etapa do seu caso.",
    placeholder:
      "Ex.: O que significa o estágio atual do meu caso e o que eu preciso fazer agora?",
    pendingText:
      "Estou cruzando o contexto disponível do seu portal para responder com mais precisão...",
    successText: "Resposta pronta com base no que está visível no seu portal.",
    errorText: "Não consegui acessar seu contexto agora. Tente novamente em instantes."
  },
  staff: {
    welcome:
      "Olá. Sou a NoemIA. Posso resumir triagens, destacar prioridades, sugerir próximos passos internos e acelerar a resposta operacional da equipe.",
    modeLabel: "Cockpit operacional",
    usageHint:
      "Peça leitura de prioridades, resumo de triagens, próximo passo interno ou um rascunho de retorno ao cliente.",
    placeholder:
      "Ex.: Resuma as prioridades de hoje e diga onde há maior chance de avanço comercial ou risco operacional.",
    pendingText:
      "Estou cruzando operação, telemetria e filas internas para responder com visão mais acionável...",
    successText: "Análise operacional pronta com foco em decisão rápida.",
    errorText: "Não consegui acessar os dados operacionais agora. Tente novamente."
  }
} as const;

const SITE_SESSION_STORAGE_KEY = "noemia_site_chat_session_id";

function buildBrowserSessionId() {
  if (typeof window !== "undefined" && typeof window.crypto?.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `site-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  const [siteSessionId, setSiteSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (audience !== "visitor" || typeof window === "undefined") {
      return;
    }

    const stored = window.localStorage.getItem(SITE_SESSION_STORAGE_KEY);
    const nextSessionId = stored || buildBrowserSessionId();
    if (!stored) {
      window.localStorage.setItem(SITE_SESSION_STORAGE_KEY, nextSessionId);
    }
    setSiteSessionId(nextSessionId);
  }, [audience]);

  useEffect(() => {
    if (audience !== "visitor" || !siteSessionId) {
      return;
    }

    let cancelled = false;

    async function syncConversation() {
      const activeSessionId = siteSessionId;
      if (!activeSessionId) {
        return;
      }

      try {
        const response = await fetch(`/api/noemia/chat?sessionId=${encodeURIComponent(activeSessionId)}`, {
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
  }, [audience, siteSessionId, welcomeMessage.content]);

  function buildPayload(cleanMessage: string, nextHistory: ChatMessage[]) {
    const url =
      typeof window !== "undefined" ? new URL(window.location.href) : new URL(`https://app.local${currentPath}`);
    const urlParams = Object.fromEntries(url.searchParams.entries());

    return {
      audience,
      channel: audience === "visitor" ? "site" : "portal",
      currentPath,
      message: cleanMessage,
      sessionId: audience === "visitor" ? siteSessionId : undefined,
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
        sessionId: audience === "visitor" ? siteSessionId || "" : "",
        timestamp: Date.now()
      }
    };
  }

  function sendMessage(nextMessage: string) {
    const cleanMessage = nextMessage.trim();

    if (cleanMessage.length < 5) {
      setError("Escreva uma pergunta um pouco mais completa para eu te responder com mais precisão.");
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

        if (audience === "visitor" && typeof result?.sessionId === "string" && result.sessionId) {
          window.localStorage.setItem(SITE_SESSION_STORAGE_KEY, result.sessionId);
          setSiteSessionId(result.sessionId);
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
