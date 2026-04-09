import { NextResponse } from 'next/server';
import { triagePersistence } from '../../../../../lib/services/triage-persistence';

export async function GET() {
  try {
    const hotLeads = await triagePersistence.getHotLeads(50);
    
    return NextResponse.json({
      success: true,
      data: hotLeads,
      count: hotLeads.length
    });
  } catch (error) {
    console.error('ERROR_GETTING_HOT_LEADS:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar hot leads',
      data: []
    }, { status: 500 });
  }
}
