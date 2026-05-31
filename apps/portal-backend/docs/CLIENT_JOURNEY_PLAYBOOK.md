# Client Journey Playbook

## Jornada Esperada

1. Pessoa chega pelo site, artigo, triagem, WhatsApp ou canal social.
2. NoemIA acolhe, classifica tema e respeita os guardrails juridicos.
3. O sistema cria ou encontra lead/conversa e registra origem, campanha, canal e tema.
4. Se houver risco, prazo, comentario publico ou provider ausente, marca handoff/manual follow-up.
5. Operacao assume pelo inbox, oferece consulta quando fizer sentido e registra proxima acao.
6. Pagamento e criado ou simulado em teste local, sempre vinculado ao lead/consulta.
7. Quando aprovado, o lead vira convertido e o portal deve mostrar boas-vindas, consulta, pagamento e proximos passos.
8. Notificacoes sao enfileiradas; se provider faltar, a operacao recebe acao manual.

## O Que O Cliente Deve Ver

- linguagem em portugues claro;
- proximo passo simples;
- nenhum status tecnico sem traducao;
- sem promessa de resultado;
- sem pedido de dados sensiveis em automacao;
- portal com status inicial, consulta, pagamento e documentos quando houver.

## Provider Ausente

Quando e-mail, Meta, WhatsApp ou Mercado Pago nao estiverem prontos:
- nao tentar envio real;
- marcar `provider_missing` ou `manual_check_required`;
- criar proxima acao para a equipe;
- manter lead/conversa/evento rastreaveis.

## Riscos Residuais

- aplicacao de migrations e RLS reais ainda exige validacao manual;
- pagamento real depende de Mercado Pago e assinatura enforced;
- notificacao real depende de provider configurado;
- Meta/Vercel precisam de validacao real controlada antes de escala.

