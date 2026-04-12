/**
 * API DE PERFORMANCE E A/B TESTING
 * 
 * Endpoint para obter métricas de performance, resultados de testes e insights
 */

import { NextRequest, NextResponse } from "next/server";
import { requireInternalApiProfile } from "@/lib/auth/guards";
import { abTestingService } from "../../../../lib/services/ab-testing";
import { optimizationIntelligenceService } from "../../../../lib/services/optimization-intelligence";

export async function GET(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    console.log("PERFORMANCE_API_REQUEST");

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';
    const testId = searchParams.get('testId');

    let response: any = { success: true, data: null };

    switch (type) {
      case 'overview':
        response.data = await getPerformanceOverview();
        break;

      case 'ab-tests':
        response.data = await getABTestsData();
        break;

      case 'test-results':
        if (!testId) {
          return NextResponse.json({
            success: false,
            error: "testId parameter is required for test-results"
          }, { status: 400 });
        }
        response.data = await getTestResults(testId);
        break;

      case 'insights':
        response.data = await getInsightsData();
        break;

      case 'recommendations':
        response.data = await getRecommendationsData();
        break;

      case 'content-performance':
        response.data = await getContentPerformanceData();
        break;

      case 'business-metrics':
        const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'weekly';
        response.data = await getBusinessMetrics(period);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid type parameter"
        }, { status: 400 });
    }

    console.log("PERFORMANCE_API_SUCCESS", { type });

    return NextResponse.json(response);

  } catch (error) {
    console.error("PERFORMANCE_API_ERROR", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      data: null
    }, { status: 500 });
  }
}

async function getPerformanceOverview() {
  const activeTests = abTestingService.getActiveTests();
  const insights = await optimizationIntelligenceService.analyzePerformance();
  const recommendations = optimizationIntelligenceService.generateRecommendations();
  const businessMetrics = optimizationIntelligenceService.calculateBusinessMetrics('weekly');

  // Estatísticas gerais
  const totalTests = activeTests.length;
  const runningTests = activeTests.filter(t => t.status === 'running').length;
  const significantInsights = insights.filter(i => i.severity === 'high' || i.severity === 'critical').length;
  const highPriorityRecommendations = recommendations.filter(r => r.priority === 'high').length;

  // Top performers
  const contentPerformance = optimizationIntelligenceService.analyzeContentPerformance();
  const topContents = contentPerformance
    .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)
    .slice(0, 5);

  // Insights recentes
  const recentInsights = insights
    .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
    .slice(0, 5);

  return {
    overview: {
      totalTests,
      runningTests,
      significantInsights,
      highPriorityRecommendations,
      avgConversionRate: businessMetrics.conversions / businessMetrics.totalLeads * 100,
      weeklyGrowth: businessMetrics.growthRate,
      roi: businessMetrics.roi
    },
    topContents,
    recentInsights,
    recommendations: recommendations.slice(0, 5),
    businessMetrics
  };
}

async function getABTestsData() {
  const activeTests = abTestingService.getActiveTests();
  const allTests = activeTests.map(test => {
    const results = abTestingService.calculateTestResults(test.id);
    const totalImpressions = results.reduce((sum, r) => sum + r.impressions, 0);
    const totalConversions = results.reduce((sum, r) => sum + r.conversions, 0);
    const avgConversionRate = totalImpressions > 0 ? (totalConversions / totalImpressions) * 100 : 0;

    return {
      id: test.id,
      name: test.name,
      description: test.description,
      status: test.status,
      contentId: test.contentId,
      variations: test.variations.map(v => ({
        id: v.id,
        name: v.name,
        type: v.variationType,
        weight: v.weight,
        isActive: v.isActive
      })),
      results: results.map(r => ({
        variationId: r.variationId,
        impressions: r.impressions,
        conversions: r.conversions,
        conversionRate: r.conversionRate,
        confidence: r.confidence,
        isWinner: r.isWinner
      })),
      metrics: {
        totalImpressions,
        totalConversions,
        avgConversionRate,
        duration: test.duration,
        confidenceLevel: test.confidenceLevel
      },
      dates: {
        createdAt: test.metadata.createdAt,
        startedAt: test.metadata.startedAt,
        updatedAt: test.metadata.updatedAt
      }
    };
  });

  return {
    tests: allTests,
    summary: {
      total: allTests.length,
      running: allTests.filter(t => t.status === 'running').length,
      completed: allTests.filter(t => t.status === 'completed').length,
      avgDuration: allTests.reduce((sum, t) => sum + t.metrics.duration, 0) / allTests.length || 0
    }
  };
}

