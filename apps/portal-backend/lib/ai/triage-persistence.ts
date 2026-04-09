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
    completude: conversationState.triageCompleteness
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
      userFriendlySummary: generateUserFriendlySummary(conversationState)
    }
  );
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
