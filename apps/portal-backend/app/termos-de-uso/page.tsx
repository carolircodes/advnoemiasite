import type { Metadata } from "next";

import { PublicLegalPage } from "@/components/public-legal-page";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso publicos da Noemia Paixao Advocacia para o site institucional e seus canais oficiais de atendimento.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/termos-de-uso"
  },
  openGraph: {
    title: "Termos de Uso | Noemia Paixao Advocacia",
    description:
      "Condicoes institucionais para navegacao no site e uso adequado dos canais oficiais do escritorio."
  },
  twitter: {
    title: "Termos de Uso | Noemia Paixao Advocacia",
    description:
      "Informacoes sobre uso adequado do site, canais oficiais e limites institucionais da operacao."
  }
};

export default function TermsOfUsePage() {
  return (
    <PublicLegalPage
      eyebrow="Uso institucional do site"
      title="Termos de Uso"
      description="Estes termos disciplinam o uso do site institucional e dos canais oficiais da Noemia Paixao Advocacia, com linguagem objetiva, institucional e adequada ao contexto do escritorio."
      currentPath="/termos-de-uso"
      highlights={[
        { label: "Natureza", value: "Informativa e institucional" },
        { label: "Relacao juridica", value: "Nao automatica" },
        { label: "Canais", value: "Uso adequado e respeitoso" },
        { label: "Atualizacao", value: "Quando necessario" }
      ]}
      sections={[
        {
          title: "1. Natureza do site e do conteudo",
          content: (
            <>
              <p>
                O site da Noemia Paixao Advocacia tem natureza institucional e
                informativa. Seu objetivo e apresentar o escritorio, organizar entradas de
                atendimento, oferecer canais oficiais de contato e disponibilizar
                informacoes gerais sobre servicos, fluxos e conteudos relacionados ao
                ecossistema digital do escritorio.
              </p>
              <p>
                O conteudo publicado nao substitui analise juridica individualizada,
                consulta formal ou avaliacao tecnica especifica do caso concreto.
              </p>
            </>
          )
        },
        {
          title: "2. Ausencia de formacao automatica de relacao advogado-cliente",
          content: (
            <>
              <p>
                O simples acesso ao site, o envio de mensagem, o preenchimento de
                formulario ou a interacao com o site chat, WhatsApp, Instagram ou outros
                canais oficiais nao cria automaticamente relacao advogado-cliente, nem
                implica aceite de patrocinio juridico.
              </p>
              <p>
                Qualquer atuacao profissional depende de analise individual do caso,
                verificacao de aderencia, avaliacao tecnica e formalizacoes cabiveis.
              </p>
            </>
          )
        },
        {
          title: "3. Uso adequado dos canais oficiais",
          content: (
            <>
              <ul className="legal-list">
                <li>Utilize os canais oficiais com informacoes verdadeiras, pertinentes e respeitosas.</li>
                <li>Evite envio de conteudo ilicito, ofensivo, abusivo, fraudulento ou desconectado da finalidade do atendimento.</li>
                <li>O escritorio pode limitar, suspender ou desconsiderar interacoes que comprometam a seguranca ou a integridade da operacao.</li>
              </ul>
              <p>
                O uso dos canais deve observar a natureza institucional do escritorio e a
                necessidade de triagem, priorizacao e organizacao interna do atendimento.
              </p>
            </>
          )
        },
        {
          title: "4. Propriedade intelectual e responsabilidade",
          content: (
            <>
              <p>
                Textos, identidade visual, estrutura editorial e demais elementos do site,
                salvo indicacao em contrario, integram o patrimonio intelectual do
                escritorio ou sao utilizados dentro de licencas e autorizacoes aplicaveis.
              </p>
              <p>
                O escritorio busca manter informacoes corretas e atualizadas, mas nao
                assume garantia absoluta de disponibilidade continua, ausencia de erros ou
                adequacao universal do conteudo a todos os contextos individuais. O uso do
                site ocorre dentro de limites razoaveis de responsabilidade.
              </p>
            </>
          )
        },
        {
          title: "5. Atualizacoes e contato",
          content: (
            <>
              <p>
                Estes termos podem ser ajustados para refletir evolucoes institucionais,
                operacionais, normativas ou tecnicas do site e dos canais oficiais. A
                versao publica vigente sera sempre a mais recente disponibilizada nesta
                rota.
              </p>
              <p>
                Para duvidas institucionais relacionadas a estes termos, utilize o canal
                de contato indicado nas paginas legais do site.
              </p>
            </>
          )
        }
      ]}
      aside={
        <>
          <p>
            Quando houver necessidade de orientacao juridica efetiva, o caminho correto e
            iniciar uma triagem ou contato institucional para analise individual do caso.
          </p>
          <p>
            O site foi desenhado para transmitir clareza, previsibilidade e organizacao,
            nao para substituir a formalizacao adequada do atendimento profissional.
          </p>
        </>
      }
    />
  );
}
