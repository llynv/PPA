import type { Card, Position, HandCombo, PositionRanges } from '../../types/poker';

// ── Constants ───────────────────────────────────────────────────────

const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;

/**
 * Map from Card.rank to the single-char notation used in HandCombo strings.
 * All ranks map to themselves except "10" → "T".
 */
const RANK_TO_CHAR: Record<string, string> = {
  '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
  '7': '7', '8': '8', '9': '9', '10': 'T',
  'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A',
};

const RANK_INDEX: Record<string, number> = {};
for (let i = 0; i < RANK_ORDER.length; i++) {
  RANK_INDEX[RANK_ORDER[i]] = i;
}

// ── Range-builder helpers ───────────────────────────────────────────

/** Returns pairs from `high` down to `low` inclusive. e.g. pairsRange('A','Q') → ["AA","KK","QQ"] */
function pairsRange(high: string, low: string): HandCombo[] {
  const hi = RANK_INDEX[high];
  const lo = RANK_INDEX[low];
  const result: HandCombo[] = [];
  for (let i = hi; i >= lo; i--) {
    result.push(`${RANK_ORDER[i]}${RANK_ORDER[i]}`);
  }
  return result;
}

/** Returns suited combos "XYs" where X=`high` and Y ranges from `topKicker` down to `lowKicker`. */
function suitedRange(high: string, topKicker: string, lowKicker: string): HandCombo[] {
  const top = RANK_INDEX[topKicker];
  const low = RANK_INDEX[lowKicker];
  const result: HandCombo[] = [];
  for (let i = top; i >= low; i--) {
    result.push(`${high}${RANK_ORDER[i]}s`);
  }
  return result;
}

/** Returns offsuit combos "XYo" where X=`high` and Y ranges from `topKicker` down to `lowKicker`. */
function offsuitRange(high: string, topKicker: string, lowKicker: string): HandCombo[] {
  const top = RANK_INDEX[topKicker];
  const low = RANK_INDEX[lowKicker];
  const result: HandCombo[] = [];
  for (let i = top; i >= low; i--) {
    result.push(`${high}${RANK_ORDER[i]}o`);
  }
  return result;
}

function toSet(combos: HandCombo[]): Set<HandCombo> {
  return new Set(combos);
}

// ── Position range data ─────────────────────────────────────────────

function buildOpenRaise(position: Position): HandCombo[] {
  switch (position) {
    case 'UTG':
      return [
        ...pairsRange('A', '7'),
        ...suitedRange('A', 'K', 'T'),
        'KQs',
        ...offsuitRange('A', 'K', 'J'),
      ];

    case 'UTG1':
      return [
        ...pairsRange('A', '6'),
        ...suitedRange('A', 'K', '9'),
        'KJs', 'KQs',
        ...offsuitRange('A', 'K', 'T'),
        'KQo',
      ];

    case 'MP':
      return [
        ...pairsRange('A', '5'),
        ...suitedRange('A', 'K', '8'),
        'KTs', 'KJs', 'KQs',
        'QJs',
        ...offsuitRange('A', 'K', 'T'),
        'KQo',
      ];

    case 'LJ':
      return [
        ...pairsRange('A', '4'),
        ...suitedRange('A', 'K', '5'),
        ...suitedRange('K', 'Q', '9'),
        ...suitedRange('Q', 'J', 'T'),
        'J9s', 'JTs',
        ...offsuitRange('A', 'K', 'T'),
        ...offsuitRange('K', 'Q', 'J'),
      ];

    case 'HJ':
      return [
        ...pairsRange('A', '3'),
        ...suitedRange('A', 'K', '4'),
        ...suitedRange('K', 'Q', '8'),
        ...suitedRange('Q', 'J', '9'),
        'J9s', 'JTs',
        'T9s',
        ...offsuitRange('A', 'K', 'T'),
        ...offsuitRange('K', 'Q', 'J'),
        'QJo',
      ];

    case 'CO':
      return [
        ...pairsRange('A', '2'),
        ...suitedRange('A', 'K', '2'),
        ...suitedRange('K', 'Q', '6'),
        ...suitedRange('Q', 'J', '8'),
        ...suitedRange('J', 'T', '8'),
        ...suitedRange('T', '9', '8'),
        '98s',
        ...offsuitRange('A', 'K', '9'),
        ...offsuitRange('K', 'Q', 'T'),
        'QJo',
      ];

    case 'BTN':
      return [
        ...pairsRange('A', '2'),
        ...suitedRange('A', 'K', '2'),
        ...suitedRange('K', 'Q', '2'),
        ...suitedRange('Q', 'J', '5'),
        ...suitedRange('J', 'T', '7'),
        ...suitedRange('T', '9', '7'),
        ...suitedRange('9', '8', '7'),
        '87s', '76s',
        ...offsuitRange('A', 'K', '7'),
        ...offsuitRange('K', 'Q', '9'),
        ...offsuitRange('Q', 'J', 'T'),
        'JTo',
      ];

    case 'SB':
      return [
        ...pairsRange('A', '2'),
        ...suitedRange('A', 'K', '2'),
        ...suitedRange('K', 'Q', '4'),
        ...suitedRange('Q', 'J', '7'),
        ...suitedRange('J', 'T', '8'),
        ...suitedRange('T', '9', '8'),
        '98s',
        ...offsuitRange('A', 'K', '8'),
        ...offsuitRange('K', 'Q', 'T'),
        'QJo',
      ];

    case 'BB':
      // BB defends wide — use a broad defending range
      return [
        ...pairsRange('A', '2'),
        ...suitedRange('A', 'K', '2'),
        ...suitedRange('K', 'Q', '2'),
        ...suitedRange('Q', 'J', '4'),
        ...suitedRange('J', 'T', '5'),
        ...suitedRange('T', '9', '6'),
        ...suitedRange('9', '8', '6'),
        '87s', '76s', '65s',
        ...offsuitRange('A', 'K', '5'),
        ...offsuitRange('K', 'Q', '8'),
        ...offsuitRange('Q', 'J', '9'),
        ...offsuitRange('J', 'T', '9'),
        'T9o',
      ];
  }
}

