'use client';

import Link from 'next/link';
import {
  Bot,
  Brain,
  Calendar,
  ChevronRight,
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
  isOpen?: boolean;
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

export function Sidebar({
  currentPath,
  isMobile = false,
  isOpen = false,
  onClose
}: SidebarProps) {
  const isActive = (href: string) => isInternalWorkspacePathActive(currentPath, href);

  const sidebarClasses = isMobile
    ? `fixed inset-y-0 left-0 z-50 w-[min(20rem,calc(100vw-1rem))] transform transition-[transform,opacity] duration-300 ease-out lg:hidden ${
        isOpen
          ? 'translate-x-0 opacity-100 pointer-events-auto'
          : '-translate-x-full opacity-0 pointer-events-none'
      }`
    : 'fixed left-0 top-0 h-screen w-[296px]';

  return (
    <aside
      id={isMobile ? 'internal-mobile-sidebar' : undefined}
      className={sidebarClasses}
      aria-hidden={isMobile ? !isOpen : undefined}
    >
      <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-[rgba(142,106,59,0.12)] bg-[linear-gradient(180deg,#0f241d_0%,#143128_46%,#1d3c31_100%)] text-white shadow-[20px_0_60px_rgba(10,20,16,0.18)]">
        <div className="shrink-0 border-b border-white/10 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c4a165] via-[#8e6a3b] to-[#6f512c] font-serif text-xl font-semibold text-[#fff7ea] shadow-[0_16px_32px_rgba(0,0,0,0.22)]">
                N
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d5bc8f]">
                  ADVNOEMIA
                </p>
                <h1 className="font-serif text-xl font-semibold text-[#fff8ee]">NoemIA</h1>
                <p className="text-xs text-[#b9c8c2]">Workspace interno premium</p>
              </div>
            </div>
            {isMobile && onClose ? (
              <button
                onClick={onClose}
                className="rounded-xl border border-white/10 bg-white/5 p-2 transition-colors hover:bg-white/10"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          <div className="mt-5 rounded-[24px] border border-[rgba(212,188,143,0.18)] bg-[rgba(255,248,234,0.06)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d5bc8f]">
              Camada institucional
            </p>
            <p className="mt-2 text-sm leading-6 text-[#d9e2de]">
              Navegacao organizada por prioridade operacional, contexto e continuidade entre modulos.
            </p>
          </div>
        </div>

        <nav
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-5 pb-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-7">
            {internalWorkspaceMenuSections.map((section) => (
              <div key={section.id}>
                <p className="px-4 pb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#aebeb8]">
                  {section.label}
                </p>
                <ul className="space-y-2">
                  {section.items.map((item) => {
                    const Icon = iconById[item.id as keyof typeof iconById] || Settings;
                    const active = isActive(item.href);

                    return (
                      <li key={item.id}>
                        <Link
                          href={item.href}
                          onClick={() => (isMobile && onClose ? onClose() : undefined)}
                          className={`group flex items-center gap-3 rounded-[22px] border px-4 py-3.5 transition-all duration-200 ${
                            active
                              ? 'border-[rgba(212,188,143,0.2)] bg-[linear-gradient(135deg,rgba(196,161,101,0.28),rgba(142,106,59,0.18))] text-white shadow-[0_16px_32px_rgba(0,0,0,0.16)]'
                              : 'border-transparent text-[#d4dfdb] hover:border-white/10 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          <div
                            className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                              active
                                ? 'border-[rgba(255,248,234,0.18)] bg-[rgba(255,248,234,0.14)]'
                                : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <Icon className="h-[18px] w-[18px]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium">{item.label}</div>
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-[#b7c5c0] group-hover:text-[#deebe6]">
                              {item.subtitle}
                            </div>
                          </div>
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              active
                                ? 'translate-x-0 text-[#f2e4c7]'
                                : 'text-[#8da09a] group-hover:translate-x-0.5 group-hover:text-[#deebe6]'
                            }`}
                          />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="shrink-0 border-t border-white/10 p-4">
          <div className="rounded-[22px] border border-[rgba(212,188,143,0.14)] bg-[rgba(255,248,234,0.05)] p-4">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#d5bc8f]">
              Escritorio
            </div>
            <div className="mt-2 text-sm text-[#e7efec]">Noemia Paixao Advocacia</div>
            <div className="mt-1 text-xs text-[#9db0a9]">© 2026 NoemIA. Operacao institucional.</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
