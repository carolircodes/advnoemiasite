/**
 * DASHBOARD DE TRIAGEM DA NOEMIA - VERSÃO SIMPLIFICADA
 * 
 * Dashboard para visualização e gestão das triagens conversacionais
 * Versão sem dependências externas de UI components
 */

import { useState, useEffect } from 'react';

// Tipos para os dados da triagem
interface TriageSummary {
  id: string;
  sessionId: string;
  channel: 'instagram' | 'whatsapp' | 'site' | 'portal';
  userId: string;
  triageData: {
    area?: string;
    problema_principal?: string;
    timeframe?: string;
    tem_documentos?: boolean;
    tipos_documentos?: string[];
    objetivo_cliente?: string;
    nivel_urgencia?: 'baixa' | 'media' | 'alta';
    prejuizo_ativo?: boolean;
    palavras_chave?: string[];
    completude?: number;
  };
  isHotLead: boolean;
  needsHumanAttention: boolean;
  handoffReason?: string;
  createdAt: string;
  updatedAt: string;
  internalSummary: string;
  userFriendlySummary: string;
  attendedBy?: string;
  attendedAt?: string;
}

interface TriageReport {
  total: number;
  hotLeads: number;
  needsAttention: number;
  byArea: Record<string, number>;
  byChannel: Record<string, number>;
  byUrgency: Record<string, number>;
  averageCompleteness: number;
}

