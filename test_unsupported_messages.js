// Teste para validação da proteção contra mensagens não suportadas
// WhatsApp e Instagram

console.log('=== TESTE DE PROTEÇÃO CONTRA MENSAGENS NÃO SUPORTADAS ===\n');

// Teste 1: Mensagem de áudio no WhatsApp
console.log('1. TESTE - Mensagem de áudio no WhatsApp:');
const whatsappAudioMessage = {
  object: "whatsapp_business_account",
  entry: [{
    changes: [{
      field: "messages",
      value: {
        messages: [{
          from: "5511999999999",
          type: "audio",
          audio: {
            id: "audio_123",
            mime_type: "audio/ogg"
          }
        }]
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(whatsappAudioMessage, null, 2));
console.log('Esperado: Deve enviar mensagem de proteção "No momento, este atendimento está habilitado apenas para mensagens escritas..."\n');

// Teste 2: Mensagem de imagem no WhatsApp
console.log('2. TESTE - Mensagem de imagem no WhatsApp:');
const whatsappImageMessage = {
  object: "whatsapp_business_account",
  entry: [{
    changes: [{
      field: "messages",
      value: {
        messages: [{
          from: "5511999999999",
          type: "image",
          image: {
            id: "image_123",
            mime_type: "image/jpeg",
            caption: "Olá, preciso de ajuda"
          }
        }]
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(whatsappImageMessage, null, 2));
console.log('Esperado: Deve enviar mensagem de proteção "No momento, este atendimento está habilitado apenas para mensagens escritas..."\n');

// Teste 3: Mensagem de áudio no Instagram (formato messaging)
console.log('3. TESTE - Mensagem de áudio no Instagram (messaging):');
const instagramAudioMessage = {
  object: "instagram",
  entry: [{
    messaging: [{
      sender: { id: "USER_123" },
      message: {
        type: "audio",
        audio: {
          id: "audio_456"
        }
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(instagramAudioMessage, null, 2));
console.log('Esperado: Deve enviar mensagem de proteção "No momento, este atendimento está habilitado apenas para mensagens escritas..."\n');

// Teste 4: Mensagem de vídeo no Instagram (formato changes)
console.log('4. TESTE - Mensagem de vídeo no Instagram (changes):');
const instagramVideoMessage = {
  object: "instagram",
  entry: [{
    changes: [{
      field: "messages",
      value: {
        messages: [{
          from: { id: "USER_456" },
          type: "video",
          video: {
            id: "video_789"
          }
        }]
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(instagramVideoMessage, null, 2));
console.log('Esperado: Deve enviar mensagem de proteção "No momento, este atendimento está habilitado apenas para mensagens escritas..."\n');

// Teste 5: Mensagem de texto (deve funcionar normalmente)
console.log('5. TESTE - Mensagem de texto no WhatsApp (deve funcionar):');
const whatsappTextMessage = {
  object: "whatsapp_business_account",
  entry: [{
    changes: [{
      field: "messages",
      value: {
        messages: [{
          from: "5511999999999",
          type: "text",
          text: {
            body: "Olá, preciso de ajuda com meu caso"
          }
        }]
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(whatsappTextMessage, null, 2));
console.log('Esperado: Deve processar normalmente com a NoemIA\n');

// Teste 6: Mensagem de texto no Instagram (deve funcionar)
console.log('6. TESTE - Mensagem de texto no Instagram (deve funcionar):');
const instagramTextMessage = {
  object: "instagram",
  entry: [{
    messaging: [{
      sender: { id: "USER_789" },
      message: {
        text: "Olá, posso me aposentar?"
      }
    }]
  }]
};

console.log('Payload:', JSON.stringify(instagramTextMessage, null, 2));
console.log('Esperado: Deve processar normalmente com a NoemIA\n');

console.log('=== INSTRUÇÕES PARA TESTE MANUAL ===');
console.log('1. Use curl ou Postman para enviar estes payloads para os webhooks');
console.log('2. WhatsApp: POST https://advnoemia.com.br/api/whatsapp/webhook');
console.log('3. Instagram: POST https://advnoemia.com.br/api/meta/webhook');
console.log('4. Verifique os logs para confirmar as mensagens de proteção');
console.log('5. Confirme que mensagens de texto continuam funcionando normalmente');
