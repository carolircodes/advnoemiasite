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
      <div className="flex flex-col gap-4 border-b border-[rgba(142,106,59,0.08)] pb-5 md:flex-row md:items-start md:justify-between">
        <div className="section-head !mb-0 max-w-[74ch]">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 pt-1">{action}</div> : null}
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}
