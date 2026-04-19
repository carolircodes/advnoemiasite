'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  className?: string;
}

export function MetricCard({ title, value, icon, trend, className }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-[28px] border border-[rgba(142,106,59,0.12)] bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,244,236,0.94))] p-6 shadow-[0_18px_40px_rgba(16,38,29,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(16,38,29,0.11)]",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#8e6a3b]">{title}</p>
          <p className="mt-3 font-serif text-4xl font-semibold text-[#13251f]">{value}</p>
          {trend && (
            <div className="mt-3 flex items-center gap-1">
              <span className={cn(
                "text-xs font-semibold",
                trend.direction === 'up' ? "text-[#295d45]" : 
                trend.direction === 'down' ? "text-[#8e433b]" : 
                "text-[#5b6a63]"
              )}>
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>
        <div className="ml-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[rgba(142,106,59,0.14)] bg-[rgba(249,241,226,0.9)] text-[#8e6a3b] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
          {icon}
        </div>
      </div>
    </div>
  );
}
