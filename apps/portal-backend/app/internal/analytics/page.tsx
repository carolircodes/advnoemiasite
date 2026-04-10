'use client';

import React, { useState, useEffect } from 'react';
import { ProductEventBeacon } from "@/components/product-event-beacon";

// Tipos para os dados do dashboard
interface AnalyticsMetrics {
  totalLeads: number;
  qualifiedLeads: number;
  scheduledAppointments: number;
  conversions: number;
  conversionRate: number;
  averageResponseTime: number;
}

interface FunnelData {
  stage: string;
  count: number;
  dropRate: number;
}

interface SourcePerformance {
  source: string;
  leads: number;
  qualified: number;
  scheduled: number;
  converted: number;
  conversionRate: number;
}

interface TopicPerformance {
  topic: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}

interface CampaignPerformance {
  campaign: string;
  leads: number;
  conversions: number;
  conversionRate: number;
}

interface ContentPerformance {
  contentId: string;
  leadsGenerated: number;
  conversions: number;
  conversionRate: number;
}

interface AnalyticsResponse {
  metrics: AnalyticsMetrics;
  funnel: FunnelData[];
  sources: SourcePerformance[];
  topics: TopicPerformance[];
  campaigns: CampaignPerformance[];
  content: ContentPerformance[];
  period: string;
  generatedAt: string;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'today' | '7days' | '30days'>('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/analytics/acquisition?period=${period}`);
      
      if (!response.ok) {
        throw new Error('Erro ao buscar dados');
      }

      const analyticsData = await response.json();
      setData(analyticsData);
      
      console.log('ANALYTICS_VIEW_LOADED', {
        period,
        totalLeads: analyticsData.metrics?.totalLeads,
        conversionRate: analyticsData.metrics?.conversionRate
      });
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('pt-BR').format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const formatDropRate = (rate: number): string => {
    if (rate === 0) return '';
    return `-${rate.toFixed(1)}%`;
  };

  const getConversionRateColor = (rate: number): string => {
    if (rate >= 20) return 'text-green-600';
    if (rate >= 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDropRateColor = (rate: number): string => {
    if (rate <= 20) return 'text-green-600';
    if (rate <= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar dados</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <ProductEventBeacon
        eventKey="analytics_page_loaded"
        eventGroup="analytics"
        payload={{ period }}
      />
      
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard de Aquisição</h1>
                <p className="text-sm text-gray-600">Análise de performance e conversão</p>
              </div>
              
              {/* Período Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">Período:</label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as any)}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="today">Hoje</option>
                  <option value="7days">7 dias</option>
                  <option value="30days">30 dias</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Total Leads</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(data.metrics.totalLeads)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Qualificados</div>
              <div className="text-2xl font-bold text-blue-600">{formatNumber(data.metrics.qualifiedLeads)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Agendados</div>
              <div className="text-2xl font-bold text-yellow-600">{formatNumber(data.metrics.scheduledAppointments)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Convertidos</div>
              <div className="text-2xl font-bold text-green-600">{formatNumber(data.metrics.conversions)}</div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Taxa Conv.</div>
              <div className={`text-2xl font-bold ${getConversionRateColor(data.metrics.conversionRate)}`}>
                {formatPercentage(data.metrics.conversionRate)}
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Tempo Médio</div>
              <div className="text-2xl font-bold text-purple-600">
                {data.metrics.averageResponseTime > 0 ? `${data.metrics.averageResponseTime}h` : 'N/A'}
              </div>
            </div>
          </div>

          {/* Funnel */}
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Funil de Conversão</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {data.funnel.map((stage, index) => (
                  <div key={index} className="text-center">
                    <div className="text-3xl font-bold text-gray-900">{formatNumber(stage.count)}</div>
                    <div className="text-sm text-gray-600">{stage.stage}</div>
                    {stage.dropRate > 0 && (
                      <div className={`text-sm mt-1 ${getDropRateColor(stage.dropRate)}`}>
                        {formatDropRate(stage.dropRate)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Visual Funnel */}
              <div className="mt-8 space-y-2">
                {data.funnel.map((stage, index) => {
                  const maxWidth = 100;
                  const width = data.funnel[0].count > 0 
                    ? (stage.count / data.funnel[0].count) * maxWidth 
                    : 0;
                  
                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center">
                        <div className="w-24 text-sm text-gray-600">{stage.stage}</div>
                        <div className="flex-1 mx-4">
                          <div 
                            className="bg-blue-500 text-white text-center py-2 rounded"
                            style={{ width: `${width}%` }}
                          >
                            {formatNumber(stage.count)}
                          </div>
                        </div>
                        <div className="w-16 text-right">
                          {stage.dropRate > 0 && (
                            <span className={`text-sm ${getDropRateColor(stage.dropRate)}`}>
                              {formatDropRate(stage.dropRate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Performance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sources */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Performance por Origem</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qualif.</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Agend.</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conv.</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.sources.map((source, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {source.source}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(source.leads)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(source.qualified)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(source.scheduled)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(source.converted)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getConversionRateColor(source.conversionRate)}`}>
                          {formatPercentage(source.conversionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Topics */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Performance por Tema</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tema</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversões</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.topics.map((topic, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {topic.topic}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(topic.leads)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(topic.conversions)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getConversionRateColor(topic.conversionRate)}`}>
                          {formatPercentage(topic.conversionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Campaigns */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Performance por Campanha</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campanha</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversões</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.campaigns.map((campaign, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {campaign.campaign}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(campaign.leads)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(campaign.conversions)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getConversionRateColor(campaign.conversionRate)}`}>
                          {formatPercentage(campaign.conversionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Top Conteúdos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conteúdo</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Leads</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversões</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Taxa</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.content.map((content, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {content.contentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(content.leadsGenerated)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatNumber(content.conversions)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${getConversionRateColor(content.conversionRate)}`}>
                          {formatPercentage(content.conversionRate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            Dados atualizados em {new Date(data.generatedAt).toLocaleString('pt-BR')}
          </div>
        </div>
      </div>
    </>
  );
}
