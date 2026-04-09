/**
 * API DE AQUISIÇÃO DE LEADS
 * 
 * Endpoint para obter estatísticas e dados de aquisição
 */

import { NextRequest, NextResponse } from "next/server";
import { acquisitionContentService } from "../../../../lib/services/acquisition-content";
import { leadCaptureService } from "../../../../lib/services/lead-capture";

export async function GET(request: NextRequest) {
  try {
    console.log("ACQUISITION_API_REQUEST");

    // Obter estatísticas de conteúdo
    const activeContents = acquisitionContentService.getActiveContents();
    const acquisitionStats = acquisitionContentService.getAcquisitionStats();
    const recentAcquisitions = acquisitionContentService.getRecentAcquisitions(20);

    // Obter estatísticas de captura
    const captureStats = leadCaptureService.getCaptureStats();
    const capturedLeads = leadCaptureService.getAllCapturedLeads();

    // Calcular métricas derivadas
    const totalContents = activeContents.length;
    const totalReach = activeContents.reduce((sum, content) => sum + (content.metadata.reachCount || 0), 0);
    const avgConversionRate = activeContents.length > 0 
      ? activeContents.reduce((sum, content) => sum + (content.metadata.conversionRate || 0), 0) / activeContents.length
      : 0;

    // Métricas por plataforma
    const platformStats = {
      instagram: {
        contents: activeContents.filter(c => c.platform === 'instagram').length,
        acquisitions: acquisitionStats.acquisitionsByPlatform.instagram || 0,
        conversion: acquisitionStats.acquisitionsByPlatform.instagram ? 
          (acquisitionStats.acquisitionsByPlatform.instagram / (totalReach * 0.7)) * 100 : 0
      },
      whatsapp: {
        contents: activeContents.filter(c => c.platform === 'whatsapp').length,
        acquisitions: acquisitionStats.acquisitionsByPlatform.whatsapp || 0,
        conversion: 0
      },
      website: {
        contents: activeContents.filter(c => c.platform === 'website').length,
        acquisitions: acquisitionStats.acquisitionsByPlatform.website || 0,
        conversion: 0
      }
    };

    // Métricas por tema
    const themeStats = Object.keys(acquisitionStats.acquisitionsByTheme).map(theme => ({
      theme,
      acquisitions: acquisitionStats.acquisitionsByTheme[theme as keyof typeof acquisitionStats.acquisitionsByTheme],
      contents: activeContents.filter(c => c.theme === theme).length,
      conversion: acquisitionStats.acquisitionsByTheme[theme as keyof typeof acquisitionStats.acquisitionsByTheme] ? 
        (acquisitionStats.acquisitionsByTheme[theme as keyof typeof acquisitionStats.acquisitionsByTheme] / activeContents.filter(c => c.theme === theme).length) : 0
    }));

    // Palavras-chave mais performáticas
    const keywordStats = Object.keys(acquisitionStats.acquisitionsByKeyword)
      .map(keyword => ({
        keyword,
        acquisitions: acquisitionStats.acquisitionsByKeyword[keyword],
        conversion: acquisitionStats.acquisitionsByKeyword[keyword]
      }))
      .sort((a, b) => b.acquisitions - a.acquisitions)
      .slice(0, 10);

    // Dados para gráfico temporal (últimos 7 dias)
    const dailyStats = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toISOString().split('T')[0];
      
      const dayAcquisitions = recentAcquisitions.filter(a => 
        a.capturedAt.toISOString().split('T')[0] === dateStr
      ).length;

      dailyStats.push({
        date: dateStr,
        acquisitions: dayAcquisitions,
        platform: 'instagram' // Mock, em produção viria dos dados reais
      });
    }

    const response = {
      success: true,
      data: {
        overview: {
          totalContents,
          totalReach,
          totalAcquisitions: acquisitionStats.totalAcquisitions,
          avgConversionRate,
          capturedToday: captureStats.capturedToday,
          capturedThisWeek: captureStats.capturedThisWeek
        },
        platforms: platformStats,
        themes: themeStats,
        keywords: keywordStats,
        dailyStats,
        topContents: activeContents
          .sort((a, b) => (b.metadata.conversionRate || 0) - (a.metadata.conversionRate || 0))
          .slice(0, 5)
          .map(content => ({
            id: content.id,
            title: content.title,
            theme: content.theme,
            platform: content.platform,
            reach: content.metadata.reachCount || 0,
            conversionRate: content.metadata.conversionRate || 0,
            acquisitions: acquisitionStats.totalAcquisitions // Mock, em produção calcular real
          })),
        recentAcquisitions: recentAcquisitions.slice(0, 10).map(acquisition => ({
          id: acquisition.id,
          platform: acquisition.platform,
          source: acquisition.source,
          keyword: acquisition.keyword,
          theme: acquisition.theme,
          capturedAt: acquisition.capturedAt,
          sessionId: acquisition.sessionId,
          metadata: acquisition.metadata
        }))
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        totalContents: activeContents.length,
        totalAcquisitions: acquisitionStats.totalAcquisitions,
        captureStats
      }
    };

    console.log("ACQUISITION_API_SUCCESS", {
      totalContents,
      totalAcquisitions: acquisitionStats.totalAcquisitions,
      capturedToday: captureStats.capturedToday
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error("ACQUISITION_API_ERROR", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("ACQUISITION_API_POST_REQUEST", body);

    // Futuro: endpoint para criar/editar conteúdos de aquisição
    // Por enquanto, apenas retorna os dados atuais
    
    return NextResponse.json({
      success: true,
      message: "POST endpoint not implemented yet",
      data: body
    });

  } catch (error) {
    console.error("ACQUISITION_API_POST_ERROR", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
