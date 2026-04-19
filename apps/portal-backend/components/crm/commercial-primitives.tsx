import type { ReactNode } from "react";

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
    <section
      className={cx(
        "rounded-[2rem] border border-[#ddd5c7] bg-white p-5 shadow-[0_14px_34px_rgba(16,38,29,0.06)]",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[#efe6d8] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">
              {eyebrow}
            </p>
          ) : null}
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.02em] text-[#10261d]">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-[#64746c]">{description}</p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="pt-4">{children}</div>
    </section>
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
    <div className="rounded-[1.6rem] border border-[#e9e0d1] bg-[linear-gradient(180deg,#fffdfa,#f8f3ea)] p-4">
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
    </div>
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
    <div className={cx("rounded-[1.6rem] border p-4", toneClasses[tone])}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-80">{label}</p>
      <p className="mt-2 text-base font-semibold tracking-[-0.02em] text-[#10261d]">{title}</p>
      {description ? <p className="mt-2 text-sm leading-6 text-[#516158]">{description}</p> : null}
    </div>
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
    <div className="rounded-[1.25rem] border border-[#efe6d8] bg-[#fcfaf6] px-4 py-3">
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
