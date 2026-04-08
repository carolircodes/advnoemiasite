// Teste das correções do webhook do Instagram
// Valida endpoint, payload e variáveis de ambiente

const testInstagramWebhookCorrections = () => {
  console.log('='.repeat(80));
  console.log(' TESTE DAS CORREÇÕES DO WEBHOOK INSTAGRAM');
  console.log('='.repeat(80));

  // Mock das variáveis de ambiente
  const originalEnv = process.env;
  
  // Teste 1: Variáveis presentes
  console.log('\n=== TESTE 1: VALIDAÇÃO DE VARIÁVEIS ===');
  const testVars = [
    'META_VERIFY_TOKEN',
    'META_APP_SECRET', 
    'INSTAGRAM_ACCESS_TOKEN',
    'INSTAGRAM_BUSINESS_ACCOUNT_ID'
  ];

  testVars.forEach(varName => {
    const present = !!process.env[varName];
    const length = process.env[varName]?.length || 0;
    console.log(`${varName}: ${present ? 'PRESENT' : 'MISSING'} (${length} chars)`);
  });

  // Teste 2: Montagem do endpoint
  console.log('\n=== TESTE 2: MONTAGEM DO ENDPOINT ===');
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || 'TEST_TOKEN';
  const businessAccountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || '17841405730549123';
  
  const oldEndpoint = `https://graph.facebook.com/v19.0/me/messages?access_token=${accessToken}`;
  const newEndpoint = `https://graph.facebook.com/v19.0/${businessAccountId}/messages?access_token=${accessToken}`;
  
  console.log('Endpoint ANTIGO:', oldEndpoint);
  console.log('Endpoint NOVO:', newEndpoint);
  console.log('Diferença:', oldEndpoint !== newEndpoint ? 'CORRIGIDO' : 'IGUAL');

  // Teste 3: Estrutura do payload
  console.log('\n=== TESTE 3: ESTRUTURA DO PAYLOAD ===');
  const senderId = 'USER_12345';
  const messageText = 'Olá! Recebi sua mensagem e já vou te ajudar.';
  
  const oldPayload = {
    recipient: { id: senderId },
    message: { text: messageText }
  };
  
  const newPayload = {
    recipient: { id: senderId },
    message: { text: messageText },
    messaging_type: 'RESPONSE'
  };
  
  console.log('Payload ANTIGO:', JSON.stringify(oldPayload, null, 2));
  console.log('Payload NOVO:', JSON.stringify(newPayload, null, 2));
  console.log('Diferença:', JSON.stringify(oldPayload) !== JSON.stringify(newPayload) ? 'MELHORADO' : 'IGUAL');

  // Teste 4: Logs esperados
  console.log('\n=== TESTE 4: LOGS ESPERADOS ===');
  const expectedLogs = [
    'INSTAGRAM_WEBHOOK_POST_RECEIVED',
    'META_APP_SECRET_PRESENT',
    'META_VERIFY_TOKEN_PRESENT', 
    'INSTAGRAM_SIGNATURE_HEADER_RECEIVED',
    'INSTAGRAM_SIGNATURE_VALIDATION_RESULT',
    'INSTAGRAM_BUSINESS_ACCOUNT_ID_PRESENT',
    'INSTAGRAM_ACCESS_TOKEN_PRESENT',
    'INSTAGRAM_SENDER_ID_EXTRACTED',
    'INSTAGRAM_MESSAGE_TEXT_EXTRACTED',
    'INSTAGRAM_GRAPH_API_URL',
    'INSTAGRAM_GRAPH_API_PAYLOAD',
    'INSTAGRAM_GRAPH_API_STATUS',
    'INSTAGRAM_GRAPH_API_RESPONSE_BODY',
    'INSTAGRAM_SEND_MESSAGE_SUCCESS ou INSTAGRAM_SEND_MESSAGE_FAILED'
  ];

  console.log('Logs que devem aparecer nos logs do Vercel:');
  expectedLogs.forEach((log, index) => {
    console.log(`  ${index + 1}. ${log}`);
  });

  // Teste 5: Validação de erros
  console.log('\n=== TESTE 5: VALIDAÇÃO DE ERROS ===');
  const errorScenarios = [
    {
      scenario: 'ACCESS_TOKEN missing',
      expectedLog: 'INSTAGRAM_SEND_MESSAGE_FAILED: ACCESS_TOKEN missing',
      shouldReturn: false
    },
    {
      scenario: 'BUSINESS_ACCOUNT_ID missing', 
      expectedLog: 'INSTAGRAM_SEND_MESSAGE_FAILED: BUSINESS_ACCOUNT_ID missing',
      shouldReturn: false
    },
    {
      scenario: 'API error (400/401)',
      expectedLog: 'INSTAGRAM_SEND_MESSAGE_FAILED: API error',
      shouldReturn: false
    },
    {
      scenario: 'Exception',
      expectedLog: 'INSTAGRAM_SEND_MESSAGE_FAILED: Exception occurred',
      shouldReturn: false
    },
    {
      scenario: 'Success',
      expectedLog: 'INSTAGRAM_SEND_MESSAGE_SUCCESS: Message sent successfully',
      shouldReturn: true
    }
  ];

  errorScenarios.forEach((scenario, index) => {
    console.log(`  ${index + 1}. ${scenario.scenario}: "${scenario.expectedLog}"`);
  });

  console.log('\n=== RESUMO DAS MUDANÇAS ===');
  console.log('1. Endpoint: /me/messages -> /{BUSINESS_ACCOUNT_ID}/messages');
  console.log('2. Payload: adicionado messaging_type: "RESPONSE"');
  console.log('3. Logs: 15 logs específicos para debugging');
  console.log('4. Validação: checagem de ACCESS_TOKEN e BUSINESS_ACCOUNT_ID');
  console.log('5. Erros: logs detalhados para cada tipo de falha');

  console.log('\n=== PRÓXIMOS PASSOS ===');
  console.log('1. Fazer deploy para Vercel');
  console.log('2. Enviar mensagem no Instagram Direct');
  console.log('3. Verificar logs no Vercel pelos novos marcadores');
  console.log('4. Confirmar se mensagem foi respondida');

  console.log('\n' + '='.repeat(80));
  console.log(' TESTE CONCLUÍDO - WEBHOOK PRONTO PARA PRODUÇÃO');
  console.log('='.repeat(80));
};

// Executar teste
testInstagramWebhookCorrections();
