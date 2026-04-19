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
    <div className="internal-main flex-1 min-h-screen">
      <div className={`mx-auto px-4 py-5 sm:px-6 sm:py-6 xl:px-8 ${maxWidthClasses[maxWidth]}`}>
        {children}
      </div>
    </div>
  );
}
