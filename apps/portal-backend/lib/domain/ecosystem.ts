import { z } from "zod";

export const ecosystemVerticals = [
  "core_legal",
  "legal_service",
  "education",
  "premium_material",
  "community",
  "membership",
  "digital_product",
  "certification"
] as const;

export const ecosystemCatalogKinds = [
  "service",
  "plan",
  "material",
  "track",
  "module",
  "community",
  "membership",
  "digital_product"
] as const;

export const ecosystemDeliveryKinds = [
  "legal_service",
  "portal_content",
  "download",
  "community_access",
  "hybrid",
  "future_release"
] as const;

export const ecosystemAccessModels = [
  "single_purchase",
  "subscription",
  "plan_included",
  "complimentary",
  "manual_curated"
] as const;

export const ecosystemAvailabilityStatuses = [
  "foundation",
  "draft",
  "private_beta",
  "published",
  "archived"
] as const;

export const ecosystemBrandScopes = [
  "main_brand",
  "shared_brand",
  "future_subbrand"
] as const;

export const ecosystemBoundaries = [
  "core_legal",
  "adjacent_ecosystem",
  "isolated_future_vertical"
] as const;

export const ecosystemPortalWorkspaces = [
  "legal_client",
  "premium_content",
  "plans_benefits",
  "community",
  "ecosystem_hub"
] as const;

export const subscriptionStatuses = [
  "interest",
  "incomplete",
  "trialing",
  "active",
  "past_due",
  "paused",
  "canceled",
  "expired"
] as const;

export const subscriptionCadences = [
  "one_time",
  "monthly",
  "quarterly",
  "semiannual",
  "annual",
  "custom"
] as const;

export const accessGrantStatuses = [
  "scheduled",
  "active",
  "paused",
  "expired",
  "revoked"
] as const;

export const communityMemberStatuses = [
  "invited",
  "active",
  "paused",
  "left",
  "removed"
] as const;

export const contentProgressStatuses = [
  "not_started",
  "in_progress",
  "completed"
] as const;

export const ecosystemEventKeys = [
  "product_viewed",
  "product_selected",
  "plan_viewed",
  "access_granted",
  "access_revoked",
  "access_restored",
  "subscription_interest",
  "subscription_started",
  "subscription_authorized",
  "subscription_active",
  "subscription_renewed",
  "subscription_paused",
  "subscription_canceled",
  "founding_live_activated",
  "community_access_granted",
  "content_unlocked",
  "content_started",
  "content_completed",
  "member_joined",
  "member_active",
  "member_retained",
  "community_viewed",
  "retention_signal",
  "content_continuity_signal",
  "onboarding_completed",
  "churn_risk",
  "expansion_revenue_signal",
  "recurring_revenue_signal"
] as const;

export type EcosystemVertical = (typeof ecosystemVerticals)[number];
export type EcosystemCatalogKind = (typeof ecosystemCatalogKinds)[number];
export type EcosystemDeliveryKind = (typeof ecosystemDeliveryKinds)[number];
export type EcosystemAccessModel = (typeof ecosystemAccessModels)[number];
export type EcosystemAvailabilityStatus = (typeof ecosystemAvailabilityStatuses)[number];
export type EcosystemBrandScope = (typeof ecosystemBrandScopes)[number];
export type EcosystemBoundary = (typeof ecosystemBoundaries)[number];
export type EcosystemPortalWorkspace = (typeof ecosystemPortalWorkspaces)[number];
export type SubscriptionStatus = (typeof subscriptionStatuses)[number];
export type SubscriptionCadence = (typeof subscriptionCadences)[number];
export type AccessGrantStatus = (typeof accessGrantStatuses)[number];
export type CommunityMemberStatus = (typeof communityMemberStatuses)[number];
export type ContentProgressStatus = (typeof contentProgressStatuses)[number];
export type EcosystemEventKey = (typeof ecosystemEventKeys)[number];

export const ecosystemVerticalLabels: Record<EcosystemVertical, string> = {
  core_legal: "Core juridico protegido",
  legal_service: "Servico juridico monetizado",
  education: "Educacional premium",
  premium_material: "Materiais premium",
  community: "Comunidade premium",
  membership: "Recorrencia e membership",
  digital_product: "Produto digital",
  certification: "Trilhas e certificacao"
};

export const ecosystemCatalogKindLabels: Record<EcosystemCatalogKind, string> = {
  service: "Servico",
  plan: "Plano",
  material: "Material",
  track: "Trilha",
  module: "Modulo",
  community: "Comunidade",
  membership: "Membership",
  digital_product: "Produto digital"
};

export const ecosystemDeliveryKindLabels: Record<EcosystemDeliveryKind, string> = {
  legal_service: "Entrega juridica",
  portal_content: "Conteudo no portal",
  download: "Material para download",
  community_access: "Acesso de comunidade",
  hybrid: "Entrega hibrida",
  future_release: "Fundacao futura"
};

export const ecosystemAccessModelLabels: Record<EcosystemAccessModel, string> = {
  single_purchase: "Compra unica",
  subscription: "Recorrencia",
  plan_included: "Incluso no plano",
  complimentary: "Cortesia ou bonus",
  manual_curated: "Curadoria manual"
};

export const ecosystemAvailabilityStatusLabels: Record<EcosystemAvailabilityStatus, string> = {
  foundation: "Fundacao",
  draft: "Rascunho",
  private_beta: "Beta privado",
  published: "Publicado",
  archived: "Arquivado"
};

