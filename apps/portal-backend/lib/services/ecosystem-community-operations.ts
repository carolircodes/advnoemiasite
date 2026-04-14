import "server-only";

export type FounderState =
  | "invited"
  | "active_founder"
  | "waitlist"
  | "reserved_interest"
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

export type MonetizationScenario = {
  id: "A" | "B" | "C";
  title: string;
  advantage: string;
  risk: string;
  requirement: string;
  brandImpact: string;
  communityImpact: string;
  recurrenceImpact: string;
};

export type MonetizationReadinessThreshold = {
  key: string;
  label: string;
  target: number;
  unit: string;
  reason: string;
};

export type ReserveStateDescriptor = {
  key: "curious" | "interested" | "qualified_waitlist" | "reserved_priority" | "invited" | "active_founder";
  label: string;
  microcopy: string;
  curatorReason: string;
  promotionTiming: string;
};

export type PaidInterestSignal = {
  label: string;
  signal: string;
  interpretation: string;
  telemetryFocus: string;
};

export type SocialDensityLever = {
  label: string;
  cadence: string;
  objective: string;
  visibleProof: string;
  telemetryFocus: string;
};

export type PortalExperienceMarker = {
  audience: "founder" | "invited" | "waitlist" | "reserved_interest";
  label: string;
  headline: string;
  detail: string;
  framing: string;
};

