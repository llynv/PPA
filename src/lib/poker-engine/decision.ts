import type {
  DecisionContext,
  DecisionResult,
  ActionType,
  DrawInfo,
  BoardTexture,
} from '../../types/poker';
import { calculateEquity } from './equity';
import { detectDraws } from './draws';
import { analyzeBoard } from './board';
import { toHandCombo, getPositionRanges, isInRange } from './ranges';
import { getPositionCategory } from './position';

// ── Helpers ─────────────────────────────────────────────────────────

/**
 * Determines the preflop scenario based on action history.
 * - 'unopened': no raises yet (only blinds/checks/folds)
 * - 'facingRaise': someone has raised (open raise)
 * - 'facing3Bet': there has been a raise and a re-raise
 */
function getPreflopScenario(
  ctx: DecisionContext,
): 'unopened' | 'facingRaise' | 'facing3Bet' {
  if (!ctx.facingRaise && ctx.toCall <= ctx.bigBlind) {
    return 'unopened';
  }

  // Count the number of raises in preflop action history
  const preflopRaises = ctx.actionHistory.filter(
    (a) => a.round === 'preflop' && (a.type === 'raise' || a.type === 'bet'),
  );

  if (preflopRaises.length >= 2) {
    return 'facing3Bet';
  }

  if (ctx.facingRaise || ctx.toCall > ctx.bigBlind) {
    return 'facingRaise';
  }

  return 'unopened';
}

/**
 * Calculates fold equity estimate based on various factors.
 */
function estimateFoldEquity(
  ctx: DecisionContext,
  boardTexture: BoardTexture,
): number {
  const posCategory = getPositionCategory(ctx.position);

  let foldEquity = 0.3; // base

  // Position bonus
  if (posCategory === 'late') {
    foldEquity += 0.1;
  }

  // Board texture adjustments
  if (boardTexture.wetness === 'dry') {
    foldEquity += 0.1;
  } else if (boardTexture.wetness === 'wet' || boardTexture.wetness === 'very-wet') {
    foldEquity -= 0.1;
  }

  // More players = less fold equity
  const extraPlayers = ctx.numActivePlayers - 2; // subtract hero and one opponent
  foldEquity -= 0.1 * Math.max(0, extraPlayers);

  // Clamp to [0, 0.8]
  return Math.max(0, Math.min(0.8, foldEquity));
}

/**
 * Calculates bet sizing based on board texture.
 * Returns the bet size as a fraction of the pot.
 */
function getBetSizingFraction(boardTexture: BoardTexture): number {
  switch (boardTexture.wetness) {
    case 'dry':
      return 0.33;
    case 'semi-wet':
      return 0.60;
    case 'wet':
      return 0.80;
    case 'very-wet':
      return 0.90;
  }
}

/**
 * Generates a reasoning string from the decision data.
 */
function generateReasoning(
  ctx: DecisionContext,
  optimalAction: ActionType,
  equity: number,
  potOdds: number,
  draws: DrawInfo,
  boardTexture: BoardTexture,
  evByAction: { fold: number; call: number; raise: number },
  isPreflop: boolean,
): string {
  const parts: string[] = [];

  if (isPreflop) {
    parts.push(`Preflop from ${ctx.position}.`);
    parts.push(`Estimated equity: ${(equity * 100).toFixed(0)}%.`);
  } else {
    parts.push(`${ctx.round.charAt(0).toUpperCase() + ctx.round.slice(1)} from ${ctx.position}.`);
    parts.push(`Equity: ${(equity * 100).toFixed(0)}%.`);
    parts.push(`Board: ${boardTexture.wetness}.`);

    if (potOdds > 0) {
      parts.push(`Pot odds: ${(potOdds * 100).toFixed(0)}%.`);
    }

    if (draws.totalOuts > 0) {
      const drawTypes: string[] = [];
      if (draws.flushDraw) drawTypes.push('flush draw');
      if (draws.oesD) drawTypes.push('OESD');
      if (draws.gutshot && !draws.oesD) drawTypes.push('gutshot');
      if (draws.backdoorFlush) drawTypes.push('backdoor flush');
      if (draws.backdoorStraight) drawTypes.push('backdoor straight');
      if (drawTypes.length > 0) {
        parts.push(`Draws: ${drawTypes.join(', ')} (${draws.totalOuts} outs).`);
      }
    }
  }

  if (ctx.toCall > 0) {
    parts.push(`Facing bet of ${ctx.toCall}.`);
  }

  parts.push(
    `EV: fold=${evByAction.fold.toFixed(2)}, call=${evByAction.call.toFixed(2)}, raise=${evByAction.raise.toFixed(2)}.`,
  );
  parts.push(`Optimal: ${optimalAction}.`);

  return parts.join(' ');
}

