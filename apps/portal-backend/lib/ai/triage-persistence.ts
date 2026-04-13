/**
 * Salvar dados da triagem no banco de dados
 */
import { triagePersistence, TriageData } from "../services/triage-persistence";
import { NoemiaCoreInput, ConversationState } from "./noemia-core";

export async function saveTriageData(
  input: NoemiaCoreInput,
  conversationState: ConversationState,
  classification: {
    theme: string;
    intent: string;
    leadTemperature: string;
  }
): Promise<void> {
  // Salvar apenas se a triagem tiver dados suficientes
  if (conversationState.triageCompleteness < 20) {
    return; // Não salvar triagens muito iniciais
  }

  const triageData: TriageData = {
    // Bloco A - Tema Principal
    area: conversationState.collectedData.area,
    
    // Bloco B - O Que Aconteceu
    problema_principal: conversationState.collectedData.problema_principal,
    
    // Bloco C - Tempo / Momento
    timeframe: conversationState.collectedData.timeframe,
    acontecendo_agora: conversationState.collectedData.acontecendo_agora,
    
    // Bloco D - Documentos / Provas
    tem_documentos: conversationState.collectedData.tem_documentos,
    tipos_documentos: conversationState.collectedData.tipos_documentos,
    
    // Bloco E - Objetivo do Cliente
    objetivo_cliente: conversationState.collectedData.objetivo_cliente,
    
    // Bloco F - Urgência
    nivel_urgencia: conversationState.collectedData.nivel_urgencia,
    prejuizo_ativo: conversationState.collectedData.prejuizo_ativo,
    
    // Metadados
    palavras_chave: conversationState.collectedData.palavras_chave,
    completude: conversationState.triageCompleteness,
    conversation_status: conversationState.conversationStatus,
    triage_stage: conversationState.triageStage,
    consultation_stage: conversationState.consultationStage,
    scheduling_preferences: conversationState.contactPreferences,
    handoff_policy: {
      status: conversationState.readyForHandoff ? 'allowed' : 'blocked_as_premature',
      allowed: conversationState.readyForHandoff,
      blocked: !conversationState.readyForHandoff && conversationState.needsHumanAttention,
      reason: conversationState.handoffReason || null,
      legitimate: conversationState.readyForHandoff
    },
    report: buildStructuredReport(input, conversationState, classification)
  };

  // Extrair userId do metadata ou context
  const userId = (input.metadata?.userId as string) ||
                 (input.context as any)?.userId ||
                 (input.conversationState as any)?.userId ||
                 'unknown';

  await triagePersistence.saveTriageData(
    input.metadata?.sessionId as string || 'unknown',
    triageData,
    {
      channel: input.channel,
      userId,
      isHotLead: conversationState.isHotLead,
      needsHumanAttention: conversationState.needsHumanAttention,
      handoffReason: conversationState.handoffReason,
      internalSummary: generateInternalSummary(conversationState),
      userFriendlySummary: generateUserFriendlySummary(conversationState),
      conversationStatus: conversationState.conversationStatus,
      consultationStage: conversationState.consultationStage,
      reportData: triageData.report,
      lawyerNotificationGenerated: conversationState.lawyerNotificationGenerated
    }
  );
}

function buildStructuredReport(
  input: NoemiaCoreInput,
  state: ConversationState,
  classification: {
    theme: string;
    intent: string;
    leadTemperature: string;
  }
) {
  const data = state.collectedData;
  const facts = [
    data.problema_principal,
    data.timeframe ? `Contexto temporal: ${data.timeframe}` : null,
    data.tem_documentos !== undefined
      ? data.tem_documentos
        ? 'Informou que possui documentos/provas.'
        : 'Ainda não confirmou documentos disponíveis.'
      : null,
    data.objetivo_cliente ? `Objetivo declarado: ${data.objetivo_cliente}` : null
  ].filter(Boolean) as string[];

  return {
    resumo_caso:
      data.problema_principal ||
      'Caso ainda em organização inicial pela NoemIA.',
    area_juridica: data.area || classification.theme || 'geral',
    fatos_principais: facts,
    problema_central: data.problema_principal || 'A definir na triagem',
    cronologia: data.timeframe || 'Cronologia ainda em coleta',
    sinais_urgencia:
      data.nivel_urgencia && data.nivel_urgencia !== 'baixa'
        ? [`Urgência ${data.nivel_urgencia}`]
        : [],
    documentos_mencionados: data.tipos_documentos || [],
    documentos_pendentes:
      data.tem_documentos === false ? ['Documentos ainda não enviados'] : [],
    respostas_relevantes: data.palavras_chave || [],
    nivel_interesse: state.leadTemperature,
    status_consulta: state.consultationStage || 'not_offered',
    preferencias_dia_horario: state.contactPreferences?.availability || '',
    observacoes_livres: state.handoffReason || '',
    canal_origem: input.channel,
    pipeline_id:
      typeof input.metadata?.pipelineId === 'string' ? input.metadata.pipelineId : null,
    next_best_action: state.recommendedAction
  };
}

function generateUserFriendlySummary(state: ConversationState): string {
  const data = state.collectedData;
  const parts: string[] = [];
  
  if (data.area) parts.push(`Área: ${data.area}`);
  if (data.problema_principal) parts.push(`Situação: ${data.problema_principal.substring(0, 80)}${data.problema_principal.length > 80 ? '...' : ''}`);
  if (data.timeframe && data.timeframe !== 'não especificado') parts.push(`Quando: ${data.timeframe}`);
  if (data.tem_documentos) parts.push(`Documentos: ${data.tipos_documentos && data.tipos_documentos.length > 0 ? data.tipos_documentos.join(', ') : 'disponíveis'}`);
  if (data.objetivo_cliente) parts.push(`Objetivo: ${data.objetivo_cliente.substring(0, 60)}${data.objetivo_cliente.length > 60 ? '...' : ''}`);
  if (data.nivel_urgencia && data.nivel_urgencia !== 'baixa') parts.push(`Urgência: ${data.nivel_urgencia}`);
  
  return parts.join(' | ');
}

function generateInternalSummary(state: ConversationState): string {
  const data = state.collectedData;
  return `
=== RESUMO DA TRIAGEM ===
Área Jurídica: ${data.area || 'não identificada'}
Problema Principal: ${data.problema_principal || 'não informado'}
Timeframe: ${data.timeframe || 'não informado'}
Acontecendo Agora: ${data.acontecendo_agora ? 'Sim' : 'Não'}
Tem Documentos: ${data.tem_documentos ? 'Sim' : 'Não'}
Tipos de Documentos: ${data.tipos_documentos?.join(', ') || 'N/A'}
Objetivo do Cliente: ${data.objetivo_cliente || 'não informado'}
Nível de Urgência: ${data.nivel_urgencia || 'não avaliado'}
Prejuízo Ativo: ${data.prejuizo_ativo ? 'Sim' : 'Não'}
Completude da Triagem: ${state.triageCompleteness}%
Necessita Atenção Humana: ${state.needsHumanAttention ? 'Sim' : 'Não'}
Motivo: ${state.handoffReason || 'N/A'}
Palavras-chave: ${data.palavras_chave?.join(', ') || 'N/A'}
========================
  `.trim();
}
