import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { getAllArticles } from "@/lib/site/article-content";
import { PUBLIC_SITE_BASE_URL } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Artigos juridicos estrategicos",
  description:
    "Biblioteca editorial com orientacao juridica clara, artigos em subpasta e links diretos para triagem e atendimento.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/artigos"
  },
  openGraph: {
    title: "Artigos juridicos estrategicos | Noemia Paixao Advocacia",
    description:
      "Conteudo juridico em subpasta com foco em clareza, autoridade e conversao qualificada."
  },
  twitter: {
    title: "Artigos juridicos estrategicos | Noemia Paixao Advocacia",
    description:
      "Conteudo juridico em subpasta com foco em clareza, autoridade e conversao qualificada."
  }
};

const articleIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Artigos juridicos estrategicos",
  description:
    "Biblioteca editorial com artigos juridicos do escritorio em subpasta.",
  url: `${PUBLIC_SITE_BASE_URL}/artigos`
};

export default function ArticleIndexPage() {
  const articles = getAllArticles();

  return (
    <>
      <ProductEventBeacon
        eventKey="strategic_content_list_viewed"
        eventGroup="content"
        payload={{
          entryPoint: "artigos_index",
          contentCount: articles.length
        }}
        oncePerSession
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleIndexSchema) }}
      />
      <AppFrame
        eyebrow="Conteudo juridico estrategico"
        title="Artigos em subpasta, com leitura clara e caminho direto para atendimento."
        description="A estrutura editorial agora fica dentro da propria aplicacao, com metadata consistente, canonical correto e trilha clara entre conteudo, triagem e atendimento."
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/artigos", label: "Artigos", active: true },
          { href: "/#triagem-inicial", label: "Triagem inicial" },
          { href: "/portal/login", label: "Area do cliente" }
        ]}
        highlights={[
          { label: "Estrutura", value: "Subpasta /artigos" },
          { label: "Topicos", value: "Previdenciario, familia, civil e consumidor" },
          { label: "SEO tecnico", value: "Canonical, sitemap e robots coerentes" },
          { label: "Conversao", value: "CTA rastreado para triagem" }
        ]}
      >
        <SectionCard
          title="Biblioteca editorial pronta para autoridade real"
          description="Cada artigo agora entra no mesmo ecossistema de observabilidade e conversao da plataforma."
        >
          <div className="article-index-grid">
            {articles.map((article) => (
              <article key={article.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{article.categoryLabel}</span>
                  <span className="tag soft">{article.readingMinutes} min</span>
                </div>
                <strong>{article.title}</strong>
                <p>{article.excerpt}</p>
                <div className="tag-row">
                  {article.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="tag soft">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="form-actions">
                  <TrackedLink
                    href={`/artigos/${article.slug}`}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "article_index"
                    }}
                  >
                    Ler artigo
                  </TrackedLink>
                  <TrackedLink
                    href={`/#triagem-inicial?origem=artigos&tema=${article.topic}&content_id=${article.slug}`}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "article_index"
                    }}
                  >
                    Iniciar triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </AppFrame>
    </>
  );
}
