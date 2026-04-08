# Variáveis de Ambiente - NoemIA Operational System

## Variáveis Obrigatórias

### Supabase
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### OpenAI (NoemIA)
```env
OPENAI_API_KEY=sk-your-openai-api-key
```

### Meta (Instagram/WhatsApp)
```env
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
META_WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
META_WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
INSTAGRAM_ACCESS_TOKEN=your_instagram_access_token
```

### Email
```env
NOTIFICATIONS_PROVIDER=resend
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@advnoemia.com.br
```

## Variáveis Opcionais

### Logs e Monitoramento
```env
LOG_SERVICE_URL=https://your-log-service.com/api/logs
LOG_SERVICE_TOKEN=your_log_service_token
NODE_ENV=production
```

### Configurações de Notificação
```env
ENABLE_WHATSAPP_NOTIFICATIONS=true
ENABLE_EMAIL_NOTIFICATIONS=true
MAX_NOTIFICATION_ATTEMPTS=5
NOTIFICATION_RETRY_DELAY_MINUTES=5
```

### Rate Limiting
```env
NOEMIA_RATE_LIMIT_PER_MINUTE=30
NOTIFICATION_RATE_LIMIT_PER_HOUR=100
```

## Configuração por Ambiente

### Desenvolvimento (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_local_service_key
OPENAI_API_KEY=sk-your-development-key
META_VERIFY_TOKEN=dev_verify_token
META_APP_SECRET=dev_app_secret
NODE_ENV=development
```

### Produção (.env.production)
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
OPENAI_API_KEY=sk-your-production-key
META_VERIFY_TOKEN=noeminha_verify_2026
META_APP_SECRET=noeminha_app_secret_2026
META_WHATSAPP_ACCESS_TOKEN=EAAXyourwhatsappaccesstoken
META_WHATSAPP_PHONE_NUMBER_ID=1234567890123456
INSTAGRAM_ACCESS_TOKEN=EAAXyourinstagramaccesstoken
NOTIFICATIONS_PROVIDER=resend
RESEND_API_KEY=re_your_production_resend_key
EMAIL_FROM=noreply@advnoemia.com.br
NODE_ENV=production
```

## Detalhes das Variáveis

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: URL do projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave anônima para acesso público
- `SUPABASE_SERVICE_ROLE_KEY`: Chave de serviço para acesso administrativo

### OpenAI
- `OPENAI_API_KEY`: Chave da API OpenAI para funcionamento da NoemIA
- Necessária para respostas inteligentes da assistente

### Meta
- `META_VERIFY_TOKEN`: Token para verificação de webhook do Instagram
- `META_APP_SECRET`: Secret da aplicação Meta para validação HMAC
- `META_WHATSAPP_ACCESS_TOKEN`: Token de acesso à API WhatsApp Cloud
- `META_WHATSAPP_PHONE_NUMBER_ID`: ID do número de telefone WhatsApp Business
- `INSTAGRAM_ACCESS_TOKEN`: Token de acesso à API Instagram Graph

### Email
- `NOTIFICATIONS_PROVIDER`: Provedor de email (resend, smtp, etc)
- `RESEND_API_KEY`: Chave da API Resend para envio de emails
- `EMAIL_FROM`: Email remetente padrão

### Logs
- `LOG_SERVICE_URL`: URL do serviço externo de logs (opcional)
- `LOG_SERVICE_TOKEN`: Token de autenticação do serviço de logs (opcional)

## Segurança

### Tokens Sensíveis
- Nunca commitar variáveis de ambiente no repositório
- Usar diferentes chaves para desenvolvimento e produção
- Rotacionar chaves periodicamente

### Recomendações
- Usar ambiente Vercel para variáveis de produção
- Configurar secrets no GitHub Actions para CI/CD
- Monitorar uso de APIs para evitar cobranças excessivas

## Validação

### Verificação de Configuração
O sistema valida automaticamente as variáveis obrigatórias no startup:

```typescript
// Verificação de variáveis críticas
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'OPENAI_API_KEY',
  'META_VERIFY_TOKEN',
  'META_APP_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  throw new Error(`Variáveis obrigatórias faltando: ${missingVars.join(', ')}`);
}
```

### Health Check
Endpoint `/api/health` retorna status das configurações:
```json
{
  "status": "ok",
  "services": {
    "supabase": "connected",
    "openai": "configured",
    "meta": "configured",
    "email": "configured"
  },
  "missing_vars": []
}
```

## Troubleshooting

### OpenAI
- Erro `insufficient_quota`: Adicionar créditos à conta OpenAI
- Erro `invalid_api_key`: Verificar chave da API

### Meta
- Erro 403 no webhook: Verificar `META_APP_SECRET`
- WhatsApp não envia: Verificar `META_WHATSAPP_ACCESS_TOKEN`

### Email
- Emails não chegam: Verificar configuração do `RESEND_API_KEY`
- Marcação como spam: Configurar SPF/DKIM no domínio

## Migração

### De .env para .env.production
1. Exportar variáveis atuais
2. Configurar no painel Vercel
3. Remover .env do repositório
4. Testar em ambiente de staging

### Backup de Configuração
Manter arquivo `.env.example` com estrutura das variáveis:
```env
# Copiar este arquivo para .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
META_VERIFY_TOKEN=
META_APP_SECRET=
# ... outras variáveis
```
