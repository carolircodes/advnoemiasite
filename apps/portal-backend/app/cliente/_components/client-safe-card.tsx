import type { ReactNode } from "react";

type ClientSafeCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function ClientSafeCard({
  title,
  children,
  className = ""
}: ClientSafeCardProps) {
  return (
    <section
      className={`rounded-3xl border border-[#e7e0d5] bg-white p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] ${className}`.trim()}
    >
      {title ? (
        <h2 className="text-lg font-semibold text-[#10261d]">{title}</h2>
      ) : null}
      <div className={title ? "mt-4 text-sm leading-7 text-[#5f6f68]" : ""}>{children}</div>
    </section>
  );
}
