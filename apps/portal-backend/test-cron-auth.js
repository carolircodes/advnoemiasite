// TESTE CRON NOTIFICATIONS - COM E SEM AUTORIZAÇÃO

// 1. TESTE SEM AUTORIZAÇÃO (deve funcionar em desenvolvimento)
fetch('https://portal.advnoemia.com.br/api/cron/notifications')
  .then(res => res.json())
  .then(data => console.log('SEM AUTH - STATUS:', res.status, 'DATA:', data))
  .catch(err => console.error('SEM AUTH - ERROR:', err));

// 2. TESTE COM AUTORIZAÇÃO CORRETA
fetch('https://portal.advnoemia.com.br/api/cron/notifications', {
  headers: {
    'Authorization': 'Bearer cron_secret_2026_advnoemia_portal'
  }
})
  .then(res => res.json())
  .then(data => console.log('COM AUTH - STATUS:', res.status, 'DATA:', data))
  .catch(err => console.error('COM AUTH - ERROR:', err));

// 3. TESTE COM AUTORIZAÇÃO INCORRETA (deve retornar 401)
fetch('https://portal.advnoemia.com.br/api/cron/notifications', {
  headers: {
    'Authorization': 'Bearer token_errado'
  }
})
  .then(res => res.json())
  .then(data => console.log('AUTH ERRADA - STATUS:', res.status, 'DATA:', data))
  .catch(err => console.error('AUTH ERRADA - ERROR:', err));

// 4. TESTE COM FORMATO INCORRETO (deve retornar 401)
fetch('https://portal.advnoemia.com.br/api/cron/notifications', {
  headers: {
    'Authorization': 'Basic cron_secret_2026_advnoemia_portal'
  }
})
  .then(res => res.json())
  .then(data => console.log('FORMATO ERRADO - STATUS:', res.status, 'DATA:', data))
  .catch(err => console.error('FORMATO ERRADO - ERROR:', err));
