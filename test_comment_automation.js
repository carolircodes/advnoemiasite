// Teste da automação de comentários do Instagram
// Simula webhook events para validar funcionamento

const testCommentPayload = {
  object: "instagram",
  entry: [{
    id: "1234567890",
    time: 1712658600,
    changes: [{
      field: "comments",
      value: {
        id: "comment_12345",
        from: {
          id: "user_67890",
          username: "testuser",
          full_name: "Test User"
        },
        text: "Gostaria de saber sobre aposentadoria",
        media: {
          id: "media_aposentadoria_001"
        },
        created_time: 1712658600
      }
    }]
  }]
};

const testCommentWithoutKeyword = {
  object: "instagram",
  entry: [{
    id: "1234567890",
    time: 1712658600,
    changes: [{
      field: "comments",
      value: {
        id: "comment_67890",
        from: {
          id: "user_11111",
          username: "otheruser",
          full_name: "Other User"
        },
        text: "Ótimo vídeo!",
        media: {
          id: "media_aposentadoria_001"
        },
        created_time: 1712658600
      }
    }]
  }]
};

const testCommentDifferentMedia = {
  object: "instagram",
  entry: [{
    id: "1234567890",
    time: 1712658600,
    changes: [{
      field: "comments",
      value: {
        id: "comment_99999",
        from: {
          id: "user_22222",
          username: "bankuser",
          full_name: "Bank User"
        },
        text: "O banco está cobrando juros abusivos",
        media: {
          id: "media_bancario_001"
        },
        created_time: 1712658600
      }
    }]
  }]
};

async function testCommentAutomation() {
  console.log('=== TESTANDO AUTOMAÇÃO DE COMENTÁRIOS ===\n');

  try {
    // Test 1: Comentário com keyword correta
    console.log('TEST 1: Comentário com keyword "aposentadoria"');
    console.log('Payload:', JSON.stringify(testCommentPayload, null, 2));
    
    const response1 = await fetch('http://localhost:3000/api/meta/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature_bypass'
      },
      body: JSON.stringify(testCommentPayload)
    });
    
    console.log('Response Status:', response1.status);
    console.log('Response Body:', await response1.text());
    console.log('---\n');

    // Test 2: Comentário sem keyword
    console.log('TEST 2: Comentário sem keyword');
    console.log('Payload:', JSON.stringify(testCommentWithoutKeyword, null, 2));
    
    const response2 = await fetch('http://localhost:3000/api/meta/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature_bypass'
      },
      body: JSON.stringify(testCommentWithoutKeyword)
    });
    
    console.log('Response Status:', response2.status);
    console.log('Response Body:', await response2.text());
    console.log('---\n');

    // Test 3: Comentário com keyword em mídia diferente
    console.log('TEST 3: Comentário com keyword "banco" em mídia bancária');
    console.log('Payload:', JSON.stringify(testCommentDifferentMedia, null, 2));
    
    const response3 = await fetch('http://localhost:3000/api/meta/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature_bypass'
      },
      body: JSON.stringify(testCommentDifferentMedia)
    });
    
    console.log('Response Status:', response3.status);
    console.log('Response Body:', await response3.text());
    console.log('---\n');

    // Test 4: Duplicidade (enviar mesmo comentário novamente)
    console.log('TEST 4: Teste de duplicidade (mesmo comentário)');
    const response4 = await fetch('http://localhost:3000/api/meta/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hub-signature-256': 'sha256=test_signature_bypass'
      },
      body: JSON.stringify(testCommentPayload)
    });
    
    console.log('Response Status:', response4.status);
    console.log('Response Body:', await response4.text());
    console.log('---\n');

  } catch (error) {
    console.error('ERRO NOS TESTES:', error);
  }
}

// Função para verificar estado das tabelas após testes
async function checkDatabaseState() {
  console.log('=== VERIFICANDO ESTADO DO BANCO ===\n');
  
  try {
    // Verificar campanhas ativas
    const campaignsResponse = await fetch('http://localhost:3000/api/internal/debug/campaigns');
    const campaigns = await campaignsResponse.json();
    console.log('Campanhas Ativas:', JSON.stringify(campaigns, null, 2));
    console.log('---\n');

    // Verificar eventos de comentários
    const eventsResponse = await fetch('http://localhost:3000/api/internal/debug/comment-events');
    const events = await eventsResponse.json();
    console.log('Eventos de Comentários:', JSON.stringify(events, null, 2));
    console.log('---\n');

  } catch (error) {
    console.error('ERRO AO VERIFICAR BANCO:', error);
  }
}

// Executar testes
if (require.main === module) {
  console.log('Iniciando testes de automação de comentários...\n');
  
  // Esperar um pouco para o servidor estar pronto
  setTimeout(async () => {
    await testCommentAutomation();
    
    // Esperar processamento e verificar banco
    setTimeout(async () => {
      await checkDatabaseState();
      console.log('\n=== TESTES CONCLUÍDOS ===');
      process.exit(0);
    }, 3000);
  }, 1000);
}

module.exports = {
  testCommentPayload,
  testCommentWithoutKeyword,
  testCommentDifferentMedia,
  testCommentAutomation,
  checkDatabaseState
};
