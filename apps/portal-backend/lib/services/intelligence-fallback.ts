// Fallback service para intelligence quando Supabase não está configurado

export async function getBusinessIntelligenceOverview(days: number) {
  // Dados mock para BI quando Supabase não está disponível
  return {
    summary: {
      triageAbandonmentRate: 15.2,
      triageToClientRate: 68.5,
      portalActivationRate: 82.3
    },
    insights: [
      {
        metric: 'Taxa de conversão',
        value: 68.5,
        trend: 'up',
        description: 'Melhora na conversão de triagem para cliente'
      },
      {
        metric: 'Ativação do portal',
        value: 82.3,
        trend: 'stable',
        description: 'Taxa de ativação do portal está estável'
      }
    ],
    trends: {
      triageVolume: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 12 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 15 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 18 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 14 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 20 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], count: 16 },
        { date: new Date().toISOString().split('T')[0], count: 22 }
      ],
      conversionRates: [
        { date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 65.2 },
        { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 67.8 },
        { date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 69.1 },
        { date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 68.3 },
        { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 70.2 },
        { date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], rate: 67.9 },
        { date: new Date().toISOString().split('T')[0], rate: 68.5 }
      ]
    }
  };
}
