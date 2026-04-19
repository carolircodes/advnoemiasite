import { getProductEventDefinitions } from "../lib/analytics/funnel-events.ts";
import {
  getAllArticles,
  getArticleContentBySlug
} from "../lib/site/article-content.ts";

async function main() {
  const articles = getAllArticles();
  const definitions = getProductEventDefinitions();

  if (articles.length < 5) {
    throw new Error("Expected at least five strategic articles in /artigos.");
  }

  if (definitions.length < 10) {
    throw new Error("Expected centralized product event definitions for the acquisition funnel.");
  }

  const firstArticle = await getArticleContentBySlug(articles[0].slug);

  if (!firstArticle?.contentHtml || !firstArticle.contentHtml.includes("<p>")) {
    throw new Error("Strategic article content extraction is empty or malformed.");
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        articleCount: articles.length,
        firstArticle: articles[0].slug,
        productEventCount: definitions.length
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
