/**
 * Testes corrigidos para integração WhatsApp Cloud API + NoemIA
 * Execute com: node test_whatsapp_fixed.js
 */

const https = require('https');
const crypto = require('crypto');

// Configurações de teste
const WEBHOOK_URL = 'https://advnoemia.com.br/api/whatsapp/webhook';
const VERIFY_TOKEN = 'noeminha_whatsapp_verify_2026';
const APP_SECRET = 'noeminha_whatsapp_secret_2026';

// Função para calcular assinatura HMAC-SHA256
function calculateSignature(body, appSecret) {
  return 'sha256=' + crypto
    .createHmac('sha256', appSecret)
    .update(JSON.stringify(body))
    .digest('hex');
}

// Função para fazer requisição HTTP
function makeRequest(url, options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Teste 1: Verificação do Webhook (GET)
async function testWebhookVerification() {
  console.log('\n🔍 Teste 1: Verificação do Webhook (GET)');
  console.log('=' .repeat(50));

  try {
    const url = `${WEBHOOK_URL}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=test_challenge_123`;
    
    const response = await makeRequest(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Status:', response.status);
    console.log('Body:', response.body);
    
    if (response.status === 200 && response.body === 'test_challenge_123') {
      console.log('✅ Webhook verification OK');
    } else {
      console.log('❌ Webhook verification FAILED');
    }
  } catch (error) {
    console.error('❌ Erro na verificação:', error.message);
  }
}

// Teste 2: Mensagem WhatsApp (ESTRUTURA CORRIGIDA)
async function testWhatsAppMessage() {
  console.log('\n📱 Teste 2: Mensagem WhatsApp (Estrutura Corrigida)');
  console.log('=' .repeat(50));

  const messagePayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1234567890123456',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            phone_number_id: '123456789',
            display_phone_number: '+55 11 99999-9999'
          },
          contacts: [{
            wa_id: '5511999999999',
            profile: {
              name: 'João da Silva'
            }
          }],
          messages: [{
            from: '5511999999999', // CORREÇÃO: Extrair número do campo 'from'
            id: 'wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1NQA=',
            timestamp: '1644475265',
            text: {
              body: 'Olá, posso me aposentar? Tenho 55 anos e trabalhei por 30 anos.'
            },
            type: 'text'
            // CORREÇÃO: Removido 'direction' que não existe no WhatsApp
          }]
        }
      }]
    }]
  };

  const signature = calculateSignature(messagePayload, APP_SECRET);

  try {
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      }
    }, messagePayload);

    console.log('Status:', response.status);
    console.log('Headers:', JSON.stringify(response.headers, null, 2));
    console.log('Body:', response.body);
    
    if (response.status === 200) {
      console.log('✅ Mensagem WhatsApp processada com sucesso');
      
      try {
        const result = JSON.parse(response.body);
        console.log('📊 Resumo do processamento:');
        console.log(`   - Total eventos: ${result.summary?.total || 0}`);
        console.log(`   - Processados: ${result.summary?.processed || 0}`);
        console.log(`   - Com resposta: ${result.summary?.withResponse || 0}`);
        
        // Verificar se a resposta foi enviada
        if (result.summary?.withResponse > 0) {
          console.log('🎉 RESPOSTA ENVIADA PARA WHATSAPP!');
        } else {
          console.log('⚠️  Nenhuma resposta foi enviada');
        }
      } catch (e) {
        console.log('⚠️  Resposta não é JSON válido');
      }
    } else {
      console.log('❌ Falha no processamento da mensagem');
    }
  } catch (error) {
    console.error('❌ Erro no processamento:', error.message);
  }
}

// Teste 3: Teste de envio direto via WhatsApp API (para debug)
async function testDirectWhatsAppSend() {
  console.log('\n📤 Teste 3: Envio Direto WhatsApp API (Debug)');
  console.log('=' .repeat(50));

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '123456789';
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || 'test_token';
  const recipientNumber = '5511999999999';
  const messageText = 'Teste de envio direto via WhatsApp API';

  const payload = {
    messaging_product: 'whatsapp',
    to: recipientNumber,
    text: {
      body: messageText
    },
    recipient_type: 'individual'
  };

  try {
    const response = await makeRequest(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    }, payload);

    console.log('Status:', response.status);
    console.log('Body:', response.body);
    
    if (response.status === 200) {
      console.log('✅ Envio direto WhatsApp API OK');
    } else {
      console.log('❌ Falha no envio direto');
      console.log('Verifique WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_ACCESS_TOKEN');
    }
  } catch (error) {
    console.error('❌ Erro no envio direto:', error.message);
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Dica: Verifique conexão com a internet');
    }
  }
}

