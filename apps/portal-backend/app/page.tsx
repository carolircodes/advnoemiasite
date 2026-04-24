import type { Metadata } from "next";

import { AppFrame } from "@/components/app-frame";
import { ContextualConversionPanel } from "@/components/contextual-conversion-panel";
import { NoemiaAssistant } from "@/components/noemia-assistant";
import { ProductEventBeacon } from "@/components/product-event-beacon";
import { SectionCard } from "@/components/section-card";
import { TrackedLink } from "@/components/tracked-link";
import { TriageForm } from "@/components/triage-form";
import { getFeaturedArticles } from "@/lib/site/article-content";
import { getEditorialServicePages } from "@/lib/site/editorial-taxonomy";
import { buildPublicMetadata } from "@/lib/site/seo";
import { CLIENT_LOGIN_PATH } from "../lib/auth/access-control";
import {
  appendEntryContextToPath,
  getEntryContextPayload,
  readEntryContext
} from "../lib/entry-context";

export const metadata: Metadata = buildPublicMetadata({
  title: "Atendimento juridico estrategico com concierge inteligente",
  description:
    "Inicie seu atendimento na propria home com a NoemIA. Organize o caso, tire duvidas iniciais e avance para consulta com mais clareza, contexto e seguranca.",
  path: "/"
});

