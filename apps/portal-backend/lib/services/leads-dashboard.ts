import type { SessionContext } from './noemia';
import { getSessionContext } from './noemia';

// Função para acessar sessionContexts (precisa ser exportada do noemia.ts)
// Por enquanto, vamos usar dados de exemplo até que possamos acessar os dados reais
declare global {
  var __sessionContexts__: Map<string, SessionContext>;
}

// Função para obter todos os leads dos sessionContexts
export function getAllLeadsFromNoemia(): LeadData[] {
  const leads: LeadData[] = [];
  const now = new Date();
  
  // Tentar acessar sessionContexts global ou usar dados de exemplo
  const contexts = (typeof __sessionContexts__ !== 'undefined') ? __sessionContexts__ : new Map();
  
  // Se não houver dados reais, usar dados de exemplo para demonstração
  if (contexts.size === 0) {
    return getExampleLeads();
  }
  
  // Processar dados reais dos sessionContexts
  contexts.forEach((context, sessionId) => {
    if (context.leadSummary) {
      const lastMessage = context.lastMessage || '';
      const lastTimestamp = context.history[context.history.length - 1]?.timestamp || new Date();
      const conversationAge = Math.floor((now.getTime() - lastTimestamp.getTime()) / (1000 * 60));
      const isStale = conversationAge > 24 * 60; // 24 horas
      
      leads.push({
        sessionId,
        leadSummary: context.leadSummary,
        lastMessage,
        lastTimestamp,
        conversationAge,
        isStale
      });
    }
  });
  
  // Ordenar por prioridade (high primeiro) e depois por timestamp
  leads.sort((a, b) => {
    if (a.leadSummary?.priority === 'high' && b.leadSummary?.priority !== 'high') return -1;
    if (a.leadSummary?.priority !== 'high' && b.leadSummary?.priority === 'high') return 1;
    return b.lastTimestamp.getTime() - a.lastTimestamp.getTime();
  });
  
  return leads;
}

// Dados de exemplo para demonstração
function getExampleLeads(): LeadData[] {
  const now = new Date();
  
  return [
    {
      sessionId: 'visitor-abc123',
      leadSummary: {
        theme: 'desconto-indevido',
        problem: 'Banco fazendo desconto indevido na conta',
        time: 'há 2 meses',
        urgency: 'sim',
        temperature: 'hot',
        urgencyLevel: 'high',
        priority: 'high',
        needsHumanAttention: true,
        handoffReason: 'Tema crítico (desconto-indevido) com urgência detectada'
      },
      lastMessage: 'Meu banco está descontando 500 reais todo mês sem autorização',
      lastTimestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutos atrás
      conversationAge: 30,
      isStale: false
    },
    {
      sessionId: 'visitor-def456',
      leadSummary: {
        theme: 'aposentadoria',
        problem: 'INSS negou pedido de aposentadoria',
        time: 'há 6 meses',
        urgency: 'não',
        temperature: 'warm',
        urgencyLevel: 'medium',
        priority: 'normal',
        needsHumanAttention: false,
        handoffReason: 'Lead morno - tratamento padrão automatizado'
      },
      lastMessage: 'Quero saber como posso aposentar',
      lastTimestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 horas atrás
      conversationAge: 120,
      isStale: false
    },
    {
      sessionId: 'visitor-ghi789',
      leadSummary: {
        theme: 'trabalhista',
        problem: 'Fui demitido sem justa causa',
        time: 'há 1 semana',
        urgency: 'sim',
        temperature: 'hot',
        urgencyLevel: 'high',
        priority: 'high',
        needsHumanAttention: true,
        handoffReason: 'Lead quente com alta urgência - situação crítica detectada'
      },
      lastMessage: 'Fui demitido ontem e não receberam minhas verbas',
      lastTimestamp: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 horas atrás
      conversationAge: 1500,
      isStale: true
    }
  ];
}

// Estrutura de dados para o painel de leads
export interface LeadData {
  sessionId: string;
  leadSummary: SessionContext['leadSummary'];
  lastMessage: string;
  lastTimestamp: Date;
  conversationAge: number; // minutos desde a última interação
  isStale: boolean; // se está inativo há mais de 24h
}

// Função para obter todos os leads ativos
export function getAllLeads(): LeadData[] {
  return getAllLeadsFromNoemia();
}

// Função para obter leads por prioridade
export function getLeadsByPriority(priority: 'high' | 'normal' | 'all'): LeadData[] {
  const allLeads = getAllLeads();
  
  if (priority === 'all') {
    return allLeads;
  }
  
  return allLeads.filter(lead => lead.leadSummary?.priority === priority);
}

// Função para obter leads por tema
export function getLeadsByTheme(theme: string): LeadData[] {
  const allLeads = getAllLeads();
  return allLeads.filter(lead => lead.leadSummary?.theme === theme);
}

// Função para obter leads por urgência
export function getLeadsByUrgency(urgency: 'high' | 'medium' | 'low'): LeadData[] {
  const allLeads = getAllLeads();
  return allLeads.filter(lead => lead.leadSummary?.urgencyLevel === urgency);
}

// Função para obter estatísticas
export function getLeadsStats() {
  const allLeads = getAllLeads();
  
  return {
    total: allLeads.length,
    highPriority: allLeads.filter(lead => lead.leadSummary?.priority === 'high').length,
    needsHumanAttention: allLeads.filter(lead => lead.leadSummary?.needsHumanAttention).length,
    stale: allLeads.filter(lead => lead.isStale).length,
    byTheme: {
      'aposentadoria': allLeads.filter(lead => lead.leadSummary?.theme === 'aposentadoria').length,
      'desconto-indevido': allLeads.filter(lead => lead.leadSummary?.theme === 'desconto-indevido').length,
      'pensao': allLeads.filter(lead => lead.leadSummary?.theme === 'pensao').length,
      'divorcio': allLeads.filter(lead => lead.leadSummary?.theme === 'divorcio').length,
      'familia': allLeads.filter(lead => lead.leadSummary?.theme === 'familia').length,
      'trabalhista': allLeads.filter(lead => lead.leadSummary?.theme === 'trabalhista').length,
    },
    byUrgency: {
      'high': allLeads.filter(lead => lead.leadSummary?.urgencyLevel === 'high').length,
      'medium': allLeads.filter(lead => lead.leadSummary?.urgencyLevel === 'medium').length,
      'low': allLeads.filter(lead => lead.leadSummary?.urgencyLevel === 'low').length,
    }
  };
}

// Função para obter detalhes de um lead específico
export function getLeadDetails(sessionId: string): LeadData | null {
  const allLeads = getAllLeads();
  return allLeads.find(lead => lead.sessionId === sessionId) || null;
}
