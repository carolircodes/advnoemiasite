'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, Topbar, PageContainer } from '@/components/layout';
import {
  internalWorkspaceMenuItems,
  internalWorkspaceSubtitles,
  isInternalWorkspacePathActive
} from '@/lib/internal-workspace-nav';

interface LayoutProps {
  children: ReactNode;
}

export default function InternalLayout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname || '/internal/advogada/operacional';

  const currentPage = useMemo(() => {
    const currentItem = internalWorkspaceMenuItems.find((item) =>
      isInternalWorkspacePathActive(currentPath, item.href)
    );

    if (!currentItem) {
      return {
        title: 'Painel Operacional',
        subtitle: internalWorkspaceSubtitles['Painel Operacional']
      };
    }

    return {
      title: currentItem.label,
      subtitle: internalWorkspaceSubtitles[currentItem.label] || ''
    };
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar currentPath={currentPath} />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <Sidebar
        currentPath={currentPath}
        isMobile={true}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="lg:pl-64">
        <Topbar
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
