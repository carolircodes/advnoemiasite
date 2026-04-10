'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { Sidebar, Topbar, PageContainer } from '@/components/layout';

interface LayoutProps {
  children: ReactNode;
}

export default function InternalLayout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState({ title: 'Painel Operacional', subtitle: 'Gestão de leads e operações' });

  // Obter o caminho atual
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/internal/advogada/operacional';

  // Atualizar título baseado no caminho
  const menuItems = [
    { id: 'dashboard', label: 'Painel Operacional', href: '/internal/advogada/operacional' },
    { id: 'leads', label: 'Leads', href: '/internal/advogada/leads' },
    { id: 'atendimento', label: 'Atendimento', href: '/internal/advogada/atendimento' },
    { id: 'casos', label: 'Casos', href: '/internal/advogada/casos' },
    { id: 'agenda', label: 'Agenda', href: '/internal/advogada/agenda' },
    { id: 'documentos', label: 'Documentos', href: '/internal/advogada/documentos' },
    { id: 'automacoes', label: 'Automações', href: '/internal/advogada/automacoes' },
    { id: 'canais', label: 'Canais', href: '/internal/advogada/canais' },
    { id: 'inteligencia', label: 'Inteligência', href: '/internal/advogada/inteligencia' },
    { id: 'configuracoes', label: 'Configurações', href: '/internal/advogada/configuracoes' },
  ];

  React.useEffect(() => {
    const currentItem = menuItems.find(item => 
      item.href === currentPath || 
      (item.href === '/internal/advogada/leads' && currentPath.startsWith('/internal/advogada/leads')) ||
      (item.href === '/internal/advogada/casos' && currentPath.startsWith('/internal/advogada/casos'))
    );
    
    if (currentItem) {
      const subtitles: Record<string, string> = {
        'Painel Operacional': 'Gestão de leads e operações',
        'Leads': 'Captura e qualificação de leads',
        'Atendimento': 'Gestão de atendimento ao cliente',
        'Casos': 'Acompanhamento de processos',
        'Agenda': 'Compromissos e consultas',
        'Documentos': 'Gestão documental',
        'Automações': 'Fluxos automatizados',
        'Canais': 'WhatsApp e Instagram',
        'Inteligência': 'Análises e insights',
        'Configurações': 'Configurações do sistema'
      };
      
      setCurrentPage({
        title: currentItem.label,
        subtitle: subtitles[currentItem.label] || ''
      });
    }
  }, [currentPath]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar currentPath={currentPath} />
      
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile sidebar */}
      <Sidebar 
        currentPath={currentPath} 
        isMobile={true}
        onClose={() => setMobileMenuOpen(false)}
      />
      
      {/* Main content */}
      <div className="lg:pl-64">
        <Topbar 
          title={currentPage.title} 
          subtitle={currentPage.subtitle}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <PageContainer>
          {children}
        </PageContainer>
      </div>
    </div>
  );
}
