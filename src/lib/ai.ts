import type {
  Card,
  Player,
  ActionType,
  BettingRound,
  AIPersonality,
} from '../types/poker';
import { getBestHand } from './evaluator';
import { cardValue } from './deck';

// ── Public Types ────────────────────────────────────────────────────

export interface AIDecisionParams {
  player: Player;
  communityCards: Card[];
  pot: number;
  currentBet: number;
  minRaise: number;
  round: BettingRound;
  numActivePlayers: number;
}

export interface AIDecisionResult {
  action: ActionType;
  amount?: number;
}

interface PersonalityProfile {
  preflopRange: number;
  aggressionFactor: number;
  bluffFrequency: number;
}

// ── Constants ───────────────────────────────────────────────────────

export const AI_NAMES: string[] = [
  'Shark',
  'Ace',
  'Bluffer',
  'Rock',
  'Maverick',
  'Dealer',
  'Ghost',
  'Fox',
];

const PERSONALITY_PROFILES: Record<AIPersonality, PersonalityProfile> = {
  TAG:            { preflopRange: 0.20, aggressionFactor: 0.7, bluffFrequency: 0.10 },
  LAG:            { preflopRange: 0.40, aggressionFactor: 0.8, bluffFrequency: 0.20 },
  'tight-passive': { preflopRange: 0.15, aggressionFactor: 0.2, bluffFrequency: 0.05 },
  'loose-passive': { preflopRange: 0.50, aggressionFactor: 0.3, bluffFrequency: 0.08 },
};

// ── Personality ─────────────────────────────────────────────────────

/** Returns personality-specific thresholds and tendencies. */
export function getPersonalityAdjustment(personality: AIPersonality): PersonalityProfile {
  return PERSONALITY_PROFILES[personality];
}

/** Returns a random AI personality. */
export function getRandomPersonality(): AIPersonality {
  const personalities: AIPersonality[] = ['TAG', 'LAG', 'tight-passive', 'loose-passive'];
  return personalities[Math.floor(Math.random() * personalities.length)];
}

// ── Preflop Hand Strength ───────────────────────────────────────────

/**
 * Estimates preflop hand strength on a 0–1 scale.
 *
 * Uses a simplified model: pairs are valued by rank, suited/connected
 * bonuses are applied, and high-card kickers contribute.
 *
 * Representative values:
 *   AA ≈ 1.0, KK ≈ 0.95, QQ ≈ 0.90
 *   AKs ≈ 0.85, AKo ≈ 0.80, 72o ≈ 0.05
 */
export function getPreflopHandStrength(holeCards: Card[]): number {
  if (holeCards.length !== 2) return 0;

  const [c1, c2] = holeCards;
  const v1 = cardValue(c1);
  const v2 = cardValue(c2);
  const high = Math.max(v1, v2);
  const low = Math.min(v1, v2);
  const suited = c1.suit === c2.suit;
  const gap = high - low;
  const isPair = v1 === v2;

  if (isPair) {
    // Pairs: scale from ~0.40 (22) to 1.0 (AA)
    // value range 2–14 → normalized 0–1
    return 0.40 + (high - 2) * (0.60 / 12);
  }

  // Base: average of high-card contributions
  // high=14 → 1.0, high=2 → 0.0 (before suit/gap adjustments)
  let strength = ((high - 2) / 12) * 0.55 + ((low - 2) / 12) * 0.25;

  // Suited bonus
  if (suited) {
    strength += 0.06;
  }

  // Connectedness bonus (smaller gap = better draw potential)
  if (gap === 1) {
    strength += 0.05; // connectors
  } else if (gap === 2) {
    strength += 0.03; // one-gappers
  } else if (gap === 3) {
    strength += 0.01;
  }

  // Ace kicker bonus (when not a pair)
  if (high === 14) {
    strength += 0.05;
  }

  return Math.min(1, Math.max(0, strength));
}

// ── AI Decision Entry Point ─────────────────────────────────────────

/**
 * Determines the AI player's action given the current game state.
 *
 * The logic is intentionally beatable: it uses simple heuristics with
 * personality-driven thresholds and small random noise to produce
 * human-like (but imperfect) decisions.
 */
