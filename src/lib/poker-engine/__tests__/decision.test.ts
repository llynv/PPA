import { describe, it, expect } from 'vitest';
import { evaluateDecision } from '../decision';
import type { Card, Rank, Suit, DecisionContext, DecisionResult } from '../../../types/poker';

// ── Helpers ─────────────────────────────────────────────────────────

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const h = (rank: Rank): Card => card(rank, 'hearts');
const d = (rank: Rank): Card => card(rank, 'diamonds');
const c = (rank: Rank): Card => card(rank, 'clubs');
const s = (rank: Rank): Card => card(rank, 'spades');

/** Creates a base DecisionContext that can be overridden. */
function makeCtx(overrides: Partial<DecisionContext>): DecisionContext {
  return {
    holeCards: [s('A'), h('A')],
    communityCards: [],
    position: 'UTG',
    round: 'preflop',
    pot: 15, // SB+BB at 5/10
    toCall: 10,
    currentBet: 10,
    stack: 1000,
    bigBlind: 10,
    numActivePlayers: 6,
    numPlayersInHand: 6,
    isFirstToAct: true,
    facingRaise: false,
    actionHistory: [],
    ...overrides,
  };
}

// ── Preflop Tests ───────────────────────────────────────────────────

describe('evaluateDecision – preflop', () => {
  // 1. Strong hand (AA) from UTG – should recommend raise
  describe('AA from UTG (unopened)', () => {
    it('should recommend raise/bet with high equity', () => {
      const ctx = makeCtx({
        holeCards: [s('A'), h('A')],
        position: 'UTG',
        round: 'preflop',
        pot: 15,
        toCall: 10,
        currentBet: 10,
        facingRaise: false,
      });

      const result = evaluateDecision(ctx);

      expect(['bet', 'raise']).toContain(result.optimalAction);
      expect(result.equity).toBeGreaterThanOrEqual(0.60);
      expect(result.optimalAmount).toBeGreaterThan(0);
    });
  });

  // 2. Weak hand (72o) from UTG – should recommend fold
  describe('72o from UTG (unopened)', () => {
    it('should recommend fold', () => {
      const ctx = makeCtx({
        holeCards: [s('7'), h('2')],
        position: 'UTG',
        round: 'preflop',
        pot: 15,
        toCall: 10,
        currentBet: 10,
        facingRaise: false,
      });

      const result = evaluateDecision(ctx);

      expect(result.optimalAction).toBe('fold');
      expect(result.equity).toBeLessThanOrEqual(0.30);
    });
  });

  // 3. Playable hand (AKs) facing raise – should recommend raise (3-bet) or call
  describe('AKs facing a raise', () => {
    it('should recommend raise or call', () => {
      const ctx = makeCtx({
        holeCards: [s('A'), s('K')],
        position: 'CO',
        round: 'preflop',
        pot: 35, // blinds + open raise
        toCall: 25,
        currentBet: 25,
        facingRaise: true,
        raiserPosition: 'UTG',
        actionHistory: [
          {
            playerId: 'utg',
            type: 'raise',
            amount: 25,
            round: 'preflop',
            timestamp: 1,
          },
        ],
      });

      const result = evaluateDecision(ctx);

      expect(['raise', 'call']).toContain(result.optimalAction);
      expect(result.equity).toBeGreaterThanOrEqual(0.55);
    });
  });

  // BB with no raise can check
  describe('BB with no raise (unopened, toCall = 0)', () => {
    it('should recommend check with weak hand', () => {
      const ctx = makeCtx({
        holeCards: [s('7'), h('2')],
        position: 'BB',
        round: 'preflop',
        pot: 15,
        toCall: 0,
        currentBet: 10,
        facingRaise: false,
      });

      const result = evaluateDecision(ctx);

      expect(result.optimalAction).toBe('check');
    });
  });
});

// ── Postflop Tests ──────────────────────────────────────────────────

