"use client";

import { useState, useTransition } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type NoemiaAssistantProps = {
  audience: "visitor" | "client";
  displayName: string;
  suggestedPrompts: string[];
};

const visitorWelcome =
  "Posso orientar sobre triagem, funcionamento do portal e os proximos passos antes do atendimento.";
const clientWelcome =
  "Posso explicar o que aparece no seu portal, resumir status, agenda, documentos e orientar o proximo passo mais pratico.";

export function NoemiaAssistant({
  audience,
  displayName,
  suggestedPrompts
}: NoemiaAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: audience === "client" ? clientWelcome : visitorWelcome
    }
  ]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function sendMessage(nextMessage: string) {
    const cleanMessage = nextMessage.trim();

    if (cleanMessage.length < 5) {
      setError("Escreva uma pergunta um pouco mais completa para eu conseguir ajudar.");
      return;
    }

    setError("");
    const nextHistory = [...messages, { role: "user" as const, content: cleanMessage }];
    setMessages(nextHistory);
    setDraft("");

    startTransition(async () => {
      const response = await fetch("/api/noemia/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          audience,
          currentPath: "/noemia",
          message: cleanMessage,
          history: nextHistory.slice(-8)
        })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok || typeof result?.answer !== "string") {
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Nao consegui responder agora. Tente novamente em instantes."
        );
        setMessages(messages);
        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: result.answer
        }
      ]);
    });
  }

  return (
    <div className="stack">
      <div className="support-panel">
        <div className="support-row">
          <span className="support-label">Modo ativo</span>
          <strong>{audience === "client" ? `Portal de ${displayName}` : "Orientacao inicial"}</strong>
        </div>
        <div className="support-row">
          <span className="support-label">Como usar melhor</span>
          <strong>
            {audience === "client"
              ? "Pergunte sobre status, documentos, agenda ou o que significa uma etapa do seu caso."
              : "Pergunte sobre triagem, areas atendidas, funcionamento do portal e proximos passos."}
          </strong>
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
            <p>Estou organizando a resposta com base no contexto disponivel do portal.</p>
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
            placeholder={
              audience === "client"
                ? "Ex.: O que significa o status atual do meu caso?"
                : "Ex.: Como funciona a triagem e quando recebo acesso ao portal?"
            }
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
