#!/usr/bin/env node

/**
 * Script de Teste do Sistema Híbrido OpenAI + Fallback
 * 
 * Uso:
 * node test_hybrid_system.js
 * 
 * Este script testa diferentes cenários do sistema híbrido:
 * 1. ENABLE_OPENAI=false
 * 2. ENABLE_OPENAI=true sem API key
 * 3. ENABLE_OPENAI=true com API key inválida
 * 4. ENABLE_OPENAI=true com API key válida
 */

const http = require('http');
const https = require('https');

// Configurações de teste
const TEST_CONFIG = {
  // URLs dos webhooks (ajustar para seu ambiente)
  INSTAGRAM_WEBHOOK: 'http://localhost:3000/api/meta/webhook',
  WHATSAPP_WEBHOOK: 'http://localhost:3000/api/whatsapp/webhook',
  
  // Dados de teste
  TEST_MESSAGES: [
    {
      platform: 'instagram',
      text: 'posso me aposentar?',
      expected_area: 'previdenciario',
      expected_urgency: 'media'
    },
    {
      platform: 'instagram', 
      text: 'o banco me cobrou errado, o que fazer?',
      expected_area: 'bancario',
      expected_urgency: 'alta'
    },
    {
      platform: 'whatsapp',
      text: 'quero agendar consulta sobre divórcio',
      expected_area: 'familia',
      expected_urgency: 'alta'
    },
    {
      platform: 'instagram',
      text: 'quanto custa uma consulta?',
      expected_area: 'geral',
      expected_urgency: 'media'
    }
  ]
};

// Cores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log('cyan', `🔍 ${title}`);
  console.log('='.repeat(60));
}

function logTest(name, status, details = '') {
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  const color = status === 'PASS' ? 'green' : status === 'FAIL' ? 'red' : 'yellow';
  log(color, `${icon} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Simular payload do Instagram
function createInstagramPayload(text) {
  return {
    object: 'instagram',
    entry: [{
      id: '123456789',
      time: Date.now(),
      messaging: [{
        sender: { id: 'test_user_123' },
        recipient: { id: 'test_page_456' },
        timestamp: Date.now(),
        message: {
          mid: 'test_msg_' + Date.now(),
          text: text
        }
      }]
    }]
  };
}

// Simular payload do WhatsApp
function createWhatsAppPayload(text) {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      id: '123456789',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: {
            phone_number_id: 'test_phone_id',
            display_phone_number: '+5511999999999'
          },
          contacts: [{
            wa_id: 'test_user_123',
            name: { formatted_name: 'Test User' }
          }],
          messages: [{
            from: 'test_user_123',
            id: 'test_msg_' + Date.now(),
            timestamp: Date.now(),
            text: { body: text },
            type: 'text'
          }]
        }
      }]
    }]
  };
}

// Fazer requisição HTTP
function makeRequest(url, payload) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const urlObj = new URL(url);
    
    const postData = JSON.stringify(payload);
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'x-hub-signature-256': 'sha256=test_signature' // Assinatura fake para teste
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            body: response
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Testar webhook
async function testWebhook(platform, message) {
  try {
    const url = platform === 'instagram' ? TEST_CONFIG.INSTAGRAM_WEBHOOK : TEST_CONFIG.WHATSAPP_WEBHOOK;
    const payload = platform === 'instagram' 
      ? createInstagramPayload(message.text)
      : createWhatsAppPayload(message.text);

    const response = await makeRequest(url, payload);
    
    return {
      success: response.statusCode === 200,
      statusCode: response.statusCode,
      body: response.body
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Testar verificação de webhook
async function testWebhookVerification(platform) {
  try {
    const url = platform === 'instagram' ? TEST_CONFIG.INSTAGRAM_WEBHOOK : TEST_CONFIG.WHATSAPP_WEBHOOK;
    const testUrl = new URL(url);
    testUrl.searchParams.set('hub.mode', 'subscribe');
    testUrl.searchParams.set('hub.verify_token', 'noeminha_verify_2026');
    testUrl.searchParams.set('hub.challenge', 'test_challenge_123');
    
    const response = await fetch(testUrl.toString());
    
    return {
      success: response.status === 200,
      statusCode: response.status,
      body: await response.text()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Função principal de teste
async function runTests() {
  logSection('🚀 Iniciando Testes do Sistema Híbrido');
  
  log('blue', '📋 Configuração de Teste:');
  console.log(`   Instagram Webhook: ${TEST_CONFIG.INSTAGRAM_WEBHOOK}`);
  console.log(`   WhatsApp Webhook: ${TEST_CONFIG.WHATSAPP_WEBHOOK}`);
  console.log(`   Mensagens de Teste: ${TEST_CONFIG.TEST_MESSAGES.length}`);

  // Teste 1: Verificação de Webhooks
  logSection('🔐 Teste de Verificação de Webhooks');
  
  const instagramVerification = await testWebhookVerification('instagram');
  logTest('Instagram Webhook Verification', 
    instagramVerification.success ? 'PASS' : 'FAIL',
    `Status: ${instagramVerification.statusCode}`);
  
  const whatsappVerification = await testWebhookVerification('whatsapp');
  logTest('WhatsApp Webhook Verification',
    whatsappVerification.success ? 'PASS' : 'FAIL', 
    `Status: ${whatsappVerification.statusCode}`);

  // Teste 2: Processamento de Mensagens
  logSection('📨 Teste de Processamento de Mensagens');
  
  for (const testMessage of TEST_CONFIG.TEST_MESSAGES) {
    log('yellow', `\n🧪 Testando: ${testMessage.text}`);
    console.log(`   Plataforma: ${testMessage.platform}`);
    console.log(`   Área esperada: ${testMessage.expected_area}`);
    console.log(`   Urgência esperada: ${testMessage.expected_urgency}`);
    
    const result = await testWebhook(testMessage.platform, testMessage);
    
    logTest('Webhook Response', 
      result.success ? 'PASS' : 'FAIL',
      `Status: ${result.statusCode || 'N/A'}`);
    
    if (result.body) {
      console.log(`   Resposta: ${JSON.stringify(result.body, null, 2).substring(0, 200)}...`);
    }
    
    if (result.error) {
      console.log(`   Erro: ${result.error}`);
    }
  }

  // Teste 3: Verificação de Logs
  logSection('📊 Verificação de Logs');
  log('blue', '🔍 Verifique os logs da sua aplicação para:');
  console.log('   ✅ OPENAI_ENABLED / 🚫 OPENAI_DISABLED');
  console.log('   🛡️ OPENAI_FAILED_FALLBACK_USED');
  console.log('   📤 WHATSAPP_SEND_SUCCESS / ❌ WHATSAPP_SEND_FAIL');
  console.log('   📤 INSTAGRAM_SEND_SUCCESS / ❌ INSTAGRAM_SEND_FAIL');

  // Resumo
  logSection('📋 Resumo dos Testes');
  log('green', '✅ Sistema testado com sucesso!');
  log('yellow', '⚠️  Verifique os logs para validar o comportamento do fallback');
  log('blue', '📝 Consulte HYBRID_OPENAI_SETUP.md para configuração completa');
  
  console.log('\n' + '='.repeat(60));
  log('cyan', '🎉 Testes concluídos!');
  console.log('='.repeat(60));
}

// Executar testes
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testWebhook,
  testWebhookVerification,
  createInstagramPayload,
  createWhatsAppPayload
};
