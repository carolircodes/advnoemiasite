import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import {
  getArticlesByTopic,
  getTopicHubBySlug,
  getTopicHubs
} from "@/lib/site/article-content";
import { getEditorialServicePageBySlug } from "@/lib/site/editorial-taxonomy";
import { buildPublicMetadata } from "@/lib/site/seo";

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

  return buildPublicMetadata({
    title: hub.title,
    description: hub.description,
    path: `/artigos/tema/${hub.slug}`
  });
}

export default async function TopicHubPage({ params }: TopicHubPageProps) {
  const { topic } = await params;
  const hub = getTopicHubBySlug(topic);

  if (!hub) {
    notFound();
  }

  const articles = getArticlesByTopic(hub.topic);
  const servicePage = getEditorialServicePageBySlug(hub.slug);

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

        {servicePage ? (
          <SectionCard
            title="Pagina de entrada desta area"
            description="O hub agora empurra para uma money page mais clara quando a busca ja estiver madura o suficiente para triagem."
          >
            <div className="cta-strip">
              <strong>{servicePage.title}</strong>
              <p>{servicePage.longDescription}</p>
              <div className="form-actions">
                <TrackedLink
                  href={servicePage.href}
                  className="button secondary"
                  eventKey="article_hub_cta_clicked"
                  trackingPayload={{ topic: hub.topic, location: "topic_hub_service_page" }}
                >
                  Abrir pagina de atuacao
                </TrackedLink>
                <TrackedLink
                  href={servicePage.triageHref}
                  className="button"
                  eventKey="cta_start_triage_clicked"
                  trackingPayload={{ topic: hub.topic, location: "topic_hub_service_page" }}
                >
                  Iniciar triagem
                </TrackedLink>
              </div>
            </div>
          </SectionCard>
        ) : null}

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
