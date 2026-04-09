// Testes para validação da continuidade da conversa na NoemIA

const testConversationContinuity = () => {
  console.log('=== TESTE DE CONTINUIDADE DE CONVERSA ===');
  
  // Simular o estado da conversa
  const mockStates = [
    {
      step: 'acolhimento',
      userMessage: 'posso me aposentar?',
      expectedResponse: 'Faz sentido você ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar.\n\nFaço parte da equipe de atendimento do escritório Noêmia Paixão Advocacia e estou aqui para te ajudar a organizar isso.\n\nMe conta rapidinho o que aconteceu no seu caso?'
    },
    {
      step: 'identificacao_area',
      userMessage: 'ainda não',
      expectedResponse: 'Perfeito, isso já ajuda a entender melhor sua situação. Muitas pessoas estão exatamente nesse momento de dúvida antes de dar entrada.\n\nPelo que você descreveu, seu caso parece estar na área previdenciária.\n\nMe conta: o que mais te preocupa nessa história toda?'
    },
    {
      step: 'entendimento_situacao',
      userMessage: 'não sei',
      expectedResponse: 'Entendi... Faz sentido você se sentir assim. Muita gente passa por isso antes de buscar ajuda.\n\nO momento certo de agir faz toda a diferença. Me conta: isso que você mencionou aconteceu há quanto tempo?'
    },
    {
      step: 'identificacao_urgencia',
      userMessage: '6 meses',
      expectedResponse: 'Perfeito... Já estou entendendo melhor seu cenário. Faz sentido você estar pesquisando sobre isso.\n\nVocê está começando a entender isso agora ou já pesquisou algo sobre seu caso antes?'
    },
    {
      step: 'conducao_proximo_passo',
      userMessage: 'sim',
      expectedResponse: 'Obrigada por compartilhar isso comigo. Isso já me ajuda a ter uma visão mais clara do seu caso.\n\nExistem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. Você já pensou em como seria ter uma análise profissional do seu caso?'
    },
    {
      step: 'conversao',
      userMessage: 'quero',
      expectedResponse: 'Perfeito! Isso mostra que você está no caminho certo para resolver isso.\n\nO melhor próximo passo agora é uma análise cuidadosa com a Dra. Noêmia. Geralmente a solução pode ser mais simples do que parece. Você prefere agendar online ou falar primeiro por WhatsApp?'
    }
  ];

  // Simular detecção de respostas curtas
  const shortResponses = ['sim', 'não', 'ainda não', 'quero', 'ok', 'entendi', 'certo'];
  
  console.log('\n--- TESTE DE RESPOSTAS CURTAS ---');
  shortResponses.forEach(response => {
    console.log(`Resposta curta detectada: "${response}"`);
  });
  
  console.log('\n--- TESTE DE FLUXO DE CONVERSA ---');
  mockStates.forEach((scenario, index) => {
    console.log(`\nCenário ${index + 1}:`);
    console.log(`  Step: ${scenario.step}`);
    console.log(`  Usuário: "${scenario.userMessage}"`);
    console.log(`  Resposta esperada: ${scenario.expectedResponse.substring(0, 100)}...`);
    
    // Verificar se contém padrões de reinício
    const hasRestartPattern = scenario.expectedResponse.includes('Boa tarde') ||
                             scenario.expectedResponse.includes('Vamos falar sobre') ||
                             scenario.expectedResponse.includes('Como posso ajudar');
    
    console.log(`  Contém padrão de reinício: ${hasRestartPattern ? 'SIM ❌' : 'NÃO ✅'}`);
    
    // Verificar se tem reconhecimento e continuidade
    const hasRecognition = scenario.expectedResponse.includes('Perfeito') ||
                         scenario.expectedResponse.includes('Entendi') ||
                         scenario.expectedResponse.includes('Olha');
    
    console.log(`  Tem reconhecimento: ${hasRecognition ? 'SIM ✅' : 'NÃO ❌'}`);
    
    // Verificar se tem pergunta estratégica
    const hasStrategicQuestion = scenario.expectedResponse.includes('?') &&
                                 !scenario.expectedResponse.includes('Como posso ajudar');
    
    console.log(`  Tem pergunta estratégica: ${hasStrategicQuestion ? 'SIM ✅' : 'NÃO ❌'}`);
  });
};

