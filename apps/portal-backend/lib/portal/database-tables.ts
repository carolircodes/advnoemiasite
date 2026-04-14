/**
 * Referência às tabelas `public.*` usadas pelo portal (alinhadas às migrations em `supabase/migrations`).
 * Tipos são um espelho parcial para serviços e futuros geradores; o contrato definitivo é o SQL.
 */

export const PortalTable = {
  profiles: "profiles",
  staffMembers: "staff_members",
  clients: "clients",
  cases: "cases",
  documents: "documents",
  documentRequests: "document_requests",
  appointments: "appointments",
  appointmentHistory: "appointment_history",
  caseEvents: "case_events",
  notificationsOutbox: "notifications_outbox",
  auditLogs: "audit_logs",
  intakeRequests: "intake_requests",
  productEvents: "product_events",
  automationDispatches: "automation_dispatches",
  ecosystemCatalogItems: "ecosystem_catalog_items",
  ecosystemPlanTiers: "ecosystem_plan_tiers",
  ecosystemPlanBenefits: "ecosystem_plan_benefits",
  ecosystemSubscriptions: "ecosystem_subscriptions",
  ecosystemAccessGrants: "ecosystem_access_grants",
  ecosystemContentTracks: "ecosystem_content_tracks",
  ecosystemContentModules: "ecosystem_content_modules",
  ecosystemContentUnits: "ecosystem_content_units",
  ecosystemContentAssets: "ecosystem_content_assets",
  ecosystemContentProgress: "ecosystem_content_progress",
  ecosystemCommunities: "ecosystem_communities",
  ecosystemCommunityMemberships: "ecosystem_community_memberships"
} as const;

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: "admin" | "advogada" | "cliente";
  is_active: boolean;
  invited_at: string | null;
  first_login_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientRow = {
  id: string;
  profile_id: string;
  cpf: string;
  phone: string;
  notes: string | null;
  status: string;
  created_by: string | null;
  source_intake_request_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type CaseRow = {
  id: string;
  client_id: string;
  area: string;
  title: string;
  summary: string | null;
  status: string;
  priority: string;
  assigned_staff_id: string | null;
  last_public_update_at: string | null;
  last_status_changed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  case_id: string;
  file_name: string;
  storage_path: string;
  category: string;
  visibility: "client" | "internal";
  uploaded_by: string | null;
  created_at: string;
};

export type AppointmentRow = {
  id: string;
  case_id: string;
  client_id: string;
  starts_at: string;
  ends_at: string | null;
  mode: string;
  location: string | null;
  notes: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EcosystemCatalogItemRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  vertical: string;
  catalog_kind: string;
  delivery_kind: string;
  access_model: string;
  availability_status: string;
  brand_scope: string;
  legal_boundary: string;
  portal_workspace: string;
  visibility_scope: string;
  price_amount: number | null;
  currency_code: string;
  checkout_offer_code: string | null;
  metadata: Record<string, unknown>;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EcosystemPlanTierRow = {
  id: string;
  code: string;
  name: string;
  headline: string;
  description: string | null;
  cadence: string;
  status: string;
  portal_workspace: string;
  price_amount: number | null;
  currency_code: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EcosystemSubscriptionRow = {
  id: string;
  profile_id: string;
  plan_tier_id: string;
  origin_catalog_item_id: string | null;
  status: string;
  cadence: string;
  renewal_mode: string;
  current_period_started_at: string | null;
  current_period_ends_at: string | null;
  trial_ends_at: string | null;
  cancel_at: string | null;
  canceled_at: string | null;
  paused_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