const legalServiceSchema = {
  "@context": "https://schema.org",
  "@type": "LegalService",
  name: "Noemia Paixao Advocacia",
  description:
    "Atendimento juridico estrategico com concierge inteligente, triagem orientada e portal seguro para acompanhamento continuo.",
  areaServed: "Brasil",
  serviceType: [
    "Direito Previdenciario",
    "Direito do Consumidor Bancario",
    "Direito de Familia",
    "Direito Civil"
  ]
};

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const entryContext = readEntryContext(await searchParams);
  const entryContextPayload = getEntryContextPayload(entryContext);
  const homeHref = appendEntryContextToPath("/", entryContext);
  const atendimentoHref = appendEntryContextToPath("/#atendimento", entryContext);
  const triagemHref = appendEntryContextToPath("/#triagem-inicial", entryContext);
  const funcionamentoHref = appendEntryContextToPath("/#como-funciona", entryContext);
  const clientLoginHref = appendEntryContextToPath(CLIENT_LOGIN_PATH, entryContext);
  const articleIndexHref = appendEntryContextToPath("/artigos", entryContext);
  const practiceAreasHref = appendEntryContextToPath("/atuacao", entryContext);
  const featuredArticles = getFeaturedArticles(3);
  const servicePages = getEditorialServicePages();
  const suggestedPrompts = [
    "Meu caso parece urgente. Como voce pode me orientar agora?",
    "Quero entender se vale marcar uma consulta e qual seria o melhor proximo passo.",
    "Ainda nao tenho todos os documentos. Posso iniciar o atendimento mesmo assim?",
    "Como a NoemIA organiza meu caso antes de a equipe assumir?",
    "Quero comecar meu atendimento aqui mesmo."
  ];

  return (
    <>
      <ProductEventBeacon
        eventKey="site_visit_started"
        eventGroup="traffic"
        payload={{ entryPoint: "home", experience: "home_unified", ...entryContextPayload }}
        oncePerSession
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(legalServiceSchema) }}
      />

      <AppFrame
        eyebrow="Atendimento juridico estrategico"
        title="Voce ja pode iniciar seu atendimento aqui, com clareza, contexto e direcao."
        description="A NoemIA foi integrada a esta home como concierge juridica do escritorio. Aqui mesmo voce explica sua situacao, tira duvidas iniciais, organiza o caso e avanca para consulta com mais seguranca."
        navigation={[
          { href: homeHref, label: "Inicio", active: true },
          { href: atendimentoHref, label: "Atendimento" },
          { href: funcionamentoHref, label: "Como funciona" },
          { href: clientLoginHref, label: "Area do cliente" }
        ]}
        highlights={[
          { label: "Primeiro contato", value: "NoemIA integrada a home" },
          { label: "Triagem inicial", value: "Sem sair da pagina" },
          { label: "Direcao", value: "Consulta com mais contexto" },
          { label: "Continuidade", value: "Portal seguro quando fizer sentido" }
        ]}
        actions={[
          {
            href: atendimentoHref,
            label: "Iniciar com a NoemIA",
            tone: "primary",
            trackingEventKey: "cta_start_attendance_clicked",
            trackingEventGroup: "conversion",
            trackingPayload: {
              location: "home_hero",
              destination: "noemia_home",
              ...entryContextPayload
            }
          },
          {
            href: clientLoginHref,
            label: "Entrar na area do cliente",
            tone: "secondary",
            trackingEventKey: "cta_client_portal_clicked",
            trackingPayload: { location: "home_hero", ...entryContextPayload }
          }
        ]}
      >
        <a href={atendimentoHref} className="floating-home-cta">
          Iniciar atendimento
        </a>

        <div className="metric-grid">
          <div className="metric-card">
            <span>Concierge inteligente</span>
            <strong>NoemIA acolhe e organiza</strong>
          </div>
          <div className="metric-card">
            <span>Primeira leitura</span>
            <strong>Duvidas e triagem no mesmo fluxo</strong>
          </div>
          <div className="metric-card">
            <span>Conducao premium</span>
            <strong>Menos ruido, mais proximo passo</strong>
          </div>
          <div className="metric-card">
            <span>Continuidade segura</span>
            <strong>Consulta, documentos e portal quando fizer sentido</strong>
          </div>
        </div>

        <SectionCard
          title="Camada de conversao contextual"
          description="A Fase 11 conecta tema, origem e intencao para puxar cada visitante para o proximo passo mais coerente."
        >
          <div className="grid two">
            <ContextualConversionPanel
              surface="home"
              topic={entryContext.tema || "atendimento-juridico"}
              contentStage="consideration"
              primaryHref={triagemHref}
              secondaryHref={atendimentoHref}
              location="home_contextual_cro"
            />
            <div className="summary-card">
              <span>O que ja entra no CRM</span>
              <strong>Origem, tema, score, prontidao e canal preferido</strong>
              <p>
                A triagem passa a classificar temperatura, intencao e melhor proximo passo para a operacao nao tratar todo lead como igual.
              </p>
            </div>
          </div>
        </SectionCard>

        <div className="grid two">
          <SectionCard
            title="Por que comecar aqui com a NoemIA"
            description="A proposta nao e abrir um chat genérico. E iniciar um atendimento mais claro, elegante e util desde o primeiro contato."
          >
            <div className="summary-grid">
              <div className="summary-card">
                <span>Clareza</span>
                <strong>Ela organiza sua situacao antes de qualquer desencontro.</strong>
                <p>Voce nao precisa adivinhar por onde comecar. A NoemIA conduz a conversa para o que realmente importa.</p>
              </div>
              <div className="summary-card">
                <span>Agilidade</span>
                <strong>Duvidas iniciais e triagem acontecem no mesmo lugar.</strong>
                <p>Em vez de navegar por paginas paralelas, voce ja inicia seu atendimento dentro da propria home.</p>
              </div>
              <div className="summary-card">
                <span>Direcao</span>
                <strong>Quando for o momento certo, a consulta entra com mais contexto.</strong>
                <p>A equipe recebe melhor o caso e o avanço fica mais natural, sem perder o tom premium do escritorio.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="O que muda na pratica"
            description="A home agora ja funciona como entrada real de atendimento, sem quebrar contexto nem mandar voce para outro fluxo principal."
          >
            <ul className="priority-list">
              <li>A NoemIA responde duvidas iniciais com linguagem clara e postura de concierge juridica.</li>
              <li>A triagem acontece na propria home, sem depender de pagina separada como caminho principal.</li>
              <li>O CTA principal conduz para atendimento, e nao para uma colecao de caminhos concorrentes.</li>
              <li>A area do cliente continua acessivel, mas deixou de disputar a atencao com o primeiro atendimento.</li>
            </ul>
          </SectionCard>
        </div>

        <SectionCard
          id="atendimento"
          title="Inicie aqui com a NoemIA"
          description="A NoemIA agora ocupa um lugar nobre na home: acolhe, orienta, organiza seu caso e conduz com mais elegancia ate o proximo passo."
        >
          <div className="split noemia-home-grid">
            <div className="stack">
              <div className="noemia-home-hero">
                <span className="eyebrow">Concierge juridica premium</span>
                <h3>A entrada inteligente do escritorio agora acontece na propria home.</h3>
                <p>
                  A NoemIA foi desenhada para entender seu momento, reduzir inseguranca, orientar documentos, organizar contexto e indicar o melhor caminho com mais criterio.
                </p>
              </div>

              <div className="grid two">
                <article className="route-card">
                  <span className="shortcut-kicker">Acolhimento</span>
                  <strong>Comeca pelas suas duvidas reais</strong>
                  <span>Ela explica como o escritorio funciona, o que vale reunir agora e quando a consulta faz sentido.</span>
                </article>
                <article className="route-card">
                  <span className="shortcut-kicker">Direcao</span>
                  <strong>Conduz para o proximo passo certo</strong>
                  <span>Se o caso pedir triagem, ela organiza. Se pedir consulta, ela prepara esse avanço com mais contexto.</span>
                </article>
              </div>

              <div className="support-panel">
                <div className="support-row">
                  <span className="support-label">Papel da NoemIA</span>
                  <strong>Entender a situacao, organizar o caso e indicar o melhor caminho sem parecer um widget barato.</strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Melhor uso</span>
                  <strong>Descreva seu momento, pergunte sobre consulta, documentos ou diga que quer iniciar seu atendimento.</strong>
                </div>
                <div className="support-row">
                  <span className="support-label">Continuidade</span>
                  <strong>Quando o atendimento avanca, a equipe recebe o contexto melhor preparado e conduz o restante com mais precisao.</strong>
                </div>
              </div>
            </div>

            <div className="noemia-home-assistant">
              <NoemiaAssistant
                audience="visitor"
                displayName="Voce"
                suggestedPrompts={suggestedPrompts}
                currentPath={homeHref}
                ctaLabel="home_unified_concierge"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="triagem-inicial"
          title="Triagem e proximo passo na propria home"
          description="Se voce ja quiser avancar, a triagem acontece aqui mesmo. Sem mudar de mundo, sem quebrar a narrativa, sem criar um fluxo publico paralelo."
        >
          <div className="split">
            <div className="stack">
              <TriageForm entryContext={entryContext} sourcePath={triagemHref} />
            </div>

            <div className="stack">
              <div className="cta-strip">
                <strong>Como a triagem ajuda sua consulta a comecar melhor</strong>
                <p>
                  Ela antecipa contexto, reduz ida e volta desnecessaria e deixa o primeiro retorno muito mais claro para voce e para a equipe.
                </p>
              </div>

              <SectionCard
                title="O que acontece depois"
                description="O atendimento continua com mais coerencia porque a entrada ja nasce organizada."
              >
                <ul className="timeline">
                  <li>1. A NoemIA acolhe, responde duvidas iniciais e ajuda a reduzir incerteza.</li>
                  <li>2. A triagem consolida o contexto essencial sem tirar voce da home.</li>
                  <li>3. A equipe recebe o caso mais bem preparado para orientar consulta e retorno.</li>
                  <li>4. Quando o atendimento segue, portal, documentos e agenda entram como continuidade, nao como barreira.</li>
                </ul>
              </SectionCard>

              <SectionCard
                title="Se voce ja e cliente"
                description="A area do cliente continua protegida e disponivel, mas nao compete com o primeiro atendimento."
              >
                <div className="form-actions">
                  <TrackedLink
                    href={clientLoginHref}
                    className="button secondary"
                    eventKey="cta_client_portal_clicked"
                    trackingPayload={{ location: "home_support", ...entryContextPayload }}
                  >
                    Entrar na area do cliente
                  </TrackedLink>
                </div>
              </SectionCard>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          id="como-funciona"
          title="Como funciona a nova experiencia publica"
          description="A home agora concentra o inicio real do atendimento, e o restante da jornada entra apenas quando for a hora certa."
        >
          <div className="journey-grid">
            <div className="journey-step">
              <span>1</span>
              <strong>Voce chega e ja encontra o atendimento</strong>
              <p>A NoemIA deixa claro que este e o lugar certo para comecar, sem mandar voce para outro trilho principal.</p>
            </div>
            <div className="journey-step">
              <span>2</span>
              <strong>Tira duvidas e organiza contexto</strong>
              <p>As perguntas iniciais e a triagem curta ajudam a transformar incerteza em direcao pratica.</p>
            </div>
            <div className="journey-step">
              <span>3</span>
              <strong>A consulta entra com mais preparo</strong>
              <p>Quando for o passo correto, a equipe recebe melhor o caso e conduz o atendimento com mais seguranca.</p>
            </div>
            <div className="journey-step">
              <span>4</span>
              <strong>Portal entra como continuidade</strong>
              <p>Documentos, agenda e acompanhamento aparecem depois, como camada de relacao, nao como distracao no primeiro contato.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Areas de atuacao que viraram paginas de entrada"
          description="A estrategia organica agora nao depende so de artigos: cada area prioritaria ganhou uma pagina de entrada propria, conectada a hub, triagem e NoemIA."
        >
          <div className="article-index-grid">
            {servicePages.map((servicePage) => (
              <article key={servicePage.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{servicePage.title}</span>
                  <span className="tag soft">entrada organica</span>
                </div>
                <strong>{servicePage.description}</strong>
                <p>{servicePage.longDescription}</p>
                <div className="tag-row">
                  {servicePage.subtopics.slice(0, 3).map((subtopic) => (
                    <span key={subtopic} className="tag soft">
                      {subtopic}
                    </span>
                  ))}
                </div>
                <div className="form-actions">
                  <TrackedLink
                    href={appendEntryContextToPath(servicePage.href, entryContext)}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      location: "home_service_pages",
                      topic: servicePage.topic,
                      contentId: servicePage.slug,
                      ...entryContextPayload
                    }}
                  >
                    Abrir pagina
                  </TrackedLink>
                  <TrackedLink
                    href={appendEntryContextToPath(servicePage.triageHref, entryContext)}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{
                      location: "home_service_pages",
                      topic: servicePage.topic,
                      contentId: servicePage.slug,
                      ...entryContextPayload
                    }}
                  >
                    Iniciar triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
          <div className="form-actions">
            <TrackedLink
              href={practiceAreasHref}
              className="button secondary"
              eventKey="strategic_content_cta_clicked"
              trackingPayload={{ location: "home_service_index", ...entryContextPayload }}
            >
              Ver todas as areas de atuacao
            </TrackedLink>
          </div>
        </SectionCard>

        <SectionCard
          title="Conteudo editorial ja integrado ao funil"
          description="Os artigos agora vivem em subpasta dentro da aplicacao, com tracking coerente, interlinking estrategico e CTA direto para triagem."
        >
          <ProductEventBeacon
            eventKey="strategic_content_list_viewed"
            eventGroup="content"
            payload={{ entryPoint: "home_featured_articles", ...entryContextPayload }}
            oncePerSession
          />
          <div className="article-index-grid">
            {featuredArticles.map((article) => (
              <article key={article.slug} className="article-card editorial-card">
                <div className="article-card-meta">
                  <span className="tag soft">{article.categoryLabel}</span>
                  <span className="tag soft">{article.readingMinutes} min</span>
                </div>
                <strong>{article.title}</strong>
                <p>{article.excerpt}</p>
                <div className="form-actions">
                  <TrackedLink
                    href={appendEntryContextToPath(`/artigos/${article.slug}`, entryContext)}
                    className="button secondary"
                    eventKey="strategic_content_cta_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "home_featured_articles",
                      ...entryContextPayload
                    }}
                  >
                    Ler artigo
                  </TrackedLink>
                  <TrackedLink
                    href={appendEntryContextToPath(
                      `/#triagem-inicial?tema=${article.topic}&content_id=${article.slug}`,
                      entryContext
                    )}
                    className="button"
                    eventKey="cta_start_triage_clicked"
                    trackingPayload={{
                      contentId: article.slug,
                      topic: article.topic,
                      location: "home_featured_articles",
                      ...entryContextPayload
                    }}
                  >
                    Ir para a triagem
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
          <div className="form-actions">
            <TrackedLink
              href={articleIndexHref}
              className="button secondary"
              eventKey="strategic_content_cta_clicked"
              trackingPayload={{ location: "home_article_index", ...entryContextPayload }}
            >
              Ver biblioteca completa
            </TrackedLink>
          </div>
        </SectionCard>

        <div className="grid two">
          <SectionCard
            title="Perguntas que a NoemIA ajuda a responder"
            description="A conversa foi pensada para reduzir hesitacao e aproximar voce do proximo passo certo."
          >
            <div className="faq-list">
              <div className="faq-item">
                <strong>Posso iniciar mesmo sem ter todos os documentos?</strong>
                <p>Sim. A NoemIA ajuda a entender o que ja faz sentido reunir agora e o que pode ser organizado depois.</p>
              </div>
              <div className="faq-item">
                <strong>Quando a consulta entra na jornada?</strong>
                <p>Quando o contexto ja estiver claro o suficiente para a equipe orientar com mais profundidade e valor real.</p>
              </div>
              <div className="faq-item">
                <strong>O portal ja aparece no primeiro contato?</strong>
                <p>O portal entra como continuidade do atendimento, quando o caso ja pede acompanhamento protegido, documentos ou agenda.</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Proxima acao recomendada"
            description="Se voce esta no primeiro contato, comece pela NoemIA. Se ja quer avancar, siga para a triagem logo abaixo."
          >
            <div className="cta-strip">
              <strong>Comece com uma conversa clara e avance com mais criterio.</strong>
              <p>Menos cliques, menos ruido e mais contexto para um atendimento premium desde o primeiro passo.</p>
              <div className="form-actions">
                <TrackedLink
                  href={atendimentoHref}
                  className="button"
                  eventKey="cta_start_attendance_clicked"
                  eventGroup="conversion"
                  trackingPayload={{ location: "home_footer", ...entryContextPayload }}
                >
                  Conversar com a NoemIA
                </TrackedLink>
                <TrackedLink
                  href={triagemHref}
                  className="button secondary"
                  eventKey="cta_start_triage_clicked"
                  trackingPayload={{ location: "home_footer", ...entryContextPayload }}
                >
                  Ir direto para a triagem
                </TrackedLink>
              </div>
            </div>
          </SectionCard>
        </div>
      </AppFrame>
    </>
  );
}
