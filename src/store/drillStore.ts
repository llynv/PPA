import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ActionType, DecisionResult } from "../types/poker";
import type { DrillSpot, DrillSession, DrillResult, DrillFilters } from "../types/drill";
import { getAllSpots } from "../data/drillPacks";
import { evaluateDecision } from "../lib/poker-engine/decision";
import { useProgressStore } from "./progressStore";

type DrillPhase = 'setup' | 'drilling' | 'feedback' | 'summary';

interface DrillStore {
  phase: DrillPhase;
  session: DrillSession | null;
  currentResult: DrillResult | null;
  lastFilters: DrillFilters | null;

  startSession: (filters: DrillFilters) => void;
  submitAnswer: (action: ActionType, raiseSize?: number) => void;
  nextSpot: () => void;
  resetSession: () => void;
}

function filterSpots(spots: DrillSpot[], filters: DrillFilters): DrillSpot[] {
  return spots.filter((s) => {
    if (filters.categories.length > 0 && !filters.categories.includes(s.category)) return false;
    if (filters.difficulties.length > 0 && !filters.difficulties.includes(s.difficulty)) return false;
    if (filters.concepts.length > 0 && !filters.concepts.includes(s.concept)) return false;
    return true;
  });
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function mapToFrequencyKey(action: ActionType): 'fold' | 'call' | 'raise' {
  if (action === 'check') return 'call';
  if (action === 'bet') return 'raise';
  return action as 'fold' | 'call' | 'raise';
}

function isCorrectAction(heroAction: ActionType, optimal: DecisionResult): boolean {
  const freq = optimal.frequencies[mapToFrequencyKey(heroAction)] ?? 0;
  // Correct if hero chose an action with >= 15% frequency (valid mixed strategy)
  // or if hero chose the optimal action
  return heroAction === optimal.optimalAction || freq >= 0.15;
}

export const useDrillStore = create<DrillStore>()(
  persist(
    (set, get) => ({
      phase: 'setup' as DrillPhase,
      session: null,
      currentResult: null,
      lastFilters: null,

      startSession: (filters) => {
        const allSpots = getAllSpots();
        const filtered = filterSpots(allSpots, filters);
        if (filtered.length === 0) return;
        const queue = shuffleArray(filtered);

        set({
          phase: 'drilling',
          session: {
            allSpots,
            queue,
            currentIndex: 0,
            results: [],
            filters,
            streak: 0,
            bestStreak: 0,
          },
          currentResult: null,
          lastFilters: filters,
        });
      },

      submitAnswer: (action, raiseSize) => {
        const { session } = get();
        if (!session || session.currentIndex >= session.queue.length) return;

        const spot = session.queue[session.currentIndex];
        const optimalResult = evaluateDecision(spot.decisionContext);
        const correct = isCorrectAction(action, optimalResult);
        const heroEv = optimalResult.evByAction[mapToFrequencyKey(action)] ?? 0;
        const optimalEv = Math.max(optimalResult.evByAction.fold, optimalResult.evByAction.call, optimalResult.evByAction.raise);

        const result: DrillResult = {
          spotId: spot.id,
          heroAction: action,
          heroRaiseSize: raiseSize,
          isCorrect: correct,
          // evDelta ≤ 0: how much EV hero left on the table
          evDelta: heroEv - optimalEv,
          optimalResult,
          timestamp: Date.now(),
        };

        const newStreak = correct ? session.streak + 1 : 0;
        const newBestStreak = Math.max(session.bestStreak, newStreak);

        set({
          phase: "feedback",
          currentResult: result,
          session: {
            ...session,
            results: [...session.results, result],
            streak: newStreak,
            bestStreak: newBestStreak,
          },
        });
        useProgressStore.getState().recordDrillAttempt(result, spot);
      },

      nextSpot: () => {
        const { session } = get();
        if (!session) return;

        const nextIndex = session.currentIndex + 1;
        if (nextIndex >= session.queue.length) {
          if (session) {
            useProgressStore.getState().recordDrillSession(session);
          }
          set({ phase: "summary", currentResult: null });
        } else {
          set({
            phase: 'drilling',
            currentResult: null,
            session: { ...session, currentIndex: nextIndex },
          });
        }
      },

      resetSession: () => {
        set({ phase: 'setup', session: null, currentResult: null });
      },
    }),
    {
      name: "ppa-drill-v1",
      version: 1,
      partialize: (state) => ({
        lastFilters: state.lastFilters,
      }),
    }
  )
);
