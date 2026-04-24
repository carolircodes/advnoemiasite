import assert from "node:assert/strict";
import test from "node:test";

import {
  getAllArticles,
  getTopicHubBySlug
} from "../lib/site/article-content.ts";
import {
  getEditorialServicePageBySlug,
  getEditorialServicePages,
  getEditorialTopics
} from "../lib/site/editorial-taxonomy.ts";

test("editorial taxonomy exposes canonical service pages for each priority topic", () => {
  const topics = getEditorialTopics();
  const servicePages = getEditorialServicePages();

  assert.equal(servicePages.length, topics.length);
  assert.equal(servicePages.every((page) => page.href.startsWith("/atuacao/")), true);
  assert.equal(
    servicePages.every((page) => page.triageHref.includes("#triagem-inicial")),
    true
  );
});

test("editorial hubs stay aligned with their corresponding service pages", () => {
  const hub = getTopicHubBySlug("previdenciario");
  const servicePage = getEditorialServicePageBySlug("previdenciario");

  assert.equal(hub?.serviceHref, "/atuacao/previdenciario");
  assert.equal(servicePage?.hubHref, "/artigos/tema/previdenciario");
});

test("editorial routes stay derivable from the canonical taxonomy and catalog", () => {
  const servicePages = getEditorialServicePages();
  const firstArticle = getAllArticles()[0];

  assert.equal(servicePages.some((page) => page.href === "/atuacao/previdenciario"), true);
  assert.equal(servicePages.some((page) => page.hubHref === "/artigos/tema/previdenciario"), true);
  assert.equal(
    typeof firstArticle?.slug === "string" && firstArticle.slug.length > 0,
    true
  );
});
