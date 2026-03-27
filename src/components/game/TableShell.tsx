import { GameTopBar } from "./GameTopBar";
import { PokerTable } from "./PokerTable";
import { HeroDock } from "./HeroDock";
import { CoachPanel } from "./CoachPanel";

export function TableShell() {
  return (
    <div className="flex flex-col h-full" style={{ background: "var(--sd-bg)" }}>
      <GameTopBar />
      <div className="flex-1 flex min-h-0">
        {/* Table + dock column */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 min-h-0">
            <PokerTable />
          </div>
          <HeroDock />
          {/* Mobile: collapsible coach sheet below HeroDock */}
          <CoachPanel variant="mobile" />
        </div>
        {/* Desktop: right rail */}
        <CoachPanel variant="desktop" />
      </div>
    </div>
  );
}