export type ExecutiveThresholdReview = {
  label: string;
  maintainedThreshold: string;
  operatingRule: string;
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
  reservePolicy: {
    reserveStates: Array<"interested" | "waitlist" | "reserved_priority" | "founder_active">;
    curationStates: ReserveStateDescriptor[];
    reserveSignalRule: string;
    promotionRule: string;
    priorityReasons: string[];
    advancementWindow: string;
    invitationLogic: string;
  };
  paidInterestPolicy: {
    headline: string;
    explicitSignals: PaidInterestSignal[];
    distinctionRule: string;
    permanenceRule: string;
    founderPlanRule: string;
  };
  onboarding: CommunityOnboardingStep[];
  valueLoops: CommunityValueLoop[];
  retentionRoutines: RetentionRoutine[];
  contentCheckpoints: ContentCheckpoint[];
  socialDensityLevers: SocialDensityLever[];
  portalExperience: PortalExperienceMarker[];
  channelBridges: CommunityChannelBridge[];
  monetizationCriteria: MonetizationCriterion[];
  readinessThresholds: MonetizationReadinessThreshold[];
  executiveThresholdReview: ExecutiveThresholdReview[];
  coreProtectionRules: string[];
  monetizationScenarios: MonetizationScenario[];
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
        "reserved_interest",
        "deferred",
        "rejected_when_needed"
      ],
      approvalLogic: [
        "priorizar pessoas com afinidade real com a proposta do Circulo",
        "preferir entrada por convite ou origem qualificada",
        "manter lotes pequenos para onboarding cuidadoso",
        "usar waitlist para desejo alto sem abrir a porta cedo demais",
        "usar reserved_interest quando ja houver desejo de continuidade e apetite futuro pago, mas ainda sem convite imediato",
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
    reservePolicy: {
      reserveStates: ["interested", "waitlist", "reserved_priority", "founder_active"],
      curationStates: [
        {
          key: "curious",
          label: "Curiosa em leitura",
          microcopy: "Interesse inicial lido com delicadeza, sem promessa de entrada.",
          curatorReason: "Existe afinidade embrionaria, mas ainda sem densidade para fila premium.",
          promotionTiming: "Avanca quando houver origem clara e retorno espontaneo."
        },
        {
          key: "interested",
          label: "Interesse declarado",
          microcopy: "Desejo percebido e registrado como sinal nobre de aproximacao.",
          curatorReason: "A pessoa demonstrou vontade ativa de acompanhar o Circulo com mais proximidade.",
          promotionTiming: "Sobe para waitlist qualificada quando o interesse ganha contexto e origem."
        },
        {
          key: "qualified_waitlist",
          label: "Waitlist qualificada",
          microcopy: "Fila elegante com observacao curada, nao formulario frio.",
          curatorReason: "Ja existe aderencia editorial ou relacional suficiente para manter aquecimento.",
          promotionTiming: "Pode subir para reserva prioritaria na janela seguinte de revisao."
        },
        {
          key: "reserved_priority",
          label: "Reserva prioritaria",
          microcopy: "Prioridade preservada para a proxima chamada fundadora, sem cobranca agora.",
          curatorReason: "Desejo futuro pago, permanencia e afinidade alta ja aparecem de forma objetiva.",
          promotionTiming: "Vira convite quando houver lote, densidade social e capacidade de onboarding."
        },
        {
          key: "invited",
          label: "Convite reservado",
          microcopy: "Janela pequena e curada de entrada, com motivo e contexto claros.",
          curatorReason: "A pessoa ja cabe no lote atual sem diluir a experiencia fundadora.",
          promotionTiming: "Aceite acontece no lote ativo, sem pressa comercial e sem abertura geral."
        },
        {
          key: "active_founder",
          label: "Founder ativa",
          microcopy: "Pertencimento materializado em acesso, trilha, comunidade e retorno.",
          curatorReason: "A entrada deixou de ser hipotese e virou prova social viva do Circulo.",
          promotionTiming: "Mantem-se pela continuidade, nao por urgencia de venda."
        }
      ],
      reserveSignalRule:
        "Reserved priority so aparece quando houver desejo futuro pago declarado, origem qualificada e nota curatorial favoravel.",
      promotionRule:
        "Promover waitlist para reserved_priority antes do convite quando a pessoa ja demonstrar continuidade, afinidade editorial e apetite explicito por plano fundador futuro.",
      priorityReasons: [
        "origem rastreavel por site, artigo, WhatsApp curado ou indicacao qualificada",
        "sinal explicito de continuidade e desejo de permanecer quando a camada paga abrir",
        "aderencia editorial percebida na linguagem, no problema e na forma de entrar",
        "capacidade de reforcar a densidade social sem transformar o grupo em volume"
      ],
      advancementWindow:
        "A revisao de avancos acontece em janelas curatoriais curtas, orientadas por lote e capacidade operacional, nunca por pressa de captura.",
      invitationLogic:
        "Convite so sai da reserva quando a proxima entrada fortalece pertencimento, prova social e ritmo da comunidade ao mesmo tempo."
    },
    paidInterestPolicy: {
      headline: "Paid interest aqui significa desejo de continuar pagando depois, nao curiosidade sobre preco.",
      explicitSignals: [
        {
          label: "Manifestacao futura",
          signal: "declarar interesse em continuar quando o plano fundador pago abrir",
          interpretation: "Separa admiracao passiva de vontade concreta de permanecer.",
          telemetryFocus: "paid_interest_signal"
        },
        {
          label: "Prioridade reservada",
          signal: "pedir prioridade para a proxima chamada sem exigir entrada imediata",
          interpretation: "Mostra apetite real por lugar, nao so por mais informacao.",
          telemetryFocus: "reserved_priority_signal"
        },
        {
          label: "Continuidade assumida",
          signal: "sinalizar que quer seguir depois do ciclo gratuito fundador",
          interpretation: "Materializa intencao de permanencia e reduz risco de curiosidade vazia.",
          telemetryFocus: "monetization_readiness_signal"
        },
        {
          label: "Afinidade editorial",
          signal: "chegar por artigo, site ou ponte de profundidade e ainda assim pedir entrada futura",
          interpretation: "Eleva o valor do paid interest porque nasce de entendimento, nao de impulso.",
          telemetryFocus: "premium_interest_signal"
        }
      ],
      distinctionRule:
        "Curiosidade pergunta o que e; paid interest pergunta como garantir continuidade quando a camada paga amadurecer.",
      permanenceRule:
        "Registrar paid interest apenas quando houver linguagem de permanencia, nao apenas elogio ou afinidade superficial.",
      founderPlanRule:
        "O futuro plano fundador deve ser mencionado como continuidade elegante do que ja esta sendo vivido, nunca como pitch de fechamento."
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
    socialDensityLevers: [
      {
        label: "Lotes curatoriais visiveis",
        cadence: "a cada nova janela",
        objective: "fazer novas entradas parecerem continuidade de uma sala viva, nao fluxo aleatorio",
        visibleProof: "novas founders aparecem como parte de um lote pequeno e intencional",
        telemetryFocus: "member_joined"
      },
      {
        label: "Marcos pequenos de prova",
        cadence: "semanal",
        objective: "transformar progresso, retorno e conclusao em prova comunitaria delicada",
        visibleProof: "conteudo iniciado, concluido e retorno semanal reforcam vida social",
        telemetryFocus: "content_completed"
      },
      {
        label: "Pertencimento narrado",
        cadence: "continuo",
        objective: "dar nome, contexto e elegancia ao status de cada pessoa dentro do Circulo",
        visibleProof: "founder, convite, waitlist e reserva aparecem com semantica premium no portal",
        telemetryFocus: "founder_engagement_score"
      },
      {
        label: "Pulso de comunidade",
        cadence: "por ciclo fundador",
        objective: "manter sensacao de grupo vivo sem depender de volume ou ruido",
        visibleProof: "community_viewed, member_active e retention_signal sobem em conjunto",
        telemetryFocus: "community_viewed"
      }
    ],
    portalExperience: [
      {
        audience: "founder",
        label: "Founder ativo",
        headline: "Voce ja esta dentro do Circulo em sua camada fundadora.",
        detail: "O portal deve reforcar pertencimento, progresso e retorno como experiencia viva.",
        framing: "mostrar continuidade e prova, nao exclusividade vazia"
      },
      {
        audience: "invited",
        label: "Convite reservado",
        headline: "Sua entrada esta aberta dentro de uma chamada pequena e cuidadosa.",
        detail: "A experiencia deve transmitir contexto, motivo da chamada e elegancia de lote.",
        framing: "convite como honra operacional, nao urgencia barata"
      },
      {
        audience: "waitlist",
        label: "Waitlist qualificada",
        headline: "Seu nome esta em observacao curada para os proximos lotes do Circulo.",
        detail: "O portal sustenta desejo com clareza de valor e sem prometer imediatismo.",
        framing: "espera nobre com sinal de leitura real"
      },
      {
        audience: "reserved_interest",
        label: "Reserva prioritaria",
        headline: "Sua prioridade ja foi reconhecida para a proxima chamada fundadora.",
        detail: "Aqui o portal deve materializar desejo futuro pago, fila premium e prontidao crescente.",
        framing: "prioridade como prova de maturidade, nao de escassez teatral"
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
    ],
    readinessThresholds: [
      {
        key: "active_founders",
        label: "Founders ativos",
        target: 12,
        unit: "founders",
        reason: "A camada paga precisa nascer com massa minima real."
      },
      {
        key: "engaged_founders",
        label: "Founders engajados",
        target: 8,
        unit: "founders",
        reason: "Sem densidade de retorno, a cobranca parece precoce."
      },
      {
        key: "average_progress_percent",
        label: "Progresso medio",
        target: 70,
        unit: "%",
        reason: "Consumo consistente sustenta valor percebido."
      },
      {
        key: "completed_content_count",
        label: "Conclusoes reais",
        target: 4,
        unit: "conclusoes",
        reason: "Conclusao e prova concreta de valor, nao so promessa."
      },
      {
        key: "qualified_waitlist",
        label: "Waitlist qualificada",
        target: 20,
        unit: "pessoas",
        reason: "A demanda precisa estar formada antes da virada."
      },
      {
        key: "editorial_origin_signals",
        label: "Sinais editoriais",
        target: 6,
        unit: "sinais",
        reason: "Site e artigos precisam provar motor proprio."
      },
      {
        key: "paid_interest_signals",
        label: "Paid interest",
        target: 10,
        unit: "sinais",
        reason: "Desejo pago declarado reduz risco de timing errado."
      },
      {
        key: "cooling_risk_count",
        label: "Risco de esfriamento",
        target: 0,
        unit: "riscos",
        reason: "Cobrar com esfriamento alto cria pressao prematura."
      }
    ],
    executiveThresholdReview: [
      {
        label: "Founders ativos e engajados",
        maintainedThreshold: "12 ativos e 8 engajados",
        operatingRule: "crescer por lotes pequenos enquanto a experiencia continuar parecendo intima e viva"
      },
      {
        label: "Progresso e conclusoes",
        maintainedThreshold: "70% de progresso medio e 4 conclusoes reais",
        operatingRule: "tratar conclusao como prova publica de valor, nao apenas consumo interno"
      },
      {
        label: "Waitlist e reserva",
        maintainedThreshold: "20 nomes qualificados entre waitlist e reserva prioritaria",
        operatingRule: "medir densidade, origem e desejo pago futuro antes de qualquer abertura"
      },
      {
        label: "Motor editorial e paid interest",
        maintainedThreshold: "6 sinais editoriais e 10 sinais de paid interest",
        operatingRule: "site e artigos precisam alimentar desejo premium sem contaminar a marca"
      },
      {
        label: "Risco de esfriamento",
        maintainedThreshold: "0 founders esfriando sem contrapeso",
        operatingRule: "nao monetizar enquanto a comunidade precisar de reanimacao basica"
      }
    ],
    coreProtectionRules: [
      "o core juridico continua intacto como command center principal do imperio",
      "pagamentos juridicos seguem separados da camada premium e da reserva fundadora",
      "portal premium, comunidade e assinatura nao contaminam a operacao legal",
      "toda telemetria do Circulo continua em camada propria, fora da leitura do atendimento juridico"
    ],
    monetizationScenarios: [
      {
        id: "A",
        title: "Continuar gratuito por mais um ciclo",
        advantage: "Aumenta densidade social, conclusao e prova de valor sem pressa.",
        risk: "Gratuidade pode se cristalizar se nao houver marco futuro claro.",
        requirement: "Manter ritmo semanal, ampliar conclusoes e crescer waitlist qualificada.",
        brandImpact: "Preserva aura premium e paciencia estrategica.",
        communityImpact: "Fortalece pertencimento antes da cobranca.",
        recurrenceImpact: "Adia receita, mas melhora a chance de recorrencia saudavel."
      },
      {
        id: "B",
        title: "Preparar transicao elegante em janela curta",
        advantage: "Aproveita o momento de maturidade e organiza uma virada premium controlada.",
        risk: "Com lote ainda pequeno, a conversao pode parecer precoce e socialmente rala.",
        requirement: "Bater thresholds de massa, engajamento e waitlist antes do anuncio.",
        brandImpact: "Pode reforcar premium se o timing estiver maduro.",
        communityImpact: "Exige narrativa cuidadosa para nao quebrar a experiencia fundadora.",
        recurrenceImpact: "Acelera receita, mas cobra mais disciplina de transicao."
      },
      {
        id: "C",
        title: "Abrir etapa intermediaria de reserva e interesse",
        advantage: "Formaliza desejo pago sem cobrar ainda e mede apetite real.",
        risk: "Se ficar longa demais, vira zona cinzenta sem decisao.",
        requirement: "Estruturar reserva elegante com thresholds e janela bem definidos.",
        brandImpact: "Mantem sofisticação e prepara a marca para a virada.",
        communityImpact: "Cria expectativa sem quebrar a camada fundadora atual.",
        recurrenceImpact: "Prepara o terreno comercial sem ativar billing."
      }
    ]
  };
}
