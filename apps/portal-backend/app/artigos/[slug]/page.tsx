import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppFrame } from "@/components/app-frame";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";
import {
  getAllArticles,
  getArticleBySlug,
  getArticleContentBySlug
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

  const relatedArticles = getAllArticles()
    .filter((candidate) => candidate.slug !== article.slug && candidate.topic === article.topic)
    .slice(0, 3);

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
          articleTitle: article.title
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
          { label: "Canonical", value: `/artigos/${article.slug}` }
        ]}
        actions={[
          {
            href: `/#triagem-inicial?origem=artigo&tema=${article.topic}&content_id=${article.slug}`,
            label: "Iniciar triagem",
            trackingEventKey: "cta_start_triage_clicked",
            trackingPayload: {
              contentId: article.slug,
              topic: article.topic,
              location: "article_hero"
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
              location: "article_hero"
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
              <div className="cta-strip">
                <strong>Se esse contexto parece com o seu caso, o melhor passo agora e organizar a triagem.</strong>
                <p>
                  A equipe recebe o contexto com mais clareza, reduz ruído e acelera a primeira leitura jurídica.
                </p>
                <div className="form-actions">
                  <TrackedLink
                    href={`/#triagem-inicial?origem=artigo&tema=${article.topic}&content_id=${article.slug}`}
                    className="button"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "article_bottom"
                    }}
                  >
                    Enviar caso para triagem
                  </TrackedLink>
                </div>
              </div>
            </article>

            <div className="stack">
              <SectionCard
                title="Próximo passo recomendado"
                description="Use a NoemIA como concierge para esclarecer dúvidas antes da triagem."
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
                description="Interlinking estrategico para aprofundar temas vizinhos sem criar paginas órfãs."
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
            </div>
          </div>
        </SectionCard>
      </AppFrame>
    </>
  );
}
