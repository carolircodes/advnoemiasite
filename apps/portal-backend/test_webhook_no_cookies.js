// Teste para validar que webhook funciona sem dependência de cookies
const { createWebhookSupabaseClient } = require('./lib/supabase/webhook');
const { conversationPersistence } = require('./lib/services/conversation-persistence');
const { antiSpamGuard } = require('./lib/services/anti-spam-guard');

async function testWebhookNoCookies() {
  console.log('🧪 TESTE: Webhook sem dependência de cookies');
  
  try {
    // Teste 1: Criar sessão sem cookies
    console.log('\n1️⃣ Testando criação de sessão...');
    const session = await conversationPersistence.getOrCreateSession('instagram', 'test_user_123');
    console.log('✅ Sessão criada:', session.id);
    
    // Teste 2: Salvar mensagem sem cookies
    console.log('\n2️⃣ Testando salvamento de mensagem...');
    await conversationPersistence.saveMessage(
      session.id,
      'msg_123',
      'user',
      'oi',
      'inbound',
      { channel: 'instagram' }
    );
    console.log('✅ Mensagem salva');
    
    // Teste 3: Anti-spam guard sem cookies
    console.log('\n3️⃣ Testando anti-spam guard...');
    const guardResult = await antiSpamGuard.shouldRespondToEvent({
      channel: 'instagram',
      externalUserId: 'test_user_123',
      messageText: 'oi',
      isEcho: false,
      messageType: 'text'
    });
    console.log('✅ Guard funcionou:', guardResult.shouldRespond);
    
    // Teste 4: Obter histórico sem cookies
    console.log('\n4️⃣ Testando obtenção de histórico...');
    const messages = await conversationPersistence.getRecentMessages(session.id, 5);
    console.log('✅ Histórico obtido:', messages.length, 'mensagens');
    
    console.log('\n🎉 TODOS OS TESTES PASSARAM!');
    console.log('✅ Webhook funciona sem dependência de cookies');
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testWebhookNoCookies();
