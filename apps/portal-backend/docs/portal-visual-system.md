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
