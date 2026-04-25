import type { ReactNode } from "react";

import { PremiumSection, PremiumStatePanel, PremiumSurface } from "@/components/portal/premium-experience";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function OperationalPanelSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PremiumSection title={title} description={description} action={action}>
      {children}
    </PremiumSection>
  );
}

export function OperationalMetricCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number;
  icon: ReactNode;
  tone?: 'default' | 'orange' | 'yellow' | 'red';
}) {
  const toneClasses: Record<string, string> = {
    default: 'text-[#10261d]',
    orange: 'text-[#a45f12]',
    yellow: 'text-[#9a6a00]',
    red: 'text-[#9f1d1d]',
  };

  return (
    <PremiumSurface className="rounded-[1.7rem] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[#6a7a73]">{label}</p>
          <p className={cx('mt-1 text-2xl font-bold', toneClasses[tone])}>{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5efe2] text-[#10261d]">
          {icon}
        </div>
      </div>
    </PremiumSurface>
  );
}

export function OperationalStatusChip({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'gold';
}) {
  const tones: Record<string, string> = {
    neutral: 'border-[#d8d2c4] bg-[#f7f3eb] text-[#3f5149]',
    blue: 'border-[#cfe0fb] bg-[#edf4ff] text-[#1d4f91]',
    green: 'border-[#cfe7d7] bg-[#edf8f0] text-[#24613a]',
    orange: 'border-[#f1dcc0] bg-[#fff4e6] text-[#9a5d09]',
    red: 'border-[#f0caca] bg-[#fff1f1] text-[#9f1d1d]',
    purple: 'border-[#ddd0f7] bg-[#f5efff] text-[#5d3aa8]',
    gray: 'border-[#d9d9d9] bg-[#f4f4f4] text-[#525252]',
    gold: 'border-[#e4d3a5] bg-[#fbf5df] text-[#87621c]',
  };

  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
        tones[tone]
      )}
    >
      {children}
    </span>
  );
}

export function OperationalActionButton({
  children,
  onClick,
  variant = 'outline',
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const variants: Record<string, string> = {
    primary:
      'border-[#10261d] bg-[#10261d] text-white hover:bg-[#17392c] hover:border-[#17392c]',
    outline:
      'border-[#d3c7aa] bg-white text-[#10261d] hover:bg-[#f8f4ec] hover:border-[#bda973]',
    ghost: 'border-transparent bg-transparent text-[#10261d] hover:bg-[#f5efe2]',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant]
      )}
    >
      {children}
    </button>
  );
}

export function OperationalEmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <PremiumStatePanel
      tone="neutral"
      eyebrow="Leitura operacional"
      title={title}
      description={description}
      className="rounded-[1.9rem]"
    />
  );
}
