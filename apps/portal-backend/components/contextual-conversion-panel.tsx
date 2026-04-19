"use client";

import { useEffect, useMemo } from "react";

import { getProductSessionId, trackProductEventOnceByFlag } from "@/lib/analytics/browser";
import { assignExperimentVariant, type ExperimentSurface } from "@/lib/growth/experiments";
import { TrackedLink } from "@/components/tracked-link";

type ContextualConversionPanelProps = {
  surface: ExperimentSurface;
  topic: string;
  contentId?: string;
  contentStage?: "awareness" | "consideration" | "decision";
  primaryHref: string;
  secondaryHref: string;
  location: string;
  compact?: boolean;
};

function getFallbackCopy(topic: string, contentStage?: "awareness" | "consideration" | "decision") {
  if (contentStage === "decision") {
    return {
      headline: `Se o seu caso em ${topic} ja pede decisao, vale transformar a leitura em triagem.`,
      body:
        "A triagem guiada organiza urgencia, documentos e proximo passo para a equipe nao recomecar do zero.",
      primaryCta: "Solicitar analise inicial",
      secondaryCta: "Conversar com a NoemIA"
    };
  }

  if (contentStage === "consideration") {
    return {
      headline: `Use este conteudo sobre ${topic} para chegar mais preparada a triagem.`,
      body:
        "Quando a leitura ja ficou clara, o melhor proximo passo e registrar contexto e intencao com criterio.",
      primaryCta: "Avancar para triagem",
      secondaryCta: "Tirar duvida inicial"
    };
  }

  return {
    headline: `Comece pelo proximo passo mais claro para o seu caso em ${topic}.`,
    body:
      "A NoemIA ajuda a organizar o contexto, e a triagem transforma interesse em lead rastreavel.",
    primaryCta: "Iniciar atendimento",
    secondaryCta: "Entender a triagem"
  };
}

export function ContextualConversionPanel({
  surface,
  topic,
  contentId,
  contentStage,
  primaryHref,
  secondaryHref,
  location,
  compact = false
}: ContextualConversionPanelProps) {
  const sessionId = useMemo(() => getProductSessionId(), []);
  const experimentId = surface === "home" ? "phase11-home-cro" : "phase11-contextual-cta";
  const assignment = useMemo(
    () =>
      assignExperimentVariant({
        experimentId,
        sessionId,
        surface,
        topic,
        contentId
      }),
    [contentId, experimentId, sessionId, surface, topic]
  );

  const copy = assignment?.variant || getFallbackCopy(topic, contentStage);

  useEffect(() => {
    if (!assignment) {
      return;
    }

    trackProductEventOnceByFlag(
      {
        eventKey: "experiment_variant_viewed",
        eventGroup: "analytics",
        payload: {
          experimentId: assignment.experiment.id,
          variantId: assignment.variant.id,
          topic,
          contentId,
          contentStage,
          location,
          surface
        }
      },
      `${assignment.experiment.id}:${assignment.variant.id}:${location}:${contentId || "na"}`
    );
  }, [assignment, contentId, contentStage, location, surface, topic]);

  const trackingPayload = assignment
    ? {
        experimentId: assignment.experiment.id,
        variantId: assignment.variant.id,
        topic,
        contentId,
        contentStage,
        location,
        surface
      }
    : {
        topic,
        contentId,
        contentStage,
        location,
        surface
      };

  return (
    <div className={`contextual-conversion-panel ${compact ? "compact" : ""}`}>
      <span className="eyebrow">Proximo passo contextual</span>
      <strong>{copy.headline}</strong>
      <p>{copy.body}</p>
      <div className="form-actions">
        <TrackedLink
          href={primaryHref}
          className="button"
          eventKey="cta_start_triage_clicked"
          trackingPayload={trackingPayload}
        >
          {copy.primaryCta}
        </TrackedLink>
        <TrackedLink
          href={secondaryHref}
          className="button secondary"
          eventKey="cta_start_attendance_clicked"
          trackingPayload={trackingPayload}
        >
          {copy.secondaryCta}
        </TrackedLink>
      </div>
    </div>
  );
}