describe('evaluateDecision – postflop', () => {
  // 4. Strong hand on dry board – should recommend bet for value
  describe('strong hand on dry board, no bet to face', () => {
    it('should recommend bet', () => {
      // AA on a K-7-2 rainbow dry board
      const ctx = makeCtx({
        holeCards: [s('A'), h('A')],
        communityCards: [d('K'), c('7'), s('2')],
        position: 'BTN',
        round: 'flop',
        pot: 50,
        toCall: 0,
        currentBet: 0,
        stack: 1000,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });

      const result = evaluateDecision(ctx);

      // Strong hand should bet for value
      expect(result.optimalAction).toBe('bet');
      expect(result.optimalAmount).toBeGreaterThan(0);
      expect(result.equity).toBeGreaterThan(0.5);
    });
  });

  // 5. Strong draw facing bet – should recommend call
  describe('strong draw facing bet (flush draw + OESD)', () => {
    it('should recommend call or raise', () => {
      // 9h 8h on a 7h 6h 2c board — flush draw + OESD
      const ctx = makeCtx({
        holeCards: [h('9'), h('8')],
        communityCards: [h('7'), h('6'), c('2')],
        position: 'BTN',
        round: 'flop',
        pot: 80,
        toCall: 30,
        currentBet: 30,
        stack: 500,
        numActivePlayers: 2,
        numPlayersInHand: 2,
        facingRaise: true,
      });

      const result = evaluateDecision(ctx);

      // With a strong draw, should at least call
      expect(['call', 'raise']).toContain(result.optimalAction);
      expect(result.draws.totalOuts).toBeGreaterThan(0);
    });
  });

  // 6. Weak hand facing bet – should recommend fold
  describe('weak hand facing bet on wet board', () => {
    it('should recommend fold when EV is negative', () => {
      // 7s 2d on Ks Qd Jc — no connection, no draws
      const ctx = makeCtx({
        holeCards: [s('7'), d('2')],
        communityCards: [s('K'), d('Q'), c('J')],
        position: 'UTG',
        round: 'flop',
        pot: 100,
        toCall: 75,
        currentBet: 75,
        stack: 500,
        numActivePlayers: 3,
        numPlayersInHand: 3,
        facingRaise: true,
      });

      const result = evaluateDecision(ctx);

      expect(result.optimalAction).toBe('fold');
    });
  });

  // 7. No bet to face with strong hand – should recommend bet
  describe('no bet to face with strong hand', () => {
    it('should recommend bet', () => {
      // KK on a K-4-3 rainbow board (top set)
      const ctx = makeCtx({
        holeCards: [s('K'), h('K')],
        communityCards: [d('K'), c('4'), s('3')],
        position: 'CO',
        round: 'flop',
        pot: 60,
        toCall: 0,
        currentBet: 0,
        stack: 800,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });

      const result = evaluateDecision(ctx);

      expect(result.optimalAction).toBe('bet');
      expect(result.optimalAmount).toBeGreaterThan(0);
    });
  });

  // 8. No bet to face with weak hand, no draws – should recommend check
  describe('no bet to face with weak hand and no draws', () => {
    it('should recommend check', () => {
      // 3s 2d on As Kd Qh board — complete air, no draws
      const ctx = makeCtx({
        holeCards: [s('3'), d('2')],
        communityCards: [s('A'), d('K'), h('Q')],
        position: 'UTG',
        round: 'flop',
        pot: 40,
        toCall: 0,
        currentBet: 0,
        stack: 500,
        numActivePlayers: 3,
        numPlayersInHand: 3,
      });

      const result = evaluateDecision(ctx);

      expect(result.optimalAction).toBe('check');
    });
  });
});

// ── Structure & Properties Tests ────────────────────────────────────

