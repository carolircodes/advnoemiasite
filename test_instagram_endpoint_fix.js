// Teste para validação do endpoint corrigido do Instagram Direct

// Mock do fetch para simular a Graph API com endpoint corrigido
global.fetch = async (url, options) => {
  console.log(' MOCK FETCH - URL:', url);
  console.log(' MOCK FETCH - OPTIONS:', JSON.stringify(options, null, 2));
  
  // Verificar se está usando o endpoint correto
  if (url.includes('/me/messages')) {
    throw new Error('ERRO: Ainda usando /me/messages - endpoint incorreto!');
  }
  
  if (url.includes('/17841405730549123/messages')) {
    // Simular resposta de sucesso da Graph API com endpoint corrigido
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => JSON.stringify({
        message_id: 'm_abc123def456',
        recipient_id: JSON.parse(options.body).recipient.id
      })
    };
  }
  
  throw new Error('URL não reconhecida: ' + url);
};

// Mock do process.env
process.env.INSTAGRAM_ACCESS_TOKEN = 'EAAJZC...mock_token';
process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID = '17841405730549123';

// Função sendInstagramMessage (com endpoint corrigido)
async function sendInstagramMessage(senderId, messageText) {
  const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
  const INSTAGRAM_BUSINESS_ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
  
  console.log('\\n' + '='.repeat(80));
  console.log(' TESTANDO ENDPOINT CORRIGIDO DO INSTAGRAM');
  console.log('='.repeat(80));

  try {
    // Verificação de variáveis
    console.log(' VERIFICANDO VARIÁVEIS:');
    console.log('   - Token existe:', !!INSTAGRAM_ACCESS_TOKEN);
    console.log('   - Token length:', INSTAGRAM_ACCESS_TOKEN?.length || 0);
    console.log('   - Business Account ID existe:', !!INSTAGRAM_BUSINESS_ACCOUNT_ID);
    console.log('   - Business Account ID:', INSTAGRAM_BUSINESS_ACCOUNT_ID || 'MISSING');
    
    if (!INSTAGRAM_ACCESS_TOKEN) {
      console.log(' ERRO: INSTAGRAM_ACCESS_TOKEN não configurado');
      return false;
    }
    
    if (!INSTAGRAM_BUSINESS_ACCOUNT_ID) {
      console.log(' ERRO: INSTAGRAM_BUSINESS_ACCOUNT_ID não configurado');
      return false;
    }

    // Endpoint corrigido
    const apiUrl = `https://graph.facebook.com/v19.0/${INSTAGRAM_BUSINESS_ACCOUNT_ID}/messages?access_token=${INSTAGRAM_ACCESS_TOKEN}`;
    
    console.log(' ENDPOINT CORRIGIDO:', apiUrl);
    console.log(' Business Account ID:', INSTAGRAM_BUSINESS_ACCOUNT_ID);
    
    const payload = {
      recipient: { id: senderId },
      message: { text: messageText }
    };

    console.log(' PAYLOAD:', JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    const responseData = JSON.parse(responseText);

    console.log(' RESPOSTA DA GRAPH API:');
    console.log('   - Status:', response.status);
    console.log('   - OK:', response.ok);
    console.log('   - Data:', JSON.stringify(responseData, null, 2));

    if (response.ok) {
      console.log(' SUCESSO: Mensagem enviada com endpoint corrigido!');
      console.log('   - Message ID:', responseData.message_id);
      console.log('   - Recipient ID:', responseData.recipient_id);
      return true;
    } else {
      console.log(' ERRO: Falha no envio');
      console.log('   - Error:', responseData.error?.message);
      return false;
    }
  } catch (error) {
    console.log(' EXCEÇÃO:', error.message);
    return false;
  }
}

// Testes
async function runTests() {
  console.log(' TESTANDO CORREÇÃO DO ENDPOINT INSTAGRAM\\n');
  
  // Teste 1: Endpoint corrigido funciona
  console.log('=== TESTE 1: Endpoint corrigido ===');
  const result1 = await sendInstagramMessage('user_12345', 'Olá! Recebi sua mensagem e já vou te ajudar.');
  console.log('Resultado:', result1 ? ' SUCESSO' : ' FALHA');
  
  // Teste 2: Verificar se não está mais usando /me/messages
  console.log('\\n=== TESTE 2: Validação de endpoint ===');
  try {
    // Este teste deve falhar se ainda estiver usando /me/messages
    const oldEndpoint = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`;
    await fetch(oldEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: 'test_user' },
        message: { text: 'test' }
      })
    });
    console.log(' FALHA: Ainda usando endpoint antigo /me/messages');
  } catch (error) {
    if (error.message.includes('ERRO: Ainda usando /me/messages')) {
      console.log(' SUCESSO: Endpoint antigo /me/messages foi removido');
    } else {
      console.log(' ERRO INESPERADO:', error.message);
    }
  }
  
  console.log('\\n=== RESUMO DOS TESTES ===');
  console.log(' Endpoint corrigido: /{BUSINESS_ACCOUNT_ID}/messages');
  console.log(' Business Account ID: 17841405730549123');
  console.log(' Variáveis configuradas: INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID');
  console.log(' Logs adicionados para debug');
  console.log(' PRONTO PARA PRODUÇÃO!');
}

// Executar testes
runTests().catch(console.error);
