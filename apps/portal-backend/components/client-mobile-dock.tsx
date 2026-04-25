"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

const dockItems = [
  { href: "/cliente", label: "Painel", shortHint: "Resumo do caso" },
  { href: "/agenda", label: "Agenda", shortHint: "Proximos horarios" },
  { href: "/documentos", label: "Documentos", shortHint: "Uploads e arquivos" },
  { href: "/noemia", label: "Atendimento", shortHint: "Retomar conversa" }
] as const;

export function ClientMobileDock() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Atalhos do portal do cliente"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(16,38,29,0.08)] bg-[rgba(252,249,244,0.96)] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3 shadow-[0_-18px_50px_rgba(16,38,29,0.08)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
        {dockItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/noemia" && pathname.startsWith(`${item.href}/`));

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "flex min-h-[4.5rem] flex-col justify-center rounded-[1.35rem] px-3 py-3 text-center no-underline transition",
                active
                  ? "bg-[#10261d] text-white shadow-[0_14px_30px_rgba(16,38,29,0.18)]"
                  : "bg-white text-[#10261d] shadow-[0_10px_24px_rgba(16,38,29,0.06)]"
              )}
            >
              <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em]">
                {item.label}
              </span>
              <span
                className={cx(
                  "mt-1 text-[0.68rem] leading-5",
                  active ? "text-[rgba(255,255,255,0.82)]" : "text-[#5f6f68]"
                )}
              >
                {item.shortHint}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
