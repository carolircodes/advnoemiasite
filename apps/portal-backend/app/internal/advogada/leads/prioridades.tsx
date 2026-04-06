"use client";

import { Lead, PrioridadesProps } from "./types";

// Type guards para validação
function isValidLeadStatus(status: string): status is Lead["lead_status"] {
  return ["frio", "curioso", "interessado", "quente", "pronto_para_agendar", "cliente_ativo", "sem_aderencia"].includes(status);
}

function isValidUrgency(urgency: string): urgency is Lead["urgency"] {
  return ["baixa", "media", "alta"].includes(urgency);
}

// Funções de validação para evitar erros de narrowing
function isUrgentLead(lead: Lead): boolean {
  return isValidUrgency(lead.urgency) && 
         lead.urgency === "alta" && 
         isValidLeadStatus(lead.lead_status) && 
         lead.lead_status !== "cliente_ativo";
}

function isHotLead(lead: Lead): boolean {
  return (
    lead.lead_status === "quente" &&
    lead.wants_human === true
  );
}

function isReadyToSchedule(lead: Lead): boolean {
  return isValidLeadStatus(lead.lead_status) && 
         isValidUrgency(lead.urgency) &&
         lead.lead_status === "pronto_para_agendar" && 
         lead.urgency !== "alta" && 
         lead.lead_status !== "cliente_ativo";
}

export function PrioridadesDoDia({ leads }: PrioridadesProps) {
  // Leads urgentes (urgência alta) - excluindo clientes ativos
  const urgentes = leads.filter(isUrgentLead);
  
  // Leads quentes que precisam de atenção humana - excluindo clientes ativos
  const quentesSemHumano = leads.filter(lead => 
    isHotLead(lead) && lead.lead_status !== "cliente_ativo"
  );
  
  // Leads prontos para agendar - excluindo urgentes e clientes ativos
  const prontosParaAgendar = leads.filter(isReadyToSchedule);

  const PriorityCard = ({ 
    title, 
    leads, 
    color, 
    bgColor, 
    icon,
    description 
  }: {
    title: string;
    leads: Lead[];
    color: string;
    bgColor: string;
    icon: string;
    description: string;
  }) => (
    <div className={`${bgColor} rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
      
      <div className="space-y-3">
        {leads.length === 0 ? (
          <p className="text-sm text-gray-500 italic">Nenhum lead nesta categoria</p>
        ) : (
          leads.slice(0, 3).map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg p-3 border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">
                    {lead.username || `@${lead.platform_user_id}`}
                  </div>
                  <div className="text-sm text-gray-500 truncate mt-1">
                    {lead.last_message}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(lead.last_contact_at).toLocaleDateString('pt-BR')} • {new Date(lead.last_contact_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div className="ml-3">
                  <a
                    href={`https://wa.me/5511999999999?text=Olá, vim pelo sistema sobre o lead @${lead.username || lead.platform_user_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-xs rounded-md hover:bg-green-700 transition-colors"
                  >
                    📱 WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
        
        {leads.length > 3 && (
          <div className="text-center pt-2">
            <span className="text-sm text-gray-500">
              +{leads.length - 3} outros leads
            </span>
          </div>
        )}
      </div>
      
      {leads.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium" style={{ color }}>
              {leads.length} lead{leads.length !== 1 ? 's' : ''} {leads.length === 1 ? 'prioritário' : 'prioritários'}
            </span>
            <button className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color }}>
              Ver todos →
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Prioridades do Dia</h2>
        <p className="text-gray-600 mt-2">Leads que precisam de atenção imediata</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PriorityCard
          title="Urgentes"
          leads={urgentes}
          color="#EF4444"
          bgColor="#FEF2F2"
          icon="⚡"
          description="Leads com alta urgência que precisam de ação rápida"
        />
        
        <PriorityCard
          title="Quentes - Atendimento Humano"
          leads={quentesSemHumano}
          color="#F59E0B"
          bgColor="#FFFBEB"
          icon="🔥"
          description="Leads engajados que solicitaram atendimento humano"
        />
        
        <PriorityCard
          title="Prontos para Agendar"
          leads={prontosParaAgendar}
          color="#10B981"
          bgColor="#ECFDF5"
          icon="📅"
          description="Leads que demonstraram intenção clara de agendar consulta"
        />
      </div>
    </div>
  );
}