describe('evaluateDecision – result structure', () => {
  // 9. Result structure: all DecisionResult fields populated
  it('should have all DecisionResult fields populated', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('K')],
      communityCards: [d('Q'), c('J'), s('10')],
      position: 'BTN',
      round: 'flop',
      pot: 50,
      toCall: 0,
      currentBet: 0,
      stack: 1000,
      numActivePlayers: 2,
      numPlayersInHand: 2,
    });

    const result = evaluateDecision(ctx);

    // Check all top-level fields exist
    expect(result).toHaveProperty('optimalAction');
    expect(result).toHaveProperty('frequencies');
    expect(result).toHaveProperty('reasoning');
    expect(result).toHaveProperty('equity');
    expect(result).toHaveProperty('potOdds');
    expect(result).toHaveProperty('impliedOdds');
    expect(result).toHaveProperty('spr');
    expect(result).toHaveProperty('draws');
    expect(result).toHaveProperty('boardTexture');
    expect(result).toHaveProperty('evByAction');

    // Check types
    expect(typeof result.optimalAction).toBe('string');
    expect(typeof result.reasoning).toBe('string');
    expect(typeof result.equity).toBe('number');
    expect(typeof result.potOdds).toBe('number');
    expect(typeof result.impliedOdds).toBe('number');
    expect(typeof result.spr).toBe('number');

    // Check sub-objects
    expect(result.frequencies).toHaveProperty('fold');
    expect(result.frequencies).toHaveProperty('call');
    expect(result.frequencies).toHaveProperty('raise');
    expect(result.evByAction).toHaveProperty('fold');
    expect(result.evByAction).toHaveProperty('call');
    expect(result.evByAction).toHaveProperty('raise');
    expect(result.draws).toHaveProperty('totalOuts');
    expect(result.boardTexture).toHaveProperty('wetness');

    // Equity should be in [0, 1]
    expect(result.equity).toBeGreaterThanOrEqual(0);
    expect(result.equity).toBeLessThanOrEqual(1);
  });

  // 10. Reasoning string: non-empty, contains relevant info
  describe('reasoning string', () => {
    it('should be non-empty for preflop', () => {
      const ctx = makeCtx({
        holeCards: [s('A'), h('A')],
        round: 'preflop',
      });

      const result = evaluateDecision(ctx);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('Preflop');
      expect(result.reasoning).toContain('equity');
    });

    it('should be non-empty for postflop and contain board info', () => {
      const ctx = makeCtx({
        holeCards: [s('A'), h('A')],
        communityCards: [d('K'), c('7'), s('2')],
        round: 'flop',
        pot: 50,
        toCall: 0,
        currentBet: 0,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });

      const result = evaluateDecision(ctx);

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning).toContain('Flop');
      expect(result.reasoning).toContain('Board');
    });
  });

  // 11. EV by action: fold EV is always 0
  describe('EV by action properties', () => {
    it('fold EV should always be 0', () => {
      // Test preflop
      const preflopCtx = makeCtx({
        holeCards: [s('A'), h('K')],
        round: 'preflop',
      });
      const preflopResult = evaluateDecision(preflopCtx);
      expect(preflopResult.evByAction.fold).toBe(0);

      // Test postflop
      const postflopCtx = makeCtx({
        holeCards: [s('A'), h('K')],
        communityCards: [d('Q'), c('J'), s('2')],
        round: 'flop',
        pot: 50,
        toCall: 20,
        currentBet: 20,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });
      const postflopResult = evaluateDecision(postflopCtx);
      expect(postflopResult.evByAction.fold).toBe(0);
    });

    it('call EV depends on equity vs pot odds', () => {
      // High equity hand facing small bet should have positive call EV
      const ctx = makeCtx({
        holeCards: [s('A'), h('A')],
        communityCards: [d('K'), c('7'), s('2')],
        round: 'flop',
        pot: 100,
        toCall: 10,
        currentBet: 10,
        numActivePlayers: 2,
        numPlayersInHand: 2,
        facingRaise: true,
      });

      const result = evaluateDecision(ctx);

      // AA on K-7-2 facing a small bet should have positive call EV
      expect(result.evByAction.call).toBeGreaterThan(0);
    });
  });

  // 12. Bet sizing varies by board texture
  describe('bet sizing by board texture', () => {
    it('dry board should produce smaller bet sizing', () => {
      // K-7-2 rainbow is dry
      const dryCtx = makeCtx({
        holeCards: [s('A'), h('A')],
        communityCards: [d('K'), c('7'), h('2')],
        position: 'BTN',
        round: 'flop',
        pot: 100,
        toCall: 0,
        currentBet: 0,
        stack: 1000,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });

      // Q-J-10 two-tone is wet/very-wet
      const wetCtx = makeCtx({
        holeCards: [s('A'), h('A')],
        communityCards: [h('Q'), h('J'), s('10')],
        position: 'BTN',
        round: 'flop',
        pot: 100,
        toCall: 0,
        currentBet: 0,
        stack: 1000,
        numActivePlayers: 2,
        numPlayersInHand: 2,
      });

      const dryResult = evaluateDecision(dryCtx);
      const wetResult = evaluateDecision(wetCtx);

      // Both should bet with AA
      expect(dryResult.optimalAction).toBe('bet');
      expect(wetResult.optimalAction).toBe('bet');

      // Wet board should have larger bet
      if (dryResult.optimalAmount && wetResult.optimalAmount) {
        expect(wetResult.optimalAmount).toBeGreaterThanOrEqual(
          dryResult.optimalAmount,
        );
      }

      // Board textures should differ
      expect(dryResult.boardTexture.wetness).not.toBe(
        wetResult.boardTexture.wetness,
      );
    });
  });
});

