# 🔥 VARIÁVEIS ADICIONAIS NECESSÁRIAS

Além das variáveis já configuradas, o sistema PRECISA destas:

# URL DA APLICAÇÃO (OBRIGATÓRIO)
NEXT_PUBLIC_APP_URL=https://portal.advnoemia.com.br

# URL DO SITE PÚBLICO (OPCIONAL)
NEXT_PUBLIC_PUBLIC_SITE_URL=https://advnoemia.com.br

# SUPABASE (OBRIGATÓRIO SE NÃO TIVER)
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SECRET_KEY=eyJ...

# EXPLICAÇÃO:
O erro 500 está acontecendo porque NEXT_PUBLIC_APP_URL é obrigatório
no schema de validação mas não foi configurado na Vercel.
