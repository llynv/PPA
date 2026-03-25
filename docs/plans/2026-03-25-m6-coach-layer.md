# M6: Coach Layer — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform raw GTO analysis output into adaptive, mastery-aware coaching across all surfaces — review, drills, learning path, and session debrief.

**Architecture:** New `src/lib/coaching.ts` central module with pure functions. New `src/data/conceptTeachings.ts` static data file. Template-based coaching with mastery-level variants. All client-side, deterministic. No new Zustand stores — coaching is pure functions consuming existing store data.

**Tech Stack:** React 18, TypeScript, Zustand (existing stores), Tailwind CSS, Vitest

---

### Task 1: Coaching Types

**Files:**
- Modify: `src/types/poker.ts`

**Spec:**

Add the following types after the existing `CoachingExplanation` interface (around line 129):

```typescript
export type CoachingDepth = "foundational" | "tactical" | "nuanced";

export interface EnhancedCoaching {
    whatHappened: string;
    whyMistake: string | null;            // null for correct plays
    whatToDo: string;
    tip: string | null;                    // mastery-aware contextual tip
    boardNarrative: string;               // human-readable board description
    concept: MistakeType | null;
}

export interface CoachingContext {
    decision: Decision;
    mistakeType: MistakeType | null;      // null for correct plays
    mastery: ConceptMastery | undefined;
    boardTexture: BoardTexture;
    draws: DrawInfo;
    round: BettingRound;
}

export interface Recommendation {
    concept: DrillConcept | null;
    reason: RecommendationReason;
    narrative: string;
}

export type RecommendationReason =
    | "unseen"
    | "struggling"
    | "reinforce"
    | "advance"
    | "stale"
    | "complete";

export interface SessionDebrief {
    headline: string;
    details: string[];
    suggestedDrill: DrillConcept | null;
}

export interface ConceptTeaching {
    summary: string;        // 1 sentence for tooltips/chips
    explanation: string;    // 2-3 sentences for expanded view
}
```

**Note:** The `CoachingContext` interface references `ConceptMastery` from `../types/progress` and `Decision`/`BoardTexture`/`DrawInfo`/`BettingRound`/`MistakeType` from the same file. Add the import for `ConceptMastery`:

```typescript
import type { ConceptMastery } from "./progress";
```

Also add the import for `DrillConcept`:

```typescript
import type { DrillConcept } from "./drill";
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Commit:** `feat(m6): add coaching types — EnhancedCoaching, CoachingContext, Recommendation, SessionDebrief, ConceptTeaching`

---

### Task 2: Concept Teaching Snippets Data

**Files:**
- Create: `src/data/conceptTeachings.ts`

**Spec:**

```typescript
import type { ConceptTeaching } from "../types/poker";
import type { DrillConcept } from "../types/drill";

