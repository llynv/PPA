import { useGameStore } from '../../store/gameStore';
import { PlayerSeat } from './PlayerSeat';
import { CommunityCards } from './CommunityCards';
import { PotDisplay } from './PotDisplay';
import { ActionControls } from './ActionControls';

// ── Seat Positions ──────────────────────────────────────────────────

type SeatPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * Returns seat positions arranged around the table.
 * Hero (index 0) is always at the bottom center.
 * Opponents are distributed around the remaining positions.
 */
function getSeatPositions(playerCount: number): SeatPosition[] {
  switch (playerCount) {
    case 2:
      return ['bottom', 'top'];
    case 3:
      return ['bottom', 'top-left', 'top-right'];
    case 4:
      return ['bottom', 'top-left', 'top', 'top-right'];
    case 5:
      return ['bottom', 'left', 'top-left', 'top-right', 'right'];
    case 6:
      return ['bottom', 'left', 'top-left', 'top', 'top-right', 'right'];
    case 7:
      return ['bottom', 'bottom-left', 'left', 'top-left', 'top-right', 'right', 'bottom-right'];
    case 8:
      return ['bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right'];
    case 9:
      return ['bottom', 'bottom-left', 'left', 'top-left', 'top', 'top-right', 'right', 'bottom-right', 'bottom'];
    default:
      return ['bottom', 'top'];
  }
}

// ── Component ───────────────────────────────────────────────────────

export function PokerTable() {
  const players = useGameStore((s) => s.players);
  const communityCards = useGameStore((s) => s.communityCards);
  const pot = useGameStore((s) => s.pot);
  const currentRound = useGameStore((s) => s.currentRound);
  const activePlayerIndex = useGameStore((s) => s.activePlayerIndex);
  const dealerIndex = useGameStore((s) => s.dealerIndex);

  const seatPositions = getSeatPositions(players.length);

  return (
    <div className="flex flex-col h-full">
      {/* Table area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="
            relative w-full max-w-3xl aspect-[16/10]
            bg-slate-950 border-4 border-slate-700
            rounded-[60px] md:rounded-[100px]
            flex flex-col items-center justify-center gap-3
          "
        >
          {/* Player seats */}
          {players.map((player, i) => (
            <PlayerSeat
              key={player.id}
              player={player}
              isActive={i === activePlayerIndex}
              isDealer={i === dealerIndex}
              position={seatPositions[i] ?? 'top'}
            />
          ))}

          {/* Community cards */}
          <CommunityCards cards={communityCards} round={currentRound} />

          {/* Pot */}
          <PotDisplay pot={pot} />
        </div>
      </div>

      {/* Action controls */}
      <ActionControls />
    </div>
  );
}
