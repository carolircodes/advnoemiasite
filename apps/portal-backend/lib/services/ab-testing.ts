/**
 * SERVIÇO DE A/B TESTING PARA OTIMIZAÇÃO DE CONTEÚDO
 * 
 * Responsável por gerenciar testes A/B, variações e métricas de performance
 */

import { LegalTheme } from '../ai/noemia-core.ts';

export interface VariationType {
  id: string;
  name: string;
  description: string;
}

export interface ContentVariation {
  id: string;
  contentId: string;
  variationType: 'cta' | 'keyword' | 'dm_message' | 'content_approach';
  name: string;
  description: string;
  value: string;
  isActive: boolean;
  weight: number; // Para distribuição de tráfego (ex: 50/50)
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    testStartedAt?: Date;
    testEndedAt?: Date;
  };
}

export interface ABTest {
  id: string;
  name: string;
  description: string;
  contentId: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variations: ContentVariation[];
  trafficSplit: Record<string, number>; // variationId -> percentage
  confidenceLevel: number; // 95%, 99%
  minSampleSize: number;
  duration: number; // em dias
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    startedAt?: Date;
    endedAt?: Date;
    winningVariation?: string;
    significance?: number;
  };
}

export interface PerformanceMetric {
  id: string;
  testId: string;
  variationId: string;
  contentId: string;
  timestamp: Date;
  metricType: 'impression' | 'click' | 'comment' | 'lead_generated' | 'qualified' | 'converted';
  value: number;
  metadata?: {
    userId?: string;
    sessionId?: string;
    platform?: string;
    theme?: LegalTheme;
    source?: string;
  };
}

export interface TestResult {
  testId: string;
  variationId: string;
  impressions: number;
  clicks: number;
  comments: number;
  leadsGenerated: number;
  qualifiedLeads: number;
  conversions: number;
  entryRate: number; // comments / impressions
  responseRate: number; // leads / comments
  qualificationRate: number; // qualified / leads
  conversionRate: number; // conversions / leads
  statisticalSignificance?: number;
  isWinner?: boolean;
  confidence: number;
}

// Mock de testes A/B (em produção, viria do banco)
const abTests: ABTest[] = [
  {
    id: 'test_cta_aposentadoria_001',
    name: 'CTA Aposentadoria - Urgência vs Benefício',
    description: 'Testar CTA focado em urgência vs benefício direto',
    contentId: 'content_aposentadoria_001',
    status: 'running',
    variations: [
      {
        id: 'var_cta_urgencia',
        contentId: 'content_aposentadoria_001',
        variationType: 'cta',
        name: 'CTA Urgência',
        description: 'Focado em urgência e tempo limitado',
        value: 'Comente "APOSENTADORIA" se quiser receber orientações gerais e entender quando vale buscar uma análise individual.',
        isActive: true,
        weight: 50,
        metadata: {
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          testStartedAt: new Date('2024-01-20')
        }
      },
      {
        id: 'var_cta_beneficio',
        contentId: 'content_aposentadoria_001',
        variationType: 'cta',
        name: 'CTA Benefício',
        description: 'Focado no benefício direto',
        value: 'Comente "APOSENTADORIA" e receba um guia inicial para organizar suas dúvidas sobre benefício.',
        isActive: true,
        weight: 50,
        metadata: {
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-01-15'),
          testStartedAt: new Date('2024-01-20')
        }
      }
    ],
    trafficSplit: {
      'var_cta_urgencia': 50,
      'var_cta_beneficio': 50
    },
    confidenceLevel: 95,
    minSampleSize: 100,
    duration: 14,
    metadata: {
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-20'),
      startedAt: new Date('2024-01-20')
    }
  },
  {
    id: 'test_dm_bancario_001',
    name: 'DM Bancário - Pergunta vs Afirmação',
    description: 'Testar abordagem com pergunta vs afirmação direta',
    contentId: 'content_bancario_001',
    status: 'running',
    variations: [
      {
        id: 'var_dm_pergunta',
        contentId: 'content_bancario_001',
        variationType: 'dm_message',
        name: 'DM Pergunta',
        description: 'Começa com pergunta para engajar',
        value: 'Boa tarde! Vi seu comentário sobre banco. O banco está descontando do seu salário ou da sua conta?',
        isActive: true,
        weight: 50,
        metadata: {
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
          testStartedAt: new Date('2024-01-22')
        }
      },
      {
        id: 'var_dm_afirmacao',
        contentId: 'content_bancario_001',
        variationType: 'dm_message',
        name: 'DM Afirmação',
        description: 'Começa com afirmação direta',
        value: 'Boa tarde! Recebi seu comentário sobre banco cobrança errada. Já organizei as principais estratégias para contestar cobranças indevidas.',
        isActive: true,
        weight: 50,
        metadata: {
          createdAt: new Date('2024-01-20'),
          updatedAt: new Date('2024-01-20'),
          testStartedAt: new Date('2024-01-22')
        }
      }
    ],
    trafficSplit: {
      'var_dm_pergunta': 50,
      'var_dm_afirmacao': 50
    },
    confidenceLevel: 95,
    minSampleSize: 80,
    duration: 10,
    metadata: {
      createdAt: new Date('2024-01-20'),
      updatedAt: new Date('2024-01-22'),
      startedAt: new Date('2024-01-22')
    }
  }
];

