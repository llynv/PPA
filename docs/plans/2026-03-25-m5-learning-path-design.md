# M5: Learning Path — Design Document

**Date:** 2026-03-25
**Status:** Approved
**Depends on:** M4 (Progress & Mastery)

## Goal

Transform the flat drill/practice experience into a structured learning path with progressive curriculum, adaptive recommendations, and first-launch onboarding. Users should always know "what to work on next."

## Problem

Users currently land on the home page and choose between "Play" or "Drills" without guidance. There's no onboarding for new users, no curriculum structure, and no "what should I work on next?" beyond the WeaknessSpotlight's top-3 leaks on the Progress page. The 37 drill spots and 18 concepts are flat — no progression order, no prerequisite awareness, no adaptive recommendations. The concept filter in DrillSetup is hidden (only accessible via URL param from WeaknessSpotlight).

## Scope

From roadmap deferrals, M5 was defined as: onboarding, learning path recommendations, and optionally a spot generator. The **spot generator is deferred** — 37 spots across 18 concepts is sufficient for learning path MVP.

M5 delivers:

1. **Concept Curriculum** — organize 18 concepts into 4 progressive tiers
2. **Recommended Next Drill** — adaptive recommendation engine based on mastery data
3. **Learning Path Page** — visual curriculum with progress overlay at `/learn`
4. **Onboarding Flow** — first-launch welcome overlay on Home page
5. **Concept Picker in DrillSetup** — expose the hidden concept filter as visible UI

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Curriculum source | Static constant in `src/data/curriculum.ts` | Not user-configurable; tier structure is domain knowledge |
| Recommendation engine | Pure rule-based function | Simple priority ordering; no ML needed at this stage |
| State management | Derive from existing `progressStore` | No new Zustand store; curriculum progress = mastery data + static tiers |
| Tier unlock model | Soft gating (visual only) | Users can still drill any concept via direct navigation |
| Onboarding persistence | Single `localStorage` boolean | Lightweight; not part of M7 data persistence scope |
| Learning Path placement | New `/learn` route, separate from Progress | Progress = stats; Learn = curriculum. Different purposes. |
| Spot generator | Deferred | 37 spots is sufficient for curriculum MVP |

## Design

### 1. Concept Curriculum Structure

The 18 DrillConcepts organized into 4 progressive tiers:

| Tier | Name | Concepts | Rationale |
|------|------|----------|-----------|
| 1 | Foundations | `open_raise`, `cold_call`, `steal` | Must know preflop ranges before postflop play |
| 2 | Aggression | `cbet_value`, `cbet_bluff`, `three_bet`, `squeeze` | C-betting and 3-betting are core initiative concepts |
| 3 | Defense | `check_call`, `check_raise`, `float`, `probe`, `pot_control`, `bluff_catch` | Responding to aggression, controlling the pot |
| 4 | Advanced | `barrel`, `semi_bluff`, `value_bet_thin`, `river_bluff`, `river_raise` | Multi-street planning, thin value, river play |

#### Type

```typescript
interface CurriculumTier {
    id: number;
    name: string;
    description: string;
    concepts: DrillConcept[];
    unlockRequirement: { tier: number; minConceptsPracticed: number } | null;
}
```

#### Unlock Logic

- Tier 1: Always unlocked (no requirement)
- Tier N: Unlocks when >= 50% of concepts in Tier N-1 reach `practiced` level or higher
- Concrete thresholds:
  - Tier 2: 2 of 3 Foundations concepts at `practiced`+
  - Tier 3: 2 of 4 Aggression concepts at `practiced`+
  - Tier 4: 3 of 6 Defense concepts at `practiced`+
- **Soft gating**: Users can still drill any concept via direct nav (`/practice/drills?concept=X`). The Learning Path page visually shows lock state but doesn't prevent access.

#### File: `src/data/curriculum.ts`

Static `CURRICULUM` constant: `CurriculumTier[]` with the 4 tiers above.

### 2. Recommended Next Drill

Pure function that picks the best concept to drill next based on mastery state.

#### Algorithm (priority order)

```
recommendNextConcept(
    mastery: Record<string, ConceptMastery>,
    curriculum: CurriculumTier[]
): DrillConcept | null
```

1. **Unseen concepts in lowest unlocked tier** — start from the beginning, pick by curriculum order
2. **Learning concepts (any tier, sorted by lowest accuracy)** — reinforce weakest spots first
3. **Practiced concepts (sorted by lowest recentAccuracy)** — push toward solid
4. **Stale solid concepts** — concepts not attempted recently (oldest `lastAttemptAt`) get priority
5. **Advance to next tier** — if current tier is solid/mastered, pick first unseen from next tier
6. **Return null** — if everything is mastered (all 18 concepts)

#### Helper

```
isTierUnlocked(
    tier: CurriculumTier,
    mastery: Record<string, ConceptMastery>,
    curriculum: CurriculumTier[]
): boolean
```

