import "server-only";

export type FounderState = "invited" | "active_founder" | "waitlist" | "deferred";

export type CommunityChannelBridge = {
  channel: "instagram" | "site" | "whatsapp" | "telegram" | "portal" | "articles";
  label: string;
  entryMode: string;
  ctaLabel: string;
  curationRule: string;
  telemetryEvent: string;
};

export type CommunityOnboardingStep = {
  step: string;
  title: string;
  detail: string;
};

export type CommunityValueLoop = {
  loop: string;
  title: string;
  cadence: string;
  detail: string;
  telemetryFocus: string;
};

export type MonetizationCriterion = {
  label: string;
  threshold: string;
  reason: string;
};

export type CommunityOperationsBlueprint = {
  positioning: {
    currentMode: string;
    freeNow: string[];
    reservedNow: string[];
    eleganceRule: string;
    paidLayerPreservation: string;
  };
  entryPolicy: {
    lotSize: number;
    maxConcurrentInvites: number;
    founderStates: FounderState[];
    approvalLogic: string[];
  };
  waitlistPolicy: {
    prioritySignals: string[];
    experienceRule: string;
    upgradeRule: string;
  };
  onboarding: CommunityOnboardingStep[];
  valueLoops: CommunityValueLoop[];
  channelBridges: CommunityChannelBridge[];
  monetizationCriteria: MonetizationCriterion[];
};