// Teste 4: Múltiplas mensagens para testar duplicação
async function testDuplicateDetection() {
  console.log('\n🔄 Teste 4: Detecção de Duplicação');
  console.log('=' .repeat(50));

  const messagePayload = {
    object: 'whatsapp_business_account',
    entry: [{
      id: '1234567890123456',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            phone_number_id: '123456789',
            display_phone_number: '+55 11 99999-9999'
          },
          contacts: [{
            wa_id: '5511999999999',
            profile: {
              name: 'Test User'
            }
          }],
          messages: [{
            from: '5511999999999',
            id: 'wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1NQ==', // ID duplicado
            timestamp: '1644475265',
            text: {
              body: 'Mensagem de teste para duplicação'
            },
            type: 'text'
          }]
        }
      }]
    }]
  };

  const signature = calculateSignature(messagePayload, APP_SECRET);

  console.log('Enviando mensagem pela primeira vez...');
  
  try {
    const response1 = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      }
    }, messagePayload);

    console.log('Primeira vez - Status:', response1.status);
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Enviando mesma mensagem pela segunda vez...');
    
    const response2 = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      }
    }, messagePayload);

    console.log('Segunda vez - Status:', response2.status);
    
    if (response1.status === 200 && response2.status === 200) {
      try {
        const result1 = JSON.parse(response1.body);
        const result2 = JSON.parse(response2.body);
        
        console.log('Primeira vez - Processados:', result1.summary?.processed || 0);
        console.log('Segunda vez - Processados:', result2.summary?.processed || 0);
        
        if ((result1.summary?.processed || 0) > 0 && (result2.summary?.processed || 0) === 0) {
          console.log('✅ Detecção de duplicata funcionou');
        } else {
          console.log('❌ Detecção de duplicata não funcionou');
        }
      } catch (e) {
        console.log('⚠️  Erro ao analisar respostas');
      }
    }
  } catch (error) {
    console.error('❌ Erro no teste de duplicata:', error.message);
  }
}

// Teste 5: Verificar variáveis de ambiente
function testEnvironmentVariables() {
  console.log('\n🔧 Teste 5: Variáveis de Ambiente');
  console.log('=' .repeat(50));

  const requiredVars = [
    'WHATSAPP_VERIFY_TOKEN',
    'WHATSAPP_APP_SECRET',
    'WHATSAPP_ACCESS_TOKEN',
    'WHATSAPP_PHONE_NUMBER_ID',
    'OPENAI_API_KEY'
  ];

  console.log('Verificando variáveis de ambiente:');
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${varName.includes('SECRET') || varName.includes('TOKEN') ? '***CONFIGURADO***' : value}`);
    } else {
      console.log(`❌ ${varName}: NÃO CONFIGURADO`);
    }
  });

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.log(`\n⚠️  Configure as seguintes variáveis: ${missing.join(', ')}`);
  } else {
    console.log('\n✅ Todas as variáveis necessárias estão configuradas');
  }
}

// Função principal
async function runAllTests() {
  console.log('🧪 Testes Corrigidos - WhatsApp Cloud API + NoemIA');
  console.log('=' .repeat(60));
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
  console.log(`🔐 App Secret: ${APP_SECRET}`);
  
  // Verificar variáveis de ambiente primeiro
  testEnvironmentVariables();
  
  await testWebhookVerification();
  await testWhatsAppMessage();
  await testDirectWhatsAppSend();
  await testDuplicateDetection();
  
  console.log('\n🎉 Todos os testes concluídos!');
  console.log('=' .repeat(60));
  console.log('💡 Se as respostas não estão sendo enviadas:');
  console.log('   1. Verifique WHATSAPP_ACCESS_TOKEN');
  console.log('   2. Verifique WHATSAPP_PHONE_NUMBER_ID');
  console.log('   3. Confirme que o número está verificado no WhatsApp Business');
  console.log('   4. Verifique os logs de erro no console');
}

// Executar testes
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebhookVerification,
  testWhatsAppMessage,
  testDirectWhatsAppSend,
  testDuplicateDetection,
  testEnvironmentVariables,
  runAllTests
};
