import type { ReactNode } from "react";

import { PremiumSection } from "@/components/portal/premium-experience";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ id, title, description, action, children }: SectionCardProps) {
  return (
    <PremiumSection id={id} title={title} description={description} action={action}>
      {children}
    </PremiumSection>
  );
}
