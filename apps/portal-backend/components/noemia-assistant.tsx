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
      setError("Escreva uma pergunta um pouco mais completa para eu te responder com mais precisão.");
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
          setError(typeof result?.error === "string" ? result.error : copy.errorText);
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
            key={`${message.role}-${index}`}
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
