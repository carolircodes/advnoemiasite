import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";
import {
  getArticlesByTopic,
  getTopicHubBySlug,
  getTopicHubs
} from "@/lib/site/article-content";

type TopicHubPageProps = {
  params: Promise<{ topic: string }>;
};

export async function generateStaticParams() {
  return getTopicHubs().map((hub) => ({
    topic: hub.slug
  }));
}

export async function generateMetadata({
  params
}: TopicHubPageProps): Promise<Metadata> {
  const { topic } = await params;
  const hub = getTopicHubBySlug(topic);

  if (!hub) {
    return {};
  }

  return {
    title: `${hub.title} | Noemia Paixao Advocacia`,
    description: hub.description,
    alternates: {
      canonical: `/artigos/tema/${hub.slug}`
    },
    openGraph: {
      title: `${hub.title} | Noemia Paixao Advocacia`,
      description: hub.description,
      url: `${PUBLIC_SITE_BASE_URL}/artigos/tema/${hub.slug}`
    }
  };
}

export default async function TopicHubPage({ params }: TopicHubPageProps) {
  const { topic } = await params;
  const hub = getTopicHubBySlug(topic);

  if (!hub) {
    notFound();
  }

  const articles = getArticlesByTopic(hub.topic);

  return (
    <>
      <ProductEventBeacon
        eventKey="article_hub_viewed"
        eventGroup="content"
        payload={{ topic: hub.topic, hubSlug: hub.slug }}
        oncePerSession
      />
      <AppFrame
        eyebrow="Hub editorial"
        title={hub.title}
        description={hub.description}
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/artigos", label: "Artigos" },
          { href: `/artigos/tema/${hub.slug}`, label: hub.title, active: true }
        ]}
        highlights={[
          { label: "Tema", value: hub.topic },
          { label: "Artigos", value: `${articles.length}` },
          { label: "Objetivo", value: "Leitura + conversao" },
          { label: "Cluster", value: "SEO em subpasta" }
        ]}
      >
        <SectionCard
          title="Leitura estrategica do tema"
          description={hub.strategicAngle}
        >
          <div className="article-index-grid">
            {articles.map((article) => (
              <article key={article.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{article.categoryLabel}</span>
                  <span className="tag soft">
                    {article.funnelStage === "decision" ? "fundo de funil" : "meio de funil"}
                  </span>
                </div>
                <strong>{article.title}</strong>
                <p>{article.excerpt}</p>
                <div className="form-actions">
                  <TrackedLink
                    href={`/artigos/${article.slug}`}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      topic: hub.topic,
                      contentId: article.slug,
                      location: "topic_hub_article_list"
                    }}
                  >
                    Ler artigo
                  </TrackedLink>
                  <TrackedLink
                    href={`/#triagem-inicial?origem=hub&tema=${hub.topic}&content_id=${article.slug}&content_stage=${article.funnelStage}`}
                    className="button"
                    eventKey="article_hub_cta_clicked"
                    trackingPayload={{
                      topic: hub.topic,
                      contentId: article.slug,
                      location: "topic_hub_article_list"
                    }}
                  >
                    Iniciar triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <ContextualConversionPanel
          surface="article_hub"
          topic={hub.topic}
          contentStage="consideration"
          primaryHref={hub.serviceHref}
          secondaryHref="/#atendimento"
          location="topic_hub_footer"
        />
      </AppFrame>
    </>
  );
}
