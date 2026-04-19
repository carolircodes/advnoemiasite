# Mapeamento de Superfícies e Deploy Vercel

## Superfícies oficiais

- Site principal: raiz do repositório (`index.html`, páginas estáticas e APIs legadas em `app/api`)
- Portal operacional: `apps/portal-backend` (Next.js)

## Projetos Vercel oficiais

- Projeto `advnoemiasite`
  - domínio principal: `advnoemia.com.br`
  - domínios adicionais: `www.advnoemia.com.br`, `api.advnoemia.com.br`
  - função esperada: publicar o site institucional da raiz do repositório

- Projeto `advnoemiaportal`
  - domínio principal: `portal.advnoemia.com.br`
  - função esperada: publicar o Next.js de `apps/portal-backend`

## Diagnóstico confirmado em 2026-04-19

Os commits recentes do frontend do portal foram implantados no projeto errado.

Evidência observada na Vercel:

- `advnoemiasite` recebeu os deploys de:
  - `2a3e897` em `2026-04-18 19:50`
  - `8ba6595` em `2026-04-19 01:30`
  - `afa65b9` em `2026-04-19 12:27`
- `advnoemiaportal` parou em:
  - `2a3e897` em `2026-04-18 19:50`

Conclusão: o portal não está deixando de refletir mudanças por erro de frontend ou de build local. O problema está no vínculo de deploy do projeto `advnoemiaportal`, que deixou de acompanhar os commits mais recentes enquanto o projeto `advnoemiasite` continuou publicando tudo.

## Configuração correta esperada na Vercel

### Projeto `advnoemiaportal`

- Root Directory: `apps/portal-backend`
- Framework Preset: `Next.js`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `.next`
- Production Branch: `main`
- Ignored Build Step: vazio ou desabilitado
- Monorepo path filters: precisam incluir `apps/portal-backend/**`
- Cron compatível com Hobby: no máximo 1x por dia

### Projeto `advnoemiasite`

- Root Directory: `.`
- Framework Preset: `Other` ou a configuração estática atualmente usada pelo projeto
- Ele não deve ser a fonte de validação do frontend do portal

## Prova visual do deploy do portal

O shell interno do portal agora exibe um selo discreto `Release do portal <sha>` no topo da interface.

Origem do valor:

- `NEXT_PUBLIC_PORTAL_RELEASE_LABEL`, se definido manualmente
- senão `VERCEL_GIT_COMMIT_SHA` truncado para 7 caracteres durante o build
- fallback local: `local`

Validação operacional:

1. fazer deploy do projeto `advnoemiaportal`
2. abrir `portal.advnoemia.com.br`
3. confirmar no topo do portal o selo `Release do portal`
4. verificar se o SHA exibido bate com o commit publicado

## Política de cron do portal

O cron do portal fica em `apps/portal-backend/vercel.json` e agora está em frequência diária compatível com o plano Hobby.

- schedule atual: `0 12 * * *`
- rota acionada: `/api/cron/notifications`
- proteção esperada: `Authorization: Bearer <CRON_SECRET>`

Se a operação voltar a exigir processamento subdiário, a ação correta não é recolocar `*/5 * * * *` no repositório. A ação correta é promover o projeto `advnoemiaportal` para Pro e só então aumentar a cadência.

## Como evitar novos desvios

1. validar qualquer ajuste de frontend do portal em `apps/portal-backend`
2. confirmar que o preview ou production deploy saiu em `advnoemiaportal`
3. não usar `advnoemia.com.br` como prova de deploy do portal
4. sempre comparar commit SHA do deploy com o selo interno do portal