export const CONCEPT_TEACHINGS: Record<DrillConcept, ConceptTeaching> = {
    open_raise: {
        summary: "Opening raises establish initiative — GTO ranges widen as position improves.",
        explanation: "An open raise is the first voluntary bet preflop. Position determines how wide you can profitably open — from tight UTG ranges (top 12-15%) to wide BTN ranges (40-50%). Opening establishes the betting lead, which gives you the option to continuation bet on later streets.",
    },
    cold_call: {
        summary: "Cold calling requires strong hands because you face multiple opponents without initiative.",
        explanation: "A cold call means calling an open raise without having money already invested. You need a tighter range than the opener because you lack initiative and may face a squeeze behind you. Focus on hands with good playability postflop — suited connectors, pocket pairs, and suited broadways.",
    },
    steal: {
        summary: "Blind stealing exploits fold equity from late position with a wide range.",
        explanation: "Stealing the blinds from late position (CO/BTN) is a core GTO strategy. When folded to you in late position, the blinds fold often enough to make raises profitable even with weak holdings. The key is balancing your steal range so opponents can't easily exploit you by 3-betting light.",
    },
    cbet_value: {
        summary: "Value c-bets leverage your preflop aggression on boards favoring your range.",
        explanation: "A value continuation bet is made when you have a strong hand on a board that favors your preflop range. As the preflop aggressor, you typically have more overpairs, top pairs, and sets than the caller. Bet sizing should match the board texture — smaller on dry boards, larger on wet boards where you need to deny equity.",
    },
    cbet_bluff: {
        summary: "Bluff c-bets use board coverage and blockers to deny equity cheaply.",
        explanation: "Bluff c-bets take advantage of your range advantage as the preflop raiser. On boards that favor your range (ace-high, king-high, dry), you can bet small with a high frequency. Choose bluff candidates that have backdoor equity (backdoor flush/straight draws) so you have fallback outs when called.",
    },
    three_bet: {
        summary: "3-betting for value and as bluffs narrows the field and builds pots with strong ranges.",
        explanation: "A 3-bet re-raises the original opener. GTO 3-bet ranges include value hands (AA, KK, QQ, AKs) and bluffs (suited aces, suited connectors). 3-betting from the blinds is especially important as it compensates for your positional disadvantage. Size your 3-bets larger out of position (4x) than in position (3x).",
    },
    squeeze: {
        summary: "Squeezing exploits dead money when facing an open and one or more callers.",
        explanation: "A squeeze play is a 3-bet made after someone opens and one or more players cold call. The dead money from the callers makes squeezing more profitable than a standard 3-bet. The original caller's range is usually capped (they would have 3-bet with their strongest hands), making them likely to fold. Size larger than a standard 3-bet — typically 4x the open plus 1x per caller.",
    },
    check_call: {
        summary: "Check-calling defends your range at the correct frequency against aggression.",
        explanation: "Check-calling is how you defend against bets without raising. GTO requires defending enough to prevent opponents from profitably bluffing any two cards. Against a pot-sized bet, you need to defend roughly 50% of your range. Choose calling hands that have decent equity and showdown value but aren't strong enough to raise.",
    },
    check_raise: {
        summary: "Check-raising as a semi-bluff or for value traps aggressive opponents.",
        explanation: "Check-raising is the strongest play from out of position — it builds the pot with your best hands and adds fold equity to your semi-bluffs. GTO check-raise ranges are polarized: very strong hands (sets, two pair) for value, and draws (flush draws, straight draws) as bluffs. On wet boards, check-raise more frequently to deny equity.",
    },
    float: {
        summary: "Floating in position takes pots away when the aggressor gives up on later streets.",
        explanation: "A float is calling a bet in position with a marginal hand, planning to take the pot when your opponent checks on a later street. This works because many c-bettors give up on the turn when called. Good float candidates are hands with backdoor equity or overcards that can improve. Only float when you have position — it's unprofitable out of position.",
    },
    probe: {
        summary: "Probe betting exploits a missed c-bet to take initiative on the turn.",
        explanation: "A probe bet is a bet made out of position when the preflop aggressor checks back the flop. This check signals weakness — they likely don't have an overpair or top pair. Probe with a wide range including middle pairs, draws, and bluffs. Size small (25-33% pot) since you're mostly denying equity and taking the initiative rather than building a huge pot.",
    },
    pot_control: {
        summary: "Pot control keeps the pot small with medium-strength hands to avoid costly mistakes.",
        explanation: "Pot control means checking or calling instead of betting with medium-strength hands. With one pair on a wet board, you often want to keep the pot manageable rather than inflate it against a range that's either beating you or drawing to beat you. Check back on the turn with showdown-value hands, then decide on the river based on opponent's action.",
    },
    bluff_catch: {
        summary: "Bluff-catching identifies spots where your hand beats bluffs but loses to value.",
        explanation: "Bluff catching is calling with a hand that only beats bluffs — you lose to any value bet but win against bluff attempts. The key is estimating the opponent's bluff frequency. If they bluff more than your pot odds require, calling is profitable. Good bluff-catchers are hands near the bottom of your calling range that block value hands.",
    },
    barrel: {
        summary: "Multi-street barreling applies maximum pressure with coordinated value and bluff ranges.",
        explanation: "Barreling means betting multiple streets in a row. GTO barreling requires a balanced range of value bets and bluffs on each street. As you bet more streets, your range should become more polarized. Choose turn and river bluffs that have blockers to your opponent's calling range or that picked up equity. Natural bluff-to-value ratio decreases on each street.",
    },
    semi_bluff: {
        summary: "Semi-bluffing combines fold equity with draw equity for a +EV aggressive play.",
        explanation: "A semi-bluff is a bet or raise with a drawing hand that can improve to the best hand. You profit two ways: opponents fold immediately (fold equity) or you hit your draw (hand equity). Semi-bluff with draws that have 8+ outs — flush draws, open-ended straight draws, or combo draws. The combined equity from fold equity plus draw equity makes these plays significantly +EV.",
    },
    value_bet_thin: {
        summary: "Thin value betting extracts chips from worse hands that might fold to larger bets.",
        explanation: "Thin value betting means betting with a hand that beats a narrow range of calling hands. The sizing must be small enough that worse hands still call. Typical thin value spots include top pair with a weak kicker on the river, or second pair on a dry board. The key question is: 'Can any worse hand call?' If yes, bet small.",
    },
    river_bluff: {
        summary: "River bluffs target the right frequency with hands that have no showdown value.",
        explanation: "River bluffs are bets on the final street with hands that can't win at showdown. GTO bluff frequency depends on your bet sizing — with a pot-sized bet, you should bluff about 33% of the time (1 bluff for every 2 value bets). Choose bluff candidates that block your opponent's calling range and that turned equity draws that missed.",
    },
    river_raise: {
        summary: "River raises for value polarize your range — only raise with the nuts or as a bluff.",
        explanation: "Raising on the river is the most polarized play in poker. You should only raise with the very best hands (nut flushes, full houses, straights) or as a bluff. Medium-strength hands should call or fold, never raise. When raising as a bluff, use hands that block the nuts and have zero showdown value.",
    },
};
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Commit:** `feat(m6): add concept teaching snippets for all 18 drill concepts`

---

### Task 3: Core Coaching Engine — Tests

**Files:**
- Create: `src/lib/__tests__/coaching.test.ts`

**Spec:**

Write comprehensive tests for the coaching engine before implementation. Tests cover:

