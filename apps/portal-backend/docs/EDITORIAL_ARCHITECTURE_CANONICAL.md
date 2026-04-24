# Editorial Architecture Canonical

## Source Of Truth

- `lib/site/editorial-taxonomy.ts`: taxonomia canonica de areas, hubs, subtemas, intencoes e money pages.
- `lib/site/article-content.ts`: catalogo editorial dos artigos e funcoes de leitura/interlinking.
- `app/atuacao/*`: paginas de entrada por area juridica.
- `app/artigos/*`: hubs e artigos conectados ao cluster editorial.

## Estrutura Editorial

- Home (`/`): entrada principal de atendimento, triagem e descoberta editorial.
- Money pages (`/atuacao/[slug]`): entrada por area com foco em intencao de busca e conversao elegante.
- Hubs (`/artigos/tema/[topic]`): agrupamento editorial por cluster tematico.
- Articles (`/artigos/[slug]`): leitura detalhada com CTA contextual, hub e pagina de atuacao relacionados.

## Taxonomia Atual

- `previdenciario`
- `consumidor_bancario`
- `familia`
- `civil`

Cada topico define:

- slug publico
- hub editorial
- money page correspondente
- subtemas prioritarios
- sinais de autoridade
- intencao primaria e secundaria
- CTA de conversao

## Regras De Evolucao

- Novo artigo deve nascer vinculado a um topico canonico e a um estagio de funil.
- Novo topico so deve existir se trouxer hub, money page, subtemas e CTA coerentes.
- Interlinking minimo:
  - artigo -> hub do tema
  - artigo -> pagina de atuacao
  - hub -> artigos do cluster
  - hub -> money page
  - money page -> hub + artigos do cluster + triagem
- Sempre preferir crescer clusters existentes antes de abrir paginas isoladas.

## SEO E Conversao

- `sitemap.ts` indexa home, paginas legais, `/atuacao`, money pages, hubs e artigos.
- `robots.ts` permite apenas superficies publicas estrategicas.
- Metadata publica passa por `lib/site/seo.ts` para reduzir drift entre canonical, Open Graph e Twitter.
- CTA editorial prioriza triagem e NoemIA com contexto de tema e conteudo, em vez de links soltos.
