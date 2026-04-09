import { NextResponse } from 'next/server';
import { triagePersistence } from '../../../../../lib/services/triage-persistence';
import { getCurrentProfile } from '../../../../../lib/auth/guards';

export async function POST(request: Request) {
  try {
    const profile = await getCurrentProfile();
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
      profile?.full_name || profile?.email || 'sistema'
    );
    
    return NextResponse.json({
      success: true,
      message: 'Triagem marcada como atendida com sucesso',
      sessionId,
      attendedBy: profile?.full_name || profile?.email || 'sistema'
    });
  } catch (error) {
    console.error('ERROR_MARKING_AS_ATTENDED:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Erro ao marcar triagem como atendida'
    }, { status: 500 });
  }
}