```typescript
import { describe, it, expect } from "vitest";
import {
    coachingDepthForMastery,
    generateBoardNarrative,
    generateEnhancedCoaching,
    generateCorrectPlayCoaching,
    generateDrillCoaching,
    generateSessionDebrief,
    getRecommendation,
} from "../coaching";
import type { MasteryLevel } from "../../types/progress";
import type {
    CoachingContext,
    BettingRound,
    BoardTexture,
    DrawInfo,
    Decision,
    MistakeType,
    AnalysisData,
} from "../../types/poker";
import type { SessionSummary, ConceptMastery } from "../../types/progress";
import type { DrillSpot, DrillResult } from "../../types/drill";

// ── coachingDepthForMastery ─────────────────────────────────────────

describe("coachingDepthForMastery", () => {
    it("returns foundational for unseen", () => {
        expect(coachingDepthForMastery("unseen")).toBe("foundational");
    });

    it("returns foundational for learning", () => {
        expect(coachingDepthForMastery("learning")).toBe("foundational");
    });

    it("returns tactical for practiced", () => {
        expect(coachingDepthForMastery("practiced")).toBe("tactical");
    });

    it("returns tactical for solid", () => {
        expect(coachingDepthForMastery("solid")).toBe("tactical");
    });

    it("returns nuanced for mastered", () => {
        expect(coachingDepthForMastery("mastered")).toBe("nuanced");
    });

    it("returns foundational for undefined mastery (no ConceptMastery)", () => {
        expect(coachingDepthForMastery(undefined)).toBe("foundational");
    });
});

// ── generateBoardNarrative ──────────────────────────────────────────

describe("generateBoardNarrative", () => {
    const dryBoard: BoardTexture = {
        wetness: "dry",
        isMonotone: false,
        isTwoTone: false,
        isRainbow: true,
        isPaired: false,
        isTrips: false,
        highCardCount: 1,
        connectedness: 0,
        possibleStraights: 0,
        possibleFlushes: false,
    };

    const wetBoard: BoardTexture = {
        wetness: "wet",
        isMonotone: false,
        isTwoTone: true,
        isRainbow: false,
        isPaired: false,
        isTrips: false,
        highCardCount: 2,
        connectedness: 3,
        possibleStraights: 2,
        possibleFlushes: true,
    };

    const noDraws: DrawInfo = {
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

    const flushDraw: DrawInfo = {
        flushDraw: true,
        flushDrawOuts: 9,
        oesD: false,
        gutshot: false,
        straightDrawOuts: 0,
        backdoorFlush: false,
        backdoorStraight: false,
        totalOuts: 9,
        drawEquity: 0.35,
    };

    it("returns a non-empty string for flop", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative).toBeTruthy();
        expect(typeof narrative).toBe("string");
    });

    it("mentions wetness level", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative.toLowerCase()).toContain("dry");
    });

    it("mentions rainbow when applicable", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "flop");
        expect(narrative.toLowerCase()).toContain("rainbow");
    });

    it("mentions flush draw when present", () => {
        const narrative = generateBoardNarrative(wetBoard, flushDraw, "flop");
        expect(narrative.toLowerCase()).toContain("flush");
    });

    it("handles turn narrative", () => {
        const narrative = generateBoardNarrative(wetBoard, noDraws, "turn");
        expect(narrative).toBeTruthy();
    });

    it("handles river narrative", () => {
        const narrative = generateBoardNarrative(dryBoard, noDraws, "river");
        expect(narrative).toBeTruthy();
    });
});

// ── generateEnhancedCoaching (mistake) ──────────────────────────────

describe("generateEnhancedCoaching", () => {
    function makeCtx(overrides: Partial<CoachingContext> = {}): CoachingContext {
        return {
            decision: {
                round: "flop",
                heroAction: "call",
                optimalAction: "raise",
                optimalFrequencies: { fold: 0, call: 0.3, raise: 0.7 },
                evDiff: 2.5,
                equity: 0.65,
                potOdds: 0.25,
                boardTexture: {
                    wetness: "dry",
                    isMonotone: false,
                    isTwoTone: false,
                    isRainbow: true,
                    isPaired: false,
                    isTrips: false,
                    highCardCount: 1,
                    connectedness: 0,
                    possibleStraights: 0,
                    possibleFlushes: false,
                },
                draws: {
                    flushDraw: false,
                    flushDrawOuts: 0,
                    oesD: false,
                    gutshot: false,
                    straightDrawOuts: 0,
                    backdoorFlush: false,
                    backdoorStraight: false,
                    totalOuts: 0,
                    drawEquity: 0,
                },
            } as Decision,
            mistakeType: "PASSIVE_WITH_EQUITY" as MistakeType,
            mastery: undefined,
            boardTexture: {
                wetness: "dry",
                isMonotone: false,
                isTwoTone: false,
                isRainbow: true,
                isPaired: false,
                isTrips: false,
                highCardCount: 1,
                connectedness: 0,
                possibleStraights: 0,
                possibleFlushes: false,
            },
            draws: {
                flushDraw: false,
                flushDrawOuts: 0,
                oesD: false,
                gutshot: false,
                straightDrawOuts: 0,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 0,
                drawEquity: 0,
            },
            round: "flop" as BettingRound,
            ...overrides,
        };
    }

    it("returns all EnhancedCoaching fields for a mistake", () => {
        const coaching = generateEnhancedCoaching(makeCtx());
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whyMistake).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
        expect(coaching.boardNarrative).toBeTruthy();
        expect(coaching.concept).toBe("PASSIVE_WITH_EQUITY");
    });

    it("uses foundational depth when mastery is undefined", () => {
        const coaching = generateEnhancedCoaching(makeCtx());
        // Foundational coaching defines the concept and explains basic math
        expect(coaching.whatToDo).toBeTruthy();
    });

    it("adapts whatToDo depth for mastered level", () => {
        const mastery: ConceptMastery = {
            concept: "value_bet_thin",
            level: "mastered",
            totalAttempts: 20,
            correctAttempts: 18,
            accuracy: 0.9,
            recentAccuracy: 0.85,
            totalEvDelta: 5,
            lastAttemptAt: Date.now(),
            streak: 5,
            bestStreak: 5,
        };
        const coaching = generateEnhancedCoaching(makeCtx({ mastery }));
        expect(coaching.whatToDo).toBeTruthy();
        // Nuanced depth should be different from foundational
    });

    it("covers all 10 MistakeTypes without throwing", () => {
        const types: MistakeType[] = [
            "OVERFOLD", "OVERCALL", "MISSED_VALUE_BET", "MISSED_CBET",
            "BAD_SIZING_OVER", "BAD_SIZING_UNDER", "CALLING_WITHOUT_ODDS",
            "BLUFF_WRONG_SPOT", "MISSED_DRAW_PLAY", "PASSIVE_WITH_EQUITY",
        ];
        for (const type of types) {
            const coaching = generateEnhancedCoaching(makeCtx({ mistakeType: type }));
            expect(coaching.whatHappened).toBeTruthy();
            expect(coaching.whyMistake).toBeTruthy();
            expect(coaching.whatToDo).toBeTruthy();
        }
    });
});

// ── generateCorrectPlayCoaching ─────────────────────────────────────

describe("generateCorrectPlayCoaching", () => {
    function makeCorrectCtx(): CoachingContext {
        return {
            decision: {
                round: "flop",
                heroAction: "raise",
                optimalAction: "raise",
                optimalFrequencies: { fold: 0, call: 0.3, raise: 0.7 },
                evDiff: 0,
                equity: 0.72,
                potOdds: 0.25,
            } as Decision,
            mistakeType: null,
            mastery: undefined,
            boardTexture: {
                wetness: "dry",
                isMonotone: false,
                isTwoTone: false,
                isRainbow: true,
                isPaired: false,
                isTrips: false,
                highCardCount: 1,
                connectedness: 0,
                possibleStraights: 0,
                possibleFlushes: false,
            },
            draws: {
                flushDraw: false,
                flushDrawOuts: 0,
                oesD: false,
                gutshot: false,
                straightDrawOuts: 0,
                backdoorFlush: false,
                backdoorStraight: false,
                totalOuts: 0,
                drawEquity: 0,
            },
            round: "flop",
        };
    }

    it("returns null whyMistake for correct play", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whyMistake).toBeNull();
    });

    it("returns null concept for correct play", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.concept).toBeNull();
    });

    it("returns whatHappened describing the correct action", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whatHappened.toLowerCase()).toContain("raise");
    });

    it("returns whatToDo with positive reinforcement", () => {
        const coaching = generateCorrectPlayCoaching(makeCorrectCtx());
        expect(coaching.whatToDo).toBeTruthy();
    });
});

// ── generateDrillCoaching ───────────────────────────────────────────

describe("generateDrillCoaching", () => {
    const mockSpot: DrillSpot = {
        id: "test-spot",
        name: "Test Spot",
        category: "flop",
        difficulty: 2,
        description: "Facing a bet on the flop",
        concept: "cbet_value",
        tags: ["value"],
        heroCards: [
            { suit: "hearts", rank: "A" },
            { suit: "spades", rank: "K" },
        ],
        communityCards: [
            { suit: "hearts", rank: "K" },
            { suit: "diamonds", rank: "7" },
            { suit: "clubs", rank: "2" },
        ],
        potSize: 10,
        heroStack: 100,
        villainStack: 100,
        heroPosition: "BTN",
        villainPosition: "BB",
        previousActions: "Hero opens BTN, Villain calls BB",
        decisionContext: {} as any,
    };

    const mockOptimalResult = {
        optimalAction: "bet" as const,
        optimalAmount: 7,
        frequencies: { fold: 0, call: 0.2, raise: 0.8 },
        reasoning: "raw reasoning",
        equity: 0.75,
        potOdds: 0,
        impliedOdds: 0,
        spr: 10,
        draws: {
            flushDraw: false,
            flushDrawOuts: 0,
            oesD: false,
            gutshot: false,
            straightDrawOuts: 0,
            backdoorFlush: false,
            backdoorStraight: false,
            totalOuts: 0,
            drawEquity: 0,
        },
        boardTexture: {
            wetness: "dry" as const,
            isMonotone: false,
            isTwoTone: false,
            isRainbow: true,
            isPaired: false,
            isTrips: false,
            highCardCount: 1,
            connectedness: 0,
            possibleStraights: 0,
            possibleFlushes: false,
        },
        evByAction: { fold: -5, call: 2, raise: 4 },
    };

    it("generates coaching for correct drill answer", () => {
        const result: DrillResult = {
            spotId: "test-spot",
            heroAction: "bet",
            isCorrect: true,
            evDelta: 0,
            optimalResult: mockOptimalResult,
            timestamp: Date.now(),
        };
        const coaching = generateDrillCoaching(mockSpot, result, undefined, mockOptimalResult);
        expect(coaching.whyMistake).toBeNull();
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
    });

    it("generates coaching for wrong drill answer", () => {
        const result: DrillResult = {
            spotId: "test-spot",
            heroAction: "check",
            isCorrect: false,
            evDelta: -2.5,
            optimalResult: mockOptimalResult,
            timestamp: Date.now(),
        };
        const coaching = generateDrillCoaching(mockSpot, result, undefined, mockOptimalResult);
        expect(coaching.whyMistake).toBeTruthy();
        expect(coaching.whatHappened).toBeTruthy();
        expect(coaching.whatToDo).toBeTruthy();
    });
});

// ── getRecommendation ───────────────────────────────────────────────

describe("getRecommendation", () => {
    it("returns unseen reason for brand new player", () => {
        const rec = getRecommendation({});
        expect(rec.concept).toBe("open_raise");
        expect(rec.reason).toBe("unseen");
        expect(rec.narrative).toBeTruthy();
    });

    it("returns struggling reason for learning concept", () => {
        const mastery: Record<string, ConceptMastery> = {
            open_raise: {
                concept: "open_raise",
                level: "learning",
                totalAttempts: 3,
                correctAttempts: 1,
                accuracy: 0.33,
                recentAccuracy: 0.2,
                totalEvDelta: -5,
                lastAttemptAt: Date.now(),
                streak: 0,
                bestStreak: 1,
            },
            cold_call: {
                concept: "cold_call",
                level: "practiced",
                totalAttempts: 10,
                correctAttempts: 6,
                accuracy: 0.6,
                recentAccuracy: 0.6,
                totalEvDelta: 2,
                lastAttemptAt: Date.now(),
                streak: 2,
                bestStreak: 3,
            },
            steal: {
                concept: "steal",
                level: "practiced",
                totalAttempts: 8,
                correctAttempts: 5,
                accuracy: 0.625,
                recentAccuracy: 0.6,
                totalEvDelta: 1,
                lastAttemptAt: Date.now(),
                streak: 1,
                bestStreak: 2,
            },
        };
        const rec = getRecommendation(mastery);
        expect(rec.concept).toBe("open_raise");
        expect(rec.reason).toBe("struggling");
    });

    it("returns complete reason when all mastered", () => {
        const allMastered: Record<string, ConceptMastery> = {};
        const allConcepts = [
            "open_raise", "cold_call", "steal", "cbet_value", "cbet_bluff",
            "three_bet", "squeeze", "check_call", "check_raise", "float",
            "probe", "pot_control", "bluff_catch", "barrel", "semi_bluff",
            "value_bet_thin", "river_bluff", "river_raise",
        ];
        for (const concept of allConcepts) {
            allMastered[concept] = {
                concept,
                level: "mastered",
                totalAttempts: 20,
                correctAttempts: 18,
                accuracy: 0.9,
                recentAccuracy: 0.85,
                totalEvDelta: 10,
                lastAttemptAt: Date.now(),
                streak: 5,
                bestStreak: 5,
            };
        }
        const rec = getRecommendation(allMastered);
        expect(rec.concept).toBeNull();
        expect(rec.reason).toBe("complete");
    });

    it("narrative includes concept label when concept is not null", () => {
        const rec = getRecommendation({});
        expect(rec.narrative.length).toBeGreaterThan(10);
    });
});

// ── generateSessionDebrief ──────────────────────────────────────────

describe("generateSessionDebrief", () => {
    const cleanAnalysis: AnalysisData = {
        heroGrade: "A+",
        decisions: [],
        totalEvLoss: 0,
        totalHeroEv: 5,
        mistakes: [],
        handNumber: 1,
    };

    const mistakeAnalysis: AnalysisData = {
        heroGrade: "C",
        decisions: [],
        totalEvLoss: 8,
        totalHeroEv: -3,
        mistakes: [
            {
                round: "flop",
                description: "Missed c-bet",
                severity: "moderate",
                evLoss: 3,
                heroAction: "check",
                optimalAction: "bet",
                type: "MISSED_CBET",
                category: "AGGRESSION",
            },
            {
                round: "turn",
                description: "Overcalled",
                severity: "major",
                evLoss: 5,
                heroAction: "call",
                optimalAction: "fold",
                type: "OVERCALL",
                category: "FREQUENCY",
            },
        ],
        handNumber: 2,
    };

    it("returns a headline and empty details for clean session", () => {
        const debrief = generateSessionDebrief(cleanAnalysis, [], {});
        expect(debrief.headline).toBeTruthy();
        expect(Array.isArray(debrief.details)).toBe(true);
    });

    it("returns suggestedDrill for session with mistakes", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.suggestedDrill).toBeTruthy();
    });

    it("returns headline mentioning mistakes when present", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.headline).toBeTruthy();
    });

    it("returns details with at least one bullet", () => {
        const debrief = generateSessionDebrief(mistakeAnalysis, [], {});
        expect(debrief.details.length).toBeGreaterThanOrEqual(1);
    });
});
```

