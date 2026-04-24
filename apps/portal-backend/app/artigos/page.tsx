import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { getAllArticles, getTopicHubs } from "@/lib/site/article-content";
import { getEditorialServicePages } from "@/lib/site/editorial-taxonomy";
import { buildPublicCanonicalUrl, buildPublicMetadata } from "@/lib/site/seo";

export const metadata: Metadata = buildPublicMetadata({
  title: "Artigos juridicos estrategicos",
  description:
    "Biblioteca editorial com orientacao juridica clara, artigos em subpasta e links diretos para triagem e atendimento.",
  path: "/artigos"
});

const articleIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Artigos juridicos estrategicos",
  description:
    "Biblioteca editorial com artigos juridicos do escritorio em subpasta.",
  url: buildPublicCanonicalUrl("/artigos")
};

export default function ArticleIndexPage() {
  const articles = getAllArticles();
  const topicHubs = getTopicHubs();
  const servicePages = getEditorialServicePages();

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
          title="Hubs tematicos"
          description="Cada cluster editorial agora tem uma pagina-hub para fortalecer autoridade, interlinking e passagem para triagem."
        >
          <div className="grid two">
            {topicHubs.map((hub) => (
              <article key={hub.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{hub.title}</span>
                  <span className="tag soft">cluster</span>
                </div>
                <strong>{hub.description}</strong>
                <p>{hub.strategicAngle}</p>
                <div className="form-actions">
                  <TrackedLink
                    href={`/artigos/tema/${hub.slug}`}
                    className="button secondary"
                    eventKey="article_hub_cta_clicked"
                    trackingPayload={{ topic: hub.topic, location: "article_hub_index" }}
                  >
                    Abrir hub
                  </TrackedLink>
                  <TrackedLink
                    href={hub.serviceHref}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{ topic: hub.topic, location: "article_hub_index" }}
                  >
                    Ir para triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Paginas de entrada por area"
          description="A biblioteca editorial agora conversa com money pages reais, para o visitante poder entrar pelo tema certo sem depender de artigo individual."
        >
          <div className="grid two">
            {servicePages.map((page) => (
              <article key={page.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{page.title}</span>
                  <span className="tag soft">atuacao</span>
                </div>
                <strong>{page.description}</strong>
                <p>{page.primaryIntent}</p>
                <div className="form-actions">
                  <TrackedLink
                    href={page.href}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{ topic: page.topic, location: "article_index_service_pages" }}
                  >
                    Abrir pagina
                  </TrackedLink>
                  <TrackedLink
                    href={page.triageHref}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{ topic: page.topic, location: "article_index_service_pages" }}
                  >
                    Iniciar triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>

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
        <ContextualConversionPanel
          surface="article_hub"
          topic="conteudo-juridico"
          contentStage="consideration"
          primaryHref="/#triagem-inicial?origem=artigos"
          secondaryHref="/#atendimento"
          location="article_index_footer"
        />
      </AppFrame>
    </>
  );
}
