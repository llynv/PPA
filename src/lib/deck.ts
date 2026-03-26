import type { Card, Rank, Suit } from "../types/poker";

// ── Constants ───────────────────────────────────────────────────────

export const SUITS: Suit[] = ["hearts", "diamonds", "clubs", "spades"];

export const RANKS: Rank[] = [
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K",
    "A",
];

// ── Suit helpers ────────────────────────────────────────────────────

const SUIT_SYMBOLS: Record<Suit, string> = {
    hearts: "♥",
    diamonds: "♦",
    clubs: "♣",
    spades: "♠",
};

const SUIT_COLORS: Record<Suit, "red" | "black"> = {
    hearts: "red",
    diamonds: "red",
    clubs: "black",
    spades: "black",
};

/**
 * 4-color deck mapping:
 * - Spades = Black
 * - Hearts = Red
 * - Diamonds = Blue
 * - Clubs = Green
 */
const SUIT_COLORS_4: Record<Suit, "black" | "red" | "blue" | "green"> = {
    spades: "black",
    hearts: "red",
    diamonds: "blue",
    clubs: "green",
};

/** Returns the Unicode symbol for a suit. */
export function suitSymbol(suit: Suit): string {
    return SUIT_SYMBOLS[suit];
}

/** Returns 'red' for hearts/diamonds, 'black' for clubs/spades. */
export function suitColor(suit: Suit): "red" | "black" {
    return SUIT_COLORS[suit];
}

/** Returns 4-color deck color: spades=black, hearts=red, diamonds=blue, clubs=green. */
export function suitColor4(suit: Suit): "black" | "red" | "blue" | "green" {
    return SUIT_COLORS_4[suit];
}

// ── Card helpers ────────────────────────────────────────────────────

export const RANK_VALUES: Record<Rank, number> = {
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
    "6": 6,
    "7": 7,
    "8": 8,
    "9": 9,
    "10": 10,
    J: 11,
    Q: 12,
    K: 13,
    A: 14,
};

/** Returns a numeric value for ranking: 2=2 ... A=14. */
export function cardValue(card: Card): number {
    return RANK_VALUES[card.rank];
}

/** Returns a display string like "A♠", "K♥", "10♦", "2♣". */
export function cardToString(card: Card): string {
    return `${card.rank}${suitSymbol(card.suit)}`;
}

/** Comparison function for sorting cards by value (ascending). */
export function compareCards(a: Card, b: Card): number {
    return cardValue(a) - cardValue(b);
}

// ── Deck operations ─────────────────────────────────────────────────

/** Creates a standard 52-card deck (all suit x rank combos). */
export function createDeck(): Card[] {
    const deck: Card[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ suit, rank });
        }
    }
    return deck;
}

/** Fisher-Yates shuffle. Returns a NEW shuffled array (input is not mutated). */
export function shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Takes `count` cards from the top of the deck.
 * Returns the dealt cards and the remaining deck.
 */
export function dealCards(
    deck: Card[],
    count: number,
): { dealt: Card[]; remaining: Card[] } {
    return {
        dealt: deck.slice(0, count),
        remaining: deck.slice(count),
    };
}