export function getAIDecision(params: AIDecisionParams): AIDecisionResult {
  const { player, communityCards, pot, currentBet, minRaise, round, numActivePlayers } = params;
  const personality = player.personality ?? 'TAG';
  const profile = getPersonalityAdjustment(personality);

  // Preflop uses its own hand-strength model
  if (round === 'preflop') {
    return makePreflopDecision(player, profile, currentBet, minRaise, pot);
  }

  // Postflop uses the full hand evaluator
  return makePostflopDecision(player, communityCards, profile, currentBet, minRaise, pot, numActivePlayers);
}

// ── Preflop Decision ────────────────────────────────────────────────

function makePreflopDecision(
  player: Player,
  profile: PersonalityProfile,
  currentBet: number,
  minRaise: number,
  _pot: number,
): AIDecisionResult {
  const strength = getPreflopHandStrength(player.holeCards);
  const toCall = currentBet - player.currentBet;

  // Threshold below which the hand is outside our range
  const foldThreshold = 1 - profile.preflopRange;

  if (strength < foldThreshold) {
    // Marginal hand — usually fold, but 10% of the time call anyway
    if (Math.random() < 0.10 && toCall > 0 && toCall <= player.stack) {
      return { action: 'call', amount: toCall };
    }
    // If there's nothing to call, just check
    if (toCall <= 0) {
      return { action: 'check' };
    }
    return { action: 'fold' };
  }

  // Hand is within our playable range

  // Top quartile of range → consider raising
  const topQuartileThreshold = 1 - profile.preflopRange * 0.25;
  const isTopQuartile = strength >= topQuartileThreshold;

  // ~5% random noise: occasionally deviate from the "correct" action
  const randomNoise = Math.random();
  if (randomNoise < 0.05) {
    // Random deviation: call instead of raise, or vice versa
    if (toCall > 0 && toCall <= player.stack) {
      return { action: 'call', amount: toCall };
    }
    return { action: 'check' };
  }

  if (isTopQuartile && Math.random() > (1 - profile.aggressionFactor)) {
    // Raise: 2.5x–3.5x the current bet (or minRaise if no bet yet)
    const multiplier = 2.5 + Math.random();
    const raiseBase = currentBet > 0 ? currentBet : minRaise;
    let raiseAmount = Math.round(raiseBase * multiplier);
    raiseAmount = Math.max(raiseAmount, minRaise);
    raiseAmount = Math.min(raiseAmount, player.stack);

    if (raiseAmount > toCall && raiseAmount <= player.stack) {
      return { action: 'raise', amount: raiseAmount };
    }
  }

  // Default: call or check
  if (toCall > 0 && toCall <= player.stack) {
    return { action: 'call', amount: toCall };
  }
  return { action: 'check' };
}

// ── Postflop Decision ───────────────────────────────────────────────

function makePostflopDecision(
  player: Player,
  communityCards: Card[],
  profile: PersonalityProfile,
  currentBet: number,
  minRaise: number,
  pot: number,
  _numActivePlayers: number,
): AIDecisionResult {
  const evaluation = getBestHand(player.holeCards, communityCards);
  const strength = evaluation.strength;
  const toCall = currentBet - player.currentBet;

  // ── No bet to face (can check) ──
  if (toCall <= 0) {
    return decideWhenCanCheck(strength, profile, pot, minRaise, player.stack);
  }

  // ── Facing a bet ──
  return decideWhenFacingBet(strength, profile, pot, toCall, minRaise, player.stack);
}

// ── Check / Bet Decision ────────────────────────────────────────────

