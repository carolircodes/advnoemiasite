"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  Eye,
  Flame,
  FolderClock,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  X
} from "lucide-react";

import { AppFrame } from "@/components/app-frame";
import { Badge } from "@/components/ui";
import { PortalSessionBanner } from "@/components/portal-session-banner";
import { SectionCard } from "@/components/section-card";

import { PrioridadesDoDia } from "./prioridades";
import type { AreaConfig, Lead, VisualConfig } from "./types";

const legalAreaConfig: Record<string, AreaConfig> = {
  previdenciario: {
    label: "Previdenciário",
    color: "#8e6a3b",
    bgColor: "#f7edda",
    icon: "Prev"
  },
  bancario: {
    label: "Bancário",
    color: "#295d45",
    bgColor: "#ebf4ef",
    icon: "Banc"
  },
  familia: {
    label: "Família",
    color: "#7b5c31",
    bgColor: "#f8efe1",
    icon: "Fam"
  },
  geral: {
    label: "Geral",
    color: "#465851",
    bgColor: "#eff3f1",
    icon: "Jur"
  }
};

const leadStatusConfig: Record<string, VisualConfig> = {
  frio: { label: "Frio", color: "#5b6a63", bgColor: "#eff3f1" },
  curioso: { label: "Curioso", color: "#8a5d0d", bgColor: "#fff4e3" },
  interessado: { label: "Interessado", color: "#7b5c31", bgColor: "#f8efe1" },
  quente: { label: "Quente", color: "#8e433b", bgColor: "#fff0ee" },
  pronto_para_agendar: {
    label: "Pronto para agendar",
    color: "#295d45",
    bgColor: "#ebf4ef"
  },
  cliente_ativo: { label: "Cliente ativo", color: "#295d45", bgColor: "#ebf4ef" },
  sem_aderencia: { label: "Sem aderência", color: "#5b6a63", bgColor: "#eff3f1" }
};

const urgencyConfig: Record<string, VisualConfig> = {
  baixa: { label: "Baixa", color: "#295d45", bgColor: "#ebf4ef" },
  media: { label: "Média", color: "#8a5d0d", bgColor: "#fff4e3" },
  alta: { label: "Alta", color: "#8e433b", bgColor: "#fff0ee" }
};

const operationalStatusConfig: Record<string, VisualConfig> = {
  new: { label: "Novo", color: "#5b6a63", bgColor: "#eff3f1" },
  viewed: { label: "Em leitura", color: "#7b5c31", bgColor: "#f8efe1" },
  in_progress: { label: "Em atendimento", color: "#8a5d0d", bgColor: "#fff4e3" },
  scheduled: { label: "Consulta agendada", color: "#295d45", bgColor: "#ebf4ef" },
  converted: { label: "Convertido", color: "#295d45", bgColor: "#ebf4ef" },
  closed: { label: "Encerrado", color: "#5b6a63", bgColor: "#eff3f1" }
};

const funnelStageConfig: Record<string, VisualConfig> = {
  contato_inicial: { label: "Contato inicial", color: "#5b6a63", bgColor: "#eff3f1" },
  qualificacao: { label: "Qualificação", color: "#8a5d0d", bgColor: "#fff4e3" },
  triagem: { label: "Triagem", color: "#7b5c31", bgColor: "#f8efe1" },
  interesse: { label: "Interesse", color: "#8e6a3b", bgColor: "#f7edda" },
  agendamento: { label: "Agendamento", color: "#295d45", bgColor: "#ebf4ef" },
  cliente: { label: "Cliente", color: "#295d45", bgColor: "#ebf4ef" }
};

const fallbackAreaConfig: AreaConfig = {
  label: "Não classificado",
  color: "#5b6a63",
  bgColor: "#eff3f1",
  icon: "N/C"
};

const fallbackVisualConfig: VisualConfig = {
  label: "Não classificado",
  color: "#5b6a63",
  bgColor: "#eff3f1"
};

