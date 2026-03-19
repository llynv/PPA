import type { Position } from '../../types/poker';

/**
 * Position orders by table size (clockwise from BTN).
 *
 * Full 9-player table: BTN -> SB -> BB -> UTG -> UTG1 -> MP -> LJ -> HJ -> CO
 *
 * For fewer players, early positions are dropped first:
 *   9: BTN, SB, BB, UTG, UTG1, MP, LJ, HJ, CO
 *   8: BTN, SB, BB, UTG, UTG1, LJ, HJ, CO
 *   7: BTN, SB, BB, UTG, LJ, HJ, CO
 *   6: BTN, SB, BB, UTG, HJ, CO
 *   5: BTN, SB, BB, UTG, CO
 *   4: BTN, SB, BB, CO
 *   3: BTN, SB, BB
 *   2: SB, BB  (heads-up: dealer is SB)
 */
const POSITION_ORDERS: Record<number, Position[]> = {
  2: ['SB', 'BB'],
  3: ['BTN', 'SB', 'BB'],
  4: ['BTN', 'SB', 'BB', 'CO'],
  5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
  6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
  7: ['BTN', 'SB', 'BB', 'UTG', 'LJ', 'HJ', 'CO'],
  8: ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'LJ', 'HJ', 'CO'],
  9: ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP', 'LJ', 'HJ', 'CO'],
};

/**
 * Returns the position name for a given seat index.
 *
 * Position assignment works clockwise from the dealer:
 * - Offset 0 from dealer = BTN (or SB in heads-up)
 * - Offset 1 = SB (or BB in heads-up)
 * - Offset 2 = BB
 * - Then early/middle/late positions based on player count
 *
 * For heads-up (2 players), the dealer is both BTN and SB.
 *
 * @param seatIndex - The seat index of the player (0-based)
 * @param dealerIndex - The seat index of the dealer (0-based)
 * @param numPlayers - Total number of players at the table (2-9)
 * @returns The position name for the given seat
 */
export function getPosition(
  seatIndex: number,
  dealerIndex: number,
  numPlayers: number,
): Position {
  if (numPlayers < 2 || numPlayers > 9) {
    throw new Error(`Invalid number of players: ${numPlayers}. Must be between 2 and 9.`);
  }

  const offset = (seatIndex - dealerIndex + numPlayers) % numPlayers;
  const positions = POSITION_ORDERS[numPlayers];

  return positions[offset];
}

/**
 * Returns all positions for the given number of players,
 * ordered clockwise from BTN (or SB in heads-up).
 *
 * @param numPlayers - Total number of players at the table (2-9)
 * @returns Array of positions in clockwise order
 */
export function getPositionOrder(numPlayers: number): Position[] {
  if (numPlayers < 2 || numPlayers > 9) {
    throw new Error(`Invalid number of players: ${numPlayers}. Must be between 2 and 9.`);
  }

  return [...POSITION_ORDERS[numPlayers]];
}

/**
 * Returns whether a position is early, middle, or late.
 *
 * - Early: UTG, UTG1
 * - Middle: MP, LJ
 * - Late: HJ, CO, BTN
 * - Blinds: SB, BB
 *
 * @param position - The position to categorize
 * @returns The category of the position
 */
export function getPositionCategory(
  position: Position,
): 'early' | 'middle' | 'late' | 'blinds' {
  switch (position) {
    case 'UTG':
    case 'UTG1':
      return 'early';
    case 'MP':
    case 'LJ':
      return 'middle';
    case 'HJ':
    case 'CO':
    case 'BTN':
      return 'late';
    case 'SB':
    case 'BB':
      return 'blinds';
  }
}
