"use client";

import { useState, useTransition, type ChangeEvent } from "react";

import {
  caseAreaLabels,
  caseAreas,
  publicContactPeriodLabels,
  publicContactPeriods,
  publicIntakeStageLabels,
  publicIntakeStages,
  publicIntakeUrgencies,
  publicIntakeUrgencyLabels
} from "@/lib/domain/portal";
import {
  getProductSessionId,
  trackProductEventOncePerSession
} from "@/lib/analytics/browser";

type TriageFormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  caseArea: string;
  currentStage: string;
  urgencyLevel: string;
  preferredContactPeriod: string;
  caseSummary: string;
  consentAccepted: boolean;
  website: string;
};

const initialState: TriageFormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  caseArea: "previdenciario",
  currentStage: "ainda-nao-iniciei",
  urgencyLevel: "moderada",
  preferredContactPeriod: "horario-comercial",
  caseSummary: "",
  consentAccepted: false,
  website: ""
};

const steps = [
  {
    title: "Seus dados",
    description: "Informacoes de contato para a equipe confirmar o retorno."
  },
  {
    title: "Seu momento",
    description: "Entender urgencia, area e fase atual do atendimento."
  },
  {
    title: "Contexto do caso",
    description: "Resumo objetivo para acelerar a primeira analise."
  }
] as const;

function validateStep(state: TriageFormState, stepIndex: number) {
  if (stepIndex === 0) {
    if (state.fullName.trim().length < 3) {
      return "Informe seu nome completo para continuarmos.";
    }

    if (!state.email.includes("@")) {
      return "Informe um e-mail valido para receber nossa confirmacao.";
    }

    if (state.phone.replace(/\D/g, "").length < 10) {
      return "Informe um telefone com DDD para contato.";
    }
  }

  if (stepIndex === 2) {
    if (state.caseSummary.trim().length < 30) {
      return "Descreva em poucas linhas o que aconteceu e o que voce precisa.";
    }

    if (!state.consentAccepted) {
      return "Confirme a autorizacao para enviar a triagem.";
    }
  }

  return "";
}