export default function TriageDashboard() {
  const [triages, setTriages] = useState<TriageSummary[]>([]);
  const [hotLeads, setHotLeads] = useState<TriageSummary[]>([]);
  const [needsAttention, setNeedsAttention] = useState<TriageSummary[]>([]);
  const [report, setReport] = useState<TriageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTriage, setSelectedTriage] = useState<TriageSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'needs-attention' | 'hot-leads' | 'all'>('needs-attention');

  // Carregar dados
  useEffect(() => {
    loadTriageData();
  }, []);

  const loadTriageData = async () => {
    try {
      setLoading(true);
      
      // Carregar dados diferentes em paralelo
      const [triagesRes, hotLeadsRes, needsAttentionRes, reportRes] = await Promise.all([
        fetch('/api/noemia/triage/all').then(r => r.json()),
        fetch('/api/noemia/triage/hot-leads').then(r => r.json()),
        fetch('/api/noemia/triage/needs-attention').then(r => r.json()),
        fetch('/api/noemia/triage/report').then(r => r.json())
      ]);

      setTriages(triagesRes.data || []);
      setHotLeads(hotLeadsRes.data || []);
      setNeedsAttention(needsAttentionRes.data || []);
      setReport(reportRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados da triagem:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsAttended = async (sessionId: string) => {
    try {
      await fetch('/api/noemia/triage/attend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId })
      });
      
      loadTriageData(); // Recarregar dados
    } catch (error) {
      console.error('Erro ao marcar como atendido:', error);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'instagram': return 'ð';
      case 'whatsapp': return 'ð';
      case 'site': return 'ð';
      case 'portal': return 'ð';
      default: return 'ð';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'alta': return '#dc2626';
      case 'media': return '#2563eb';
      case 'baixa': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Triagem</h1>
          <p className="text-gray-600 mt-1">Gerenciamento das triagens conversacionais da NoemIA</p>
        </div>
        <div className="flex gap-2">
          <button 
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
            onClick={() => {/* TODO: export */}}
          >
            ð Exportar
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={loadTriageData}
          >
            ð Atualizar
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Total de Triagens</h3>
            <div className="text-2xl font-bold">{report.total}</div>
            <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Hot Leads</h3>
            <div className="text-2xl font-bold text-red-600">{report.hotLeads}</div>
            <p className="text-xs text-gray-500 mt-1">Atenção prioritária</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Precisam Atenção</h3>
            <div className="text-2xl font-bold text-orange-600">{report.needsAttention}</div>
            <p className="text-xs text-gray-500 mt-1">Aguardando análise</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Completude Média</h3>
            <div className="text-2xl font-bold">{report.averageCompleteness}%</div>
            <p className="text-xs text-gray-500 mt-1">Qualidade das triagens</p>
          </div>
        </div>
      )}

      {/* Gráficos e Estatísticas */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Por Área Jurídica</h3>
            <div className="space-y-2">
              {Object.entries(report.byArea).map(([area, count]) => (
                <div key={area} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{area}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Por Canal</h3>
            <div className="space-y-2">
              {Object.entries(report.byChannel).map(([channel, count]) => (
                <div key={channel} className="flex justify-between items-center">
                  <span className="text-sm">{getChannelIcon(channel)} {channel}</span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-semibold mb-4">Por Urgência</h3>
            <div className="space-y-2">
              {Object.entries(report.byUrgency).map(([urgency, count]) => (
                <div key={urgency} className="flex justify-between items-center">
                  <span className="text-sm capitalize">{urgency}</span>
                  <span 
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: getUrgencyColor(urgency) }}
                  >
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs com Listagens */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b">
          <div className="flex">
            <button
              className={`px-4 py-3 font-medium ${
                activeTab === 'needs-attention' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('needs-attention')}
            >
              ð Precisam Atenção ({needsAttention.length})
            </button>
            <button
              className={`px-4 py-3 font-medium ${
                activeTab === 'hot-leads' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('hot-leads')}
            >
              ð Hot Leads ({hotLeads.length})
            </button>
            <button
              className={`px-4 py-3 font-medium ${
                activeTab === 'all' 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
              onClick={() => setActiveTab('all')}
            >
              ð Todas ({triages.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'needs-attention' && (
            <TriageList 
              triages={needsAttention} 
              onAttend={markAsAttended}
              onSelect={setSelectedTriage}
            />
          )}
          
          {activeTab === 'hot-leads' && (
            <TriageList 
              triages={hotLeads} 
              onAttend={markAsAttended}
              onSelect={setSelectedTriage}
            />
          )}
          
          {activeTab === 'all' && (
            <TriageList 
              triages={triages} 
              onAttend={markAsAttended}
              onSelect={setSelectedTriage}
            />
          )}
        </div>
      </div>

      {/* Modal de Detalhes */}
      {selectedTriage && (
        <TriageDetailModal 
          triage={selectedTriage} 
          onClose={() => setSelectedTriage(null)}
          onAttend={() => {
            markAsAttended(selectedTriage.sessionId);
            setSelectedTriage(null);
          }}
        />
      )}
    </div>
  );
}

// Componente de Lista de Triagens
function TriageList({ 
  triages, 
  onAttend, 
  onSelect 
}: { 
  triages: TriageSummary[];
  onAttend: (sessionId: string) => void;
  onSelect: (triage: TriageSummary) => void;
}) {
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'instagram': return 'ð';
      case 'whatsapp': return 'ð';
      case 'site': return 'ð';
      case 'portal': return 'ð';
      default: return 'ð';
    }
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'alta': return '#dc2626';
      case 'media': return '#2563eb';
      case 'baixa': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    if (diffInHours < 48) return 'Ontem';
    return date.toLocaleDateString('pt-BR');
  };

  if (triages.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">ð</div>
        <p>Nenhuma triagem encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {triages.map((triage) => (
        <div key={triage.id} className="border rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{getChannelIcon(triage.channel)}</span>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">{triage.channel}</span>
                {triage.isHotLead && <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">Hot Lead</span>}
                {triage.needsHumanAttention && <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Precisa Atenção</span>}
                {triage.triageData.nivel_urgencia && (
                  <span 
                    className="px-2 py-1 rounded text-xs text-white"
                    style={{ backgroundColor: getUrgencyColor(triage.triageData.nivel_urgencia) }}
                  >
                    Urgência: {triage.triageData.nivel_urgencia}
                  </span>
                )}
              </div>
              
              <div className="space-y-2">
                {triage.triageData.area && (
                  <p className="text-sm">
                    <strong>Área:</strong> {triage.triageData.area}
                  </p>
                )}
                
                {triage.triageData.problema_principal && (
                  <p className="text-sm">
                    <strong>Problema:</strong> {triage.triageData.problema_principal}
                  </p>
                )}
                
                {triage.triageData.objetivo_cliente && (
                  <p className="text-sm">
                    <strong>Objetivo:</strong> {triage.triageData.objetivo_cliente}
                  </p>
                )}
                
                <p className="text-sm text-gray-600">
                  {triage.userFriendlySummary}
                </p>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  ð {formatTimeAgo(triage.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  ð {triage.userId}
                </span>
                {triage.triageData.completude && (
                  <span>Completude: {triage.triageData.completude}%</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button 
                className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
                onClick={() => onSelect(triage)}
              >
                ð Ver
              </button>
              {!triage.attendedAt && (
                <button 
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  onClick={() => onAttend(triage.sessionId)}
                >
                  ð Atender
                </button>
              )}
            </div>
          </div>
          
          {triage.handoffReason && (
            <div className="bg-blue-50 p-2 rounded text-sm">
              <strong>Motivo do encaminhamento:</strong> {triage.handoffReason}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Modal de Detalhes da Triagem
function TriageDetailModal({ 
  triage, 
  onClose, 
  onAttend 
}: { 
  triage: TriageSummary;
  onClose: () => void;
  onAttend: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold">Detalhes da Triagem</h2>
              <p className="text-gray-600">Sessão: {triage.sessionId}</p>
            </div>
            <button 
              className="text-gray-500 hover:text-gray-700"
              onClick={onClose}
            >
              ×
            </button>
          </div>
          
          <div className="border-t pt-4"></div>
          
          {/* Informações Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Canal:</strong> {triage.channel}
            </div>
            <div>
              <strong>Criado em:</strong> {new Date(triage.createdAt).toLocaleString('pt-BR')}
            </div>
            <div>
              <strong>Usuário:</strong> {triage.userId}
            </div>
            <div>
              <strong>Completude:</strong> {triage.triageData.completude}%
            </div>
          </div>
          
          {/* Dados da Triagem */}
          <div className="space-y-3">
            <h3 className="font-semibold">Dados Coletados</h3>
            <div className="bg-gray-50 p-4 rounded space-y-2">
              {triage.triageData.area && (
                <div><strong>Área Jurídica:</strong> {triage.triageData.area}</div>
              )}
              {triage.triageData.problema_principal && (
                <div><strong>Problema Principal:</strong> {triage.triageData.problema_principal}</div>
              )}
              {triage.triageData.timeframe && (
                <div><strong>Timeframe:</strong> {triage.triageData.timeframe}</div>
              )}
              {triage.triageData.tem_documentos !== undefined && (
                <div>
                  <strong>Tem Documentos:</strong> {triage.triageData.tem_documentos ? 'Sim' : 'Não'}
                  {triage.triageData.tipos_documentos && triage.triageData.tipos_documentos.length > 0 && (
                    <span> ({triage.triageData.tipos_documentos.join(', ')})</span>
                  )}
                </div>
              )}
              {triage.triageData.objetivo_cliente && (
                <div><strong>Objetivo do Cliente:</strong> {triage.triageData.objetivo_cliente}</div>
              )}
              {triage.triageData.nivel_urgencia && (
                <div><strong>Nível de Urgência:</strong> {triage.triageData.nivel_urgencia}</div>
              )}
              {triage.triageData.prejuizo_ativo !== undefined && (
                <div><strong>Prejuízo Ativo:</strong> {triage.triageData.prejuizo_ativo ? 'Sim' : 'Não'}</div>
              )}
              {triage.triageData.palavras_chave && triage.triageData.palavras_chave.length > 0 && (
                <div><strong>Palavras-chave:</strong> {triage.triageData.palavras_chave.join(', ')}</div>
              )}
            </div>
          </div>
          
          {/* Resumos */}
          <div className="space-y-3">
            <h3 className="font-semibold">Resumos</h3>
            <div className="space-y-2">
              <div>
                <strong>Resumo Amigável:</strong>
                <p className="text-gray-600 mt-1">{triage.userFriendlySummary}</p>
              </div>
              <div>
                <strong>Resumo Interno:</strong>
                <pre className="bg-gray-50 p-3 rounded text-sm mt-1 whitespace-pre-wrap">
                  {triage.internalSummary}
                </pre>
              </div>
            </div>
          </div>
          
          {/* Status */}
          {triage.handoffReason && (
            <div className="bg-blue-50 p-3 rounded">
              <strong>Motivo do Encaminhamento:</strong> {triage.handoffReason}
            </div>
          )}
          
          {triage.attendedAt && (
            <div className="bg-green-50 p-3 rounded">
              <strong>Atendido em:</strong> {new Date(triage.attendedAt).toLocaleString('pt-BR')}
              {triage.attendedBy && <span> por {triage.attendedBy}</span>}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <button 
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              onClick={onClose}
            >
              Fechar
            </button>
            {!triage.attendedAt && (
              <button 
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={onAttend}
              >
                ð Marcar como Atendido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
