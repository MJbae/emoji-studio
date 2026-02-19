import { Sparkles, Settings } from 'lucide-react';
import { cn } from '@/utils/cn';

interface AppShellProps {
  children: React.ReactNode;
  hasApiKey: boolean;
  onOpenSettings: () => void;
}

function AppShell({ children, hasApiKey, onOpenSettings }: AppShellProps) {
  return (
    <div data-testid="app-shell" className="min-h-screen bg-surface-dark flex flex-col font-sans text-text">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/50 sticky top-0 z-50 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#06C755]/10 rounded-xl flex items-center justify-center shadow-sm">
              <Sparkles className="text-[#06C755]" size={20} />
            </div>
            <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-[#06C755] to-[#04A647] tracking-tight">
              LINE Emoji Studio
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div
              role="status"
              aria-live="polite"
              className="flex items-center gap-1.5 text-xs font-medium"
            >
              <div
                className={cn('w-2 h-2 rounded-full', hasApiKey ? 'bg-success' : 'bg-warning')}
              />
              <span className="text-text-muted hidden sm:inline">
                {hasApiKey ? 'API 연결됨' : 'API 키 없음'}
              </span>
            </div>
            <button
              onClick={onOpenSettings}
              aria-label="Open settings"
              data-testid="settings-btn"
              className="p-2 rounded-lg text-text-muted hover:bg-slate-100 hover:text-text transition-colors"
            >
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</div>
      </main>
    </div>
  );
}

export { AppShell };
export type { AppShellProps };
