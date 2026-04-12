import { NextResponse } from 'next/server';
import { requireInternalApiProfile } from '../../../../../lib/auth/guards';
import { triagePersistence } from '../../../../../lib/services/triage-persistence';

export async function GET() {
  try {
    const access = await requireInternalApiProfile();

    if (!access.ok) {
      return NextResponse.json(
        { success: false, error: access.error, data: [] },
        { status: access.status }
      );
    }

    const triages = await triagePersistence.getTriageForHumanAttention(100);
    
    return NextResponse.json({
      success: true,
      data: triages,
      count: triages.length
    });
  } catch (error) {
    console.error('ERROR_GETTING_ALL_TRIAGE:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao buscar triagens',
      data: []
    }, { status: 500 });
  }
}
