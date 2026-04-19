import { getProductEventDefinitions } from "../lib/analytics/funnel-events.ts";
import { assignExperimentVariant } from "../lib/growth/experiments.ts";
import { calculateLeadScore } from "../lib/growth/lead-scoring.ts";
import { getTopicHubs } from "../lib/site/article-content.ts";

async function main() {
  const topicHubs = getTopicHubs();
  const productEvents = getProductEventDefinitions();
  const score = calculateLeadScore({
    caseArea: "previdenciario",
    urgencyLevel: "urgente",
    currentStage: "tenho-prazo-proximo",
    readinessLevel: "pronto-para-agendar",
    preferredContactChannel: "whatsapp",
    preferredContactPeriod: "horario-comercial",
    appointmentInterest: true,
    caseSummary:
      "Recebi negativa recente do INSS, tenho prazo curto para resposta e ja reuni parte dos documentos.",
    source: "organic",
    topic: "previdenciario",
    campaign: "abril-2026",
    contentId: "aposentadoria-negada-inss",
    contentStage: "decision",
    returnVisitor: true
  });
  const experiment = assignExperimentVariant({
    experimentId: "phase11-contextual-cta",
    sessionId: "phase11-smoke-session",
    surface: "article",
    topic: "previdenciario",
    contentId: "aposentadoria-negada-inss"
  });

  if (topicHubs.length < 4) {
    throw new Error("Expected at least four article topic hubs for phase 11.");
  }

  if (!productEvents.some((event) => event.eventKey === "experiment_variant_viewed")) {
    throw new Error("Expected experiment impression event definition for phase 11.");
  }

  if (score.temperature !== "urgent" || score.score < 70) {
    throw new Error("Lead score heuristic did not classify a high-intent urgent lead correctly.");
  }

  if (!experiment?.variant.id) {
    throw new Error("Expected deterministic experiment assignment for contextual CTA.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        topicHubCount: topicHubs.length,
        leadScore: score.score,
        leadTemperature: score.temperature,
        experimentVariant: experiment.variant.id
      },
      null,
      2
    )
  );
}

void main().catch((error) => {
  console.error(
    JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    })
  );
  process.exitCode = 1;
});