export function TriageForm() {
  const [state, setState] = useState<TriageFormState>(initialState);
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<null | { intakeRequestId: string }>(null);
  const [isPending, startTransition] = useTransition();
  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  function updateField<Key extends keyof TriageFormState>(
    key: Key,
    value: TriageFormState[Key]
  ) {
    setState((current) => ({
      ...current,
      [key]: value
    }));
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const target = event.currentTarget;
    const nextValue =
      target instanceof HTMLInputElement && target.type === "checkbox"
        ? target.checked
        : target.value;

    updateField(target.name as keyof TriageFormState, nextValue as never);
  }

  function goToNextStep() {
    const validationError = validateStep(state, stepIndex);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    if (stepIndex === 0 && !hasTrackedStart) {
      trackProductEventOncePerSession({
        eventKey: "triage_started",
        eventGroup: "conversion",
        pagePath: "/triagem",
        payload: {
          step: "contact-finished"
        }
      });
      setHasTrackedStart(true);
    }
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  }

  function goToPreviousStep() {
    setError("");
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function handleSubmit() {
    const validationError = validateStep(state, 2);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    startTransition(async () => {
      const response = await fetch("/api/public/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-product-session-id": getProductSessionId()
        },
        body: JSON.stringify({
          ...state,
          sourcePath: "/triagem"
        })
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result?.ok) {
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Nao foi possivel enviar sua triagem agora. Tente novamente em instantes."
        );
        return;
      }

      setSuccess({
        intakeRequestId: result.intakeRequestId
      });
      setState(initialState);
      setStepIndex(0);
    });
  }

  if (success) {
    return (
      <div className="stack">
        <div className="success-notice">
          Triagem enviada com sucesso. A equipe vai revisar seu resumo e retornar pelo canal informado.
        </div>
        <div className="panel inset-panel">
          <div className="section-head">
            <h2>O que acontece agora</h2>
            <p>Seu envio ja entrou na fila interna do escritorio com identificacao real.</p>
          </div>
          <ul className="timeline">
            <li>1. A equipe revisa a triagem e organiza a melhor forma de retorno.</li>
            <li>2. Se o atendimento seguir, o cadastro interno e o convite do portal sao preparados.</li>
            <li>3. No primeiro acesso, voce define sua senha e passa a acompanhar documentos, agenda e atualizacoes.</li>
          </ul>
          <div className="notice">
            Referencia interna desta triagem: <span className="code">{success.intakeRequestId}</span>
          </div>
          <div className="form-actions">
            <a className="button" href="/">
              Voltar ao inicio
            </a>
            <a className="button secondary" href="/auth/login">
              Ja recebeu convite? Entrar no portal
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="stack">
      <div className="triage-progress" aria-label="Etapas da triagem">
        {steps.map((step, index) => (
          <div
            key={step.title}
            className={`triage-step ${index === stepIndex ? "active" : ""} ${
              index < stepIndex ? "done" : ""
            }`}
          >
            <span>{index + 1}</span>
            <strong>{step.title}</strong>
            <small>{step.description}</small>
          </div>
        ))}
      </div>

      {error ? <div className="error-notice">{error}</div> : null}

      <div className="stack">
        {stepIndex === 0 ? (
          <div className="fields">
            <div className="field-full">
              <label htmlFor="fullName">Nome completo</label>
              <input id="fullName" name="fullName" value={state.fullName} onChange={handleInputChange} />
            </div>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" value={state.email} onChange={handleInputChange} />
            </div>
            <div className="field">
              <label htmlFor="phone">WhatsApp ou telefone</label>
              <input id="phone" name="phone" type="tel" value={state.phone} onChange={handleInputChange} />
            </div>
            <div className="field-full">
              <label htmlFor="city">Cidade/UF</label>
              <input
                id="city"
                name="city"
                type="text"
                value={state.city}
                onChange={handleInputChange}
                placeholder="Opcional, mas ajuda no direcionamento inicial"
              />
            </div>
            <div className="field-full triage-honeypot" aria-hidden="true">
              <label htmlFor="website">Nao preencha este campo</label>
              <input id="website" name="website" value={state.website} onChange={handleInputChange} tabIndex={-1} />
            </div>
          </div>
        ) : null}

        {stepIndex === 1 ? (
          <div className="fields">
            <div className="field-full">
              <label htmlFor="caseArea">Area principal do atendimento</label>
              <select id="caseArea" name="caseArea" value={state.caseArea} onChange={handleInputChange}>
                {caseAreas.map((area) => (
                  <option key={area} value={area}>
                    {caseAreaLabels[area]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-full">
              <label htmlFor="currentStage">Qual descreve melhor seu momento atual?</label>
              <select
                id="currentStage"
                name="currentStage"
                value={state.currentStage}
                onChange={handleInputChange}
              >
                {publicIntakeStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {publicIntakeStageLabels[stage]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="urgencyLevel">Nivel de urgencia</label>
              <select
                id="urgencyLevel"
                name="urgencyLevel"
                value={state.urgencyLevel}
                onChange={handleInputChange}
              >
                {publicIntakeUrgencies.map((urgency) => (
                  <option key={urgency} value={urgency}>
                    {publicIntakeUrgencyLabels[urgency]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="preferredContactPeriod">Melhor horario para contato</label>
              <select
                id="preferredContactPeriod"
                name="preferredContactPeriod"
                value={state.preferredContactPeriod}
                onChange={handleInputChange}
              >
                {publicContactPeriods.map((period) => (
                  <option key={period} value={period}>
                    {publicContactPeriodLabels[period]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}

        {stepIndex === 2 ? (
          <div className="stack">
            <div className="field-full">
              <label htmlFor="caseSummary">Explique em poucas linhas o que aconteceu</label>
              <textarea
                id="caseSummary"
                name="caseSummary"
                value={state.caseSummary}
                onChange={handleInputChange}
                placeholder="Conte o contexto principal, o que voce ja recebeu de resposta e o que espera resolver."
              />
            </div>
            <label className="checkbox-row" htmlFor="consentAccepted">
              <input
                id="consentAccepted"
                name="consentAccepted"
                type="checkbox"
                checked={state.consentAccepted}
                onChange={handleInputChange}
              />
              Autorizo o envio destas informacoes para analise inicial e contato da equipe.
            </label>
            <div className="notice">
              Depois do envio, a equipe revisa a triagem, organiza o retorno e, se o atendimento seguir, prepara o cadastro e o convite do portal.
            </div>
          </div>
        ) : null}
      </div>

      <div className="form-actions">
        {stepIndex > 0 ? (
          <button className="button secondary" type="button" onClick={goToPreviousStep}>
            Voltar
          </button>
        ) : null}
        {stepIndex < steps.length - 1 ? (
          <button className="button" type="button" onClick={goToNextStep}>
            Continuar
          </button>
        ) : (
          <button className="button" type="button" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Enviando triagem..." : "Enviar triagem"}
          </button>
        )}
      </div>
    </div>
  );
}
