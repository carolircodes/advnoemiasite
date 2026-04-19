'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
}

interface CardHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "rounded-[28px] border border-[rgba(142,106,59,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,244,238,0.94))] shadow-[0_18px_40px_rgba(16,38,29,0.08)]",
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-3 border-b border-[rgba(142,106,59,0.1)] bg-[rgba(248,244,236,0.76)] p-6 md:flex-row md:items-center md:justify-between",
      className
    )}>
      <div>
        <h3 className="font-serif text-xl font-semibold text-[#13251f]">{title}</h3>
        {description && <p className="mt-1 text-sm leading-6 text-[#5b6a63]">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn("p-6", className)}>
      {children}
    </div>
  );
}
