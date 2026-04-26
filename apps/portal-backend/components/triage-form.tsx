"use client";

import { useMemo, useState, useTransition, type ChangeEvent } from "react";

import { CLIENT_LOGIN_PATH } from "../lib/auth/access-control.ts";
import {
  getProductSessionId,
  trackProductEventOncePerSession
} from "../lib/analytics/browser.ts";
import {
  caseAreaLabels,
  caseAreas,
  publicContactChannelLabels,
  publicContactChannels,
  publicContactPeriodLabels,
  publicContactPeriods,
  publicIntakeReadinessLabels,
  publicIntakeReadinessLevels,
  publicIntakeStageLabels,
  publicIntakeStages,
  publicIntakeUrgencies,
  publicIntakeUrgencyLabels
} from "../lib/domain/portal.ts";
import {
  appendEntryContextToPath,
  getEntryContextPayload,
  resolveEntryCaseArea,
  type EntryContext
} from "../lib/entry-context.ts";

type TriageFormState = {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  stateCode: string;
  caseArea: string;
  currentStage: string;
  urgencyLevel: string;
  preferredContactPeriod: string;
  preferredContactChannel: string;
  readinessLevel: string;
  appointmentInterest: boolean;
  caseSummary: string;
  consentAccepted: boolean;
  website: string;
};

const initialState: TriageFormState = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  stateCode: "",
  caseArea: "previdenciario",
  currentStage: "ainda-nao-iniciei",
  urgencyLevel: "moderada",
  preferredContactPeriod: "horario-comercial",
  preferredContactChannel: "whatsapp",
  readinessLevel: "explorando",
  appointmentInterest: false,
  caseSummary: "",
  consentAccepted: false,
  website: ""
};

const steps = [
  {
    title: "Contato e contexto",
    description: "O minimo necessario para o time saber quem chegou e de onde veio."
  },
  {
    title: "Urgencia e intencao",
    description: "Qualificar momento, temperatura e melhor proximo passo."
  },
  {
    title: "Resumo do caso",
    description: "Organizar o caso com criterio antes do handoff para a equipe."
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
    if (state.caseSummary.trim().length < 40) {
      return "Descreva com um pouco mais de contexto o que aconteceu e o que voce precisa.";
    }

    if (!state.consentAccepted) {
      return "Confirme a autorizacao para enviar a triagem.";
    }
  }

  return "";
}

type TriageFormProps = {
  entryContext?: EntryContext;
  sourcePath?: string;
};

