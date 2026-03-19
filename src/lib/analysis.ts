import type {
  ActionType,
  AnalysisData,
  BettingRound,
  Card,
  Decision,
  HandHistory,
  HeroGrade,
  Mistake,
  PlayerAction,
  Rank,
} from '../types/poker';
import { getBestHand } from './evaluator';

// ── Session Stats ───────────────────────────────────────────────────

export interface SessionStats {
  totalHands: number;
  averageGrade: HeroGrade;
  totalEvLoss: number;
  averageEvLossPerHand: number;
  biggestMistake: Mistake | null;
  mistakesByRound: Record<BettingRound, number>;
}

// ── Constants ───────────────────────────────────────────────────────

const BETTING_ROUNDS: BettingRound[] = ['preflop', 'flop', 'turn', 'river'];

const RANK_VALUES: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
  '7': 7, '8': 8, '9': 9, '10': 10,
  'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/**
 * Simplified preflop hand strength based on hole card ranks and suitedness.
 * Returns a normalized 0–1 value.
 */
function getPreflopStrength(holeCards: Card[]): number {
  if (holeCards.length < 2) return 0.3;

  const v1 = RANK_VALUES[holeCards[0].rank];
  const v2 = RANK_VALUES[holeCards[1].rank];
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const isPair = v1 === v2;
  const isSuited = holeCards[0].suit === holeCards[1].suit;

  // Base strength from card values (normalized to 0–1 range)
  let strength = (high + low) / 28; // max sum = 28 (A+A)

  if (isPair) {
    // Pairs get a significant boost
    strength += 0.25;
  }

  if (isSuited) {
    strength += 0.05;
  }

  // Connectedness bonus (close ranks)
  const gap = high - low;
  if (gap <= 2 && !isPair) {
    strength += 0.03;
  }

  // Clamp to [0, 1]
  return Math.min(1, Math.max(0, strength));
}

/**
 * Get the community cards visible at a given betting round.
 */
function getCommunityCardsForRound(
  allCommunityCards: Card[],
  round: BettingRound,
): Card[] {
  switch (round) {
    case 'preflop':
      return [];
    case 'flop':
      return allCommunityCards.slice(0, 3);
    case 'turn':
      return allCommunityCards.slice(0, 4);
    case 'river':
    case 'showdown':
      return allCommunityCards.slice(0, 5);
  }
}

/**
 * Calculate hand strength for a given round. Preflop uses a simplified
 * heuristic since we can't form a 5-card hand.
 */
function getHandStrength(
  holeCards: Card[],
  communityCards: Card[],
  round: BettingRound,
): number {
  const visible = getCommunityCardsForRound(communityCards, round);

  if (round === 'preflop' || visible.length < 3) {
    return getPreflopStrength(holeCards);
  }

  const evaluation = getBestHand(holeCards, visible);
  return evaluation.strength;
}

/**
 * Get a human-readable description of the hero's hand at this round.
 */
function getHandDescription(
  holeCards: Card[],
  communityCards: Card[],
  round: BettingRound,
): string {
  const visible = getCommunityCardsForRound(communityCards, round);

  if (round === 'preflop' || visible.length < 3) {
    const r1 = holeCards[0]?.rank ?? '?';
    const r2 = holeCards[1]?.rank ?? '?';
    const suited = holeCards.length >= 2 && holeCards[0].suit === holeCards[1].suit;
    return `${r1}${r2}${suited ? 's' : 'o'}`;
  }

  const evaluation = getBestHand(holeCards, visible);
  return evaluation.description;
}

/**
 * Calculate pot odds: the ratio of amount to call vs total pot after calling.
 * Returns a value between 0 and 1. Returns 0 if no bet to call.
 */
function calculatePotOdds(
  pot: number,
  amountToCall: number,
): number {
  if (amountToCall <= 0) return 0;
  return amountToCall / (pot + amountToCall);
}

/**
 * Determine the "optimal" action based on hand strength and pot odds.
 */