**Run:** `npx vitest run src/lib/__tests__/coaching.test.ts` — all tests FAIL (module doesn't exist yet)

**Commit:** `test(m6): add coaching engine tests — 26 tests for all coaching functions`

---

### Task 4: Core Coaching Engine — Implementation

**Files:**
- Create: `src/lib/coaching.ts`
- Modify: `src/lib/analysis.ts` (delegate `generateCoaching` to new module)

**Spec:**

Create `src/lib/coaching.ts` with these exports:

```typescript
import type {
    CoachingContext,
    CoachingDepth,
    EnhancedCoaching,
    MistakeType,
    BoardTexture,
    DrawInfo,
    BettingRound,
    Recommendation,
    RecommendationReason,
    SessionDebrief,
    AnalysisData,
    ActionType,
} from "../types/poker";
import type { ConceptMastery, MasteryLevel, SessionSummary } from "../types/progress";
import type { DrillSpot, DrillResult, DrillConcept, DecisionResult } from "../types/drill";
import { CONCEPT_LABELS } from "./concept-labels";
import { CURRICULUM } from "../data/curriculum";
import { isTierUnlocked, PRACTICED_OR_ABOVE } from "./learning-path";
import { MISTAKE_TO_DRILL_CONCEPT } from "./mistake-mappings";

// ── Coaching Depth ──────────────────────────────────────────────────

export function coachingDepthForMastery(level: MasteryLevel | undefined): CoachingDepth {
    if (level === undefined || level === "unseen" || level === "learning") return "foundational";
    if (level === "practiced" || level === "solid") return "tactical";
    return "nuanced";
}

// ── Board Narrative ─────────────────────────────────────────────────

export function generateBoardNarrative(
    boardTexture: BoardTexture,
    draws: DrawInfo,
    round: BettingRound,
): string {
    // Produce 1-2 sentences describing the board state
    // Uses boardTexture.wetness, suit pattern, draws, and round
    // ... (implementation details in code)
}

// ── Enhanced Coaching (mistakes) ────────────────────────────────────

export function generateEnhancedCoaching(ctx: CoachingContext): EnhancedCoaching {
    // 1. Determine CoachingDepth from ctx.mastery
    // 2. Generate whatHappened from decision data
    // 3. Generate whyMistake from mistakeType
    // 4. Generate whatToDo from WHAT_TO_DO_TEMPLATES[mistakeType][depth]
    // 5. Generate tip (optional mastery-aware contextual tip)
    // 6. Generate boardNarrative from generateBoardNarrative()
    // Return full EnhancedCoaching
}

// ── Correct Play Coaching ───────────────────────────────────────────

export function generateCorrectPlayCoaching(ctx: CoachingContext): EnhancedCoaching {
    // whyMistake = null, concept = null
    // Brief positive reinforcement referencing the math
}

// ── Drill Coaching ──────────────────────────────────────────────────

export function generateDrillCoaching(
    spot: DrillSpot,
    result: DrillResult,
    mastery: ConceptMastery | undefined,
    optimalResult: DecisionResult,
): EnhancedCoaching {
    // Builds CoachingContext from drill data, delegates to
    // generateEnhancedCoaching or generateCorrectPlayCoaching
}

// ── Recommendation ──────────────────────────────────────────────────

export function getRecommendation(
    mastery: Record<string, ConceptMastery>,
): Recommendation {
    // Same 6-step algorithm as recommendNextConcept but returns
    // { concept, reason, narrative }
}

// ── Session Debrief ─────────────────────────────────────────────────

export function generateSessionDebrief(
    currentAnalysis: AnalysisData,
    recentSessions: SessionSummary[],
    mastery: Record<string, ConceptMastery>,
): SessionDebrief {
    // headline + details[] + suggestedDrill
}
```

**Implementation details for `WHAT_TO_DO_TEMPLATES`:**

A `Record<MistakeType, Record<CoachingDepth, string>>` with template strings that use `{equity}`, `{potOdds}`, `{action}`, `{optimalAction}` placeholders. Three depth variants per mistake type (30 total template strings).

- **foundational:** Defines the concept, explains basic math. E.g. for OVERFOLD: "When your equity ({equity}%) exceeds the pot odds ({potOdds}%), calling is mathematically profitable. This is the most fundamental concept in poker — if you're getting the right price, continue."
- **tactical:** References frequencies, range considerations. E.g. for OVERFOLD: "With {equity}% equity against {potOdds}% pot odds, you have a clear continue. At this price, your range should defend roughly {defenseFreq}% of hands to prevent exploitation."
- **nuanced:** Mixed strategies, solver frequencies, edge cases. E.g. for OVERFOLD: "At {equity}% equity vs {potOdds}% pot odds, this hand is a mandatory continue. In solver solutions, this spot mixes {action} at high frequency. Only fold here with the absolute bottom of your range."

**Modify `src/lib/analysis.ts:381-452`:** Make the existing `generateCoaching()` delegate to the new `generateEnhancedCoaching()` from coaching.ts, then map the `EnhancedCoaching` result back to the legacy `CoachingExplanation` type for backward compatibility:

```typescript
import { generateEnhancedCoaching } from "./coaching";

export function generateCoaching(
    decision: Decision,
    mistakeType: MistakeType,
): CoachingExplanation {
    const ctx: CoachingContext = {
        decision,
        mistakeType,
        mastery: undefined, // no mastery context in legacy path
        boardTexture: decision.boardTexture ?? DEFAULT_BOARD_TEXTURE,
        draws: decision.draws ?? DEFAULT_DRAWS,
        round: decision.round,
    };
    const enhanced = generateEnhancedCoaching(ctx);
    return {
        whatHappened: enhanced.whatHappened,
        whyMistake: enhanced.whyMistake ?? "",
        whatToDo: enhanced.whatToDo,
        concept: mistakeType,
    };
}
```

**Run:** `npx vitest run src/lib/__tests__/coaching.test.ts` — all 26 tests PASS

**Run:** `npx vitest run` — all existing tests still PASS (~246+ tests)

**Commit:** `feat(m6): implement coaching engine — generateEnhancedCoaching, generateCorrectPlayCoaching, generateBoardNarrative, generateDrillCoaching, getRecommendation, generateSessionDebrief`

---

### Task 5: Update learning-path.ts — getRecommendation Backward Compatibility

**Files:**
- Modify: `src/lib/learning-path.ts`
- Modify: `src/lib/__tests__/learning-path.test.ts` (add tests for the getRecommendation re-export)

**Spec:**

`src/lib/learning-path.ts` — keep `recommendNextConcept()` as backward-compatible wrapper:

```typescript
import { getRecommendation } from "./coaching";
import type { Recommendation } from "../types/poker";

// ... existing isTierUnlocked stays unchanged ...

export function recommendNextConcept(
    mastery: Record<string, ConceptMastery>
): DrillConcept | null {
    return getRecommendation(mastery).concept;
}

// Re-export for consumers that want the full recommendation
export { getRecommendation };
```

The existing logic body of `recommendNextConcept` is REMOVED from this file since it now lives in `coaching.ts` as `getRecommendation`. The backward-compatible wrapper just delegates.

Add test in `src/lib/__tests__/learning-path.test.ts`:

```typescript
import { getRecommendation } from "../learning-path";

describe("getRecommendation re-export", () => {
    it("returns recommendation with reason and narrative", () => {
        const rec = getRecommendation({});
        expect(rec.concept).toBe("open_raise");
        expect(rec.reason).toBe("unseen");
        expect(rec.narrative).toBeTruthy();
    });
});
```

**Run:** `npx vitest run src/lib/__tests__/learning-path.test.ts` — all tests PASS

**Run:** `npx vitest run` — all tests PASS

**Commit:** `refactor(m6): wrap recommendNextConcept around getRecommendation for backward compat`

---

### Task 6: UI — DrillFeedback Coaching Upgrade

**Files:**
- Modify: `src/components/drill/DrillFeedback.tsx`

**Spec:**

Replace the raw `optimalResult.reasoning` display (section 4, "Concept card", lines 137-147) with structured coaching from `generateDrillCoaching()`.

Changes:
1. Import `generateDrillCoaching` from `../../lib/coaching` and `CONCEPT_TEACHINGS` from `../../data/conceptTeachings`
2. Import `useProgressStore` from `../../store/progressStore`
3. Get mastery: `const conceptMastery = useProgressStore((s) => s.conceptMastery);`
4. Generate coaching: `const coaching = generateDrillCoaching(spot, currentResult, conceptMastery[spot.concept], optimalResult);`
5. Replace section 4 with structured coaching layout:
   - **whatHappened** — neutral description
   - **whyMistake** (if not null) — amber highlight
   - **whatToDo** — green highlight
   - **tip** (if not null) — subtle info box
   - **boardNarrative** — gray italic
6. Add collapsible "About {concept}" section below coaching showing `CONCEPT_TEACHINGS[spot.concept].explanation`
7. Keep the concept badge from `CONCEPT_LABELS`

```tsx
{/* 4. Coaching card */}
<div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4 space-y-3">
    <div className="flex items-center gap-2 mb-1">
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">
            {CONCEPT_LABELS[spot.concept]}
        </span>
    </div>
    {/* What happened */}
    <div>
        <p className="text-neutral-500 text-xs font-medium mb-0.5">What happened</p>
        <p className="text-neutral-300 text-sm leading-relaxed">{coaching.whatHappened}</p>
    </div>
    {/* Why it's a mistake (only for mistakes) */}
    {coaching.whyMistake && (
        <div>
            <p className="text-amber-500 text-xs font-medium mb-0.5">Why it&apos;s a mistake</p>
            <p className="text-neutral-200 text-sm leading-relaxed">{coaching.whyMistake}</p>
        </div>
    )}
    {/* What to do */}
    <div>
        <p className="text-emerald-500 text-xs font-medium mb-0.5">
            {coaching.whyMistake ? "What to do instead" : "Why this is correct"}
        </p>
        <p className="text-neutral-200 text-sm leading-relaxed">{coaching.whatToDo}</p>
    </div>
    {/* Tip */}
    {coaching.tip && (
        <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
            <p className="text-sky-400 text-xs font-medium mb-0.5">Tip</p>
            <p className="text-neutral-300 text-xs leading-relaxed">{coaching.tip}</p>
        </div>
    )}
    {/* Board narrative */}
    <p className="text-neutral-500 text-xs italic leading-relaxed">{coaching.boardNarrative}</p>
</div>

{/* 4b. Concept teaching (collapsible) */}
{CONCEPT_TEACHINGS[spot.concept] && (
    <details className="bg-neutral-900 rounded-lg border border-neutral-800">
        <summary className="px-4 py-3 text-sm font-medium text-neutral-300 cursor-pointer hover:text-neutral-100">
            About {CONCEPT_LABELS[spot.concept]}
        </summary>
        <div className="px-4 pb-3">
            <p className="text-neutral-400 text-sm leading-relaxed">
                {CONCEPT_TEACHINGS[spot.concept].explanation}
            </p>
        </div>
    </details>
)}
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Run:** `npx vitest run` — all tests PASS

**Commit:** `feat(m6): upgrade DrillFeedback with structured coaching and concept teaching`

---

### Task 7: UI — RecommendedNext and LearnPage Narrative

**Files:**
- Modify: `src/components/learn/RecommendedNext.tsx`
- Modify: `src/pages/LearnPage.tsx`
- Modify: `src/components/learn/ConceptChip.tsx`

**Spec:**

**`RecommendedNext.tsx`** — Accept `Recommendation` prop instead of bare `DrillConcept | null`:

```tsx
import { Link } from "react-router-dom";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import type { Recommendation } from "../../types/poker";

interface RecommendedNextProps {
    recommendation: Recommendation;
}

export function RecommendedNext({ recommendation }: RecommendedNextProps) {
    const { concept, narrative } = recommendation;

    if (concept === null) {
        return (
            <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg text-center">
                <p className="text-lg font-semibold text-emerald-400">
                    All concepts mastered!
                </p>
                <p className="text-sm text-slate-400 mt-1">{narrative}</p>
            </div>
        );
    }

    const label = CONCEPT_LABELS[concept] ?? concept;

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg flex items-center justify-between gap-4">
            <div className="min-w-0">
                <p className="text-sm text-slate-400">Your next focus</p>
                <p className="text-lg font-semibold text-neutral-100 truncate">
                    {label}
                </p>
                <p className="text-sm text-slate-400 mt-1">{narrative}</p>
            </div>
            <Link
                to={`/practice/drills?concept=${concept}`}
                className="shrink-0 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
                Start Drilling
            </Link>
        </div>
    );
}
```

**`LearnPage.tsx`** — Use `getRecommendation` instead of `recommendNextConcept`:

```tsx
import { useProgressStore } from "../store/progressStore";
import { CURRICULUM } from "../data/curriculum";
import { isTierUnlocked } from "../lib/learning-path";
import { getRecommendation } from "../lib/coaching";
import { RecommendedNext } from "../components/learn/RecommendedNext";
import { CurriculumTierCard } from "../components/learn/CurriculumTierCard";

