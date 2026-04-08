// MOTOR INTERNO DA NOEMIA - 100% AUTÔNOMO SEM OPENAI

import "server-only";
import type { PortalProfile } from "../auth/guards";
import { askNoemiaSchema, caseAreaLabels } from "../domain/portal";
import { getServerEnv } from "../config/env";
import { getContextFromURL } from "./noemia";

// Funções auxiliares para motor interno
function detectLegalTheme(message: string): string {
  const msg = message.toLowerCase();
  
  if (msg.includes('aposentador') || msg.includes('inss') || msg.includes('benefício') || msg.includes('auxílio')) {
    return 'previdenciario';
  }
  if (msg.includes('banco') || msg.includes('empréstimo') || msg.includes('juros') || msg.includes('cobrança') || msg.includes('financiamento')) {
    return 'bancario';
  }
  if (msg.includes('divórcio') || msg.includes('pensão') || msg.includes('guarda') || msg.includes('filhos') || msg.includes('casamento') || msg.includes('separação')) {
    return 'familia';
  }
  if (msg.includes('contrato') || msg.includes('indenização') || msg.includes('dano') || msg.includes('responsabilidade')) {
    return 'civil';
  }
  
  return 'geral';
}

function detectConversationStage(sessionContext: any, intent: string): string {
  const history = sessionContext.history;
  
  // Primeira mensagem
  if (history.length === 0) {
    return 'welcome';
  }
  
  // Follow-up da mesma intenção
  if (history.length > 0 && sessionContext.lastIntent === intent) {
    return 'followup';
  }
  
  // Mudança de tema
  if (history.length > 0 && sessionContext.lastIntent !== intent) {
    return 'topic_change';
  }
  
  return 'continuation';
}

