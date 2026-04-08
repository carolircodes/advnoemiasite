// TRIAGEM CONVERSACIONAL DA NOEMIA
// Implementação modular para não quebrar o código existente

import type { NoemiaResponse, SessionContext } from './noemia';

// Função auxiliar para detectar tema jurídico
export function detectLegalTheme(message: string): string | null {
  const normalizedMessage = message.toLowerCase();
  
  // Temas sugeridos com palavras-chave específicas
  if (normalizedMessage.includes('aposentar') || normalizedMessage.includes('aposentadoria') || 
      normalizedMessage.includes('inss') || normalizedMessage.includes('benefício') ||
      normalizedMessage.includes('aposentar') || normalizedMessage.includes('previdenciário')) {
    return 'aposentadoria';
  }
  
  if (normalizedMessage.includes('desconto') || normalizedMessage.includes('banco') || 
      normalizedMessage.includes('bancário') || normalizedMessage.includes('cobrança') ||
      normalizedMessage.includes('indevido') || normalizedMessage.includes('empréstimo') ||
      normalizedMessage.includes('juros') || normalizedMessage.includes('financiamento')) {
    return 'desconto-indevido';
  }
  
  if (normalizedMessage.includes('pensão') || normalizedMessage.includes('alimentícia') ||
      normalizedMessage.includes('alimentos') || normalizedMessage.includes('pensão alimentícia')) {
    return 'pensao';
  }
  
  if (normalizedMessage.includes('divórcio') || normalizedMessage.includes('separação') ||
      normalizedMessage.includes('casamento') || normalizedMessage.includes('união estável')) {
    return 'divorcio';
  }
  
  if (normalizedMessage.includes('trabalhista') || normalizedMessage.includes('demissão') || 
      normalizedMessage.includes('trabalho') || normalizedMessage.includes('emprego') ||
      normalizedMessage.includes('rescisão') || normalizedMessage.includes('verbas')) {
    return 'trabalhista';
  }
  
  if (normalizedMessage.includes('família') || normalizedMessage.includes('guarda') ||
      normalizedMessage.includes('filhos') || normalizedMessage.includes('guarda compartilhada')) {
    return 'familia';
  }
  
  return null; // Não detectou tema específico
}

