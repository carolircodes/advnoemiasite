// Fallback services para quando Supabase não está configurado
import type { PortalProfile } from "../auth/guards";

export async function getClientWorkspace(profile: PortalProfile) {
  // Dados mock para quando Supabase não está disponível
  return {
    clientRecord: {
      id: 'mock-client-id',
      status: 'ativo',
      notes: 'Cliente em modo de demonstração',
      created_at: new Date().toISOString()
    },
    cases: [
      {
        id: 'mock-case-id',
        title: 'Caso de Demonstração - Aposentadoria por INSS',
        area: 'previdenciario',
        status: 'em_analise',
        created_at: new Date().toISOString(),
        statusLabel: 'Em Análise',
        areaLabel: 'Previdenciário'
      }
    ],
    documents: [
      {
        id: 'mock-doc-1',
        case_id: 'mock-case-id',
        file_name: 'RG.pdf',
        category: 'documentos_pessoais',
        description: 'Documento de identificação',
        status: 'recebido',
        visibility: 'client',
        created_at: new Date().toISOString()
      },
      {
        id: 'mock-doc-2',
        case_id: 'mock-case-id',
        file_name: 'Comprovante de Residência.pdf',
        category: 'documentos_pessoais',
        description: 'Comprovante atual',
        status: 'pendente',
        visibility: 'client',
        created_at: new Date().toISOString()
      }
    ],
    documentRequests: [
      {
        id: 'mock-req-1',
        case_id: 'mock-case-id',
        title: 'Laudo Médico',
        instructions: 'Laudo médico atual que comprove a incapacidade',
        due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        visible_to_client: true,
        created_at: new Date().toISOString()
      }
    ],
    appointments: [
      {
        id: 'mock-apt-1',
        case_id: 'mock-case-id',
        title: 'Consulta de Acompanhamento',
        type: 'acompanhamento',
        starts_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        created_at: new Date().toISOString()
      }
    ],
    events: [
      {
        id: 'mock-event-1',
        case_id: 'mock-case-id',
        title: 'Documentos recebidos',
        public_summary: 'RG e comprovante de residência foram recebidos e estão em análise',
        created_at: new Date().toISOString()
      }
    ]
  };
}

export async function getStaffOverview() {
  // Dados mock para staff quando Supabase não está disponível
  return {
    operationalCenter: {
      summary: {
        criticalCount: 2,
        todayCount: 5,
        waitingClientCount: 3,
        waitingTeamCount: 4,
        agedPendingDocumentsCount: 1,
        inviteStalledCount: 0,
        staleCasesCount: 1
      },
      queues: {
        today: [
          {
            id: 'task-1',
            kindLabel: 'Documento',
            title: 'Analisar laudo médico - Caso João Silva',
            timingLabel: 'Hoje',
            severity: 'high'
          },
          {
            id: 'task-2',
            kindLabel: 'Consulta',
            title: 'Preparar consulta - Caso Maria Santos',
            timingLabel: 'Hoje',
            severity: 'medium'
          }
        ],
        awaitingClient: [
          {
            id: 'await-1',
            title: 'Enviar documentos complementares',
            timingLabel: 'Aguardando há 2 dias'
          }
        ],
        awaitingTeam: [
          {
            id: 'await-2',
            title: 'Analisar petição inicial',
            timingLabel: 'Aguardando há 1 dia'
          }
        ],
        recentlyCompleted: [
          {
            id: 'completed-1',
            kindLabel: 'Documento',
            title: 'Revisar documentos - Caso Pedro Costa'
          }
        ]
      },
      latestIntakeRequests: [
        {
          id: 'intake-1',
          full_name: 'Ana Oliveira',
          areaLabel: 'Previdenciário',
          urgencyLabel: 'Normal',
          stageLabel: 'Em análise'
        },
        {
          id: 'intake-2',
          full_name: 'Carlos Mendes',
          areaLabel: 'Consumidor',
          urgencyLabel: 'Alta',
          stageLabel: 'Novo'
        }
      ],
      latestCases: [
        {
          id: 'case-1',
          title: 'Aposentadoria por Idade - Ana Oliveira',
          clientName: 'Ana Oliveira',
          statusLabel: 'Em análise',
          priorityLabel: 'Média'
        },
        {
          id: 'case-2',
          title: 'Desconto Indevido - Carlos Mendes',
          clientName: 'Carlos Mendes',
          statusLabel: 'Documentação',
          priorityLabel: 'Alta'
        }
      ]
    }
  };
}

export async function getBusinessIntelligenceOverview(days: number) {
  // Dados mock para BI quando Supabase não está disponível
  return {
    summary: {
      triageAbandonmentRate: 15.2,
      triageToClientRate: 68.5,
      portalActivationRate: 82.3
    },
    insights: [
      {
        metric: 'Taxa de conversão',
        value: 68.5,
        trend: 'up',
        description: 'Melhora na conversão de triagem para cliente'
      },
      {
        metric: 'Ativação do portal',
        value: 82.3,
        trend: 'stable',
        description: 'Taxa de ativação do portal está estável'
      }
    ]
  };
}
