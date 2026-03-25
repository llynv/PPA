# M5: Learning Path — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a progressive curriculum with 4 tiers, adaptive drill recommendations, a Learning Path page, onboarding overlay, and a visible concept picker in DrillSetup.

**Architecture:** Static curriculum definition + pure recommendation functions derived from progressStore mastery data. No new Zustand store. New `/learn` route. Onboarding via localStorage boolean.

**Tech Stack:** React 18, TypeScript, Zustand (existing progressStore), React Router, Tailwind CSS, Vitest

---

### Task 1: Curriculum Types and Data

**Files:**
- Create: `src/types/curriculum.ts`
- Create: `src/data/curriculum.ts`

**Spec:**

`src/types/curriculum.ts`:
```typescript
import type { DrillConcept } from "./drill";
import type { MasteryLevel } from "./progress";

export interface CurriculumTier {
    id: number;
    name: string;
    description: string;
    concepts: DrillConcept[];
    unlockRequirement: { tier: number; minConceptsPracticed: number } | null;
}
```

`src/data/curriculum.ts`:
```typescript
import type { CurriculumTier } from "../types/curriculum";

export const CURRICULUM: CurriculumTier[] = [
    {
        id: 1,
        name: "Foundations",
        description: "Preflop basics — ranges, position, and stealing.",
        concepts: ["open_raise", "cold_call", "steal"],
        unlockRequirement: null,
    },
    {
        id: 2,
        name: "Aggression",
        description: "Taking initiative with c-bets, 3-bets, and squeezes.",
        concepts: ["cbet_value", "cbet_bluff", "three_bet", "squeeze"],
        unlockRequirement: { tier: 1, minConceptsPracticed: 2 },
    },
    {
        id: 3,
        name: "Defense",
        description: "Responding to aggression and controlling pot size.",
        concepts: ["check_call", "check_raise", "float", "probe", "pot_control", "bluff_catch"],
        unlockRequirement: { tier: 2, minConceptsPracticed: 2 },
    },
    {
        id: 4,
        name: "Advanced",
        description: "Multi-street planning, thin value, and river play.",
        concepts: ["barrel", "semi_bluff", "value_bet_thin", "river_bluff", "river_raise"],
        unlockRequirement: { tier: 3, minConceptsPracticed: 3 },
    },
];
```

**Run:** `npx tsc --noEmit` (type-check passes)

**Commit:** `feat(m5): add curriculum types and tier data`

---

### Task 2: Learning Path Logic — isTierUnlocked and recommendNextConcept

**Files:**
- Create: `src/lib/learning-path.ts`
- Create: `src/lib/__tests__/learning-path.test.ts`

**Spec:**

`src/lib/learning-path.ts` exports two pure functions:

```typescript
import type { ConceptMastery } from "../types/progress";
import type { CurriculumTier } from "../types/curriculum";
import type { DrillConcept } from "../types/drill";
import { CURRICULUM } from "../data/curriculum";

export function isTierUnlocked(
    tier: CurriculumTier,
    mastery: Record<string, ConceptMastery>
): boolean
```

- If `tier.unlockRequirement` is null, return true (Tier 1)
- Find the prerequisite tier from `CURRICULUM` by `unlockRequirement.tier`
- Count how many concepts in the prereq tier have mastery level >= `practiced` (i.e., level is `practiced`, `solid`, or `mastered`)
- Return true if count >= `unlockRequirement.minConceptsPracticed`

```typescript
export function recommendNextConcept(
    mastery: Record<string, ConceptMastery>
): DrillConcept | null
```

Algorithm (priority order):
1. Walk tiers in order. For each unlocked tier, find the first concept with no mastery entry (unseen) → return it
2. Across all tiers, find concepts with level `learning` (accuracy < 0.4 or totalAttempts < 5), sorted by lowest recentAccuracy → return the weakest
3. Find concepts with level `practiced`, sorted by lowest recentAccuracy → return the weakest
4. Find `solid` concepts, sorted by oldest `lastAttemptAt` (stalest first) → return it
5. Walk tiers in order. For locked tiers, find first unseen concept → return it (encourage advancement)
6. Return null (all mastered)

**Tests:** `src/lib/__tests__/learning-path.test.ts`

```
describe("isTierUnlocked")
  - Tier 1 is always unlocked
  - Tier 2 unlocks when 2/3 Foundations concepts reach practiced+
  - Tier 2 stays locked when only 1/3 Foundations concepts reach practiced+
  - Tier 3 unlocks with 2/4 Aggression at practiced+

describe("recommendNextConcept")
  - Returns first Foundations concept when mastery is empty
  - Returns learning concept with lowest accuracy when some concepts are learning
  - Returns practiced concept when no unseen or learning remain
  - Returns stale solid concept when everything is solid
  - Returns null when all 18 concepts are mastered
  - Advances to next tier's unseen when current tier is complete
```

Expect ~10 tests.

**Run:** `npx vitest run src/lib/__tests__/learning-path.test.ts`

