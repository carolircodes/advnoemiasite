"use client";

import Link from "next/link";

export default function TriageDashboard() {
  return (
    <div className="space-y-6 rounded-[28px] border border-[#ddd4c2] bg-[#fbf8f2] p-6 shadow-[0_18px_40px_rgba(16,38,29,0.08)]">
      <div className="space-y-2">
        <span className="inline-flex rounded-full border border-[#d9ccb3] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6a4a]">
          Painel legado contido
        </span>
        <h2 className="text-2xl font-semibold text-[#10261d]">A triagem operacional foi incorporada ao fluxo principal.</h2>
        <p className="max-w-3xl text-sm leading-6 text-[#52645c]">
          Este componente antigo deixou de ser a superficie principal para evitar paralelismo entre triagem,
          NoemIA e operacao humana. O acompanhamento oficial agora acontece no painel interno e na operacao
          comercial, com continuidade para cliente, caso e proximo passo.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link className="route-card" href="/internal/advogada#triagens-recebidas">
          <span className="shortcut-kicker">Fluxo oficial</span>
          <strong>Abrir triagens no painel principal</strong>
          <span>Use a fila integrada para ler contexto, decidir retorno e converter em cliente sem sair do ecossistema central.</span>
        </Link>
        <Link className="route-card" href="/internal/advogada/operacional">
          <span className="shortcut-kicker">Operacao humana</span>
          <strong>Abrir operacao comercial</strong>
          <span>Continue follow-up, consulta, contato humano e sinais de prioridade no modulo ja consolidado da equipe.</span>
        </Link>
      </div>
    </div>
  );
}
