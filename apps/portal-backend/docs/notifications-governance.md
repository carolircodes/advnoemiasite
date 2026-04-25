# Notifications Governance

## O que entra agora

- Cliente
  - `client.document.pending`: e-mail com CTA direto para `/documentos#solicitacoes-abertas`
  - `client.document.available`: e-mail com retorno premium para `/documentos`
  - `client.appointment.reminder`: e-mail para `/agenda`
  - `client.appointment.updated`: e-mail e WhatsApp quando a mudanca e realmente sensivel
  - `client.case.updated`: e-mail quando existe atualizacao publica com proxima acao
  - `client.payment.confirmed`: e-mail quando houver perfil + e-mail confiaveis
  - `client.portal.return`: lembrete suave de retomada

- Operacao
  - `operations.intake.new`: e-mail para triagem interna
  - `operations.intake.urgent`: e-mail forte e opcao de WhatsApp
  - `operations.handoff.human`: e-mail imediato para inbox operacional
  - `operations.payment.confirmed`: e-mail quando pagamento desbloqueia proxima acao interna

## O que nao entra agora

- Push PWA/web
  - O envio continua explicitamente desabilitado nesta fase.
  - Nesta etapa, a base de readiness passou a incluir:
    - tabela `notification_push_subscriptions`
    - interesse de piloto via preferencias (`push_enabled`)
    - asset `public/notification-pilot-sw.js` ainda nao registrado no cliente
    - leitura de VAPID e flag de piloto no readiness interno
  - Resultado: existe preparacao concreta para piloto controlado, sem ativacao ampla.

## Preferencias minimas

- Cliente
  - preferencias reais em `/cliente/notificacoes`
  - controles enxutos para compromisso, documento disponivel, documento pendente, pagamento confirmado e retorno ao portal
  - canal principal: e-mail
  - WhatsApp permanece apenas como reforco excepcional
  - push continua apenas como interesse de piloto, nao como canal ativo

- Operacao / advogada
  - preferencias reais em `/internal/advogada/configuracoes`
  - controles enxutos para handoff humano, intake urgente, nova triagem e pagamento confirmado
  - janela silenciosa preservada apenas para alertas nao urgentes

## Action taken

- Toda CTA de e-mail agora passa por `/n/[notificationId]`
  - registra `cta_clicked`
  - redireciona para o deep link seguro
  - injeta contexto de notificacao no destino

- O portal registra:
  - `deep_link_opened`
  - `action_completed` quando houver retorno confiavel
  - `expired_without_action` quando a notificacao perder valor antes do envio

- Nesta fase ja ficou mensuravel:
  - clique na CTA
  - abertura do destino
  - conclusao de retorno ao portal
  - conclusao de pagamento confirmado por visualizacao do proximo passo
  - conclusao de documento pendente por upload efetivo

- Ruido
  - Nao notificar notas internas, reprocessamentos tecnicos, status sem acao, duplicatas dentro de cooldown ou sinais ja absorvidos por outro fluxo.

## Politica canonica

- Prioridades
  - `informative`: pode esperar janela util
  - `important`: deve chegar, mas respeita quiet hours
  - `urgent`: pode furar quiet hours quando a acao perde valor com atraso
  - `critical`: sinal forte e operacional, sem atraso silencioso

- Dedup e cooldown
  - Toda notificacao governada ganha `dedup_key`.
  - Duplicatas em `pending`, `processing` ou `sent` dentro do cooldown viram `blocked`.
  - Preferencia por evento tambem pode bloquear o envio com motivo rastreavel.

- Quiet hours
  - Cliente: `21:00-08:00`
  - Operacao/advogada/gestao: `22:00-07:00`
  - `urgent` e `critical` podem bypassar a janela.

- Observabilidade
  - Cada decisao registra audiencia, prioridade, canal, `canonical_event_key`, motivo de bloqueio/defer e deep link.
  - Agora tambem registramos se houve preferencia armazenada ou default, clique, abertura, acao concluida e expiracao sem retorno.
  - A fila continua sendo a fonte unica de entrega; nao foi criado um sistema paralelo.
