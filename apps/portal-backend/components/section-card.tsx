import type { ReactNode } from "react";

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export function SectionCard({ id, title, description, children }: SectionCardProps) {
  return (
    <section id={id} className="panel">
      <div className="section-head">
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
