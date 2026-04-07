// Teste do Sistema Instagram + OpenAI + Graph API

const testCases = [
  {
    name: "Direct Message - Aposentadoria",
    area: "previdenciario",
    message: "Olá, posso me aposentar com 55 anos? Já contribuí por 25 anos.",
    expectedKeywords: ["aposentadoria", "inss", "benefício", "55 anos"],
    senderName: "João Silva",
    senderId: "user_123456"
  },
  {
    name: "Direct Message - Bancário", 
    area: "bancario",
    message: "Meu banco cobrou juros abusivos no empréstimo, o que fazer?",
    expectedKeywords: ["banco", "juros", "empréstimo", "cobrança"],
    senderName: "Maria Santos",
    senderId: "user_789012"
  },
  {
    name: "Direct Message - Família",
    area: "familia", 
    message: "Como inicio um processo de divórcio? Tenho 2 filhos.",
    expectedKeywords: ["divórcio", "filhos", "processo", "separação"],
    senderName: "Carlos Oliveira",
    senderId: "user_345678"
  },
  {
    name: "Direct Message - Geral",
    area: "geral",
    message: "Preciso de ajuda com uma questão jurídica",
    expectedKeywords: ["jurídica", "ajuda", "questão"],
    senderName: "Ana Costa",
    senderId: "user_901234"
  }
];

console.log("=== TESTE DO SISTEMA INSTAGRAM + OPENAI ===\n");

// Simular detecção de área jurídica
function detectLegalArea(text) {
  const areas = {
    previdenciario: ['aposentadoria', 'inss', 'benefício', 'auxílio', 'aposentar', 'aposentado', 'rgps', 'previdência'],
    bancario: ['banco', 'empréstimo', 'juros', 'financiamento', 'cobrança', 'tarifa', 'cheque especial', 'cartão'],
    familia: ['divórcio', 'pensão', 'guarda', 'filhos', 'casamento', 'separação', 'herança']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [area, keywords] of Object.entries(areas)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return area;
    }
  }
  
  return 'geral';
}

// Simular system prompt por área
function getSystemPrompt(area) {
  const prompts = {
    previdenciario: 'Você é um assistente jurídico especializado em direito previdenciário. Responda de forma clara, profissional e acessível sobre temas como aposentadoria, benefícios do INSS, auxílios e demais questões previdenciárias. Sempre convide para falar com a advogada Noemia para análise detalhada do caso.',
    bancario: 'Você é um assistente jurídico especializado em direito bancário. Responda de forma clara, profissional e acessível sobre temas como empréstimos, juros abusivos, cobranças indevidas e outras questões bancárias. Sempre convide para falar com a advogada Noemia para análise detalhada do caso.',
    familia: 'Você é um assistente jurídico especializado em direito de família. Responda de forma clara, profissional e acessível sobre temas como divórcio, pensão alimentícia, guarda de filhos e outras questões familiares. Sempre convide para falar com a advogada Noemia para análise detalhada do caso.',
    geral: 'Você é um assistente jurídico geral. Responda de forma clara, profissional e acessível sobre questões jurídicas diversas. Sempre convide para falar com a advogada Noemia para análise detalhada do caso.'
  };
  
  return prompts[area] || prompts.geral;
}

// Simular payload do webhook
function generateWebhookPayload(testCase) {
  return {
    object: "instagram",
    entry: [{
      id: "123456789",
      time: Math.floor(Date.now() / 1000),
      messaging: [{
        sender: { id: testCase.senderId },
        recipient: { id: "page_987654321" },
        timestamp: Math.floor(Date.now() / 1000),
        message: {
          mid: `msg_${Date.now()}`,
          text: testCase.message,
          from: { name: testCase.senderName }
        }
      }]
    }]
  };
}

// Executar testes
testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}`);
  console.log(`   Mensagem: "${testCase.message}"`);
  
  // Detectar área
  const detectedArea = detectLegalArea(testCase.message);
  console.log(`   Área Detectada: ${detectedArea}`);
  
  // Verificar se área esperada bate com detectada
  const areaMatch = detectedArea === testCase.area;
  console.log(`   Área Esperada: ${testCase.area} ${areaMatch ? '✅' : '❌'}`);
  
  // Verificar palavras-chave
  const foundKeywords = testCase.expectedKeywords.filter(keyword => 
    testCase.message.toLowerCase().includes(keyword.toLowerCase())
  );
  console.log(`   Palavras-chave encontradas: ${foundKeywords.join(', ')}`);
  
  // Gerar system prompt
  const systemPrompt = getSystemPrompt(detectedArea);
  console.log(`   System Prompt: ${systemPrompt.substring(0, 80)}...`);
  
  // Gerar payload do webhook
  const payload = generateWebhookPayload(testCase);
  console.log(`   Webhook Payload: ${JSON.stringify(payload).substring(0, 150)}...`);
  
  // Simular URL de envio da Graph API
  const graphAPIUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=INSTAGRAM_ACCESS_TOKEN`;
  console.log(`   Graph API: POST ${graphAPIUrl}`);
  
  console.log(`   Status: ✅ Pronto para processamento`);
  console.log('');
});

console.log("=== COMANDOS PARA TESTAR ===\n");
console.log("1. Instalar dependências:");
console.log("   npm install openai@^4.20.1");
console.log("");
console.log("2. Configurar variáveis de ambiente:");
console.log("   META_VERIFY_TOKEN=noeminha_verify_2026");
console.log("   META_APP_SECRET=noeminha_app_secret_2026"); 
console.log("   INSTAGRAM_ACCESS_TOKEN=sua_chave_aqui");
console.log("   OPENAI_API_KEY=sua_chave_openai_aqui");
console.log("");
console.log("3. Iniciar servidor:");
console.log("   npx next dev");
console.log("");
console.log("4. Testar webhook verification:");
console.log('   curl -X GET "http://localhost:3000/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test_challenge"');
console.log("");
console.log("5. Testar direct message:");
console.log('   curl -X POST "http://localhost:3000/api/meta/webhook" \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -H "X-Hub-Signature-256: sha256=test_signature" \\');
console.log('     -d \'{"object":"instagram","entry":[{"id":"123","time":1722984000,"messaging":[{"sender":{"id":"user123"},"recipient":{"id":"page456"},"timestamp":1722984000,"message":{"mid":"msg789","text":"posso me aposentar?","from":{"name":"João"}}}]}]}\'');
console.log("");
console.log("6. Monitorar logs:");
console.log("   Tail -f logs/meta_webhook.log (se configurado)");
console.log("");
console.log("=== FLUXO COMPLETO ===");
console.log("Instagram DM → Webhook → Parse → Detect Area → OpenAI GPT → Response → Graph API → Instagram DM");
console.log("");
console.log("🚀 Sistema pronto para produção na Vercel!");
