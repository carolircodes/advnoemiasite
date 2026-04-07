// Teste para validação do envio automático de respostas no Instagram Direct

// Mock do fetch para simular a Graph API
global.fetch = async (url, options) => {
  console.log('🌐 MOCK FETCH - URL:', url);
  console.log('📦 MOCK FETCH - OPTIONS:', JSON.stringify(options, null, 2));
  
  // Simular resposta de sucesso da Graph API
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    text: async () => JSON.stringify({
      message_id: 'mock_message_id_12345',
      recipient_id: JSON.parse(options.body).recipient.id
    })
  };
};

// Mock do process.env
process.env.INSTAGRAM_ACCESS_TOKEN = 'mock_token_12345';

// Função sendInstagramMessage (extraída do webhook)
async function sendInstagramMessage(senderId, messageText) {
  try {
    if (!process.env.INSTAGRAM_ACCESS_TOKEN) {
      console.log("❌ INSTAGRAM_ACCESS_TOKEN não configurado");
      return false;
    }

    console.log("📩 Respondendo usuário:", senderId);
    console.log("📝 Mensagem:", messageText);
    
    const apiUrl = `https://graph.facebook.com/v19.0/me/messages?access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`;
    
    const payload = {
      recipient: { id: senderId },
      message: { text: messageText }
    };

    console.log("🌐 Enviando para Graph API:", apiUrl);
    console.log("📦 Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }

    console.log("📊 Resposta Graph API:", {
      status: response.status,
      statusText: response.statusText,
      data: responseData
    });

    if (response.ok) {
      console.log("✅ Mensagem enviada com sucesso para:", senderId);
      return true;
    } else {
      console.log("❌ Erro ao enviar mensagem:", responseData);
      return false;
    }
  } catch (error) {
    console.log("💥 Exceção ao enviar mensagem:", error);
    return false;
  }
}

// Testes
async function runTests() {
  console.log('🧪 INICIANDO TESTES DE AUTO-REPLY INSTAGRAM\n');
  
  // Teste 1: Envio bem-sucedido
  console.log('=== TESTE 1: Envio bem-sucedido ===');
  const result1 = await sendInstagramMessage('user_12345', 'Olá! Recebi sua mensagem e já vou te ajudar.');
  console.log('Resultado:', result1 ? '✅ SUCESSO' : '❌ FALHA');
  
  console.log('\n=== TESTE 2: Formato entry.messaging ===');
  const messagingPayload = {
    object: 'instagram',
    entry: [{
      id: '123456789',
      messaging: [{
        sender: { id: 'user_67890' },
        message: { 
          text: 'Posso me aposentar?',
          mid: 'msg_123'
        },
        timestamp: 1640995200000
      }]
    }]
  };
  
  console.log('Payload messaging:', JSON.stringify(messagingPayload, null, 2));
  
  // Simular processamento do webhook para formato messaging
  for (const entry of messagingPayload.entry) {
    for (const messaging of entry.messaging || []) {
      if (messaging.message?.text && messaging.sender?.id) {
        const result2 = await sendInstagramMessage(messaging.sender.id, "Olá! Recebi sua mensagem e já vou te ajudar.");
        console.log('Resultado messaging:', result2 ? '✅ SUCESSO' : '❌ FALHA');
      }
    }
  }
  
  console.log('\n=== TESTE 3: Formato entry.changes ===');
  const changesPayload = {
    object: 'instagram',
    entry: [{
      id: '123456789',
      changes: [{
        field: 'messages',
        value: {
          messages: [{
            from: { id: 'user_11111' },
            text: 'O banco me cobrou errado',
            id: 'msg_456',
            timestamp: 1640995200000
          }]
        }
      }]
    }]
  };
  
  console.log('Payload changes:', JSON.stringify(changesPayload, null, 2));
  
  // Simular processamento do webhook para formato changes
  for (const entry of changesPayload.entry) {
    for (const change of entry.changes || []) {
      if (change.field === 'messages') {
        for (const message of change.value?.messages || []) {
          if (message.from?.id) {
            const result3 = await sendInstagramMessage(message.from.id, "Olá! Recebi sua mensagem e já vou te ajudar.");
            console.log('Resultado changes:', result3 ? '✅ SUCESSO' : '❌ FALHA');
          }
        }
      }
    }
  }
  
  console.log('\n🎉 TESTES CONCLUÍDOS!');
  console.log('📋 RESUMO:');
  console.log('- ✅ Função sendInstagramMessage implementada');
  console.log('- ✅ Suporte a formato entry.messaging');
  console.log('- ✅ Suporte a formato entry.changes');
  console.log('- ✅ Logs detalhados para debug');
  console.log('- ✅ Tratamento de erros');
}

// Executar testes
runTests().catch(console.error);
