// Teste simples para validar webhook sem erros de cookies
const http = require('http');

const webhookPayload = {
  object: "instagram",
  entry: [{
    id: "123456789",
    time: 1234567890,
    messaging: [{
      sender: {
        id: "test_user_123"
      },
      recipient: {
        id: "test_page_456"
      },
      timestamp: 1234567890,
      message: {
        mid: "msg_123",
        text: "oi",
        seq: 0
      }
    }]
  }]
};

const testData = JSON.stringify(webhookPayload);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/meta/webhook',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(testData),
    'x-hub-signature-256': 'sha256=test_signature'
  }
};

console.log('🧪 TESTE: Enviando mensagem "oi" para webhook do Instagram...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Resposta:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Webhook respondeu 200 - sem erros de cookies!');
    } else {
      console.log('❌ Webhook retornou status diferente de 200');
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Erro na requisição: ${e.message}`);
  console.log('💡 Dica: Inicie o servidor com "npm run dev"');
});

req.write(testData);
req.end();