function determineOptimalAction(
  strength: number,
  potOdds: number,
  facingBet: boolean,
): { action: ActionType; frequencies: { fold: number; call: number; raise: number } } {
  let frequencies: { fold: number; call: number; raise: number };

  if (strength > 0.7) {
    // Strong hand — lean toward raising
    frequencies = { fold: 0.05, call: 0.25, raise: 0.70 };
  } else if (strength >= 0.35) {
    // Medium hand — depends on pot odds
    if (potOdds > 0 && strength > potOdds) {
      // Pot odds justify continuing
      frequencies = { fold: 0.15, call: 0.60, raise: 0.25 };
    } else {
      frequencies = { fold: 0.30, call: 0.55, raise: 0.15 };
    }
  } else {
    // Weak hand — lean toward folding
    frequencies = { fold: 0.70, call: 0.25, raise: 0.05 };
  }

  // Add noise of ±5% to each value
  frequencies = addNoise(frequencies);

  // Determine the single optimal action from the highest frequency
  let action: ActionType;
  if (frequencies.raise >= frequencies.call && frequencies.raise >= frequencies.fold) {
    action = facingBet ? 'raise' : 'bet';
  } else if (frequencies.call >= frequencies.fold) {
    action = facingBet ? 'call' : 'check';
  } else {
    action = facingBet ? 'fold' : 'check';
  }

  return { action, frequencies };
}

/**
 * Add noise of ±5% to frequency values and re-normalize to sum = 1.
 */
function addNoise(
  freq: { fold: number; call: number; raise: number },
): { fold: number; call: number; raise: number } {
  const noise = () => (Math.random() - 0.5) * 0.10; // ±5%

  let fold = Math.max(0, freq.fold + noise());
  let call = Math.max(0, freq.call + noise());
  let raise = Math.max(0, freq.raise + noise());

  // Re-normalize
  const total = fold + call + raise;
  if (total === 0) {
    return { fold: 1 / 3, call: 1 / 3, raise: 1 / 3 };
  }

  fold /= total;
  call /= total;
  raise /= total;

  return { fold, call, raise };
}

/**
 * Calculate the EV difference between the hero's action and the optimal action.
 * Returns a positive number representing BB lost.
 */
function calculateEvDiff(
  heroAction: ActionType,
  optimalFrequencies: { fold: number; call: number; raise: number },
  strength: number,
  pot: number,
  bigBlind: number,
): number {
  // Map hero action to frequency category
  const heroCategory = mapActionToCategory(heroAction);
  const optimalCategory = getHighestFrequencyCategory(optimalFrequencies);

  if (heroCategory === optimalCategory) {
    return 0;
  }

  // EV loss is proportional to deviation from optimal and pot size
  const heroFreq = optimalFrequencies[heroCategory];
  const optimalFreq = optimalFrequencies[optimalCategory];
  const freqDiff = optimalFreq - heroFreq;

  // Scale by pot size relative to big blind, capped at reasonable values
  const potInBB = pot / bigBlind;
  const evLoss = freqDiff * potInBB * (1 - strength) * 0.5;

  return Math.max(0, Math.round(evLoss * 100) / 100);
}

/**
 * Map an ActionType to its frequency category.
 */
function mapActionToCategory(
  action: ActionType,
): 'fold' | 'call' | 'raise' {
  switch (action) {
    case 'fold':
      return 'fold';
    case 'check':
    case 'call':
      return 'call';
    case 'bet':
    case 'raise':
      return 'raise';
  }
}

/**
 * Get the frequency category with the highest value.
 */
function getHighestFrequencyCategory(
  freq: { fold: number; call: number; raise: number },
): 'fold' | 'call' | 'raise' {
  if (freq.raise >= freq.call && freq.raise >= freq.fold) return 'raise';
  if (freq.call >= freq.fold) return 'call';
  return 'fold';
}

/**
 * Determine whether the hero was facing a bet on a given round.
 * Looks at actions prior to the hero's action in that round.
 */
function isFacingBet(
  actions: PlayerAction[],
  heroId: string,
  round: BettingRound,
): boolean {
  for (const a of actions) {
    if (a.round !== round) continue;
    if (a.playerId === heroId) break;
    if (a.type === 'bet' || a.type === 'raise') {
      return true;
    }
  }
  return false;
}

/**
 * Estimate the pot size at the point a hero made their decision in a round.
 */
function getPotAtDecision(
  actions: PlayerAction[],
  heroId: string,
  round: BettingRound,
  initialPot: number,
): number {
  let pot = initialPot;
  for (const a of actions) {
    // Sum up all contributions from rounds before this one
    if (BETTING_ROUNDS.indexOf(a.round) < BETTING_ROUNDS.indexOf(round)) {
      pot += a.amount ?? 0;
      continue;
    }
    // Within this round, sum up to (but not including) the hero's action
    if (a.round === round) {
      if (a.playerId === heroId) break;
      pot += a.amount ?? 0;
    }
  }
  return pot;
}

/**
 * Get the amount the hero needs to call in a given round.
 */
