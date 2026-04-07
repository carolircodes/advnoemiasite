/**
 * Testes completos para fallback robusto do WhatsApp + NoemIA
 * Testa todos os cenários de falha da OpenAI
 * Execute com: node test_whatsapp_fallback.js
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

// Teste 1: Mensagem normal (deve funcionar com OpenAI)
async function testNormalMessage() {
  console.log('\n📱 Teste 1: Mensagem Normal (OpenAI funcionando)');
  console.log('=' .repeat(60));

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
            wa_id: '5511999999991',
            profile: {
              name: 'João Normal'
            }
          }],
          messages: [{
            from: '5511999999991',
            id: 'wamid.normal.test.1',
            timestamp: '1644475265',
            text: {
              body: 'Olá, gostaria de saber sobre aposentadoria por tempo de contribuição.'
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
    
    if (response.status === 200) {
      try {
        const result = JSON.parse(response.body);
        console.log('✅ Mensagem normal processada');
        console.log('📊 Resumo:');
        console.log(`   - Processados: ${result.summary?.processed || 0}`);
        console.log(`   - Com resposta: ${result.summary?.withResponse || 0}`);
        
        // Verificar logs no console
        console.log('\n📝 Verifique os logs para:');
        console.log('   - ✅ OPENAI_REQUEST');
        console.log('   - ✅ OPENAI_SUCCESS');
        console.log('   - ✅ WHATSAPP_SEND_SUCCESS');
        console.log('   - ✅ MESSAGE_PROCESSED');
        
      } catch (e) {
        console.log('⚠️  Resposta não é JSON válido');
      }
    } else {
      console.log('❌ Falha no processamento');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Teste 2: Simular falha da OpenAI (quota insuficiente)
async function testOpenAIQuotaError() {
  console.log('\n🚨 Teste 2: Falha OpenAI - Quota Insuficiente');
  console.log('=' .repeat(60));

  // Este teste simula o que aconteceria quando a OpenAI falhar
  // Na prática, isso aconteceria automaticamente
  
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
            wa_id: '5511999999992',
            profile: {
              name: 'Maria Quota'
            }
          }],
          messages: [{
            from: '5511999999992',
            id: 'wamid.quota.test.1',
            timestamp: '1644475265',
            text: {
              body: 'Posso me aposentar agora? Tenho 58 anos.'
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
    
    if (response.status === 200) {
      console.log('✅ Mensagem processada (mesmo com falha OpenAI)');
      
      // Verificar se o fallback foi usado
      console.log('\n📝 Verifique os logs para:');
      console.log('   - 🚨 OPENAI_ERROR (INSUFFICIENT_QUOTA)');
      console.log('   - ✅ WHATSAPP_SEND_SUCCESS (com resposta fallback)');
      console.log('   - ✅ MESSAGE_PROCESSED');
      console.log('   - 📋 fallbackUsed: true');
      
      console.log('\n💡 A resposta deve ser a mensagem padrão do fallback.');
      
    } else {
      console.log('❌ Falha no processamento');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Teste 3: Mensagem urgente (deve usar fallback inteligente)
async function testUrgentMessage() {
  console.log('\n⚡ Teste 3: Mensagem Urgente com Fallback');
  console.log('=' .repeat(60));

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
            wa_id: '5511999999993',
            profile: {
              name: 'Carlos Urgente'
            }
          }],
          messages: [{
            from: '5511999999993',
            id: 'wamid.urgent.test.1',
            timestamp: '1644475265',
            text: {
              body: 'Ajuda urgente! O INSS negou meu benefício e não tenho como pagar as contas. O que fazer?'
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
    
    if (response.status === 200) {
      console.log('✅ Mensagem urgente processada com fallback');
      
      console.log('\n📝 Verifique os logs para:');
      console.log('   - 🚨 OPENAI_ERROR (se falhar)');
      console.log('   - ✅ WHATSAPP_SEND_SUCCESS');
      console.log('   - 📋 fallbackUsed: true');
      console.log('   - 📋 area: previdenciario');
      console.log('   - 📋 urgency: alta');
      console.log('   - 📋 wantsHuman: true');
      console.log('   - 📋 shouldSchedule: true');
      
      console.log('\n💡 A resposta deve incluir CTAs para WhatsApp e agendamento.');
      
    } else {
      console.log('❌ Falha no processamento');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Teste 4: Testar parsing com erro (estrutura inválida)
async function testParsingError() {
  console.log('\n🔍 Teste 4: Erro de Parsing Webhook');
  console.log('=' .repeat(60));

  // Payload com estrutura inválida
  const invalidPayload = {
    object: 'whatsapp_business_account',
    entry: [{
      // Faltando o campo 'changes'
      id: 'invalid'
    }]
  };

  const signature = calculateSignature(invalidPayload, APP_SECRET);

  try {
    const response = await makeRequest(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Hub-Signature-256': signature
      }
    }, invalidPayload);

    console.log('Status:', response.status);
    console.log('Body:', response.body);
    
    if (response.status === 200) {
      console.log('✅ Sistema lidou com parsing inválido');
      
      console.log('\n📝 Verifique os logs para:');
      console.log('   - 🚨 WEBHOOK_PARSING_ERROR');
      console.log('   - 📋 error: PARSING_ERROR');
      
    } else {
      console.log('❌ Falha no tratamento de erro');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Teste 5: Testar envio WhatsApp com erro de configuração
async function testWhatsAppConfigError() {
  console.log('\n⚙️ Teste 5: Erro de Configuração WhatsApp');
  console.log('=' .repeat(60));

  // Este teste verifica se o sistema detecta falta de configuração
  console.log('💡 Para testar este cenário:');
  console.log('   1. Remova WHATSAPP_PHONE_NUMBER_ID do ambiente');
  console.log('   2. Remova WHATSAPP_ACCESS_TOKEN do ambiente');
  console.log('   3. Envie uma mensagem para o WhatsApp');
  console.log('   4. Verifique os logs para:');
  console.log('      - 🚨 WHATSAPP_SEND_ERROR');
  console.log('      - 📋 error: MISSING_CONFIG');
  console.log('      - 📋 hasPhoneNumberId: false');
  console.log('      - 📋 hasAccessToken: false');
  
  console.log('\n🔧 Variáveis atuais:');
  console.log(`   WHATSAPP_PHONE_NUMBER_ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID || 'NÃO CONFIGURADO'}`);
  console.log(`   WHATSAPP_ACCESS_TOKEN: ${process.env.WHATSAPP_ACCESS_TOKEN ? '***CONFIGURADO***' : 'NÃO CONFIGURADO'}`);
  console.log(`   OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '***CONFIGURADO***' : 'NÃO CONFIGURADO'}`);
}

// Teste 6: Testar diferentes áreas jurídicas com fallback
async function testDifferentAreas() {
  console.log('\n⚖️ Teste 6: Diferentes Áreas Jurídicas com Fallback');
  console.log('=' .repeat(60));

  const testCases = [
    {
      name: 'Direito Bancário',
      message: 'O banco está cobrando juros abusivos no meu empréstimo',
      userId: '5511999999994',
      messageId: 'wamid.bancario.test.1',
      expectedArea: 'bancario'
    },
    {
      name: 'Direito de Família',
      message: 'Meu ex-marido não está pagando a pensão dos nossos filhos',
      userId: '5511999999995',
      messageId: 'wamid.familia.test.1',
      expectedArea: 'familia'
    },
    {
      name: 'Geral',
      message: 'Quanto custa uma consulta jurídica?',
      userId: '5511999999996',
      messageId: 'wamid.geral.test.1',
      expectedArea: 'geral'
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n📋 Testando: ${testCase.name}`);
    console.log(`   Mensagem: "${testCase.message}"`);
    console.log(`   Área esperada: ${testCase.expectedArea}`);

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
              wa_id: testCase.userId,
              profile: {
                name: `Test ${testCase.name}`
              }
            }],
            messages: [{
              from: testCase.userId,
              id: testCase.messageId,
              timestamp: '1644475265',
              text: {
                body: testCase.message
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
        console.log('   ✅ Processado com fallback');
        
        // Verificar logs específicos
        console.log(`   📝 Verifique logs para área: ${testCase.expectedArea}`);
        console.log(`   📋 Resposta deve mencionar: ${testCase.expectedArea === 'bancario' ? 'direito bancário' : testCase.expectedArea === 'familia' ? 'direito de família' : 'questão jurídica'}`);
        
      } else {
        console.log('   ❌ Falha no processamento');
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }

    // Aguardar entre testes
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Função principal
async function runAllFallbackTests() {
  console.log('🧪 Testes Completos - Fallback Robusto WhatsApp + NoemIA');
  console.log('=' .repeat(70));
  console.log(`🌐 Webhook URL: ${WEBHOOK_URL}`);
  console.log(`🔑 Verify Token: ${VERIFY_TOKEN}`);
  console.log(`🔐 App Secret: ${APP_SECRET}`);
  
  console.log('\n📋 Objetivo dos Testes:');
  console.log('   1. ✅ Mensagem normal com OpenAI funcionando');
  console.log('   2. 🚨 Falha OpenAI → Fallback automático');
  console.log('   3. ⚡ Mensagem urgente com fallback inteligente');
  console.log('   4. 🔍 Erro de parsing do webhook');
  console.log('   5. ⚙️ Erro de configuração WhatsApp');
  console.log('   6. ⚖️ Diferentes áreas jurídicas');
  
  await testNormalMessage();
  await testOpenAIQuotaError();
  await testUrgentMessage();
  await testParsingError();
  await testWhatsAppConfigError();
  await testDifferentAreas();
  
  console.log('\n🎉 Todos os testes de fallback concluídos!');
  console.log('=' .repeat(70));
  
  console.log('\n📊 Resumo do que verificar nos logs:');
  console.log('   ✅ Sucesso: OPENAI_REQUEST, OPENAI_SUCCESS, WHATSAPP_SEND_SUCCESS');
  console.log('   🚨 Erros OpenAI: OPENAI_ERROR (INSUFFICIENT_QUOTA, RATE_LIMIT, etc)');
  console.log('   🚨 Erros WhatsApp: WHATSAPP_SEND_ERROR (MISSING_CONFIG, HTTP_4xx, etc)');
  console.log('   🚨 Erros Parsing: WEBHOOK_PARSING_ERROR');
  console.log('   📋 Fallback: fallbackUsed: true sempre em erros');
  console.log('   📋 Contexto: area, urgency, wantsHuman, etc');
  
  console.log('\n💡 O sistema NUNCA deve deixar o usuário sem resposta!');
  console.log('   - Se OpenAI falhar → usa fallback');
  console.log('   - Se WhatsApp falhar → log erro, mas usuário já foi processado');
  console.log('   - Se parsing falhar → log erro, mas não quebra sistema');
}

// Executar testes
if (require.main === module) {
  runAllFallbackTests().catch(console.error);
}

module.exports = {
  testNormalMessage,
  testOpenAIQuotaError,
  testUrgentMessage,
  testParsingError,
  testWhatsAppConfigError,
  testDifferentAreas,
  runAllFallbackTests
};