async function getTestResults(testId: string) {
  const test = abTestingService.getTestById(testId);
  if (!test) {
    return { error: "Test not found" };
  }

  const results = abTestingService.calculateTestResults(testId);
  
  return {
    test: {
      id: test.id,
      name: test.name,
      description: test.description,
      status: test.status
    },
    results: results.map(r => ({
      variationId: r.variationId,
      variationName: test.variations.find(v => v.id === r.variationId)?.name || '',
      impressions: r.impressions,
      clicks: r.clicks,
      comments: r.comments,
      leadsGenerated: r.leadsGenerated,
      qualifiedLeads: r.qualifiedLeads,
      conversions: r.conversions,
      metrics: {
        entryRate: r.entryRate,
        responseRate: r.responseRate,
        qualificationRate: r.qualificationRate,
        conversionRate: r.conversionRate
      },
      confidence: r.confidence,
      isWinner: r.isWinner
    })),
    comparison: {
      totalImpressions: results.reduce((sum, r) => sum + r.impressions, 0),
      totalConversions: results.reduce((sum, r) => sum + r.conversions, 0),
      improvement: results.length > 1 ? 
        Math.max(...results.map(r => r.conversionRate)) - Math.min(...results.map(r => r.conversionRate)) : 0,
      statisticalSignificance: results.some(r => r.confidence > 95)
    }
  };
}

async function getInsightsData() {
  const insights = await optimizationIntelligenceService.analyzePerformance();
  
  return {
    insights: insights.map(insight => ({
      id: insight.id,
      type: insight.type,
      severity: insight.severity,
      title: insight.title,
      description: insight.description,
      data: insight.data,
      recommendations: insight.recommendations,
      generatedAt: insight.generatedAt,
      expiresAt: insight.expiresAt
    })),
    summary: {
      total: insights.length,
      bySeverity: {
        critical: insights.filter(i => i.severity === 'critical').length,
        high: insights.filter(i => i.severity === 'high').length,
        medium: insights.filter(i => i.severity === 'medium').length,
        low: insights.filter(i => i.severity === 'low').length
      },
      byType: {
        performance: insights.filter(i => i.type === 'performance').length,
        opportunity: insights.filter(i => i.type === 'opportunity').length,
        warning: insights.filter(i => i.type === 'warning').length,
        trend: insights.filter(i => i.type === 'trend').length
      }
    }
  };
}

async function getRecommendationsData() {
  const recommendations = optimizationIntelligenceService.generateRecommendations();
  
  return {
    recommendations: recommendations,
    summary: {
      total: recommendations.length,
      byPriority: {
        high: recommendations.filter(r => r.priority === 'high').length,
        medium: recommendations.filter(r => r.priority === 'medium').length,
        low: recommendations.filter(r => r.priority === 'low').length
      },
      byCategory: {
        content: recommendations.filter(r => r.category === 'content').length,
        cta: recommendations.filter(r => r.category === 'cta').length,
        targeting: recommendations.filter(r => r.category === 'targeting').length,
        budget: recommendations.filter(r => r.category === 'budget').length
      }
    }
  };
}

