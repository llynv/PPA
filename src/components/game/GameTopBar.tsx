import { useGameStore } from "../../store/gameStore";

const ROUND_LABELS: Record<string, string> = {
  preflop: "Preflop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
};

export function GameTopBar() {
  const handNumber = useGameStore((s) => s.handNumber);
  const currentRound = useGameStore((s) => s.currentRound);
  const settings = useGameStore((s) => s.settings);

  return (
    <div
      className="shrink-0 flex items-center justify-between px-4 py-2"
      style={{
        background: "var(--sd-surface)",
        borderBottom: "1px solid var(--sd-smoke)",
      }}
    >
      <span
        className="text-xs font-medium tracking-wider uppercase"
        style={{ color: "var(--sd-ivory)", opacity: 0.6, fontFamily: "var(--sd-font-display)" }}
      >
        Hand #{handNumber}
      </span>
      <span
        className="text-sm font-semibold uppercase tracking-widest"
        style={{ color: "var(--sd-brass)", fontFamily: "var(--sd-font-display)" }}
      >
        {ROUND_LABELS[currentRound] ?? currentRound}
      </span>
      <span
        className="text-xs font-medium"
        style={{ color: "var(--sd-ivory)", opacity: 0.5, fontFamily: "var(--sd-font-mono)" }}
      >
        {settings.smallBlind}/{settings.bigBlind}
      </span>
    </div>
  );
}
