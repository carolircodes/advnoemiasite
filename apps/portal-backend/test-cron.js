// TESTE MANUAL DO CRON - EXECUTAR APÓS CONFIGURAR ENVS
// URL: https://portal.advnoemia.com.br/api/cron/notifications

// 1. TESTE SEM AUTENTICAÇÃO (DESENVOLVIMENTO)
fetch('https://portal.advnoemia.com.br/api/cron/notifications')
  .then(res => res.json())
  .then(data => console.log('CRON RESULT:', data))
  .catch(err => console.error('CRON ERROR:', err));

// 2. TESTE COM AUTENTICAÇÃO (PRODUÇÃO)
fetch('https://portal.advnoemia.com.br/api/cron/notifications', {
  headers: {
    'Authorization': 'Bearer cron_secret_2026_advnoemia_portal'
  }
})
  .then(res => res.json())
  .then(data => console.log('CRON AUTH RESULT:', data))
  .catch(err => console.error('CRON AUTH ERROR:', err));

// 3. VALIDAÇÃO DE EMAIL (CRIAR NOTIFICAÇÃO TESTE)
// INSERT INTO notifications_outbox (
//   recipient_email, subject, template_key, payload, status
// ) VALUES (
//   'test@advnoemia.com.br',
//   'Teste Cron Notifications',
//   'test-email',
//   '{"message": "Teste do sistema de notificações"}',
//   'pending'
// );
