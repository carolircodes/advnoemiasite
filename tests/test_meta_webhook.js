// Teste do Webhook Meta - Exemplos de Payloads

const testCases = [
  {
    name: "Direct Message - Aposentadoria",
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=test_signature"
    },
    body: {
      object: "instagram",
      entry: [{
        id: "123456789",
        time: 1722984000,
        messaging: [{
          sender: { id: "user_123" },
          recipient: { id: "page_456" },
          timestamp: 1722984000,
          message: {
            mid: "msg_789",
            text: "Olá, posso me aposentar com 55 anos?",
            from: { name: "João Silva" }
          }
        }]
      }]
    }
  },
  {
    name: "Comment - Bancário",
    method: "POST", 
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": "sha256=test_signature"
    },
    body: {
      object: "instagram",
      entry: [{
        id: "123456789",
        time: 1722984000,
        changes: [{
          field: "comments",
          value: {
            id: "comment_123",
            from: { id: "user_456", username: "maria_santos" },
            message: "Meu banco cobrou uma tarifa indevida, o que fazer?",
            created_time: 1722984000,
            media: { id: "media_789", owner: { id: "page_456" } }
          }
        }]
      }]
    }
  },
  {
    name: "Webhook Verification",
    method: "GET",
    query: {
      "hub.mode": "subscribe",
      "hub.verify_token": "noeminha_verify_2026",
      "hub.challenge": "test_challenge_12345"
    }
  }
];

console.log("=== TESTES DO WEBHOOK META ===\n");

testCases.forEach((testCase, index) => {
  console.log(`\n${index + 1}. ${testCase.name}`);
  console.log(`   Método: ${testCase.method}`);
  
  if (testCase.method === "GET") {
    console.log(`   Query: ${JSON.stringify(testCase.query, null, 6)}`);
    console.log(`   URL: http://localhost:3000/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test_challenge_12345`);
    console.log(`   Resposta Esperada: 200 + "test_challenge_12345"`);
  } else {
    console.log(`   Headers: ${JSON.stringify(testCase.headers, null, 6)}`);
    console.log(`   Body: ${JSON.stringify(testCase.body, null, 6)}`);
    
    // Simular detecção de intenção
    const text = testCase.body.entry[0].messaging?.[0]?.message?.text || 
                 testCase.body.entry[0].changes?.[0]?.value?.message || "";
    
    console.log(`   Texto Recebido: "${text}"`);
    
    // Simular detecção
    const lowerText = text.toLowerCase();
    let detectedIntent = null;
    
    if (lowerText.includes('aposentadoria') || lowerText.includes('aposentar') || lowerText.includes('inss')) {
      detectedIntent = 'aposentadoria';
    } else if (lowerText.includes('banco') || lowerText.includes('cobrança') || lowerText.includes('tarifa')) {
      detectedIntent = 'bancario';
    }
    
    console.log(`   Intenção Detectada: ${detectedIntent || 'null'}`);
    
    // Gerar link contextual
    if (detectedIntent) {
      const link = `https://advnoemia.com.br/noemia?tema=${detectedIntent}&origem=instagram&video=auto`;
      console.log(`   Link Gerado: ${link}`);
    }
    
    console.log(`   Resposta Esperada: 200 + eventos processados`);
  }
});

console.log("\n=== COMANDOS PARA TESTAR ===\n");
console.log("1. Iniciar o servidor:");
console.log("   npx next dev");
console.log("\n2. Testar webhook verification (GET):");
console.log('   curl -X GET "http://localhost:3000/api/meta/webhook?hub.mode=subscribe&hub.verify_token=noeminha_verify_2026&hub.challenge=test_challenge_12345"');
console.log("\n3. Testar direct message (POST):");
console.log('   curl -X POST "http://localhost:3000/api/meta/webhook" \\');
console.log('     -H "Content-Type: application/json" \\');
console.log('     -d \'{"object":"instagram","entry":[{"id":"123","time":1722984000,"messaging":[{"sender":{"id":"user123"},"recipient":{"id":"page456"},"timestamp":1722984000,"message":{"mid":"msg789","text":"posso me aposentar?","from":{"name":"João"}}}]}]}\'');
console.log("\n4. Verificar logs no console do servidor");
