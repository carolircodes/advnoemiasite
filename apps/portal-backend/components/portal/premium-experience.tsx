"use client";

import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "error" | "neutral";

type PremiumSurfaceProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  tone?: Tone;
};

type PremiumSectionProps = {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: Tone;
};

type PremiumStatePanelProps = {
  eyebrow?: string;
  title: string;
  description: string;
  detail?: ReactNode;
  actions?: ReactNode;
  className?: string;
  tone?: Tone;
};

type PremiumFeatureCardProps = {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  children?: ReactNode;
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const toneClassNames: Record<Tone, string> = {
  default: "border-[rgba(142,106,59,0.12)] bg-[rgba(255,252,247,0.96)]",
  neutral: "border-[rgba(19,37,31,0.1)] bg-[rgba(252,249,244,0.94)]",
  success: "border-[rgba(41,93,69,0.16)] bg-[linear-gradient(180deg,rgba(247,252,249,0.98),rgba(237,246,242,0.94))]",
  warning: "border-[rgba(142,106,59,0.18)] bg-[linear-gradient(180deg,rgba(255,251,244,0.98),rgba(250,243,231,0.94))]",
  error: "border-[rgba(142,67,59,0.18)] bg-[linear-gradient(180deg,rgba(255,247,245,0.98),rgba(250,238,235,0.94))]"
};

export function PremiumSurface({
  id,
  children,
  className,
  tone = "default"
}: PremiumSurfaceProps) {
  return (
    <section
      id={id}
      className={cx(
        "premium-surface p-6 sm:p-7",
        toneClassNames[tone],
        className
      )}
    >
      {children}
    </section>
  );
}

export function PremiumSection({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
  className,
  tone = "default"
}: PremiumSectionProps) {
  return (
    <PremiumSurface id={id} className={cx("premium-section", className)} tone={tone}>
      <div className="premium-section__header">
        <div className="section-head !mb-0 max-w-[74ch]">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="premium-section__action">{action}</div> : null}
      </div>
      <div className="premium-section__body">{children}</div>
    </PremiumSurface>
  );
}

export function PremiumStatePanel({
  eyebrow,
  title,
  description,
  detail,
  actions,
  className,
  tone = "neutral"
}: PremiumStatePanelProps) {
  return (
    <PremiumSurface className={cx("premium-state-panel", className)} tone={tone}>
      <div className="premium-state-panel__copy">
        <span className={cx("premium-state-panel__eyebrow", `is-${tone}`)}>
          {eyebrow ?? "Status do ambiente"}
        </span>
        <h1 className="premium-state-panel__title">{title}</h1>
        <p className="premium-state-panel__description">{description}</p>
      </div>

      {detail ? <div className="premium-state-panel__detail">{detail}</div> : null}
      {actions ? <div className="premium-state-panel__actions">{actions}</div> : null}
    </PremiumSurface>
  );
}

export function PremiumFeatureCard({
  eyebrow,
  title,
  description,
  className,
  children
}: PremiumFeatureCardProps) {
  return (
    <div className={cx("premium-feature-card", className)}>
      <p className="premium-feature-card__eyebrow">{eyebrow}</p>
      <strong className="premium-feature-card__title">{title}</strong>
      <p className="premium-feature-card__description">{description}</p>
      {children}
    </div>
  );
}
