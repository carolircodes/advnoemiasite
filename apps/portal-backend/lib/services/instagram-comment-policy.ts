import "server-only";

export type CommentPolicyDecision =
  | "public_reply_only"
  | "public_reply_and_invite_dm"
  | "human_review"
  | "no_auto_reply";

export type CommentSafetyDecision =
  | "safe_public_reply"
  | "safe_public_reply_with_dm_invite"
  | "human_review_required"
  | "auto_reply_avoided";

export type PublicBrevityRule = "micro" | "short";

export type CommentPolicyResult = {
  policyName: "meta_comment_premium_v1";
  decision: CommentPolicyDecision;
  safetyDecision: CommentSafetyDecision;
  brevityRule: PublicBrevityRule;
  publicReply: string | null;
  inviteToDm: boolean;
  shouldAttemptAutoDm: boolean;
  autoDmSupported: boolean;
  humanReviewRequired: boolean;
  directTransitionStatus:
    | "not_applicable"
    | "awaiting_dm"
    | "auto_dm_supported"
    | "auto_dm_unavailable"
    | "human_review";
  operatorAction: string;
  rationale: string;
};

type EvaluateInput = {
  channel: "instagram" | "facebook";
  commentText: string;
  topic: string;
  autoDmSupported: boolean;
};

function includesAny(text: string, values: string[]) {
  return values.some((value) => text.includes(value));
}

function buildTopicAwareAcolhimento(topic: string) {
  if (topic === "previdenciario") {
    return "Obrigada por comentar. Esse ponto merece uma orientacao cuidadosa.";
  }

  if (topic === "bancario") {
    return "Obrigada por comentar. Esse tipo de situacao pede uma analise bem cuidadosa.";
  }

  if (topic === "familia") {
    return "Obrigada por comentar. Esse assunto merece cuidado e discricao.";
  }

  if (topic === "civil") {
    return "Obrigada por comentar. Esse ponto pede uma leitura atenta do contexto.";
  }

  return "Obrigada por comentar. Esse ponto merece uma orientacao cuidadosa.";
}

function buildDmInvite(channel: "instagram" | "facebook", topic: string) {
  const opening = buildTopicAwareAcolhimento(topic);
  return channel === "facebook"
    ? `${opening} Se preferir, me chame no Messenger da pagina para eu te orientar com mais cuidado e discricao.`
    : `${opening} Se quiser, me chama no direct para eu te orientar com mais cuidado e discricao.`;
}

export function evaluateInstagramCommentPolicy(
  input: EvaluateInput
): CommentPolicyResult {
  const normalized = input.commentText.toLowerCase();

  const inappropriate =
    includesAny(normalized, ["spam", "sorteio", "bitcoin", "url", "link na bio"]) ||
    includesAny(normalized, ["odio", "ofensa", "xingamento"]);
  const sensitive =
    includesAny(normalized, ["urgente", "emergencia", "violencia", "amea", "pris", "medida protetiva"]) ||
    includesAny(normalized, ["meu processo", "cpf", "rg", "endereco", "telefone"]) ||
    includesAny(normalized, ["meu filho", "meu ex", "guarda", "pensao"]) ||
    includesAny(normalized, ["quanto custa", "valor", "honorario", "consulta"]);
  const asksForGuidance =
    includesAny(normalized, ["como", "posso", "devo", "preciso", "me ajuda", "me orienta"]) ||
    includesAny(normalized, ["quero saber", "isso cabe", "o que faco", "o que fazer"]);
  const briefSafeQuestion =
    !sensitive &&
    (includesAny(normalized, ["sim", "verdade", "obrigada", "excelente", "boa"]) ||
      normalized.split(/\s+/).length <= 4);

  if (inappropriate) {
    return {
      policyName: "meta_comment_premium_v1",
      decision: "no_auto_reply",
      safetyDecision: "auto_reply_avoided",
      brevityRule: "micro",
      publicReply: null,
      inviteToDm: false,
      shouldAttemptAutoDm: false,
      autoDmSupported: input.autoDmSupported,
      humanReviewRequired: false,
      directTransitionStatus: "not_applicable",
      operatorAction: "nao responder automaticamente e deixar fora do fluxo premium",
      rationale: "comentario inadequado ou sem valor comercial"
    };
  }

  if (sensitive) {
    return {
      policyName: "meta_comment_premium_v1",
      decision: "human_review",
      safetyDecision: "human_review_required",
      brevityRule: "short",
      publicReply: buildDmInvite(input.channel, input.topic),
      inviteToDm: true,
      shouldAttemptAutoDm: false,
      autoDmSupported: input.autoDmSupported,
      humanReviewRequired: true,
      directTransitionStatus: "human_review",
      operatorAction: "revisar humanamente antes de qualquer aprofundamento",
      rationale: "comentario sensivel, ambiguo ou delicado demais para resposta publica completa"
    };
  }

  if (asksForGuidance) {
    return {
      policyName: "meta_comment_premium_v1",
      decision: "public_reply_and_invite_dm",
      safetyDecision: "safe_public_reply_with_dm_invite",
      brevityRule: "short",
      publicReply: buildDmInvite(input.channel, input.topic),
      inviteToDm: true,
      shouldAttemptAutoDm: input.autoDmSupported,
      autoDmSupported: input.autoDmSupported,
      humanReviewRequired: false,
      directTransitionStatus: input.autoDmSupported ? "auto_dm_supported" : "auto_dm_unavailable",
      operatorAction: "conduzir para direct com discricao e continuar a triagem ali",
      rationale: "comentario indica intencao real de orientacao e pede continuidade privada"
    };
  }

  if (briefSafeQuestion) {
    return {
      policyName: "meta_comment_premium_v1",
      decision: "public_reply_only",
      safetyDecision: "safe_public_reply",
      brevityRule: "micro",
      publicReply: buildTopicAwareAcolhimento(input.topic),
      inviteToDm: false,
      shouldAttemptAutoDm: false,
      autoDmSupported: input.autoDmSupported,
      humanReviewRequired: false,
      directTransitionStatus: "not_applicable",
      operatorAction: "manter acolhimento curto em publico",
      rationale: "comentario breve e seguro para acolhimento publico"
    };
  }

  return {
    policyName: "meta_comment_premium_v1",
    decision: "public_reply_and_invite_dm",
    safetyDecision: "safe_public_reply_with_dm_invite",
    brevityRule: "short",
    publicReply: buildDmInvite(input.channel, input.topic),
    inviteToDm: true,
    shouldAttemptAutoDm: input.autoDmSupported,
    autoDmSupported: input.autoDmSupported,
    humanReviewRequired: false,
    directTransitionStatus: input.autoDmSupported ? "auto_dm_supported" : "auto_dm_unavailable",
    operatorAction: "estimular continuidade privada sem expor detalhes no comentario",
    rationale: "comentario social com potencial de conversa, mas sem espaco adequado para aprofundar em publico"
  };
}