export function getCommunityOperationsBlueprint(): CommunityOperationsBlueprint {
  return {
    positioning: {
      currentMode: "free_private_founding",
      freeNow: [
        "comunidade privada do Circulo Essencial",
        "trilha inaugural com acesso fundador",
        "rituais iniciais de pertencimento",
        "portal premium com progressao e curadoria"
      ],
      reservedNow: [
        "camada paga de assinatura",
        "escala massiva de entrada",
        "expansao irrestrita de beneficios",
        "segunda oferta monetizada"
      ],
      eleganceRule:
        "Comunicar convite, pertencimento e valor percebido crescente sem urgencia barata nem linguagem de empurrao.",
      paidLayerPreservation:
        "A recorrencia permanece pronta, mas dormente, para ser ativada apenas quando o desejo, a atividade e a retencao sustentarem uma cobranca elegante."
    },
    entryPolicy: {
      lotSize: 5,
      maxConcurrentInvites: 3,
      founderStates: ["invited", "active_founder", "waitlist", "deferred"],
      approvalLogic: [
        "priorizar pessoas com afinidade real com a proposta do Circulo",
        "preferir entrada por convite ou origem qualificada",
        "manter lotes pequenos para onboarding cuidadoso",
        "usar waitlist para desejo alto sem abrir a porta cedo demais"
      ]
    },
    waitlistPolicy: {
      prioritySignals: [
        "premium_interest_signal",
        "waitlist_interest",
        "paid_interest_signal",
        "founder_engagement_score"
      ],
      experienceRule:
        "A waitlist deve soar como reserva nobre e observacao cuidadosa, nunca como fila genérica ou tática de escassez barata.",
      upgradeRule:
        "Mover para convite apenas quando houver afinidade, capacidade operacional e sinal claro de desejo/participacao."
    },
    onboarding: [
      {
        step: "01",
        title: "Convite curado",
        detail: "A entrada acontece por selecao, com framing de founder e explicacao clara do porquê da reserva."
      },
      {
        step: "02",
        title: "Boas-vindas premium",
        detail: "Recepcao com linguagem de pertencimento, valor inicial e promessa de ritmo vivo."
      },
      {
        step: "03",
        title: "Primeiro valor",
        detail: "A founder entra ja com conteudo inaugural e direcao clara para seu primeiro ganho concreto."
      },
      {
        step: "04",
        title: "Ritual de comunidade",
        detail: "A founder entende como participar, voltar e se reconhecer como parte da camada inicial."
      }
    ],
    valueLoops: [
      {
        loop: "ritual_semanal",
        title: "Pulso semanal de clareza",
        cadence: "1 vez por semana",
        detail: "Um ponto fixo de valor que faz a comunidade parecer viva e previsivel, sem volume excessivo.",
        telemetryFocus: "retention_signal"
      },
      {
        loop: "conteudo_ancora",
        title: "Conteudo ancora fundador",
        cadence: "1 novo desbloqueio curado",
        detail: "Material que reforca sofisticação, utilidade e a sensação de que vale a pena permanecer.",
        telemetryFocus: "content_started"
      },
      {
        loop: "pertencimento",
        title: "Sinal de pertencimento",
        cadence: "contínuo",
        detail: "Micro-rituais que lembram a pessoa de que ela está em um circulo pequeno, vivo e valioso.",
        telemetryFocus: "founder_engagement_score"
      }
    ],
    channelBridges: [
      {
        channel: "instagram",
        label: "Instagram",
        entryMode: "comentario, DM ou link bio",
        ctaLabel: "Entrar na reserva privada",
        curationRule: "atrair somente por conteudo com afinidade alta e sem prometer acesso imediato",
        telemetryEvent: "premium_interest_signal"
      },
      {
        channel: "site",
        label: "Site",
        entryMode: "pagina institucional e pontos de CTA seletivos",
        ctaLabel: "Solicitar observacao na lista privada",
        curationRule: "apresentar o Circulo como extensao premium do ecossistema, nao como grupo aberto",
        telemetryEvent: "waitlist_interest"
      },
      {
        channel: "whatsapp",
        label: "WhatsApp",
        entryMode: "conversa qualificada",
        ctaLabel: "Manifestar interesse no Circulo",
        curationRule: "usar so quando houver contexto e afinidade real, sem virar canal de massa",
        telemetryEvent: "premium_interest_signal"
      },
      {
        channel: "telegram",
        label: "Telegram",
        entryMode: "futuro canal satelite",
        ctaLabel: "Reservado para fase posterior",
        curationRule: "ativar apenas se surgir ganho real de operacao, nao por vaidade de canal",
        telemetryEvent: "waitlist_interest"
      },
      {
        channel: "portal",
        label: "Portal",
        entryMode: "hub premium e beneficios",
        ctaLabel: "Fortalecer pertencimento",
        curationRule: "tratar o founder atual como referencia de experiencia e termometro de maturidade",
        telemetryEvent: "founder_engagement_score"
      },
      {
        channel: "articles",
        label: "Conteudos e artigos",
        entryMode: "pontes editoriais",
        ctaLabel: "Ler e pedir observacao curada",
        curationRule: "capturar desejo a partir de profundidade e afinidade, nao de isca genérica",
        telemetryEvent: "paid_interest_signal"
      }
    ],
    monetizationCriteria: [
      {
        label: "Founders ativos",
        threshold: ">= 12 founders ativos",
        reason: "A cobranca futura precisa nascer com massa minima de pertencimento real."
      },
      {
        label: "Atividade semanal",
        threshold: ">= 70% com sinal semanal de member_active ou founder_engagement_score",
        reason: "Sem pulso vivo, a monetizacao vira pressa em vez de evolucao natural."
      },
      {
        label: "Consumo de conteudo",
        threshold: ">= 60% iniciando conteudo e >= 35% concluindo a trilha inaugural",
        reason: "Valor percebido precisa estar comprovado no uso, nao so na narrativa."
      },
      {
        label: "Retencao inicial",
        threshold: ">= 75% mantendo sinais de retorno apos 30 dias",
        reason: "Retencao valida que a comunidade sustenta continuidade antes de cobrar."
      },
      {
        label: "Waitlist qualificada",
        threshold: ">= 25 pessoas com sinais reais de desejo",
        reason: "A espera precisa indicar demanda madura, nao curiosidade vazia."
      },
      {
        label: "Paid interest",
        threshold: ">= 8 sinais explicitos de interesse futuro pago",
        reason: "A transicao para pago deve responder a desejo declarado, nao a ansiedade de monetizar."
      }
    ]
  };
}
