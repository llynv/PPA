import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ShowdownOverlay } from "../ShowdownOverlay";
import { useGameStore } from "../../../store/gameStore";

function setShowdownState(overrides?: Record<string, unknown>) {
    useGameStore.setState(
        {
            ...useGameStore.getInitialState(),
            settings: {
                playerCount: 2,
                smallBlind: 5,
                bigBlind: 10,
                startingStack: 1000,
            },
            players: [
                {
                    id: "hero",
                    name: "Hero",
                    stack: 1020,
                    holeCards: [
                        { rank: "A", suit: "spades" },
                        { rank: "K", suit: "hearts" },
                    ],
                    isDealer: false,
                    isFolded: false,
                    currentBet: 0,
                    isHero: true,
                    isAllIn: false,
                },
                {
                    id: "ai-1",
                    name: "Alex",
                    stack: 980,
                    holeCards: [
                        { rank: "Q", suit: "clubs" },
                        { rank: "J", suit: "diamonds" },
                    ],
                    isDealer: true,
                    isFolded: false,
                    currentBet: 0,
                    isHero: false,
                    isAllIn: false,
                    personality: "TAG",
                },
            ],
            dealerIndex: 1,
            handNumber: 3,
            currentRound: "river",
            gamePhase: "showdown",
            communityCards: [
                { rank: "2", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "J", suit: "hearts" },
                { rank: "4", suit: "spades" },
                { rank: "9", suit: "hearts" },
            ],
            pot: 0,
            activePlayerIndex: 0,
            winner: "hero",
            winnerHand: "Pair of Jacks",
            ...overrides,
        },
        true,
    );
}

describe("ShowdownOverlay", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders winner name and hand description", () => {
        setShowdownState();
        render(<ShowdownOverlay />);

        expect(screen.getByText("Hero wins!")).toBeInTheDocument();
        expect(screen.getByText("Pair of Jacks")).toBeInTheDocument();
    });

    it("View Analysis button calls viewAnalysis", () => {
        const viewAnalysisSpy = vi.fn();
        setShowdownState();
        useGameStore.setState({ viewAnalysis: viewAnalysisSpy });

        render(<ShowdownOverlay />);

        const btn = screen.getByRole("button", { name: /view.*analysis/i });
        fireEvent.click(btn);

        expect(viewAnalysisSpy).toHaveBeenCalledOnce();
    });

    it("Next Hand button calls startHand and processAITurns", () => {
        const startHandSpy = vi.fn();
        const processAITurnsSpy = vi.fn().mockResolvedValue(undefined);
        setShowdownState();
        useGameStore.setState({
            startHand: startHandSpy,
            processAITurns: processAITurnsSpy,
        });

        render(<ShowdownOverlay />);

        const btn = screen.getByRole("button", { name: /next hand/i });
        fireEvent.click(btn);

        expect(startHandSpy).toHaveBeenCalledOnce();
        expect(processAITurnsSpy).toHaveBeenCalledOnce();
    });
});