async function getContentPerformanceData() {
  const contentPerformance = optimizationIntelligenceService.analyzeContentPerformance();
  
  return {
    contents: contentPerformance.map(cp => ({
      id: cp.contentId,
      title: cp.contentTitle,
      theme: cp.theme,
      platform: cp.platform,
      metrics: cp.metrics,
      rank: cp.rank,
      insights: cp.insights
    })),
    summary: {
      total: contentPerformance.length,
      avgConversionRate: contentPerformance.reduce((sum, cp) => sum + cp.metrics.conversionRate, 0) / contentPerformance.length || 0,
      avgROI: contentPerformance.reduce((sum, cp) => sum + cp.metrics.roi, 0) / contentPerformance.length || 0,
      topPerformers: contentPerformance.filter(cp => cp.rank.overall <= 3).length,
      underperformers: contentPerformance.filter(cp => cp.rank.overall >= contentPerformance.length - 2).length
    },
    byTheme: Object.keys(contentPerformance.reduce((acc, cp) => {
      acc[cp.theme] = (acc[cp.theme] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(theme => ({
      theme,
      count: contentPerformance.filter(cp => cp.theme === theme).length,
      avgConversionRate: contentPerformance.filter(cp => cp.theme === theme)
        .reduce((sum, cp) => sum + cp.metrics.conversionRate, 0) / 
        contentPerformance.filter(cp => cp.theme === theme).length || 0
    })),
    byPlatform: Object.keys(contentPerformance.reduce((acc, cp) => {
      acc[cp.platform] = (acc[cp.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)).map(platform => ({
      platform,
      count: contentPerformance.filter(cp => cp.platform === platform).length,
      avgConversionRate: contentPerformance.filter(cp => cp.platform === platform)
        .reduce((sum, cp) => sum + cp.metrics.conversionRate, 0) / 
        contentPerformance.filter(cp => cp.platform === platform).length || 0
    }))
  };
}

async function getBusinessMetrics(period: 'daily' | 'weekly' | 'monthly') {
  const metrics = optimizationIntelligenceService.calculateBusinessMetrics(period);
  
  // Mock de dados históricos para tendências
  const historicalData = [];
  const now = new Date();
  const daysBack = period === 'daily' ? 30 : period === 'weekly' ? 12 : 6;
  
  for (let i = daysBack - 1; i >= 0; i--) {
    const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
    const variation = Math.random() * 0.3 - 0.15; // ±15% variação
    
    historicalData.push({
      date: date.toISOString().split('T')[0],
      leads: Math.round(metrics.totalLeads * (1 + variation)),
      qualified: Math.round(metrics.qualifiedLeads * (1 + variation)),
      conversions: Math.round(metrics.conversions * (1 + variation)),
      revenue: Math.round(metrics.revenue * (1 + variation))
    });
  }

  return {
    current: metrics,
    historical: historicalData,
    trends: {
      leadsGrowth: ((historicalData[historicalData.length - 1].leads - historicalData[0].leads) / historicalData[0].leads) * 100,
      conversionRateTrend: historicalData.length > 1 ? 
        ((historicalData[historicalData.length - 1].conversions / historicalData[historicalData.length - 1].leads) - 
         (historicalData[0].conversions / historicalData[0].leads)) * 100 : 0,
      roiTrend: historicalData.length > 1 ? 
        (((historicalData[historicalData.length - 1].revenue - metrics.cost) / metrics.cost) - 
         ((historicalData[0].revenue - metrics.cost) / metrics.cost)) * 100 : 0
    },
    benchmarks: {
      avgConversionRate: 2.5,
      avgROI: 200,
      avgTimeToConversion: 4.2,
      avgLeadQuality: 35
    }
  };
}

export async function POST(request: NextRequest) {
  const access = await requireInternalApiProfile();

  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = await request.json();
    console.log("PERFORMANCE_API_POST_REQUEST", body);

    const { action, testId, variationId, metricType, value, metadata } = body;

    let result;

    switch (action) {
      case 'record_metric':
        result = await abTestingService.recordMetric({
          testId,
          variationId,
          contentId: '',
          metricType,
          value,
          metadata
        });
        break;

      case 'record_impression':
        result = await abTestingService.recordImpression(testId, variationId, metadata?.userId, metadata);
        break;

      case 'record_click':
        result = await abTestingService.recordClick(testId, variationId, metadata?.userId, metadata);
        break;

      case 'record_lead':
        result = await abTestingService.recordLeadGenerated(testId, variationId, metadata?.userId, metadata?.sessionId, metadata);
        break;

      case 'record_conversion':
        result = await abTestingService.recordConversion(testId, variationId, metadata?.userId, metadata?.sessionId, metadata);
        break;

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid action parameter"
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error("PERFORMANCE_API_POST_ERROR", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
