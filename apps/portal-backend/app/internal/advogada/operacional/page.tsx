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
  pipelineId: string;
  sessionId?: string;
  clientChannelId?: string;
  fullName: string;
  phone?: string;
  isClient: boolean;
  pipelineStage: string;
  leadTemperature: string;
  leadScore: number;
  leadScoreBand: string;
  lifecycleStage: string;
  lifecycleDetail?: string;
  readinessLabel?: string;
  scoreExplanation: string[];
  operationalSlaHours: number;
  areaInterest?: string;
  sourceChannel: string;
  followUpStatus?: string;
  nextFollowUpAt?: string;
  lastContactAt: string;
  latestSessionSummary?: string;
  latestMessagePreview?: string;
  latestCommercialNote?: string;
  latestCommercialNoteAt?: string;
  waitingOn?: string;
  followUpState?: string;
  followUpReason?: string;
  nextStep?: string;
  nextStepDueAt?: string;
  threadStatus?: string;
  threadWaitingFor?: string;
  ownerProfileId?: string;
  ownerName?: string;
  ownerAssignedAt?: string;
  consultationReadiness: string;
  conversionStage: string;
  recommendedAction: string;
  recommendedActionLabel: string;
  recommendedActionDetail: string;
  conversionSignal: string;
  blockingReason?: string | null;
  objectionState: string;
  objectionHint?: string | null;
  opportunityState: string;
  consultationRecommendationState: string;
  consultationRecommendationReason?: string | null;
  consultationSuggestedCopy?: string | null;
  recommendedFollowUpWindow?: string | null;
  consultationOfferState: string;
  consultationOfferSentAt?: string | null;
  consultationOfferReason?: string | null;
  consultationOfferCopy?: string | null;
  consultationOfferAmount?: number | null;
  schedulingState: string;
  schedulingIntent?: string | null;
  schedulingSuggestedAt?: string | null;
  leadSchedulePreference?: string | null;
  desiredScheduleWindow?: string | null;
  scheduleConfirmedAt?: string | null;
  paymentState: string;
  paymentLinkSentAt?: string | null;
  paymentLinkUrl?: string | null;
  paymentReference?: string | null;
  paymentPendingAt?: string | null;
  paymentApprovedAt?: string | null;
  paymentFailedAt?: string | null;
  paymentExpiredAt?: string | null;
  paymentAbandonedAt?: string | null;
  consultationConfirmedAt?: string | null;
  consultationCaseId?: string | null;
  consultationAppointmentId?: string | null;
  appointmentState: string;
  consultationPreconfirmedAt?: string | null;
  appointmentCreatedAt?: string | null;
  appointmentConfirmedAt?: string | null;
  consultationConfirmationSource?: string | null;
  closingState: string;
  closingBlockReason?: string | null;
  closingSignal: string;
  closingNextStep: string;
  closingRecommendedAction: string;
  closingRecommendedActionLabel: string;
  closingRecommendedActionDetail: string;
  closingCopySuggestion?: string | null;
  advancementReason: string;
  channels: Array<{
    channel: string;
    externalUserId: string;
    displayName?: string | null;
    lastContactAt: string;
  }>;
  followUpCount: number;
  priorityScore: number;
  priorityLabel: 'high' | 'medium' | 'low';
  priorityReasons: string[];
  attentionBucket: 'needs_attention' | 'follow_up' | 'blocked' | 'monitor';
  nextBestAction: {
    title: string;
    detail: string;
  };
  growthContext: {
    acquisitionContext: {
      sourceLabel: string;
      campaignLabel: string;
      topicLabel: string;
      contentLabel: string;
    } | null;
    intakeContext: {
      statusLabel: string;
      currentStageLabel: string;
      urgencyLabel: string;
    } | null;
    funnelLossSignals: Array<{
      key: string;
      label: string;
      detail: string;
    }>;
    pendingDocumentsCount: number;
    pendingDocumentsLabel: string;
    portalActivationPending: boolean;
    summaryLines: string[];
  } | null;
  automationPlan: {
    label: string;
    detail: string;
    state: 'eligible' | 'queued' | 'cooldown' | 'idle';
    scheduledFor?: string;
  } | null;
  conversationState: {
    conversationStatus?: string;
    triageStage?: string;
    explanationStage?: string;
    consultationStage?: string;
    executiveFunnelStage?: string | null;
    funnelMomentum?: string | null;
    leadTemperature?: string | null;
    priorityLevel?: string | null;
    conversionScore?: number | null;
    nextBestAction?: string | null;
    nextBestActionDetail?: string | null;
    handoffReason?: string | null;
    readyForLawyer: boolean;
    aiActiveOnChannel: boolean;
    operationalHandoffRecorded: boolean;
    lawyerNotificationGenerated: boolean;
    humanFollowUpPending: boolean;
    followUpReady: boolean;
    schedulingPreferences?: {
      channel?: string;
      period?: string;
      urgency?: string;
      availability?: string;
    } | null;
    reportSummary?: string | null;
    entrySource?: string | null;
    entryType?: string | null;
    entryPoint?: string | null;
    discoveryMechanism?: string | null;
    sourceLabel?: string | null;
    campaignLabel?: string | null;
    topicLabel?: string | null;
    contentLabel?: string | null;
    contentType?: string | null;
    commercialContext?: string | null;
    intentSignal?: string | null;
    commercialFunnelStage?: string | null;
    commercialStageLabel?: string | null;
    consultationIntentLevel?: string | null;
    consultationInviteTiming?: string | null;
    consultationInviteState?: string | null;
    consultationInviteCopy?: string | null;
    consultationValueAngle?: string | null;
    schedulingReadiness?: string | null;
    schedulingStatus?: string | null;
    humanHandoffMode?: string | null;
    humanHandoffReady?: boolean;
    commercialFollowUpType?: string | null;
    operatorPriority?: string | null;
    closeOpportunityState?: string | null;
    objectionsDetected?: string[] | null;
    hesitationSignals?: string[] | null;
    valueSignals?: string[] | null;
    urgencySignals?: string[] | null;
    recommendedOperatorAction?: string | null;
    directTransitionStatus?: string | null;
    publicCommentDecision?: string | null;
    publicCommentSafety?: string | null;
    publicBrevityRule?: string | null;
  } | null;
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
  activeConversations: number;
  consultationIntent: number;
  consultationReady: number;
  humanHandoffReady: number;
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
  const [showAssistedSend, setShowAssistedSend] = useState(false);
  const [availableChannels, setAvailableChannels] = useState<Array<{ channel: string; externalUserId: string; lastContactAt?: string }>>([]);
  const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'instagram' | 'facebook' | ''>('');
  const [messageContent, setMessageContent] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [staffOwners, setStaffOwners] = useState<StaffOwner[]>([]);

  useEffect(() => {
    void loadPanelData();
  }, [filters]);

  useEffect(() => {
    void loadStaffOwners();
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value !== '').length,
    [filters]
  );
  const queueSummary = useMemo(() => {
    return contacts.reduce(
      (accumulator, contact) => {
        accumulator[contact.attentionBucket].push(contact);
        return accumulator;
      },
      {
        needs_attention: [] as OperationalContact[],
        follow_up: [] as OperationalContact[],
        blocked: [] as OperationalContact[],
        monitor: [] as OperationalContact[],
      }
    );
  }, [contacts]);
  const automationSummary = useMemo(() => {
    return contacts.reduce(
      (accumulator, contact) => {
        const state = contact.automationPlan?.state || 'idle';
        accumulator[state] += 1;
        return accumulator;
      },
      {
        eligible: 0,
        queued: 0,
        cooldown: 0,
        idle: 0,
      }
    );
  }, [contacts]);

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
    notes?: string,
    payload?: Record<string, unknown>
  ) {
    setActionLoading(`${contact.clientId}:${actionType}`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'applyAction',
          clientId: contact.clientId,
          pipelineId: contact.pipelineId,
          sessionId: contact.sessionId,
          actionType,
          value,
          notes,
          payload,
        }),
      });

      const result = await response.json();

      if (result?.success) {
        await loadPanelData();
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
          pipelineId: contact.pipelineId,
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

  async function loadClientChannels(contact: OperationalContact) {
    setActionLoading(`${contact.clientId}:loadChannels`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'getClientChannels',
          clientId: contact.clientId,
        }),
      });

      const result = await response.json();

      if (result?.success) {
        setAvailableChannels(result.data || []);
        setSelectedContact(contact);
        setShowAssistedSend(true);
        
        // Pré-selecionar canal se houver apenas um
        if (result.data && result.data.length === 1) {
          setSelectedChannel(result.data[0].channel as 'whatsapp' | 'instagram' | 'facebook');
        }
        
        // Pré-preencher conteúdo se houver mensagem sugerida
        if (contact.suggestedMessage?.content) {
          setMessageContent(contact.suggestedMessage.content);
          if (contact.suggestedMessage.channel) {
            setSelectedChannel(contact.suggestedMessage.channel as 'whatsapp' | 'instagram' | 'facebook');
          }
        }
      }
    } catch (error) {
      console.error('Error loading client channels:', error);
    } finally {
      setActionLoading(null);
    }
  }

  async function sendAssistedFollowUp() {
    if (!selectedContact || !selectedChannel || !messageContent.trim()) {
      alert('Preencha todos os campos antes de enviar.');
      return;
    }

    setActionLoading(`${selectedContact.clientId}:sendAssistedFollowUp`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sendAssistedFollowUp',
          clientId: selectedContact.clientId,
          pipelineId: selectedContact.pipelineId,
          channel: selectedChannel,
          content: messageContent.trim(),
          approvedBy: 'staff_user', // TODO: pegar do contexto de autenticação
          followUpMessageId: selectedContact.suggestedMessage ? undefined : undefined,
          messageType: selectedContact.suggestedMessage?.messageType
        }),
      });

      const result = await response.json();

      if (result?.success) {
        // Fechar modal e recarregar dados
        setShowAssistedSend(false);
        setSelectedContact(null);
        setSelectedChannel('');
        setMessageContent('');
        setAvailableChannels([]);
        await loadPanelData();
        
        alert('Mensagem enviada com sucesso!');
      } else {
        alert(`Erro ao enviar mensagem: ${result?.error || 'Erro desconhecido'}`);
      }
    } catch (error) {
      console.error('Error sending assisted follow-up:', error);
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setActionLoading(null);
    }
  }

  function openAssistedSendModal(contact: OperationalContact) {
    // Carregar canais disponíveis antes de abrir modal
    void loadClientChannels(contact);
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
      case 'facebook':
        return <MessageSquare className="h-4 w-4" />;
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

  function getReadinessTone(
    readiness: string
  ): 'red' | 'orange' | 'blue' | 'green' | 'gold' | 'gray' {
    switch (readiness) {
      case 'ready_for_consultation':
      case 'closing':
        return 'green';
      case 'almost_ready':
      case 'advanced_triage':
        return 'gold';
      case 'blocked_by_objection':
      case 'blocked_by_silence':
      case 'blocked_by_missing_context':
        return 'red';
      case 'clarifying':
        return 'blue';
      default:
        return 'gray';
    }
  }

  function getOpportunityTone(
    state: string
  ): 'red' | 'orange' | 'green' | 'gray' {
    switch (state) {
      case 'closing':
        return 'green';
      case 'hot':
        return 'red';
      case 'warm':
        return 'orange';
      default:
        return 'gray';
    }
  }

  function getClosingTone(
    state: string
  ): 'red' | 'orange' | 'blue' | 'green' | 'gold' | 'gray' {
    switch (state) {
      case 'consultation_confirmed':
        return 'green';
      case 'payment_in_progress':
        return 'gold';
      case 'scheduling_in_progress':
      case 'proposal_sent':
      case 'consultation_recommended':
        return 'orange';
      case 'blocked':
      case 'lost':
        return 'red';
      case 'reactivable':
        return 'blue';
      default:
        return 'gray';
    }
  }

  async function loadStaffOwners() {
    try {
      const response = await fetch('/api/internal/operational?action=getStaffOwners');
      const result = await response.json();

      if (result?.success) {
        setStaffOwners(Array.isArray(result.data) ? result.data : []);
      }
    } catch (error) {
      console.error('Error loading staff owners:', error);
    }
  }

  async function assignCommercialOwner(contact: OperationalContact) {
    if (!contact.sessionId) {
      alert('Esta oportunidade ainda nao tem thread comercial vinculada.');
      return;
    }

    const ownerOptions = staffOwners
      .map((owner, index) => `${index + 1}. ${owner.full_name} (${owner.role})`)
      .join('\n');
    const selectedRaw = window.prompt(
      `Escolha o responsavel da thread:\n${ownerOptions}\n\nDigite o numero do responsavel desejado.`,
      '1'
    );

    if (!selectedRaw) {
      return;
    }

    const selectedIndex = Number(selectedRaw) - 1;
    const selectedOwner = staffOwners[selectedIndex];

    if (!selectedOwner) {
      alert('Responsavel invalido.');
      return;
    }

    setActionLoading(`${contact.clientId}:assignOwner`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assignOwner',
          sessionId: contact.sessionId,
          ownerProfileId: selectedOwner.id,
          ownerName: selectedOwner.full_name,
        }),
      });

      const result = await response.json();

      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao atualizar ownership.');
      }

      await loadPanelData();
    } catch (error) {
      console.error('Error assigning owner:', error);
      alert(error instanceof Error ? error.message : 'Falha ao atualizar ownership.');
    } finally {
      setActionLoading(null);
    }
  }

  async function saveCommercialNote(contact: OperationalContact) {
    if (!contact.sessionId) {
      alert('Esta oportunidade ainda nao tem thread comercial vinculada.');
      return;
    }

    const noteBody = window.prompt('Registrar nota comercial para esta oportunidade:');

    if (!noteBody?.trim()) {
      return;
    }

    setActionLoading(`${contact.clientId}:saveCommercialNote`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveCommercialNote',
          sessionId: contact.sessionId,
          noteBody: noteBody.trim(),
          noteKind: 'operational',
        }),
      });

      const result = await response.json();

      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao salvar nota comercial.');
      }

      await loadPanelData();
    } catch (error) {
      console.error('Error saving note:', error);
      alert(error instanceof Error ? error.message : 'Falha ao salvar nota comercial.');
    } finally {
      setActionLoading(null);
    }
  }

  async function updateCommercialFollowUp(contact: OperationalContact) {
    if (!contact.sessionId) {
      alert('Esta oportunidade ainda nao tem thread comercial vinculada.');
      return;
    }

    const state = window.prompt(
      'Estado do follow-up comercial:\nnone | needs_return | waiting_client | waiting_team | scheduled | overdue | completed',
      contact.followUpState || 'needs_return'
    );

    if (!state) {
      return;
    }

    const followUpReason = window.prompt(
      'Motivo do follow-up:',
      contact.followUpReason || ''
    );
    const nextStep = window.prompt(
      'Proximo passo comercial:',
      contact.nextStep || contact.nextBestAction.detail
    );
    const dueAt = window.prompt(
      'Data/hora do follow-up (ISO, opcional):',
      contact.nextStepDueAt || contact.nextFollowUpAt || ''
    );
    const waitingOn = window.prompt(
      'Aguardando quem? client | team | none',
      contact.waitingOn || 'client'
    );

    setActionLoading(`${contact.clientId}:updateCommercialFollowUp`);

    try {
      const response = await fetch('/api/internal/operational', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'updateCommercialFollowUp',
          sessionId: contact.sessionId,
          followUpState: state,
          followUpReason: followUpReason || null,
          followUpDueAt: dueAt || null,
          nextStep: nextStep || null,
          waitingOn: waitingOn || null,
        }),
      });

      const result = await response.json();

      if (!result?.success) {
        throw new Error(result?.error || 'Falha ao atualizar follow-up comercial.');
      }

      await loadPanelData();
    } catch (error) {
      console.error('Error updating follow-up:', error);
      alert(error instanceof Error ? error.message : 'Falha ao atualizar follow-up comercial.');
    } finally {
      setActionLoading(null);
    }
  }

  async function proposeConsultation(contact: OperationalContact) {
    const reason = window.prompt(
      'Motivo da proposta de consulta:',
      contact.consultationRecommendationReason || contact.recommendedActionDetail || ''
    );

    if (!reason?.trim()) {
      return;
    }

    const copy = window.prompt(
      'Copy comercial da proposta:',
      contact.closingCopySuggestion || contact.consultationSuggestedCopy || ''
    );
    const amountRaw = window.prompt(
      'Valor da consulta (opcional, ex.: 100.00):',
      contact.consultationOfferAmount ? String(contact.consultationOfferAmount) : '100.00'
    );
    const parsedAmount =
      amountRaw && !Number.isNaN(Number(amountRaw.replace(',', '.')))
        ? Number(amountRaw.replace(',', '.'))
        : undefined;

    await applyOperationalAction(contact, 'propose_consultation', undefined, reason.trim(), {
      reason: reason.trim(),
      copy: copy?.trim() || null,
      amount: parsedAmount,
      nextStep: 'Aguardar retorno do lead sobre proposta e horario.'
    });
  }

  async function registerSchedule(contact: OperationalContact) {
    const intent = window.prompt(
      'Intencao de agenda / contexto:',
      contact.schedulingIntent || contact.closingNextStep || ''
    );

    if (intent === null) {
      return;
    }

    const preference = window.prompt(
      'Horario preferido do lead:',
      contact.leadSchedulePreference || ''
    );
    const desiredWindow = window.prompt(
      'Janela desejada:',
      contact.desiredScheduleWindow || ''
    );
    const suggestedAt = window.prompt(
      'Horario sugerido (ISO, opcional):',
      contact.schedulingSuggestedAt || ''
    );
    const confirmedAt = window.prompt(
      'Horario confirmado (ISO, opcional):',
      contact.scheduleConfirmedAt || ''
    );

    await applyOperationalAction(contact, 'register_schedule', undefined, undefined, {
      intent: intent?.trim() || null,
      preference: preference?.trim() || null,
      window: desiredWindow?.trim() || null,
      suggestedAt: suggestedAt?.trim() || null,
      confirmedAt: confirmedAt?.trim() || null
    });
  }

  async function registerPayment(contact: OperationalContact, mode: 'pending' | 'approved') {
    const paymentUrl =
      mode === 'pending'
        ? window.prompt('Link de pagamento (opcional):', contact.paymentLinkUrl || '')
        : null;
    const paymentReference = window.prompt(
      'Referencia do pagamento (opcional):',
      contact.paymentReference || ''
    );

    await applyOperationalAction(
      contact,
      mode === 'pending' ? 'register_payment_pending' : 'register_payment_approved',
      undefined,
      undefined,
      {
        paymentState: mode,
        paymentUrl: paymentUrl?.trim() || null,
        paymentReference: paymentReference?.trim() || null
      }
    );
  }

  async function markClosingLost(contact: OperationalContact) {
    const reason = window.prompt(
      'Motivo da perda de fechamento:',
      contact.closingBlockReason || contact.blockingReason || ''
    );

    if (reason === null) {
      return;
    }

    await applyOperationalAction(contact, 'mark_closing_lost', undefined, reason || undefined);
  }

  async function materializeAppointment(contact: OperationalContact) {
    await applyOperationalAction(contact, 'materialize_appointment');
  }

  function getAttentionTone(bucket: OperationalContact['attentionBucket']): 'red' | 'orange' | 'blue' | 'gray' {
    switch (bucket) {
      case 'needs_attention':
        return 'red';
      case 'follow_up':
        return 'orange';
      case 'blocked':
        return 'blue';
      default:
        return 'gray';
    }
  }

  function getAttentionLabel(bucket: OperationalContact['attentionBucket']) {
    switch (bucket) {
      case 'needs_attention':
        return 'Exige atencao agora';
      case 'follow_up':
        return 'Pede follow-up';
      case 'blocked':
        return 'Travado';
      default:
        return 'Pode acompanhar';
    }
  }

  function getAutomationTone(state: NonNullable<OperationalContact['automationPlan']>['state']): 'green' | 'orange' | 'blue' | 'gray' {
    switch (state) {
      case 'queued':
        return 'green';
      case 'eligible':
        return 'orange';
      case 'cooldown':
        return 'blue';
      default:
        return 'gray';
    }
  }

  function getAutomationLabel(state: NonNullable<OperationalContact['automationPlan']>['state']) {
    switch (state) {
      case 'queued':
        return 'Automacao enfileirada';
      case 'eligible':
        return 'Automacao pronta';
      case 'cooldown':
        return 'Em cooldown';
      default:
        return 'Sem automacao';
    }
  }

  function formatConversationStateLabel(value?: string | null) {
    switch (value) {
      case 'ai_active':
        return 'IA ativa';
      case 'triage_in_progress':
        return 'Triagem em andamento';
      case 'explanation_in_progress':
        return 'Explicacao em andamento';
      case 'consultation_offer':
        return 'Consulta em condução';
      case 'scheduling_in_progress':
        return 'Agendamento em andamento';
      case 'scheduling_preference_captured':
        return 'Preferencia de agenda capturada';
      case 'consultation_ready':
        return 'Consulta pronta';
      case 'lawyer_notified':
        return 'Advogada notificada';
      case 'handed_off_to_lawyer':
        return 'Encaminhado à advogada';
      default:
        return 'Em acompanhamento';
    }
  }

  function formatExplanationStageLabel(value?: string | null) {
    switch (value) {
      case 'understanding_case':
        return 'Entendendo o caso';
      case 'clarifying_questions':
        return 'Aprofundando a triagem';
      case 'guidance_shared':
        return 'Explicacao compartilhada';
      case 'consultation_positioned':
        return 'Consulta posicionada';
      default:
        return 'Explicacao inicial';
    }
  }

  function formatConsultationStageLabel(value?: string | null) {
    switch (value) {
      case 'not_offered':
        return 'Consulta ainda não ofertada';
      case 'offered':
        return 'Consulta apresentada';
      case 'interest_detected':
        return 'Interesse detectado';
      case 'collecting_availability':
        return 'Coletando disponibilidade';
      case 'availability_collected':
        return 'Disponibilidade coletada';
      case 'ready_for_lawyer':
        return 'Pronta para ação da advogada';
      case 'scheduled_pending_confirmation':
        return 'Agendada / aguardando confirmação';
      case 'forwarded_to_lawyer':
        return 'Encaminhada à advogada';
      default:
        return 'Sem etapa registrada';
    }
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
      {/* Botão de atualização */}
      <div className="flex justify-end">
        <ActionButton onClick={() => void loadPanelData()} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Atualizar
        </ActionButton>
      </div>

      <PanelSection
        title="CRM comercial do escritório"
        description="Esta superfície existe para follow-up, consulta, prioridade comercial e travas de conversão. Conversas em tempo real ficam na Inbox; a leitura executiva ampla permanece no Painel."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-[#e7e1d4] bg-[#fbfaf7] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Papel oficial</p>
            <p className="mt-2 text-sm text-[#4f6158]">
              Organizar fila comercial, follow-up, consulta e próximo passo de conversão.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e7e1d4] bg-[#fbfaf7] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Não é inbox</p>
            <p className="mt-2 text-sm text-[#4f6158]">
              Threads, resposta humana e handoff operacional agora pertencem a Atendimento.
            </p>
          </div>
          <div className="rounded-2xl border border-[#e7e1d4] bg-[#fbfaf7] p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">Uso ideal</p>
            <p className="mt-2 text-sm text-[#4f6158]">
              Entrar aqui para decidir quem converter, quem cobrar retorno e quem está travado.
            </p>
          </div>
        </div>
      </PanelSection>

      {metrics ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Total de leads" value={metrics.totalLeads} icon={<Users className="h-6 w-6" />} />
          <MetricCard
            label="Conversas ativas"
            value={metrics.activeConversations}
            icon={<MessageSquare className="h-6 w-6" />}
          />
          <MetricCard
            label="Consulta em vista"
            value={metrics.consultationIntent}
            icon={<Calendar className="h-6 w-6" />}
            tone="orange"
          />
          <MetricCard
            label="Prontas para ação humana"
            value={metrics.humanHandoffReady}
            icon={<Target className="h-6 w-6" />}
            tone="red"
          />
        </div>
      ) : null}

      {metrics ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Leads mornos/quentes"
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
            label="Consulta pronta"
            value={metrics.consultationReady}
            icon={<CheckCircle className="h-6 w-6" />}
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
        title="Prioridades do dia"
        description="A fila separa o que pede ação imediata, follow-up comercial, revisão de travamento e simples acompanhamento."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              key: 'needs_attention' as const,
              label: 'Exige atenção agora',
              count: queueSummary.needs_attention.length,
              note: queueSummary.needs_attention[0]?.fullName || 'Nenhum item critico neste momento.',
            },
            {
              key: 'follow_up' as const,
              label: 'Pede follow-up',
              count: queueSummary.follow_up.length,
              note: queueSummary.follow_up[0]?.nextBestAction.title || 'Sem follow-up puxando a fila agora.',
            },
            {
              key: 'blocked' as const,
              label: 'Travado',
              count: queueSummary.blocked.length,
              note: queueSummary.blocked[0]?.fullName || 'Nenhum travamento dominante agora.',
            },
            {
              key: 'monitor' as const,
              label: 'Pode acompanhar',
              count: queueSummary.monitor.length,
              note: queueSummary.monitor[0]?.fullName || 'Acompanhamento leve neste momento.',
            },
          ].map((item) => (
            <div key={item.key} className="rounded-2xl border border-[#e7e1d4] bg-[#fbfaf7] p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[#6a7a73]">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold text-[#10261d]">{item.count}</p>
                </div>
                <StatusChip tone={getAttentionTone(item.key)}>{item.label}</StatusChip>
              </div>
              <p className="mt-3 text-sm text-[#56675f]">{item.note}</p>
            </div>
          ))}
        </div>
      </PanelSection>

      <PanelSection
        title="Automações comerciais seguras"
        description="A fila abaixo mostra onde a máquina pode ajudar com segurança, sem disparo cego e com estado auditável por item."
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { key: 'eligible', label: 'Prontas para fila', value: automationSummary.eligible },
            { key: 'queued', label: 'Já enfileiradas', value: automationSummary.queued },
            { key: 'cooldown', label: 'Em cooldown', value: automationSummary.cooldown },
            { key: 'idle', label: 'Sem automação', value: automationSummary.idle },
          ].map((item) => (
            <div key={item.key} className="rounded-2xl border border-[#e7e1d4] bg-[#fbfaf7] p-4 shadow-sm">
              <p className="text-sm text-[#6a7a73]">{item.label}</p>
              <p className="mt-1 text-2xl font-bold text-[#10261d]">{item.value}</p>
            </div>
          ))}
        </div>
      </PanelSection>

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
              <option value="facebook">Facebook</option>
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

                      <StatusChip tone={getAttentionTone(contact.attentionBucket)}>
                        {getAttentionLabel(contact.attentionBucket)}
                      </StatusChip>

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
                        Score {contact.leadScore}
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

                      <StatusChip tone={getReadinessTone(contact.consultationReadiness)}>
                        {formatStageLabel(contact.consultationReadiness)}
                      </StatusChip>

                      <StatusChip tone={getOpportunityTone(contact.opportunityState)}>
                        {contact.opportunityState === 'closing'
                          ? 'Fechamento'
                          : contact.opportunityState === 'hot'
                            ? 'Oportunidade quente'
                            : contact.opportunityState === 'warm'
                              ? 'Oportunidade morna'
                              : 'Monitorar'}
                      </StatusChip>
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

                <div className="mt-3 grid gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Ownership comercial
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.ownerName || 'Sem responsavel'}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.threadStatus
                        ? `Thread ${contact.threadStatus}`
                        : 'Thread comercial ainda sem leitura consolidada.'}
                    </p>
                    {contact.ownerAssignedAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        Assumido em {formatDate(contact.ownerAssignedAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Follow-up real
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.followUpState || contact.followUpStatus || 'none'}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.followUpReason || 'Sem motivo de follow-up registrado.'}
                    </p>
                    {contact.nextStepDueAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        Janela: {formatDate(contact.nextStepDueAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Prontidao para consulta
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.consultationReadiness)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.consultationRecommendationReason ||
                        'A leitura ainda nao recomenda um convite mais forte.'}
                    </p>
                    {contact.consultationSuggestedCopy ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        Copy pronta para sugerir consulta.
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Proximo passo oficial
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.nextStep || contact.nextBestAction.title}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.waitingOn
                        ? `Aguardando ${contact.waitingOn}.`
                        : contact.blockingReason
                          ? `Bloqueio ${formatStageLabel(contact.blockingReason)}.`
                          : 'Sem bloqueio explicito registrado.'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_1fr_1fr]">
                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Estagio de conversao
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.conversionStage)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">{contact.conversionSignal}</p>
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Bloqueio e objecao
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.blockingReason ? formatStageLabel(contact.blockingReason) : 'Sem trava dominante'}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.objectionHint || 'Sem objecao dominante no momento.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Janela sugerida
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.recommendedFollowUpWindow || 'Sem janela sugerida'}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">{contact.advancementReason}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3 lg:grid-cols-4">
                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Estado de fechamento
                    </p>
                    <div className="mt-2">
                      <StatusChip tone={getClosingTone(contact.closingState)}>
                        {formatStageLabel(contact.closingState)}
                      </StatusChip>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.closingRecommendedActionLabel}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.closingRecommendedActionDetail}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Proposta de consulta
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.consultationOfferState)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.consultationOfferReason ||
                        contact.consultationOfferCopy ||
                        'Proposta ainda nao materializada.'}
                    </p>
                    {contact.consultationOfferSentAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        Enviada em {formatDate(contact.consultationOfferSentAt)}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Agenda comercial
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.schedulingState)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.desiredScheduleWindow ||
                        contact.leadSchedulePreference ||
                        contact.schedulingIntent ||
                        'Sem janela ou preferencia registrada.'}
                    </p>
                    {contact.schedulingSuggestedAt || contact.scheduleConfirmedAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        {contact.scheduleConfirmedAt
                          ? `Confirmado em ${formatDate(contact.scheduleConfirmedAt)}`
                          : `Horario sugerido: ${formatDate(contact.schedulingSuggestedAt || '')}`}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Pagamento
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.paymentState)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.paymentLinkUrl
                        ? 'Link de pagamento registrado no trilho comercial.'
                        : contact.closingBlockReason
                          ? `Bloqueio: ${formatStageLabel(contact.closingBlockReason)}`
                          : 'Pagamento ainda nao iniciado.'}
                    </p>
                    {contact.paymentApprovedAt || contact.paymentPendingAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        {contact.paymentApprovedAt
                          ? `Aprovado em ${formatDate(contact.paymentApprovedAt)}`
                          : `Pendente desde ${formatDate(contact.paymentPendingAt || '')}`}
                      </p>
                    ) : null}
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Appointment formal
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {formatStageLabel(contact.appointmentState)}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">
                      {contact.consultationAppointmentId
                        ? `Appointment formal vinculado ao caso ${contact.consultationCaseId?.slice(0, 8) || 'sem caso'}.`
                        : contact.consultationPreconfirmedAt
                          ? 'Consulta preconfirmada; appointment formal sera criado apos conciliacao total.'
                          : 'Ainda sem appointment formal criado.'}
                    </p>
                    {contact.appointmentConfirmedAt || contact.consultationConfirmedAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        {contact.appointmentConfirmedAt
                          ? `Confirmado em ${formatDate(contact.appointmentConfirmedAt)}`
                          : `Consulta confirmada em ${formatDate(contact.consultationConfirmedAt || '')}`}
                      </p>
                    ) : null}
                  </div>
                </div>

                {(contact.closingCopySuggestion || contact.closingSignal) ? (
                  <div className="mt-3 rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Trilha de fechamento
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.closingNextStep}
                    </p>
                    <p className="mt-1 text-sm text-[#5d6d66]">{contact.closingSignal}</p>
                    {contact.closingCopySuggestion ? (
                      <p className="mt-3 text-sm text-[#20342b]">{contact.closingCopySuggestion}</p>
                    ) : null}
                  </div>
                ) : null}

                {contact.latestCommercialNote ? (
                  <div className="mt-3 rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Nota comercial mais recente
                    </p>
                    <p className="mt-2 text-sm text-[#20342b]">{contact.latestCommercialNote}</p>
                    {contact.latestCommercialNoteAt ? (
                      <p className="mt-2 text-xs text-[#6a7a73]">
                        Registrada em {formatDate(contact.latestCommercialNoteAt)}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {contact.conversationState ? (
                  <div className="mt-3 rounded-2xl border border-[#ece5d8] bg-[#f8f5ee] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Estado real da conversa
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusChip tone={contact.conversationState.readyForLawyer ? 'green' : 'neutral'}>
                        {formatConversationStateLabel(contact.conversationState.conversationStatus)}
                      </StatusChip>
                      {contact.conversationState.executiveFunnelStage ? (
                        <StatusChip tone="purple">
                          Funil: {contact.conversationState.executiveFunnelStage}
                        </StatusChip>
                      ) : null}
                      {contact.conversationState.funnelMomentum ? (
                        <StatusChip tone={contact.conversationState.funnelMomentum === 'forte' ? 'green' : contact.conversationState.funnelMomentum === 'moderado' ? 'orange' : 'neutral'}>
                          Momento: {contact.conversationState.funnelMomentum}
                        </StatusChip>
                      ) : null}
                      <StatusChip tone={contact.conversationState.aiActiveOnChannel ? 'blue' : 'red'}>
                        {contact.conversationState.aiActiveOnChannel ? 'IA segue ativa' : 'IA inativa'}
                      </StatusChip>
                      <StatusChip tone="neutral">
                        {formatConsultationStageLabel(contact.conversationState.consultationStage)}
                      </StatusChip>
                      {contact.conversationState.triageStage ? (
                        <StatusChip tone="neutral">
                          Triagem: {contact.conversationState.triageStage}
                        </StatusChip>
                      ) : null}
                      {contact.conversationState.explanationStage ? (
                        <StatusChip tone="neutral">
                          Explicacao: {formatExplanationStageLabel(contact.conversationState.explanationStage)}
                        </StatusChip>
                      ) : null}
                      {contact.conversationState.operationalHandoffRecorded ? (
                        <StatusChip tone="green">Encaminhamento operacional registrado</StatusChip>
                      ) : null}
                      {contact.conversationState.humanFollowUpPending ? (
                        <StatusChip tone="orange">Follow-up humano pendente</StatusChip>
                      ) : null}
                    </div>

                    {contact.conversationState.schedulingPreferences?.availability ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Preferencia registrada:</span>{' '}
                        {contact.conversationState.schedulingPreferences.availability}
                      </p>
                    ) : null}

                    {contact.conversationState.nextBestAction ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Proxima acao sugerida pela conversa:</span>{' '}
                        {contact.conversationState.nextBestAction}
                      </p>
                    ) : null}

                    {contact.conversationState.reportSummary ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Relatorio da triagem:</span>{' '}
                        {contact.conversationState.reportSummary}
                      </p>
                    ) : null}

                    {contact.conversationState.sourceLabel || contact.conversationState.contentLabel ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Entrada social:</span>{' '}
                        {[
                          contact.conversationState.sourceLabel,
                          contact.conversationState.entryType,
                          contact.conversationState.contentLabel,
                          contact.conversationState.topicLabel
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.campaignLabel ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Campanha:</span>{' '}
                        {contact.conversationState.campaignLabel}
                      </p>
                    ) : null}

                    {contact.conversationState.intentSignal || contact.conversationState.commercialContext ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Leitura comercial:</span>{' '}
                        {[
                          contact.conversationState.intentSignal
                            ? `intencao ${contact.conversationState.intentSignal}`
                            : '',
                          contact.conversationState.commercialContext
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.commercialStageLabel ||
                    contact.conversationState.consultationIntentLevel ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Funil comercial:</span>{' '}
                        {[
                          contact.conversationState.commercialStageLabel,
                          contact.conversationState.consultationIntentLevel
                            ? `consulta ${contact.conversationState.consultationIntentLevel}`
                            : '',
                          contact.conversationState.closeOpportunityState
                            ? `oportunidade ${contact.conversationState.closeOpportunityState}`
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.consultationInviteState ||
                    contact.conversationState.consultationInviteTiming ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Convite para consulta:</span>{' '}
                        {[
                          contact.conversationState.consultationInviteState,
                          contact.conversationState.consultationInviteTiming
                            ? `timing ${contact.conversationState.consultationInviteTiming}`
                            : '',
                          contact.conversationState.consultationValueAngle
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.schedulingStatus ||
                    contact.conversationState.schedulingReadiness ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Prontidao de agenda:</span>{' '}
                        {[
                          contact.conversationState.schedulingStatus,
                          contact.conversationState.schedulingReadiness
                            ? `readiness ${contact.conversationState.schedulingReadiness}`
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.humanHandoffMode ||
                    contact.conversationState.commercialFollowUpType ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Follow-up e handoff:</span>{' '}
                        {[
                          contact.conversationState.commercialFollowUpType,
                          contact.conversationState.humanHandoffMode,
                          contact.conversationState.humanHandoffReady ? 'humano pronto' : ''
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.nextBestActionDetail ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Leitura de receita:</span>{' '}
                        {contact.conversationState.nextBestActionDetail}
                      </p>
                    ) : null}

                    {contact.conversationState.consultationInviteCopy ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Framing sugerido:</span>{' '}
                        {contact.conversationState.consultationInviteCopy}
                      </p>
                    ) : null}

                    {contact.conversationState.objectionsDetected?.length ||
                    contact.conversationState.hesitationSignals?.length ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Atritos detectados:</span>{' '}
                        {[
                          ...(contact.conversationState.objectionsDetected || []),
                          ...(contact.conversationState.hesitationSignals || [])
                        ].join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.recommendedOperatorAction ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Acao recomendada pela origem:</span>{' '}
                        {contact.conversationState.recommendedOperatorAction}
                      </p>
                    ) : null}

                    {contact.conversationState.publicCommentDecision ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Policy publica:</span>{' '}
                        {[
                          contact.conversationState.publicCommentDecision,
                          contact.conversationState.publicCommentSafety,
                          contact.conversationState.publicBrevityRule
                            ? `brevidade ${contact.conversationState.publicBrevityRule}`
                            : ''
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    ) : null}

                    {contact.conversationState.directTransitionStatus ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Estado comment para direct:</span>{' '}
                        {contact.conversationState.directTransitionStatus}
                      </p>
                    ) : null}

                    {(contact.conversationState.lawyerNotificationGenerated ||
                      contact.conversationState.operationalHandoffRecorded) ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Estado paralelo:</span>{' '}
                        {contact.conversationState.operationalHandoffRecorded
                          ? 'encaminhamento operacional realizado'
                          : 'advogada pronta para notificacao'}
                        {' + '}
                        {contact.conversationState.aiActiveOnChannel
                          ? 'IA continua ativa no canal'
                          : 'IA precisa ser reativada'}
                      </p>
                    ) : null}

                    {contact.conversationState.handoffReason ? (
                      <p className="mt-3 text-sm text-[#5d6d66]">
                        <span className="font-medium text-[#10261d]">Motivo de handoff legitimo:</span>{' '}
                        {contact.conversationState.handoffReason}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 lg:grid-cols-[1.3fr_1fr]">
                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Proxima melhor acao
                    </p>
                    <p className="mt-2 text-sm font-semibold text-[#10261d]">
                      {contact.recommendedActionLabel}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#56675f]">
                      {contact.recommendedActionDetail}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#ece5d8] bg-[#fbfaf7] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                      Motivos da prioridade
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {contact.priorityReasons.length ? (
                        contact.priorityReasons.map((reason) => (
                          <StatusChip key={reason} tone="neutral">
                            {reason}
                          </StatusChip>
                        ))
                      ) : (
                        <span className="text-sm text-[#62726b]">
                          Sem alerta dominante no momento.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {contact.growthContext || contact.automationPlan ? (
                  <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_1fr]">
                    <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                        Contexto de growth por item
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <StatusChip tone="neutral">{contact.lifecycleStage}</StatusChip>
                        <StatusChip tone="neutral">SLA {contact.operationalSlaHours}h</StatusChip>
                        {contact.readinessLabel ? (
                          <StatusChip tone="gold">{contact.readinessLabel}</StatusChip>
                        ) : null}
                      </div>
                      {contact.growthContext?.summaryLines?.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {contact.growthContext.summaryLines.map((line) => (
                            <StatusChip key={line} tone="neutral">
                              {line}
                            </StatusChip>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-sm text-[#62726b]">
                          Sem contexto adicional de growth para este item no momento.
                        </p>
                      )}

                      {contact.growthContext?.funnelLossSignals?.length ? (
                        <div className="mt-3 space-y-2">
                          {contact.growthContext.funnelLossSignals.slice(0, 2).map((signal) => (
                            <div key={signal.key} className="rounded-xl border border-[#e8e0d1] bg-white px-3 py-2">
                              <p className="text-sm font-medium text-[#10261d]">{signal.label}</p>
                              <p className="mt-1 text-sm text-[#5d6d66]">{signal.detail}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {contact.scoreExplanation.length ? (
                        <div className="mt-3 space-y-2">
                          {contact.scoreExplanation.slice(0, 3).map((line) => (
                            <div key={line} className="rounded-xl border border-[#e8e0d1] bg-white px-3 py-2 text-sm text-[#5d6d66]">
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-2xl border border-[#ece5d8] bg-[#faf7f0] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">
                        Automacao comercial segura
                      </p>
                      {contact.automationPlan ? (
                        <>
                          <div className="mt-2">
                            <StatusChip tone={getAutomationTone(contact.automationPlan.state)}>
                              {getAutomationLabel(contact.automationPlan.state)}
                            </StatusChip>
                          </div>
                          <p className="mt-3 text-sm font-semibold text-[#10261d]">
                            {contact.automationPlan.label}
                          </p>
                          <p className="mt-1 text-sm text-[#5d6d66]">
                            {contact.automationPlan.detail}
                          </p>
                          {contact.automationPlan.scheduledFor ? (
                            <p className="mt-2 text-xs text-[#6a7a73]">
                              Referencia: {formatDate(contact.automationPlan.scheduledFor)}
                            </p>
                          ) : null}
                        </>
                      ) : (
                        <p className="mt-2 text-sm text-[#62726b]">
                          Nenhuma automacao segura destacada para este item agora.
                        </p>
                      )}
                    </div>
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
                    disabled={actionLoading === `${contact.clientId}:loadChannels`}
                    onClick={() => void openAssistedSendModal(contact)}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Enviar mensagem
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:assignOwner`}
                    onClick={() => void assignCommercialOwner(contact)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Definir owner
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:saveCommercialNote`}
                    onClick={() => void saveCommercialNote(contact)}
                  >
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Registrar nota
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:updateCommercialFollowUp`}
                    onClick={() => void updateCommercialFollowUp(contact)}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Atualizar follow-up
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_ready_for_consultation`}
                    onClick={() => void applyOperationalAction(contact, 'mark_ready_for_consultation')}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Apto para consulta
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_hot_opportunity`}
                    onClick={() => void applyOperationalAction(contact, 'mark_hot_opportunity')}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Oportunidade quente
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_reactivatable`}
                    onClick={() => void applyOperationalAction(contact, 'mark_reactivatable')}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Marcar reativavel
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:propose_consultation`}
                    onClick={() => void proposeConsultation(contact)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Propor consulta
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:register_schedule`}
                    onClick={() => void registerSchedule(contact)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Registrar horario
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:register_payment_pending`}
                    onClick={() => void registerPayment(contact, 'pending')}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Pagamento pendente
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:register_payment_approved`}
                    onClick={() => void registerPayment(contact, 'approved')}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Pagamento aprovado
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:materialize_appointment`}
                    onClick={() => void materializeAppointment(contact)}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Criar appointment
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:confirm_consultation`}
                    onClick={() => void applyOperationalAction(contact, 'confirm_consultation')}
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Confirmar consulta
                  </ActionButton>

                  <ActionButton
                    variant="outline"
                    disabled={actionLoading === `${contact.clientId}:mark_closing_lost`}
                    onClick={() => void markClosingLost(contact)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Fechamento perdido
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
                <ActionButton variant="primary" onClick={() => {
                  setShowSuggestedMessage(false);
                  void openAssistedSendModal(selectedContact);
                }}>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar mensagem
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAssistedSend && selectedContact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-[#ddd4c3] bg-white shadow-[0_25px_60px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between border-b border-[#eee7da] px-6 py-5">
              <div>
                <h3 className="text-lg font-semibold text-[#10261d]">Enviar mensagem assistida</h3>
                <p className="mt-1 text-sm text-[#64746d]">
                  Revise e edite o conteúdo antes de enviar.
                </p>
              </div>

              <ActionButton variant="ghost" onClick={() => {
                setShowAssistedSend(false);
                setSelectedContact(null);
                setSelectedChannel('');
                setMessageContent('');
                setAvailableChannels([]);
              }}>
                <X className="h-4 w-4" />
              </ActionButton>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#ece4d5] bg-[#faf7f0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">Cliente</p>
                  <p className="mt-2 text-sm font-medium text-[#10261d]">{selectedContact.fullName}</p>
                  <p className="mt-1 text-xs text-[#6a7a73]">{selectedContact.phone}</p>
                </div>
                <div className="rounded-2xl border border-[#ece4d5] bg-[#faf7f0] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7c61]">Estágio atual</p>
                  <p className="mt-2 text-sm font-medium text-[#10261d]">{formatStageLabel(selectedContact.pipelineStage)}</p>
                  <StatusChip tone={getTemperatureTone(selectedContact.leadTemperature)}>
                    {selectedContact.leadTemperature === 'hot' ? 'Quente' : selectedContact.leadTemperature === 'warm' ? 'Morno' : 'Frio'}
                  </StatusChip>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusChip tone="neutral">Score {selectedContact.leadScore}</StatusChip>
                    <StatusChip tone="neutral">{selectedContact.lifecycleStage}</StatusChip>
                    <StatusChip tone="neutral">SLA {selectedContact.operationalSlaHours}h</StatusChip>
                  </div>
                  {selectedContact.readinessLabel ? (
                    <p className="mt-2 text-xs text-[#6a7a73]">{selectedContact.readinessLabel}</p>
                  ) : null}
                </div>
              </div>

              <div>
                <label className="space-y-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-[#6b614c]">Canal de envio</span>
                  {availableChannels.length === 0 ? (
                    <div className="rounded-xl border border-[#d8d2c4] bg-[#fff8f0] p-4">
                      <p className="text-sm text-[#9a5d09]">
                        Nenhum canal disponível para este cliente. O cliente precisa ter WhatsApp, Instagram ou Facebook cadastrado.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableChannels.map((channel) => (
                        <label key={channel.channel} className="flex items-center gap-3 rounded-xl border border-[#d8d2c4] bg-white p-4 cursor-pointer hover:bg-[#f8f4ec] transition">
                          <input
                            type="radio"
                            name="channel"
                            value={channel.channel}
                            checked={selectedChannel === channel.channel}
                            onChange={(e) => setSelectedChannel(e.target.value as 'whatsapp' | 'instagram' | 'facebook')}
                            className="text-[#10261d]"
                          />
                          <div className="flex items-center gap-2">
                            {getChannelIcon(channel.channel)}
                            <span className="text-sm font-medium text-[#10261d] capitalize">{channel.channel}</span>
                          </div>
                          {channel.lastContactAt && (
                            <span className="text-xs text-[#6a7a73] ml-auto">
                              Último contato: {formatDate(channel.lastContactAt)}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="space-y-2">
                  <span className="text-sm font-semibold uppercase tracking-wide text-[#6b614c]">Mensagem</span>
                  <textarea
                    className="w-full rounded-xl border border-[#d8d2c4] bg-white px-4 py-3 text-sm text-[#10261d] outline-none transition focus:border-[#b58d49] focus:ring-2 focus:ring-[#eadcb8] resize-none"
                    rows={6}
                    placeholder="Digite sua mensagem aqui..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                  />
                  <p className="text-xs text-[#6a7a73]">
                    {messageContent.length} caracteres
                  </p>
                </label>
              </div>

              <div className="flex justify-end gap-2">
                <ActionButton 
                  variant="outline" 
                  onClick={() => {
                    setShowAssistedSend(false);
                    setSelectedContact(null);
                    setSelectedChannel('');
                    setMessageContent('');
                    setAvailableChannels([]);
                  }}
                >
                  Cancelar
                </ActionButton>
                <ActionButton 
                  variant="primary"
                  disabled={!selectedChannel || !messageContent.trim() || actionLoading === `${selectedContact.clientId}:sendAssistedFollowUp`}
                  onClick={() => void sendAssistedFollowUp()}
                >
                  {actionLoading === `${selectedContact.clientId}:sendAssistedFollowUp` ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar mensagem
                    </>
                  )}
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type StaffOwner = {
  id: string;
  full_name: string;
  role: string;
};
