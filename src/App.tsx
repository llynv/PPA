import { AppShell } from './components/layout/AppShell';
import { GameSettings } from './components/settings/GameSettings';
import { PokerTable } from './components/game/PokerTable';
import { AnalysisDashboard } from './components/analysis/AnalysisDashboard';
import { useGameStore } from './store/gameStore';

function ShowdownView() {
  const winner = useGameStore((s) => s.winner);
  const players = useGameStore((s) => s.players);
  const viewAnalysis = useGameStore((s) => s.viewAnalysis);
  const startHand = useGameStore((s) => s.startHand);

  const winnerPlayer = players.find((p) => p.id === winner);

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <h2 className="text-2xl font-bold text-emerald-400">Hand Complete!</h2>
      <p className="text-slate-300">
        Winner: {winnerPlayer?.name ?? 'Unknown'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={viewAnalysis}
          className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          View Analysis
        </button>
        <button
          onClick={startHand}
          className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Next Hand
        </button>
      </div>
    </div>
  );
}

function App() {
  const gamePhase = useGameStore((s) => s.gamePhase);

  return (
    <AppShell>
      {gamePhase === 'settings' && <GameSettings />}
      {gamePhase === 'playing' && <PokerTable />}
      {gamePhase === 'showdown' && <ShowdownView />}
      {gamePhase === 'analysis' && <AnalysisDashboard />}
    </AppShell>
  );
}

export default App;
