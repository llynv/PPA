# AI Player & Analysis Engine Overhaul — Design

**Date:** 2026-03-19
**Status:** Approved

## Problem

Both the AI player (`ai.ts`) and analysis engine (`analysis.ts`) use oversimplified heuristics:

- **No equity calculation** — Decisions use `getBestHand().strength` (absolute hand rank) instead of actual probability of winning. A flush draw with 45% equity shows as "High Card" strength ~0.2.
- **No position awareness** — AI plays the same from UTG as from the button. Analysis doesn't consider position.
- **No draw detection** — Neither system recognizes flush draws, straight draws, or combo draws.
- **Hardcoded frequency buckets** — Analysis uses 3 static tiers (strong/medium/weak) with random noise. Same spot produces different "optimal" advice each run.
- **No bet sizing analysis** — Only checks fold/call/raise category, ignoring sizing.
- **No opponent modeling** — AI ignores stack-to-pot ratio, board texture, and prior action.
- **Invented EV formula** — `evLoss = freqDiff * potInBB * (1 - strength) * 0.5` has no theoretical basis.

## Architecture

Build a shared poker engine (`src/lib/poker-engine/`) consumed by both AI and analysis:

```
src/lib/poker-engine/
├── equity.ts        # Monte Carlo equity calculator
├── ranges.ts        # Preflop hand range definitions by position
├── position.ts      # Position utilities (UTG through BB)
├── draws.ts         # Draw detection (flush, OESD, gutshot, combo, backdoor)
├── board.ts         # Board texture analysis (wet/dry, paired, monotone)
├── decision.ts      # Core decision framework (EV-based)
└── index.ts         # Re-exports
```

- **AI** calls the decision framework with personality-based deviations
- **Analysis** calls the same framework without deviations to compute optimal play
- Both share identical equity, range, draw, and board logic

## Module 1: Monte Carlo Equity (`equity.ts`)

Given hero's hole cards, community cards, and number of opponents, run N simulated rollouts:

1. Remove known cards from deck
2. For each simulation:
   - Deal random hole cards to each opponent
   - Deal remaining community cards
   - Evaluate all hands, determine winner
   - Tally wins/ties for hero
3. `equity = (wins + ties/numPlayers) / N`

```typescript
interface EquityResult {
  equity: number;       // 0-1
  samples: number;
  wins: number;
  ties: number;
  losses: number;
}

function calculateEquity(
  holeCards: Card[],
  communityCards: Card[],
  numOpponents: number,
  samples?: number,     // default 1000
): EquityResult
```

**Performance:** 1000 sims × 4 opponents × 21 combos/hand ≈ 84K evaluations ≈ 80-400ms. AI can use 500 sims for faster decisions.

## Module 2: Preflop Range Charts (`ranges.ts`)

169 canonical starting hands (13 pairs + 78 suited + 78 offsuit). Position-specific ranges:

| Position | Open-raise % | 3-bet % |
|----------|-------------|---------|
| UTG      | ~15%        | ~4%     |
| MP       | ~18%        | ~5%     |
| CO       | ~27%        | ~7%     |
| BTN      | ~40%        | ~9%     |
| SB       | ~35%        | N/A     |
| BB       | N/A (defend) | ~10%   |

```typescript
type HandCombo = string; // "AKs", "TT", "72o"

interface PositionRanges {
  openRaise: Set<HandCombo>;
  threeBet: Set<HandCombo>;
  callOpen: Set<HandCombo>;
  call3Bet: Set<HandCombo>;
  fourBet: Set<HandCombo>;
}
```

For fewer than 9 players, early positions are dropped first.

## Module 3: Position Utilities (`position.ts`)

Maps seat index relative to dealer → position name. Handles 2-9 player tables.

```typescript
type Position = 'UTG' | 'UTG1' | 'MP' | 'LJ' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';

function getPosition(seatIndex: number, dealerIndex: number, numPlayers: number): Position
function getPositionRanges(position: Position): PositionRanges
```

## Module 4: Draw Detection (`draws.ts`)

Analyzes hole cards + community cards for drawing hands:

```typescript
interface DrawInfo {
  flushDraw: boolean;
  flushDrawOuts: number;
  oesD: boolean;
  gutshot: boolean;
  straightDrawOuts: number;
  backdoorFlush: boolean;
  backdoorStraight: boolean;
  totalOuts: number;
  drawEquity: number;  // 2/47 per out on flop, 2/46 per out on turn (rule of 2)
}

function detectDraws(holeCards: Card[], communityCards: Card[]): DrawInfo
```

## Module 5: Board Texture (`board.ts`)

Categorizes the community cards:

```typescript
interface BoardTexture {
  wetness: 'dry' | 'semi-wet' | 'wet' | 'very-wet';
  isMonotone: boolean;
  isTwoTone: boolean;
  isRainbow: boolean;
  isPaired: boolean;
  isTrips: boolean;
  highCardCount: number;     // broadway cards (T+)
  connectedness: number;     // 0-1
  possibleStraights: number;
  possibleFlushes: boolean;
}

function analyzeBoard(communityCards: Card[]): BoardTexture
```

Board texture drives bet sizing: dry boards → small bets, wet boards → large bets.

## Module 6: Decision Framework (`decision.ts`)

