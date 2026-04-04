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
  automationDispatches: "automation_dispatches"
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
