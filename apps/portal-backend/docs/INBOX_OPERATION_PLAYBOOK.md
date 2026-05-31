# Inbox Operation Playbook

## O Que A Operacao Deve Ver

Cada item do inbox precisa deixar claro:
- pessoa/canal/origem;
- area juridica provavel;
- resumo seguro;
- urgencia e sensibilidade;
- status da conversa;
- proxima acao;
- se precisa de humano;
- se consulta foi oferecida;
- se pagamento esta pendente ou aprovado;
- se o portal/cliente ja existe;
- historico e eventos.

## Como Tratar `manual_followup_required`

1. Abrir a thread.
2. Conferir canal, tema, resumo e motivo.
3. Se veio de comentario publico, chamar no privado ou WhatsApp sem expor detalhes.
4. Registrar nota ou proxima acao.
5. Atualizar para `waiting_client`, `waiting_human`, `resolved` ou `escalated`.

## Pagamento Pendente Ou Aprovado

Pagamento pendente:
- confirmar se esta vinculado ao lead/consulta;
- acompanhar vencimento/falha;
- evitar criar segundo link sem motivo.

Pagamento aprovado:
- confirmar conversao;
- preparar ou revisar portal;
- sinalizar proximo passo de consulta/documentos;
- enfileirar notificacao se provider estiver pronto.

## Provider Missing

Se aparecer `provider_missing`:
- nao repetir envio automatico;
- usar contato manual autorizado;
- registrar `manual_check_required`;
- revalidar readiness antes de religar automacao.

## Teste Sem Envio Real

Rode:
- `npm test --workspace portal-backend -- --test-name-pattern="phase 5"`;
- `npm run operations:verify`;
- `npm run operations:verify:json --workspace portal-backend`.

Esses comandos validam jornada, estados e readiness sem chamar providers externos.
