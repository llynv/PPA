import { GameTopBar } from "./GameTopBar";
import { PokerTable } from "./PokerTable";
import { HeroDock } from "./HeroDock";

export function TableShell() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sd-bg)" }}>
      <GameTopBar />
      <div className="flex-1 min-h-0">
        <PokerTable />
      </div>
      <HeroDock />
    </div>
  );
}
