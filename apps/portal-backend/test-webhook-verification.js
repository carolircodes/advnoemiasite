// SIMULAÇÃO DA VERIFICAÇÃO DO WHATSAPP WEBHOOK
// URL: https://portal.advnoemia.com.br/api/whatsapp/webhook

// 1. TESTE DE VERIFICAÇÃO CORRETO
const testVerification = async () => {
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'noeminha_verify_2026',
    'hub.challenge': 'test_challenge_12345'
  });

  const response = await fetch(
    `https://portal.advnoemia.com.br/api/whatsapp/webhook?${params}`
  );

  console.log('STATUS:', response.status);
  console.log('HEADERS:', Object.fromEntries(response.headers));
  console.log('BODY:', await response.text());
};

// 2. TESTE COM TOKEN INCORRETO
const testInvalidToken = async () => {
  const params = new URLSearchParams({
    'hub.mode': 'subscribe',
    'hub.verify_token': 'token_errado',
    'hub.challenge': 'test_challenge_12345'
  });

  const response = await fetch(
    `https://portal.advnoemia.com.br/api/whatsapp/webhook?${params}`
  );

  console.log('INVALID TOKEN STATUS:', response.status);
  console.log('INVALID TOKEN BODY:', await response.text());
};

// 3. TESTE SEM PARÂMETROS
const testMissingParams = async () => {
  const response = await fetch(
    'https://portal.advnoemia.com.br/api/whatsapp/webhook'
  );

  console.log('MISSING PARAMS STATUS:', response.status);
  console.log('MISSING PARAMS BODY:', await response.text());
};

// Executar testes
testVerification();
testInvalidToken();
testMissingParams();
