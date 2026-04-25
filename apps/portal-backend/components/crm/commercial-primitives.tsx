import type { ReactNode } from "react";

import { PremiumFeatureCard, PremiumSection, PremiumSurface } from "@/components/portal/premium-experience";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Tone =
  | "neutral"
  | "gold"
  | "green"
  | "rose"
  | "blue"
  | "plum"
  | "slate";

const toneClasses: Record<Tone, string> = {
  neutral: "border-[#ddd5c7] bg-[#fbf7f0] text-[#4d5f56]",
  gold: "border-[#e4d1a5] bg-[#fff7e6] text-[#7f5a16]",
  green: "border-[#cfddd3] bg-[#eff7f1] text-[#2f5f47]",
  rose: "border-[#f0c7bc] bg-[#fff1eb] text-[#8b4022]",
  blue: "border-[#cedced] bg-[#eef4fb] text-[#315a82]",
  plum: "border-[#ddd3ed] bg-[#f6f1ff] text-[#5e4d93]",
  slate: "border-[#d7d9dd] bg-[#f4f5f7] text-[#4f5964]"
};

export function SignalBadge({
  label,
  tone = "neutral",
  className
}: {
  label: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]",
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  );
}

export function PanelCard({
  eyebrow,
  title,
  description,
  actions,
  className,
  children
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <PremiumSection
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={actions}
      className={className}
    >
      {children}
    </PremiumSection>
  );
}

export function MetricTile({
  label,
  value,
  icon,
  helper
}: {
  label: string;
  value: string | number;
  icon?: ReactNode;
  helper?: string;
}) {
  return (
    <PremiumSurface className="rounded-[1.7rem] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8a6a3d]">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[#10261d]">{value}</p>
          {helper ? <p className="mt-2 text-sm text-[#64746c]">{helper}</p> : null}
        </div>
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f4ede0] text-[#7b6034]">
            {icon}
          </div>
        ) : null}
      </div>
    </PremiumSurface>
  );
}

export function DecisionTile({
  label,
  title,
  description,
  tone = "neutral"
}: {
  label: string;
  title: string;
  description?: string;
  tone?: Tone;
}) {
  return (
    <PremiumSurface className={cx("rounded-[1.7rem] p-5", toneClasses[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#10261d]">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-[#516158]">{description}</p> : null}
    </PremiumSurface>
  );
}

export function InfoPair({
  label,
  value,
  valueClassName
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.35rem] border border-[#efe6d8] bg-[#fcfaf6] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8a6a3d]">{label}</p>
      <div className={cx("mt-2 text-sm leading-6 text-[#4d5f56]", valueClassName)}>{value}</div>
    </div>
  );
}

export function DetailList({
  items
}: {
  items: Array<{
    label: string;
    value: ReactNode;
  }>;
}) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-4 border-b border-[#efe7da] pb-3 last:border-b-0 last:pb-0"
        >
          <span className="text-sm text-[#64746c]">{item.label}</span>
          <span className="max-w-[62%] text-right text-sm font-medium text-[#10261d]">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