const legalAreaAliases: Record<string, Lead["legal_area"]> = {
  previdenciario: "previdenciario",
  bancario: "bancario",
  familia: "familia",
  geral: "geral",
  civil: "geral"
};

const leadStatusAliases: Record<string, Lead["lead_status"]> = {
  frio: "frio",
  curioso: "curioso",
  interessado: "interessado",
  quente: "quente",
  pronto_para_agendar: "pronto_para_agendar",
  cliente_ativo: "cliente_ativo",
  sem_aderencia: "sem_aderencia",
  new: "curioso"
};

const funnelStageAliases: Record<string, Lead["funnel_stage"]> = {
  contato_inicial: "contato_inicial",
  qualificacao: "qualificacao",
  triagem: "triagem",
  interesse: "interesse",
  agendamento: "agendamento",
  cliente: "cliente",
  top: "contato_inicial",
  middle: "qualificacao",
  bottom: "agendamento"
};

const urgencyAliases: Record<string, Lead["urgency"]> = {
  baixa: "baixa",
  media: "media",
  alta: "alta",
  low: "baixa",
  medium: "media",
  high: "alta"
};

const operationalStatusAliases: Record<string, Lead["operational_status"]> = {
  new: "new",
  viewed: "viewed",
  in_progress: "in_progress",
  scheduled: "scheduled",
  converted: "converted",
  closed: "closed"
};

function normalizeAliasValue<T extends string>(
  value: unknown,
  aliases: Record<string, T>,
  fallback: T
) {
  if (typeof value !== "string") {
    return fallback;
  }

  return aliases[value] || fallback;
}

function normalizeLeadRecord(raw: Partial<Lead> & Record<string, unknown>): Lead {
  const now = new Date().toISOString();

  return {
    id:
      typeof raw.id === "string" && raw.id.trim()
        ? raw.id
        : `lead-${Math.random().toString(36).slice(2)}`,
    platform_user_id:
      typeof raw.platform_user_id === "string" && raw.platform_user_id.trim()
        ? raw.platform_user_id
        : "sem-identificador",
    username: typeof raw.username === "string" && raw.username.trim() ? raw.username : null,
    legal_area: normalizeAliasValue(raw.legal_area, legalAreaAliases, "geral"),
    lead_status: normalizeAliasValue(raw.lead_status, leadStatusAliases, "curioso"),
    funnel_stage: normalizeAliasValue(raw.funnel_stage, funnelStageAliases, "contato_inicial"),
    urgency: normalizeAliasValue(raw.urgency, urgencyAliases, "media"),
    last_message:
      typeof raw.last_message === "string" && raw.last_message.trim()
        ? raw.last_message
        : "Sem última mensagem registrada.",
    last_response:
      typeof raw.last_response === "string" && raw.last_response.trim()
        ? raw.last_response
        : "Sem resposta registrada.",
    wants_human: raw.wants_human === true,
    should_schedule: raw.should_schedule === true,
    summary:
      typeof raw.summary === "string" && raw.summary.trim()
        ? raw.summary
        : "Resumo indisponível para este lead.",
    suggested_action:
      typeof raw.suggested_action === "string" && raw.suggested_action.trim()
        ? raw.suggested_action
        : "Revisar o lead manualmente e definir o próximo passo.",
    first_contact_at:
      typeof raw.first_contact_at === "string" && raw.first_contact_at.trim()
        ? raw.first_contact_at
        : now,
    last_contact_at:
      typeof raw.last_contact_at === "string" && raw.last_contact_at.trim()
        ? raw.last_contact_at
        : now,
    conversation_count:
      typeof raw.conversation_count === "number" && Number.isFinite(raw.conversation_count)
        ? raw.conversation_count
        : 0,
    operational_status: normalizeAliasValue(
      raw.operational_status,
      operationalStatusAliases,
      "new"
    ),
    created_at:
      typeof raw.created_at === "string" && raw.created_at.trim() ? raw.created_at : now,
    updated_at:
      typeof raw.updated_at === "string" && raw.updated_at.trim() ? raw.updated_at : now,
    metadata:
      raw.metadata && typeof raw.metadata === "object" ? (raw.metadata as Record<string, any>) : {}
  };
}

