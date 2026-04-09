'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Calendar,
  Camera,
  CheckCircle,
  Clock,
  Filter,
  Globe,
  MessageCircle,
  MessageSquare,
  Send,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

interface OperationalContact {
  clientId: string;
  fullName: string;
  phone?: string;
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  areaInterest?: string;
  sourceChannel: string;
  followUpStatus?: string;
  nextFollowUpAt?: string;
  lastContactAt: string;
  latestSessionSummary?: string;
  latestMessagePreview?: string;
  channels: Array<{
    channel: string;
    externalUserId: string;
    lastContactAt: string;
  }>;
  followUpCount: number;
  priorityScore: number;
  priorityLabel: 'high' | 'medium' | 'low';
  daysSinceLastContact: number;
  isOverdue: boolean;
  suggestedMessage?: {
    messageType: string;
    content: string;
    channel: string;
  };
}

interface OperationalMetrics {
  totalLeads: number;
  warmHotLeads: number;
  followUpPending: number;
  consultationOffered: number;
  consultationScheduled: number;
  proposalSent: number;
  contractPending: number;
  totalClients: number;
  inactiveLost: number;
  todayOverdue: number;
  overdueCount: number;
  topPriorities: number;
}

type FilterState = {
  stage: string;
  leadTemperature: string;
  areaInterest: string;
  sourceChannel: string;
  priorityLabel: string;
  followUpStatus: string;
  isClient: string;
  search: string;
};

