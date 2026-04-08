"use client";

import { useState, useEffect } from 'react';
import { getAllLeads, getLeadsByPriority, getLeadsByTheme, getLeadsByUrgency, getLeadsStats, type LeadData } from '../../../lib/services/leads-dashboard';

export default function LeadsDashboard() {
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<LeadData[]>([]);
  const [stats, setStats] = useState(getLeadsStats());
  const [filters, setFilters] = useState({
    priority: 'all' as 'high' | 'normal' | 'all',
    theme: 'all' as string,
    urgency: 'all' as 'high' | 'medium' | 'low' | 'all'
  });
  const [selectedLead, setSelectedLead] = useState<LeadData | null>(null);

  useEffect(() => {
    const allLeads = getAllLeads();
    setLeads(allLeads);
    setFilteredLeads(allLeads);
    setStats(getLeadsStats());
  }, []);

  useEffect(() => {
    let filtered = leads;

    // Aplicar filtro de prioridade
    if (filters.priority !== 'all') {
      filtered = getLeadsByPriority(filters.priority);
    }

    // Aplicar filtro de tema
    if (filters.theme !== 'all') {
      filtered = filtered.filter(lead => lead.leadSummary?.theme === filters.theme);
    }

    // Aplicar filtro de urgência
    if (filters.urgency !== 'all') {
      filtered = filtered.filter(lead => lead.leadSummary?.urgencyLevel === filters.urgency);
    }

    setFilteredLeads(filtered);
  }, [leads, filters]);

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'normal': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getThemeColor = (theme?: string) => {
    switch (theme) {
      case 'aposentadoria': return 'bg-purple-100 text-purple-800';
      case 'desconto-indevido': return 'bg-blue-100 text-blue-800';
      case 'pensao': return 'bg-pink-100 text-pink-800';
      case 'divorcio': return 'bg-orange-100 text-orange-800';
      case 'familia': return 'bg-green-100 text-green-800';
      case 'trabalhista': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d atrás`;
    if (hours > 0) return `${hours}h atrás`;
    if (minutes > 0) return `${minutes}m atrás`;
    return 'agora';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Painel de Leads Prioritários</h1>
          <p className="mt-2 text-gray-600">Visualização e gestão de leads capturados pela NoemIA</p>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-sm text-gray-600">Total de Leads</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-red-600">{stats.highPriority}</div>
            <div className="text-sm text-gray-600">Alta Prioridade</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-orange-600">{stats.needsHumanAttention}</div>
            <div className="text-sm text-gray-600">Precisam Atenção</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-600">{stats.stale}</div>
            <div className="text-sm text-gray-600">Inativos (+24h)</div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({...filters, priority: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="high">Alta</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tema</label>
              <select
                value={filters.theme}
                onChange={(e) => setFilters({...filters, theme: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="aposentadoria">Aposentadoria</option>
                <option value="desconto-indevido">Desconto Indevido</option>
                <option value="pensao">Pensão</option>
                <option value="divorcio">Divórcio</option>
                <option value="familia">Família</option>
                <option value="trabalhista">Trabalhista</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Urgência</label>
              <select
                value={filters.urgency}
                onChange={(e) => setFilters({...filters, urgency: e.target.value as any})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="high">Alta</option>
                <option value="medium">Média</option>
                <option value="low">Baixa</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista de Leads */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Leads ({filteredLeads.length})
            </h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Problema
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Urgência
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Interação
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeads.map((lead) => (
                  <tr key={lead.sessionId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(lead.leadSummary?.priority)}`}>
                        {lead.leadSummary?.priority === 'high' ? '🔥 ALTA' : 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getThemeColor(lead.leadSummary?.theme)}`}>
                        {lead.leadSummary?.theme || 'Não identificado'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {lead.leadSummary?.problem || lead.lastMessage}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getUrgencyColor(lead.leadSummary?.urgencyLevel)}`}>
                        {lead.leadSummary?.urgencyLevel?.toUpperCase() || 'LOW'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatTimeAgo(lead.lastTimestamp)}
                      {lead.isStale && <span className="ml-2 text-red-600">⚠️ Inativo</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {lead.leadSummary?.needsHumanAttention && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded bg-orange-100 text-orange-800">
                          🚨 Precisa Atenção
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Ver Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Detalhes */}
        {selectedLead && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Detalhes do Lead
                  </h3>
                  <button
                    onClick={() => setSelectedLead(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">Informações Principais</h4>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-gray-600">Session ID:</span>
                        <p className="font-mono text-xs">{selectedLead.sessionId}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Prioridade:</span>
                        <p><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getPriorityColor(selectedLead.leadSummary?.priority)}`}>
                          {selectedLead.leadSummary?.priority?.toUpperCase()}
                        </span></p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Tema:</span>
                        <p><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getThemeColor(selectedLead.leadSummary?.theme)}`}>
                          {selectedLead.leadSummary?.theme || 'Não identificado'}
                        </span></p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Urgência:</span>
                        <p><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded ${getUrgencyColor(selectedLead.leadSummary?.urgencyLevel)}`}>
                          {selectedLead.leadSummary?.urgencyLevel?.toUpperCase()}
                        </span></p>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Resumo do Caso</h4>
                    <div className="mt-2 bg-gray-50 p-4 rounded">
                      <div className="space-y-2">
                        <div><span className="font-medium">Problema:</span> {selectedLead.leadSummary?.problem || 'Não informado'}</div>
                        <div><span className="font-medium">Tempo:</span> {selectedLead.leadSummary?.time || 'Não informado'}</div>
                        <div><span className="font-medium">Urgência Informada:</span> {selectedLead.leadSummary?.urgency || 'Não informado'}</div>
                        <div><span className="font-medium">Temperatura:</span> {selectedLead.leadSummary?.temperature}</div>
                        <div><span className="font-medium">Necessita Atenção Humana:</span> {selectedLead.leadSummary?.needsHumanAttention ? 'Sim' : 'Não'}</div>
                        <div><span className="font-medium">Motivo do Handoff:</span> {selectedLead.leadSummary?.handoffReason}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold text-gray-900">Última Interação</h4>
                    <div className="mt-2 bg-gray-50 p-4 rounded">
                      <p className="text-sm">{selectedLead.lastMessage}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(selectedLead.lastTimestamp)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex justify-end mt-6 space-x-3">
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    >
                      Fechar
                    </button>
                    <button
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Entrar em Contato
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
