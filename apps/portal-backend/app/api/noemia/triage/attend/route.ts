import { NextResponse } from 'next/server';
import { triagePersistence } from '../../../../../lib/services/triage-persistence';
import { requireInternalApiProfile } from '../../../../../lib/auth/guards';

export async function POST(request: Request) {
  try {
    const access = await requireInternalApiProfile();

    if (!access.ok) {
      return NextResponse.json({ success: false, error: access.error }, { status: access.status });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'sessionId é obrigatório'
      }, { status: 400 });
    }

    // Marcar como atendido por humano
    await triagePersistence.markAsAttendedByHuman(
      sessionId, 
      access.profile.full_name || access.profile.email || 'sistema'
    );
    
    return NextResponse.json({
      success: true,
      message: 'Triagem marcada como atendida com sucesso',
      sessionId,
      attendedBy: access.profile.full_name || access.profile.email || 'sistema'
    });
  } catch (error) {
    console.error('ERROR_MARKING_AS_ATTENDED:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao marcar triagem como atendida'
    }, { status: 500 });
  }
}