**Commit:** `feat(m5): add learning path logic with recommendation engine`

---

### Task 3: Learning Path Page — LearnPage, RecommendedNext, CurriculumTier, ConceptChip

**Files:**
- Create: `src/pages/LearnPage.tsx`
- Create: `src/components/learn/RecommendedNext.tsx`
- Create: `src/components/learn/CurriculumTierCard.tsx`
- Create: `src/components/learn/ConceptChip.tsx`

**Spec:**

`ConceptChip` — small chip showing a single concept:
- Props: `concept: DrillConcept`, `mastery: ConceptMastery | undefined`
- Shows concept label (from CONCEPT_LABELS), mastery color dot, accuracy %
- Wraps in a Link to `/practice/drills?concept={concept}`
- Color by mastery level: unseen=neutral-600, learning=red-500, practiced=amber-500, solid=blue-500, mastered=emerald-500

`CurriculumTierCard` — a tier card:
- Props: `tier: CurriculumTier`, `mastery: Record<string, ConceptMastery>`, `isUnlocked: boolean`
- Shows tier name, description, lock icon if locked
- Progress bar: X/Y concepts at practiced+ level
- Grid of ConceptChip components for each concept in the tier
- If locked: subtle opacity reduction but chips still clickable (soft gate)

`RecommendedNext` — top recommendation CTA:
- Props: `concept: DrillConcept | null`
- If concept: "Your next focus: [Label]" with "Start Drilling" CTA Link to `/practice/drills?concept=X`
- If null: "All concepts mastered!" congratulation text

`LearnPage` — route component:
- Uses `useProgressStore` to get `conceptMastery`
- Calls `recommendNextConcept(mastery)` and `isTierUnlocked(tier, mastery)` for each tier
- Renders RecommendedNext at top, then CURRICULUM.map → CurriculumTierCard

**Commit:** `feat(m5): add Learning Path page with curriculum visualization`

---

### Task 4: Route and Navigation Wiring

**Files:**
- Modify: `src/App.tsx:8-22`
- Modify: `src/components/layout/productNav.ts:7-13`
- Modify: `src/App.routes.test.tsx` (add 1-2 tests)

**Spec:**

`src/App.tsx` — add Learn route:
```typescript
import { LearnPage } from "./pages/LearnPage";
// ...
<Route path="learn" element={<LearnPage />} />
```

Add between `review` and `progress` routes.

`src/components/layout/productNav.ts` — add Learn nav item:
```typescript
{ to: "/learn", label: "Learn" },
```

Insert between Review and Progress in the array. Nav order: Home, Practice, Review, Learn, Progress, Library.

`src/App.routes.test.tsx` — add tests:
- "shows Learn link in primary navigation" — verify `/learn` link exists in nav
- "renders Learning Path at /learn" — verify heading or content renders

**Run:** `npx vitest run src/App.routes.test.tsx`

**Commit:** `feat(m5): wire Learn route and navigation`

---

### Task 5: Onboarding — WelcomeOverlay and useOnboarding Hook

**Files:**
- Create: `src/hooks/useOnboarding.ts`
- Create: `src/components/onboarding/WelcomeOverlay.tsx`
- Modify: `src/pages/HomePage.tsx:1-85`

**Spec:**

`src/hooks/useOnboarding.ts`:
```typescript
import { useState, useCallback } from "react";

const ONBOARDING_KEY = "ppa_onboarded";

export function useOnboarding() {
    const [showOnboarding, setShowOnboarding] = useState(
        () => !localStorage.getItem(ONBOARDING_KEY)
    );

    const dismissOnboarding = useCallback(() => {
        localStorage.setItem(ONBOARDING_KEY, "true");
        setShowOnboarding(false);
    }, []);

    return { showOnboarding, dismissOnboarding };
}
```

`src/components/onboarding/WelcomeOverlay.tsx`:
- Props: `onDismiss: () => void`, `onStartLearning: () => void`
- Full-screen overlay with backdrop blur
- Content:
  - "Welcome to PPA" heading
  - "Your personal GTO poker coach." subheading
  - 3 numbered bullets: Play hands, Review mistakes, Drill weaknesses
  - "We recommend beginning with the fundamentals."
  - Two buttons: "Start Learning" (calls onStartLearning) and "Skip" (calls onDismiss)
- Accessible: overlay uses `role="dialog"`, `aria-modal="true"`, focus trap not required (simple overlay)

`src/pages/HomePage.tsx` changes:
- Import `useOnboarding` and `WelcomeOverlay`
- Import `useNavigate` from react-router-dom
- In HomePage, call `useOnboarding()`
- If `showOnboarding`, render `<WelcomeOverlay>` at top of component
- "Start Learning" handler: `dismissOnboarding(); navigate("/learn");`
- "Skip" handler: `dismissOnboarding();`

**Run:** `npx vitest run` (all tests pass, build succeeds)

**Commit:** `feat(m5): add onboarding welcome overlay on first launch`

---

### Task 6: Concept Picker in DrillSetup