/**
 * Normalizes EV values into frequency probabilities.
 * Higher EV actions get higher frequencies.
 */
function computeFrequencies(
  evByAction: { fold: number; call: number; raise: number },
  toCall: number,
  posCategory: 'early' | 'middle' | 'late' | 'blinds',
): { fold: number; call: number; raise: number } {
  // Shift EVs so the minimum is 0
  const evs = [evByAction.fold, evByAction.call, evByAction.raise];
  const minEv = Math.min(...evs);
  const shifted = evs.map((ev) => Math.max(0, ev - minEv));
  const total = shifted.reduce((a, b) => a + b, 0);

  let freqs: { fold: number; call: number; raise: number };

  if (total === 0) {
    // All EVs equal — default to check/fold
    if (toCall === 0) {
      freqs = { fold: 0, call: 0.5, raise: 0.5 }; // check/bet split
    } else {
      freqs = { fold: 0.5, call: 0.3, raise: 0.2 };
    }
  } else {
    freqs = {
      fold: shifted[0] / total,
      call: shifted[1] / total,
      raise: shifted[2] / total,
    };
  }

  // When in position, ensure minimum 5% for non-fold actions
  if (posCategory === 'late' && toCall > 0) {
    freqs.call = Math.max(0.05, freqs.call);
    freqs.raise = Math.max(0.05, freqs.raise);
    // Re-normalize
    const sum = freqs.fold + freqs.call + freqs.raise;
    freqs.fold /= sum;
    freqs.call /= sum;
    freqs.raise /= sum;
  }

  return freqs;
}

// ── Preflop Decision ────────────────────────────────────────────────