// Função principal da triagem conversacional
export function handleTriageFlow(context: SessionContext, message: string, urlContext?: any): NoemiaResponse | null {
  const triage = context.triage || { active: false, step: 'start', data: {} };
  const normalizedMessage = message.toLowerCase();
  
  // STEP: START - Iniciar triagem
  if (triage.step === 'start') {
    // Detectar se usuário quer iniciar triagem OU se já veio com problema jurídico
    const wantsTriage = normalizedMessage.includes('triagem') || normalizedMessage.includes('iniciar') || 
                        normalizedMessage.includes('começar') || normalizedMessage.includes('consulta') ||
                        normalizedMessage.includes('atendimento') || normalizedMessage.includes('ajuda') ||
                        normalizedMessage.includes('preciso') || normalizedMessage.includes('problema');
    
    const hasLegalIssue = detectLegalTheme(message) !== null;
    
    if (wantsTriage || hasLegalIssue || urlContext?.tema) {
      // Iniciar triagem
      context.triage = { active: true, step: 'theme', data: {} };
      
      // Se já detectou tema, pular para problem
      if (hasLegalIssue || urlContext?.tema) {
        const detectedTheme = urlContext?.tema || detectLegalTheme(message);
        context.triage = { 
          active: true,
          step: 'problem', 
          data: { theme: detectedTheme } 
        };
        
        return {
          message: `Entendi! Seu caso é sobre ${detectedTheme}. Agora, me descreva brevemente qual é o seu problema ou situação. O que aconteceu?`,
          actions: [],
          meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
        };
      }
      
      return {
        message: 'Ótimo! Vou fazer uma triagem rápida para entender seu caso. Primeiro: qual é o tema principal da sua situação?\n\nExemplos:\n• Aposentadoria ou INSS\n• Desconto indevido / bancário\n• Pensão alimentícia\n• Divórcio\n• Trabalhista\n• Outro tema',
        actions: [
          { label: 'Aposentadoria', action: 'theme_aposentadoria' },
          { label: 'Desconto bancário', action: 'theme_desconto' },
          { label: 'Pensão', action: 'theme_pensao' },
          { label: 'Divórcio', action: 'theme_divorcio' },
          { label: 'Trabalhista', action: 'theme_trabalhista' }
        ],
        meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
      };
    }
    
    return null; // Não está em triagem
  }
  
  // STEP: THEME - Identificar tema
  if (triage.step === 'theme') {
    let theme = '';
    
    // Detectar tema pela mensagem
    if (normalizedMessage.includes('aposentadoria') || normalizedMessage.includes('inss') || 
        normalizedMessage.includes('benefício') || normalizedMessage.includes('aposentar')) {
      theme = 'aposentadoria';
    } else if (normalizedMessage.includes('desconto') || normalizedMessage.includes('banco') || 
              normalizedMessage.includes('bancário') || normalizedMessage.includes('cobrança')) {
      theme = 'desconto-indevido';
    } else if (normalizedMessage.includes('pensão') || normalizedMessage.includes('alimentícia')) {
      theme = 'pensao';
    } else if (normalizedMessage.includes('divórcio') || normalizedMessage.includes('separação')) {
      theme = 'divorcio';
    } else if (normalizedMessage.includes('trabalhista') || normalizedMessage.includes('demissão') || 
              normalizedMessage.includes('trabalho')) {
      theme = 'trabalhista';
    } else if (normalizedMessage.includes('família') || normalizedMessage.includes('guarda')) {
      theme = 'familia';
    } else {
      theme = 'outro';
    }
    
    // Salvar tema e avançar
    context.triage = { 
      active: true,
      step: 'problem', 
      data: { ...triage.data, theme } 
    };
    
    return {
      message: `Entendi! Seu caso é sobre ${theme}. Agora, me descreva brevemente qual é o seu problema ou situação. O que aconteceu?`,
      actions: [],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: PROBLEM - Descrição do problema
  if (triage.step === 'problem') {
    // Salvar descrição do problema
    context.triage = { 
      active: true,
      step: 'time', 
      data: { ...triage.data, problem: message } 
    };
    
    return {
      message: 'Obrigado pela descrição. Para entender melhor o tempo: quando essa situação começou ou há quanto tempo está acontecendo?',
      actions: [
        { label: 'Aconteceu agora', action: 'time_agora' },
        { label: 'Últimos dias', action: 'time_dias' },
        { label: 'Últimas semanas', action: 'time_semanas' },
        { label: 'Meses', action: 'time_meses' },
        { label: 'Anos', action: 'time_anos' }
      ],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: TIME - Tempo do problema
  if (triage.step === 'time') {
    let time = '';
    
    // Detectar tempo pela mensagem
    if (normalizedMessage.includes('agora') || normalizedMessage.includes('hoje') || 
        normalizedMessage.includes('recentemente')) {
      time = 'agora';
    } else if (normalizedMessage.includes('dia') || normalizedMessage.includes('dias')) {
      time = 'dias';
    } else if (normalizedMessage.includes('semana') || normalizedMessage.includes('semanas')) {
      time = 'semanas';
    } else if (normalizedMessage.includes('mês') || normalizedMessage.includes('meses')) {
      time = 'meses';
    } else if (normalizedMessage.includes('ano') || normalizedMessage.includes('anos')) {
      time = 'anos';
    } else {
      time = message; // Usa a mensagem original se não detectar
    }
    
    // Salvar tempo e avançar
    context.triage = { 
      active: true,
      step: 'urgency', 
      data: { ...triage.data, time } 
    };
    
    return {
      message: 'Entendi. E qual é o nível de urgência dessa situação para você?',
      actions: [
        { label: 'Urgente - preciso resolver agora', action: 'urgency_urgente' },
        { label: 'Alta - preciso resolver rápido', action: 'urgency_alta' },
        { label: 'Média - posso esperar um pouco', action: 'urgency_media' },
        { label: 'Baixa - não tem pressa', action: 'urgency_baixa' }
      ],
      meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: URGENCY - Nível de urgência
  if (triage.step === 'urgency') {
    let urgencyLevel = '';
    
    // Detectar urgência pela mensagem
    if (normalizedMessage.includes('urgente') || normalizedMessage.includes('imediato') || 
        normalizedMessage.includes('agora')) {
      urgencyLevel = 'urgente';
    } else if (normalizedMessage.includes('alta') || normalizedMessage.includes('rápido')) {
      urgencyLevel = 'alta';
    } else if (normalizedMessage.includes('média') || normalizedMessage.includes('pouco')) {
      urgencyLevel = 'media';
    } else if (normalizedMessage.includes('baixa') || normalizedMessage.includes('pressa')) {
      urgencyLevel = 'baixa';
    } else {
      urgencyLevel = message; // Usa a mensagem original se não detectar
    }
    
    // Finalizar triagem
    context.triage = { 
      active: true,
      step: 'done', 
      data: { ...triage.data, urgency: urgencyLevel } 
    };
    
    // Gerar resumo e CTA
    const { theme, problem, time, urgency } = context.triage?.data || {};
    const summary = `**Resumo da sua triagem:**\n\n• **Tema:** ${theme}\n• **Problema:** ${problem}\n• **Tempo:** ${time}\n• **Urgência:** ${urgency}`;
    
    return {
      message: `${summary}\n\nPerfeito! Com essas informações já consigo te orientar melhor. Sua situação foi registrada e vou encaminhar para análise da nossa equipe.\n\n**Próximos passos:**\n1. Nossa equipe vai analisar seu caso\n2. Entraremos em contato em até 24h\n3. Se necessário, agendaremos uma consulta\n\nEnquanto isso, se precisar falar conosco imediatamente, pode usar o WhatsApp.`,
      actions: [
        { label: 'Falar no WhatsApp agora', href: 'https://wa.me/5511999999999' },
        { label: 'Ver nossos serviços', href: '/services' },
        { label: 'Fazer nova consulta', action: 'restart_triage' }
      ],
      meta: { intent: 'triage_done', profile: 'visitor', source: 'fallback' }
    };
  }
  
  // STEP: DONE - Triagem finalizada
  if (triage.step === 'done') {
    // Permitir reiniciar triagem
    if (normalizedMessage.includes('nova') || normalizedMessage.includes('reiniciar') || 
        normalizedMessage.includes('outra') || normalizedMessage.includes('triagem')) {
      
      context.triage = { active: true, step: 'start', data: {} };
      
      return {
        message: 'Vamos começar uma nova triagem! Qual é o tema principal da sua situação?',
        actions: [
          { label: 'Aposentadoria', action: 'theme_aposentadoria' },
          { label: 'Desconto bancário', action: 'theme_desconto' },
          { label: 'Pensão', action: 'theme_pensao' },
          { label: 'Divórcio', action: 'theme_divorcio' },
          { label: 'Trabalhista', action: 'theme_trabalhista' }
        ],
        meta: { intent: 'triage', profile: 'visitor', source: 'fallback' }
      };
    }
    
    return {
      message: 'Sua triagem já foi concluída! Se precisar de algo novo, fale conosco pelo WhatsApp ou inicie uma nova triagem dizendo "nova triagem".',
      actions: [
        { label: 'Falar no WhatsApp', href: 'https://wa.me/5511999999999' },
        { label: 'Nova triagem', action: 'restart_triage' }
      ],
      meta: { intent: 'triage_done', profile: 'visitor', source: 'fallback' }
    };
  }
  
  return null;
}
