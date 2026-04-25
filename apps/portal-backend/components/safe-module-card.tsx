import type { ReactNode } from "react";

import { PremiumSection } from "@/components/portal/premium-experience";

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
  return (
    <PremiumSection
      id={id}
      title={title}
      description={description}
      tone={tone}
    >
      <div className="text-sm leading-7 text-[#5f6f68]">{children}</div>
    </PremiumSection>
  );
}