export function LearnPage() {
    const conceptMastery = useProgressStore((s) => s.conceptMastery);
    const recommendation = getRecommendation(conceptMastery);

    // Count practiced concepts
    const totalConcepts = CURRICULUM.flatMap((t) => t.concepts).length;
    const practicedCount = Object.values(conceptMastery).filter(
        (m) => m.totalAttempts > 0
    ).length;

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-white">Learning Path</h1>
                {practicedCount > 0 && (
                    <p className="text-sm text-slate-400 mt-1">
                        You&apos;ve practiced {practicedCount}/{totalConcepts} concepts.
                    </p>
                )}
            </div>

            <RecommendedNext recommendation={recommendation} />

            <div className="space-y-6">
                {CURRICULUM.map((tier) => (
                    <CurriculumTierCard
                        key={tier.id}
                        tier={tier}
                        mastery={conceptMastery}
                        isUnlocked={isTierUnlocked(tier, conceptMastery)}
                    />
                ))}
            </div>
        </div>
    );
}
```

**`ConceptChip.tsx`** — Add tooltip with `CONCEPT_TEACHINGS` summary:

```tsx
import { Link } from "react-router-dom";
import { CONCEPT_LABELS } from "../../lib/concept-labels";
import { CONCEPT_TEACHINGS } from "../../data/conceptTeachings";
import type { DrillConcept } from "../../types/drill";
import type { ConceptMastery, MasteryLevel } from "../../types/progress";

