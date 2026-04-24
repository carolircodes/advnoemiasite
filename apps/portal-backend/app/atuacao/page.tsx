import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { getEditorialServicePages } from "@/lib/site/editorial-taxonomy";
import { buildPublicCanonicalUrl, buildPublicMetadata } from "@/lib/site/seo";

export const metadata = buildPublicMetadata({
  title: "Areas de atuacao juridica",
  description:
    "Paginas de entrada por area juridica, com foco em intencao de busca, clareza editorial e caminho direto para triagem.",
  path: "/atuacao"
});

const serviceIndexSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Areas de atuacao juridica",
  description:
    "Colecao de paginas de entrada por area juridica com articulacao entre conteudo, triagem e atendimento.",
  url: buildPublicCanonicalUrl("/atuacao")
};

export default function ServiceIndexPage() {
  const servicePages = getEditorialServicePages();

  return (
    <>
      <ProductEventBeacon
        eventKey="strategic_content_list_viewed"
        eventGroup="content"
        payload={{
          entryPoint: "service_index",
          contentCount: servicePages.length
        }}
        oncePerSession
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceIndexSchema) }}
      />
      <AppFrame
        eyebrow="Arquitetura de entrada"
        title="Paginas de atuacao desenhadas para busca, triagem e conversao elegante."
        description="Cada area juridica agora tem uma pagina de entrada propria, conectando intencao de busca, autoridade editorial e passagem clara para triagem."
        navigation={[
          { href: "/", label: "Inicio" },
          { href: "/atuacao", label: "Atuacao", active: true },
          { href: "/artigos", label: "Artigos" },
          { href: "/#triagem-inicial", label: "Triagem inicial" }
        ]}
        highlights={[
          { label: "Entrada", value: "Money pages por area" },
          { label: "Estrutura", value: "Hubs, clusters e triagem" },
          { label: "Intencao", value: "Busca + conversao" },
          { label: "Governanca", value: "Taxonomia canonica" }
        ]}
      >
        <SectionCard
          title="Areas prioritarias"
          description="Estas paginas passam a ser as entradas oficiais para temas de maior intencao comercial e editorial."
        >
          <div className="article-index-grid">
            {servicePages.map((page) => (
              <article key={page.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{page.title}</span>
                  <span className="tag soft">money page</span>
                </div>
                <strong>{page.description}</strong>
                <p>{page.longDescription}</p>
                <div className="tag-row">
                  {page.subtopics.slice(0, 3).map((subtopic) => (
                    <span key={subtopic} className="tag soft">
                      {subtopic}
                    </span>
                  ))}
                </div>
                <div className="form-actions">
                  <TrackedLink
                    href={page.href}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      location: "service_index",
                      topic: page.topic,
                      contentId: page.slug
                    }}
                  >
                    Abrir pagina
                  </TrackedLink>
                  <TrackedLink
                    href={page.triageHref}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{
                      location: "service_index",
                      topic: page.topic,
                      contentId: page.slug
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
          topic="areas-de-atuacao"
          contentStage="decision"
          primaryHref="/#triagem-inicial?origem=atuacao"
          secondaryHref="/#atendimento"
          location="service_index_footer"
        />
      </AppFrame>
    </>
  );
}
