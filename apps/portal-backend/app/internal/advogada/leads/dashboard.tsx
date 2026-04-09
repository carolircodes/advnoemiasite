"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PrioridadesDoDia } from "./prioridades";
import { Lead } from "./types";

// 🚀 EXTENDER TIPO LEAD COM CAMPOS DE CONVERSÃO
interface ExtendedLead extends Lead {
  lead_temperature: 'cold' | 'warm' | 'hot';
  conversion_score: number;
  priority_level: 'low' | 'medium' | 'high' | 'urgent';
  recommended_action: 'continue_triage' | 'schedule_consultation' | 'human_handoff' | 'send_info';
  ready_for_handoff: boolean;
  commercial_moment_detected: boolean;
  // Pipeline comercial
  commercial_status?: 'new_lead' | 'triage_in_progress' | 'qualified' | 'awaiting_human_contact' | 'human_contact_started' | 'consultation_proposed' | 'consultation_scheduled' | 'follow_up_needed' | 'converted' | 'lost';
  handoff_package?: any;
  // Preferências de contato
  preferred_contact_channel?: 'whatsapp' | 'ligacao' | 'consulta_online' | 'email';
  preferred_contact_period?: 'manha' | 'tarde' | 'noite' | 'qualquer_horario';
  preferred_contact_urgency?: 'hoje' | 'esta_semana' | 'proxima_semana' | 'sem_urgencia';
  consultation_intent?: boolean;
  follow_up_needed?: boolean;
  // Follow-up inteligente
  last_follow_up_at?: string;
  follow_up_attempts?: number;
  next_follow_up_at?: string;
  follow_up_status?: 'pending' | 'sent' | 'responded' | 'cancelled';
}

interface Conversation {
  id: string;
  platform_user_id: string;
  username: string | null;
  event_type: "message" | "comment" | "postback";
  user_text: string;
  ai_response: string;
  legal_area: string;
  lead_status: string;
  funnel_stage: string;
  urgency: string;
  created_at: string;
}

// Configurações de pipeline comercial
const commercialStatusConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  new_lead: { label: "Novo Lead", color: "#6B7280", bgColor: "#F9FAFB", icon: "1" },
  triage_in_progress: { label: "Triagem", color: "#3B82F6", bgColor: "#EFF6FF", icon: "2" },
  qualified: { label: "Qualificado", color: "#F59E0B", bgColor: "#FEF3C7", icon: "3" },
  awaiting_human_contact: { label: "Aguardando Contato", color: "#EF4444", bgColor: "#FEE2E2", icon: "4" },
  human_contact_started: { label: "Contato Iniciado", color: "#8B5CF6", bgColor: "#F3E8FF", icon: "5" },
  consultation_proposed: { label: "Consulta Proposta", color: "#10B981", bgColor: "#D1FAE5", icon: "6" },
  consultation_scheduled: { label: "Consulta Agendada", color: "#059669", bgColor: "#D1FAE5", icon: "7" },
  follow_up_needed: { label: "Follow-up", color: "#F97316", bgColor: "#FED7AA", icon: "8" },
  converted: { label: "Convertido", color: "#059669", bgColor: "#D1FAE5", icon: "9" },
  lost: { label: "Perdido", color: "#DC2626", bgColor: "#FEE2E2", icon: "X" }
};

const contactChannelConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  whatsapp: { label: "WhatsApp", color: "#25D366", bgColor: "#D1FAE5", icon: "W" },
  ligacao: { label: "Ligação", color: "#3B82F6", bgColor: "#EFF6FF", icon: "T" },
  consulta_online: { label: "Online", color: "#8B5CF6", bgColor: "#F3E8FF", icon: "V" },
  email: { label: "E-mail", color: "#6B7280", bgColor: "#F9FAFB", icon: "E" }
};

