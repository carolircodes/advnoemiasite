'use client';

import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full'
};

export function PageContainer({ children, maxWidth = 'xl' }: PageContainerProps) {
  return (
    <div className="flex-1 bg-[#f7f7f7] min-h-screen">
      <div className={`p-6 mx-auto ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
}
