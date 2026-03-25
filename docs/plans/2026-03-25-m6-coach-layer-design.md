# M6: Coach Layer — Design Document

**Goal:** Transform raw GTO analysis output into adaptive, mastery-aware coaching across all surfaces — review, drills, learning path, and session debrief.

**Approach:** Template engine with mastery-aware variants. All client-side, deterministic, no new infrastructure.

**Not in scope:** LLM-powered coaching (needs backend), attempt history for "you've seen this N times" (needs persistence — M7), opponent-specific coaching.

---

## 1. Enhanced Coaching Explanation Engine

### Problem

`generateCoaching()` produces one-size-fits-all template strings per `MistakeType` with interpolated numbers. No adaptation for skill level, no variation for repeated mistakes, no board-context narrative. Coaching only generated for mistakes — correct plays get no feedback.

### Design

Create `src/lib/coaching.ts` as the central coaching module. Existing `generateCoaching()` in `analysis.ts` delegates to the new module.

#### CoachingContext and EnhancedCoaching

```typescript
interface CoachingContext {
    decision: Decision;
    mistakeType: MistakeType | null;      // null for correct plays
    mastery: ConceptMastery | undefined;
    boardTexture: BoardTexture;
    draws: DrawInfo;
    round: BettingRound;
}

interface EnhancedCoaching {
    whatHappened: string;
    whyMistake: string | null;            // null for correct plays
    whatToDo: string;
    tip: string | null;                    // mastery-aware contextual tip
    boardNarrative: string;               // human-readable board description
    concept: MistakeType | null;
}
```

#### Skill-Level Variants

The `whatToDo` field has 3 depth tiers selected by mastery level:

| Mastery Level | Depth | Style |
|---------------|-------|-------|
| unseen, learning | foundational | Defines the concept, explains basic math |
| practiced, solid | tactical | References frequencies, range considerations |
| mastered | nuanced | Mixed strategies, solver frequencies, edge cases |

Implementation: `whatToDo` templates organized as `Record<MistakeType, Record<CoachingDepth, string>>` where `CoachingDepth = "foundational" | "tactical" | "nuanced"`. Template strings use `{equity}`, `{potOdds}`, `{action}` placeholders filled at runtime.

#### Correct-Play Coaching

When a decision matches the optimal action, generate brief positive reinforcement:

```typescript
function generateCorrectPlayCoaching(ctx: CoachingContext): EnhancedCoaching
```

- `whatHappened`: "You chose to {action} on the {round}."
- `whyMistake`: null
- `whatToDo`: Brief reinforcement referencing the math. "With {equity}% equity against a pot odds requirement of {potOdds}%, {action} is the +EV play."
- `tip`: Contextual tip if the play was close to mixed. "This is a close spot — the solver mixes {action1}/{action2} at {freq1}/{freq2}. Your choice is within the correct range."

#### Board Texture Narrative

```typescript
function generateBoardNarrative(
    boardTexture: BoardTexture,
    draws: DrawInfo,
    communityCards: Card[],
    round: BettingRound
): string
```

Produces 1-2 sentences describing the board state in coaching-friendly language:

- Flop: "The flop is {wetness} with {suit pattern}. {draw description}."
- Turn: "The {rank} on the turn {changes the dynamic / completes draws / bricks}."
- River: "Final board: {texture summary}. {missed draw / completed draw} implications."

Examples:
- "The flop is dry and unconnected (9-4-2 rainbow). C-bet should be small and frequent on boards like this."
- "The turn brings a flush-completing spade. This card often slows down aggression from the preflop raiser."

---

## 2. Drill Feedback Coaching

### Problem

DrillFeedback shows raw engine `reasoning` — a factual EV dump. No structured coaching, no concept teaching, no positive reinforcement for correct answers.

### Design

Add `generateDrillCoaching()` to `src/lib/coaching.ts`:

```typescript
function generateDrillCoaching(
    spot: DrillSpot,
    result: DrillResult,
    mastery: ConceptMastery | undefined,
    optimalResult: DecisionResult
): EnhancedCoaching
```

- **Correct answer:** `whatHappened` describes the correct read. `whatToDo` reinforces the concept at the player's mastery depth. `boardNarrative` provides context.
- **Wrong answer:** Full 3-part coaching (whatHappened / whyMistake / whatToDo) adapted to mastery level.

