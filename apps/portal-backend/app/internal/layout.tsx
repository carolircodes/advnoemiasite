'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, Topbar, PageContainer } from '@/components/layout';
import {
  getInternalWorkspaceCurrentPage
} from '@/lib/internal-workspace-nav';

interface LayoutProps {
  children: ReactNode;
}

export default function InternalLayout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname || '/internal/advogada';

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [currentPath]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.style.removeProperty('overflow');
      return;
    }

    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.removeProperty('overflow');
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen]);

  const currentPage = useMemo(() => {
    const currentItem = getInternalWorkspaceCurrentPage(currentPath);

    return {
      title: currentItem.label,
      subtitle: currentItem.subtitle
    };
  }, [currentPath]);

  return (
    <div className="internal-shell overflow-x-clip">
      <Sidebar currentPath={currentPath} />

      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[rgba(10,16,13,0.46)] backdrop-blur-[2px] lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        currentPath={currentPath}
        isMobile={true}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      <div className="min-w-0 lg:pl-[296px]">
        <Topbar
          title={currentPage.title}
          subtitle={currentPage.subtitle}
          isMenuOpen={mobileMenuOpen}
          onMenuClick={() => setMobileMenuOpen((open) => !open)}
        />
        <PageContainer>{children}</PageContainer>
      </div>
    </div>
  );
}
