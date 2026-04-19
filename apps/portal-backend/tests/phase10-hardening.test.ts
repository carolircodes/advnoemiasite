import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBrowserEventPayload,
  normalizeProductEventInput
} from "../lib/analytics/funnel-events.ts";
import {
  createObservedJsonResponse,
  startRequestObservation
} from "../lib/observability/request-observability.ts";
import { getAllArticles, getArticleContentBySlug } from "../lib/site/article-content.ts";

test("phase 10 centralizes browser funnel payloads with utm preservation and redaction", () => {
  const payload = buildBrowserEventPayload({
    pagePath: "/artigos/aposentadoria-negada-inss",
    pageTitle: "Artigo teste",
    referrer: "https://google.com",
    searchParams: new URLSearchParams(
      "utm_medium=organic&utm_campaign=abril&utm_term=inss&origem=seo&content_id=aposentadoria-negada-inss"
    ),
    payload: {
      tokenDebug: "should-not-leak",
      topic: "previdenciario"
    }
  });
  const normalized = normalizeProductEventInput({
    eventKey: "strategic_content_viewed",
    pagePath: "/artigos/aposentadoria-negada-inss",
    payload
  });

  assert.equal(normalized.payload.source, "seo");
  assert.equal(normalized.payload.medium, "organic");
  assert.equal(normalized.payload.campaign, "abril");
  assert.equal(normalized.payload.contentId, "aposentadoria-negada-inss");
  assert.equal(
    (normalized.payload as Record<string, unknown>).tokenDebug,
    "[REDACTED]"
  );
});

test("phase 10 request observability emits request and correlation ids on json responses", () => {
  const request = new Request("https://portal.advnoemia.com.br/api/health", {
    headers: {
      "x-request-id": "phase10-request-id"
    }
  });
  const observation = startRequestObservation(request);
  const response = createObservedJsonResponse(observation, { ok: true });

  assert.equal(response.headers.get("x-request-id"), "phase10-request-id");
  assert.equal(response.headers.get("x-correlation-id"), "phase10-request-id");
  assert.equal(response.headers.get("server-timing")?.startsWith("app;dur="), true);
});

test("phase 10 article catalog exposes strategic articles from subfolder content", async () => {
  const articles = getAllArticles();
  const article = await getArticleContentBySlug("aposentadoria-negada-inss");

  assert.equal(articles.some((entry) => entry.slug === "aposentadoria-negada-inss"), true);
  assert.equal(article?.contentHtml.includes("Por que o INSS pode negar um pedido?"), true);
  assert.equal(article?.contentHtml.includes("cta-box"), false);
});