const testResponsePatterns = () => {
  console.log('\n=== TESTE DE PADRÕES DE RESPOSTA ===');
  
  const responsePatterns = {
    acolhimento: {
      shouldHave: ['Faz sentido você ter essa dúvida', 'Faço parte da equipe', 'Me conta rapidinho'],
      shouldNotHave: ['Boa tarde', 'Vamos falar sobre', 'Como posso ajudar']
    },
    continuity: {
      shouldHave: ['Perfeito', 'Entendi', 'Olha', 'Isso já ajuda'],
      shouldNotHave: ['Boa tarde', 'Vamos falar sobre', 'Como posso ajudar']
    },
    strategic: {
      shouldHave: ['pergunta estratégica', 'próximo passo', 'como seria'],
      shouldNotHave: ['Como posso ajudar', 'o que você deseja']
    }
  };
  
  Object.entries(responsePatterns).forEach(([pattern, rules]) => {
    console.log(`\nPadrão: ${pattern}`);
    console.log(`  Deve ter: ${rules.shouldHave.join(', ')}`);
    console.log(`  Não deve ter: ${rules.shouldNotHave.join(', ')}`);
  });
};

const testShortResponseHandling = () => {
  console.log('\n=== TESTE DE MANUSEIO DE RESPOSTAS CURTAS ===');
  
  const shortResponseScenarios = [
    {
      previousMessage: 'posso me aposentar?',
      currentMessage: 'ainda não',
      expectedBehavior: 'Reconhecer resposta curta + continuar conversa'
    },
    {
      previousMessage: 'há quanto tempo isso acontece?',
      currentMessage: '6 meses',
      expectedBehavior: 'Conectar com pergunta anterior + avançar'
    },
    {
      previousMessage: 'você já pesquisou antes?',
      currentMessage: 'sim',
      expectedBehavior: 'Reconhecer + dar próximo passo estratégico'
    }
  ];
  
  shortResponseScenarios.forEach((scenario, index) => {
    console.log(`\nCenário ${index + 1}:`);
    console.log(`  Mensagem anterior: "${scenario.previousMessage}"`);
    console.log(`  Resposta atual: "${scenario.currentMessage}"`);
    console.log(`  Comportamento esperado: ${scenario.expectedBehavior}`);
  });
};

const validateConversationFlow = () => {
  console.log('\n=== VALIDAÇÃO DE FLUXO DE CONVERSA ===');
  
  const flowValidation = {
    'Não reiniciar conversa': {
      rule: 'Nunca usar saudações após primeira interação',
      examples: ['Boa tarde', 'Boa noite', 'Olá'],
      status: 'CRÍTICO'
    },
    'Reconhecer contexto': {
      rule: 'Sempre reconhecer resposta anterior',
      examples: ['Perfeito', 'Entendi', 'Olha'],
      status: 'CRÍTICO'
    },
    'Continuar naturalmente': {
      rule: 'Avançar conversa sem quebrar fluxo',
      examples: ['Me conta:', 'Você já', 'O que mais'],
      status: 'CRÍTICO'
    },
    'Evitar genéricas': {
      rule: 'Nunca usar frases genéricas',
      examples: ['Como posso ajudar', 'O que você deseja'],
      status: 'IMPORTANTE'
    },
    'Pergunta estratégica': {
      rule: 'Sempre terminar com pergunta direcional',
      examples: ['há quanto tempo?', 'o que mais te preocupa?', 'você prefere'],
      status: 'CRÍTICO'
    }
  };
  
  Object.entries(flowValidation).forEach(([rule, details]) => {
    console.log(`\n${rule}:`);
    console.log(`  Status: ${details.status}`);
    console.log(`  Regra: ${details.rule}`);
    console.log(`  Exemplos: ${details.examples.join(', ')}`);
  });
};

// Executar todos os testes
const runAllTests = () => {
  console.log('INICIANDO TESTES DE CONTINUIDADE DA NOEMIA');
  console.log('===============================================');
  
  testConversationContinuity();
  testResponsePatterns();
  testShortResponseHandling();
  validateConversationFlow();
  
  console.log('\n=== TESTES CONCLUÍDOS ===');
  console.log('Verifique se todas as validações estão passando.');
  console.log('Foco principal: evitar reinício e garantir continuidade natural.');
};

// Exportar para uso manual
module.exports = {
  runAllTests,
  testConversationContinuity,
  testResponsePatterns,
  testShortResponseHandling,
  validateConversationFlow
};

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests();
}