// Configurações de visual
const legalAreaConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  previdenciario: {
    label: "Previdenciário",
    color: "#8B5CF6",
    bgColor: "#F3E8FF",
    icon: "🛡️"
  },
  bancario: {
    label: "Bancário",
    color: "#3B82F6", 
    bgColor: "#EFF6FF",
    icon: "🏦"
  },
  familia: {
    label: "Família",
    color: "#EC4899",
    bgColor: "#FDF2F8", 
    icon: "👨‍👩‍👧‍👦"
  },
  geral: {
    label: "Geral",
    color: "#6B7280",
    bgColor: "#F9FAFB",
    icon: "⚖️"
  }
};


const leadStatusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  frio: { label: "Frio", color: "#9CA3AF", bgColor: "#F9FAFB" },
  curioso: { label: "Curioso", color: "#F59E0B", bgColor: "#FEF3C7" },
  interessado: { label: "Interessado", color: "#3B82F6", bgColor: "#EFF6FF" },
  quente: { label: "Quente", color: "#EF4444", bgColor: "#FEE2E2" },
  pronto_para_agendar: { label: "Pronto para Agendar", color: "#10B981", bgColor: "#D1FAE5" },
  cliente_ativo: { label: "Cliente Ativo", color: "#059669", bgColor: "#D1FAE5" },
  sem_aderencia: { label: "Sem Aderência", color: "#6B7280", bgColor: "#F9FAFB" }
};

const urgencyConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  baixa: { label: "Baixa", color: "#10B981", bgColor: "#D1FAE5" },
  media: { label: "Média", color: "#F59E0B", bgColor: "#FEF3C7" },
  alta: { label: "Alta", color: "#EF4444", bgColor: "#FEE2E2" }
};

// 🚀 CONFIGURAÇÕES DE CONVERSÃO
const temperatureConfig: Record<string, { label: string; color: string; bgColor: string; icon: string }> = {
  cold: { label: "Frio", color: "#6B7280", bgColor: "#F9FAFB", icon: "❄️" },
  warm: { label: "Morno", color: "#F59E0B", bgColor: "#FEF3C7", icon: "🌡️" },
  hot: { label: "Quente", color: "#EF4444", bgColor: "#FEE2E2", icon: "🔥" }
};

const priorityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  low: { label: "Baixa", color: "#10B981", bgColor: "#D1FAE5" },
  medium: { label: "Média", color: "#F59E0B", bgColor: "#FEF3C7" },
  high: { label: "Alta", color: "#F97316", bgColor: "#FED7AA" },
  urgent: { label: "Urgente", color: "#DC2626", bgColor: "#FEE2E2" }
};

const actionConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  continue_triage: { label: "Continuar Triagem", color: "#3B82F6", bgColor: "#EFF6FF" },
  schedule_consultation: { label: "Agendar Consulta", color: "#10B981", bgColor: "#D1FAE5" },
  human_handoff: { label: "Encaminhar Humano", color: "#F59E0B", bgColor: "#FEF3C7" },
  send_info: { label: "Enviar Informações", color: "#6B7280", bgColor: "#F9FAFB" }
};

const funnelStageConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  contato_inicial: { label: "Contato Inicial", color: "#9CA3AF", bgColor: "#F9FAFB" },
  qualificacao: { label: "Qualificação", color: "#F59E0B", bgColor: "#FEF3C7" },
  triagem: { label: "Triagem", color: "#3B82F6", bgColor: "#EFF6FF" },
  interesse: { label: "Interesse", color: "#8B5CF6", bgColor: "#F3E8FF" },
  agendamento: { label: "Agendamento", color: "#EF4444", bgColor: "#FEE2E2" },
  cliente: { label: "Cliente", color: "#059669", bgColor: "#D1FAE5" }
};

// Componentes de UI Premium
function MetricCard({ title, value, subtitle, color, icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon: string;
  trend?: { value: number; label: string };
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold" style={{ color }}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-xs font-medium ${trend.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend.value > 0 ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500 ml-1">{trend.label}</span>
            </div>
          )}
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({ config }: { config: any }) {
  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium"
      style={{ backgroundColor: config.bgColor, color: config.color }}
    >
      {config.label}
    </span>
  );
}