Checks if the prerequisite tier has enough concepts at `practiced`+ level.

#### File: `src/lib/learning-path.ts`

Pure functions, fully testable without stores. Test file: `src/lib/__tests__/learning-path.test.ts`.

### 3. Learning Path Page

New route at `/learn`, added to AppShell navigation.

**Nav order:** Home, Practice, Review, Learn, Progress

#### Layout

Top section: **Recommended Next**
- "Your next focus: [Concept Name]" with mastery badge
- "Start Drilling" CTA button → navigates to `/practice/drills?concept=X`
- If all mastered: "All concepts mastered!" congratulation message

Main section: **Curriculum Tiers** (stacked vertically)
- Each tier is a card showing:
  - Tier number + name + one-line description
  - Lock icon + "Unlock by practicing N concepts in [Tier Name]" if locked
  - Progress bar: X/Y concepts at `practiced`+ level
  - Grid of concept chips, each showing:
    - Concept label (from CONCEPT_LABELS)
    - Mastery level color (same palette as MasteryGrid: gray/red/amber/blue/emerald)
    - Accuracy percentage
    - Click → navigates to `/practice/drills?concept=X`
  - Locked tier: chips are grayed out but still clickable (soft gate)

#### Components

- `src/pages/LearnPage.tsx` — route component
- `src/components/learn/RecommendedNext.tsx` — top recommendation CTA
- `src/components/learn/CurriculumTier.tsx` — single tier card with concept chips
- `src/components/learn/ConceptChip.tsx` — individual concept within a tier

### 4. Onboarding Flow

Lightweight first-launch experience. Single welcome overlay on the Home page.

#### Trigger

- Check `localStorage.getItem("ppa_onboarded")`
- If not set, show the welcome overlay
- On dismiss (either CTA), set `localStorage.setItem("ppa_onboarded", "true")`

#### Content

```
Welcome to PPA

Your personal GTO poker coach.

1. Play hands against AI opponents
2. Review your mistakes with GTO analysis
3. Drill your weak spots with focused exercises

Ready to start? We recommend beginning with the fundamentals.

[Start Learning →]  [Skip]
```

- "Start Learning" → navigates to `/learn`
- "Skip" → dismisses overlay, stays on Home

#### Implementation

- `src/hooks/useOnboarding.ts` — custom hook returning `{ showOnboarding, dismissOnboarding }`
- Overlay component rendered inside `HomePage.tsx` conditionally
- `src/components/onboarding/WelcomeOverlay.tsx` — the overlay UI

### 5. Concept Picker in DrillSetup

Expose the hidden concept filter as visible UI in `DrillSetup.tsx`.

#### Changes to DrillSetup.tsx

- Add a "Concept" filter section below the Difficulty section
- Show concept chips grouped by curriculum tier (Foundations, Aggression, Defense, Advanced)
- Each chip is a toggle button (same pattern as category/difficulty toggles)
- Multi-select supported
- Tier headers as small labels above each group
- When navigated via `?concept=X` URL param, that concept is pre-selected (existing behavior preserved)
- Live matching count updates as concepts are toggled
- "Clear all" link to reset concept filter

#### Changes to DrillFilters type

No change needed — `DrillFilters.concepts` already accepts `DrillConcept[]`.

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/data/curriculum.ts` | Static `CURRICULUM` constant |
| `src/lib/learning-path.ts` | `recommendNextConcept()`, `isTierUnlocked()` |
| `src/lib/__tests__/learning-path.test.ts` | Tests for recommendation + unlock logic |
| `src/pages/LearnPage.tsx` | Route component for `/learn` |
| `src/components/learn/RecommendedNext.tsx` | Top recommendation CTA |
| `src/components/learn/CurriculumTier.tsx` | Tier card with concept chips |
| `src/components/learn/ConceptChip.tsx` | Individual concept chip |
| `src/components/onboarding/WelcomeOverlay.tsx` | First-launch welcome overlay |
| `src/hooks/useOnboarding.ts` | Onboarding state hook |

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/learn` route with `LearnPage` |
| `src/components/layout/productNav.ts` | Add Learn nav item |
| `src/components/drill/DrillSetup.tsx` | Add concept picker UI grouped by tier |
| `src/pages/HomePage.tsx` | Conditionally render WelcomeOverlay |

### No New Store

Learning path state is entirely derived:
- Curriculum = static data (`CURRICULUM`)
- Mastery data = `progressStore.conceptMastery`
- Tier unlock = pure function of mastery + curriculum
- Recommendation = pure function of mastery + curriculum
- Onboarding = `localStorage` boolean

No new Zustand store needed.

## What's NOT in M5

- No spot generator (content expansion deferred)
- No spaced repetition algorithm (too complex for current scope)
- No daily practice goals or streak-based UI
- No achievement/badge system
- No coach explanations for "why this concept next" (M6)
- No persistence of curriculum progress beyond session (M7)
- No animated unlock celebrations (future polish)
- No concept detail pages (future)
