import { describe, it, expect, beforeEach } from 'vitest';
import { useDrillStore } from '../drillStore';
import { evaluateDecision } from '../../lib/poker-engine/decision';
import type { ActionType } from '../../types/poker';

describe('drillStore', () => {
  beforeEach(() => {
    useDrillStore.getState().resetSession();
  });

  it('starts with null session in setup phase', () => {
    const state = useDrillStore.getState();
    expect(state.phase).toBe('setup');
    expect(state.session).toBeNull();
  });

  it('startSession creates a session with filtered spots', () => {
    useDrillStore.getState().startSession({ categories: ['preflop'], difficulties: [], concepts: [] });
    const state = useDrillStore.getState();
    expect(state.phase).toBe('drilling');
    expect(state.session).not.toBeNull();
    expect(state.session!.queue.length).toBeGreaterThan(0);
    expect(state.session!.queue.every(s => s.category === 'preflop')).toBe(true);
  });

  it('startSession with empty filters includes all spots', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    const state = useDrillStore.getState();
    expect(state.session!.queue.length).toBe(state.session!.allSpots.length);
  });

  it('submitAnswer evaluates and moves to feedback phase', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    useDrillStore.getState().submitAnswer('fold');
    const state = useDrillStore.getState();
    expect(state.phase).toBe('feedback');
    expect(state.currentResult).not.toBeNull();
    expect(state.currentResult!.heroAction).toBe('fold');
  });

  it('nextSpot advances to next spot or summary if queue exhausted', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    const queueLength = useDrillStore.getState().session!.queue.length;
    
    // Complete all spots
    for (let i = 0; i < queueLength; i++) {
      useDrillStore.getState().submitAnswer('call');
      if (i < queueLength - 1) {
        useDrillStore.getState().nextSpot();
        expect(useDrillStore.getState().phase).toBe('drilling');
      }
    }
    
    useDrillStore.getState().nextSpot();
    expect(useDrillStore.getState().phase).toBe('summary');
  });

  it('tracks streak correctly', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    const session = useDrillStore.getState().session!;
    const spot = session.queue[0];

    // Determine the optimal action for this spot
    const optimalResult = evaluateDecision(spot.decisionContext);
    const optimalAction = optimalResult.optimalAction;

    // Submit the optimal action → streak should increment to 1
    useDrillStore.getState().submitAnswer(optimalAction);
    expect(useDrillStore.getState().session!.streak).toBe(1);
    expect(useDrillStore.getState().session!.bestStreak).toBe(1);

    // Advance to next spot
    useDrillStore.getState().nextSpot();
    const spot2 = useDrillStore.getState().session!.queue[useDrillStore.getState().session!.currentIndex];
    const optimalResult2 = evaluateDecision(spot2.decisionContext);

    // Find an action that is definitely wrong: not optimal AND frequency < 15%
    const allActions: ActionType[] = ['fold', 'check', 'call', 'bet', 'raise'];
    const freqKeyMap: Record<string, 'fold' | 'call' | 'raise'> = {
      fold: 'fold', check: 'call', call: 'call', bet: 'raise', raise: 'raise',
    };
    const wrongAction = allActions.find((a) => {
      if (a === optimalResult2.optimalAction) return false;
      const freq = optimalResult2.frequencies[freqKeyMap[a]] ?? 0;
      return freq < 0.15;
    });
    // There must be at least one clearly wrong action
    expect(wrongAction).toBeDefined();

    // Submit the wrong action → streak resets to 0, bestStreak stays at 1
    useDrillStore.getState().submitAnswer(wrongAction!);
    expect(useDrillStore.getState().session!.streak).toBe(0);
    expect(useDrillStore.getState().session!.bestStreak).toBe(1);
  });

  it('resetSession returns to setup phase', () => {
    useDrillStore.getState().startSession({ categories: [], difficulties: [], concepts: [] });
    useDrillStore.getState().resetSession();
    const state = useDrillStore.getState();
    expect(state.phase).toBe('setup');
    expect(state.session).toBeNull();
  });
});
