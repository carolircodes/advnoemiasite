import type { ReactNode } from "react";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({ id, title, description, action, children }: SectionCardProps) {
  return (
    <section id={id} className="panel">
      <div className="flex flex-col gap-4 border-b border-[rgba(142,106,59,0.1)] pb-6 md:flex-row md:items-start md:justify-between">
        <div className="section-head !mb-0">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="pt-6">{children}</div>
    </section>
  );
}
