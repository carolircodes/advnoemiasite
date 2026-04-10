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
      "bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm hover:shadow-md transition-shadow duration-200",
      className
    )}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#64748b]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#10261d]">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              <span className={cn(
                "text-xs font-medium",
                trend.direction === 'up' ? "text-green-600" : 
                trend.direction === 'down' ? "text-red-600" : 
                "text-gray-600"
              )}>
                {trend.direction === 'up' ? '+' : trend.direction === 'down' ? '-' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>
        <div className="ml-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f8fafc] text-[#8e6a3b]">
          {icon}
        </div>
      </div>
    </div>
  );
}