Core function that evaluates any poker situation:

```typescript
interface DecisionContext {
  holeCards: Card[];
  communityCards: Card[];
  position: Position;
  round: BettingRound;
  pot: number;
  toCall: number;
  currentBet: number;
  stack: number;
  bigBlind: number;
  numActivePlayers: number;
  numPlayersInHand: number;
  isFirstToAct: boolean;
  facingRaise: boolean;
  raiserPosition?: Position;
  actionHistory: PlayerAction[];
}

interface DecisionResult {
  optimalAction: ActionType;
  optimalAmount?: number;
  frequencies: { fold: number; call: number; raise: number };
  reasoning: string;        // human-readable explanation
  equity: number;
  potOdds: number;
  impliedOdds: number;
  spr: number;
  draws: DrawInfo;
  boardTexture: BoardTexture;
  evByAction: {
    fold: number;
    call: number;
    raise: number;
  };
}

function evaluateDecision(ctx: DecisionContext): DecisionResult
```

### Preflop logic:
1. Determine position → look up range charts
2. No prior action → check open-raise range
3. Facing raise → check 3-bet/call ranges
4. Facing 3-bet → check 4-bet/call ranges

### Postflop logic:
1. Calculate equity via Monte Carlo
2. Detect draws, analyze board texture
3. Calculate pot odds: `toCall / (pot + toCall)`
4. Calculate SPR: `stack / pot`
5. EV of each action:
   - `EV(fold) = 0`
   - `EV(call) = equity × (pot + toCall) - (1 - equity) × toCall`
   - `EV(raise) = foldEquity × pot + (1 - foldEquity) × [equity × (pot + raiseSize) - (1 - equity) × raiseSize]`
6. Bet sizing by board texture:
   - Dry → 25-33% pot
   - Semi-wet → 50-66% pot
   - Wet → 75-100% pot
7. Frequencies derived from EV comparison

### Reasoning generation:
Every decision includes a human-readable explanation: "You have 45% equity with a combo draw. Pot odds require 28%. Calling is +EV at $4.30. Raising is better because you have fold equity against one-pair hands."

## AI Player Overhaul (`ai.ts`)

Thin wrapper over decision engine with personality deviations:

```typescript
function getAIDecision(params: AIDecisionParams): AIDecisionResult {
  const optimal = evaluateDecision(buildContext(params));
  return applyPersonalityDeviations(optimal, params.player.personality);
}
```

### Personality deviations:

| Personality | Range adjustment | Aggression | Bluff freq | Behavior |
|-------------|-----------------|------------|------------|----------|
| TAG | 95% of optimal | Slightly above optimal | Low (5%) | Tight, aggressive when entering |
| LAG | 130% of optimal | High | High (20%) | Wide opens, frequent 3-bets |
| Tight-passive | 80% of optimal | Very low | Minimal (3%) | Calls too much, rarely raises |
| Loose-passive | 150% of optimal | Low | Low (8%) | Calls everything, never folds |

### Dynamic adaptation:
Each AI tracks recent results. After losing big, LAG players loosen further (tilting). TAG players tighten. Creates dynamic gameplay.

## Analysis Engine Overhaul (`analysis.ts`)

For each round where hero acted:
1. Reconstruct game state at that point
2. Call `evaluateDecision()` to get optimal play
3. EV loss = `EV(optimal action) - EV(hero's action)` from `evByAction`
4. Use `reasoning` for detailed mistake descriptions
5. Include bet sizing analysis when hero raised/bet

No random noise. Same hand → same analysis, every time.

### Enhanced Decision type:
```typescript
interface Decision {
  round: BettingRound;
  heroAction: ActionType;
  heroAmount?: number;
  optimalAction: ActionType;
  optimalAmount?: number;
  optimalFrequencies: { fold: number; call: number; raise: number };
  evDiff: number;
  equity: number;
  potOdds: number;
  spr: number;
  draws: DrawInfo;
  boardTexture: BoardTexture;
  reasoning: string;
  evByAction: { fold: number; call: number; raise: number };
  betSizeAnalysis?: {
    heroSize: number;
    optimalSize: number;
    sizingError: number;
  };
}
```

## UI Updates (analysis components)

The analysis dashboard components are updated to display richer data:
- **HandTimeline:** Show equity at each street, draw info
- **DecisionChart:** Show EV by action (not just frequencies)
- **MistakeCard:** Use `reasoning` for detailed explanations, show equity/pot odds
- **HeroGrade:** EV loss calculated from real EV differences

## Files Changed

| File | Change |
|------|--------|
| `src/lib/poker-engine/equity.ts` | New |
| `src/lib/poker-engine/ranges.ts` | New |
| `src/lib/poker-engine/position.ts` | New |
| `src/lib/poker-engine/draws.ts` | New |
| `src/lib/poker-engine/board.ts` | New |
| `src/lib/poker-engine/decision.ts` | New |
| `src/lib/poker-engine/index.ts` | New |
| `src/lib/ai.ts` | Major rewrite |
| `src/lib/analysis.ts` | Major rewrite |
| `src/types/poker.ts` | Extend with new types |
| `src/store/gameStore.ts` | Pass position info, richer HandHistory |
| `src/components/analysis/*.tsx` | Display new analysis data |