// Mock de métricas de performance
const performanceMetrics: PerformanceMetric[] = [];

class ABTestingService {
  private metrics: Map<string, PerformanceMetric[]> = new Map();

  /**
   * Obtém variação para um usuário baseado no teste A/B
   */
  getVariationForUser(testId: string, userId: string): ContentVariation | null {
    const test = abTests.find(t => t.id === testId);
    if (!test || test.status !== 'running') {
      return null;
    }

    // Hash consistente do usuário para sempre atribuir a mesma variação
    const hash = this.hashCode(userId + testId);
    const totalWeight = 100;
    const bucket = Math.abs(hash) % totalWeight;

    let cumulativeWeight = 0;
    for (const [variationId, weight] of Object.entries(test.trafficSplit)) {
      cumulativeWeight += weight;
      if (bucket < cumulativeWeight) {
        return test.variations.find(v => v.id === variationId) || null;
      }
    }

    return null;
  }

  /**
   * Registra métrica de performance
   */
  async recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): Promise<PerformanceMetric> {
    const performanceMetric: PerformanceMetric = {
      ...metric,
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    // Armazenar métrica
    const testMetrics = this.metrics.get(metric.testId) || [];
    testMetrics.push(performanceMetric);
    this.metrics.set(metric.testId, testMetrics);

    console.log(`METRIC_RECORDED: ${metric.metricType} | ${metric.testId} | ${metric.variationId}`);

    return performanceMetric;
  }

  /**
   * Registra impressão de variação
   */
  async recordImpression(testId: string, variationId: string, userId: string, metadata?: any): Promise<void> {
    await this.recordMetric({
      testId,
      variationId,
      contentId: '', // Será preenchido pelo teste
      metricType: 'impression',
      value: 1,
      metadata: {
        userId,
        ...metadata
      }
    });
  }

  /**
   * Registra clique/comentário
   */
  async recordClick(testId: string, variationId: string, userId: string, metadata?: any): Promise<void> {
    await this.recordMetric({
      testId,
      variationId,
      contentId: '',
      metricType: 'click',
      value: 1,
      metadata: {
        userId,
        ...metadata
      }
    });
  }

  /**
   * Registra lead gerado
   */
  async recordLeadGenerated(testId: string, variationId: string, userId: string, sessionId: string, metadata?: any): Promise<void> {
    await this.recordMetric({
      testId,
      variationId,
      contentId: '',
      metricType: 'lead_generated',
      value: 1,
      metadata: {
        userId,
        sessionId,
        ...metadata
      }
    });
  }

  /**
   * Registra lead qualificado
   */
  async recordQualifiedLead(testId: string, variationId: string, userId: string, sessionId: string, metadata?: any): Promise<void> {
    await this.recordMetric({
      testId,
      variationId,
      contentId: '',
      metricType: 'qualified',
      value: 1,
      metadata: {
        userId,
        sessionId,
        ...metadata
      }
    });
  }

  /**
   * Registra conversão
   */
  async recordConversion(testId: string, variationId: string, userId: string, sessionId: string, metadata?: any): Promise<void> {
    await this.recordMetric({
      testId,
      variationId,
      contentId: '',
      metricType: 'converted',
      value: 1,
      metadata: {
        userId,
        sessionId,
        ...metadata
      }
    });
  }

  /**
   * Calcula resultados do teste
   */
  calculateTestResults(testId: string): TestResult[] {
    const test = abTests.find(t => t.id === testId);
    if (!test) {
      return [];
    }

    const results: TestResult[] = [];

    for (const variation of test.variations) {
      const metrics = this.metrics.get(testId) || [];
      const variationMetrics = metrics.filter(m => m.variationId === variation.id);

      const impressions = variationMetrics.filter(m => m.metricType === 'impression').length;
      const clicks = variationMetrics.filter(m => m.metricType === 'click').length;
      const comments = variationMetrics.filter(m => m.metricType === 'comment').length;
      const leadsGenerated = variationMetrics.filter(m => m.metricType === 'lead_generated').length;
      const qualifiedLeads = variationMetrics.filter(m => m.metricType === 'qualified').length;
      const conversions = variationMetrics.filter(m => m.metricType === 'converted').length;

      const entryRate = impressions > 0 ? (comments / impressions) * 100 : 0;
      const responseRate = comments > 0 ? (leadsGenerated / comments) * 100 : 0;
      const qualificationRate = leadsGenerated > 0 ? (qualifiedLeads / leadsGenerated) * 100 : 0;
      const conversionRate = leadsGenerated > 0 ? (conversions / leadsGenerated) * 100 : 0;

      results.push({
        testId,
        variationId: variation.id,
        impressions,
        clicks,
        comments,
        leadsGenerated,
        qualifiedLeads,
        conversions,
        entryRate,
        responseRate,
        qualificationRate,
        conversionRate,
        confidence: this.calculateConfidence(testId, variation.id)
      });
    }

    return results;
  }

  /**
   * Calcula confiança estatística
   */
  private calculateConfidence(testId: string, variationId: string): number {
    // Simplificado - em produção usar teste estatístico real (Chi-square, Z-test)
    const metrics = this.metrics.get(testId) || [];
    const variationMetrics = metrics.filter(m => m.variationId === variationId);
    const conversions = variationMetrics.filter(m => m.metricType === 'converted').length;
    const total = variationMetrics.filter(m => m.metricType === 'lead_generated').length;

    if (total === 0) return 0;

    // Mock de cálculo de confiança
    const baseRate = 0.05; // 5% taxa base
    const observedRate = conversions / total;
    const improvement = (observedRate - baseRate) / baseRate;
    
    return Math.min(99, Math.max(0, improvement * 100));
  }

  /**
   * Obtém todos os testes ativos
   */
  getActiveTests(): ABTest[] {
    return abTests.filter(test => test.status === 'running');
  }

  /**
   * Obtém teste por ID
   */
  getTestById(testId: string): ABTest | null {
    return abTests.find(t => t.id === testId) || null;
  }

  /**
   * Obtém testes por conteúdo
   */
  getTestsByContent(contentId: string): ABTest[] {
    return abTests.filter(t => t.contentId === contentId);
  }

  /**
   * Obtém insights de otimização
   */
  getOptimizationInsights(): {
    topPerformingVariations: Array<{
      testId: string;
      testName: string;
      variationId: string;
      variationName: string;
      conversionRate: number;
      improvement: number;
    }>;
    underperformingContent: Array<{
      contentId: string;
      contentName: string;
      issue: string;
      suggestion: string;
    }>;
    recommendations: Array<{
      type: 'cta' | 'keyword' | 'dm_message' | 'content_approach';
      priority: 'high' | 'medium' | 'low';
      description: string;
      expectedImpact: string;
    }>;
  } {
    const insights = {
      topPerformingVariations: [] as any[],
      underperformingContent: [] as any[],
      recommendations: [] as any[]
    };

    // Analisar todos os testes para encontrar variações top
    for (const test of abTests) {
      if (test.status !== 'running') continue;

      const results = this.calculateTestResults(test.id);
      const sortedResults = results.sort((a, b) => b.conversionRate - a.conversionRate);
      
      if (sortedResults.length >= 2) {
        const winner = sortedResults[0];
        const runnerUp = sortedResults[1];
        const improvement = winner.conversionRate - runnerUp.conversionRate;

        if (improvement > 1) { // Melhoria significativa
          insights.topPerformingVariations.push({
            testId: test.id,
            testName: test.name,
            variationId: winner.variationId,
            variationName: test.variations.find(v => v.id === winner.variationId)?.name || '',
            conversionRate: winner.conversionRate,
            improvement
          });
        }
      }
    }

    // Gerar recomendações baseadas nos insights
    if (insights.topPerformingVariations.length > 0) {
      insights.recommendations.push({
        type: 'cta',
        priority: 'high',
        description: 'Implementar CTAs com senso de urgência baseados nos resultados',
        expectedImpact: 'Aumento de 15-25% na taxa de engajamento'
      });
    }

    return insights;
  }

  /**
   * Hash simples para atribuição consistente
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

export const abTestingService = new ABTestingService();
