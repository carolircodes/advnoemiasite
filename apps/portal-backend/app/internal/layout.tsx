'use client';

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar, Topbar, PageContainer } from '@/components/layout';

interface LayoutProps {
  children: ReactNode;
}

const menuItems = [
  { id: 'dashboard', label: 'Painel Operacional', href: '/internal/advogada/operacional' },
  { id: 'leads', label: 'Leads', href: '/internal/advogada/leads' },
  { id: 'atendimento', label: 'Atendimento', href: '/internal/advogada/atendimento' },
  { id: 'casos', label: 'Casos', href: '/internal/advogada/casos' },
  { id: 'agenda', label: 'Agenda', href: '/internal/advogada/agenda' },
  { id: 'documentos', label: 'Documentos', href: '/internal/advogada/documentos' },
  { id: 'automacoes', label: 'Automacoes', href: '/internal/advogada/automacoes' },
  { id: 'canais', label: 'Canais', href: '/internal/advogada/canais' },
  { id: 'inteligencia', label: 'Inteligencia', href: '/internal/advogada/inteligencia' },
  { id: 'ecossistema', label: 'Ecossistema', href: '/internal/advogada/ecossistema' },
  { id: 'configuracoes', label: 'Configuracoes', href: '/internal/advogada/configuracoes' }
];

const subtitles: Record<string, string> = {
  'Painel Operacional': 'Gestao de leads e operacoes',
  Leads: 'Captura e qualificacao de leads',
  Atendimento: 'Gestao de atendimento ao cliente',
  Casos: 'Acompanhamento de processos',
  Agenda: 'Compromissos e consultas',
  Documentos: 'Gestao documental',
  Automacoes: 'Fluxos automatizados',
  Canais: 'WhatsApp e Instagram',
  Inteligencia: 'Analises e insights',
  Ecossistema: 'Catalogo, recorrencia e expansao premium',
  Configuracoes: 'Configuracoes do sistema'
};

export default function InternalLayout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = pathname || '/internal/advogada/operacional';

  const currentPage = useMemo(() => {
    const currentItem = menuItems.find((item) => {
      return (
        item.href === currentPath ||
        (item.href === '/internal/advogada/leads' &&
          currentPath.startsWith('/internal/advogada/leads')) ||
        (item.href === '/internal/advogada/casos' &&
          currentPath.startsWith('/internal/advogada/casos')) ||
        (item.href === '/internal/advogada/ecossistema' &&
          currentPath.startsWith('/internal/advogada/ecossistema'))
      );
    });

    if (!currentItem) {
      return {
        title: 'Painel Operacional',
        subtitle: subtitles['Painel Operacional']
      };
    }

    return {
      title: currentItem.label,
      subtitle: subtitles[currentItem.label] || ''
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
