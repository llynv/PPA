import type { DrillSpot } from '../types/drill';
import type { Card, PlayerAction } from '../types/poker';

// ── Helpers ─────────────────────────────────────────────────────────

/** Shorthand card constructor */
function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

/** Create a sequential PlayerAction with auto-incrementing timestamps */
function action(
  playerId: string,
  type: PlayerAction['type'],
  round: PlayerAction['round'],
  amount?: number,
  ts?: number,
): PlayerAction {
  return {
    playerId,
    type,
    amount,
    round,
    timestamp: ts ?? 0,
  };
}

/** Assign sequential timestamps to an array of actions */
function withTimestamps(actions: PlayerAction[]): PlayerAction[] {
  return actions.map((a, i) => ({ ...a, timestamp: i + 1 }));
}

// ── Spot Library ────────────────────────────────────────────────────

export const DRILL_SPOTS: DrillSpot[] = [
  // ────────────────────────────────────────────────────────────────
  // PREFLOP SPOTS
  // ────────────────────────────────────────────────────────────────

  {
    id: 'preflop-open-utg-aces',
    name: 'UTG Open with Aces',
    category: 'preflop',
    difficulty: 1,
    description: 'You are UTG with pocket aces. Action folds to you. Open raise for value.',
    concept: 'open_raise',
    tags: ['preflop', 'open-raise', 'premium', 'UTG'],

    heroCards: [c('A', 'spades'), c('A', 'hearts')],
    communityCards: [],
    potSize: 15, // SB(5) + BB(10)
    heroStack: 1000,
    villainStack: 1000,
    heroPosition: 'UTG',
    villainPosition: 'BB',
    previousActions: 'Blinds posted. Action on hero.',

    decisionContext: {
      holeCards: [c('A', 'spades'), c('A', 'hearts')],
      communityCards: [],
      position: 'UTG',
      round: 'preflop',
      pot: 15,
      toCall: 10,
      currentBet: 0,
      stack: 1000,
      bigBlind: 10,
      numActivePlayers: 6,
      numPlayersInHand: 6,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
      ]),
    },
  },

  {
    id: 'preflop-3bet-btn-vs-co',
    name: '3-Bet BTN vs CO Open',
    category: 'preflop',
    difficulty: 2,
    description: 'CO opens to 25. You are on the BTN with AKs. Consider a 3-bet.',
    concept: 'three_bet',
    tags: ['preflop', '3-bet', 'position', 'BTN'],

    heroCards: [c('A', 'spades'), c('K', 'spades')],
    communityCards: [],
    potSize: 40, // SB(5) + BB(10) + CO open(25)
    heroStack: 975,
    villainStack: 975,
    heroPosition: 'BTN',
    villainPosition: 'CO',
    previousActions: 'CO opens to 25. Action on hero (BTN).',

    decisionContext: {
      holeCards: [c('A', 'spades'), c('K', 'spades')],
      communityCards: [],
      position: 'BTN',
      round: 'preflop',
      pot: 40,
      toCall: 25,
      currentBet: 25,
      stack: 975,
      bigBlind: 10,
      numActivePlayers: 4, // CO, BTN, SB, BB
      numPlayersInHand: 4,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'CO',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
      ]),
    },
  },

  {
    id: 'preflop-cold-call-suited-connectors',
    name: 'Cold Call with Suited Connectors',
    category: 'preflop',
    difficulty: 2,
    description: 'CO opens to 25. You are on the BTN with 9♠8♠. Suited connectors in position.',
    concept: 'cold_call',
    tags: ['preflop', 'cold-call', 'suited-connectors', 'implied-odds'],

    heroCards: [c('9', 'spades'), c('8', 'spades')],
    communityCards: [],
    potSize: 40, // SB(5) + BB(10) + CO open(25)
    heroStack: 975,
    villainStack: 975,
    heroPosition: 'BTN',
    villainPosition: 'CO',
    previousActions: 'CO opens to 25. Action on hero (BTN).',

    decisionContext: {
      holeCards: [c('9', 'spades'), c('8', 'spades')],
      communityCards: [],
      position: 'BTN',
      round: 'preflop',
      pot: 40,
      toCall: 25,
      currentBet: 25,
      stack: 975,
      bigBlind: 10,
      numActivePlayers: 4,
      numPlayersInHand: 4,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'CO',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // FLOP SPOTS
  // ────────────────────────────────────────────────────────────────

  {
    id: 'flop-cbet-value-tptk',
    name: 'C-Bet with Top Pair Top Kicker',
    category: 'flop',
    difficulty: 1,
    description: 'You opened from CO, BB called. Flop is K♠7♦2♣ — dry board. You have AKo for TPTK.',
    concept: 'cbet_value',
    tags: ['flop', 'cbet', 'value', 'dry-board', 'TPTK'],

    heroCards: [c('A', 'hearts'), c('K', 'clubs')],
    communityCards: [c('K', 'spades'), c('7', 'diamonds'), c('2', 'clubs')],
    potSize: 50, // preflop raise(25) + BB call(25)
    heroStack: 950,
    villainStack: 950,
    heroPosition: 'CO',
    villainPosition: 'BB',
    previousActions: 'Hero opened CO to 25, BB called. Flop K♠7♦2♣. Hero first to act.',

    decisionContext: {
      holeCards: [c('A', 'hearts'), c('K', 'clubs')],
      communityCards: [c('K', 'spades'), c('7', 'diamonds'), c('2', 'clubs')],
      position: 'CO',
      round: 'flop',
      pot: 50,
      toCall: 0,
      currentBet: 0,
      stack: 950,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain', 'call', 'preflop', 25),
      ]),
    },
  },

  {
    id: 'flop-cbet-bluff-air',
    name: 'C-Bet Bluff with Air',
    category: 'flop',
    difficulty: 2,
    description: 'You opened BTN, BB called. Flop is A♠8♦3♣ — dry ace-high board. You have QJo — no pair but good bluffing texture.',
    concept: 'cbet_bluff',
    tags: ['flop', 'cbet', 'bluff', 'dry-board', 'air'],

    heroCards: [c('Q', 'hearts'), c('J', 'diamonds')],
    communityCards: [c('A', 'spades'), c('8', 'diamonds'), c('3', 'clubs')],
    potSize: 50,
    heroStack: 950,
    villainStack: 950,
    heroPosition: 'BTN',
    villainPosition: 'BB',
    previousActions: 'Hero opened BTN to 25, BB called. Flop A♠8♦3♣. Hero acts first in position.',

    decisionContext: {
      holeCards: [c('Q', 'hearts'), c('J', 'diamonds')],
      communityCards: [c('A', 'spades'), c('8', 'diamonds'), c('3', 'clubs')],
      position: 'BTN',
      round: 'flop',
      pot: 50,
      toCall: 0,
      currentBet: 0,
      stack: 950,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain', 'call', 'preflop', 25),
      ]),
    },
  },

  {
    id: 'flop-check-raise-set',
    name: 'Check-Raise with a Set',
    category: 'flop',
    difficulty: 3,
    description: 'BB vs BTN single-raised pot. Flop is T♠7♥4♦. You have 77 for a set. Villain c-bets 20 into 50.',
    concept: 'check_raise',
    tags: ['flop', 'check-raise', 'set', 'value', 'trapping'],

    heroCards: [c('7', 'spades'), c('7', 'clubs')],
    communityCards: [c('10', 'spades'), c('7', 'hearts'), c('4', 'diamonds')],
    potSize: 70, // 50 pot + villain cbet 20
    heroStack: 930,
    villainStack: 930,
    heroPosition: 'BB',
    villainPosition: 'BTN',
    previousActions: 'BTN opened to 25, hero called from BB. Flop T♠7♥4♦. BTN c-bets 20.',

    decisionContext: {
      holeCards: [c('7', 'spades'), c('7', 'clubs')],
      communityCards: [c('10', 'spades'), c('7', 'hearts'), c('4', 'diamonds')],
      position: 'BB',
      round: 'flop',
      pot: 70,
      toCall: 20,
      currentBet: 20,
      stack: 930,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'BTN',
      actionHistory: withTimestamps([
        action('hero', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('villain', 'raise', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain', 'bet', 'flop', 20),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // TURN SPOTS
  // ────────────────────────────────────────────────────────────────

  {
    id: 'turn-barrel-overpair',
    name: 'Turn Barrel with Overpair',
    category: 'turn',
    difficulty: 2,
    description: 'You c-bet flop with QQ on 9♠6♦2♣, villain called. Turn 4♥ — blank. Continue for value.',
    concept: 'barrel',
    tags: ['turn', 'barrel', 'value', 'overpair', 'continuation'],

    heroCards: [c('Q', 'spades'), c('Q', 'hearts')],
    communityCards: [c('9', 'spades'), c('6', 'diamonds'), c('2', 'clubs'), c('4', 'hearts')],
    potSize: 120, // preflop pot 50, flop cbet 35 + call 35 = 120
    heroStack: 880,
    villainStack: 880,
    heroPosition: 'CO',
    villainPosition: 'BB',
    previousActions: 'Hero opened CO, BB called. Flop 9♠6♦2♣. Hero bet 35, villain called. Turn 4♥.',

    decisionContext: {
      holeCards: [c('Q', 'spades'), c('Q', 'hearts')],
      communityCards: [c('9', 'spades'), c('6', 'diamonds'), c('2', 'clubs'), c('4', 'hearts')],
      position: 'CO',
      round: 'turn',
      pot: 120,
      toCall: 0,
      currentBet: 0,
      stack: 880,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain', 'call', 'preflop', 25),
        action('hero', 'bet', 'flop', 35),
        action('villain', 'call', 'flop', 35),
      ]),
    },
  },

  {
    id: 'turn-pot-control-medium',
    name: 'Pot Control with Medium Hand',
    category: 'turn',
    difficulty: 2,
    description: 'You have A♠T♠ on J♠8♦3♣5♥. Middle pair with overcard. Villain checked flop. Turn brings another blank.',
    concept: 'pot_control',
    tags: ['turn', 'pot-control', 'medium-hand', 'way-ahead-way-behind'],

    heroCards: [c('A', 'spades'), c('10', 'spades')],
    communityCards: [c('J', 'spades'), c('8', 'diamonds'), c('3', 'clubs'), c('5', 'hearts')],
    potSize: 50, // preflop pot 50, both checked flop
    heroStack: 950,
    villainStack: 950,
    heroPosition: 'BTN',
    villainPosition: 'BB',
    previousActions: 'Hero opened BTN, BB called. Flop J♠8♦3♣ — both checked. Turn 5♥.',

    decisionContext: {
      holeCards: [c('A', 'spades'), c('10', 'spades')],
      communityCards: [c('J', 'spades'), c('8', 'diamonds'), c('3', 'clubs'), c('5', 'hearts')],
      position: 'BTN',
      round: 'turn',
      pot: 50,
      toCall: 0,
      currentBet: 0,
      stack: 950,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain', 'call', 'preflop', 25),
        action('villain', 'check', 'flop'),
        action('hero', 'check', 'flop'),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // RIVER SPOTS
  // ────────────────────────────────────────────────────────────────

  {
    id: 'river-thin-value-two-pair',
    name: 'Thin Value Bet with Two Pair',
    category: 'river',
    difficulty: 3,
    description: 'You have K♠J♣ on K♦J♠8♥4♣2♦. Two pair on a relatively safe board. Extract thin value on river.',
    concept: 'value_bet_thin',
    tags: ['river', 'thin-value', 'two-pair', 'bet-sizing'],

    heroCards: [c('K', 'spades'), c('J', 'clubs')],
    communityCards: [c('K', 'diamonds'), c('J', 'spades'), c('8', 'hearts'), c('4', 'clubs'), c('2', 'diamonds')],
    potSize: 180, // preflop 50, flop bet/call 65 each → 180
    heroStack: 820,
    villainStack: 820,
    heroPosition: 'CO',
    villainPosition: 'BB',
    previousActions: 'Hero opened CO, BB called. Flop K♦J♠8♥ — hero bet, villain called. Turn 4♣ — hero bet, villain called. River 2♦.',

    decisionContext: {
      holeCards: [c('K', 'spades'), c('J', 'clubs')],
      communityCards: [c('K', 'diamonds'), c('J', 'spades'), c('8', 'hearts'), c('4', 'clubs'), c('2', 'diamonds')],
      position: 'CO',
      round: 'river',
      pot: 180,
      toCall: 0,
      currentBet: 0,
      stack: 820,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain', 'call', 'preflop', 25),
        action('hero', 'bet', 'flop', 35),
        action('villain', 'call', 'flop', 35),
        action('hero', 'bet', 'turn', 55),
        action('villain', 'call', 'turn', 55),
      ]),
    },
  },

  {
    id: 'river-bluff-catch-missed-draw',
    name: 'Bluff Catch vs Missed Draw',
    category: 'river',
    difficulty: 3,
    description: 'Board: A♠9♠6♦3♣K♥. Villain bets 80 into 120 on river. You have A♦T♣ — top pair. Flush draw missed. Can you call?',
    concept: 'bluff_catch',
    tags: ['river', 'bluff-catch', 'top-pair', 'missed-draw'],

    heroCards: [c('A', 'diamonds'), c('10', 'clubs')],
    communityCards: [c('A', 'spades'), c('9', 'spades'), c('6', 'diamonds'), c('3', 'clubs'), c('K', 'hearts')],
    potSize: 200, // 120 pot + villain bet 80
    heroStack: 840,
    villainStack: 760,
    heroPosition: 'BB',
    villainPosition: 'CO',
    previousActions: 'CO opened, hero called BB. Flop-turn checked through. River K♥ — villain bets 80 into 120.',

    decisionContext: {
      holeCards: [c('A', 'diamonds'), c('10', 'clubs')],
      communityCards: [c('A', 'spades'), c('9', 'spades'), c('6', 'diamonds'), c('3', 'clubs'), c('K', 'hearts')],
      position: 'BB',
      round: 'river',
      pot: 200,
      toCall: 80,
      currentBet: 80,
      stack: 840,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'CO',
      actionHistory: withTimestamps([
        action('hero', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('villain', 'raise', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain', 'check', 'flop'),
        action('hero', 'check', 'flop'),
        action('villain', 'check', 'turn'),
        action('hero', 'check', 'turn'),
        action('villain', 'bet', 'river', 80),
      ]),
    },
  },

  {
    id: 'preflop-steal-btn',
    name: 'Button Steal with Marginal Hand',
    category: 'preflop',
    difficulty: 1,
    description: 'Action folds to you on the BTN with K♠9♦. Blinds to steal. Standard BTN open.',
    concept: 'steal',
    tags: ['preflop', 'steal', 'position', 'BTN', 'marginal'],

    heroCards: [c('K', 'spades'), c('9', 'diamonds')],
    communityCards: [],
    potSize: 15,
    heroStack: 1000,
    villainStack: 1000,
    heroPosition: 'BTN',
    villainPosition: 'BB',
    previousActions: 'Folds to hero on BTN.',

    decisionContext: {
      holeCards: [c('K', 'spades'), c('9', 'diamonds')],
      communityCards: [],
      position: 'BTN',
      round: 'preflop',
      pot: 15,
      toCall: 10,
      currentBet: 0,
      stack: 1000,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
      ]),
    },
  },

  {
    id: 'flop-semi-bluff-flush-draw',
    name: 'Semi-Bluff Raise with Flush Draw',
    category: 'flop',
    difficulty: 2,
    description: 'BTN opened, you called from BB with A♥5♥. Flop K♥8♥2♦. Villain c-bets. You have the nut flush draw.',
    concept: 'semi_bluff',
    tags: ['flop', 'semi-bluff', 'flush-draw', 'nut-draw', 'check-raise'],

    heroCards: [c('A', 'hearts'), c('5', 'hearts')],
    communityCards: [c('K', 'hearts'), c('8', 'hearts'), c('2', 'diamonds')],
    potSize: 70, // 50 pot + villain cbet 20
    heroStack: 930,
    villainStack: 930,
    heroPosition: 'BB',
    villainPosition: 'BTN',
    previousActions: 'BTN opened to 25, hero called from BB. Flop K♥8♥2♦. BTN c-bets 20.',

    decisionContext: {
      holeCards: [c('A', 'hearts'), c('5', 'hearts')],
      communityCards: [c('K', 'hearts'), c('8', 'hearts'), c('2', 'diamonds')],
      position: 'BB',
      round: 'flop',
      pot: 70,
      toCall: 20,
      currentBet: 20,
      stack: 930,
      bigBlind: 10,
      numActivePlayers: 2,
      numPlayersInHand: 2,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'BTN',
      actionHistory: withTimestamps([
        action('hero', 'bet', 'preflop', 5),
        action('villain', 'bet', 'preflop', 10),
        action('villain', 'raise', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain', 'bet', 'flop', 20),
      ]),
    },
  },
];
