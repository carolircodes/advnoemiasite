'use client';

import { Bell, Menu, Search, ShieldCheck } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  isMenuOpen?: boolean;
  userName?: string;
  userRole?: string;
}

export function Topbar({
  title,
  subtitle,
  onMenuClick,
  isMenuOpen = false,
  userName = 'Advogada',
  userRole = 'Noemia Paixão'
}: TopbarProps) {
  const releaseLabel = process.env.NEXT_PUBLIC_PORTAL_RELEASE_LABEL || 'local';

  return (
    <div className="sticky top-0 z-30 border-b border-[rgba(142,106,59,0.12)] bg-[rgba(252,247,240,0.92)] px-4 py-3 backdrop-blur xl:px-8 xl:py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          {onMenuClick && (
            <button
              onClick={onMenuClick}
              className="shrink-0 rounded-2xl border border-[rgba(142,106,59,0.14)] bg-white/80 p-3 text-[#13251f] transition-colors hover:bg-[#f8f1e4] lg:hidden"
              aria-label="Abrir menu"
              aria-controls="internal-mobile-sidebar"
              aria-expanded={isMenuOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(142,106,59,0.12)] bg-[rgba(249,241,226,0.9)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7b5c31]">
                <ShieldCheck className="h-3.5 w-3.5" />
                Operação interna protegida
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(19,37,31,0.1)] bg-white/78 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-[#516158]">
                Release do portal
                <span className="font-semibold text-[#13251f]">{releaseLabel}</span>
              </div>
            </div>
            <h1 className="font-serif text-[1.7rem] font-semibold leading-none tracking-[-0.03em] text-[#13251f]">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#5b6a63]">{subtitle}</p>
            ) : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-3 lg:justify-end">
          <div className="hidden min-w-[280px] items-center gap-3 rounded-full border border-[rgba(142,106,59,0.12)] bg-white/75 px-4 py-3 text-sm text-[#5b6a63] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] md:flex">
            <Search className="h-4 w-4 text-[#8e6a3b]" />
            Busca rápida, páginas e atalhos do workspace
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[rgba(142,106,59,0.12)] bg-white/85 text-[#8e6a3b]">
            <Bell className="h-4 w-4" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-[24px] border border-[rgba(142,106,59,0.12)] bg-white/88 px-3 py-2 shadow-[0_10px_24px_rgba(16,38,29,0.06)] sm:flex-none">
            <div className="min-w-0 text-left sm:text-right">
              <p className="text-sm font-semibold text-[#13251f]">{userName}</p>
              <p className="text-xs uppercase tracking-[0.08em] text-[#7b5c31]">{userRole}</p>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#8e6a3b] to-[#6f512c] text-sm font-semibold text-white shadow-[0_12px_26px_rgba(111,81,44,0.26)]">
              {userName.charAt(0).toUpperCase()}
              {userRole.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