function getAreaConfig(value: string) {
  return legalAreaConfig[value] || fallbackAreaConfig;
}

function getVisualConfig(source: Record<string, VisualConfig>, value: string) {
  return source[value] || fallbackVisualConfig;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function StatusPill({
  config,
  className = ""
}: {
  config: VisualConfig;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
      style={{
        color: config.color,
        backgroundColor: config.bgColor,
        borderColor: `${config.color}22`
      }}
    >
      {config.label}
    </span>
  );
}

function MetricHighlight({
  title,
  value,
  detail,
  icon
}: {
  title: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <article className="premium-surface p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8e6a3b]">
            {title}
          </p>
          <p className="mt-3 font-serif text-4xl font-semibold text-[#13251f]">{value}</p>
          <p className="mt-2 text-sm leading-6 text-[#5b6a63]">{detail}</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(142,106,59,0.12)] bg-[rgba(249,241,226,0.9)] text-[#8e6a3b]">
          {icon}
        </div>
      </div>
    </article>
  );
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    legal_area: "",
    urgency: "",
    lead_status: "",
    funnel_stage: "",
    operational_status: ""
  });

  const metrics = useMemo(
    () => ({
      total: leads.length,
      quentes: leads.filter((lead) => lead.lead_status === "quente").length,
      prontosParaAgendar: leads.filter((lead) => lead.lead_status === "pronto_para_agendar").length,
      urgentes: leads.filter((lead) => lead.urgency === "alta").length,
      novosHoje: leads.filter((lead) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return new Date(lead.created_at) >= today && lead.operational_status === "new";
      }).length,
      emAtendimento: leads.filter((lead) => lead.operational_status === "in_progress").length,
      agendados: leads.filter((lead) => lead.operational_status === "scheduled").length,
      convertidos: leads.filter((lead) => lead.operational_status === "converted").length
    }),
    [leads]
  );

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        !!(
          lead.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.platform_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.last_message.toLowerCase().includes(searchTerm.toLowerCase())
        );

      const matchesFilters =
        (!filters.legal_area || lead.legal_area === filters.legal_area) &&
        (!filters.urgency || lead.urgency === filters.urgency) &&
        (!filters.lead_status || lead.lead_status === filters.lead_status) &&
        (!filters.funnel_stage || lead.funnel_stage === filters.funnel_stage) &&
        (!filters.operational_status || lead.operational_status === filters.operational_status);

      return matchesSearch && matchesFilters;
    });
  }, [filters, leads, searchTerm]);

  async function loadData() {
    try {
      const leadsResponse = await fetch("/api/internal/leads");

      if (leadsResponse.ok) {
        const leadsData = await leadsResponse.json();
        setLeads(Array.isArray(leadsData) ? leadsData.map(normalizeLeadRecord) : []);
      } else {
        setLeads([]);
      }
    } catch (error) {
      console.error("Erro ao carregar leads:", error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  async function updateLeadStatus(leadId: string, newStatus: Lead["operational_status"]) {
    try {
      const response = await fetch("/api/internal/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, operational_status: newStatus })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setLeads((current) =>
        current.map((lead) =>
          lead.id === leadId
            ? { ...lead, operational_status: newStatus, updated_at: new Date().toISOString() }
            : lead
        )
      );

      if (newStatus === "converted" || newStatus === "closed") {
        setSelectedLead(null);
      }
    } catch (error) {
      console.error("Erro ao atualizar lead:", error);
    }
  }

  if (loading) {
    return (
      <AppFrame
        eyebrow="Histórico comercial"
        title="Leitura histórica dos leads em andamento."
        description="Carregando o acervo comercial para apoiar triagem, contexto e retomada."
      >
        <div className="premium-surface flex min-h-[260px] items-center justify-center p-10">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-[rgba(142,106,59,0.22)] border-t-[#8e6a3b]" />
            <p className="text-sm text-[#5b6a63]">Preparando a leitura histórica do comercial.</p>
          </div>
        </div>
      </AppFrame>
    );
  }

  return (
    <AppFrame
      eyebrow="Histórico comercial"
      title="Histórico de leads com leitura executiva e continuidade operacional."
      description="Esta rota permanece como acervo comercial de apoio. O fluxo principal segue concentrado no Painel, na Inbox e no CRM Comercial, enquanto aqui ficam o legado, a classificação e a retomada contextual."
      utilityContent={
        <PortalSessionBanner
          role="advogada"
          fullName="Advogada Noemia"
          email="noemia@advnoemia.com.br"
          workspaceLabel="Histórico comercial"
          workspaceHint="Camada de apoio para leitura histórica, classificação e retomada de contexto."
        />
      }
      navigation={[
        { href: "/internal/advogada", label: "Painel" },
        { href: "/internal/advogada/operacional", label: "CRM Comercial" },
        { href: "/internal/advogada/leads", label: "Histórico de Leads", active: true }
      ]}
      highlights={[
        { label: "Leads no acervo", value: String(metrics.total) },
        { label: "Prioridade alta", value: String(metrics.urgentes) },
        { label: "Prontos para consulta", value: String(metrics.prontosParaAgendar) },
        { label: "Convertidos", value: String(metrics.convertidos) }
      ]}
      actions={[
        { href: "/internal/advogada/operacional", label: "Abrir CRM Comercial" },
        { href: "/internal/advogada#triagens-recebidas", label: "Voltar às triagens", tone: "secondary" }
      ]}
    >
      <SectionCard
        title="Posicionamento desta rota"
        description="O histórico foi reposicionado como camada de apoio premium: menos ruído, mais contexto, melhor hierarquia e ligação direta com os hubs oficiais."
      >
        <div className="dashboard-grid dashboard-grid--three">
          <Link className="route-card" href="/internal/advogada/operacional">
            <span className="shortcut-kicker">Fluxo principal</span>
            <strong>Abrir CRM Comercial</strong>
            <span>
              Continue follow-up, consulta, contato assistido e prioridade comercial no workspace principal.
            </span>
          </Link>
          <Link className="route-card" href="/internal/advogada#triagens-recebidas">
            <span className="shortcut-kicker">Entrada oficial</span>
            <strong>Voltar às triagens recebidas</strong>
            <span>
              Reabra a leitura de origem, urgência e conversão sem separar contexto e próximo passo.
            </span>
          </Link>
          <div className="route-card">
            <span className="shortcut-kicker">Governança</span>
            <strong>Acervo qualificado</strong>
            <span>
              O histórico agora serve para consulta, classificação e retomada, sem competir com a operação do dia.
            </span>
          </div>
        </div>
      </SectionCard>

      <PrioridadesDoDia leads={leads} />

      <div className="dashboard-grid dashboard-grid--four">
        <MetricHighlight
          title="Novos hoje"
          value={metrics.novosHoje}
          detail="Entradas novas que ainda exigem primeira leitura ou qualificação."
          icon={<Sparkles className="h-5 w-5" />}
        />
        <MetricHighlight
          title="Em atendimento"
          value={metrics.emAtendimento}
          detail="Leads já assumidos pelo time comercial ou pela equipe jurídica."
          icon={<Eye className="h-5 w-5" />}
        />
        <MetricHighlight
          title="Consulta pronta"
          value={metrics.prontosParaAgendar}
          detail="Oportunidades maduras para convite, agenda e fechamento."
          icon={<CalendarDays className="h-5 w-5" />}
        />
        <MetricHighlight
          title="Leads quentes"
          value={metrics.quentes}
          detail="Entradas com maior temperatura e potencial de conversão."
          icon={<Flame className="h-5 w-5" />}
        />
      </div>

      <SectionCard
        title="Filtro, leitura e retomada"
        description="Busque por nome, mensagem, urgência, etapa do funil ou status operacional para reduzir a densidade do acervo e focar no que importa."
      >
        <div className="dashboard-grid dashboard-grid--four">
          <label className="dashboard-grid gap-2 md:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
              Busca rápida
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8e6a3b]" />
              <input
                type="text"
                placeholder="Buscar por nome, identificador ou mensagem"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="premium-input pl-11"
              />
            </div>
          </label>

          <label className="dashboard-grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">Área</span>
            <select
              value={filters.legal_area}
              onChange={(event) => setFilters({ ...filters, legal_area: event.target.value })}
              className="premium-select"
            >
              <option value="">Todas</option>
              {Object.entries(legalAreaConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">Urgência</span>
            <select
              value={filters.urgency}
              onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}
              className="premium-select"
            >
              <option value="">Todas</option>
              {Object.entries(urgencyConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">Status do lead</span>
            <select
              value={filters.lead_status}
              onChange={(event) => setFilters({ ...filters, lead_status: event.target.value })}
              className="premium-select"
            >
              <option value="">Todos</option>
              {Object.entries(leadStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">Etapa</span>
            <select
              value={filters.funnel_stage}
              onChange={(event) => setFilters({ ...filters, funnel_stage: event.target.value })}
              className="premium-select"
            >
              <option value="">Todas</option>
              {Object.entries(funnelStageConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>

          <label className="dashboard-grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">Situação operacional</span>
            <select
              value={filters.operational_status}
              onChange={(event) =>
                setFilters({ ...filters, operational_status: event.target.value })
              }
              className="premium-select"
            >
              <option value="">Todas</option>
              {Object.entries(operationalStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title={`Leads disponíveis (${filteredLeads.length})`}
        description="Tabela histórica consolidada com menos ruído visual, melhor leitura de status e acesso rápido ao contexto de cada lead."
      >
        {filteredLeads.length ? (
          <div className="premium-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Área</th>
                    <th>Status</th>
                    <th>Funil</th>
                    <th>Urgência</th>
                    <th>Operação</th>
                    <th>Última mensagem</th>
                    <th>Contato</th>
                    <th>Interações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => {
                    const area = getAreaConfig(lead.legal_area);

                    return (
                      <tr
                        key={lead.id}
                        className="cursor-pointer transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td>
                          <div className="flex min-w-[220px] items-start gap-3">
                            <div
                              className="flex h-11 w-11 items-center justify-center rounded-2xl text-xs font-semibold uppercase tracking-[0.08em]"
                              style={{ backgroundColor: area.bgColor, color: area.color }}
                            >
                              {area.icon}
                            </div>
                            <div>
                              <div className="font-semibold text-[#13251f]">
                                {lead.username || `@${lead.platform_user_id}`}
                              </div>
                              <div className="mt-1 text-sm text-[#5b6a63]">
                                Identificador {lead.platform_user_id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <StatusPill config={area} />
                        </td>
                        <td>
                          <StatusPill config={getVisualConfig(leadStatusConfig, lead.lead_status)} />
                        </td>
                        <td>
                          <StatusPill
                            config={getVisualConfig(funnelStageConfig, lead.funnel_stage)}
                          />
                        </td>
                        <td>
                          <StatusPill config={getVisualConfig(urgencyConfig, lead.urgency)} />
                        </td>
                        <td>
                          <StatusPill
                            config={getVisualConfig(
                              operationalStatusConfig,
                              lead.operational_status
                            )}
                          />
                        </td>
                        <td>
                          <div className="max-w-[280px] text-sm leading-6 text-[#32433d]">
                            {lead.last_message}
                          </div>
                        </td>
                        <td>
                          <div className="text-sm text-[#32433d]">{formatDateTime(lead.last_contact_at)}</div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{lead.conversation_count} interações</Badge>
                            {lead.wants_human ? <Badge variant="warning">Quer humano</Badge> : null}
                            {lead.should_schedule ? (
                              <Badge variant="success">Sinal de agenda</Badge>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="premium-empty">
            Nenhum lead corresponde aos filtros aplicados. Ajuste a busca ou limpe os filtros para
            reabrir o acervo completo.
          </div>
        )}
      </SectionCard>

      {selectedLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(10,16,13,0.55)] p-4 backdrop-blur-[3px]">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-[rgba(142,106,59,0.16)] bg-[rgba(255,252,247,0.98)] shadow-[0_30px_80px_rgba(0,0,0,0.22)]">
            <div className="flex items-start justify-between gap-4 border-b border-[rgba(142,106,59,0.1)] px-6 py-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                  Leitura detalhada do lead
                </p>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-[#13251f]">
                  {selectedLead.username || `@${selectedLead.platform_user_id}`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5b6a63]">
                  A ficha detalhada consolida histórico, sinal comercial e próximos movimentos sem
                  obrigar troca de contexto.
                </p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="rounded-2xl border border-[rgba(142,106,59,0.14)] bg-white/85 p-3 text-[#13251f] transition hover:bg-[#f8f1e4]"
                aria-label="Fechar detalhes do lead"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              <div className="dashboard-grid dashboard-grid--three">
                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Situação atual
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <StatusPill config={getAreaConfig(selectedLead.legal_area)} />
                    <StatusPill
                      config={getVisualConfig(leadStatusConfig, selectedLead.lead_status)}
                    />
                    <StatusPill config={getVisualConfig(urgencyConfig, selectedLead.urgency)} />
                    <StatusPill
                      config={getVisualConfig(
                        operationalStatusConfig,
                        selectedLead.operational_status
                      )}
                    />
                  </div>
                  <div className="mt-4 space-y-2 text-sm leading-6 text-[#32433d]">
                    <div>
                      <strong>Funil:</strong>{" "}
                      {getVisualConfig(funnelStageConfig, selectedLead.funnel_stage).label}
                    </div>
                    <div>
                      <strong>Primeiro contato:</strong> {formatDateTime(selectedLead.first_contact_at)}
                    </div>
                    <div>
                      <strong>Último contato:</strong> {formatDateTime(selectedLead.last_contact_at)}
                    </div>
                  </div>
                </div>

                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Indicadores comerciais
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-[#32433d]">
                    <div className="flex items-center justify-between gap-3">
                      <span>Interações registradas</span>
                      <Badge variant="secondary">{selectedLead.conversation_count}</Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Precisa de contato humano</span>
                      <Badge variant={selectedLead.wants_human ? "warning" : "default"}>
                        {selectedLead.wants_human ? "Sim" : "Não"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span>Pronto para agendamento</span>
                      <Badge variant={selectedLead.should_schedule ? "success" : "default"}>
                        {selectedLead.should_schedule ? "Sim" : "Não"}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Próximo movimento
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#32433d]">
                    {selectedLead.suggested_action}
                  </p>
                  <div className="mt-4 rounded-2xl border border-[rgba(142,106,59,0.12)] bg-[rgba(249,241,226,0.7)] p-4 text-sm leading-6 text-[#5b6a63]">
                    Esta recomendação funciona como leitura de apoio. A decisão final continua sob
                    condução humana.
                  </div>
                </div>
              </div>

              <div className="dashboard-grid dashboard-grid--two">
                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Resumo
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#32433d]">{selectedLead.summary}</p>
                </div>
                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Última resposta registrada
                  </p>
                  <p className="mt-4 text-sm leading-7 text-[#32433d]">{selectedLead.last_response}</p>
                </div>
              </div>

              <div className="premium-surface p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                  Última mensagem do lead
                </p>
                <p className="mt-4 text-sm leading-7 text-[#32433d]">{selectedLead.last_message}</p>
              </div>

              <div className="dashboard-grid dashboard-grid--two">
                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Ações operacionais
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => void updateLeadStatus(selectedLead.id, "viewed")}
                      className="button secondary"
                    >
                      Marcar em leitura
                    </button>
                    <button
                      onClick={() => void updateLeadStatus(selectedLead.id, "in_progress")}
                      className="button secondary"
                    >
                      Iniciar atendimento
                    </button>
                    <button
                      onClick={() => void updateLeadStatus(selectedLead.id, "scheduled")}
                      className="button secondary"
                    >
                      Registrar agenda
                    </button>
                    <button
                      onClick={() => void updateLeadStatus(selectedLead.id, "converted")}
                      className="button"
                    >
                      Converter em cliente
                    </button>
                    <button
                      onClick={() => void updateLeadStatus(selectedLead.id, "closed")}
                      className="button secondary"
                    >
                      Encerrar lead
                    </button>
                  </div>
                </div>

                <div className="premium-surface p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                    Continuidade externa
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <a
                      href={`https://wa.me/5511999999999?text=Olá, vim pelo sistema sobre o lead @${selectedLead.username || selectedLead.platform_user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button secondary"
                    >
                      <PhoneCall className="mr-2 h-4 w-4" />
                      Abrir WhatsApp
                    </a>
                    <Link href="/internal/advogada/operacional" className="button secondary">
                      <ArrowUpRight className="mr-2 h-4 w-4" />
                      Ir para o CRM Comercial
                    </Link>
                  </div>
                  <div className="mt-4 rounded-2xl border border-[rgba(41,93,69,0.14)] bg-[rgba(235,244,239,0.8)] p-4 text-sm leading-6 text-[#295d45]">
                    Use o CRM Comercial para follow-up assistido, proposta de consulta e fechamento.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <SectionCard
        title="Leitura de governança"
        description="Este histórico agora ajuda a responder o que merece retomada, o que já virou cliente e onde ainda existe oportunidade sem direção."
      >
        <div className="dashboard-grid dashboard-grid--three">
          <div className="summary-card">
            <span>Leads urgentes</span>
            <strong>{metrics.urgentes}</strong>
            <p>Precisam de leitura rápida, contato humano ou decisão de prioridade.</p>
            <Badge variant="warning">Atenção imediata</Badge>
          </div>
          <div className="summary-card">
            <span>Conversões já consolidadas</span>
            <strong>{metrics.convertidos}</strong>
            <p>Mostra o quanto do acervo já avançou para cliente e deixou de ser só histórico.</p>
            <Badge variant="success">Valor realizado</Badge>
          </div>
          <div className="summary-card">
            <span>Acervo em observação</span>
            <strong>{Math.max(metrics.total - metrics.convertidos, 0)}</strong>
            <p>Leads que ainda podem pedir classificação, nutrição, agenda ou encerramento formal.</p>
            <Badge variant="secondary">Leitura de apoio</Badge>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Conexão com o fluxo principal"
        description="O histórico não concorre mais com a operação. Ele orienta a retomada e devolve a execução para o módulo certo."
      >
        <div className="dashboard-grid dashboard-grid--three">
          <div className="notice-card">
            <strong>Quando existe intenção comercial</strong>
            <p>Leve o contato para o CRM Comercial e siga com proposta, agenda, pagamento e fechamento.</p>
            <span>CRM Comercial</span>
          </div>
          <div className="notice-card">
            <strong>Quando a origem importa</strong>
            <p>Volte ao Painel para cruzar triagem, origem, urgência e conversão com visão executiva.</p>
            <span>Painel principal</span>
          </div>
          <div className="notice-card">
            <strong>Quando o lead virou cliente</strong>
            <p>A continuidade correta passa para casos, agenda, documentos e acompanhamento jurídico.</p>
            <span>Operação jurídica</span>
          </div>
        </div>
      </SectionCard>
    </AppFrame>
  );
}
