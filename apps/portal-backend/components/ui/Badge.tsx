'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  default: 'border-[rgba(16,38,29,0.1)] bg-[rgba(16,38,29,0.06)] text-[#31403a]',
  secondary: 'border-[rgba(142,106,59,0.18)] bg-[rgba(249,241,226,0.95)] text-[#6f512c]',
  success: 'border-[rgba(41,93,69,0.16)] bg-[rgba(237,248,240,0.96)] text-[#295d45]',
  warning: 'border-[rgba(155,107,18,0.16)] bg-[rgba(255,245,227,0.96)] text-[#8a5d0d]',
  danger: 'border-[rgba(142,67,59,0.16)] bg-[rgba(255,241,239,0.96)] text-[#8e433b]',
  info: 'border-[rgba(65,91,141,0.16)] bg-[rgba(237,243,255,0.96)] text-[#314d84]',
};

const sizes = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
};

export function Badge({ children, variant = 'default', size = 'sm', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full border font-semibold tracking-[0.01em]',
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  );
}
