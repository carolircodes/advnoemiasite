import Link from "next/link";

import { PremiumSection } from "@/components/portal/premium-experience";

type QuickAction = {
  href: string;
  label: string;
  description: string;
};

export function ClientQuickActions({
  title = "Atalhos do seu portal",
  description = "Escolha o proximo passo sem percorrer telas densas. O foco aqui e retomar rapidamente o que mais importa.",
  items
}: {
  title?: string;
  description?: string;
  items: QuickAction[];
}) {
  return (
    <PremiumSection title={title} description={description}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-[1.6rem] border border-[#ece5d9] bg-[#fcfaf6] px-4 py-4 no-underline transition hover:border-[#d8c5a7] hover:bg-white"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8e6a3b]">
              Acao rapida
            </p>
            <strong className="mt-3 block text-base text-[#10261d]">{item.label}</strong>
            <p className="mt-2 text-sm leading-6 text-[#5f6f68]">{item.description}</p>
          </Link>
        ))}
      </div>
    </PremiumSection>
  );
}
