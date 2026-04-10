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
      "bg-white rounded-2xl border border-[#e2e8f0] shadow-sm",
      className
    )}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className }: CardHeaderProps) {
  return (
    <div className={cn(
      "flex flex-col gap-2 border-b border-[#f1f5f9] bg-[#fafbfc] p-6 md:flex-row md:items-center md:justify-between",
      className
    )}>
      <div>
        <h3 className="text-lg font-semibold text-[#10261d]">{title}</h3>
        {description && <p className="mt-1 text-sm text-[#64748b]">{description}</p>}
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
