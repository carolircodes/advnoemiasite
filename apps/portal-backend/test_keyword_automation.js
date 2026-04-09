// Testes para automação de palavra-chave em comentários do Instagram

const testKeywordDetection = () => {
  console.log('=== TESTE DE DETECÇÃO DE PALAVRA-CHAVE ===');
  
  const testCases = [
    {
      comment: 'posso me aposentar?',
      expected: 'aposentadoria'
    },
    {
      comment: 'quero saber sobre aposentadoria',
      expected: 'aposentadoria'
    },
    {
      comment: 'o banco está cobrando errado',
      expected: 'banco'
    },
    {
      comment: 'tenho desconto indevido',
      expected: 'desconto'
    },
    {
      comment: 'não recebo pensão',
      expected: 'pensão'
    },
    {
      comment: 'quero fazer divórcio',
      expected: 'divórcio'
    },
    {
      comment: 'briga de guarda',
      expected: 'guarda'
    },
    {
      comment: 'quebrou contrato',
      expected: 'contrato'
    },
    {
      comment: 'sofri um dano',
      expected: 'dano'
    },
    {
      comment: 'quero indenização',
      expected: 'indenização'
    },
    {
      comment: 'como funciona o inss?',
      expected: 'inss'
    },
    {
      comment: 'meu benefício foi negado',
      expected: 'benefício'
    },
    {
      comment: 'comentário sem palavra-chave',
      expected: null
    }
  ];

  // Simular detecção (lógica do serviço)
  const keywordMappings = [
    { keyword: 'aposentadoria', theme: 'previdenciario' },
    { keyword: 'aposentar', theme: 'previdenciario' },
    { keyword: 'inss', theme: 'previdenciario' },
    { keyword: 'benefício', theme: 'previdenciario' },
    { keyword: 'banco', theme: 'bancario' },
    { keyword: 'desconto', theme: 'bancario' },
    { keyword: 'cobrança', theme: 'bancario' },
    { keyword: 'pensão', theme: 'familia' },
    { keyword: 'divórcio', theme: 'familia' },
    { keyword: 'guarda', theme: 'familia' },
    { keyword: 'contrato', theme: 'civil' },
    { keyword: 'dano', theme: 'civil' },
    { keyword: 'indenização', theme: 'civil' }
  ];

  const detectKeyword = (commentText) => {
    const normalizedText = commentText.toLowerCase().trim();
    
    for (const mapping of keywordMappings) {
      if (normalizedText.includes(mapping.keyword.toLowerCase())) {
        return mapping.keyword;
      }
    }
    
    return null;
  };

  let passed = 0;
  let failed = 0;

  testCases.forEach((testCase, index) => {
    const detected = detectKeyword(testCase.comment);
    const success = detected === testCase.expected;
    
    console.log(`Teste ${index + 1}: "${testCase.comment}"`);
    console.log(`  Esperado: ${testCase.expected}`);
    console.log(`  Detectado: ${detected}`);
    console.log(`  Resultado: ${success ? 'PASSOU' : 'FALHOU'}`);
    console.log('---');
    
    if (success) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log(`=== RESUMO ===`);
  console.log(`Passaram: ${passed}`);
  console.log(`Falharam: ${failed}`);
  console.log(`Total: ${testCases.length}`);
  console.log(`Taxa de sucesso: ${((passed / testCases.length) * 100).toFixed(1)}%`);
};

const testMessageGeneration = () => {
  console.log('\n=== TESTE DE GERAÇÃO DE MENSAGENS ESPECÍFICAS ===');
  
  const messageTemplates = {
    aposentadoria: 'Vi que você comentou sobre aposentadoria! Faz sentido ter essa dúvida... Muita gente acaba adiando justamente por não saber por onde começar. Você já fez algum pedido no INSS?',
    banco: 'Vi que você comentou sobre banco! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse problema com o banco vem acontecendo?',
    desconto: 'Vi que você comentou sobre desconto! Faz sentido ter essa dúvida... O interessante é que cada área tem detalhes que pouca gente conhece. Há quanto tempo esse desconto vem aparecendo?',
    pensão: 'Vi que você comentou sobre pensão! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe algum acordo ou decisão judicial sobre a pensão?',
    divórcio: 'Vi que você comentou sobre divórcio! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Vocês já estão separados ou ainda moram juntos?',
    guarda: 'Vi que você comentou sobre guarda! Faz sentido ter essa dúvida... Isso acontece com mais pessoas do que parece. Já existe alguma decisão sobre a guarda das crianças?',
    contrato: 'Vi que você comentou sobre contrato! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O contrato foi escrito ou verbal?',
    dano: 'Vi que você comentou sobre dano! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. O dano foi material ou moral?',
    indenização: 'Vi que você comentou sobre indenização! Faz sentido ter essa dúvida... Existem diferentes caminhos para resolver isso, mas cada caso tem o melhor momento para agir. Você já tentou negociar diretamente?'
  };

  Object.entries(messageTemplates).forEach(([keyword, message]) => {
    console.log(`\nPalavra-chave: ${keyword}`);
    console.log(`Mensagem: ${message}`);
    console.log(`Caracteres: ${message.length}`);
    
    // Verificar se contém perguntas específicas (não genéricas)
    const hasGenericQuestion = message.includes('Quer saber mais?') || message.includes('Quer entender melhor?');
    console.log(`Pergunta específica: ${!hasGenericQuestion ? 'SIM' : 'NÃO'}`);
  });
};

const testWebhookPayload = () => {
  console.log('\n=== TESTE DE PAYLOAD WEBHOOK ===');
  
  const samplePayload = {
    object: 'instagram',
    entry: [{
      id: '123456789',
      time: 1640995200,
      changes: [{
        field: 'comments',
        value: {
          id: 'comment_123',
          from: {
            id: 'user_456',
            username: 'joao_silva'
          },
          text: 'quero saber sobre aposentadoria',
          media: {
            id: 'media_789'
          }
        }
      }]
    }]
  };

  console.log('Payload de exemplo:');
  console.log(JSON.stringify(samplePayload, null, 2));
  
  console.log('\nEstrutura esperada:');
  console.log('- comment.id: comment_123');
  console.log('- comment.from.id: user_456');
  console.log('- comment.from.username: joao_silva');
  console.log('- comment.text: quero saber sobre aposentadoria');
  console.log('- comment.media.id: media_789');
};

const testDatabaseSchema = () => {
  console.log('\n=== TESTE DE SCHEMA DO BANCO ===');
  
  const expectedSchema = {
    table: 'keyword_automation_events',
    columns: [
      'id (UUID, PRIMARY KEY)',
      'comment_id (TEXT, NOT NULL)',
      'user_id (TEXT, NOT NULL)',
      'keyword (TEXT, NOT NULL)',
      'theme (TEXT, NOT NULL)',
      'area (TEXT, NOT NULL)',
      'dm_sent (BOOLEAN, NOT NULL)',
      'session_created (BOOLEAN, NOT NULL)',
      'processed_at (TIMESTAMP)',
      'created_at (TIMESTAMP)'
    ],
    indexes: [
      'idx_keyword_automation_events_comment_id',
      'idx_keyword_automation_events_user_id',
      'idx_keyword_automation_events_keyword',
      'idx_keyword_automation_events_theme',
      'idx_keyword_automation_events_processed_at'
    ]
  };

  console.log('Tabela:', expectedSchema.table);
  console.log('Colunas:');
  expectedSchema.columns.forEach(col => console.log(`  - ${col}`));
  console.log('Índices:');
  expectedSchema.indexes.forEach(idx => console.log(`  - ${idx}`));
};

// Executar todos os testes
const runAllTests = () => {
  console.log('INICIANDO TESTES DE AUTOMAÇÃO DE PALAVRA-CHAVE');
  console.log('=============================================');
  
  testKeywordDetection();
  testMessageGeneration();
  testWebhookPayload();
  testDatabaseSchema();
  
  console.log('\n=== TESTES CONCLUÍDOS ===');
  console.log('Verifique os logs acima para validar o funcionamento.');
};

// Exportar para uso manual
module.exports = {
  runAllTests,
  testKeywordDetection,
  testMessageGeneration,
  testWebhookPayload,
  testDatabaseSchema
};

// Executar se chamado diretamente
if (require.main === module) {
  runAllTests();
}
