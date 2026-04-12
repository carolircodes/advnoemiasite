# AdvNoemia Monorepo

Entrypoint oficial do app principal: `apps/portal-backend`.

Comandos oficiais na raiz:

- `npm run dev`
- `npm run build`
- `npm run start`

Esses scripts delegam explicitamente para o workspace `portal-backend` para reduzir ambiguidade de build e deploy.

Arquivos estáticos na raiz continuam existindo como acervo institucional, mas o app operacional principal validado nas Fases 0 e 1 é o Next.js em `apps/portal-backend`.
