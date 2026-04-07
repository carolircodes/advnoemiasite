// TESTE POST DO WEBHOOK WHATSAPP
fetch('https://portal.advnoemia.com.br/api/whatsapp/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-hub-signature-256': 'sha256=fake_signature_for_testing'
  },
  body: JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      id: 'test_entry_id',
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          messages: [{
            from: '5584999999999',
            id: 'test_message_id',
            timestamp: '1234567890',
            text: {
              body: 'Mensagem de teste do sistema'
            },
            type: 'text'
          }]
        }
      }]
    }]
  })
})
.then(res => res.json())
.then(data => console.log('WEBHOOK POST RESULT:', data))
.catch(err => console.error('WEBHOOK POST ERROR:', err));