const initialFilters: FilterState = {
  stage: '',
  leadTemperature: '',
  areaInterest: '',
  sourceChannel: '',
  priorityLabel: '',
  followUpStatus: '',
  isClient: '',
  search: '',
};

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function PanelSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-[#d8d2c4] bg-white shadow-[0_10px_30px_rgba(16,38,29,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[#ece5d8] bg-[#f8f4ec] px-6 py-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#10261d]">{title}</h2>
          {description ? <p className="mt-1 text-sm text-[#5f6f68]">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'orange' | 'yellow' | 'red';
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-[#10261d]',
    orange: 'text-[#a45f12]',
    yellow: 'text-[#9a6a00]',
    red: 'text-[#9f1d1d]',
  };

  return (
    <div className="rounded-2xl border border-[#e7e1d4] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#6a7a73]">{label}</p>
          <p className={cx('mt-1 text-2xl font-bold', toneClasses[tone])}>{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5efe2] text-[#10261d]">
          {icon}
        </div>
      </div>
    </div>
  );
}

function StatusChip({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'gold';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-[#d8d2c4] bg-[#f7f3eb] text-[#3f5149]',
    blue: 'border-[#cfe0fb] bg-[#edf4ff] text-[#1d4f91]',
    green: 'border-[#cfe7d7] bg-[#edf8f0] text-[#24613a]',
    orange: 'border-[#f1dcc0] bg-[#fff4e6] text-[#9a5d09]',
    red: 'border-[#f0caca] bg-[#fff1f1] text-[#9f1d1d]',
    purple: 'border-[#ddd0f7] bg-[#f5efff] text-[#5d3aa8]',
    gray: 'border-[#d9d9d9] bg-[#f4f4f4] text-[#525252]',
    gold: 'border-[#e4d3a5] bg-[#fbf5df] text-[#87621c]',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  variant = 'outline',
  disabled = false,
  type = 'button',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const variants: Record<string, string> = {
    primary:
      'border-[#10261d] bg-[#10261d] text-white hover:bg-[#17392c] hover:border-[#17392c]',
    outline:
      'border-[#d3c7aa] bg-white text-[#10261d] hover:bg-[#f8f4ec] hover:border-[#bda973]',
    ghost: 'border-transparent bg-transparent text-[#10261d] hover:bg-[#f5efe2]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant]
      )}
    >
      {children}
    </button>
  );
}

export default function OperationalPanel() {
  const [contacts, setContacts] = useState<OperationalContact[]>([]);
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [selectedContact, setSelectedContact] = useState<OperationalContact | null>(null);
  const [showSuggestedMessage, setShowSuggestedMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    void loadPanelData();
  }, [filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== '').length,
    [filters]
  );

  async function loadPanelData() {
    setLoading(true);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getPanelData',
          filters: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')),
          limit: 100,
        }),
      });

      const result = await response.json();

      if (result?.success) {
        setContacts(Array.isArray(result.data?.contacts) ? result.data.contacts : []);
        setMetrics(result.data?.metrics ?? null);
      } else {
        setContacts([]);
        setMetrics(null);
      }
    } catch (error) {
      console.error('Error loading panel data:', error);
      setContacts([]);
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }

  async function applyOperationalAction(
    contact: OperationalContact,
    actionType: string,
    value?: string,
    notes?: string
  ) {
    setActionLoading(`${contact.clientId}:${actionType}`);

    try {
      const contactResponse = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getContacts',
          filters: { search: contact.clientId },
          limit: 1,
        }),
      });

      const contactResult = await contactResponse.json();

      if (contactResult?.success && contactResult.data?.contacts?.length > 0) {
        const fullContact = contactResult.data.contacts[0];
        const pipelineId = fullContact.pipelineId || contact.clientId;

        const response = await fetch('/api/internal/operational', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'applyAction',
            clientId: contact.clientId,
            pipelineId,
            actionType,
            value,
            notes,
          }),
        });

        const result = await response.json();

        if (result?.success) {
          await loadPanelData();
        }
      }
    } catch (error) {
      console.error('Error applying action:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function generateSuggestedMessage(contact: OperationalContact) {
    setActionLoading(`${contact.clientId}:generateSuggestedMessage`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateSuggestedMessage',
          clientId: contact.clientId,
          pipelineId: contact.clientId,
        }),
      });

      const result = await response.json();

      if (result?.success) {
        setSelectedContact({
          ...contact,
          suggestedMessage: result.data?.suggestedMessage,
        });
        setShowSuggestedMessage(true);
      }
    } catch (error) {
      console.error('Error generating suggested message:', error);
    } finally {
      setActionLoading(null);
    }
  }

  function getPriorityTone(priority: string): 'red' | 'orange' | 'gray' {
    switch (priority) {
      case 'high':
        return 'red';
      case 'medium':
        return 'orange';
      default:
        return 'gray';
    }
  }

  function getStageTone(stage: string): 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gold' | 'gray' {
    const tones: Record<string, 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gold' | 'gray'> = {
      new_lead: 'blue',
      engaged: 'green',
      warm_lead: 'orange',
      hot_lead: 'red',
      consultation_offered: 'purple',
      consultation_scheduled: 'blue',
      proposal_sent: 'purple',
      contract_pending: 'gold',
      closed_lost: 'gray',
      inactive: 'gray',
      client: 'green',
    };

    return tones[stage] ?? 'gray';
  }

  function getTemperatureTone(temp: string): 'red' | 'orange' | 'blue' | 'gray' {
    switch (temp) {
      case 'hot':
        return 'red';
      case 'warm':
        return 'orange';
      case 'cold':
        return 'blue';
      default:
        return 'gray';
    }
  }

  function getChannelIcon(channel: string) {
    switch (channel) {
      case 'whatsapp':
        return <MessageCircle className="h-4 w-4" />;
      case 'instagram':
        return <Camera className="h-4 w-4" />;
      case 'site':
        return <Globe className="h-4 w-4" />;
      case 'portal':
        return <Users className="h-4 w-4" />;
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return 'Data indisponível';
    }

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatStageLabel(stage: string) {
    return stage.replaceAll('_', ' ');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <PanelSection title="Painel operacional" description="Carregando dados do acompanhamento comercial.">
          <div className="flex items-center gap-3 text-[#10261d]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#b58d49] border-t-transparent" />
            <span className="text-sm font-medium">Carregando painel operacional...</span>
          </div>
        </PanelSection>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-[#10261d]">
      <div className="flex flex-col gap-4 rounded-3xl border border-[#d8d2c4] bg-[linear-gradient(135deg,#f8f4ec_0%,#ffffff_100%)] p-6 shadow-[0_18px_45px_rgba(16,38,29,0.08)] md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8f7746]">
            Operação comercial
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#10261d]">
            Painel operacional
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5f6f68]">
            Gestão de leads, prioridades, follow-ups e avanço comercial em um só lugar.
          </p>
        </div>

        <ActionButton onClick={() => void loadPanelData()} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Atualizar
        </ActionButton>
      </div>

      {metrics ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de leads" value={metrics.totalLeads} icon={<Users className="h-6 w-6" />} />
          <MetricCard
            label="Leads quentes"
            value={metrics.warmHotLeads}
            icon={<TrendingUp className="h-6 w-6" />}
            tone="orange"
          />
          <MetricCard
            label="Follow-up pendente"
            value={metrics.followUpPending}
            icon={<Clock className="h-6 w-6" />}
            tone="yellow"
          />
          <MetricCard
            label="Prioridades altas"
            value={metrics.topPriorities}
            icon={<Target className="h-6 w-6" />}
            tone="red"
          />
        </div>
      ) : null}

      <PanelSection
        title="Filtros"
        description="Refine a visualização dos contatos operacionais."
        action={
          activeFilterCount > 0 ? (
            <ActionButton onClick={() => setFilters(initialFilters)} variant="ghost">
              Limpar filtros
            </ActionButton>
          ) : null
        }
      >
        <div className="mb-4 flex items-center gap-2 text-sm text-[#6a7a73]">
          <Filter className="h-4 w-4" />
          <span>{activeFilterCount} filtro(s) ativo(s)</span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Busca</span>
            <input
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              placeholder="Buscar nome ou telefone..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Estágio</span>
            <select
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              value={filters.stage}
              onChange={(e) => setFilters((prev) => ({ ...prev, stage: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="new_lead">Novo lead</option>
              <option value="engaged">Engajado</option>
              <option value="warm_lead">Lead morno</option>
              <option value="hot_lead">Lead quente</option>
              <option value="consultation_offered">Consulta oferecida</option>
              <option value="consultation_scheduled">Consulta agendada</option>
              <option value="proposal_sent">Proposta enviada</option>
              <option value="contract_pending">Contrato pendente</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Temperatura</span>
            <select
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              value={filters.leadTemperature}
              onChange={(e) => setFilters((prev) => ({ ...prev, leadTemperature: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="cold">Frio</option>
              <option value="warm">Morno</option>
              <option value="hot">Quente</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Prioridade</span>
            <select
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              value={filters.priorityLabel}
              onChange={(e) => setFilters((prev) => ({ ...prev, priorityLabel: e.target.value }))}
            >
              <option value="">Todas</option>
              <option value="high">Alta</option>
              <option value="medium">Média</option>
              <option value="low">Baixa</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Canal</span>
            <select
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              value={filters.sourceChannel}
              onChange={(e) => setFilters((prev) => ({ ...prev, sourceChannel: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="instagram">Instagram</option>
              <option value="site">Site</option>
              <option value="portal">Portal</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-[#6b614c]">Tipo</span>
            <select
              className="w-full rounded-xl border border-[#d8d2c4] bg-white px-3 py-2 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8]"
              value={filters.isClient}
              onChange={(e) => setFilters((prev) => ({ ...prev, isClient: e.target.value }))}
            >
              <option value="">Todos</option>
              <option value="false">Leads</option>
              <option value="true">Clientes</option>
            </select>
          </label>
        </div>
      </PanelSection>

      <PanelSection
        title={`Contatos operacionais (${contacts.length})`}
        description="Acompanhe prioridades, histórico recente e ações de avanço."
      >
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d8d2c4] bg-[#fbfaf7] px-6 py-10 text-center">
            <p className="text-sm text-[#6a7a73]">Nenhum contato encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contacts.map((contact) => (
              <div
                key={contact.clientId}
                className="rounded-2xl border border-[#e7e1d4] bg-white p-5 shadow-sm transition hover:shadow-[0_10px_24px_rgba(16,38,29,0.07)]"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-[#10261d]">{contact.fullName}</h3>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-[#66766f]">
                        {contact.phone ? <span>{contact.phone}</span> : null}
                        <span>•</span>
                        <span>{formatDate(contact.lastContactAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <StatusChip tone={getPriorityTone(contact.priorityLabel)}>
                        {contact.priorityLabel === 'high'
                          ? 'Prioridade alta'
                          : contact.priorityLabel === 'medium'
                            ? 'Prioridade média'
                            : 'Prioridade baixa'}
                      </StatusChip>

                      {contact.isClient ? <StatusChip tone="green">Cliente</StatusChip> : null}

                      {contact.isOverdue ? <StatusChip tone="red">Vencido</StatusChip> : null}

                      <StatusChip tone={getStageTone(contact.pipelineStage)}>
                        {formatStageLabel(contact.pipelineStage)}
                      </StatusChip>

                      <StatusChip tone={getTemperatureTone(contact.leadTemperature)}>
                        {contact.leadTemperature === 'hot'
                          ? 'Quente'
                          : contact.leadTemperature === 'warm'
                            ? 'Morno'
                            : 'Frio'}
                      </StatusChip>

                      <StatusChip tone="neutral">
                        {getChannelIcon(contact.sourceChannel)}
                        <span className="ml-1">{contact.sourceChannel}</span>
                      </StatusChip>

                      {contact.areaInterest ? (
                        <StatusChip tone="gold">{contact.areaInterest}</StatusChip>
                      ) : null}

                      {contact.followUpCount > 0 ? (
                        <StatusChip tone="neutral">{contact.followUpCount} follow-up(s)</StatusChip>
                      ) : null}
                    </div>
                  </div>
                </div>

                {contact.latestMessagePreview ? (
                  <div className="mt-4 rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                    <p className="text-sm italic text-[#4b5d55]">"{contact.latestMessagePreview}"</p>
                  </div>
                ) : null}

                {contact.latestSessionSummary ? (
                  <div className="mt-3 text-sm text-[#62726b]">
                    <span className="font-medium text-[#10261d]">Resumo:</span> {contact.latestSessionSummary}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-[#677770]">
                  <span className="font-medium text-[#10261d]">Canais:</span>
                  {contact.channels.map((channel, index) => (
                    <div
                      key={`${channel.channel}-${channel.externalUserId}-${index}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[#e6dece] bg-[#fbfaf7] px-3 py-1.5"
                    >
                      {getChannelIcon(channel.channel)}
                      <span>{channel.channel}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap gap-2 border-t border-[#efe8db] pt-4">
                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:generateSuggestedMessage`}
                    onClick={() => void generateSuggestedMessage(contact)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Gerar mensagem
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_consultation_offered`}
                    onClick={() => void applyOperationalAction(contact, 'mark_consultation_offered')}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Oferecer consulta
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_consultation_scheduled`}
                    onClick={() => void applyOperationalAction(contact, 'mark_consultation_scheduled')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Consulta agendada
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_proposal_sent`}
                    onClick={() => void applyOperationalAction(contact, 'mark_proposal_sent')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Proposta enviada
                  </ActionButton>

                  {!contact.isClient ? (
                    <ActionButton
                      variant="primary"
                      disabled={actionLoading === `${contact.clientId}:mark_client`}
                      onClick={() => void applyOperationalAction(contact, 'mark_client')}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Tornar cliente
                    </ActionButton>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelSection>

      {showSuggestedMessage && selectedContact?.suggestedMessage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#ddd4c3] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#eee7da] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-[#10261d]">Mensagem sugerida</h3>
                <p className="mt-1 text-sm text-[#64746d]">
                  Revise o conteúdo antes de enviar.
                </p>
              </div>

              <ActionButton variant="ghost" onClick={() => setShowSuggestedMessage(false)}>
                <X className="h-4 w-4" />
              </ActionButton>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-[#ece4d5] bg-[#faf7f0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">Cliente</p>
                  <p className="mt-2 text-sm font-medium text-[#10261d]">{selectedContact.fullName}</p>
                </div>
                <div className="rounded-2xl border border-[#ece4d5] bg-[#faf7f0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">Canal</p>
                  <p className="mt-2 text-sm font-medium text-[#10261d]">
                    {selectedContact.suggestedMessage.channel}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#ece4d5] bg-[#faf7f0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">Tipo</p>
                  <p className="mt-2 text-sm font-medium text-[#10261d]">
                    {selectedContact.suggestedMessage.messageType}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#ece4d5] bg-[#fbfaf7] p-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-[#22372e]">
                  {selectedContact.suggestedMessage.content}
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <ActionButton variant="outline" onClick={() => setShowSuggestedMessage(false)}>
                  Fechar
                </ActionButton>
                <ActionButton variant="primary">
                  <Send className="mr-2 h-4 w-4" />
                  Enviar mensagem
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}