function buildInternalResponse(
  intent: string, 
  theme: string, 
  stage: string, 
  audience: string, 
  profile: PortalProfile | null,
  sessionContext: any
): { message: string; actions: any[] } {
  const actions: any[] = [];
  let message = '';
  
  // BLOQUEIO DE CONSULTORIA GRATUITA - apenas para visitors
  if (audience === 'visitor' && intent === 'legal_advice_request') {
    message = `Entendi sua situação. Para te orientar com precisão e segurança jurídica, é necessário analisar seu caso em detalhes.\n\nPosso te ajudar de duas formas:\n\n1. **Agendar consulta** (R$150) - Análise completa com a advogada\n2. **Falar no WhatsApp** - Triagem inicial gratuita\n\nQual prefere?`;
    
    actions.push({
      type: 'cta',
      label: 'Agendar consulta (R$150)',
      url: '/consulta'
    });
    actions.push({
      type: 'cta', 
      label: 'Falar no WhatsApp',
      url: 'https://wa.me/55996248241'
    });
    
    return { message, actions };
  }
  
  // RESPOSTAS POR INTENÇÃO E AUDIÊNCIA
  switch (intent) {
    case 'greeting':
      if (audience === 'staff') {
        message = `Olá! Como posso ajudar com suas tarefas hoje?`;
        actions.push({ type: 'quick_reply', label: 'Ver agenda' });
        actions.push({ type: 'quick_reply', label: 'Prioridades' });
      } else if (audience === 'client') {
        message = `Olá ${profile?.full_name || ''}! Como posso ajudar com seu caso hoje?`;
        actions.push({ type: 'quick_reply', label: 'Ver meu processo' });
        actions.push({ type: 'quick_reply', label: 'Falar com advogada' });
      } else {
        message = `Olá! Sou a NoemIA, assistente virtual do escritório Noemia Paixão Advocacia.\n\nPosso te ajudar com:\n\n1. **Triagem inicial** - Entender seu caso\n2. **Agendar consulta** - Atendimento com advogada\n3. **Dúvidas gerais** - Como funciona\n\nSobre o que precisa?`;
        actions.push({ type: 'cta', label: 'Fazer triagem', url: '/triagem' });
        actions.push({ type: 'cta', label: 'Agendar consulta', url: '/consulta' });
      }
      break;
      
    case 'agenda_request':
      if (audience === 'staff') {
        message = `Sua agenda está organizada. Você tem pendências importantes hoje. Quer ver os detalhes?`;
        actions.push({ type: 'quick_reply', label: 'Ver detalhes' });
      } else {
        message = `Para agendar atendimento, você pode:\n\n1. **Consulta presencial** (R$150)\n2. **Atendimento online** (R$150)\n3. **Triagem gratuita** - Primeira análise\n\nQual prefere?`;
        actions.push({ type: 'cta', label: 'Agendar consulta', url: '/consulta' });
        actions.push({ type: 'cta', label: 'Fazer triagem', url: '/triagem' });
      }
      break;
      
    case 'documents_request':
      if (audience === 'client') {
        message = `Você pode enviar documentos pelo portal do cliente. Acesse sua área para fazer upload dos arquivos necessários ao seu caso.`;
        actions.push({ type: 'cta', label: 'Acessar portal', url: '/portal' });
      } else if (audience === 'staff') {
        message = `Você tem documentos pendentes para análise. Quer verificar a lista?`;
        actions.push({ type: 'quick_reply', label: 'Ver pendências' });
      } else {
        message = `Para análise de documentos, é necessário fazer o cadastro inicial. Posso te ajudar a iniciar o processo?`;
        actions.push({ type: 'cta', label: 'Iniciar cadastro', url: '/triagem' });
      }
      break;
      
    case 'legal_advice_request':
      if (audience === 'client') {
        message = `Entendo sua dúvida. Como cliente, você tem acesso completo. Posso te ajudar com:\n\n1. **Análise do seu caso**\n2. **Próximos passos**\n3. **Falar com advogada**\n\nO que precisa?`;
        actions.push({ type: 'quick_reply', label: 'Analisar meu caso' });
        actions.push({ type: 'quick_reply', label: 'Falar com advogada' });
      } else if (audience === 'staff') {
        message = `Análise jurídica solicitada. Posso ajudar com:\n\n1. **Resumo do caso**\n2. **Estratégia sugerida**\n3. **Documentos necessários**\n\nO que precisa?`;
        actions.push({ type: 'quick_reply', label: 'Resumir caso' });
        actions.push({ type: 'quick_reply', label: 'Sugerir estratégia' });
      }
      // Bloqueio para visitors já tratado no início
      break;
      
    case 'case_status':
      if (audience === 'client') {
        message = `Para verificar o status do seu caso, acesse o portal do cliente. Lá você encontra:\n\n- Andamento atual\n- Próximos passos\n- Documentos pendentes\n- Agenda\n\nQuer acesso ao portal?`;
        actions.push({ type: 'cta', label: 'Acessar portal', url: '/portal' });
      } else if (audience === 'staff') {
        message = `Status dos casos em andamento. Você pode:\n\n1. **Ver fila atual**\n2. **Priorizar casos urgentes**\n3. **Ver detalhes específicos**\n\nO que precisa?`;
        actions.push({ type: 'quick_reply', label: 'Ver fila' });
        actions.push({ type: 'quick_reply', label: 'Casos urgentes' });
      } else {
        message = `Para acompanhar um caso, é necessário ser cliente cadastrado. Posso te ajudar a iniciar o processo de atendimento?`;
        actions.push({ type: 'cta', label: 'Fazer triagem', url: '/triagem' });
      }
      break;
      
    case 'priority_request':
      if (audience === 'staff') {
        message = `Análise de prioridades. Você tem:\n\n- 3 casos urgentes\n- 2 documentos críticos\n- 1 audiência hoje\n\nQuer organizar por ordem?`;
        actions.push({ type: 'quick_reply', label: 'Organizar por urgência' });
        actions.push({ type: 'quick_reply', label: 'Ver detalhes' });
      } else {
        message = `Para prioridades específicas, fale diretamente com a equipe. Posso te conectar com alguém agora?`;
        actions.push({ type: 'cta', label: 'Falar com equipe', url: '/contato' });
      }
      break;
      
    default:
      // Resposta genérica baseada no tema
      const themeResponses = {
        'previdenciario': `Entendi sua dúvida sobre previdenciário. Muitas pessoas passam por isso. Para te ajudar com precisão, preciso analisar seu caso específico.\n\nPosso te orientar sobre:\n\n1. **Aposentadoria** - Regras e cálculos\n2. **Benefícios** - Auxílios e pensões\n3. **Recursos** - Revisões e apelações\n\nQual sua situação?`,
        'bancario': `Entendi seu problema com o banco. Isso é muito comum e você pode ter direitos. Para te ajudar, preciso entender melhor:\n\n1. **Tipo de problema** - Juros, cobrança, contrato?\n2. **Valores envolvidos**\n3. **Documentos que tem\n\nMe conta mais detalhes?`,
        'familia': `Compreendo sua situação familiar. Esses momentos são delicados e você merece orientação segura. Posso ajudar com:\n\n1. **Divórcio** - Consensual ou litigioso\n2. **Pensão** - Alimentos e guarda\n3. **Herança** - Partilha e inventário\n\nSobre o que precisa?`,
        'civil': `Entendi sua questão civil. Para te orientar corretamente, preciso saber:\n\n1. **Tipo de contrato** ou situação\n2. **O que aconteceu** - Descumprimento? Dano?\n3. **O que busca** - Indenização? Cumprimento?\n\nMe explica melhor?`,
        'geral': `Entendi sua dúvida. Sou a NoemIA e posso te ajudar com diversas áreas do direito.\n\n**Atuo principalmente em:**\n- Previdenciário (aposentadoria, benefícios)\n- Bancário (juros, cobranças)\n- Família (divórcio, pensão)\n- Civil (contratos, indenizações)\n\nQual sua situação?`
      };
      
      message = themeResponses[theme as keyof typeof themeResponses] || themeResponses.geral;
      
      if (audience === 'visitor') {
        actions.push({ type: 'cta', label: 'Fazer triagem', url: '/triagem' });
        actions.push({ type: 'cta', label: 'Agendar consulta', url: '/consulta' });
      }
      break;
  }
  
  // Adicionar CTAs extras para clientes
  if (audience === 'client') {
    actions.push({ type: 'cta', label: 'Ver meu processo', url: '/portal' });
    actions.push({ type: 'cta', label: 'Falar com advogada', url: '/contato' });
  }
  
  return { message, actions };
}

