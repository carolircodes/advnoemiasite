# Portal Visual System

## Principios
- Menos ruido, mais hierarquia.
- O shell deve transmitir contexto antes de opcao.
- Estados vazios, loading e erro precisam continuar elegantes e uteis.
- Cliente e operacao compartilham a mesma linguagem visual, com tons diferentes de contexto.

## Primitives canonicas
- `PremiumSurface`: superficie base para cards, paineis e modulos.
- `PremiumSection`: cabecalho + corpo com semantica consistente para secoes.
- `PremiumStatePanel`: estado premium para loading, erro, aviso e sucesso.
- `PremiumFeatureCard`: destaque curto para beneficios, leitura executiva e resumos.

## Shell e linguagem
- Navegacao prioriza clareza institucional e continuidade operacional.
- Microcopy evita ingles perdido, labels genericos e tom cru de sistema.
- Estados devem explicar o que esta acontecendo, o que continua disponivel e qual e o proximo passo.

## Como evoluir novas telas
- Reutilizar `PremiumSection` antes de criar um novo container local.
- Reutilizar `PremiumStatePanel` para loading, vazio, erro e indisponibilidade parcial.
- So criar nova variante visual quando houver diferenca semantica real.
- Preferir refinar tokens e primitives compartilhadas a repetir combinacoes de classes.

## Superficies operacionais densas
- Inbox, CRM, casos e cockpits devem separar leitura executiva, fila principal e contexto profundo.
- O que destrava a operacao entra primeiro; detalhes profundos ficam recolhidos ou em paineis laterais.
- Filtros devem refinar a leitura, nao substituir a hierarquia principal da tela.
- Estados vazios em telas densas precisam orientar o proximo passo, nao apenas informar ausencia de dados.
- Casos, agenda e documentos devem expor logo no topo a pressao operacional, o contexto do cliente e o proximo movimento recomendado.
- Quando houver recorte por cliente ou caso, esse foco precisa aparecer na composicao da tela e nao so dentro dos filtros.
- Fallback, modulo pausado e base segura devem usar `PremiumStatePanel` com linguagem explicita e sem alertas crus.
- Listas densas precisam responder de imediato: o que e o item, qual o estado atual e qual acao executiva a equipe ou o cliente deve tomar.
- Rotas internas sob o shell sticky devem preferir a variante de workspace do `AppFrame`, com largura util real, padding superior proprio e offset de ancora compativel com a altura do topbar.
- Quando a sidebar reduzir a largura disponivel, `grid.two` e `grid.three` devem colapsar antes de comprimir titulos e cabecalhos de painel.
