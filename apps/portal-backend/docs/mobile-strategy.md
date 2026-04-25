# Mobile Strategy

## Decisao principal
- O proximo passo correto e `PWA primeiro` para o publico cliente.
- Nao e o momento certo para um app nativo completo nem para espelhar o portal interno no celular.
- Operacao interna deve entrar depois com `mobile web leve`, focada em leitura rapida, fila curta e acao urgente.

## Publicos

### Cliente
- Melhor encaixe mobile: acompanhar caso, agenda, documentos, pagamento e resposta curta.
- Frequencia: media a alta.
- Urgencia: media.
- Densidade aceitavel: baixa a media.
- Push faz sentido para agenda, documento pendente, pagamento confirmado e novo passo liberado.
- Recomendacao: `PWA premium` com foco em consulta rapida, upload, pagamento e retomada.

### Equipe interna
- Melhor encaixe mobile: leitura rapida de fila, handoff, retorno curto, agenda do dia e alertas.
- Nao deve espelhar CRM, Inbox completo, cockpit operacional ou tela densa de pipeline.
- Frequencia: alta para consulta curta, baixa para operacao profunda.
- Urgencia: alta.
- Densidade aceitavel: media, mas so com recorte.
- Recomendacao: `web responsivo forte agora`, com eventual camada mobile leve depois.

### Advogada
- Melhor encaixe mobile: agenda do dia, urgencias, aprovacoes, leitura de casos prioritarios e retorno curto.
- Nao deve carregar central operacional completa, documentos administrativos extensos ou configuracoes densas.
- Frequencia: media.
- Urgencia: alta.
- Push faz sentido para handoff humano, agenda iminente, pagamento relevante e cliente em risco.
- Recomendacao: `mobile web executivo` na segunda onda, sem app nativo no primeiro movimento.

### Gestao executiva
- Melhor encaixe mobile: leitura de pulso, indicadores, risco e excecoes.
- Nao precisa de app agora.
- Recomendacao: painel responsivo curto e seguro.

## PWA vs app nativo

### O que o PWA resolve bem agora
- instalacao na home screen
- acesso rapido ao portal do cliente
- fluxo autenticado sem duplicar backend
- deep linking para agenda, documentos e pagamento
- upload de documento usando camera ou arquivo no navegador
- evolucao incremental sobre a base premium ja pronta
- menor custo de produto, design e manutencao

### O que o PWA nao resolve plenamente ainda
- notificacao push iOS com o mesmo conforto de app em todos os cenarios
- integracoes profundas de fundo
- experiencia offline rica
- operacao interna pesada com threading denso e multitarefa longa

### O que o app nativo faria melhor
- notificacoes e retomada mais fortes para publico recorrente
- integracoes mais profundas de camera, push e background
- superficies curtas de aprovacao ou resposta urgente

### Decisao
- `Etapa 1`: PWA para cliente.
- `Etapa 2`: mobile web leve para operacao e advogada.
- `Etapa 3`: avaliar app nativo somente se a frequencia de uso, push e resposta curta justificarem um produto proprio.
- `Nao fazer agora`: app nativo espelhando Inbox, CRM, casos, agenda e documentos completos.

## MVP mobile recomendado

### MVP obrigatorio do cliente
- meu painel com leitura executiva
- agenda do caso
- documentos disponiveis
- solicitacoes de documento com upload
- pagamento e retorno de confirmacao
- atalhos claros para atendimento
- install prompt e abertura pela home screen
- retomada curta com navegacao focada em painel, agenda e documentos

### Nice to have do cliente
- install prompt do PWA
- push para eventos criticos
- biometria ou reentrada facilitada, se o ecossistema justificar

### Nao entra agora para cliente
- offline complexo
- espelhamento de todas as superfícies do portal
- ecossistema completo com baixa frequencia de uso

### MVP obrigatorio de operacao futura
- fila curta de urgencias
- handoff humano
- agenda do dia
- resposta curta e decisao binaria

### Nao entra agora para operacao
- Inbox completo no celular
- CRM completo
- cockpit operacional denso
- configuracoes e telas administrativas extensas

## Guardrails
- mobile nao pode nascer como espelho do desktop
- toda tela mobile precisa responder a um uso curto, recorrente ou urgente
- se exigir leitura longa, comparacao multipainel ou composicao extensa, fica no desktop
- push so entra para evento com acao clara e valor real
- app nativo so entra quando PWA e mobile web provarem frequencia e limites reais

## Roadmap

### M0
- consolidar decisao de plataforma
- completar revisao visual humana em mobile/tablet
- medir fluxos cliente e operacao mais usados em larguras menores

### M1
- fechar refinamentos responsivos do cliente
- habilitar manifest, viewport e readiness basica de PWA
- preparar eventos de install, retorno e uso mobile

### M2
- lancar `PWA cliente`
- focar em painel, agenda, documentos, upload e pagamento
- testar install, retorno e retomada

## MVP implementado nesta fase
- manifest com atalhos reais para painel, agenda, documentos e atendimento
- icon e apple icon para instalacao com identidade minima do portal
- prompt de instalacao para navegadores suportados e instrucoes leves para iPhone
- dock mobile curto para cliente, sem espelhar o portal interno
- painel do cliente refinado para destacar retomada e proximo passo
- agenda e documentos com atalhos de retorno e leitura mais curta em celular
- upload documental com caminho direto para arquivo ou camera
- retorno de pagamento apontando primeiro para o painel do cliente

### M3
- criar camada mobile leve para advogada e operacao
- agenda do dia, alertas, handoff e resposta curta
- sem espelhar o portal interno denso

## M3 implementado nesta fase
- briefing movel curto dentro de `/internal/advogada`
- foco em agenda do dia, urgencias, handoff cliente/equipe e caso em foco
- atalhos rapidos para agenda, fila curta, caso em foco e Noemia
- nao entra: Inbox completo, CRM denso, cockpit espelhado, configuracoes e listas longas de baixa frequencia

### M4
- decidir se app nativo ainda faz sentido
- criterio: frequencia alta, valor claro de push, necessidade de integracao nativa e friccao relevante no PWA