function evaluatePreflop(ctx: DecisionContext): DecisionResult {
  const hand = toHandCombo(ctx.holeCards);
  const ranges = getPositionRanges(ctx.position);
  const scenario = getPreflopScenario(ctx);
  const posCategory = getPositionCategory(ctx.position);

  // Determine range membership and equity estimate
  const inFourBet = isInRange(hand, ranges.fourBet);
  const inThreeBet = isInRange(hand, ranges.threeBet);
  const inOpenRaise = isInRange(hand, ranges.openRaise);
  const inCallOpen = isInRange(hand, ranges.callOpen);
  const inCall3Bet = isInRange(hand, ranges.call3Bet);

  let equity: number;
  if (inFourBet) {
    equity = 0.70;
  } else if (inThreeBet) {
    equity = 0.60;
  } else if (inOpenRaise) {
    equity = 0.45;
  } else if (inCallOpen || inCall3Bet) {
    equity = 0.40;
  } else {
    equity = 0.25;
  }

  // Calculate pot odds
  const potOdds = ctx.toCall > 0 ? ctx.toCall / (ctx.pot + ctx.toCall) : 0;

  // SPR
  const spr = ctx.pot > 0 ? ctx.stack / ctx.pot : 100;

  // Implied odds: adjust pot odds down by SPR factor
  const impliedOdds = potOdds > 0 ? potOdds * Math.min(1, spr / 10) : 0;

  // EV calculations
  const evFold = 0;
  const evCall =
    ctx.toCall > 0
      ? equity * (ctx.pot + ctx.toCall) - (1 - equity) * ctx.toCall
      : 0;

  // Raise sizing: 2.5-3x the current bet or 2.5 BB if opening
  let raiseSize: number;
  if (scenario === 'unopened') {
    raiseSize = Math.min(ctx.bigBlind * 2.5, ctx.stack);
  } else if (scenario === 'facingRaise') {
    raiseSize = Math.min(ctx.toCall * 3, ctx.stack);
  } else {
    raiseSize = Math.min(ctx.toCall * 2.5, ctx.stack);
  }

  // Estimate fold equity for preflop raise
  const preflopFoldEquity = scenario === 'unopened' ? 0.5 : 0.35;
  const evRaise =
    preflopFoldEquity * ctx.pot +
    (1 - preflopFoldEquity) *
      (equity * (ctx.pot + raiseSize) - (1 - equity) * raiseSize);

  const evByAction = { fold: evFold, call: evCall, raise: evRaise };

  // Determine optimal action based on scenario and range membership
  let optimalAction: ActionType;
  let optimalAmount: number | undefined;

  if (scenario === 'unopened') {
    if (inOpenRaise || inThreeBet || inFourBet) {
      optimalAction = ctx.toCall > 0 ? 'raise' : 'bet';
      optimalAmount = Math.min(raiseSize, ctx.stack);
    } else if (ctx.toCall === 0) {
      // In BB with no raise — can check
      optimalAction = 'check';
    } else {
      optimalAction = 'fold';
    }
  } else if (scenario === 'facingRaise') {
    if (inThreeBet || inFourBet) {
      optimalAction = 'raise';
      optimalAmount = Math.min(raiseSize, ctx.stack);
    } else if (inCallOpen || inOpenRaise || inCall3Bet) {
      optimalAction = 'call';
    } else {
      optimalAction = 'fold';
    }
  } else {
    // facing 3-bet
    if (inFourBet) {
      optimalAction = 'raise';
      optimalAmount = Math.min(raiseSize, ctx.stack);
    } else if (inCall3Bet || inThreeBet) {
      optimalAction = 'call';
    } else {
      optimalAction = 'fold';
    }
  }

  // Override with EV-based decision if EV disagrees strongly
  // (e.g., if range says fold but EV says call is positive)
  if (optimalAction === 'fold' && evCall > 0 && ctx.toCall > 0) {
    // Keep fold — trust range-based decisions preflop
  }

  // Cap raise at stack
  if (optimalAmount !== undefined) {
    optimalAmount = Math.min(optimalAmount, ctx.stack);
  }

  // Empty draws and neutral board for preflop
  const draws: DrawInfo = {
    flushDraw: false,
    flushDrawOuts: 0,
    oesD: false,
    gutshot: false,
    straightDrawOuts: 0,
    backdoorFlush: false,
    backdoorStraight: false,
    totalOuts: 0,
    drawEquity: 0,
  };

  const boardTexture = analyzeBoard([]);

  const frequencies = computeFrequencies(evByAction, ctx.toCall, posCategory);

  const reasoning = generateReasoning(
    ctx,
    optimalAction,
    equity,
    potOdds,
    draws,
    boardTexture,
    evByAction,
    true,
  );

  return {
    optimalAction,
    optimalAmount,
    frequencies,
    reasoning,
    equity,
    potOdds,
    impliedOdds,
    spr,
    draws,
    boardTexture,
    evByAction,
  };
}

// ── Postflop Decision ───────────────────────────────────────────────

