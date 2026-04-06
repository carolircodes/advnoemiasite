/**
 * Testes para integração WhatsApp Cloud API + NoemIA
 * Execute com: node test_whatsapp_integration.js
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

// Teste 2: Processamento de Mensagem WhatsApp
async function testWhatsAppMessage() {
  console.log('\n📱 Teste 2: Processamento de Mensagem WhatsApp');
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
            from: '5511999999999',
            id: 'wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1NQA=',
            timestamp: '1644475265',
            text: {
              body: 'Olá, posso me aposentar? Tenho 55 anos e trabalhei por 30 anos.'
            },
            type: 'text'
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

// Teste 3: Múltiplas Mensagens
async function testMultipleMessages() {
  console.log('\n📨 Teste 3: Múltiplas Mensagens');
  console.log('=' .repeat(50));

  const testCases = [
    {
      text: 'Banco cobrou juros abusivos no meu empréstimo consignado',
      area: 'bancario',
      urgency: 'alta'
    },
    {
      text: 'Quero saber sobre divórcio, meu marido não paga pensão',
      area: 'familia',
      urgency: 'alta'
    },
    {
      text: 'Gostaria de agendar uma consulta com a advogada',
      area: 'geral',
      urgency: 'media'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📝 Caso ${i + 1}: ${testCase.area} - ${testCase.urgency}`);
    console.log(`   Mensagem: "${testCase.text}"`);

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
              wa_id: `551199999999${i}`,
              profile: {
                name: `Test User ${i + 1}`
              }
            }],
            messages: [{
              from: `551199999999${i}`,
              id: `wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1NQ${i}`,
              timestamp: Date.now(),
              text: {
                body: testCase.text
              },
              type: 'text'
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

      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        console.log('   ✅ Processado com sucesso');
      } else {
        console.log('   ❌ Falha no processamento');
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }
  }
}

// Teste 4: Mensagem Duplicada (deve ser ignorada)
async function testDuplicateMessage() {
  console.log('\n🔄 Teste 4: Mensagem Duplicada');
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
            from: '5511999999999',
            id: 'wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1NQ==', // ID duplicado
            timestamp: '1644475265',
            text: {
              body: 'Esta mensagem é duplicada'
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
          console.log('✅ Detecção de duplicata funcionou corretamente');
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

// Teste 5: Assinatura Inválida
async function testInvalidSignature() {
  console.log('\n🚫 Teste 5: Assinatura Inválida');
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
            from: '5511999999999',
            id: 'wamid.HBgLMTU5OTk5OTk5OTkVQAgARGBU2RjY0MTAzODg5NzUwNjA1Ng==',
            timestamp: '1644475265',
            text: {
              body: 'Mensagem com assinatura inválida'
            },
            type: 'text'
          }]
        }
      }]
    }]
  };

  // Assinatura inválida
  const invalidSignature = 'sha256=invalid_signature_hash';

  try {
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': invalidSignature
      }
    }, messagePayload);

    console.log('Status:', response.status);
    console.log('Body:', response.body);
    
    if (response.status === 403) {
      console.log('✅ Assinatura inválida rejeitada corretamente');
    } else {
      console.log('❌ Assinatura inválida não foi rejeitada');
    }
  } catch (error) {
    console.error('❌ Erro no teste de assinatura:', error.message);
  }
}

// Função principal
async function runAllTests() {
  console.log('🧪 Iniciando Testes de Integração WhatsApp + NoemIA');
  console.log('=' .repeat(60));
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
  console.log(`🔐 App Secret: ${APP_SECRET}`);
  
  await testWebhookVerification();
  await testWhatsAppMessage();
  await testMultipleMessages();
  await testDuplicateMessage();
  await testInvalidSignature();
  
  console.log('\n🎉 Todos os testes concluídos!');
  console.log('=' .repeat(60));
}

// Executar testes
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testWebhookVerification,
  testWhatsAppMessage,
  testMultipleMessages,
  testDuplicateMessage,
  testInvalidSignature,
  runAllTests
};
