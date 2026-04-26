/**
 * SERVIÇO DE INTELIGÊNCIA DE OTIMIZAÇÃO
 * 
 * Responsável por analisar dados, identificar padrões e gerar insights automáticos
 */

import { abTestingService, TestResult, ABTest } from './ab-testing.ts';
import { acquisitionContentService } from './acquisition-content.ts';
import { LegalTheme } from '../ai/noemia-core.ts';

export interface OptimizationInsight {
  id: string;
  type: 'performance' | 'trend' | 'opportunity' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
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
    effort: 'low' | 'medium' | 'high';
    priority: number;
  }>;
  generatedAt: Date;
  expiresAt?: Date;
}

export interface PerformanceTrend {
  metric: string;
  period: string;
  values: Array<{
    date: string;
    value: number;
  }>;
  trend: 'up' | 'down' | 'stable';
  changePercentage: number;
  significance: number;
}

export interface ContentPerformance {
  contentId: string;
  contentTitle: string;
  theme: LegalTheme;
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
  insights: string[];
}

export interface BusinessMetrics {
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
}

class OptimizationIntelligenceService {
  private insights: OptimizationInsight[] = [];
  private trends: PerformanceTrend[] = [];

  /**
   * Analisa performance e gera insights automáticos
   */
  async analyzePerformance(): Promise<OptimizationInsight[]> {
    const insights: OptimizationInsight[] = [];
    const now = new Date();

    // Analisar testes A/B ativos
    const activeTests = abTestingService.getActiveTests();
    for (const test of activeTests) {
      const results = abTestingService.calculateTestResults(test.id);
      
      if (results.length >= 2) {
        const sortedResults = results.sort((a, b) => b.conversionRate - a.conversionRate);
        const winner = sortedResults[0];
        const loser = sortedResults[sortedResults.length - 1];
        const improvement = winner.conversionRate - loser.conversionRate;

        // Insight de performance significativa
        if (improvement > 5 && winner.confidence > 80) {
          insights.push({
            id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'performance',
            severity: improvement > 15 ? 'high' : 'medium',
            title: `Variação vencedora em ${test.name}`,
            description: `A variação "${test.variations.find(v => v.id === winner.variationId)?.name}" 
            está performando ${improvement.toFixed(1)}% melhor que a pior variação.`,
            data: {
              metric: 'conversion_rate',
              currentValue: winner.conversionRate,
              baselineValue: loser.conversionRate,
              improvement,
              confidence: winner.confidence
            },
            recommendations: [
              {
                action: `Implementar variação vencedora como padrão`,
                expectedImpact: `Aumento de ${improvement.toFixed(1)}% na conversão`,
                effort: 'low',
                priority: 1
              },
              {
                action: 'Criar novos testes baseados na variação vencedora',
                expectedImpact: 'Oportunidade de otimização adicional',
                effort: 'medium',
                priority: 2
              }
            ],
            generatedAt: now,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 dias
          });
        }
      }
    }

    // Analisar performance de conteúdo
    const contentPerformance = this.analyzeContentPerformance();
    const topPerformers = contentPerformance.filter(cp => cp.rank.overall <= 3);
    const underperformers = contentPerformance.filter(cp => cp.rank.overall >= contentPerformance.length - 2);

    // Insight de conteúdo top performer
    for (const topPerformer of topPerformers) {
      if (topPerformer.metrics.conversionRate > 3) { // Acima de 3%
        insights.push({
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'opportunity',
          severity: 'medium',
          title: `Conteúdo de alta performance: ${topPerformer.contentTitle}`,
          description: `Este conteúdo está convertendo ${topPerformer.metrics.conversionRate.toFixed(1)}% 
          e está no top 3 geral.`,
          data: {
            metric: 'content_conversion',
            currentValue: topPerformer.metrics.conversionRate,
            baselineValue: 1.5, // Média base
            improvement: topPerformer.metrics.conversionRate - 1.5,
            confidence: 85
          },
          recommendations: [
              {
                action: 'Criar mais conteúdos similares',
                expectedImpact: 'Potencial de 2-3x mais conversões',
                effort: 'medium',
                priority: 1
              },
              {
                action: 'Aumentar investimento/promoção deste conteúdo',
                expectedImpact: 'Escalar resultado positivo',
                effort: 'low',
                priority: 2
              }
            ],
            generatedAt: now,
            expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
          });
        }
      }

    // Insight de conteúdo underperforming
    for (const underperformer of underperformers) {
      if (underperformer.metrics.conversionRate < 0.5) { // Abaixo de 0.5%
        insights.push({
          id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'warning',
          severity: underperformer.metrics.conversionRate < 0.2 ? 'critical' : 'medium',
          title: `Conteúdo com baixa performance: ${underperformer.contentTitle}`,
          description: `Este conteúdo está convertendo apenas ${underperformer.metrics.conversionRate.toFixed(1)}% 
          e está no bottom 3 geral.`,
          data: {
            metric: 'content_conversion',
            currentValue: underperformer.metrics.conversionRate,
            baselineValue: 1.5,
            improvement: underperformer.metrics.conversionRate - 1.5,
            confidence: 90
          },
          recommendations: [
            {
              action: 'Revisar CTA e abordagem do conteúdo',
              expectedImpact: 'Potencial de 3-5x melhoria',
              effort: 'medium',
              priority: 1
            },
            {
              action: 'Considerar pausar ou arquivar conteúdo',
              expectedImpact: 'Foco em conteúdos mais eficientes',
              effort: 'low',
              priority: 2
            }
          ],
          generatedAt: now,
          expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        });
      }
    }

    // Analisar tendências por área jurídica
    const themeInsights = this.analyzeThemePerformance();
    for (const themeInsight of themeInsights) {
      insights.push(themeInsight);
    }

    this.insights = insights;
    return insights;
  }

