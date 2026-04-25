import Link from "next/link";

import {
  PremiumFeatureCard,
  PremiumSection
} from "@/components/portal/premium-experience";

type BriefItem = {
  href: string;
  title: string;
  detail: string;
  kicker: string;
};

export function OperationalMobileBrief({
  highlights,
  quickActions,
  focusItems
}: {
  highlights: Array<{ label: string; value: string; description: string }>;
  quickActions: Array<{ href: string; label: string; description: string }>;
  focusItems: BriefItem[];
}) {
  return (
    <div className="lg:hidden">
      <PremiumSection
        title="Briefing movel da operacao"
        description="Esta camada existe para abrir o dia, enxergar urgencia, destravar handoff e voltar rapido para a rota certa sem espelhar o cockpit inteiro."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {highlights.map((item) => (
            <PremiumFeatureCard
              key={item.label}
              eyebrow={item.label}
              title={item.value}
              description={item.description}
            />
          ))}
        </div>

        <div className="mt-5 grid gap-3">
          {focusItems.map((item) => (
            <Link key={item.href} href={item.href} className="route-card">
              <span className="shortcut-kicker">{item.kicker}</span>
              <strong>{item.title}</strong>
              <span>{item.detail}</span>
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="shortcut-card">
              <span className="shortcut-kicker">Atalho</span>
              <strong>{action.label}</strong>
              <p>{action.description}</p>
            </Link>
          ))}
        </div>
      </PremiumSection>
    </div>
  );
}
