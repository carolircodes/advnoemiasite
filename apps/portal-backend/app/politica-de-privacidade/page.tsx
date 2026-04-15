import type { Metadata } from "next";

import { PublicLegalPage } from "@/components/public-legal-page";

export const metadata: Metadata = {
  title: "Politica de Privacidade",
  description:
    "Politica de Privacidade da Noemia Paixao Advocacia com informacoes sobre coleta, uso, retencao, seguranca e solicitacoes de exclusao de dados.",
  robots: {
    index: true,
    follow: true
  },
  alternates: {
    canonical: "/politica-de-privacidade"
  },
  openGraph: {
    title: "Politica de Privacidade | Noemia Paixao Advocacia",
    description:
      "Entenda como dados pessoais podem ser tratados nos canais oficiais de atendimento do escritorio."
  },
  twitter: {
    title: "Politica de Privacidade | Noemia Paixao Advocacia",
    description:
      "Informacoes publicas sobre coleta, uso, seguranca e solicitacoes de exclusao de dados."
  }
};

export default function PrivacyPolicyPage() {
  return (
    <PublicLegalPage
      eyebrow="Privacidade e protecao de dados"
      title="Politica de Privacidade"
      description="Esta pagina explica, em linguagem institucional e objetiva, como a Noemia Paixao Advocacia trata dados pessoais em seu site e em seus canais oficiais de atendimento."
      currentPath="/politica-de-privacidade"
      highlights={[
        { label: "Escopo", value: "Site e canais oficiais" },
        { label: "Base", value: "LGPD e uso proporcional" },
        { label: "Direitos", value: "Acesso, correcao e exclusao" },
        { label: "Contato", value: "Solicitacoes por e-mail" }
      ]}
      sections={[
        {
          title: "1. Quem somos e quando esta politica se aplica",
          content: (
            <>
              <p>
                A Noemia Paixao Advocacia atua como operacao juridica e digital integrada,
                utilizando o site institucional e canais oficiais de atendimento para
                receber contatos, organizar triagens iniciais, responder solicitacoes,
                conduzir agendamentos e apoiar a prestacao de informacoes sobre servicos.
              </p>
              <p>
                Esta politica se aplica a interacoes realizadas no dominio principal do
                escritorio, no formulario e no site chat, bem como em canais integrados
                como WhatsApp, Instagram e outras ferramentas operacionais utilizadas para
                viabilizar o atendimento.
              </p>
            </>
          )
        },
        {
          title: "2. Quais dados podem ser coletados",
          description:
            "A coleta varia conforme o tipo de interacao e ocorre de forma proporcional ao atendimento solicitado.",
          content: (
            <>
              <ul className="legal-list">
                <li>Dados de identificacao e contato, como nome, telefone, e-mail e @ do Instagram quando fornecidos.</li>
                <li>Informacoes enviadas em formularios, no site chat, no WhatsApp, no Instagram ou em outros canais oficiais.</li>
                <li>Dados contextuais da triagem inicial, como assunto, descricao do caso e preferencia de retorno.</li>
                <li>Metadados tecnicos e operacionais necessarios para seguranca, prevencao a abuso e melhoria da operacao.</li>
                <li>Registros de interacao, historico de mensagens, agendamentos, anexos e sinais de continuidade do atendimento.</li>
              </ul>
              <p>
                O escritorio busca evitar a coleta excessiva e prioriza o uso de
                informacoes pertinentes ao atendimento, a organizacao interna e a
                protecao dos fluxos operacionais.
              </p>
            </>
          )
        },
        {
          title: "3. Finalidades do tratamento",
          content: (
            <>
              <p>Os dados podem ser tratados para finalidades como:</p>
              <ul className="legal-list">
                <li>receber contatos e retornar solicitacoes de atendimento;</li>
                <li>realizar triagem inicial e compreender o contexto do caso;</li>
                <li>agendar atendimentos e organizar proximos passos;</li>
                <li>prestar informacoes sobre servicos juridicos e fluxos do escritorio;</li>
                <li>registrar historico operacional para continuidade, follow-up e handoff entre equipe e automacao;</li>
                <li>manter seguranca, prevenir abuso, reduzir fraude e melhorar a experiencia operacional.</li>
              </ul>
            </>
          )
        },
        {
          title: "4. Bases gerais para o tratamento",
          content: (
            <>
              <p>
                O tratamento de dados pessoais ocorre conforme bases admitidas pela LGPD,
                em especial quando necessario para atender solicitacoes do proprio titular,
                conduzir procedimentos preliminares relacionados a servicos juridicos,
                cumprir obrigacoes legais ou regulatorias, exercer direitos em processos e
                manter interesses legitimos vinculados a seguranca, organizacao e
                continuidade da operacao.
              </p>
              <p>
                O escritorio adota linguagem institucional e pratica: cada dado deve ter
                utilidade real no atendimento, sem promessas irreais de coleta minima
                absoluta ou eliminacao imediata em qualquer circunstancia.
              </p>
            </>
          )
        },
        {
          title: "5. Compartilhamento, infraestrutura e retencao",
          content: (
            <>
              <p>
                Quando necessario para a operacao, dados podem ser tratados por provedores
                de hospedagem, mensageria, analytics, armazenamento, automacao e
                infraestrutura contratados para sustentar o funcionamento do site e dos
                canais integrados. Esse compartilhamento ocorre dentro de necessidade
                operacional razoavel e com controles compatveis com a natureza do servico.
              </p>
              <p>
                Os registros podem permanecer armazenados pelo periodo necessario para
                atendimento, seguranca, continuidade operacional, auditoria interna e
                cumprimento de obrigacoes legais, regulatorias ou de defesa de direitos.
              </p>
            </>
          )
        },
        {
          title: "6. Seguranca, direitos do titular e exclusao de dados",
          content: (
            <>
              <p>
                O escritorio adota medidas tecnicas e organizacionais razoaveis para
                proteger os dados contra acesso indevido, uso indevido, alteracao,
                divulgacao ou perda. Nenhuma operacao digital promete risco zero, mas a
                seguranca e tratada como parte estrutural do atendimento.
              </p>
              <p>
                O titular pode solicitar confirmacao de tratamento, acesso, correcao,
                atualizacao e, quando cabivel, exclusao ou anonimização de dados. Pedidos
                de exclusao podem ser enviados conforme as instrucoes publicas da pagina{" "}
                <a href="/exclusao-de-dados" className="inline-link">
                  Exclusao de Dados
                </a>
                .
              </p>
              <p>
                A exclusao pode depender de verificacao de identidade e pode ser limitada
                quando houver necessidade de retencao para cumprimento de obrigacoes
                legais, regulatorias, contratuais ou exercicio regular de direitos.
              </p>
            </>
          )
        }
      ]}
      aside={
        <>
          <p>
            Para pedidos relacionados a privacidade e exclusao, informe sempre o maior
            numero possivel de identificadores do atendimento, como nome, telefone,
            e-mail, @ do Instagram e uma descricao resumida do contato realizado.
          </p>
          <p>
            Isso ajuda a localizar registros no site, no WhatsApp, no Instagram e em
            outras camadas operacionais eventualmente utilizadas no atendimento.
          </p>
        </>
      }
    />
  );
}