  /**
   * Analisa performance de conteúdo
   */
  analyzeContentPerformance(): ContentPerformance[] {
    const activeContents = acquisitionContentService.getActiveContents();
    const acquisitionStats = acquisitionContentService.getAcquisitionStats();

    const performances: ContentPerformance[] = activeContents.map(content => {
      const contentAcquisitions = acquisitionStats.totalAcquisitions; // Mock - em produção calcular real
      const reach = content.metadata.reachCount || 0;
      const entryRate = reach > 0 ? (contentAcquisitions / reach) * 100 : 0;
      
      // Mock de métricas - em produção viriam de dados reais
      const qualificationRate = Math.random() * 30 + 20; // 20-50%
      const conversionRate = Math.random() * 4 + 0.5; // 0.5-4.5%
      const roi = conversionRate * 150; // R$150 por consulta

      return {
        contentId: content.id,
        contentTitle: content.title,
        theme: content.theme,
        platform: content.platform,
        metrics: {
          reach,
          entryRate,
          qualificationRate,
          conversionRate,
          roi
        },
        rank: {
          overall: 0, // Será calculado depois
          byTheme: 0,
          byPlatform: 0
        },
        insights: []
      };
    });

    // Calcular rankings
    performances.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
    performances.forEach((perf, index) => {
      perf.rank.overall = index + 1;
    });

    // Ranking por tema
    const themes = [...new Set(performances.map(p => p.theme))];
    themes.forEach(theme => {
      const themePerformances = performances.filter(p => p.theme === theme);
      themePerformances.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
      themePerformances.forEach((perf, index) => {
        perf.rank.byTheme = index + 1;
      });
    });

    // Ranking por plataforma
    const platforms = [...new Set(performances.map(p => p.platform))];
    platforms.forEach(platform => {
      const platformPerformances = performances.filter(p => p.platform === platform);
      platformPerformances.sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate);
      platformPerformances.forEach((perf, index) => {
        perf.rank.byPlatform = index + 1;
      });
    });