function buildThreeBet(position: Position): HandCombo[] {
  switch (position) {
    case 'UTG':
      return [
        ...pairsRange('A', 'Q'),
        'AKs',
      ];

    case 'UTG1':
      return [
        ...pairsRange('A', 'Q'),
        'AKs', 'AKo',
      ];

    case 'MP':
      return [
        ...pairsRange('A', 'J'),
        'AKs', 'AQs',
        'AKo',
      ];

    case 'LJ':
      return [
        ...pairsRange('A', 'T'),
        ...suitedRange('A', 'K', 'J'),
        'AKo',
      ];

    case 'HJ':
      return [
        ...pairsRange('A', 'T'),
        ...suitedRange('A', 'K', 'T'),
        'KQs',
        'AKo', 'AQo',
      ];

    case 'CO':
      return [
        ...pairsRange('A', '9'),
        ...suitedRange('A', 'K', '9'),
        'KQs', 'KJs',
        ...offsuitRange('A', 'K', 'J'),
      ];

    case 'BTN':
      return [
        ...pairsRange('A', '8'),
        ...suitedRange('A', 'K', '2'),  // A2s-A5s (bluff) + ATs+ (value)
        // filter to A2s-A5s, ATs+
        'KQs', 'KJs', 'KTs',
        'QJs',
        ...offsuitRange('A', 'K', 'T'),
        'KQo',
      ];

    case 'SB':
      return [
        ...pairsRange('A', 'T'),
        ...suitedRange('A', 'K', 'T'),
        'KQs',
        'AKo', 'AQo',
      ];

    case 'BB':
      return [
        ...pairsRange('A', 'J'),
        'AKs', 'AQs',
        'AKo',
      ];
  }
}

