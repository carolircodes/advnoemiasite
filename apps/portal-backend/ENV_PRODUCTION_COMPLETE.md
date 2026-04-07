# ==========================================
# VARIÁVEIS DE AMBIENTE - PORTAL BACKEND
# Projeto: apps/portal-backend
# ==========================================

# 🔔 NOTIFICAÇÕES E CRON
EMAIL_FROM=contato@advnoemia.com.br
RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXX
NOTIFICATIONS_PROVIDER=resend
CRON_SECRET=cron_secret_2026_advnoemia_portal

# 📱 WEBHOOKS META/WHATSAPP
META_VERIFY_TOKEN=noeminha_verify_2026
WHATSAPP_VERIFY_TOKEN=noeminha_verify_2026

# 🗄️ SUPABASE (OBRIGATÓRIO)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# 🤖 OPENAI (OPCIONAL)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-3.5-turbo

# 🏢 ADMINISTRAÇÃO (OPCIONAL)
PORTAL_ADMIN_EMAIL=admin@advnoemia.com.br
PORTAL_ADMIN_FULL_NAME=Admin Advnoemia
PORTAL_ADMIN_TEMP_PASSWORD=temp123

# 📧 EMAIL REPLICA (OPCIONAL)
NOTIFICATIONS_REPLY_TO=contato@advnoemia.com.br

# 🔄 REDIRECIONAMENTOS (OPCIONAL)
INVITE_REDIRECT_URL=https://portal.advnoemia.com.br/auth/callback
PASSWORD_RESET_REDIRECT_URL=https://portal.advnoemia.com.br/auth/reset-password

# 🌐 URLS PÚBLICAS
NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br
NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br