    return performances;
  }

  /**
   * Analisa performance por área jurídica
   */
  private analyzeThemePerformance(): OptimizationInsight[] {
    const insights: OptimizationInsight[] = [];
    const now = new Date();

    // Mock de dados por tema - em produção viriam de dados reais
    const themePerformance = {
      previdenciario: { conversionRate: 3.2, qualifiedRate: 45, volume: 150 },
      bancario: { conversionRate: 2.8, qualifiedRate: 38, volume: 120 },
      familia: { conversionRate: 2.1, qualifiedRate: 35, volume: 80 },
      civil: { conversionRate: 1.8, qualifiedRate: 32, volume: 60 },
      geral: { conversionRate: 1.2, qualifiedRate: 28, volume: 40 }
    };

    // Encontrar melhor tema
    const bestTheme = Object.entries(themePerformance).reduce((best, [theme, perf]) => 
      perf.conversionRate > best.conversionRate ? { theme, ...perf } : best, 
      { theme: '', conversionRate: 0, qualifiedRate: 0, volume: 0 }
    );

    // Encontrar pior tema
    const worstTheme = Object.entries(themePerformance).reduce((worst, [theme, perf]) => 
      perf.conversionRate < worst.conversionRate ? { theme, ...perf } : worst, 
      { theme: '', conversionRate: 100, qualifiedRate: 0, volume: 0 }
    );

    // Insight de melhor tema
    insights.push({
      id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'opportunity',
      severity: 'high',
      title: `Área jurídica com melhor performance: ${bestTheme.theme}`,
      description: `A área ${bestTheme.theme} está convertendo ${bestTheme.conversionRate.toFixed(1)}% 
      com ${bestTheme.qualifiedRate.toFixed(1)}% de qualificação.`,
      data: {
        metric: 'theme_conversion',
        currentValue: bestTheme.conversionRate,
        baselineValue: 2.0,
        improvement: bestTheme.conversionRate - 2.0,
        confidence: 85
      },
      recommendations: [
        {
          action: `Aumentar produção de conteúdo sobre ${bestTheme.theme}`,
          expectedImpact: 'Escalar canal mais eficiente',
          effort: 'medium',
          priority: 1
        },
        {
          action: 'Criar campanhas específicas para esta área',
          expectedImpact: 'Potencial de 2x mais conversões',
          effort: 'medium',
          priority: 2
        }
      ],
      generatedAt: now,
      expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    });

    // Insight de pior tema
    if (worstTheme.conversionRate < 1.5) {
      insights.push({
        id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'warning',
        severity: 'medium',
        title: `Área jurídica com baixa performance: ${worstTheme.theme}`,
        description: `A área ${worstTheme.theme} está convertendo apenas ${worstTheme.conversionRate.toFixed(1)}% 
      com baixo volume de leads.`,
        data: {
          metric: 'theme_conversion',
          currentValue: worstTheme.conversionRate,
          baselineValue: 2.0,
          improvement: worstTheme.conversionRate - 2.0,
          confidence: 80
        },
        recommendations: [
          {
            action: 'Revisar estratégia de conteúdo para esta área',
            expectedImpact: 'Potencial de 2-3x melhoria',
            effort: 'high',
            priority: 1
          },
          {
            action: 'Considerar focar em áreas mais rentáveis',
            expectedImpact: 'Otimização de recursos',
            effort: 'low',
            priority: 2
          }
        ],
        generatedAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      });
    }

    return insights;
  }

  /**
   * Calcula métricas de negócio
   */
  calculateBusinessMetrics(period: 'daily' | 'weekly' | 'monthly'): BusinessMetrics {
    // Mock de dados - em produção viriam de dados reais
    const baseMetrics = {
      daily: { totalLeads: 25, qualifiedLeads: 8, conversions: 2, revenue: 300, cost: 50 },
      weekly: { totalLeads: 175, qualifiedLeads: 56, conversions: 14, revenue: 2100, cost: 350 },
      monthly: { totalLeads: 750, qualifiedLeads: 240, conversions: 60, revenue: 9000, cost: 1500 }
    };

    const metrics = baseMetrics[period];
    const roi = metrics.cost > 0 ? ((metrics.revenue - metrics.cost) / metrics.cost) * 100 : 0;
    const avgTimeToConversion = 3.5; // dias
    const leadQualityScore = metrics.qualifiedLeads / metrics.totalLeads * 100;
    const growthRate = 15; // % crescimento vs período anterior

    return {
      period,
      totalLeads: metrics.totalLeads,
      qualifiedLeads: metrics.qualifiedLeads,
      conversions: metrics.conversions,
      revenue: metrics.revenue,
      cost: metrics.cost,
      roi,
      avgTimeToConversion,
      leadQualityScore,
      growthRate
    };
  }

  /**
   * Gera recomendações automáticas
   */
  generateRecommendations(): Array<{
    category: 'content' | 'cta' | 'targeting' | 'budget';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    implementation: string;
  }> {
    const recommendations = [];
    const insights = this.insights;

    // Analisar insights para gerar recomendações
    const performanceInsights = insights.filter(i => i.type === 'performance');
    const opportunityInsights = insights.filter(i => i.type === 'opportunity');
    const warningInsights = insights.filter(i => i.type === 'warning');

    // Recomendações baseadas em performance
    if (performanceInsights.length > 0) {
      recommendations.push({
        category: 'content' as const,
        priority: 'high' as const,
        title: 'Otimizar conteúdo baseado em A/B testing',
        description: 'Implementar variações vencedoras dos testes A/B como padrão',
        expectedImpact: 'Aumento de 10-25% na conversão',
        implementation: 'Atualizar conteúdos com variações vencedoras e pausar testes concluídos'
      });
    }

    // Recomendações baseadas em oportunidades
    if (opportunityInsights.length > 0) {
      recommendations.push({
        category: 'budget' as const,
        priority: 'medium' as const,
        title: 'Aumentar investimento em conteúdos top performers',
        description: 'Direcionar mais recursos para conteúdos com maior taxa de conversão',
        expectedImpact: 'Escalar resultados positivos',
        implementation: 'Alocar 70% do orçamento para top 20% dos conteúdos'
      });
    }

    // Recomendações baseadas em warnings
    if (warningInsights.length > 0) {
      recommendations.push({
        category: 'content' as const,
        priority: 'high' as const,
        title: 'Revisar conteúdos underperforming',
        description: 'Melhorar ou substituir conteúdos com baixa performance',
        expectedImpact: 'Melhoria de 3-5x na conversão de conteúdos críticos',
        implementation: 'Criar novos testes A/B para conteúdos com <0.5% conversão'
      });
    }

    // Recomendações genéricas
    recommendations.push(
      {
        category: 'targeting' as const,
        priority: 'medium' as const,
        title: 'Expandir para temas de alta performance',
        description: 'Criar mais conteúdo para áreas jurídicas com melhor ROI',
        expectedImpact: 'Aumento de 20-30% em leads qualificados',
        implementation: 'Analisar temas top performers e criar 2x mais conteúdo'
      },
      {
        category: 'cta' as const,
        priority: 'low' as const,
        title: 'Testar novos CTAs baseados em winners',
        description: 'Criar variações de CTAs inspirados nos melhores resultados',
        expectedImpact: 'Aumento de 5-15% no engajamento',
        implementation: 'Criar testes A/B com CTAs baseados em winners anteriores'
      }
    );

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Obtém insights recentes
   */
  getRecentInsights(limit: number = 10): OptimizationInsight[] {
    return this.insights
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Obtém insights por severidade
   */
  getInsightsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): OptimizationInsight[] {
    return this.insights.filter(insight => insight.severity === severity);
  }
}

export const optimizationIntelligenceService = new OptimizationIntelligenceService();
