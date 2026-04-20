import type { ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function InboxThreadListItem({
  active,
  unreadLabel,
  name,
  subtitle,
  preview,
  meta,
  badges,
  onClick
}: {
  active?: boolean;
  unreadLabel?: string | null;
  name: string;
  subtitle?: string;
  preview: string;
  meta?: string;
  badges?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "w-full rounded-[1.45rem] border px-4 py-3.5 text-left transition",
        active
          ? "border-[#b28b54] bg-[linear-gradient(180deg,rgba(255,253,249,0.98),rgba(247,239,224,0.92))] shadow-[0_12px_26px_rgba(178,139,84,0.1)]"
          : "border-[#ece3d4] bg-[rgba(255,253,250,0.88)] hover:border-[#d4c0a0] hover:bg-[#fffaf2] hover:shadow-[0_10px_24px_rgba(16,32,29,0.06)]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[#10261d]">{name}</p>
            {unreadLabel ? (
              <span className="inline-flex rounded-full bg-[#10261d] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white">
                {unreadLabel}
              </span>
            ) : null}
          </div>
          {subtitle ? <p className="mt-1 text-xs text-[#7a887f]">{subtitle}</p> : null}
          <p className="mt-2 line-clamp-2 text-[0.92rem] leading-[1.55] text-[#4b5d55]">{preview}</p>
        </div>
        {meta ? <span className="shrink-0 pt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#7a887f]">{meta}</span> : null}
      </div>
      {badges ? <div className="mt-2.5 flex flex-wrap gap-1.5">{badges}</div> : null}
    </button>
  );
}

export function ConversationBubble({
  direction,
  header,
  children,
  footer,
  emphasized = false
}: {
  direction: "incoming" | "outgoing";
  header?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  emphasized?: boolean;
}) {
  const outgoing = direction === "outgoing";

  return (
    <div
      className={cx(
        "max-w-[82%] rounded-[1.7rem] border px-4 py-3 shadow-sm",
        outgoing
          ? "ml-auto border-[rgba(16,38,29,0.12)] bg-[#10261d] text-white shadow-[0_16px_32px_rgba(16,32,29,0.12)]"
          : emphasized
            ? "border-[rgba(178,139,84,0.16)] bg-[linear-gradient(180deg,#f8f0df,#f2e5cb)] text-[#23352d]"
            : "border-[rgba(142,106,59,0.1)] bg-[#f7f2e8] text-[#24372f]"
      )}
    >
      {header ? (
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] opacity-75">
          {header}
        </div>
      ) : null}
      <div className="whitespace-pre-wrap text-sm leading-6">{children}</div>
      {footer ? <div className="mt-3 text-[11px] opacity-70">{footer}</div> : null}
    </div>
  );
}

export function ComposerPanel({
  eyebrow,
  textarea,
  helper,
  actions
}: {
  eyebrow: string;
  textarea: ReactNode;
  helper?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="rounded-[1.8rem] border border-[#e7dccd] bg-[linear-gradient(180deg,#fffdf8,#f8f2e8)] p-4 shadow-[0_12px_28px_rgba(16,32,29,0.04),inset_0_1px_0_rgba(255,255,255,0.72)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8a6a3d]">{eyebrow}</p>
      <div className="mt-3">{textarea}</div>
      {(helper || actions) ? (
        <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[52ch] text-xs leading-6 text-[#718179]">{helper}</div>
          {actions ? <div className="flex flex-wrap items-center gap-2 md:justify-end">{actions}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function ActionToolbar({
  children
}: {
  children: ReactNode;
}) {
  return (
    <div className="rounded-[1.45rem] border border-[#ece3d4] bg-[linear-gradient(180deg,rgba(252,250,246,0.96),rgba(248,243,235,0.9))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
