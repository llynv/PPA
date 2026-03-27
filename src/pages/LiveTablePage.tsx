import { Navigate } from "react-router-dom";
import { TableShell } from "../components/game/TableShell";
import { GameSettings } from "../components/settings/GameSettings";
import { useGameStore } from "../store/gameStore";

export function LiveTablePage() {
    const gamePhase = useGameStore((s) => s.gamePhase);

    if (gamePhase === "settings") {
        return <GameSettings />;
    }

    if (gamePhase === "playing" || gamePhase === "showdown") {
        return <TableShell />;
    }

    return <Navigate to="/review" replace />;
}

export default LiveTablePage;