// ── Pot odds and SPR ────────────────────────────────────────────────

describe('evaluateDecision – pot odds and SPR', () => {
  it('should calculate pot odds correctly when facing a bet', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('A')],
      communityCards: [d('K'), c('7'), s('2')],
      round: 'flop',
      pot: 100,
      toCall: 50,
      currentBet: 50,
      stack: 500,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      facingRaise: true,
    });

    const result = evaluateDecision(ctx);

    // potOdds = 50 / (100 + 50) = 0.333...
    expect(result.potOdds).toBeCloseTo(1 / 3, 2);
  });

  it('should have potOdds of 0 when no bet to call', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('A')],
      communityCards: [d('K'), c('7'), s('2')],
      round: 'flop',
      pot: 100,
      toCall: 0,
      currentBet: 0,
      stack: 500,
      numActivePlayers: 2,
      numPlayersInHand: 2,
    });

    const result = evaluateDecision(ctx);
    expect(result.potOdds).toBe(0);
  });

  it('should calculate SPR as stack / pot', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('A')],
      communityCards: [d('K'), c('7'), s('2')],
      round: 'flop',
      pot: 100,
      toCall: 0,
      currentBet: 0,
      stack: 500,
      numActivePlayers: 2,
      numPlayersInHand: 2,
    });

    const result = evaluateDecision(ctx);

    // SPR = 500 / 100 = 5
    expect(result.spr).toBe(5);
  });
});

// ── Action type correctness ─────────────────────────────────────────

describe('evaluateDecision – action types', () => {
  it('should use bet/check when toCall is 0 (not raise/fold)', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('A')],
      communityCards: [d('K'), c('7'), s('2')],
      round: 'flop',
      pot: 50,
      toCall: 0,
      currentBet: 0,
      stack: 1000,
      numActivePlayers: 2,
      numPlayersInHand: 2,
    });

    const result = evaluateDecision(ctx);

    // When toCall is 0, actions should be 'bet' or 'check', not 'raise' or 'fold'
    expect(['bet', 'check']).toContain(result.optimalAction);
  });

  it('should use call/raise/fold when toCall > 0', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('K')],
      communityCards: [d('Q'), c('J'), s('2')],
      round: 'flop',
      pot: 80,
      toCall: 40,
      currentBet: 40,
      stack: 500,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      facingRaise: true,
    });

    const result = evaluateDecision(ctx);

    expect(['call', 'raise', 'fold']).toContain(result.optimalAction);
  });
});

// ── Frequencies ─────────────────────────────────────────────────────

describe('evaluateDecision – frequencies', () => {
  it('frequencies should sum to approximately 1', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('K')],
      communityCards: [d('Q'), c('J'), s('2')],
      round: 'flop',
      pot: 50,
      toCall: 20,
      currentBet: 20,
      stack: 500,
      numActivePlayers: 2,
      numPlayersInHand: 2,
    });

    const result = evaluateDecision(ctx);

    const sum =
      result.frequencies.fold +
      result.frequencies.call +
      result.frequencies.raise;
    expect(sum).toBeCloseTo(1, 1);
  });

  it('each frequency should be between 0 and 1', () => {
    const ctx = makeCtx({
      holeCards: [s('A'), h('A')],
      round: 'preflop',
    });

    const result = evaluateDecision(ctx);

    expect(result.frequencies.fold).toBeGreaterThanOrEqual(0);
    expect(result.frequencies.fold).toBeLessThanOrEqual(1);
    expect(result.frequencies.call).toBeGreaterThanOrEqual(0);
    expect(result.frequencies.call).toBeLessThanOrEqual(1);
    expect(result.frequencies.raise).toBeGreaterThanOrEqual(0);
    expect(result.frequencies.raise).toBeLessThanOrEqual(1);
  });
});
