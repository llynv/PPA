import { Navigate } from "react-router-dom";
import { PokerTable } from "../components/game/PokerTable";
import { GameSettings } from "../components/settings/GameSettings";
import { useGameStore } from "../store/gameStore";

export function LiveTablePage() {
    const gamePhase = useGameStore((s) => s.gamePhase);

    if (gamePhase === "settings") {
        return <GameSettings />;
    }

    if (gamePhase === "playing" || gamePhase === "showdown") {
        return <PokerTable />;
    }

    return <Navigate to="/review" replace />;
}
