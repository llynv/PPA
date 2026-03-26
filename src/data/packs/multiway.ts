import type { DrillPack } from '../../types/drillPack';
import type { DrillSpot } from '../../types/drill';
import type { Card, PlayerAction } from '../../types/poker';

// ── Helpers ─────────────────────────────────────────────────────────

function c(rank: Card['rank'], suit: Card['suit']): Card {
  return { rank, suit };
}

function action(
  playerId: string,
  type: PlayerAction['type'],
  round: PlayerAction['round'],
  amount?: number,
  ts?: number,
): PlayerAction {
  return { playerId, type, amount, round, timestamp: ts ?? 0 };
}

function withTimestamps(actions: PlayerAction[]): PlayerAction[] {
  return actions.map((a, i) => ({ ...a, timestamp: i + 1 }));
}

// ── Multiway Spots ─────────────────────────────────────────────────

const MULTIWAY_SPOTS: DrillSpot[] = [
  // ────────────────────────────────────────────────────────────────
  // PREFLOP SPOTS (3)
  // ────────────────────────────────────────────────────────────────

  {
    id: 'multiway_preflop_squeeze_bb',
    name: 'Squeeze from BB vs Open + Cold Call',
    category: 'preflop',
    difficulty: 3,
    description: 'MP opens to 25, CO cold calls. You are in BB with T♠T♣. Classic squeeze spot — isolate the cold caller.',
    concept: 'squeeze',
    tags: ['preflop', 'squeeze', 'BB', 'multiway', 'pocket-pair'],

    heroCards: [c('10', 'spades'), c('10', 'clubs')],
    communityCards: [],
    potSize: 65, // SB(5) + BB(10) + MP open(25) + CO call(25)
    heroStack: 990,
    villainStack: 975,
    heroPosition: 'BB',
    villainPosition: 'MP',
    previousActions: 'MP opens to 25, CO calls. Action on hero (BB).',

    decisionContext: {
      holeCards: [c('10', 'spades'), c('10', 'clubs')],
      communityCards: [],
      position: 'BB',
      round: 'preflop',
      pot: 65,
      toCall: 15,
      currentBet: 25,
      stack: 990,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'MP',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('hero', 'bet', 'preflop', 10),
        action('villain_mp', 'raise', 'preflop', 25),
        action('villain_co', 'call', 'preflop', 25),
      ]),
    },
  },

  {
    id: 'multiway_preflop_cold_call_btn',
    name: 'Cold Call BTN vs Open + 3-Bet',
    category: 'preflop',
    difficulty: 3,
    description: 'CO opens to 25, SB 3-bets to 80. You are on BTN with J♠J♥. Tricky multiway decision — cold call to keep CO in.',
    concept: 'cold_call',
    tags: ['preflop', 'cold-call', 'BTN', 'multiway', 'pocket-jacks'],

    heroCards: [c('J', 'spades'), c('J', 'hearts')],
    communityCards: [],
    potSize: 115, // SB(5→80) + BB(10) + CO open(25) — SB 3-bet to 80
    heroStack: 1000,
    villainStack: 920,
    heroPosition: 'BTN',
    villainPosition: 'SB',
    previousActions: 'CO opens to 25, SB 3-bets to 80. Action on hero (BTN).',

    decisionContext: {
      holeCards: [c('J', 'spades'), c('J', 'hearts')],
      communityCards: [],
      position: 'BTN',
      round: 'preflop',
      pot: 115,
      toCall: 80,
      currentBet: 80,
      stack: 1000,
      bigBlind: 10,
      numActivePlayers: 4,
      numPlayersInHand: 4,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'SB',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
        action('villain_sb', 'raise', 'preflop', 80),
      ]),
    },
  },

  {
    id: 'multiway_preflop_3bet_co',
    name: '3-Bet from CO in Multiway Pot',
    category: 'preflop',
    difficulty: 2,
    description: 'UTG opens to 25, MP calls. You are in CO with A♥K♥. Strong hand vs two players — 3-bet to build the pot.',
    concept: 'three_bet',
    tags: ['preflop', '3-bet', 'CO', 'multiway', 'AKs'],

    heroCards: [c('A', 'hearts'), c('K', 'hearts')],
    communityCards: [],
    potSize: 65, // SB(5) + BB(10) + UTG open(25) + MP call(25)
    heroStack: 1000,
    villainStack: 975,
    heroPosition: 'CO',
    villainPosition: 'UTG',
    previousActions: 'UTG opens to 25, MP calls. Action on hero (CO).',

    decisionContext: {
      holeCards: [c('A', 'hearts'), c('K', 'hearts')],
      communityCards: [],
      position: 'CO',
      round: 'preflop',
      pot: 65,
      toCall: 25,
      currentBet: 25,
      stack: 1000,
      bigBlind: 10,
      numActivePlayers: 5,
      numPlayersInHand: 5,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'UTG',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('villain_utg', 'raise', 'preflop', 25),
        action('villain_mp', 'call', 'preflop', 25),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // FLOP SPOTS (3)
  // ────────────────────────────────────────────────────────────────

  {
    id: 'multiway_flop_cbet_value',
    name: 'Multiway C-Bet for Value on Dry Board',
    category: 'flop',
    difficulty: 2,
    description: 'You opened BTN, SB and BB both called. Flop A♠7♦2♣ — dry ace-high. You have A♦K♦ for TPTK in a 3-way pot.',
    concept: 'cbet_value',
    tags: ['flop', 'cbet', 'value', 'multiway', 'dry-board', 'TPTK'],

    heroCards: [c('A', 'diamonds'), c('K', 'diamonds')],
    communityCards: [c('A', 'spades'), c('7', 'diamonds'), c('2', 'clubs')],
    potSize: 75, // BTN open(25) + SB call(25) + BB call(25)
    heroStack: 925,
    villainStack: 925,
    heroPosition: 'BTN',
    villainPosition: 'SB',
    previousActions: 'Hero opened BTN to 25, SB called, BB called. Flop A♠7♦2♣. Both check to hero.',

    decisionContext: {
      holeCards: [c('A', 'diamonds'), c('K', 'diamonds')],
      communityCards: [c('A', 'spades'), c('7', 'diamonds'), c('2', 'clubs')],
      position: 'BTN',
      round: 'flop',
      pot: 75,
      toCall: 0,
      currentBet: 0,
      stack: 925,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain_sb', 'call', 'preflop', 25),
        action('villain_bb', 'call', 'preflop', 25),
        action('villain_sb', 'check', 'flop'),
        action('villain_bb', 'check', 'flop'),
      ]),
    },
  },

  {
    id: 'multiway_flop_cbet_bluff',
    name: 'Multiway C-Bet Bluff on Wet Board',
    category: 'flop',
    difficulty: 3,
    description: 'You opened CO, BTN and BB called. Flop K♠9♠4♥. You have Q♥J♥ — no pair but a gutshot. C-bet as a bluff into 3 players.',
    concept: 'cbet_bluff',
    tags: ['flop', 'cbet', 'bluff', 'multiway', 'wet-board', 'gutshot'],

    heroCards: [c('Q', 'hearts'), c('J', 'hearts')],
    communityCards: [c('K', 'spades'), c('9', 'spades'), c('4', 'hearts')],
    potSize: 75,
    heroStack: 925,
    villainStack: 925,
    heroPosition: 'CO',
    villainPosition: 'BB',
    previousActions: 'Hero opened CO to 25, BTN called, BB called. Flop K♠9♠4♥. BB checks to hero.',

    decisionContext: {
      holeCards: [c('Q', 'hearts'), c('J', 'hearts')],
      communityCards: [c('K', 'spades'), c('9', 'spades'), c('4', 'hearts')],
      position: 'CO',
      round: 'flop',
      pot: 75,
      toCall: 0,
      currentBet: 0,
      stack: 925,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain_btn', 'call', 'preflop', 25),
        action('villain_bb', 'call', 'preflop', 25),
        action('villain_bb', 'check', 'flop'),
      ]),
    },
  },

  {
    id: 'multiway_flop_check_raise',
    name: 'Multiway Check-Raise with Set',
    category: 'flop',
    difficulty: 3,
    description: 'CO opened, BTN called, you called from BB with 5♦5♣. Flop J♠5♠3♦ — bottom set on a wet board. CO bets 35. BTN calls. Check-raise for value.',
    concept: 'check_raise',
    tags: ['flop', 'check-raise', 'set', 'multiway', 'wet-board', 'value'],

    heroCards: [c('5', 'diamonds'), c('5', 'clubs')],
    communityCards: [c('J', 'spades'), c('5', 'spades'), c('3', 'diamonds')],
    potSize: 145, // 75 pot + CO bet 35 + BTN call 35
    heroStack: 890,
    villainStack: 890,
    heroPosition: 'BB',
    villainPosition: 'CO',
    previousActions: 'CO opened to 25, BTN called, hero called from BB. Flop J♠5♠3♦. CO bets 35, BTN calls.',

    decisionContext: {
      holeCards: [c('5', 'diamonds'), c('5', 'clubs')],
      communityCards: [c('J', 'spades'), c('5', 'spades'), c('3', 'diamonds')],
      position: 'BB',
      round: 'flop',
      pot: 145,
      toCall: 35,
      currentBet: 35,
      stack: 890,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'CO',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('hero', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
        action('villain_btn', 'call', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('hero', 'check', 'flop'),
        action('villain_co', 'bet', 'flop', 35),
        action('villain_btn', 'call', 'flop', 35),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // TURN SPOTS (3)
  // ────────────────────────────────────────────────────────────────

  {
    id: 'multiway_turn_barrel',
    name: 'Multiway Turn Barrel with Top Pair',
    category: 'turn',
    difficulty: 2,
    description: 'You opened BTN, SB and BB called. Flop Q♦8♣3♠ — you bet, both called. Turn 2♥ (brick). You have Q♠J♠ for top pair. Barrel into 3-way pot.',
    concept: 'barrel',
    tags: ['turn', 'barrel', 'multiway', 'top-pair', 'value'],

    heroCards: [c('Q', 'spades'), c('J', 'spades')],
    communityCards: [c('Q', 'diamonds'), c('8', 'clubs'), c('3', 'spades'), c('2', 'hearts')],
    potSize: 225, // 75 preflop + hero bet 50 flop + 2 calls = 225
    heroStack: 825,
    villainStack: 825,
    heroPosition: 'BTN',
    villainPosition: 'SB',
    previousActions: 'Hero opened BTN, SB and BB called. Hero bet 50 on flop, both called. Turn 2♥. Both check to hero.',

    decisionContext: {
      holeCards: [c('Q', 'spades'), c('J', 'spades')],
      communityCards: [c('Q', 'diamonds'), c('8', 'clubs'), c('3', 'spades'), c('2', 'hearts')],
      position: 'BTN',
      round: 'turn',
      pot: 225,
      toCall: 0,
      currentBet: 0,
      stack: 825,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('hero', 'raise', 'preflop', 25),
        action('villain_sb', 'call', 'preflop', 25),
        action('villain_bb', 'call', 'preflop', 25),
        action('villain_sb', 'check', 'flop'),
        action('villain_bb', 'check', 'flop'),
        action('hero', 'bet', 'flop', 50),
        action('villain_sb', 'call', 'flop', 50),
        action('villain_bb', 'call', 'flop', 50),
        action('villain_sb', 'check', 'turn'),
        action('villain_bb', 'check', 'turn'),
      ]),
    },
  },

  {
    id: 'multiway_turn_pot_control',
    name: 'Multiway Turn Pot Control with Medium Pair',
    category: 'turn',
    difficulty: 2,
    description: 'CO opened, you called BTN, BB called. Flop 9♥6♦3♣ checked around. Turn A♠ — scary overcard. You have 9♠8♠ for second pair. Check behind for pot control.',
    concept: 'pot_control',
    tags: ['turn', 'pot-control', 'multiway', 'medium-pair', 'overcard'],

    heroCards: [c('9', 'spades'), c('8', 'spades')],
    communityCards: [c('9', 'hearts'), c('6', 'diamonds'), c('3', 'clubs'), c('A', 'spades')],
    potSize: 75,
    heroStack: 925,
    villainStack: 925,
    heroPosition: 'BTN',
    villainPosition: 'CO',
    previousActions: 'CO opened to 25, hero called BTN, BB called. Flop 9♥6♦3♣ checked around. Turn A♠. CO checks, BB checks.',

    decisionContext: {
      holeCards: [c('9', 'spades'), c('8', 'spades')],
      communityCards: [c('9', 'hearts'), c('6', 'diamonds'), c('3', 'clubs'), c('A', 'spades')],
      position: 'BTN',
      round: 'turn',
      pot: 75,
      toCall: 0,
      currentBet: 0,
      stack: 925,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain_bb', 'call', 'preflop', 25),
        action('villain_co', 'check', 'flop'),
        action('hero', 'check', 'flop'),
        action('villain_bb', 'check', 'flop'),
        action('villain_co', 'check', 'turn'),
        action('villain_bb', 'check', 'turn'),
      ]),
    },
  },

  {
    id: 'multiway_turn_probe',
    name: 'Multiway Turn Probe After Checked Flop',
    category: 'turn',
    difficulty: 2,
    description: 'UTG opened, MP called, you called from BB. Flop T♣6♥2♦ — all checked. Turn 4♠. You have A♣6♣ for second pair. Probe bet the multiway pot.',
    concept: 'probe',
    tags: ['turn', 'probe', 'multiway', 'second-pair', 'missed-cbet'],

    heroCards: [c('A', 'clubs'), c('6', 'clubs')],
    communityCards: [c('10', 'clubs'), c('6', 'hearts'), c('2', 'diamonds'), c('4', 'spades')],
    potSize: 75,
    heroStack: 925,
    villainStack: 925,
    heroPosition: 'BB',
    villainPosition: 'UTG',
    previousActions: 'UTG opened to 25, MP called, hero called from BB. Flop T♣6♥2♦ checked around. Turn 4♠. Hero first to act.',

    decisionContext: {
      holeCards: [c('A', 'clubs'), c('6', 'clubs')],
      communityCards: [c('10', 'clubs'), c('6', 'hearts'), c('2', 'diamonds'), c('4', 'spades')],
      position: 'BB',
      round: 'turn',
      pot: 75,
      toCall: 0,
      currentBet: 0,
      stack: 925,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('hero', 'bet', 'preflop', 10),
        action('villain_utg', 'raise', 'preflop', 25),
        action('villain_mp', 'call', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('hero', 'check', 'flop'),
        action('villain_utg', 'check', 'flop'),
        action('villain_mp', 'check', 'flop'),
      ]),
    },
  },

  // ────────────────────────────────────────────────────────────────
  // RIVER SPOTS (3)
  // ────────────────────────────────────────────────────────────────

  {
    id: 'multiway_river_value_bet_thin',
    name: 'Multiway River Thin Value with Two Pair',
    category: 'river',
    difficulty: 3,
    description: 'CO opened, BTN called, you called from BB. Board: K♦9♣4♠7♥3♦. You have K♣9♠ for top two pair. Bet thin for value in a 3-way pot.',
    concept: 'value_bet_thin',
    tags: ['river', 'value', 'thin-value', 'multiway', 'two-pair'],

    heroCards: [c('K', 'clubs'), c('9', 'spades')],
    communityCards: [c('K', 'diamonds'), c('9', 'clubs'), c('4', 'spades'), c('7', 'hearts'), c('3', 'diamonds')],
    potSize: 225,
    heroStack: 775,
    villainStack: 775,
    heroPosition: 'BB',
    villainPosition: 'CO',
    previousActions: 'CO opened, BTN called, hero called BB. Hero check-called flop and turn. River 3♦. Hero first to act.',

    decisionContext: {
      holeCards: [c('K', 'clubs'), c('9', 'spades')],
      communityCards: [c('K', 'diamonds'), c('9', 'clubs'), c('4', 'spades'), c('7', 'hearts'), c('3', 'diamonds')],
      position: 'BB',
      round: 'river',
      pot: 225,
      toCall: 0,
      currentBet: 0,
      stack: 775,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: true,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('hero', 'bet', 'preflop', 10),
        action('villain_co', 'raise', 'preflop', 25),
        action('villain_btn', 'call', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('hero', 'check', 'flop'),
        action('villain_co', 'bet', 'flop', 40),
        action('villain_btn', 'call', 'flop', 40),
        action('hero', 'call', 'flop', 40),
        action('hero', 'check', 'turn'),
        action('villain_co', 'check', 'turn'),
        action('villain_btn', 'check', 'turn'),
      ]),
    },
  },

  {
    id: 'multiway_river_bluff_catch',
    name: 'Multiway River Bluff Catch with Middle Pair',
    category: 'river',
    difficulty: 3,
    description: 'UTG opened, you called CO, BB called. Board: J♥8♠4♦2♣6♥. BB checks, UTG bets 60 into 120. You have 8♥7♥ — middle pair. Bluff catch in a spot where UTG often has busted draws.',
    concept: 'bluff_catch',
    tags: ['river', 'bluff-catch', 'multiway', 'middle-pair', 'call-down'],

    heroCards: [c('8', 'hearts'), c('7', 'hearts')],
    communityCards: [c('J', 'hearts'), c('8', 'spades'), c('4', 'diamonds'), c('2', 'clubs'), c('6', 'hearts')],
    potSize: 180, // 120 pot + UTG bet 60
    heroStack: 810,
    villainStack: 750,
    heroPosition: 'CO',
    villainPosition: 'UTG',
    previousActions: 'UTG opened, hero called CO, BB called. Checked through flop and turn. River 6♥. BB checks, UTG bets 60.',

    decisionContext: {
      holeCards: [c('8', 'hearts'), c('7', 'hearts')],
      communityCards: [c('J', 'hearts'), c('8', 'spades'), c('4', 'diamonds'), c('2', 'clubs'), c('6', 'hearts')],
      position: 'CO',
      round: 'river',
      pot: 180,
      toCall: 60,
      currentBet: 60,
      stack: 810,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: true,
      raiserPosition: 'UTG',
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('villain_utg', 'raise', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain_bb', 'call', 'preflop', 25),
        action('villain_bb', 'check', 'flop'),
        action('villain_utg', 'check', 'flop'),
        action('hero', 'check', 'flop'),
        action('villain_bb', 'check', 'turn'),
        action('villain_utg', 'check', 'turn'),
        action('hero', 'check', 'turn'),
        action('villain_bb', 'check', 'river'),
        action('villain_utg', 'bet', 'river', 60),
      ]),
    },
  },

  {
    id: 'multiway_river_bluff',
    name: 'Multiway River Bluff with Busted Straight Draw',
    category: 'river',
    difficulty: 3,
    description: 'MP opened, CO called, you called from BTN. Board: K♠T♥7♣4♦2♠. You have Q♣J♣ — busted OESD. Both opponents check. Bluff the river to take down the pot.',
    concept: 'river_bluff',
    tags: ['river', 'bluff', 'multiway', 'busted-draw', 'position'],

    heroCards: [c('Q', 'clubs'), c('J', 'clubs')],
    communityCards: [c('K', 'spades'), c('10', 'hearts'), c('7', 'clubs'), c('4', 'diamonds'), c('2', 'spades')],
    potSize: 150,
    heroStack: 825,
    villainStack: 825,
    heroPosition: 'BTN',
    villainPosition: 'MP',
    previousActions: 'MP opened, CO called, hero called BTN. Checked through flop. MP bet turn, CO called, hero called. River 2♠. Both check to hero.',

    decisionContext: {
      holeCards: [c('Q', 'clubs'), c('J', 'clubs')],
      communityCards: [c('K', 'spades'), c('10', 'hearts'), c('7', 'clubs'), c('4', 'diamonds'), c('2', 'spades')],
      position: 'BTN',
      round: 'river',
      pot: 150,
      toCall: 0,
      currentBet: 0,
      stack: 825,
      bigBlind: 10,
      numActivePlayers: 3,
      numPlayersInHand: 3,
      isFirstToAct: false,
      facingRaise: false,
      actionHistory: withTimestamps([
        action('villain_sb', 'bet', 'preflop', 5),
        action('villain_bb', 'bet', 'preflop', 10),
        action('villain_mp', 'raise', 'preflop', 25),
        action('villain_co', 'call', 'preflop', 25),
        action('hero', 'call', 'preflop', 25),
        action('villain_mp', 'check', 'flop'),
        action('villain_co', 'check', 'flop'),
        action('hero', 'check', 'flop'),
        action('villain_mp', 'bet', 'turn', 25),
        action('villain_co', 'call', 'turn', 25),
        action('hero', 'call', 'turn', 25),
        action('villain_mp', 'check', 'river'),
        action('villain_co', 'check', 'river'),
      ]),
    },
  },
];

export const MULTIWAY_PACK: DrillPack = {
  id: 'multiway',
  name: 'Multiway Spots',
  description: '12 multiway GTO training spots covering 3+ player scenarios from preflop through river',
  version: 1,
  spots: MULTIWAY_SPOTS,
};