function buildCall3Bet(position: Position): HandCombo[] {
  // Approximate call-3bet ranges: medium-strength hands that are too good to fold
  // but not strong enough to 4-bet
  switch (position) {
    case 'UTG':
      return [
        ...pairsRange('J', '9'),
        'AQs', 'AJs',
        'AQo',
      ];

    case 'UTG1':
      return [
        ...pairsRange('J', '8'),
        'AQs', 'AJs',
        'AQo',
      ];

    case 'MP':
      return [
        ...pairsRange('T', '7'),
        'AJs', 'ATs',
        'KQs',
        'AQo',
      ];

    case 'LJ':
      return [
        ...pairsRange('9', '6'),
        'ATs', 'A9s',
        'KQs', 'KJs',
        'AQo', 'AJo',
      ];

    case 'HJ':
      return [
        ...pairsRange('9', '6'),
        'A9s', 'A8s',
        'KJs', 'KTs',
        'QJs',
        'AJo',
      ];

    case 'CO':
      return [
        ...pairsRange('8', '5'),
        'A8s', 'A7s',
        'KTs', 'K9s',
        'QJs', 'QTs',
        'ATo',
      ];

    case 'BTN':
      return [
        ...pairsRange('7', '4'),
        'A9s', 'A8s', 'A7s',
        'K9s', 'K8s',
        'QTs', 'Q9s',
        'JTs',
      ];

    case 'SB':
      return [
        ...pairsRange('9', '6'),
        'A9s', 'A8s',
        'KJs', 'KTs',
        'QJs',
        'AJo',
      ];

    case 'BB':
      return [
        ...pairsRange('T', '7'),
        'AJs', 'ATs',
        'KQs',
        'AQo',
      ];
  }
}

function buildFourBet(_position: Position): HandCombo[] {
  // Tight 4-bet range: AA, KK, AKs (universal)
  return [
    ...pairsRange('A', 'K'),
    'AKs',
  ];
}

// ── Range cache ─────────────────────────────────────────────────────

const rangeCache = new Map<Position, PositionRanges>();

function buildPositionRanges(position: Position): PositionRanges {
  const openRaise = toSet(buildOpenRaise(position));
  const threeBet = toSet(buildThreeBet(position));

  // callOpen = openRaise hands that are NOT in 3-bet range
  const callOpen = new Set<HandCombo>();
  for (const hand of openRaise) {
    if (!threeBet.has(hand)) {
      callOpen.add(hand);
    }
  }

  const call3Bet = toSet(buildCall3Bet(position));
  const fourBet = toSet(buildFourBet(position));

  return { openRaise, threeBet, callOpen, call3Bet, fourBet };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Converts hero's two hole cards to a canonical HandCombo string.
 * Higher rank first, suited/offsuit suffix.
 * Uses 'T' for rank '10'.
 *
 * @example
 * toHandCombo([{rank:'A',suit:'spades'}, {rank:'K',suit:'spades'}])  // "AKs"
 * toHandCombo([{rank:'Q',suit:'hearts'}, {rank:'J',suit:'clubs'}])   // "QJo"
 * toHandCombo([{rank:'10',suit:'spades'}, {rank:'10',suit:'hearts'}]) // "TT"
 */
export function toHandCombo(holeCards: Card[]): HandCombo {
  if (holeCards.length !== 2) {
    throw new Error('toHandCombo requires exactly 2 cards');
  }

  const [c1, c2] = holeCards;
  const r1 = RANK_TO_CHAR[c1.rank];
  const r2 = RANK_TO_CHAR[c2.rank];
  const i1 = RANK_INDEX[r1];
  const i2 = RANK_INDEX[r2];

  // Put higher rank first
  const high = i1 >= i2 ? r1 : r2;
  const low = i1 >= i2 ? r2 : r1;

  if (high === low) {
    return `${high}${low}`;
  }

  const suited = c1.suit === c2.suit;
  return `${high}${low}${suited ? 's' : 'o'}`;
}

/**
 * Returns the preflop ranges for a given position.
 * Results are cached for performance.
 */
export function getPositionRanges(position: Position): PositionRanges {
  let ranges = rangeCache.get(position);
  if (!ranges) {
    ranges = buildPositionRanges(position);
    rangeCache.set(position, ranges);
  }
  return ranges;
}

/**
 * Checks if a hand is within a specific range set.
 */
export function isInRange(hand: HandCombo, range: Set<HandCombo>): boolean {
  return range.has(hand);
}

/**
 * Returns all 169 canonical hand combos.
 *
 * 13 pairs + 78 suited + 78 offsuit = 169
 */
export function getAllHandCombos(): HandCombo[] {
  const combos: HandCombo[] = [];

  for (let i = RANK_ORDER.length - 1; i >= 0; i--) {
    // Pair
    combos.push(`${RANK_ORDER[i]}${RANK_ORDER[i]}`);

    for (let j = i - 1; j >= 0; j--) {
      // Suited
      combos.push(`${RANK_ORDER[i]}${RANK_ORDER[j]}s`);
      // Offsuit
      combos.push(`${RANK_ORDER[i]}${RANK_ORDER[j]}o`);
    }
  }

  return combos;
}