**UI change in `DrillFeedback.tsx`:** Replace the raw `optimalResult.reasoning` display with the structured coaching layout (whatHappened / whyMistake / whatToDo / tip) matching the MistakeCard pattern. Keep the GTO Frequency Bar and EV Comparison unchanged.

---

## 3. Recommendation Reasoning

### Problem

`recommendNextConcept()` returns bare `DrillConcept | null`. The UI says "Your next focus: Open Raise" with zero explanation of why.

### Design

#### Recommendation Type

```typescript
interface Recommendation {
    concept: DrillConcept | null;
    reason: RecommendationReason;
    narrative: string;
}

type RecommendationReason =
    | "unseen"
    | "struggling"
    | "reinforce"
    | "advance"
    | "stale"
    | "complete";
```

#### Updated recommendNextConcept

Rename to `getRecommendation()` to reflect the richer return type. Internally follows the same 6-step priority algorithm but tags each return with reason and narrative:

| Step | Reason | Narrative Template |
|------|--------|-------------------|
| 1 (unseen in unlocked tier) | `unseen` | "{concept} is your next focus — you haven't practiced it yet. It's part of the {tier} tier." |
| 2 (weakest learning) | `struggling` | "{concept} needs work — your recent accuracy is {accuracy}%. Focus on building consistency." |
| 3 (weakest practiced) | `reinforce` | "{concept} is progressing — at {accuracy}% accuracy, more correct reps will lock it in." |
| 4 (stalest solid) | `stale` | "{concept} might be getting rusty — last practiced {timeAgo}. A quick refresher keeps it sharp." |
| 5 (unseen in locked tier) | `advance` | "Ready to advance! Start {concept} in the {tier} tier to build on your foundations." |
| 6 (all mastered) | `complete` | "All concepts mastered. Keep drilling to maintain your edge." |

#### Backward Compatibility

Keep `recommendNextConcept()` as a thin wrapper: `return getRecommendation(mastery).concept`. Existing consumers (Learn page URL routing) don't break.

#### UI Updates

- **RecommendedNext:** Shows `recommendation.narrative` instead of just the concept label.
- **LearnPage:** Adds a 1-2 sentence coaching header summarizing mastery progress. "You've practiced {practiced}/{total} concepts. {masteryNarrative}."

---

## 4. Session Debrief Enhancement

### Problem

`SessionPatterns` shows a binary "Improving / Steady" one-liner. No personalized session narrative explaining patterns or actionable next steps.

### Design

```typescript
function generateSessionDebrief(
    currentAnalysis: AnalysisData,
    recentSessions: SessionSummary[],
    mastery: Record<string, ConceptMastery>
): SessionDebrief

interface SessionDebrief {
    headline: string;       // 1-sentence summary
    details: string[];      // 1-3 bullet points
    suggestedDrill: DrillConcept | null;
}
```

**Headline templates:**
- First session: "Welcome to your first review. Let's see how you played."
- Clean session (0 mistakes): "Strong session — no GTO mistakes detected."
- Single category dominant: "Most of your mistakes were {category}-related. Let's work on that."
- Mixed mistakes: "A few areas to work on — review the breakdown below."

**Detail bullet templates:**
- Repeat pattern: "You've made {type} mistakes in {count} of your last {n} sessions — this is your biggest leak."
- Improvement: "Your {category} mistakes are trending down — {recentCount} vs {previousCount} previously."
- New mistake: "First time seeing a {type} mistake. Read the coaching below."
- Weakness spotlight: "Your weakest concept is {concept} at {accuracy}% accuracy."

**UI change in `SessionPatterns.tsx`:** Replace the binary trend line with the structured debrief (headline + details). Keep the category bar chart. The `suggestedDrill` drives the existing "Practice this" CTA.

---

## 5. Concept Teaching Snippets

### Problem

No educational content explains what each concept IS. Drill spots have a `description` (scenario setup) but no teaching content. The Learn page shows concept chips with no explanation.

### Design

Create `src/data/conceptTeachings.ts`:

```typescript
export const CONCEPT_TEACHINGS: Record<DrillConcept, ConceptTeaching> = { ... };

interface ConceptTeaching {
    summary: string;        // 1 sentence for tooltips/chips
    explanation: string;    // 2-3 sentences for expanded view
}
```

