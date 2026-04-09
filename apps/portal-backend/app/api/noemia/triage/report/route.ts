import { NextResponse } from 'next/server';
import { triagePersistence } from '../../../../../lib/services/triage-persistence';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const report = await triagePersistence.generateTriageReport(days);
    
    return NextResponse.json({
      success: true,
      data: report,
      period: `Últimos ${days} dias`
    });
  } catch (error) {
    console.error('ERROR_GENERATING_REPORT:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao gerar relatório',
      data: null
    }, { status: 500 });
  }
}
