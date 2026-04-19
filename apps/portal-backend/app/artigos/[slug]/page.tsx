import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";
import {
  getAllArticles,
  getArticleBySlug,
  getArticleContentBySlug,
  getNextBestArticles,
  getRelatedArticles,
  getTopicHubs
} from "@/lib/site/article-content";

type ArticlePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return getAllArticles().map((article) => ({
    slug: article.slug
  }));
}

export async function generateMetadata({
  params
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {};
  }

  return {
    title: article.title,
    description: article.description,
    robots: {
      index: true,
      follow: true
    },
    alternates: {
      canonical: `/artigos/${article.slug}`
    },
    openGraph: {
      type: "article",
      title: `${article.title} | Noemia Paixao Advocacia`,
      description: article.description,
      url: `${PUBLIC_SITE_BASE_URL}/artigos/${article.slug}`
    },
    twitter: {
      title: `${article.title} | Noemia Paixao Advocacia`,
      description: article.description
    }
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleContentBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(article);
  const nextBestArticles = getNextBestArticles(article);
  const topicHub = getTopicHubs().find((hub) => hub.topic === article.topic) || null;
  const canonicalUrl = `${PUBLIC_SITE_BASE_URL}/artigos/${article.slug}`;
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    author: {
      "@type": "Organization",
      name: article.author
    },
    publisher: {
      "@type": "Organization",
      name: "Noemia Paixao Advocacia"
    },
    mainEntityOfPage: canonicalUrl
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: `${PUBLIC_SITE_BASE_URL}/`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Artigos",
        item: `${PUBLIC_SITE_BASE_URL}/artigos`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: canonicalUrl
      }
    ]
  };

  return (
    <>
      <ProductEventBeacon
        eventKey="strategic_content_viewed"
        eventGroup="content"
        payload={{
          contentId: article.slug,
          topic: article.topic,
          articleSlug: article.slug,
          articleTitle: article.title,
          contentStage: article.funnelStage
        }}
        oncePerSession
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <AppFrame
        eyebrow={article.categoryLabel}
        title={article.title}
        description={article.description}
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/artigos", label: "Artigos" },
          { href: `/artigos/${article.slug}`, label: "Leitura", active: true }
        ]}
        highlights={[
          { label: "Leitura", value: `${article.readingMinutes} min` },
          { label: "Publicado", value: new Date(article.publishedAt).toLocaleDateString("pt-BR") },
          { label: "Atualizado", value: new Date(article.updatedAt).toLocaleDateString("pt-BR") },
          { label: "Cluster", value: article.funnelStage === "decision" ? "Fundo de funil" : "Meio de funil" }
        ]}
        actions={[
          {
            href: `/#triagem-inicial?origem=artigo&tema=${article.topic}&content_id=${article.slug}&content_stage=${article.funnelStage}`,
            label: "Iniciar triagem",
            trackingEventKey: "cta_start_triage_clicked",
            trackingPayload: {
              contentId: article.slug,
              topic: article.topic,
              location: "article_hero",
              contentStage: article.funnelStage
            }
          },
          {
            href: "/#atendimento",
            label: "Conversar com a NoemIA",
            tone: "secondary",
            trackingEventKey: "cta_start_attendance_clicked",
            trackingPayload: {
              contentId: article.slug,
              topic: article.topic,
              location: "article_hero",
              contentStage: article.funnelStage
            }
          }
        ]}
      >
        <SectionCard
          title="Leitura guiada"
          description="Conteudo editorial com contexto juridico claro, breadcrumbs, metadata consistente e CTA rastreado."
        >
          <div className="breadcrumb-row" aria-label="Breadcrumb">
            <TrackedLink href="/" className="inline-link">
              Inicio
            </TrackedLink>
            <span>/</span>
            <TrackedLink href="/artigos" className="inline-link">
              Artigos
            </TrackedLink>
            <span>/</span>
            <span>{article.title}</span>
          </div>
          <div className="split editorial-layout">
            <article className="panel editorial-article">
              <div className="article-card-meta">
                {article.tags.map((tag) => (
                  <span key={tag} className="tag soft">
                    {tag}
                  </span>
                ))}
              </div>
              <div
                className="editorial-prose"
                dangerouslySetInnerHTML={{ __html: article.contentHtml }}
              />
              <ContextualConversionPanel
                surface="article"
                topic={article.topic}
                contentId={article.slug}
                contentStage={article.funnelStage}
                primaryHref={`/#triagem-inicial?origem=artigo&tema=${article.topic}&content_id=${article.slug}&content_stage=${article.funnelStage}`}
                secondaryHref="/#atendimento"
                location="article_mid_panel"
                compact
              />
              <div className="cta-strip">
                <strong>Se esse contexto parece com o seu caso, o melhor passo agora e organizar a triagem.</strong>
                <p>
                  A equipe recebe o contexto com mais clareza, reduz ruido e acelera a primeira leitura juridica.
                </p>
                <div className="form-actions">
                  <TrackedLink
                    href={`/#triagem-inicial?origem=artigo&tema=${article.topic}&content_id=${article.slug}&content_stage=${article.funnelStage}`}
                    className="button"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "article_bottom",
                      contentStage: article.funnelStage
                    }}
                  >
                    Enviar caso para triagem
                  </TrackedLink>
                </div>
              </div>
            </article>

            <div className="stack">
              {topicHub ? (
                <SectionCard
                  title={topicHub.title}
                  description={topicHub.description}
                >
                  <p>{topicHub.strategicAngle}</p>
                  <div className="form-actions">
                    <TrackedLink
                      href={`/artigos/tema/${topicHub.slug}`}
                      className="button secondary"
                      eventKey="article_hub_cta_clicked"
                      trackingPayload={{
                        topic: article.topic,
                        contentId: article.slug,
                        location: "article_topic_hub"
                      }}
                    >
                      Abrir hub do tema
                    </TrackedLink>
                  </div>
                </SectionCard>
              ) : null}

              <SectionCard
                title="Proximo passo recomendado"
                description="Use a NoemIA como concierge para esclarecer duvidas antes da triagem."
              >
                <NoemiaAssistant
                  audience="visitor"
                  displayName="Voce"
                  suggestedPrompts={[
                    "Li este artigo e quero entender meu melhor proximo passo.",
                    "Meu caso parece com este tema. Ja faz sentido enviar a triagem?",
                    "Quais documentos devo separar antes de falar com a equipe?"
                  ]}
                  currentPath={`/artigos/${article.slug}`}
                  ctaLabel="article_concierge"
                  articleTitle={article.title}
                  contentId={article.slug}
                />
              </SectionCard>

              <SectionCard
                title="Artigos relacionados"
                description="Interlinking estrategico para aprofundar temas vizinhos sem criar paginas orfas."
              >
                <div className="article-related-list">
                  {relatedArticles.map((related) => (
                    <TrackedLink
                      key={related.slug}
                      href={`/artigos/${related.slug}`}
                      className="route-card"
                      eventKey="strategic_content_cta_clicked"
                      trackingPayload={{
                        contentId: related.slug,
                        topic: related.topic,
                        location: "article_related"
                      }}
                    >
                      <span className="shortcut-kicker">{related.categoryLabel}</span>
                      <strong>{related.title}</strong>
                      <span>{related.excerpt}</span>
                    </TrackedLink>
                  ))}
                </div>
              </SectionCard>

              {nextBestArticles.length ? (
                <SectionCard
                  title="Proxima leitura recomendada"
                  description="Conteudos que tendem a empurrar este assunto para mais criterio e mais intencao."
                >
                  <div className="article-related-list">
                    {nextBestArticles.map((nextArticle) => (
                      <TrackedLink
                        key={nextArticle.slug}
                        href={`/artigos/${nextArticle.slug}`}
                        className="route-card"
                        eventKey="strategic_content_cta_clicked"
                        trackingPayload={{
                          contentId: nextArticle.slug,
                          topic: nextArticle.topic,
                          location: "article_next_best"
                        }}
                      >
                        <span className="shortcut-kicker">{nextArticle.categoryLabel}</span>
                        <strong>{nextArticle.title}</strong>
                        <span>{nextArticle.excerpt}</span>
                      </TrackedLink>
                    ))}
                  </div>
                </SectionCard>
              ) : null}
            </div>
          </div>
        </SectionCard>
      </AppFrame>
    </>
  );
}