function decideWhenCanCheck(
  strength: number,
  profile: PersonalityProfile,
  pot: number,
  minRaise: number,
  stack: number,
): AIDecisionResult {
  const random = Math.random();

  // Strong hand → bet most of the time (scaled by aggression)
  if (strength > 0.6 && random < profile.aggressionFactor) {
    const sizing = betSize(strength, profile, pot);
    const amount = clampBet(sizing, minRaise, stack);
    if (amount >= minRaise && amount <= stack) {
      return { action: 'bet', amount };
    }
  }

  // Medium hand → occasionally bet
  if (strength > 0.3 && strength <= 0.6 && random < profile.aggressionFactor * 0.3) {
    const sizing = betSize(strength, profile, pot);
    const amount = clampBet(sizing, minRaise, stack);
    if (amount >= minRaise && amount <= stack) {
      return { action: 'bet', amount };
    }
  }

  // Weak hand → bluff occasionally
  if (strength <= 0.3 && random < profile.bluffFrequency) {
    const sizing = Math.round(pot * (0.5 + Math.random() * 0.25)); // 50-75% pot bluff
    const amount = clampBet(sizing, minRaise, stack);
    if (amount >= minRaise && amount <= stack) {
      return { action: 'bet', amount };
    }
  }

  return { action: 'check' };
}

// ── Call / Raise / Fold Decision ────────────────────────────────────

function decideWhenFacingBet(
  strength: number,
  profile: PersonalityProfile,
  pot: number,
  toCall: number,
  minRaise: number,
  stack: number,
): AIDecisionResult {
  const random = Math.random();

  // Pot odds: we need at least this much equity to profitably call
  const potOdds = toCall / (pot + toCall);

  // Strong hand → raise
  if (strength > 0.7 && random < profile.aggressionFactor) {
    const raiseMultiplier = 2 + Math.random(); // 2x–3x the bet
    let raiseAmount = Math.round(toCall * raiseMultiplier);
    raiseAmount = Math.max(raiseAmount, minRaise);
    raiseAmount = Math.min(raiseAmount, stack);
    if (raiseAmount > toCall && raiseAmount <= stack) {
      return { action: 'raise', amount: raiseAmount };
    }
    // Can't raise — just call
    if (toCall <= stack) {
      return { action: 'call', amount: toCall };
    }
  }

  // Medium hand → call if odds are right
  if (strength > potOdds && toCall <= stack) {
    // ~5% random noise: occasionally fold a marginal call (makes AI exploitable)
    if (strength < 0.5 && random < 0.05) {
      return { action: 'fold' };
    }
    return { action: 'call', amount: toCall };
  }

  // Weak hand facing a bet → usually fold
  // But occasionally bluff-raise
  if (random < profile.bluffFrequency) {
    let raiseAmount = Math.round(toCall * (2 + Math.random()));
    raiseAmount = Math.max(raiseAmount, minRaise);
    raiseAmount = Math.min(raiseAmount, stack);
    if (raiseAmount > toCall && raiseAmount <= stack) {
      return { action: 'raise', amount: raiseAmount };
    }
  }

  // If we can't afford to call or it's unprofitable, fold
  if (toCall > stack) {
    return { action: 'fold' };
  }
  return { action: 'fold' };
}

// ── Bet Sizing Helper ───────────────────────────────────────────────

/**
 * Calculates a bet size between 33% and 100% of the pot.
 *
 * Stronger hands bet bigger (value), aggressive personalities size up,
 * and random noise keeps it from being perfectly predictable.
 */
function betSize(strength: number, profile: PersonalityProfile, pot: number): number {
  // Base sizing: 33%–100% of pot, scaled by hand strength
  const minFraction = 0.33;
  const maxFraction = 1.0;
  const range = maxFraction - minFraction;

  // Stronger hands → larger bets, with aggression shift
  const strengthFactor = Math.min(1, strength * 1.2); // slight upward bias
  const aggressionShift = (profile.aggressionFactor - 0.5) * 0.2; // ±0.1 shift
  const noise = (Math.random() - 0.5) * 0.1; // ±5% random noise

  const fraction = Math.min(maxFraction, Math.max(minFraction,
    minFraction + range * strengthFactor + aggressionShift + noise,
  ));

  return Math.round(pot * fraction);
}

/** Clamps a bet amount between a minimum and maximum. */
function clampBet(amount: number, minBet: number, maxBet: number): number {
  return Math.max(minBet, Math.min(maxBet, amount));
}