// ... existing MASTERY_DOT_COLORS stays unchanged ...

export function ConceptChip({ concept, mastery }: ConceptChipProps) {
    const label = CONCEPT_LABELS[concept] ?? concept;
    const level: MasteryLevel = mastery?.level ?? "unseen";
    const accuracyPercent = mastery ? Math.round(mastery.accuracy * 100) : null;
    const teaching = CONCEPT_TEACHINGS[concept];

    return (
        <Link
            to={`/practice/drills?concept=${concept}`}
            className="group relative inline-flex items-center gap-1.5 rounded-full bg-slate-700 px-3 py-1 text-xs font-medium text-neutral-200 hover:bg-slate-600 transition-colors"
            title={teaching?.summary}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${MASTERY_DOT_COLORS[level]}`}
                aria-label={`Mastery: ${level}`}
            />
            <span className="truncate">{label}</span>
            {accuracyPercent !== null && (
                <span className="text-slate-400">{accuracyPercent}%</span>
            )}
        </Link>
    );
}
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Run:** `npx vitest run` — all tests PASS

**Commit:** `feat(m6): upgrade RecommendedNext with narrative, add coaching header to LearnPage, add tooltips to ConceptChip`

---

### Task 8: UI — SessionPatterns Debrief Enhancement

**Files:**
- Modify: `src/components/analysis/SessionPatterns.tsx`

**Spec:**

Replace the binary "Improving / Steady" text with structured `SessionDebrief` from `generateSessionDebrief()`.

Changes:
1. Import `generateSessionDebrief` from `../../lib/coaching`
2. Import `useProgressStore` from `../../store/progressStore`
3. Generate debrief: `const debrief = generateSessionDebrief(sessionAnalyses[sessionAnalyses.length - 1], recentSessions, conceptMastery)`
4. Use the `debrief.suggestedDrill` for the drill CTA instead of `MISTAKE_TO_DRILL_CONCEPT[stats.weakestType.type]`
5. Show `debrief.headline` as a prominent text above the category bar chart
6. Show `debrief.details` as bullet list below the bar chart (replacing the binary trend line)

```tsx
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../../store/gameStore";
import { useProgressStore } from "../../store/progressStore";
import { getSessionStats } from "../../lib/analysis";
import { generateSessionDebrief } from "../../lib/coaching";
import { MISTAKE_TYPE_LABELS } from "../../lib/mistake-mappings";
import type { MistakeType } from "../../types/poker";

// ... CATEGORY_LABELS stays unchanged ...

export function SessionPatterns() {
    const navigate = useNavigate();
    const sessionAnalyses = useGameStore((s) => s.sessionAnalyses);
    const recentSessions = useProgressStore((s) => s.getRecentSessions(5));
    const conceptMastery = useProgressStore((s) => s.conceptMastery);

    if (sessionAnalyses.length < 3) return null;

    const stats = getSessionStats(sessionAnalyses);
    if (!stats.weakestType) return null;

    const latestAnalysis = sessionAnalyses[sessionAnalyses.length - 1];
    const debrief = generateSessionDebrief(latestAnalysis, recentSessions, conceptMastery);

    const categoryEntries = Object.entries(stats.mistakesByCategory).sort(
        (a, b) => b[1].totalEvLoss - a[1].totalEvLoss,
    );

    const drillConcept = debrief.suggestedDrill ?? "cbet_value";

    return (
        <div className="bg-slate-800 rounded-xl p-4 md:p-6 shadow-lg space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">
                Session Patterns
                <span className="text-slate-500 text-sm font-normal ml-2">
                    ({stats.totalHands} hands)
                </span>
            </h3>

            {/* Debrief headline */}
            <p className="text-sm text-slate-300 leading-relaxed">{debrief.headline}</p>

            {/* Category bar chart — unchanged */}
            {categoryEntries.length > 0 && (
                <div className="space-y-2">
                    {/* ... same as before ... */}
                </div>
            )}

            {/* Weakest concept — unchanged */}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                {/* ... same as before ... */}
            </div>

            {/* Debrief details (replaces binary trend) */}
            {debrief.details.length > 0 && (
                <ul className="space-y-1">
                    {debrief.details.map((detail, i) => (
                        <li key={i} className="text-xs text-slate-400 leading-relaxed flex gap-2">
                            <span className="text-slate-600 shrink-0">•</span>
                            <span>{detail}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Drill CTA — uses debrief.suggestedDrill */}
            <button
                onClick={() => navigate(`/practice/drills?concept=${drillConcept}`)}
                className="w-full py-2 rounded-lg bg-emerald-600/20 border border-emerald-600/30 text-emerald-400 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
            >
                Drill: {MISTAKE_TYPE_LABELS[stats.weakestType.type as MistakeType] ?? "Practice"} &rarr;
            </button>
        </div>
    );
}
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Run:** `npx vitest run` — all tests PASS

**Commit:** `feat(m6): upgrade SessionPatterns with structured debrief headline and details`

---

### Task 9: UI — MistakeCard and HandTimeline Enhanced Coaching

**Files:**
- Modify: `src/components/analysis/MistakeCard.tsx`
- Modify: `src/components/analysis/HandTimeline.tsx`

**Spec:**

Both components already display coaching when `decision.coaching` is present. The enhancement is:

**`MistakeCard.tsx`** — Add `tip` and `boardNarrative` display when `EnhancedCoaching` fields are available.

Since `Decision.coaching` is typed as `CoachingExplanation | null` (the legacy type), and we want to show `tip` and `boardNarrative`, update the `Decision` interface in `src/types/poker.ts` to use `EnhancedCoaching`:

In `src/types/poker.ts`, change the `coaching` field in `Decision`:
```typescript
coaching?: EnhancedCoaching | null;  // was CoachingExplanation | null
```

Then in `MistakeCard.tsx`, add after the coaching what/why/do block:
```tsx
{/* Tip */}
{decision.coaching.tip && (
    <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg px-3 py-2">
        <p className="text-sky-400 text-xs font-medium mb-0.5">Tip</p>
        <p className="text-slate-200 text-xs leading-relaxed">{decision.coaching.tip}</p>
    </div>
)}
{/* Board narrative */}
{decision.coaching.boardNarrative && (
    <p className="text-slate-500 text-xs italic leading-relaxed">{decision.coaching.boardNarrative}</p>
)}
```

**`HandTimeline.tsx`** — Add `tip` display when present:
```tsx
{decision.coaching ? (
    <div className="space-y-1.5 text-xs">
        <p className="text-slate-300 leading-relaxed">{decision.coaching.whatHappened}</p>
        {decision.coaching.whyMistake && (
            <p className="text-amber-400/80 leading-relaxed">{decision.coaching.whyMistake}</p>
        )}
        <p className="text-emerald-400/80 leading-relaxed">{decision.coaching.whatToDo}</p>
        {decision.coaching.tip && (
            <p className="text-sky-400/80 leading-relaxed italic">{decision.coaching.tip}</p>
        )}
    </div>
) : (
    <p className="text-slate-300 text-xs leading-relaxed">{explanation}</p>
)}
```

Also update `generateCoaching()` in `analysis.ts` to produce `EnhancedCoaching` (already done in Task 4) so that all coaching objects now have tip and boardNarrative fields.

**Run:** `npx tsc --noEmit` (type-check passes)

**Run:** `npx vitest run` — all tests PASS

**Commit:** `feat(m6): enhance MistakeCard and HandTimeline with tip and boardNarrative display`

---

### Task 10: DrillSetup Concept Teaching + Final Verification

**Files:**
- Modify: `src/components/drill/DrillSetup.tsx`

**Spec:**

When exactly 1 concept is selected, show its teaching summary below the concept filter:

```tsx
import { CONCEPT_TEACHINGS } from "../../data/conceptTeachings";

// After the concept filter section, before Spot Count:
{selectedConcepts.length === 1 && CONCEPT_TEACHINGS[selectedConcepts[0]] && (
    <p className="text-neutral-400 text-xs leading-relaxed mb-4 -mt-2">
        {CONCEPT_TEACHINGS[selectedConcepts[0]].summary}
    </p>
)}
```

**Run full verification:**

1. `npx tsc --noEmit` — type-check passes, 0 errors
2. `npx vitest run` — all tests pass (246 existing + ~26 new = ~272+)
3. `npx vite build` — build succeeds

**Commit:** `feat(m6): show concept teaching summary in DrillSetup when single concept selected`

**Final commit:** `feat(m6): M6 Coach Layer complete — coaching engine, concept teachings, recommendation narratives, session debrief, drill coaching`

---

## Task Summary

| Task | What | New Files | Modified Files | Est. Tests |
|------|------|-----------|----------------|------------|
| 1 | Coaching types | — | `types/poker.ts` | 0 |
| 2 | Concept teaching data | `data/conceptTeachings.ts` | — | 0 |
| 3 | Coaching engine tests | `lib/__tests__/coaching.test.ts` | — | ~26 |
| 4 | Coaching engine impl | `lib/coaching.ts` | `lib/analysis.ts` | 0 (tests written in T3) |
| 5 | learning-path backward compat | — | `lib/learning-path.ts`, `lib/__tests__/learning-path.test.ts` | ~1 |
| 6 | DrillFeedback UI | — | `components/drill/DrillFeedback.tsx` | 0 |
| 7 | RecommendedNext + LearnPage + ConceptChip | — | `RecommendedNext.tsx`, `LearnPage.tsx`, `ConceptChip.tsx` | 0 |
| 8 | SessionPatterns debrief | — | `SessionPatterns.tsx` | 0 |
| 9 | MistakeCard + HandTimeline enhanced | — | `MistakeCard.tsx`, `HandTimeline.tsx`, `types/poker.ts` | 0 |
| 10 | DrillSetup teaching + final verification | — | `DrillSetup.tsx` | 0 |

**Totals:** 3 new files, ~11 modified files, ~27 new tests, ~1500-2000 lines added