export function TriageForm({ entryContext, sourcePath }: TriageFormProps) {
  const initialCaseArea = resolveEntryCaseArea(entryContext) || initialState.caseArea;
  const entryPath = sourcePath || appendEntryContextToPath("/triagem", entryContext);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const homeHref = appendEntryContextToPath("/", entryContext);
  const clientLoginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const [state, setState] = useState<TriageFormState>(() => ({
    ...initialState,
    caseArea: initialCaseArea
  }));
  const [stepIndex, setStepIndex] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<null | { intakeRequestId: string }>(null);
  const [isPending, startTransition] = useTransition();
  const [hasTrackedStart, setHasTrackedStart] = useState(false);

  const contextualPrompt = useMemo(() => {
    switch (state.caseArea) {
      case "previdenciario":
        return "Explique se houve negativa, revisao, desconto indevido ou duvida sobre beneficio.";
      case "consumidor_bancario":
        return "Conte se houve desconto, consignado, negativacao, cobranca ou outro problema bancario.";
      case "familia":
        return "Explique o contexto principal, como divorcio, guarda, pensao ou reorganizacao familiar.";
      case "civil":
      default:
        return "Resuma o conflito, contrato, notificacao ou situacao civil que motivou a busca.";
    }
  }, [state.caseArea]);

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
        pagePath: entryPath,
        payload: {
          step: "contact-finished",
          preferredContactChannel: state.preferredContactChannel,
          ...entryContextPayload
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
          sourcePath: entryPath,
          captureMetadata: {
            source: entryContext?.origem || "portal-triagem",
            page: entryPath,
            theme: entryContext?.tema || state.caseArea,
            campaign: entryContext?.campanha || "",
            video: entryContext?.video || "",
            contentId: entryContext?.content_id || "",
            contentStage:
              entryContext?.content_stage === "awareness" ||
              entryContext?.content_stage === "consideration" ||
              entryContext?.content_stage === "decision"
                ? entryContext.content_stage
                : undefined,
            experimentId: entryContext?.experimento || "",
            variantId: entryContext?.variante || "",
            returnVisitor:
              typeof window !== "undefined" &&
              window.sessionStorage.getItem("portal_product_returning_visitor") === "1"
          }
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
      setState({
        ...initialState,
        caseArea: initialCaseArea
      });
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
            <p>Seu envio ja entrou na fila interna do escritorio com score, temperatura e contexto de origem.</p>
          </div>
          <ul className="timeline">
            <li>1. A triagem entra com classificacao de urgencia, intencao e melhor proximo passo.</li>
            <li>2. A equipe revisa o contexto e decide retorno, consulta ou continuidade operacional.</li>
            <li>3. Se o atendimento seguir, o cadastro interno e o convite do portal sao preparados.</li>
          </ul>
          <div className="notice">
            Referencia interna desta triagem: <span className="code">{success.intakeRequestId}</span>
          </div>
          <div className="form-actions">
            <a className="button" href={homeHref}>
              Voltar ao inicio
            </a>
            <a className="button secondary" href={clientLoginHref}>
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
          <div className="field">
            <label htmlFor="city">Cidade</label>
            <input id="city" name="city" type="text" value={state.city} onChange={handleInputChange} />
          </div>
          <div className="field">
            <label htmlFor="stateCode">UF</label>
            <input
              id="stateCode"
              name="stateCode"
              type="text"
              maxLength={2}
              value={state.stateCode}
              onChange={handleInputChange}
              placeholder="Ex.: CE"
            />
          </div>
          <div className="field-full">
            <label htmlFor="preferredContactChannel">Canal preferido para o primeiro retorno</label>
            <select
              id="preferredContactChannel"
              name="preferredContactChannel"
              value={state.preferredContactChannel}
              onChange={handleInputChange}
            >
              {publicContactChannels.map((channel) => (
                <option key={channel} value={channel}>
                  {publicContactChannelLabels[channel]}
                </option>
              ))}
            </select>
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
            <label htmlFor="caseArea">Tema juridico principal</label>
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
          <div className="field-full">
            <label htmlFor="readinessLevel">Qual destas frases mais parece com voce agora?</label>
            <select
              id="readinessLevel"
              name="readinessLevel"
              value={state.readinessLevel}
              onChange={handleInputChange}
            >
              {publicIntakeReadinessLevels.map((level) => (
                <option key={level} value={level}>
                  {publicIntakeReadinessLabels[level]}
                </option>
              ))}
            </select>
          </div>
          <label className="checkbox-row field-full" htmlFor="appointmentInterest">
            <input
              id="appointmentInterest"
              name="appointmentInterest"
              type="checkbox"
              checked={state.appointmentInterest}
              onChange={handleInputChange}
            />
            Ja quero que a equipe considere avancar para consulta ou agendamento, se fizer sentido.
          </label>
        </div>
      ) : null}

      {stepIndex === 2 ? (
        <div className="stack">
          <div className="notice">{contextualPrompt}</div>
          <div className="field-full">
            <label htmlFor="caseSummary">Explique em poucas linhas o que aconteceu</label>
            <textarea
              id="caseSummary"
              name="caseSummary"
              value={state.caseSummary}
              onChange={handleInputChange}
              placeholder="Conte o contexto principal, o que ja recebeu de resposta, o que preocupa agora e o que espera resolver."
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
            Depois do envio, o escritorio recebe score, urgencia, canal preferido, tema e contexto resumido para priorizar o retorno.
          </div>
        </div>
      ) : null}

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