// Importar funções do arquivo original
const sessionContexts = new Map<string, SessionContext>();

interface SessionContext {
  history: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  lastIntent?: string;
  lastMessage?: string;
  profile?: string;
}

function getSessionContext(sessionId: string): SessionContext {
  if (!sessionContexts.has(sessionId)) {
    sessionContexts.set(sessionId, {
      history: []
    });
  }
  return sessionContexts.get(sessionId)!;
}

function updateSessionContext(sessionId: string, message: string, intent: string, profile: string): void {
  const context = getSessionContext(sessionId);
  context.lastIntent = intent;
  context.lastMessage = message;
  context.profile = profile;
  
  // Adicionar mensagem do usuário ao histórico
  context.history.push({
    role: "user",
    content: message,
    timestamp: new Date()
  });
  
  // Manter apenas últimas 20 mensagens
  if (context.history.length > 20) {
    context.history = context.history.slice(-20);
  }
}

function detectUserIntent(message: string): string {
  const msg = message.toLowerCase();
  
  // Saudações
  if (msg.includes('oi') || msg.includes('olá') || msg.includes('bom dia') || msg.includes('boa tarde') || msg.includes('boa noite')) {
    return 'greeting';
  }
  
  // Agenda
  if (msg.includes('agenda') || msg.includes('agendar') || msg.includes('consulta') || msg.includes('horário')) {
    return 'agenda_request';
  }
  
  // Documentos
  if (msg.includes('documento') || msg.includes('arquivo') || msg.includes('enviar') || msg.includes('upload')) {
    return 'documents_request';
  }
  
  // Status do caso
  if (msg.includes('status') || msg.includes('andamento') || msg.includes('processo') || msg.includes('caso')) {
    return 'case_status';
  }
  
  // Prioridades
  if (msg.includes('prioridade') || msg.includes('urgente') || msg.includes('importante')) {
    return 'priority_request';
  }
  
  // Consultoria jurídica (bloqueio para visitors)
  if (msg.includes('o que fazer') || msg.includes('posso me aposentar') || msg.includes('banco cobrou') || 
      msg.includes('não paga pensão') || msg.includes('demissão injusta') || msg.includes('herança') || 
      msg.includes('divórcio') || msg.includes('como funciona') || msg.includes('meus direitos') || 
      msg.includes('devo entrar na justiça') || msg.includes('quanto tempo demora') || 
      msg.includes('preciso de advogado') || msg.includes('me ajuda') || msg.includes('quanto custa')) {
    return 'legal_advice_request';
  }
  
  return 'general';
}

