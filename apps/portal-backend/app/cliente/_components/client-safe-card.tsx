import type { ReactNode } from "react";

import { PremiumSection, PremiumSurface } from "@/components/portal/premium-experience";

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
  if (title) {
    return (
      <PremiumSection title={title} className={className}>
        <div className="text-sm leading-7 text-[#5f6f68]">{children}</div>
      </PremiumSection>
    );
  }

  return (
    <PremiumSurface className={className}>
      <div className="text-sm leading-7 text-[#5f6f68]">{children}</div>
    </PremiumSurface>
  );
}
