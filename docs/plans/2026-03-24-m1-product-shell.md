# M1 Product Shell Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the M1 routed product shell with Home, Practice, Review, Progress, and Library while preserving the existing Zustand-driven poker loop.

**Architecture:** Add route-level product navigation with React Router and keep the current `gamePhase` logic scoped inside the Practice and Review pages. Use a thin page-container layer so the current settings / playing / showdown / analysis components remain intact and low-risk.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, React Router, Zustand, Testing Library

---

### Task 1: Add lean routing test support

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Write the failing test**

Create a route-shell test that renders `App` and expects product navigation labels and page content.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL because routing/test environment support is not complete yet.

**Step 3: Write minimal implementation**

Add only the routing/testing dependencies and jsdom setup needed for route-level UI tests.

**Step 4: Run test to verify it still fails for missing feature behavior**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL because the app does not yet render the routed shell.

### Task 2: Add failing route behavior tests

**Files:**
- Create: `src/App.routes.test.tsx`

**Step 1: Write the failing test**

Cover:
- Home route default at `/`
- nav links for Home, Practice, Review, Progress, Library
- Practice showing settings by default
- Review showing empty state when no analysis exists

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL because `App` still phase-switches without routes.

**Step 3: Write minimal implementation**

No production changes yet.

**Step 4: Run test to verify failure is stable**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL with missing routed content.

### Task 3: Implement routed app shell and page containers

**Files:**
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/layout/AppShell.tsx`
- Create: `src/components/layout/productNav.ts`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/PracticePage.tsx`
- Create: `src/pages/ReviewPage.tsx`
- Create: `src/pages/ProgressPage.tsx`
- Create: `src/pages/LibraryPage.tsx`

**Step 1: Write the failing test**

Use the existing route test file as the red test.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL before production changes.

**Step 3: Write minimal implementation**

Add the router, route-aware shell, and page containers. Keep the existing game components mounted from Practice/Review without deep game refactors.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.routes.test.tsx`
Expected: PASS.

### Task 4: Add targeted behavior coverage for review/practice mapping

**Files:**
- Modify: `src/App.routes.test.tsx`

**Step 1: Write the failing test**

Add coverage that:
- Practice renders analysis content only through Review, not Practice
- Review renders analysis dashboard when store state is `analysis`

**Step 2: Run test to verify it fails**

Run: `npm test -- src/App.routes.test.tsx`
Expected: FAIL because the route mapping is incomplete.

**Step 3: Write minimal implementation**

Adjust page mapping / empty state copy only as needed.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/App.routes.test.tsx`
Expected: PASS.

### Task 5: Verify build and full tests

**Files:**
- Modify: any touched files only if verification reveals small issues

**Step 1: Run tests**

Run: `npm test`
Expected: PASS.

**Step 2: Run build**

Run: `npm run build`
Expected: PASS.

**Step 3: Review changed scope**

Run GitNexus change detection before wrap-up to confirm only expected shell/routing scope changed.
