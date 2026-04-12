"use client";

import { useState, useTransition } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type NoemiaAssistantProps = {
  audience: "visitor" | "client" | "staff";
  displayName: string;
  suggestedPrompts: string[];
  currentPath?: string;
};

const audienceCopy = {
  visitor: {
    welcome:
      "👋 Olá! Posso orientar sobre triagem, funcionamento do portal e os próximos passos antes do atendimento.",
    modeLabel: "Orientação inicial",
    usageHint:
      "Pergunte sobre triagem, áreas atendidas, funcionamento do portal e próximos passos.",
    placeholder:
      "Ex.: Como funciona a triagem e quando recebo acesso ao portal?",
    pendingText: "🔍 Estou organizando a resposta com base no fluxo público e institucional...",
    successText: "✨ Pronto! Aqui está minha orientação.",
    errorText: "❌ Não consegui responder agora. Tente novamente em instantes."
  },
  client: {
    welcome:
      "👋 Olá! Posso explicar o que aparece no seu portal, resumir status, agenda, documentos e orientar o próximo passo mais prático.",
    modeLabel: "Contexto do portal do cliente",
    usageHint:
      "Pergunte sobre status, documentos, agenda ou o que significa uma etapa do seu caso.",
    placeholder: "Ex.: O que significa o status atual do meu caso?",
    pendingText: "🔍 Estou organizando a resposta com base no contexto disponível do portal...",
    successText: "✨ Pronto! Aqui está o que encontrei no seu portal.",
    errorText: "❌ Não consegui acessar seu contexto agora. Tente novamente."
  },
  staff: {
    welcome:
      "👋 Olá! Posso resumir triagens, apontar prioridades, sugerir próximos passos internos e montar textos-base de retorno para a rotina da advogada.",
    modeLabel: "Operação interna",
    usageHint:
      "Peça resumo de triagens, leitura de prioridades, próximo passo interno ou um rascunho de retorno ao cliente.",
    placeholder:
      "Ex.: Resuma as prioridades de hoje e diga o que devo tratar primeiro.",
    pendingText: "🔍 Estou cruzando operação, telemetria e filas internas para responder com mais clareza...",
    successText: "✨ Pronto! Aqui está minha análise operacional.",
    errorText: "❌ Não consegui acessar os dados operacionais agora. Tente novamente."
  }
} as const;

export function NoemiaAssistant({
  audience,
  displayName,
  suggestedPrompts,
  currentPath = "/noemia"
}: NoemiaAssistantProps) {
  const copy = audienceCopy[audience];
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: copy.welcome
    }
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [lastSuccess, setLastSuccess] = useState(false);

  function sendMessage(nextMessage: string) {
    const cleanMessage = nextMessage.trim();

    if (cleanMessage.length < 5) {
      setError("Escreva uma pergunta um pouco mais completa para eu conseguir ajudar.");
      return;
    }

    setError("");
    setLastSuccess(false);
    const nextHistory = [...messages, { role: "user" as const, content: cleanMessage }];
    setMessages(nextHistory);
    setDraft("");

    startTransition(async () => {
      try {
        const response = await fetch("/api/noemia/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            audience,
            currentPath,
            message: cleanMessage,
            history: nextHistory.slice(-8)
          })
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || typeof result?.answer !== "string") {
          setError(
            typeof result?.error === "string"
              ? result.error
              : copy.errorText
          );
          return;
        }

        setLastSuccess(true);
        setMessages((current) => [
          ...current,
          {
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
          <span className="support-label">Modo ativo</span>
          <strong>
            {audience === "client"
              ? `Portal de ${displayName}`
              : audience === "staff"
                ? `Apoio interno para ${displayName}`
                : copy.modeLabel}
          </strong>
        </div>
        <div className="support-row">
          <span className="support-label">Como usar melhor</span>
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
      {lastSuccess && !error && !isPending && messages.length > 1 && (
        <div className="success-notice subtle">{copy.successText}</div>
      )}

      <div className="conversation-feed">
        {messages.map((message, index) => (
          <article
            key={`${message.role}-${index}`}
            className={message.role === "assistant" ? "chat-bubble assistant" : "chat-bubble user"}
          >
            <span>{message.role === "assistant" ? "Noemia" : displayName}</span>
            <p>{message.content}</p>
          </article>
        ))}
        {isPending ? (
          <article className="chat-bubble assistant pending">
            <span>Noemia</span>
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
            {isPending ? "Consultando Noemia..." : "Enviar pergunta"}
          </button>
        </div>
      </form>
    </div>
  );
}
