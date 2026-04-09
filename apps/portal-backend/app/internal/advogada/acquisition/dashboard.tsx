"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface AcquisitionData {
  overview: {
    totalContents: number;
    totalReach: number;
    totalAcquisitions: number;
    avgConversionRate: number;
    capturedToday: number;
    capturedThisWeek: number;
  };
  platforms: Record<string, {
    contents: number;
    acquisitions: number;
    conversion: number;
  }>;
  themes: Array<{
    theme: string;
    acquisitions: number;
    contents: number;
    conversion: number;
  }>;
  keywords: Array<{
    keyword: string;
    acquisitions: number;
    conversion: number;
  }>;
  dailyStats: Array<{
    date: string;
    acquisitions: number;
    platform: string;
  }>;
  topContents: Array<{
    id: string;
    title: string;
    theme: string;
    platform: string;
    reach: number;
    conversionRate: number;
    acquisitions: number;
  }>;
  recentAcquisitions: Array<{
    id: string;
    platform: string;
    source: string;
    keyword: string;
    theme: string;
    capturedAt: string;
    sessionId: string;
  }>;
}

export default function AcquisitionDashboard() {
  const [data, setData] = useState<AcquisitionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcquisitionData();
  }, []);

  const fetchAcquisitionData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/internal/acquisition");
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
        <div className="text-gray-500">Carregando dados de aquisição...</div>
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

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR");
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
          <h1 className="text-2xl font-bold text-gray-900">Dashboard de Aquisição</h1>
          <p className="text-gray-600">Monitoramento de captação de leads</p>
        </div>
        <button
          onClick={fetchAcquisitionData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Atualizar
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Total de Conteúdos</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalContents)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Alcance Total</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(data.overview.totalReach)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Leads Capturados</div>
          <div className="text-2xl font-bold text-blue-600">{formatNumber(data.overview.totalAcquisitions)}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600">Taxa de Conversão</div>
          <div className="text-2xl font-bold text-green-600">{formatPercentage(data.overview.avgConversionRate)}</div>
        </div>
      </div>

      {/* Today & Week Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">Capturados Hoje</div>
          <div className="text-3xl font-bold">{formatNumber(data.overview.capturedToday)}</div>
        </div>
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
          <div className="text-sm font-medium opacity-90">Capturados na Semana</div>
          <div className="text-3xl font-bold">{formatNumber(data.overview.capturedThisWeek)}</div>
        </div>
      </div>

      {/* Platforms and Themes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platforms */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Por Plataforma</h2>
          </div>
          <div className="p-6 space-y-4">
            {Object.entries(data.platforms).map(([platform, stats]) => (
              <div key={platform} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold">
                    {getPlatformIcon(platform)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 capitalize">{platform}</div>
                    <div className="text-sm text-gray-500">{stats.contents} conteúdos</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{formatNumber(stats.acquisitions)}</div>
                  <div className="text-sm text-gray-500">{formatPercentage(stats.conversion)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Themes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Por Tema Jurídico</h2>
          </div>
          <div className="p-6 space-y-4">
            {data.themes.map((theme) => (
              <div key={theme.theme} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getThemeColor(theme.theme)}`}>
                    {theme.theme}
                  </div>
                  <div className="text-sm text-gray-500">{theme.contents} conteúdos</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-gray-900">{formatNumber(theme.acquisitions)}</div>
                  <div className="text-sm text-gray-500">{formatPercentage(theme.conversion)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Keywords */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Palavras-chave Mais Performáticas</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.keywords.map((keyword, index) => (
              <div key={keyword.keyword} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-bold text-blue-600">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{keyword.keyword}</div>
                    <div className="text-sm text-gray-500">{formatNumber(keyword.acquisitions)} leads</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-green-600">
                  {formatPercentage(keyword.conversion)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Contents */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Conteúdos com Melhor Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conteúdo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alcance</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversão</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatNumber(content.reach)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-600">{formatPercentage(content.conversionRate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatNumber(content.acquisitions)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Acquisitions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Aquisições Recentes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plataforma</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fonte</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tema</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session ID</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentAcquisitions.map((acquisition) => (
                <tr key={acquisition.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(acquisition.capturedAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{getPlatformIcon(acquisition.platform)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {acquisition.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {acquisition.keyword}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getThemeColor(acquisition.theme)}`}>
                      {acquisition.theme}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {acquisition.sessionId.substring(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