function getAmountToCall(
  actions: PlayerAction[],
  heroId: string,
  round: BettingRound,
): number {
  let highestBet = 0;
  let heroBet = 0;

  for (const a of actions) {
    if (a.round !== round) continue;
    if (a.playerId === heroId) break;
    const amount = a.amount ?? 0;
    if (a.type === 'bet' || a.type === 'raise') {
      highestBet = Math.max(highestBet, amount);
    }
  }

  // Check if hero has already put money in this round
  for (const a of actions) {
    if (a.round !== round) continue;
    if (a.playerId === heroId) {
      heroBet = a.amount ?? 0;
      break;
    }
  }

  return Math.max(0, highestBet - heroBet);
}

// ── Grade Calculation ───────────────────────────────────────────────

function calculateGrade(totalEvLoss: number): HeroGrade {
  if (totalEvLoss <= 0.5) return 'A+';
  if (totalEvLoss <= 1.5) return 'A';
  if (totalEvLoss <= 3) return 'A-';
  if (totalEvLoss <= 5) return 'B+';
  if (totalEvLoss <= 8) return 'B';
  if (totalEvLoss <= 12) return 'B-';
  if (totalEvLoss <= 18) return 'C+';
  if (totalEvLoss <= 25) return 'C';
  if (totalEvLoss <= 35) return 'C-';
  if (totalEvLoss <= 50) return 'D';
  return 'F';
}

// ── Severity ────────────────────────────────────────────────────────

function determineSeverity(evLoss: number): 'minor' | 'moderate' | 'major' {
  if (evLoss < 2) return 'minor';
  if (evLoss <= 8) return 'moderate';
  return 'major';
}

// ── Mistake Description ─────────────────────────────────────────────

function generateMistakeDescription(
  decision: Decision,
  round: BettingRound,
  handDescription: string,
): string {
  const heroCategory = mapActionToCategory(decision.heroAction);
  const optimalCategory = mapActionToCategory(decision.optimalAction);

  // Folding a strong hand
  if (heroCategory === 'fold' && optimalCategory === 'raise') {
    return `Folded ${handDescription} on the ${round}. This hand had significant equity and should have been continued.`;
  }

  // Folding a medium hand that should have called
  if (heroCategory === 'fold' && optimalCategory === 'call') {
    return `Folded ${handDescription} on the ${round}. The pot odds justified a call here.`;
  }

  // Calling with a weak hand
  if (heroCategory === 'call' && optimalCategory === 'fold') {
    return `Called with a weak hand (${handDescription}) when pot odds did not justify continuing.`;
  }

  // Missing value — checking/calling with a strong hand
  if (heroCategory === 'call' && optimalCategory === 'raise') {
    return `Checked/called with a strong hand (${handDescription}). A raise would have extracted more value.`;
  }

  // Over-betting weak — raising with a weak hand
  if (heroCategory === 'raise' && optimalCategory === 'fold') {
    return `Raised with a weak holding on the ${round}. This spot called for a check or fold.`;
  }

  // Raising when a call was better
  if (heroCategory === 'raise' && optimalCategory === 'call') {
    return `Raised with ${handDescription} on the ${round}. A call would have been more appropriate here.`;
  }

  return `Suboptimal play with ${handDescription} on the ${round}.`;
}

// ── Main Analysis Function ──────────────────────────────────────────

/**
 * Analyzes a completed hand and generates GTO-inspired feedback.
 */
