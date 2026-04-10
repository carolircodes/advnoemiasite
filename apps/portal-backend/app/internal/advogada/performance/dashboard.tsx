"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PerformanceData {
  overview: {
    totalTests: number;
    runningTests: number;
    significantInsights: number;
    highPriorityRecommendations: number;
    avgConversionRate: number;
    weeklyGrowth: number;
    roi: number;
  };
  topContents: Array<{
    id: string;
    title: string;
    theme: string;
    platform: string;
    metrics: {
      reach: number;
      entryRate: number;
      qualificationRate: number;
      conversionRate: number;
      roi: number;
    };
    rank: {
      overall: number;
      byTheme: number;
      byPlatform: number;
    };
  }>;
  recentInsights: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    data: {
      metric: string;
      currentValue: number;
      baselineValue: number;
      improvement: number;
      confidence: number;
    };
    recommendations: Array<{
      action: string;
      expectedImpact: string;
      effort: string;
      priority: number;
    }>;
    generatedAt: string;
  }>;
  recommendations: Array<{
    category: string;
    priority: string;
    title: string;
    description: string;
    expectedImpact: string;
    implementation: string;
  }>;
  businessMetrics: {
    period: string;
    totalLeads: number;
    qualifiedLeads: number;
    conversions: number;
    revenue: number;
    cost: number;
    roi: number;
    avgTimeToConversion: number;
    leadQualityScore: number;
    growthRate: number;
  };
}

export default function PerformanceDashboard() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'ab-tests' | 'insights' | 'recommendations'>('overview');

  useEffect(() => {
    fetchPerformanceData();
  }, []);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/internal/performance?type=overview");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Carregando dados de performance...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Erro: {error}</div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("pt-BR").format(num);
  };

  const formatPercentage = (num: number) => {
    return `${num.toFixed(1)}%`;
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(num);
  };

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      critical: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800"
    };
    return colors[severity] || "bg-gray-100 text-gray-800";
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      performance: "P",
      opportunity: "O",
      warning: "W",
      trend: "T"
    };
    return icons[type] || type[0].toUpperCase();
  };

  const getThemeColor = (theme: string) => {
    const colors: Record<string, string> = {
      previdenciario: "bg-purple-100 text-purple-800",
      bancario: "bg-blue-100 text-blue-800",
      familia: "bg-pink-100 text-pink-800",
      civil: "bg-green-100 text-green-800",
      geral: "bg-gray-100 text-gray-800"
    };
    return colors[theme] || "bg-gray-100 text-gray-800";
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      instagram: "IG",
      whatsapp: "WA",
      website: "WEB",
      telegram: "TG"
    };
    return icons[platform] || platform.toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Performance</h1>
          <p className="text-gray-600">A/B Testing e Otimização de Conversão</p>
        </div>
        <button
          onClick={fetchPerformanceData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Atualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'overview', label: 'Visão Geral' },
            { key: 'ab-tests', label: 'A/B Tests' },
            { key: 'insights', label: 'Insights' },
            { key: 'recommendations', label: 'Recomendações' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">A/B Tests Ativos</div>
              <div className="text-2xl font-bold text-gray-900">{data.overview.runningTests}</div>
              <div className="text-sm text-gray-500">de {data.overview.totalTests} totais</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Taxa de Conversão</div>
              <div className="text-2xl font-bold text-green-600">{formatPercentage(data.overview.avgConversionRate)}</div>
              <div className="text-sm text-green-600">+{formatPercentage(data.overview.weeklyGrowth)} vs semana</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">ROI</div>
              <div className="text-2xl font-bold text-blue-600">{formatPercentage(data.overview.roi)}</div>
              <div className="text-sm text-gray-500">Retorno sobre investimento</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm font-medium text-gray-600">Alertas Críticos</div>
              <div className="text-2xl font-bold text-red-600">{data.overview.significantInsights}</div>
              <div className="text-sm text-gray-500">Insights importantes</div>
            </div>
          </div>

          {/* Business Metrics */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Métricas de Negócio</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <div className="text-sm font-medium text-gray-600">Leads Totais</div>
                  <div className="text-xl font-bold text-gray-900">{formatNumber(data.businessMetrics.totalLeads)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Qualificados</div>
                  <div className="text-xl font-bold text-blue-600">{formatNumber(data.businessMetrics.qualifiedLeads)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Conversões</div>
                  <div className="text-xl font-bold text-green-600">{formatNumber(data.businessMetrics.conversions)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-600">Receita</div>
                  <div className="text-xl font-bold text-purple-600">{formatCurrency(data.businessMetrics.revenue)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Contents */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Conteúdos Top Performers</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conteúdo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tema</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversão</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ROI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.topContents.map((content) => (
                    <tr key={content.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{content.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getThemeColor(content.theme)}`}>
                          {content.theme}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{getPlatformIcon(content.platform)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-green-600">{formatPercentage(content.metrics.conversionRate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(content.metrics.roi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">#{content.rank.overall}</span>
                          <span className="text-xs text-gray-500">(tema: #{content.rank.byTheme})</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Insights */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Insights Recentes</h2>
            </div>
            <div className="p-6 space-y-4">
              {data.recentInsights.map((insight) => (
                <div key={insight.id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getSeverityColor(insight.severity)}`}>
                    {getTypeIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-sm font-medium text-gray-900">{insight.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(insight.severity)}`}>
                        {insight.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {formatPercentage(insight.data.improvement)} melhoria · {insight.data.confidence}% confiança
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ab-tests' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">A/B Tests</h2>
            <p className="text-gray-600">Visualização detalhada dos testes A/B em andamento.</p>
            <div className="mt-4 p-8 text-center text-gray-500">
              Em desenvolvimento - Componente de A/B tests será implementado aqui
            </div>
          </div>
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Insights de Performance</h2>
            <p className="text-gray-600">Análises automáticas e recomendações inteligentes.</p>
            <div className="mt-4 p-8 text-center text-gray-500">
              Em desenvolvimento - Componente de insights será implementado aqui
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recomendações de Otimização</h2>
            <p className="text-gray-600">Ações sugeridas baseadas em dados de performance.</p>
            <div className="mt-4 p-8 text-center text-gray-500">
              Em desenvolvimento - Componente de recomendações será implementado aqui
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
