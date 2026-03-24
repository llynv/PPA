import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../gameStore";
import type { AnalysisData } from "../../types/poker";

function makeAnalysis(handNumber: number): AnalysisData {
  return {
    heroGrade: "A",
    decisions: [],
    totalEvLoss: 1.5,
    totalHeroEv: 3.0,
    mistakes: [],
    handNumber,
  };
}

describe("gameStore review browsing", () => {
  beforeEach(() => {
    useGameStore.getState().resetGame();
  });

  it("selectedAnalysisIndex defaults to -1 (latest)", () => {
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(-1);
  });

  it("selectAnalysis sets the index", () => {
    useGameStore.getState().selectAnalysis(2);
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(2);
  });

  it("resetGame resets selectedAnalysisIndex to -1", () => {
    useGameStore.getState().selectAnalysis(5);
    useGameStore.getState().resetGame();
    expect(useGameStore.getState().selectedAnalysisIndex).toBe(-1);
  });

  it("getActiveAnalysis returns the selected analysis from sessionAnalyses", () => {
    const a1 = makeAnalysis(1);
    const a2 = makeAnalysis(2);
    const a3 = makeAnalysis(3);
    useGameStore.setState({
      sessionAnalyses: [a1, a2, a3],
      analysisData: a3,
      selectedAnalysisIndex: 1,
    });
    expect(useGameStore.getState().getActiveAnalysis()).toBe(a2);
  });

  it("getActiveAnalysis returns latest (analysisData) when index is -1", () => {
    const a1 = makeAnalysis(1);
    const a2 = makeAnalysis(2);
    useGameStore.setState({
      sessionAnalyses: [a1, a2],
      analysisData: a2,
      selectedAnalysisIndex: -1,
    });
    expect(useGameStore.getState().getActiveAnalysis()).toBe(a2);
  });
});