function recordNoemiaMetrics(data: any): void {
  // Placeholder para métricas - implementar conforme necessário
  console.log('[NoemIA Metrics]', JSON.stringify(data, null, 2));
}

// FUNÇÃO PRINCIPAL - MOTOR INTERNO
export async function answerNoemia(rawInput: unknown, profile: PortalProfile | null, currentPath?: string) {
  const startTime = Date.now();
  const input = askNoemiaSchema.parse(rawInput);
  const requestedAudience = input.audience;
  
  // Extrair contexto da URL
  const urlContext = getContextFromURL(currentPath);
  
  // Gerar ID de sessão simples (em produção usar algo mais robusto)
  const sessionId = profile?.id || 'visitor-' + Math.random().toString(36).substr(2, 9);

  let effectiveAudience =
    requestedAudience === "staff" && profile && profile.role !== "cliente"
      ? "staff"
      : requestedAudience === "client" && profile?.role === "cliente"
        ? "client"
        : "visitor";

  if (requestedAudience === "client" && (!profile || profile.role !== "cliente")) {
    console.log("[noemia] Cliente nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  if (requestedAudience === "staff" && (!profile || profile.role === "cliente")) {
    console.log("[noemia] Staff nao autenticado, usando audience visitor");
    effectiveAudience = "visitor";
  }

  // Detectar intenção e atualizar contexto
  const intent = detectUserIntent(input.message);
  updateSessionContext(sessionId, input.message, intent, effectiveAudience);
  
  // Pegar contexto da sessão
  const sessionContext = getSessionContext(sessionId);
  
  // Detectar tema jurídico
  const legalTheme = detectLegalTheme(input.message);
  
  // Detectar estágio da conversa
  const conversationStage = detectConversationStage(sessionContext, intent);
  
  // Construir resposta interna
  const internalResponse = buildInternalResponse(
    intent, 
    legalTheme, 
    conversationStage, 
    effectiveAudience, 
    profile, 
    sessionContext
  );
  
  // Salvar resposta no histórico
  sessionContext.history.push({
    role: "assistant",
    content: internalResponse.message,
    timestamp: new Date()
  });
  
  // Registrar métricas
  recordNoemiaMetrics({
    question: input.message,
    intent,
    profile: effectiveAudience,
    source: "internal",
    timestamp: new Date(),
    actions: internalResponse.actions,
    sessionId,
    responseTime: Date.now() - startTime,
    tema: urlContext.tema,
    origem: urlContext.origem
  });

  return {
    audience: effectiveAudience,
    answer: internalResponse.message,
    actions: internalResponse.actions
  };
}