export const ecosystemBoundaryLabels: Record<EcosystemBoundary, string> = {
  core_legal: "Core juridico",
  adjacent_ecosystem: "Ecossistema adjacente",
  isolated_future_vertical: "Vertical futura isolada"
};

export const ecosystemPortalWorkspaceLabels: Record<EcosystemPortalWorkspace, string> = {
  legal_client: "Area juridica do cliente",
  premium_content: "Conteudo premium",
  plans_benefits: "Planos e beneficios",
  community: "Comunidade",
  ecosystem_hub: "Hub do ecossistema"
};

export const subscriptionStatusLabels: Record<SubscriptionStatus, string> = {
  interest: "Interesse",
  incomplete: "Incompleta",
  trialing: "Trial",
  active: "Ativa",
  past_due: "Em atraso",
  paused: "Pausada",
  canceled: "Cancelada",
  expired: "Expirada"
};

export const subscriptionCadenceLabels: Record<SubscriptionCadence, string> = {
  one_time: "Compra unica",
  monthly: "Mensal",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  custom: "Customizada"
};

export const accessGrantStatusLabels: Record<AccessGrantStatus, string> = {
  scheduled: "Programado",
  active: "Ativo",
  paused: "Pausado",
  expired: "Expirado",
  revoked: "Revogado"
};

export const communityMemberStatusLabels: Record<CommunityMemberStatus, string> = {
  invited: "Convidado",
  active: "Ativo",
  paused: "Pausado",
  left: "Saiu",
  removed: "Removido"
};

export const contentProgressStatusLabels: Record<ContentProgressStatus, string> = {
  not_started: "Nao iniciado",
  in_progress: "Em progresso",
  completed: "Concluido"
};

export const ecosystemCatalogItemSchema = z.object({
  slug: z.string().trim().min(3).max(120),
  title: z.string().trim().min(3).max(160),
  subtitle: z.string().trim().max(200).optional().default(""),
  description: z.string().trim().max(2000).optional().default(""),
  vertical: z.enum(ecosystemVerticals),
  catalogKind: z.enum(ecosystemCatalogKinds),
  deliveryKind: z.enum(ecosystemDeliveryKinds),
  accessModel: z.enum(ecosystemAccessModels),
  availabilityStatus: z.enum(ecosystemAvailabilityStatuses).default("foundation"),
  portalWorkspace: z.enum(ecosystemPortalWorkspaces).default("ecosystem_hub"),
  legalBoundary: z.enum(ecosystemBoundaries).default("adjacent_ecosystem"),
  priceAmount: z.coerce.number().min(0).optional(),
  currencyCode: z.string().trim().length(3).default("BRL")
});

export const ecosystemPlanTierSchema = z.object({
  code: z.string().trim().min(2).max(80),
  name: z.string().trim().min(2).max(120),
  headline: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).optional().default(""),
  cadence: z.enum(subscriptionCadences).default("monthly"),
  status: z.enum(ecosystemAvailabilityStatuses).default("foundation"),
  portalWorkspace: z.enum(ecosystemPortalWorkspaces).default("plans_benefits"),
  priceAmount: z.coerce.number().min(0).optional()
});

export const ecosystemArchitectureBlueprint = [
  {
    key: "core_legal_operation",
    title: "Operacao juridica principal",
    boundary: "core_legal" as const,
    workspace: "legal_client" as const,
    entersNow: true,
    isolateStructurally: true,
    summary:
      "Atendimento, caso, consulta, documentos, agenda, pagamento principal e command center seguem como espinha dorsal protegida."
  },
  {
    key: "transactional_monetization",
    title: "Monetizacao transacional",
    boundary: "core_legal" as const,
    workspace: "legal_client" as const,
    entersNow: true,
    isolateStructurally: false,
    summary:
      "Consulta, analise e continuidade monetizada permanecem no dominio juridico, mas ficam semanticamente separadas da recorrencia premium."
  },
  {
    key: "premium_catalog",
    title: "Catalogo premium do ecossistema",
    boundary: "adjacent_ecosystem" as const,
    workspace: "ecosystem_hub" as const,
    entersNow: true,
    isolateStructurally: true,
    summary:
      "Camada mestra para produtos, materiais, trilhas, comunidades, planos e ofertas sem improvisar em cima da tabela de consulta."
  },
  {
    key: "plans_and_recurrence",
    title: "Planos, beneficios e recorrencia",
    boundary: "adjacent_ecosystem" as const,
    workspace: "plans_benefits" as const,
    entersNow: true,
    isolateStructurally: true,
    summary:
      "Arquitetura para membership e acesso continuo sem ligar cobranca recorrente de forma prematura."
  },
  {
    key: "premium_content",
    title: "Conteudo premium e educacional",
    boundary: "adjacent_ecosystem" as const,
    workspace: "premium_content" as const,
    entersNow: true,
    isolateStructurally: true,
    summary:
      "Base para trilhas, modulos, unidades, materiais de apoio, progresso e certificacao futura."
  },
  {
    key: "premium_community",
    title: "Comunidade premium",
    boundary: "adjacent_ecosystem" as const,
    workspace: "community" as const,
    entersNow: true,
    isolateStructurally: true,
    summary:
      "Estrutura de entrada, permanencia, saida e acesso comunitario vinculada a plano, conteudo e continuidade."
  },
  {
    key: "future_verticals",
    title: "Verticais futuras coerentes",
    boundary: "isolated_future_vertical" as const,
    workspace: "ecosystem_hub" as const,
    entersNow: false,
    isolateStructurally: true,
    summary:
      "Subprodutos e submarcas so entram depois, aproveitando a mesma fundacao sem contaminar a operacao principal."
  }
] as const;
