'use client';

import { Menu } from 'lucide-react';

interface TopbarProps {
  title: string;
  subtitle?: string;
  onMenuClick?: () => void;
  userName?: string;
  userRole?: string;
}

export function Topbar({ 
  title, 
  subtitle, 
  onMenuClick,
  userName = 'Advogada',
  userRole = 'Noemia Paixão'
}: TopbarProps) {
  return (
    <div className="h-16 bg-white border-b border-[#e2e8f0] flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl font-semibold text-[#10261d]">{title}</h1>
          {subtitle && <p className="text-sm text-[#64748b]">{subtitle}</p>}
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium text-[#10261d]">{userName}</p>
            <p className="text-xs text-[#64748b]">{userRole}</p>
          </div>
          <div className="w-10 h-10 bg-gradient-to-br from-[#8e6a3b] to-[#6f512c] rounded-full flex items-center justify-center text-white font-semibold">
            {userName.charAt(0).toUpperCase()}{userRole.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
