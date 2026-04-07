// Teste para debug do webhook do Instagram
// Simula diferentes estruturas de payload que o Instagram pode enviar

const testInstagramPayloads = {
  // Payload 1: Estrutura clássica (messaging)
  classicMessaging: {
    object: 'instagram',
    entry: [{
      id: '1234567890',
      time: 1672531200,
      messaging: [{
        sender: {
          id: 'USER_ID_123'
        },
        recipient: {
          id: 'PAGE_ID_456'
        },
        timestamp: 1672531200,
        message: {
          mid: 'MSG_ID_789',
          text: 'Olá, preciso de ajuda com um caso'
        }
      }]
    }]
  },

  // Payload 2: Estrutura com changes (mais comum recentemente)
  changesStructure: {
    object: 'instagram',
    entry: [{
      id: '1234567890',
      time: 1672531200,
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'instagram',
          messages: [{
            id: 'MSG_ID_789',
            from: {
              id: 'USER_ID_123',
              username: 'usuario_instagram'
            },
            to: {
              id: 'PAGE_ID_456'
            },
            timestamp: 1672531200,
            type: 'text',
            text: 'Olá, preciso de ajuda com um caso'
          }],
          contacts: [{
            profile_pic: 'https://...',
            wa_id: 'USER_ID_123',
            display_name: 'Nome do Usuário',
            username: 'usuario_instagram'
          }]
        }
      }]
    }]
  },

  // Payload 3: Estrutura com standby
  standbyStructure: {
    object: 'instagram',
    entry: [{
      id: '1234567890',
      time: 1672531200,
      standby: [{
        sender: {
          id: 'USER_ID_123'
        },
        recipient: {
          id: 'PAGE_ID_456'
        },
        timestamp: 1672531200,
        message: {
          mid: 'MSG_ID_789',
          text: 'Olá, preciso de ajuda com um caso'
        }
      }]
    }]
  }
};

// Função para testar parsing
function testPayloadParsing(payload, payloadName) {
  console.log(`\n=== TESTANDO PAYLOAD: ${payloadName} ===`);
  console.log('Object:', payload.object);
  console.log('Entry count:', payload.entry?.length || 0);
  
  if (payload.entry) {
    payload.entry.forEach((entry, index) => {
      console.log(`\nEntry ${index + 1}:`);
      console.log('- ID:', entry.id);
      console.log('- Time:', entry.time);
      console.log('- Keys:', Object.keys(entry));
      
      if (entry.messaging) {
        console.log('- Tem messaging: SIM');
        console.log('- Messaging count:', entry.messaging.length);
        entry.messaging.forEach((msg, msgIndex) => {
          console.log(`  Messaging ${msgIndex + 1}:`);
          console.log('  - Sender ID:', msg.sender?.id);
          console.log('  - Has message:', !!msg.message);
          console.log('  - Message text:', msg.message?.text);
        });
      } else {
        console.log('- Tem messaging: NÃO');
      }
      
      if (entry.changes) {
        console.log('- Tem changes: SIM');
        console.log('- Changes count:', entry.changes.length);
        entry.changes.forEach((change, changeIndex) => {
          console.log(`  Change ${changeIndex + 1}:`);
          console.log('  - Field:', change.field);
          console.log('  - Has messages:', !!change.value?.messages);
          if (change.value?.messages) {
            change.value.messages.forEach((msg, msgIndex) => {
              console.log(`    Message ${msgIndex + 1}:`);
              console.log('    - From ID:', msg.from?.id);
              console.log('    - Type:', msg.type);
              console.log('    - Text:', msg.text);
            });
          }
        });
      } else {
        console.log('- Tem changes: NÃO');
      }
      
      if (entry.standby) {
        console.log('- Tem standby: SIM');
        console.log('- Standby count:', entry.standby.length);
      } else {
        console.log('- Tem standby: NÃO');
      }
    });
  }
}

// Testar todos os payloads
function runAllTests() {
  console.log('Instagram Webhook Debug - Test Suite');
  console.log('======================================');
  
  Object.keys(testInstagramPayloads).forEach(payloadName => {
    testPayloadParsing(testInstagramPayloads[payloadName], payloadName);
  });
  
  console.log('\n=== ANÁLISE DO PROBLEMA ===');
  console.log('1. O código atual só processa "entry.messaging"');
  console.log('2. Instagram pode enviar "entry.changes" ou "entry.standby"');
  console.log('3. Precisamos adicionar suporte para todas as estruturas');
  console.log('4. A estrutura "changes" é mais comum recentemente');
  
  console.log('\n=== SOLUÇÃO NECESSÁRIA ===');
  console.log('1. Adicionar parsing para entry.changes');
  console.log('2. Adicionar parsing para entry.standby');
  console.log('3. Manter compatibilidade com entry.messaging');
  console.log('4. Logs detalhados para identificar estrutura recebida');
}

// Executar testes
runAllTests();