export function analyzeHand(handHistory: HandHistory): AnalysisData {
  const hero = handHistory.players.find((p) => p.isHero);

  if (!hero) {
    return {
      heroGrade: 'A+',
      decisions: [],
      totalEvLoss: 0,
      mistakes: [],
      handNumber: handHistory.handNumber,
    };
  }

  const holeCards = hero.holeCards;
  const communityCards = handHistory.communityCards;
  const actions = handHistory.actions;

  // Use the recorded big blind, falling back to estimation for backward compatibility
  const bigBlind = handHistory.bigBlind ?? estimateBigBlind(actions);

  const decisions: Decision[] = [];
  const mistakes: Mistake[] = [];

  // Analyze each round where hero acted
  for (const round of BETTING_ROUNDS) {
    const heroActions = actions.filter(
      (a) => a.playerId === hero.id && a.round === round,
    );

    if (heroActions.length === 0) continue;

    // Take the hero's primary action in this round
    const heroAction = heroActions[0];

    const strength = getHandStrength(holeCards, communityCards, round);
    const facingBet = isFacingBet(actions, hero.id, round);
    const pot = getPotAtDecision(actions, hero.id, round, 0);
    const amountToCall = getAmountToCall(actions, hero.id, round);
    const potOdds = calculatePotOdds(pot, amountToCall);

    const { action: optimalAction, frequencies } = determineOptimalAction(
      strength,
      potOdds,
      facingBet,
    );

    const evDiff = calculateEvDiff(
      heroAction.type,
      frequencies,
      strength,
      Math.max(pot, bigBlind), // ensure minimum pot of 1 BB
      bigBlind,
    );

    const decision: Decision = {
      round,
      heroAction: heroAction.type,
      heroAmount: heroAction.amount,
      optimalAction,
      optimalAmount: heroAction.amount, // simplified: same sizing
      optimalFrequencies: frequencies,
      evDiff,
    };

    decisions.push(decision);

    // Generate mistake if hero deviated from optimal
    if (evDiff > 0) {
      const handDesc = getHandDescription(holeCards, communityCards, round);
      const description = generateMistakeDescription(decision, round, handDesc);

      mistakes.push({
        round,
        description,
        severity: determineSeverity(evDiff),
        evLoss: evDiff,
        heroAction: heroAction.type,
        optimalAction,
      });
    }
  }

  const totalEvLoss = decisions.reduce((sum, d) => sum + d.evDiff, 0);
  const heroGrade = calculateGrade(totalEvLoss);

  return {
    heroGrade,
    decisions,
    totalEvLoss: Math.round(totalEvLoss * 100) / 100,
    mistakes,
    handNumber: handHistory.handNumber,
  };
}

/**
 * Estimate the big blind from preflop actions.
 * Falls back to 2 if unable to determine.
 */
function estimateBigBlind(actions: PlayerAction[]): number {
  const preflopBets = actions
    .filter((a) => a.round === 'preflop' && a.amount != null && a.amount > 0)
    .map((a) => a.amount!);

  if (preflopBets.length >= 2) {
    // The big blind is typically the second-smallest preflop forced bet
    preflopBets.sort((a, b) => a - b);
    return preflopBets[1] ?? preflopBets[0] ?? 2;
  }

  if (preflopBets.length === 1) {
    return preflopBets[0];
  }

  return 2;
}

// ── Session Stats ───────────────────────────────────────────────────

const GRADE_VALUES: Record<HeroGrade, number> = {
  'A+': 12, 'A': 11, 'A-': 10,
  'B+': 9, 'B': 8, 'B-': 7,
  'C+': 6, 'C': 5, 'C-': 4,
  'D': 3, 'F': 1,
};

const VALUE_TO_GRADE: [number, HeroGrade][] = [
  [11.5, 'A+'], [10.5, 'A'], [9.5, 'A-'],
  [8.5, 'B+'], [7.5, 'B'], [6.5, 'B-'],
  [5.5, 'C+'], [4.5, 'C'], [3.5, 'C-'],
  [2, 'D'], [0, 'F'],
];

function gradeFromAverage(avg: number): HeroGrade {
  for (const [threshold, grade] of VALUE_TO_GRADE) {
    if (avg >= threshold) return grade;
  }
  return 'F';
}

/**
 * Calculates aggregate statistics across multiple analyzed hands.
 */
export function getSessionStats(analyses: AnalysisData[]): SessionStats {
  const totalHands = analyses.length;

  const totalEvLoss = analyses.reduce((sum, a) => sum + a.totalEvLoss, 0);
  const averageEvLossPerHand = totalHands > 0 ? totalEvLoss / totalHands : 0;

  // Average grade
  const gradeSum = analyses.reduce(
    (sum, a) => sum + GRADE_VALUES[a.heroGrade],
    0,
  );
  const averageGradeValue = totalHands > 0 ? gradeSum / totalHands : 12;
  const averageGrade = gradeFromAverage(averageGradeValue);

  // Find biggest mistake
  const allMistakes = analyses.flatMap((a) => a.mistakes);
  const biggestMistake = allMistakes.length > 0
    ? allMistakes.reduce((worst, m) => (m.evLoss > worst.evLoss ? m : worst))
    : null;

  // Count mistakes by round
  const mistakesByRound: Record<BettingRound, number> = {
    preflop: 0,
    flop: 0,
    turn: 0,
    river: 0,
    showdown: 0,
  };

  for (const mistake of allMistakes) {
    mistakesByRound[mistake.round]++;
  }

  return {
    totalHands,
    averageGrade,
    totalEvLoss: Math.round(totalEvLoss * 100) / 100,
    averageEvLossPerHand: Math.round(averageEvLossPerHand * 100) / 100,
    biggestMistake,
    mistakesByRound,
  };
}
