import { AppShell } from "./components/layout/AppShell";
import { GameSettings } from "./components/settings/GameSettings";
import { PokerTable } from "./components/game/PokerTable";
import { AnalysisDashboard } from "./components/analysis/AnalysisDashboard";
import { useGameStore } from "./store/gameStore";

function App() {
    const gamePhase = useGameStore((s) => s.gamePhase);

    return (
        <AppShell>
            {gamePhase === "settings" && <GameSettings />}
            {(gamePhase === "playing" || gamePhase === "showdown") && (
                <PokerTable />
            )}
            {gamePhase === "analysis" && <AnalysisDashboard />}
        </AppShell>
    );
}

export default App;
