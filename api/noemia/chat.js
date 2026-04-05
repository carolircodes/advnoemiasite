// Mock API para NoemIA - Respostas inteligentes baseadas em contexto
const noemiaResponses = {
  // Respostas para benefícios previdenciários
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

  // Respostas para documentos
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

  // Respostas para descontos indevidos
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

  // Resposta padrão para entender caso
  'entender': {
    response: `Vou te ajudar a organizar melhor seu caso! Para entender sua situação completamente, preciso de alguns detalhes.

**Informações importantes para análise inicial:**

**Sobre o problema:**
• O que aconteceu exatamente?
• Quando ocorreu? (data e período)
• Quem está envolvido?
• Quais foram os prejuízos?

**Sobre seus objetivos:**
• O que você espera conseguir?
• Já tentou resolver antes?
• Existe algum prazo urgente?

**Contexto adicional:**
• Já tem documentos sobre o caso?
• Já conversou com outras partes?
• Há testemunhas ou provas?

**Próximos passos:**
1. Com essas informações, posso direcionar melhor
2. Identifico a área jurídica adequada
3. Indico documentos específicos
4. Sugiro o melhor caminho para resolução

Pode me contar mais detalhes? Assim te dou orientação mais precisa!`,
    suggestions: ['Fornecer detalhes', 'Ver áreas de atuação', 'Iniciar triagem']
  },

  // Resposta padrão
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
};

// Simulação de API endpoint
export async function POST(request) {
  try {
    const { message, context } = await request.json();
    
    // Simula tempo de processamento
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Análise da mensagem para encontrar resposta adequada
    const lowerMessage = message.toLowerCase();
    
    let responseKey = 'default';
    
    // Lógica de classificação da mensagem
    if (lowerMessage.includes('benefício') || lowerMessage.includes('aposentadoria') || lowerMessage.includes('inss')) {
      responseKey = 'beneficio';
    } else if (lowerMessage.includes('documento') || lowerMessage.includes('arquivo') || lowerMessage.includes('comprovante')) {
      responseKey = 'documento';
    } else if (lowerMessage.includes('desconto') || lowerMessage.includes('cobrança') || lowerMessage.includes('indevido')) {
      responseKey = 'desconto';
    } else if (lowerMessage.includes('entender') || lowerMessage.includes('caso') || lowerMessage.includes('situação')) {
      responseKey = 'entender';
    }
    
    const responseData = noemiaResponses[responseKey];
    
    return new Response(JSON.stringify({
      success: true,
      answer: responseData.response,
      suggestions: responseData.suggestions,
      category: responseKey,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Erro ao processar sua mensagem',
      answer: 'Desculpe, tive um problema. Tente novamente ou inicie a triagem especializada.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Para OPTIONS (CORS)
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
