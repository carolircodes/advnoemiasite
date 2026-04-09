/**
 * DASHBOARD DE TRIAGEM DA NOEMIA
 * 
 * Dashboard para visualização e gestão das triagens conversacionais
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar,
  FileText,
  TrendingUp,
  Filter,
  Download,
  Eye
} from 'lucide-react';

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
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'secondary';
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
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={loadTriageData} size="sm">
            <TrendingUp className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total de Triagens</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.total}</div>
              <p className="text-xs text-gray-500 mt-1">Últimos 30 dias</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Hot Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{report.hotLeads}</div>
              <p className="text-xs text-gray-500 mt-1">Atenção prioritária</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Precisam Atenção</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{report.needsAttention}</div>
              <p className="text-xs text-gray-500 mt-1">Aguardando análise</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completude Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.averageCompleteness}%</div>
              <p className="text-xs text-gray-500 mt-1">Qualidade das triagens</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficos e Estatísticas */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Área Jurídica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.byArea).map(([area, count]) => (
                  <div key={area} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{area}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Canal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.byChannel).map(([channel, count]) => (
                  <div key={channel} className="flex justify-between items-center">
                    <span className="text-sm">{getChannelIcon(channel)} {channel}</span>
                    <Badge variant="outline">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Por Urgência</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(report.byUrgency).map(([urgency, count]) => (
                  <div key={urgency} className="flex justify-between items-center">
                    <span className="text-sm capitalize">{urgency}</span>
                    <Badge variant={getUrgencyColor(urgency)}>{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs com Listagens */}
      <Tabs defaultValue="needs-attention" className="space-y-4">
        <TabsList>
          <TabsTrigger value="needs-attention">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Precisam Atenção ({needsAttention.length})
          </TabsTrigger>
          <TabsTrigger value="hot-leads">
            <TrendingUp className="w-4 h-4 mr-2" />
            Hot Leads ({hotLeads.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            <FileText className="w-4 h-4 mr-2" />
            Todas ({triages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="needs-attention">
          <Card>
            <CardHeader>
              <CardTitle>Triagens que Precisam de Atenção Humana</CardTitle>
            </CardHeader>
            <CardContent>
              <TriageList 
                triages={needsAttention} 
                onAttend={markAsAttended}
                onSelect={setSelectedTriage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hot-leads">
          <Card>
            <CardHeader>
              <CardTitle>Hot Leads - Prioridade Máxima</CardTitle>
            </CardHeader>
            <CardContent>
              <TriageList 
                triages={hotLeads} 
                onAttend={markAsAttended}
                onSelect={setSelectedTriage}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todas as Triagens</CardTitle>
            </CardHeader>
            <CardContent>
              <TriageList 
                triages={triages} 
                onAttend={markAsAttended}
                onSelect={setSelectedTriage}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
      case 'alta': return 'destructive';
      case 'media': return 'default';
      case 'baixa': return 'secondary';
      default: return 'secondary';
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
        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                <Badge variant="outline">{triage.channel}</Badge>
                {triage.isHotLead && <Badge variant="destructive">Hot Lead</Badge>}
                {triage.needsHumanAttention && <Badge variant="default">Precisa Atenção</Badge>}
                {triage.triageData.nivel_urgency && (
                  <Badge variant={getUrgencyColor(triage.triageData.nivel_urgency)}>
                    Urgência: {triage.triageData.nivel_urgencia}
                  </Badge>
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
                  <Clock className="w-3 h-3" />
                  {formatTimeAgo(triage.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {triage.userId}
                </span>
                {triage.triageData.completude && (
                  <span>Completude: {triage.triageData.completude}%</span>
                )}
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onSelect(triage)}
              >
                <Eye className="w-4 h-4 mr-1" />
                Ver
              </Button>
              {!triage.attendedAt && (
                <Button 
                  size="sm"
                  onClick={() => onAttend(triage.sessionId)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Atender
                </Button>
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
            <Button variant="ghost" onClick={onClose}>×</Button>
          </div>
          
          <Separator />
          
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
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            {!triage.attendedAt && (
              <Button onClick={onAttend}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Marcar como Atendido
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
