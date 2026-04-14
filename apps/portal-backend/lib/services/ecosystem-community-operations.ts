import "server-only";

export type FounderState =
  | "invited"
  | "active_founder"
  | "waitlist"
  | "deferred"
  | "rejected_when_needed";

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

export type RetentionRoutine = {
  label: string;
  cadence: string;
  objective: string;
  telemetryFocus: string;
};

export type ContentCheckpoint = {
  label: string;
  milestone: string;
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
  retentionRoutines: RetentionRoutine[];
  contentCheckpoints: ContentCheckpoint[];
  channelBridges: CommunityChannelBridge[];
  monetizationCriteria: MonetizationCriterion[];
};

export function getCommunityOperationsBlueprint(): CommunityOperationsBlueprint {
  return {
    positioning: {
      currentMode: "free_private_founding_maturity",
      freeNow: [
        "comunidade privada do Circulo Essencial",
        "trilha inaugural com acesso fundador",
        "rituais semanais de pertencimento",
        "portal premium com progresso, retorno e curadoria"
      ],
      reservedNow: [
        "camada paga de assinatura",
        "escala massiva de entrada",
        "expansao irrestrita de beneficios",
        "segunda oferta monetizada"
      ],
      eleganceRule:
        "Comunicar retorno, pertencimento e valor percebido crescente sem urgencia barata nem linguagem de empurrao.",
      paidLayerPreservation:
        "A recorrencia permanece pronta, mas dormente, para ser ativada apenas quando desejo, atividade, conclusao e retencao sustentarem uma cobranca elegante."
    },
    entryPolicy: {
      lotSize: 3,
      maxConcurrentInvites: 2,
      founderStates: [
        "invited",
        "active_founder",
        "waitlist",
        "deferred",
        "rejected_when_needed"
      ],
      approvalLogic: [
        "priorizar pessoas com afinidade real com a proposta do Circulo",
        "preferir entrada por convite ou origem qualificada",
        "manter lotes pequenos para onboarding cuidadoso",
        "usar waitlist para desejo alto sem abrir a porta cedo demais",
        "usar deferred ou rejected_when_needed quando o interesse existir, mas a aderencia ao momento fundador ainda nao justificar entrada"
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
        "A waitlist deve soar como reserva nobre e observacao cuidadosa, nunca como fila generica ou tatica de escassez barata.",
      upgradeRule:
        "Mover para convite apenas quando houver afinidade, capacidade operacional e sinal claro de desejo, progresso e participacao."
    },
    onboarding: [
      {
        step: "01",
        title: "Convite curado",
        detail: "A entrada acontece por selecao, com framing de founder e explicacao clara do porque da reserva."
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
        detail: "Material que reforca sofisticacao, utilidade e a sensacao de que vale a pena permanecer.",
        telemetryFocus: "content_started"
      },
      {
        loop: "pertencimento",
        title: "Sinal de pertencimento",
        cadence: "continuo",
        detail: "Micro-rituais lembram a pessoa de que ela esta em um circulo pequeno, vivo e valioso.",
        telemetryFocus: "founder_engagement_score"
      }
    ],
    retentionRoutines: [
      {
        label: "Pulso fundador semanal",
        cadence: "toda semana",
        objective: "gerar retorno previsivel com member_active e retention_signal",
        telemetryFocus: "retention_signal"
      },
      {
        label: "Microcheck de pertencimento",
        cadence: "2 toques por ciclo",
        objective: "lembrar a founder de voltar sem transformar a comunidade em canal ruidoso",
        telemetryFocus: "founder_engagement_score"
      },
      {
        label: "Revisao de esfriamento",
        cadence: "revisao executiva",
        objective: "identificar risco de esfriamento e reacender a jornada com contexto",
        telemetryFocus: "member_active"
      }
    ],
    contentCheckpoints: [
      {
        label: "Inicio da trilha",
        milestone: "content_started",
        detail: "a founder entra na trilha e percebe direcao clara desde o primeiro passo",
        telemetryFocus: "content_started"
      },
      {
        label: "Avanco guiado",
        milestone: "checkpoint_intermediario",
        detail: "microcopy e pertencimento empurram o consumo para alem da abertura inicial",
        telemetryFocus: "founder_engagement_score"
      },
      {
        label: "Conclusao inaugural",
        milestone: "content_completed",
        detail: "a primeira conclusao vira prova de valor, nao so liberacao de conteudo",
        telemetryFocus: "content_completed"
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
        entryMode: "pagina institucional, CTA discreto e ponte de valor",
        ctaLabel: "Entrar em observacao curada",
        curationRule: "apresentar o Circulo como extensao premium do ecossistema e motor de valor, nao como grupo aberto",
        telemetryEvent: "premium_interest_signal"
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
        entryMode: "hub premium, beneficios e progresso",
        ctaLabel: "Fortalecer pertencimento",
        curationRule: "tratar o founder atual como referencia de experiencia, retorno e termometro de maturidade",
        telemetryEvent: "founder_engagement_score"
      },
      {
        channel: "articles",
        label: "Conteudos e artigos",
        entryMode: "pontes editoriais e leitura aprofundada",
        ctaLabel: "Ler, aprofundar e pedir observacao curada",
        curationRule: "capturar desejo a partir de profundidade, progresso e afinidade, nao de isca generica",
        telemetryEvent: "paid_interest_signal"
      }
    ],
    monetizationCriteria: [
      {
        label: "Founders ativos",
        threshold: ">= 12 founders ativos e >= 8 engajados semanalmente",
        reason: "A cobranca futura precisa nascer com massa minima de pertencimento real."
      },
      {
        label: "Atividade semanal",
        threshold: ">= 75% com sinal semanal de member_active ou founder_engagement_score",
        reason: "Sem pulso vivo, a monetizacao vira pressa em vez de evolucao natural."
      },
      {
        label: "Consumo de conteudo",
        threshold: ">= 70% iniciando conteudo e >= 50% concluindo a trilha inaugural",
        reason: "Valor percebido precisa estar comprovado no uso, nao so na narrativa."
      },
      {
        label: "Retencao inicial",
        threshold: ">= 80% mantendo sinais de retorno apos 30 dias",
        reason: "Retencao valida que a comunidade sustenta continuidade antes de cobrar."
      },
      {
        label: "Waitlist qualificada",
        threshold: ">= 20 pessoas com sinais reais de desejo e origem rastreavel",
        reason: "A espera precisa indicar demanda madura, nao curiosidade vazia."
      },
      {
        label: "Paid interest",
        threshold: ">= 10 sinais explicitos de interesse futuro pago e >= 4 vindos de site/artigos",
        reason: "A transicao para pago deve responder a desejo declarado, nao a ansiedade de monetizar."
      }
    ]
  };
}