**Files:**
- Modify: `src/components/drill/DrillSetup.tsx:1-141`

**Spec:**

Add a "Concept" filter section below the Difficulty section:
- Import `CURRICULUM` from `../../data/curriculum`
- Import `CONCEPT_LABELS` from `../../lib/concept-labels`
- Group concepts by tier using CURRICULUM
- For each tier, render a tier label header (small text) and a row of toggle chips
- Each chip toggles the concept in `selectedConcepts` using the existing `toggleInArray` helper
- Active chip: `bg-amber-600 text-white` (same as category/difficulty)
- Inactive chip: `bg-neutral-800 text-neutral-300 hover:bg-neutral-700`
- Add "Clear all" text button that resets `selectedConcepts` to `[]`, shown only when concepts are selected
- Existing URL param behavior preserved: `?concept=X` pre-selects the concept

Layout between the Difficulty section (line 122) and Spot Count (line 124):
```tsx
{/* Concept Filter */}
<div className="mb-5">
    <div className="flex items-center justify-between mb-2">
        <label className="text-neutral-300 font-medium text-sm">Concept</label>
        {selectedConcepts.length > 0 && (
            <button
                onClick={() => setSelectedConcepts([])}
                className="text-xs text-neutral-500 hover:text-neutral-300"
            >
                Clear all
            </button>
        )}
    </div>
    {CURRICULUM.map((tier) => (
        <div key={tier.id} className="mb-3">
            <p className="text-xs text-neutral-500 mb-1.5">{tier.name}</p>
            <div className="flex flex-wrap gap-1.5">
                {tier.concepts.map((concept) => {
                    const active = selectedConcepts.includes(concept);
                    return (
                        <button
                            key={concept}
                            onClick={() => setSelectedConcepts(toggleInArray(selectedConcepts, concept))}
                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                active
                                    ? "bg-amber-600 text-white"
                                    : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                            }`}
                        >
                            {CONCEPT_LABELS[concept] ?? concept}
                        </button>
                    );
                })}
            </div>
        </div>
    ))}
</div>
```

**Run:** `npx vitest run` (all tests pass) and `npx vite build` (build succeeds)

**Commit:** `feat(m5): add concept picker grouped by tier to DrillSetup`

---

### Task 7: Integration Tests

**Files:**
- Create: `src/lib/__tests__/learning-path.integration.test.ts`

**Spec:**

End-to-end flow tests combining progressStore mastery with learning-path logic:

1. **Tier unlock progression:** Record enough drill attempts to push 2 Foundations concepts to `practiced` → verify `isTierUnlocked` returns true for Tier 2
2. **Recommendation adapts to mastery:** Start with empty mastery → recommendation is `open_raise`. Record 5 correct attempts for `open_raise` → recommendation changes to next unseen Foundations concept
3. **Full tier completion advances:** Push all 3 Foundations concepts to `solid` → recommendation should advance to Tier 2's first unseen concept

**Run:** `npx vitest run src/lib/__tests__/learning-path.integration.test.ts`
Expected: 3 tests pass

**Commit:** `feat(m5): add learning path integration tests`

---

### Task 8: Route Tests and Final Verification

**Files:**
- Modify: `src/App.routes.test.tsx`

**Spec:**

Add 2 tests:

```typescript
it("shows Learn link in primary navigation", () => {
    renderAt("/");
    const primaryNav = screen.getByLabelText(/primary product navigation/i);
    expect(within(primaryNav).getByRole("link", { name: /^learn$/i })).toBeInTheDocument();
});

it("renders Learning Path at /learn", () => {
    renderAt("/learn");
    // Should show some curriculum content
    expect(screen.getByText(/foundations/i)).toBeInTheDocument();
});
```

**Run:** `npx vitest run` (full suite — all tests pass)
**Run:** `npx vite build` (build succeeds)

**Commit:** `feat(m5): add Learn route tests`

---

## Task Summary

| Task | Scope | New Files | Modified Files | Tests |
|------|-------|-----------|----------------|-------|
| 1 | Curriculum types + data | 2 | 0 | type-check |
| 2 | Learning path logic | 2 | 0 | ~10 |
| 3 | Learn page + components | 4 | 0 | - |
| 4 | Route + nav wiring | 0 | 2 | 2 |
| 5 | Onboarding overlay | 2 | 1 | - |
| 6 | Concept picker in DrillSetup | 0 | 1 | - |
| 7 | Integration tests | 1 | 0 | 3 |
| 8 | Route tests + final verification | 0 | 1 | 2 |
| **Total** | | **11** | **5** | **~17** |

## Batching Strategy for Subagent Dispatch

| Batch | Tasks | Rationale |
|-------|-------|-----------|
| A | 1 + 2 | Types + logic, no UI, pure functions + tests |
| B | 3 | UI components (4 files, self-contained) |
| C | 4 + 5 | Wiring: route, nav, onboarding — small changes across files |
| D | 6 | DrillSetup modification (single file, careful edit) |
| E | 7 + 8 | All remaining tests + final verification |
