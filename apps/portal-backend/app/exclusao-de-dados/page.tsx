import type { Metadata } from "next";

import { PublicLegalPage } from "@/components/public-legal-page";
import { LEGAL_CONTACT_EMAIL } from "@/lib/public-site";

export const metadata: Metadata = {
  title: "Exclusao de Dados",
  description:
    "Instrucoes publicas para solicitacao de exclusao de dados relacionados ao site, WhatsApp, Instagram e outros canais oficiais da Noemia Paixao Advocacia.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/exclusao-de-dados"
  },
  openGraph: {
    title: "Exclusao de Dados | Noemia Paixao Advocacia",
    description:
      "Canal publico com orientacoes para solicitacoes de exclusao de dados no contexto dos canais oficiais do escritorio."
  },
  twitter: {
    title: "Exclusao de Dados | Noemia Paixao Advocacia",
    description:
      "Saiba como solicitar a exclusao de dados tratados em interacoes com o escritorio."
  }
};

export default function DataDeletionPage() {
  return (
    <PublicLegalPage
      eyebrow="Solicitacoes publicas de exclusao"
      title="Exclusao de Dados"
      description="Esta pagina foi publicada para usuarios em geral e para fins de conformidade com plataformas como a Meta, reunindo orientacoes claras para pedidos de exclusao de dados vinculados aos canais oficiais do escritorio."
      currentPath="/exclusao-de-dados"
      highlights={[
        { label: "Canal", value: "Solicitacao por e-mail" },
        { label: "Escopo", value: "Site, WhatsApp e Instagram" },
        { label: "Analise", value: "Verificacao prudente" },
        { label: "Retencao", value: "Minima e legal" }
      ]}
      sections={[
        {
          title: "1. Como solicitar a exclusao",
          content: (
            <>
              <p>
                Pedidos de exclusao de dados podem ser feitos por qualquer pessoa que
                tenha interagido com a Noemia Paixao Advocacia por meio do site, do site
                chat, do WhatsApp, do Instagram ou de outros canais oficiais utilizados no
                atendimento.
              </p>
              <p>
                Para solicitar a exclusao, envie um e-mail para{" "}
                <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="inline-link">
                  {LEGAL_CONTACT_EMAIL}
                </a>{" "}
                com o assunto <span className="code">Solicitacao de exclusao de dados</span>.
              </p>
            </>
          )
        },
        {
          title: "2. Informacoes que ajudam a localizar o atendimento",
          description:
            "Quanto mais preciso for o pedido, mais eficiente tende a ser a analise interna.",
          content: (
            <>
              <ul className="legal-list">
                <li>nome completo;</li>
                <li>telefone utilizado no contato, inclusive WhatsApp, se houver;</li>
                <li>e-mail utilizado;</li>
                <li>@ do Instagram ou outro identificador social, se aplicavel;</li>
                <li>descricao resumida do contato realizado, com canal e periodo aproximado.</li>
              </ul>
              <p>
                Esses elementos sao importantes para localizar registros com seguranca e
                evitar exclusoes indevidas ou inconsistentes.
              </p>
            </>
          )
        },
        {
          title: "3. Prazo estimado e forma de resposta",
          content: (
            <>
              <p>
                O escritorio realiza uma analise inicial do pedido e, sempre que possivel,
                apresenta retorno em prazo razoavel, normalmente em ate 15 dias uteis,
                podendo solicitar informacoes complementares para verificacao segura da
                identidade ou da interacao relatada.
              </p>
              <p>
                Em situacoes que envolvam registros dispersos entre canais ou dependencia
                de provedores operacionais, o prazo pode exigir ajuste prudente, com
                comunicacao ao solicitante.
              </p>
            </>
          )
        },
        {
          title: "4. Limites da exclusao e retencao minima",
          content: (
            <>
              <p>
                A exclusao sera avaliada conforme a natureza dos dados, o historico da
                interacao e eventuais obrigacoes legais, regulatorias ou de defesa de
                direitos. Em alguns casos, parte minima dos registros pode precisar ser
                mantida para cumprimento normativo, seguranca ou auditoria.
              </p>
              <p>
                Sempre que cabivel, o escritorio prioriza a eliminacao, anonimização ou
                restricao adequada dos dados que nao precisem permanecer armazenados.
              </p>
            </>
          )
        }
      ]}
      aside={
        <>
          <p>
            Esta pagina publica atende a instrucoes operacionais de privacidade e pode ser
            utilizada como referencia por usuarios que tenham interagido com campanhas,
            mensagens, formularios, atendimento social ou fluxos do site.
          </p>
          <p>
            Caso o pedido envolva apenas atualizacao, correcao ou esclarecimento, isso
            tambem pode ser indicado no mesmo canal de contato.
          </p>
        </>
      }
    />
  );
}
