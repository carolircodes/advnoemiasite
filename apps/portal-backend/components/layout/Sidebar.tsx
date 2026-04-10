'use client';

import { 
  LayoutDashboard, 
  Users, 
  MessageSquare, 
  FolderOpen, 
  Calendar, 
  FileText, 
  Bot, 
  Smartphone, 
  Brain, 
  Settings,
  X
} from 'lucide-react';

interface SidebarProps {
  currentPath: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Painel Operacional', icon: LayoutDashboard, href: '/internal/advogada/operacional' },
  { id: 'leads', label: 'Leads', icon: Users, href: '/internal/advogada/leads' },
  { id: 'atendimento', label: 'Atendimento', icon: MessageSquare, href: '/internal/advogada/atendimento' },
  { id: 'casos', label: 'Casos', icon: FolderOpen, href: '/internal/advogada/casos' },
  { id: 'agenda', label: 'Agenda', icon: Calendar, href: '/internal/advogada/agenda' },
  { id: 'documentos', label: 'Documentos', icon: FileText, href: '/internal/advogada/documentos' },
  { id: 'automacoes', label: 'Automações', icon: Bot, href: '/internal/advogada/automacoes' },
  { id: 'canais', label: 'Canais', icon: Smartphone, href: '/internal/advogada/canais' },
  { id: 'inteligencia', label: 'Inteligência', icon: Brain, href: '/internal/advogada/inteligencia' },
  { id: 'configuracoes', label: 'Configurações', icon: Settings, href: '/internal/advogada/configuracoes' },
];

export function Sidebar({ currentPath, isMobile = false, onClose }: SidebarProps) {
  const isActive = (href: string) => {
    if (currentPath === href) return true;
    // Para páginas dinâmicas, verificar se começa com o caminho base
    if (href === '/internal/advogada/leads' && currentPath.startsWith('/internal/advogada/leads')) return true;
    if (href === '/internal/advogada/casos' && currentPath.startsWith('/internal/advogada/casos')) return true;
    return false;
  };

  const sidebarClasses = isMobile
    ? `fixed left-0 top-0 h-full w-64 bg-[#0f172a] text-white z-50 transform transition-transform duration-300 ${
        onClose ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'fixed left-0 top-0 h-screen w-64 bg-[#0f172a] text-white z-50';

  return (
    <div className={sidebarClasses}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="p-6 border-b border-[#1e293b]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#8e6a3b] to-[#6f512c] rounded-xl flex items-center justify-center font-bold text-lg">
                N
              </div>
              <div>
                <h1 className="font-bold text-lg">NoemIA</h1>
                <p className="text-xs text-[#94a3b8]">Painel Operacional</p>
              </div>
            </div>
            {isMobile && onClose && (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1e293b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={() => isMobile && onClose && onClose()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      active
                        ? 'bg-[#8e6a3b] text-white border-l-4 border-[#f5efe2]'
                        : 'text-[#94a3b8] hover:bg-[#1e293b] hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[#1e293b]">
          <div className="text-xs text-[#64748b]">
            © 2026 NoemIA
          </div>
        </div>
      </div>
    </div>
  );
}
