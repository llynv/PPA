import type { Card, Player, BettingRound } from '../../types/poker';
import { suitSymbol, suitColor } from '../../lib/deck';
import { useGameStore } from '../../store/gameStore';

// ── Card Display ────────────────────────────────────────────────────

function CardDisplay({ card, faceDown = false }: { card: Card; faceDown?: boolean }) {
  if (faceDown) {
    return (
      <div className="w-12 h-16 bg-slate-600 rounded-lg border border-slate-500 flex items-center justify-center">
        <span className="text-slate-400 text-xs">🂠</span>
      </div>
    );
  }

  const color = suitColor(card.suit) === 'red' ? 'text-red-500' : 'text-slate-800';

  return (
    <div
      className={`w-12 h-16 bg-white rounded-lg border border-slate-300 flex flex-col items-center justify-center ${color}`}
    >
      <span className="text-sm font-bold">{card.rank}</span>
      <span className="text-lg">{suitSymbol(card.suit)}</span>
    </div>
  );
}

// ── Position CSS ────────────────────────────────────────────────────

type SeatPosition =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

const POSITION_CLASSES: Record<SeatPosition, string> = {
  top: 'absolute top-2 left-1/2 -translate-x-1/2',
  bottom: 'absolute bottom-2 left-1/2 -translate-x-1/2',
  left: 'absolute left-2 top-1/2 -translate-y-1/2',
  right: 'absolute right-2 top-1/2 -translate-y-1/2',
  'top-left': 'absolute top-6 left-8',
  'top-right': 'absolute top-6 right-8',
  'bottom-left': 'absolute bottom-6 left-8',
  'bottom-right': 'absolute bottom-6 right-8',
};

// ── Personality Labels ──────────────────────────────────────────────

const PERSONALITY_LABELS: Record<string, string> = {
  TAG: 'TAG',
  LAG: 'LAG',
  'tight-passive': 'TP',
  'loose-passive': 'LP',
};

// ── Component ───────────────────────────────────────────────────────

interface PlayerSeatProps {
  player: Player;
  isActive: boolean;
  isDealer: boolean;
  position: SeatPosition;
}

export function PlayerSeat({ player, isActive, isDealer, position }: PlayerSeatProps) {
  const currentRound = useGameStore((s) => s.currentRound);
  const gamePhase = useGameStore((s) => s.gamePhase);

  const showCards = player.isHero || gamePhase === 'showdown';
  const isFolded = player.isFolded;
  const isAllIn = player.isAllIn;

  return (
    <div className={`${POSITION_CLASSES[position]} z-10`}>
      <div
        className={`
          relative flex flex-col items-center gap-1 p-3 rounded-xl bg-slate-800 border
          ${isActive ? 'ring-2 ring-emerald-400 border-emerald-500' : 'border-slate-600'}
          ${isFolded ? 'opacity-50' : ''}
          min-w-[120px]
        `}
      >
        {/* Dealer button */}
        {isDealer && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 text-slate-900 rounded-full flex items-center justify-center text-xs font-bold">
            D
          </div>
        )}

        {/* Player name + personality */}
        <div className="text-center">
          <span className="text-white font-bold text-sm">{player.name}</span>
          {player.personality && (
            <span className="text-slate-400 text-xs ml-1">
              ({PERSONALITY_LABELS[player.personality] ?? player.personality})
            </span>
          )}
        </div>

        {/* Stack */}
        <div className="text-emerald-400 text-sm font-medium">
          💰 ${player.stack.toLocaleString()}
        </div>

        {/* Hole cards */}
        <HoleCards
          cards={player.holeCards}
          showCards={showCards}
          isFolded={isFolded}
          currentRound={currentRound}
        />

        {/* Status badges */}
        {isFolded && (
          <span className="text-xs bg-slate-600 text-slate-300 px-2 py-0.5 rounded font-medium">
            FOLD
          </span>
        )}
        {isAllIn && !isFolded && (
          <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded font-bold">
            ALL IN
          </span>
        )}

        {/* Current bet */}
        {player.currentBet > 0 && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
            ${player.currentBet}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Hole Cards sub-component ────────────────────────────────────────

function HoleCards({
  cards,
  showCards,
  isFolded,
  currentRound: _currentRound,
}: {
  cards: Card[];
  showCards: boolean;
  isFolded: boolean;
  currentRound: BettingRound;
}) {
  if (cards.length === 0 || isFolded) return null;

  return (
    <div className="flex gap-1">
      {cards.map((card, i) => (
        <CardDisplay key={i} card={card} faceDown={!showCards} />
      ))}
    </div>
  );
}
