import type { ReactNode } from "react";

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
      return {
        shell:
          "border-[rgba(142,106,59,0.2)] bg-[linear-gradient(180deg,rgba(255,251,245,0.98),rgba(245,238,228,0.94))]",
        badge: "bg-[rgba(142,106,59,0.12)] text-[#7f5e32]"
      };
    case "warning":
      return {
        shell:
          "border-[rgba(168,122,29,0.22)] bg-[linear-gradient(180deg,rgba(255,249,239,0.98),rgba(250,242,226,0.94))]",
        badge: "bg-[rgba(168,122,29,0.12)] text-[#8a6520]"
      };
    case "success":
      return {
        shell:
          "border-[rgba(18,72,56,0.18)] bg-[linear-gradient(180deg,rgba(247,251,248,0.98),rgba(238,245,241,0.94))]",
        badge: "bg-[rgba(18,72,56,0.12)] text-[#124838]"
      };
    default:
      return {
        shell:
          "border-[rgba(142,106,59,0.12)] bg-[linear-gradient(180deg,rgba(255,252,247,0.98),rgba(249,245,238,0.94))]",
        badge: "bg-[rgba(68,82,76,0.08)] text-[#52615b]"
      };
  }
}

export function InstitutionalStatCard({
  eyebrow,
  title,
  description,
  meta,
  tone = "default"
}: InstitutionalStatCardProps) {
  const toneClass = toneClasses(tone);

  return (
    <article
      className={`flex h-full flex-col gap-4 rounded-[28px] border p-6 shadow-[0_20px_50px_rgba(27,43,36,0.06)] ${toneClass.shell}`}
    >
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#8f6d3d]">
        {eyebrow}
      </span>
      <div className="space-y-2">
        <strong className="block text-xl leading-tight text-[#173229]">{title}</strong>
        <p className="text-sm leading-7 text-[#55635d]">{description}</p>
      </div>
      {meta ? (
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] ${toneClass.badge}`}
        >
          {meta}
        </span>
      ) : null}
    </article>
  );
}

export function StrategicPanel({
  eyebrow,
  title,
  description,
  children
}: StrategicPanelProps) {
  return (
    <section className="flex h-full flex-col gap-5 rounded-[32px] border border-[rgba(142,106,59,0.14)] bg-[rgba(255,252,247,0.86)] p-6 shadow-[0_24px_60px_rgba(27,43,36,0.07)]">
      <div className="space-y-3">
        {eyebrow ? (
          <span className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-[#8f6d3d]">
            {eyebrow}
          </span>
        ) : null}
        <div className="space-y-2">
          <h3 className="text-xl font-semibold leading-tight text-[#173229]">{title}</h3>
          {description ? <p className="text-sm leading-7 text-[#55635d]">{description}</p> : null}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
