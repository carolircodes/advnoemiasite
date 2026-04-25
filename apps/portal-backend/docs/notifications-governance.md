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

- Piloto push controlado
  - publico: cliente autenticado, ativo, com interesse salvo em `/cliente/notificacoes`
  - gate: `NOTIFICATIONS_PUSH_PILOT_ENABLED=true` + VAPID valido + browser suportado + subscription ativa
  - eventos ativos:
    - `client.appointment.reminder`
    - `client.document.available`
  - service worker: `public/notification-pilot-sw.js`
  - registro: apenas por opt-in explicito na UI de preferencias
  - rollback: desligar a flag ou revogar subscriptions em `/api/notifications/push/subscription`

- Operacao
  - `operations.intake.new`: e-mail para triagem interna
  - `operations.intake.urgent`: e-mail forte e opcao de WhatsApp
  - `operations.handoff.human`: e-mail imediato para inbox operacional
  - `operations.payment.confirmed`: e-mail quando pagamento desbloqueia proxima acao interna

## O que nao entra agora

- Push PWA/web amplo
  - O envio nao esta liberado para todos os clientes.
  - O piloto continua restrito a dois eventos, opt-in explicito e cohort pequeno.
  - Nenhum outro evento entra em push sem nova prova de utilidade e baixo ruido.

## Preferencias minimas

- Cliente
  - preferencias reais em `/cliente/notificacoes`
  - controles enxutos para compromisso, documento disponivel, documento pendente, pagamento confirmado e retorno ao portal
  - canal principal: e-mail
  - WhatsApp permanece apenas como reforco excepcional
  - push pode ser ativado apenas no piloto controlado, por dispositivo, com permissao explicita

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
  - subscription criada, revogada ou invalidada
  - permissao de push concedida, negada ou ainda pendente

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
  - O piloto push tambem registra permission decision, subscription upsert/revoke, envio, falha e invalidacao por provider/browser.
  - A fila continua sendo a fonte unica de entrega; nao foi criado um sistema paralelo.

## Migrations e envs

- Migrations aplicadas no remoto em `2026-04-25`
  - `20260425103000_phase7_notification_governance.sql`
  - `20260425143000_phase8_notification_preferences_action_tracking.sql`

- Env minimo para o piloto
  - `NEXT_PUBLIC_PUSH_VAPID_PUBLIC_KEY`
  - `PUSH_VAPID_PRIVATE_KEY`
  - `NOTIFICATIONS_PUSH_PILOT_ENABLED=true`

- Expansao futura
  - antes de adicionar novos eventos, validar taxa de clique, abertura, acao concluida e unsubscribe
  - se houver tradeoff entre alcance e confianca, manter o piloto menor
