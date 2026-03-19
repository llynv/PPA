import { useGameStore } from '../../store/gameStore';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const gamePhase = useGameStore((s) => s.gamePhase);
  const handNumber = useGameStore((s) => s.handNumber);
  const resetGame = useGameStore((s) => s.resetGame);

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100">
      <nav className="bg-slate-800 border-b border-slate-700 px-4 py-3 min-h-[48px] flex flex-row items-center justify-between">
        <span className="text-emerald-400 font-bold text-lg">PPA</span>

        {gamePhase !== 'settings' && (
          <div className="flex items-center gap-4">
            <span className="text-slate-300 text-sm">Hand #{handNumber}</span>
            <button
              onClick={resetGame}
              className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
            >
              New Game
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