function LeadTableRow({ lead, onSelect }: { lead: ExtendedLead; onSelect: (lead: ExtendedLead) => void }) {
  const areaConfig = legalAreaConfig[lead.legal_area];
  const statusConfig = leadStatusConfig[lead.lead_status];
  const urgencyConfigData = urgencyConfig[lead.urgency];
  const funnelConfig = funnelStageConfig[lead.funnel_stage];
  // 🚀 CONFIGURAÇÕES DE CONVERSÃO
  const temperatureConfigData = temperatureConfig[lead.lead_temperature];
  const priorityConfigData = priorityConfig[lead.priority_level];
  const actionConfigData = actionConfig[lead.recommended_action];

  return (
    <tr 
      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
      onClick={() => onSelect(lead)}
    >
      <td className="px-6 py-4">
        <div className="flex items-center">
          <div className="text-2xl mr-3">{areaConfig.icon}</div>
          <div>
            <div className="font-medium text-gray-900">
              {lead.username || `@${lead.platform_user_id}`}
            </div>
            <div className="text-sm text-gray-500">
              ID: {lead.platform_user_id}
            </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={areaConfig} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={statusConfig} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={funnelConfig} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={urgencyConfigData} />
      </td>
      <td className="px-6 py-4">
        {/* 🚀 TEMPERATURA DO LEAD */}
        <div className="flex items-center space-x-2">
          <span className="text-xl">{temperatureConfigData.icon}</span>
          <StatusBadge config={temperatureConfigData} />
        </div>
      </td>
      <td className="px-6 py-4">
        {/* 🚀 SCORE DE CONVERSÃO */}
        <div className="text-center">
          <div className={`text-lg font-bold ${
            lead.conversion_score >= 70 ? 'text-red-600' : 
            lead.conversion_score >= 45 ? 'text-orange-500' : 
            lead.conversion_score >= 25 ? 'text-yellow-600' : 'text-gray-600'
          }`}>
            {lead.conversion_score}
          </div>
          <div className="text-xs text-gray-500">Score</div>
        </div>
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={priorityConfigData} />
      </td>
      <td className="px-6 py-4">
        <StatusBadge config={actionConfigData} />
      </td>
      <td className="px-6 py-4">
        <div className="max-w-xs">
          <p className="text-sm text-gray-900 truncate">{lead.last_message}</p>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="text-sm text-gray-900">
          {new Date(lead.last_contact_at).toLocaleDateString('pt-BR')}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(lead.last_contact_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{lead.conversation_count}</span>
          {lead.wants_human && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
              🙋 Quer humano
            </span>
          )}
          {lead.should_schedule && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
              📅 Agendar
            </span>
          )}
          {lead.ready_for_handoff && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
              📋 Pronto Handoff
            </span>
          )}
          {lead.commercial_moment_detected && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
              💰 Momento Comercial
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<ExtendedLead[]>([]);
  const [selectedLead, setSelectedLead] = useState<ExtendedLead | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    legal_area: "",
    urgency: "",
    lead_status: "",
    funnel_stage: "",
    // 🚀 FILTROS DE CONVERSÃO
    lead_temperature: "",
    priority_level: "",
    recommended_action: ""
  });

  // Métricas calculadas
  const metrics = {
    total: leads.length,
    quentes: leads.filter(l => l.lead_status === "quente").length,
    prontosParaAgendar: leads.filter(l => l.lead_status === "pronto_para_agendar").length,
    urgentes: leads.filter(l => l.urgency === "alta").length,
    // 🚀 MÉTRICAS DE CONVERSÃO
    leadsQuentes: leads.filter(l => l.lead_temperature === "hot").length,
    leadsMornos: leads.filter(l => l.lead_temperature === "warm").length,
    prontosParaHandoff: leads.filter(l => l.ready_for_handoff).length,
    momentosComerciais: leads.filter(l => l.commercial_moment_detected).length,
    scoreMedio: leads.length > 0 ? Math.round(leads.reduce((sum, l) => sum + l.conversion_score, 0) / leads.length) : 0
  };

  // Leads filtrados
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm || 
      (lead.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lead.platform_user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
       lead.last_message.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesFilters = 
      (!filters.legal_area || lead.legal_area === filters.legal_area) &&
      (!filters.urgency || lead.urgency === filters.urgency) &&
      (!filters.lead_status || lead.lead_status === filters.lead_status) &&
      (!filters.funnel_stage || lead.funnel_stage === filters.funnel_stage) &&
      // 🚀 FILTROS DE CONVERSÃO
      (!filters.lead_temperature || lead.lead_temperature === filters.lead_temperature) &&
      (!filters.priority_level || lead.priority_level === filters.priority_level) &&
      (!filters.recommended_action || lead.recommended_action === filters.recommended_action);

    return matchesSearch && matchesFilters;
  });

  // Carregar dados
  useEffect(() => {
    async function loadData() {
      try {
        // Carregar leads
        const leadsResponse = await fetch('/api/internal/leads');
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          setLeads(leadsData);
        }

        // Carregar conversas se houver lead selecionado
        if (selectedLead) {
          const convResponse = await fetch(`/api/internal/leads/${selectedLead.platform_user_id}/conversations`);
          if (convResponse.ok) {
            const convData = await convResponse.json();
            setConversations(convData);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [selectedLead]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Simples */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads da NoemIA</h1>
              <p className="text-gray-600">Gerencie os leads capturados pelo assistente virtual</p>
            </div>
            <nav className="flex space-x-4">
              <Link href="/internal/advogada" className="text-gray-600 hover:text-gray-900">
                ← Voltar
              </Link>
            </nav>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Prioridades do Dia */}
        <PrioridadesDoDia leads={leads} />

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total de Leads"
            value={metrics.total}
            subtitle="Todas as áreas"
            color="#8B5CF6"
            icon="👥"
          />
          <MetricCard
            title="Leads Quentes"
            value={metrics.quentes}
            subtitle="Alta conversão"
            color="#EF4444"
            icon="🔥"
          />
          <MetricCard
            title="Prontos para Agendar"
            value={metrics.prontosParaAgendar}
            subtitle="Ação imediata"
            color="#10B981"
            icon="📅"
          />
          <MetricCard
            title="Urgentes"
            value={metrics.urgentes}
            subtitle="Atenção prioritária"
            color="#F59E0B"
            icon="⚡"
          />
        </div>

        {/* 🚀 MÉTRICAS DE CONVERSÃO */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">🚀 Métricas de Conversão</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metrics.leadsQuentes}</div>
              <div className="text-sm text-gray-600">🔥 Leads Quentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{metrics.leadsMornos}</div>
              <div className="text-sm text-gray-600">🌡️ Leads Mornos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metrics.prontosParaHandoff}</div>
              <div className="text-sm text-gray-600">📋 Prontos Handoff</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{metrics.momentosComerciais}</div>
              <div className="text-sm text-gray-600">💰 Momentos Comerciais</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metrics.scoreMedio}</div>
              <div className="text-sm text-gray-600">📊 Score Médio</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {leads.length > 0 ? Math.round((metrics.leadsQuentes + metrics.leadsMornos) / leads.length * 100) : 0}%
              </div>
              <div className="text-sm text-gray-600">🎯 Taxa Conversão</div>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-10 gap-4">
            <div className="lg:col-span-2">
              <input
                type="text"
                placeholder="Buscar por nome, ID ou mensagem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={filters.legal_area}
              onChange={(e) => setFilters({...filters, legal_area: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas as Áreas</option>
              {Object.entries(legalAreaConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={filters.urgency}
              onChange={(e) => setFilters({...filters, urgency: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas Urgências</option>
              {Object.entries(urgencyConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={filters.lead_status}
              onChange={(e) => setFilters({...filters, lead_status: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todos Status</option>
              {Object.entries(leadStatusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={filters.funnel_stage}
              onChange={(e) => setFilters({...filters, funnel_stage: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todas Etapas</option>
              {Object.entries(funnelStageConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            {/* 🚀 FILTROS DE CONVERSÃO */}
            <select
              value={filters.lead_temperature}
              onChange={(e) => setFilters({...filters, lead_temperature: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">🚀 Todas Temperaturas</option>
              {Object.entries(temperatureConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.icon} {config.label}</option>
              ))}
            </select>
            <select
              value={filters.priority_level}
              onChange={(e) => setFilters({...filters, priority_level: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">🚀 Todas Prioridades</option>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <select
              value={filters.recommended_action}
              onChange={(e) => setFilters({...filters, recommended_action: e.target.value})}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">🚀 Todas Ações</option>
              {Object.entries(actionConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Tabela de Leads */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Leads ({filteredLeads.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Área
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Funil
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🚀 Temperatura
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🚀 Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🚀 Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    🚀 Ação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Mensagem
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Interações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <LeadTableRow
                    key={lead.id}
                    lead={lead}
                    onSelect={setSelectedLead}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Detalhes do Lead */}
        {selectedLead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Detalhes do Lead
                  </h2>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Informações Principais */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Lead</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Nome/Username:</span>
                        <span className="font-medium">{selectedLead.username || `@${selectedLead.platform_user_id}`}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ID do Usuário:</span>
                        <span className="font-medium">{selectedLead.platform_user_id}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Área Jurídica:</span>
                        <StatusBadge config={legalAreaConfig[selectedLead.legal_area]} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Status:</span>
                        <StatusBadge config={leadStatusConfig[selectedLead.lead_status]} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Funil:</span>
                        <StatusBadge config={funnelStageConfig[selectedLead.funnel_stage]} />
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Urgência:</span>
                        <StatusBadge config={urgencyConfig[selectedLead.urgency]} />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Indicadores</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Quer Atendimento Humano:</span>
                        <span className={`font-medium ${selectedLead.wants_human ? 'text-green-600' : 'text-gray-600'}`}>
                          {selectedLead.wants_human ? 'Sim' : 'Não'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deve Agendar:</span>
                        <span className={`font-medium ${selectedLead.should_schedule ? 'text-green-600' : 'text-gray-600'}`}>
                          {selectedLead.should_schedule ? 'Sim' : 'Não'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total de Interações:</span>
                        <span className="font-medium">{selectedLead.conversation_count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Primeiro Contato:</span>
                        <span className="font-medium">
                          {new Date(selectedLead.first_contact_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Último Contato:</span>
                        <span className="font-medium">
                          {new Date(selectedLead.last_contact_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumo e Ação Sugerida */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Análise da IA</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
                      <p className="text-gray-700 text-sm">{selectedLead.summary}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">Ação Sugerida</h4>
                      <p className="text-blue-700 text-sm">{selectedLead.suggested_action}</p>
                    </div>
                  </div>
                </div>

                {/* Últimas Mensagens */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Últimas Interações</h3>
                  <div className="space-y-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">Última Mensagem do Cliente</h4>
                      <p className="text-gray-700">{selectedLead.last_message}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-medium text-purple-900 mb-2">Última Resposta da IA</h4>
                      <p className="text-purple-700">{selectedLead.last_response}</p>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex flex-wrap gap-4">
                  <a
                    href={`https://wa.me/5511999999999?text=Olá, vim pelo sistema sobre o lead @${selectedLead.username || selectedLead.platform_user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    📱 Abrir WhatsApp
                  </a>
                  <button
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    📅 Agendar Consulta
                  </button>
                  <button
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    👥 Marcar como Cliente
                  </button>
                  <button
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ✏️ Atualizar Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
