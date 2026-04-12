"use client";

import Link from "next/link";

export default function LeadsDashboard() {
  return (
    <div className="space-y-6 rounded-[28px] border border-[#ddd4c2] bg-[#fbf8f2] p-6 shadow-[0_18px_40px_rgba(16,38,29,0.08)]">
      <div className="space-y-2">
        <span className="inline-flex rounded-full border border-[#d9ccb3] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#7b6a4a]">
          Dashboard legado contido
        </span>
        <h2 className="text-2xl font-semibold text-[#10261d]">Leads e follow-up agora vivem em um fluxo mais coeso.</h2>
        <p className="max-w-3xl text-sm leading-6 text-[#52645c]">
          Este dashboard antigo deixou de ser o centro oficial para reduzir a sensacao de modulos paralelos.
          A operacao premium agora cruza triagem, contato humano, follow-up e evolucao para cliente dentro do
          painel operacional e da central principal da advogada.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link className="route-card" href="/internal/advogada/operacional">
          <span className="shortcut-kicker">Hub oficial</span>
          <strong>Abrir painel operacional</strong>
          <span>Trabalhe temperatura, prioridade, consulta, follow-up e contato assistido em uma unica superficie consolidada.</span>
        </Link>
        <Link className="route-card" href="/internal/advogada#triagens-recebidas">
          <span className="shortcut-kicker">Entrada do fluxo</span>
          <strong>Revisar triagens recebidas</strong>
          <span>Volte para a origem do atendimento quando precisar entender a entrada antes de conduzir o proximo passo humano.</span>
        </Link>
      </div>
    </div>
  );
}
