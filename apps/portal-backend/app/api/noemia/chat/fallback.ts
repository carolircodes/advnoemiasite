// Fallback API para NoemIA - Funciona mesmo sem OpenAI configurada
import { NextResponse } from "next/server";

const fallbackResponses = {
  visitor: {
    'beneficio': {
      response: `Entendi sua dúvida sobre benefícios previdenciários. Posso te orientar sobre os principais tipos:

**Benefícios que posso analisar:**
• **Aposentadoria por INSS** - idade, tempo de contribuição ou especial
• **Auxílio-doença** - incapacidade temporária para trabalho
• **Aposentadoria por invalidez** - incapacidade permanente
• **Auxílio-acidente** - sequelas de acidente de trabalho
• **Pensão por morte** - dependentes de segurado falecido
• **BPC/LOAS** - benefício para pessoas em vulnerabilidade

**Para análise completa, preciso saber:**
1. Qual benefício você busca?
2. Já teve algum pedido negado?
3. Há quanto tempo contribui com o INSS?
4. Sua idade e situação atual?

Posso te ajudar a entender os documentos necessários e o melhor caminho para seu caso.`,
      suggestions: ['Iniciar triagem previdenciária', 'Ver documentos necessários', 'Falar com advogada']
    },
    'documento': {
      response: `Ótima pergunta! Documentação correta é fundamental para agilizar seu processo.

**Documentos essenciais por área:**

**Direito Previdenciário:**
• RG e CPF (seus e dependentes)
• Comprovantes de residência (últimos 3 meses)
• Carteira de trabalho (todas as páginas)
• Extratos do INSS
• Laudos médicos (se aplicável)
• Certidões (nascimento, casamento, etc.)

**Direito do Consumidor/Bancário:**
• Contratos envolvidos
• Comprovantes de pagamentos
• Extratos bancários
• Faturas ou boletos contestados
• E-mails ou correspondências
• Notificações recebidas

**Direito de Família:**
• Documentos pessoais dos envolvidos
• Certidão de casamento (se casado)
• Certidões de nascimento dos filhos
• Comprovantes de rendimentos
• Declaração de bens (se aplicável)

**Dica importante:** Mantenha cópias digitais de tudo e organize por ordem cronológica. Isso acelera muito a análise do seu caso!`,
      suggestions: ['Iniciar triagem', 'Enviar documentos', 'Agendar consulta']
    },
    'desconto': {
      response: `Descontos indevidos exigem ação rápida! Vou te orientar sobre os principais tipos e o que fazer.

**Tipos comuns de descontos indevidos:**

**Em conta bancária:**
• Empréstimos não contratados
• Tarifas abusivas
• Débitos não autorizados
• Cobranças duplicadas

**Em benefícios INSS:**
• Empréstimos consignados irregulares
• Descontos indevidos de planos de saúde
• Retenções fiscais incorretas
• Descontos para empresas inexistentes

**Em folha de pagamento:**
• Adiantamentos não solicitados
• Descontos de benefícios não recebidos
• Contribuições sindicais indevidas

**Passos imediatos:**
1. **Reúna comprovantes** dos últimos 6-12 meses
2. **Contate** a empresa/banco por escrito
3. **Registre** todas as comunicações
4. **Busque** orientação jurídica especializada

**Prazos importantes:** Muitos casos têm prazos curtos para contestação. Não perca tempo!`,
      suggestions: ['Iniciar triagem urgente', 'Reunir documentos', 'Falar com advogada']
    },
    'default': {
      response: `Entendi sua dúvida. Sou a NoemIA, assistente inteligente especializada em orientação jurídica inicial.

**Como posso te ajudar:**

🔍 **Análise preliminar** - Entendo melhor seu caso
📋 **Documentação** - Indico os documentos necessários  
🎯 **Direcionamento** - Aponto o melhor caminho
⚖️ **Estratégia** - Sugiro próximos passos

**Minhas especialidades:**
• Direito Previdenciário (INSS e benefícios)
• Direito do Consumidor e Bancário
• Direito de Família
• Direito Civil

**Importante:** Minha orientação é inicial e organizativa. Para análise jurídica completa e representação, você precisará falar com a Dra. Noêmia ou equipe especializada.

**Sugestões:**
• Descreva seu caso com mais detalhes
• Mencione prazos urgentes
• Informe se já tem algum documento

Pode me contar mais sobre sua situação?`,
      suggestions: ['Descrever caso detalhado', 'Ver áreas de atuação', 'Iniciar triagem']
    }
  },
  client: {
    'default': {
      response: `Posso ajudar você a entender melhor o que aparece no seu portal. Como cliente autenticado, você tem acesso a informações importantes do seu caso.

**O que posso explicar no seu portal:**
• **Status do caso** - O que significa cada etapa
• **Documentos** - Quais estão pendentes e por quê
• **Agenda** - Próximas datas e compromissos
• **Atualizações** - Últimas movimentações do seu processo

**Para usar melhor o portal:**
1. **Verifique regularmente** - Novos documentos podem ser solicitados
2. **Envie documentos solicitados** o mais rápido possível
3. **Confirme compromissos** na agenda
4. **Entre em contato** se tiver dúvidas sobre alguma atualização

**Nota:** No momento estou operando em modo simplificado. Para análise completa do seu caso específico, sugiro falar diretamente com a equipe responsável.`,
      suggestions: ['Ver meu painel', 'Ver documentos pendentes', 'Agendar consulta']
    }
  },
  staff: {
    'default': {
      response: `Como perfil interno, posso ajudar na rotina operacional do escritório. No momento estou operando em modo simplificado.

**O que posso apoiar na operação:**
• **Resumo de prioridades** - O que tratar primeiro
• **Triagens recentes** - Novos casos em análise
• **Documentos pendentes** - O que está aguardando
• **Agenda** - Compromissos próximos

**Para operação completa:**
Acesse o painel operacional para dados detalhados de:
• Filas de hoje
• Casos aguardando cliente
• Triagens em andamento
• Métricas de produtividade

**Recomendação:** Use o painel principal para operação completa e me contate para dúvidas rápidas ou resumos.`,
      suggestions: ['Ver painel operacional', 'Analisar triagens', 'Ver casos recentes']
    }
  }
};

