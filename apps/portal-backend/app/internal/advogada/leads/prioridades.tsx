"use client";

import { AlertTriangle, CalendarClock, Flame } from "lucide-react";

import { Badge } from "@/components/ui";
import { SectionCard } from "@/components/section-card";

import { Lead, PrioridadesProps } from "./types.ts";

function isValidLeadStatus(status: string): status is Lead["lead_status"] {
  return [
    "frio",
    "curioso",
    "interessado",
    "quente",
    "pronto_para_agendar",
    "cliente_ativo",
    "sem_aderencia"
  ].includes(status);
}

function isValidUrgency(urgency: string): urgency is Lead["urgency"] {
  return ["baixa", "media", "alta"].includes(urgency);
}

function isUrgentLead(lead: Lead): boolean {
  return (
    isValidUrgency(lead.urgency) &&
    lead.urgency === "alta" &&
    isValidLeadStatus(lead.lead_status) &&
    lead.lead_status !== "cliente_ativo"
  );
}

function isHotLead(lead: Lead): boolean {
  return lead.lead_status === "quente" && lead.wants_human === true;
}

function isReadyToSchedule(lead: Lead): boolean {
  return lead.lead_status === "pronto_para_agendar" && lead.urgency !== "alta";
}

function PriorityColumn({
  title,
  description,
  leads,
  tone,
  icon
}: {
  title: string;
  description: string;
  leads: Lead[];
  tone: "danger" | "warning" | "success";
  icon: React.ReactNode;
}) {
  const badgeVariant = tone === "danger" ? "danger" : tone === "warning" ? "warning" : "success";

  return (
    <article className="premium-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
            {title}
          </p>
          <p className="mt-3 text-sm leading-6 text-[#5b6a63]">{description}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(142,106,59,0.12)] bg-[rgba(249,241,226,0.9)] text-[#8e6a3b]">
          {icon}
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {leads.length ? (
          leads.slice(0, 3).map((lead) => (
            <div
              key={lead.id}
              className="rounded-[22px] border border-[rgba(142,106,59,0.12)] bg-[rgba(255,255,255,0.88)] p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#13251f]">
                    {lead.username || `@${lead.platform_user_id}`}
                  </div>
                  <div className="mt-1 text-sm leading-6 text-[#5b6a63]">{lead.last_message}</div>
                  <div className="mt-2 text-xs text-[#7a817d]">
                    Último contato em{" "}
                    {new Date(lead.last_contact_at).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short"
                    })}
                  </div>
                </div>
                <Badge variant={badgeVariant}>{lead.conversation_count} interações</Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="premium-empty !p-5">
            Nenhum lead aparece nesta camada de prioridade no momento.
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[rgba(142,106,59,0.1)] pt-4">
        <Badge variant={badgeVariant}>
          {leads.length} lead{leads.length === 1 ? "" : "s"} em foco
        </Badge>
        <span className="text-sm font-medium text-[#7b5c31]">Leitura prioritária</span>
      </div>
    </article>
  );
}

export function PrioridadesDoDia({ leads }: PrioridadesProps) {
  const urgentes = leads.filter(isUrgentLead);
  const quentesSemHumano = leads.filter(
    (lead) => isHotLead(lead) && lead.lead_status !== "cliente_ativo"
  );
  const prontosParaAgendar = leads.filter(isReadyToSchedule);

  return (
    <SectionCard
      title="Prioridades do dia"
      description="Três grupos resumem onde a equipe deve concentrar leitura, contato humano e avanço comercial sem poluir o restante do histórico."
    >
      <div className="dashboard-grid dashboard-grid--three">
        <PriorityColumn
          title="Urgências abertas"
          description="Leads com risco de perder timing se não houver ação rápida."
          leads={urgentes}
          tone="danger"
          icon={<AlertTriangle className="h-5 w-5" />}
        />
        <PriorityColumn
          title="Quentes com pedido humano"
          description="Entradas engajadas que já deram sinal claro de conversa assistida."
          leads={quentesSemHumano}
          tone="warning"
          icon={<Flame className="h-5 w-5" />}
        />
        <PriorityColumn
          title="Prontos para agenda"
          description="Leads com maturidade suficiente para avançar para consulta."
          leads={prontosParaAgendar}
          tone="success"
          icon={<CalendarClock className="h-5 w-5" />}
        />
      </div>
    </SectionCard>
  );
}
