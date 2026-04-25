import type { ReactNode } from "react";

import { PremiumFeatureCard, PremiumSection, PremiumSurface } from "@/components/portal/premium-experience";

type Tone = "default" | "accent" | "warning" | "success";

type InstitutionalStatCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  meta?: string;
  tone?: Tone;
};

type StrategicPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

function toneClasses(tone: Tone) {
  switch (tone) {
    case "accent":
      return "border-[rgba(142,106,59,0.2)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(245,238,228,0.94))]";
    case "warning":
      return "border-[rgba(168,122,29,0.22)] bg-[linear-gradient(180deg,rgba(255,249,239,0.98),rgba(250,242,226,0.94))]";
    case "success":
      return "border-[rgba(18,72,56,0.18)] bg-[linear-gradient(180deg,rgba(247,251,248,0.98),rgba(238,245,241,0.94))]";
    default:
      return "border-[rgba(142,106,59,0.12)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(249,245,238,0.94))]";
  }
}

export function InstitutionalStatCard({
  eyebrow,
  title,
  description,
  meta,
  tone = "default"
}: InstitutionalStatCardProps) {
  return (
    <PremiumFeatureCard
      eyebrow={eyebrow}
      title={title}
      description={description}
      className={toneClasses(tone)}
    >
      {meta ? (
        <span className="mt-1 inline-flex w-fit rounded-full bg-[rgba(16,32,29,0.06)] px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#52615b]">
          {meta}
        </span>
      ) : null}
    </PremiumFeatureCard>
  );
}

export function StrategicPanel({
  eyebrow,
  title,
  description,
  children
}: StrategicPanelProps) {
  return (
    <PremiumSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      className="h-full"
    >
      <div className="space-y-4">{children}</div>
    </PremiumSection>
  );
}
