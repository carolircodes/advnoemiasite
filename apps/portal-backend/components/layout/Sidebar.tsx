'use client';

import {
  Bot,
  Brain,
  Calendar,
  FileText,
  FolderOpen,
  LayoutDashboard,
  MessageSquare,
  Radio,
  Settings,
  Smartphone,
  Users,
  X
} from 'lucide-react';

import {
  internalWorkspaceMenuSections,
  isInternalWorkspacePathActive
} from '@/lib/internal-workspace-nav';

interface SidebarProps {
  currentPath: string;
  isMobile?: boolean;
  onClose?: () => void;
}

const iconById = {
  painel: LayoutDashboard,
  leads: Users,
  atendimento: MessageSquare,
  canais: Smartphone,
  casos: FolderOpen,
  agenda: Calendar,
  documentos: FileText,
  inteligencia: Brain,
  ecossistema: Bot,
  operacional: Radio
} as const;

export function Sidebar({ currentPath, isMobile = false, onClose }: SidebarProps) {
  const isActive = (href: string) => isInternalWorkspacePathActive(currentPath, href);

  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 w-72 max-w-[calc(100vw-1rem)] bg-[#0f172a] text-white z-50 transform transition-transform duration-300 shadow-2xl ${
        onClose ? 'translate-x-0' : '-translate-x-full'
      }`
    : 'fixed left-0 top-0 h-screen w-64 bg-[#0f172a] text-white z-50';

  return (
    <div className={sidebarClasses}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-[#1e293b] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#8e6a3b] to-[#6f512c] rounded-xl flex items-center justify-center font-bold text-lg">
                N
              </div>
              <div>
                <h1 className="font-bold text-lg">NoemIA</h1>
                <p className="text-xs text-[#94a3b8]">Workspace interno</p>
              </div>
            </div>
            {isMobile && onClose ? (
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-[#1e293b] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            ) : null}
          </div>
        </div>

        <nav
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 pb-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-6">
            {internalWorkspaceMenuSections.map((section) => (
              <div key={section.id}>
                <p className="px-4 pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#64748b]">
                  {section.label}
                </p>
                <ul className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = iconById[item.id as keyof typeof iconById] || Settings;
                    const active = isActive(item.href);

                    return (
                      <li key={item.id}>
                        <a
                          href={item.href}
                          onClick={() => (isMobile && onClose ? onClose() : undefined)}
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
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-[#1e293b] p-4">
          <div className="text-xs text-[#64748b]">© 2026 NoemIA</div>
        </div>
      </div>
    </div>
  );
}
