import type { ReactNode } from "react";

type SafeModuleCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
  tone?: "default" | "warning" | "error";
  id?: string;
};

export function SafeModuleCard({
  title,
  description,
  children,
  tone = "default",
  id
}: SafeModuleCardProps) {
  const toneClasses = {
    default: "border-[#e7e0d5] bg-white",
    warning: "border-[#eadfcf] bg-[#fbf7ef]",
    error: "border-[#f0d2d2] bg-[#fff5f5]"
  };

  return (
    <section
      id={id}
      className={`rounded-3xl border p-6 shadow-[0_20px_60px_rgba(16,38,29,0.05)] ${toneClasses[tone]}`}
    >
      <h2 className="text-lg font-semibold text-[#10261d]">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm leading-7 text-[#5f6f68]">{description}</p>
      ) : null}
      <div className="mt-4 text-sm leading-7 text-[#5f6f68]">{children}</div>
    </section>
  );
}