function classifyMessage(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('benefício') || lowerMessage.includes('aposentadoria') || lowerMessage.includes('inss')) {
    return 'beneficio';
  } else if (lowerMessage.includes('documento') || lowerMessage.includes('arquivo') || lowerMessage.includes('comprovante')) {
    return 'documento';
  } else if (lowerMessage.includes('desconto') || lowerMessage.includes('cobrança') || lowerMessage.includes('indevido')) {
    return 'desconto';
  }
  
  return 'default';
}

export async function POST(request: Request) {
  try {
    console.log("[fallback] Iniciando fallback handler");
    
    let body;
    try {
      const text = await request.text();
      console.log("[fallback] Raw body recebido:", text);
      body = JSON.parse(text);
      console.log("[fallback] Payload parseado:", body);
    } catch (parseError) {
      console.error("[fallback] Erro ao parsear JSON:", parseError);
      body = { message: "", audience: "visitor" };
    }
    
    const { message = "", audience = 'visitor' } = body;
    
    if (!message || typeof message !== 'string') {
      console.log("[fallback] Mensagem inválida, usando mensagem padrão");
      return NextResponse.json({
        ok: true,
        audience: 'visitor',
        answer: "Olá! Sou a NoemIA. Como posso te ajudar hoje?",
        suggestions: ['Iniciar triagem', 'Ver áreas de atuação', 'Falar com advogada'],
        fallbackMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Simula tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Classificar mensagem
    const messageClass = audience === 'visitor' ? classifyMessage(message) : 'default';
    console.log("[fallback] Mensagem classificada como:", messageClass);
    
    // Obter resposta
    const audienceData = fallbackResponses[audience as keyof typeof fallbackResponses];
    const responseData = audienceData?.[messageClass as keyof typeof audienceData] || audienceData?.['default' as keyof typeof audienceData] || fallbackResponses.visitor.default;
    console.log("[fallback] Resposta encontrada, audience:", audience, "class:", messageClass);
    
    return NextResponse.json({
      ok: true,
      audience,
      answer: responseData.response,
      suggestions: responseData.suggestions,
      fallbackMode: true,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error("[fallback] Erro no fallback handler:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro ao processar mensagem",
        answer: "Desculpe, tive um problema. Tente novamente ou inicie a triagem especializada.",
        fallbackMode: true
      },
      { status: 500 }
    );
  }
}