function evaluatePostflop(ctx: DecisionContext): DecisionResult {
  const posCategory = getPositionCategory(ctx.position);

  // Calculate equity via Monte Carlo
  const numOpponents = Math.max(1, ctx.numActivePlayers - 1);
  const equityResult = calculateEquity(
    ctx.holeCards,
    ctx.communityCards,
    numOpponents,
  );
  const equity = equityResult.equity;

  // Detect draws
  const draws = detectDraws(ctx.holeCards, ctx.communityCards);

  // Analyze board
  const boardTexture = analyzeBoard(ctx.communityCards);

  // Pot odds
  const potOdds = ctx.toCall > 0 ? ctx.toCall / (ctx.pot + ctx.toCall) : 0;

  // SPR (before calling)
  const spr = ctx.pot > 0 ? ctx.stack / ctx.pot : 100;

  // Implied odds: pot odds adjusted by SPR (lower SPR = worse implied odds)
  const impliedOdds =
    potOdds > 0 ? potOdds * Math.max(0.2, Math.min(1, spr / 10)) : 0;

  // EV calculations
  const evFold = 0;
  const evCall =
    ctx.toCall > 0
      ? equity * (ctx.pot + ctx.toCall) - (1 - equity) * ctx.toCall
      : equity * ctx.pot; // check has no cost but captures existing pot equity

  // Fold equity for raise/bet
  const foldEquity = estimateFoldEquity(ctx, boardTexture);

  // Bet/raise sizing based on board texture
  const sizingFraction = getBetSizingFraction(boardTexture);
  let raiseSize = Math.max(ctx.bigBlind, Math.round(ctx.pot * sizingFraction));

  // If facing a bet, raise size is relative to the current bet
  if (ctx.toCall > 0) {
    raiseSize = Math.max(ctx.toCall * 2, raiseSize);
  }

  // Cap at stack
  raiseSize = Math.min(raiseSize, ctx.stack);

  // EV(raise) includes fold equity
  const evRaise =
    foldEquity * ctx.pot +
    (1 - foldEquity) *
      (equity * (ctx.pot + raiseSize) - (1 - equity) * raiseSize);

  const evByAction = { fold: evFold, call: evCall, raise: evRaise };

  // Determine optimal action
  let optimalAction: ActionType;
  let optimalAmount: number | undefined;

  if (ctx.toCall > 0) {
    // Facing a bet/raise
    if (evCall < 0 && evRaise < 0) {
      // Both negative EV — fold
      optimalAction = 'fold';
    } else if (draws.totalOuts >= 8 && evCall >= 0) {
      // Strong draw — at minimum call, consider raising
      if (evRaise > evCall) {
        optimalAction = 'raise';
        optimalAmount = raiseSize;
      } else {
        optimalAction = 'call';
      }
    } else if (evRaise > evCall && evRaise > 0) {
      optimalAction = 'raise';
      optimalAmount = raiseSize;
    } else if (evCall >= 0) {
      optimalAction = 'call';
    } else {
      optimalAction = 'fold';
    }
  } else {
    // No bet to face — can check or bet
    if (equity < 0.3 && draws.totalOuts < 8) {
      // Weak hand, no strong draws — check
      optimalAction = 'check';
    } else if (evRaise > evCall) {
      optimalAction = 'bet';
      optimalAmount = raiseSize;
    } else {
      optimalAction = 'check';
    }
  }

  // Handle all-in: if stack < min bet, go all-in
  if (
    optimalAmount !== undefined &&
    ctx.stack <= ctx.bigBlind
  ) {
    optimalAmount = ctx.stack;
  }

  // Cap at stack
  if (optimalAmount !== undefined) {
    optimalAmount = Math.min(optimalAmount, ctx.stack);
  }

  const frequencies = computeFrequencies(evByAction, ctx.toCall, posCategory);

  const reasoning = generateReasoning(
    ctx,
    optimalAction,
    equity,
    potOdds,
    draws,
    boardTexture,
    evByAction,
    false,
  );

  return {
    optimalAction,
    optimalAmount,
    frequencies,
    reasoning,
    equity,
    potOdds,
    impliedOdds,
    spr,
    draws,
    boardTexture,
    evByAction,
  };
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Evaluates a poker decision and returns the optimal play with reasoning.
 *
 * This is the core function consumed by both AI and analysis.
 *
 * - Preflop: uses range-based logic with approximate equity
 * - Postflop: uses Monte Carlo equity, draw detection, and board analysis
 */
export function evaluateDecision(ctx: DecisionContext): DecisionResult {
  if (ctx.round === 'preflop') {
    return evaluatePreflop(ctx);
  }
  return evaluatePostflop(ctx);
}