All 18 concepts get hand-crafted entries:

| Concept | Summary (1 sentence) |
|---------|---------------------|
| open_raise | Opening raises establish initiative — GTO ranges widen as position improves. |
| cold_call | Cold calling requires strong hands because you face multiple opponents without initiative. |
| steal | Blind stealing exploits fold equity from late position with a wide range. |
| cbet_value | Value c-bets leverage your preflop aggression on boards favoring your range. |
| cbet_bluff | Bluff c-bets use board coverage and blockers to deny equity cheaply. |
| three_bet | 3-betting for value and as bluffs narrows the field and builds pots with strong ranges. |
| squeeze | Squeezing exploits dead money when facing an open and one or more callers. |
| check_call | Check-calling defends your range at the correct frequency against aggression. |
| check_raise | Check-raising as a semi-bluff or for value traps aggressive opponents. |
| float | Floating in position takes pots away when the aggressor gives up on later streets. |
| probe | Probe betting exploits a missed c-bet to take initiative on the turn. |
| pot_control | Pot control keeps the pot small with medium-strength hands to avoid costly mistakes. |
| bluff_catch | Bluff-catching identifies spots where your hand beats bluffs but loses to value. |
| barrel | Multi-street barreling applies maximum pressure with coordinated value and bluff ranges. |
| semi_bluff | Semi-bluffing combines fold equity with draw equity for a +EV aggressive play. |
| value_bet_thin | Thin value betting extracts chips from worse hands that might fold to larger bets. |
| river_bluff | River bluffs target the right frequency with hands that have no showdown value. |
| river_raise | River raises for value polarize your range — only raise with the nuts or as a bluff. |

**Display surfaces:**
- **DrillFeedback:** Collapsible "About {concept}" section below coaching. Shows `explanation`.
- **ConceptChip (Learn page):** Tooltip showing `summary` on hover/tap.
- **DrillSetup:** When exactly 1 concept is selected, show its `summary` below the filter.

---

## 6. Architecture Summary

```
┌─────────────────────────────────────────────────┐
│                src/lib/coaching.ts               │
│  (new central coaching module)                   │
│                                                  │
│  generateEnhancedCoaching(ctx) → EnhancedCoaching│
│  generateDrillCoaching(spot, result, mastery)    │
│  generateCorrectPlayCoaching(ctx)                │
│  generateBoardNarrative(texture, draws, round)   │
│  generateSessionDebrief(analysis, sessions, m.)  │
│  getRecommendation(mastery) → Recommendation     │
│  coachingDepthForMastery(level) → CoachingDepth  │
└─────────────────────────────┬───────────────────┘
                              │ consumed by
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
  analysis.ts          DrillFeedback.tsx      LearnPage.tsx
  (delegates to        (structured           (recommendation
   coaching.ts)         coaching)              narrative)
        │                     │
        ▼                     ▼
  MistakeCard.tsx      SessionPatterns.tsx
  HandTimeline.tsx     (session debrief)
```

**New files:** 2 (`src/lib/coaching.ts`, `src/data/conceptTeachings.ts`)
**Modified files:** ~10 (`analysis.ts`, `learning-path.ts`, `DrillFeedback.tsx`, `MistakeCard.tsx`, `HandTimeline.tsx`, `SessionPatterns.tsx`, `RecommendedNext.tsx`, `LearnPage.tsx`, `ConceptChip.tsx`, `DrillSetup.tsx`, `types/poker.ts`)
**New types:** `EnhancedCoaching`, `CoachingContext`, `CoachingDepth`, `Recommendation`, `RecommendationReason`, `SessionDebrief`, `ConceptTeaching`
**Estimated tests:** ~25-30 tests for coaching functions
**Estimated lines:** ~1500-2000 added

---

## 7. What's NOT Included

- No LLM/API integration — all template-based, client-side
- No new Zustand stores — coaching is pure functions consuming existing store data
- No new routes — coaching enhances existing surfaces
- No attempt history tracking ("you've made this mistake 5 times") — requires M7 persistence
- No opponent-specific coaching — AI personalities are not analyzed
- No audio/video coaching — text only
