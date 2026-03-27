import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { HeroDock } from "../HeroDock";
import { useGameStore } from "../../../store/gameStore";
import type { Player } from "../../../types/poker";

// ── Helpers ─────────────────────────────────────────────────────────

function makePlayer(
    overrides: Partial<Player> & { id: string; name: string },
): Player {
    return {
        stack: 1000,
        holeCards: [
            { rank: "A", suit: "spades" },
            { rank: "K", suit: "hearts" },
        ],
        isDealer: false,
        isFolded: false,
        currentBet: 0,
        isHero: false,
        isAllIn: false,
        ...overrides,
    };
}

function setHeroTurnState(overrides?: Record<string, unknown>) {
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
                makePlayer({
                    id: "hero",
                    name: "Hero",
                    isHero: true,
                    stack: 990,
                    currentBet: 10,
                }),
                makePlayer({
                    id: "ai-1",
                    name: "Alex",
                    isHero: false,
                    stack: 995,
                    currentBet: 5,
                    isDealer: true,
                    personality: "TAG",
                }),
            ],
            dealerIndex: 1,
            handNumber: 1,
            currentRound: "flop",
            gamePhase: "playing",
            communityCards: [
                { rank: "2", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "J", suit: "hearts" },
            ],
            pot: 20,
            activePlayerIndex: 0,
            isProcessingAI: false,
            ...overrides,
        },
        true,
    );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("HeroDock", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders 4 action buttons when it is hero's turn", () => {
        setHeroTurnState();
        render(<HeroDock />);

        expect(screen.getByRole("button", { name: /fold your hand/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /check|call/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /open raise slider/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /all in/i })).toBeInTheDocument();
    });

    it("renders nothing when it is not hero's turn", () => {
        setHeroTurnState({ activePlayerIndex: 1 });
        const { container } = render(<HeroDock />);

        expect(container.innerHTML).toBe("");
    });

    it("renders nothing when AI is processing", () => {
        setHeroTurnState({ isProcessingAI: true });
        const { container } = render(<HeroDock />);

        expect(container.innerHTML).toBe("");
    });

    it("fold button has fold styling (outline with sd-fold color)", () => {
        setHeroTurnState();
        render(<HeroDock />);

        const foldBtn = screen.getByRole("button", { name: /fold your hand/i });
        expect(foldBtn.style.borderColor).toBe("");
        // The border is set via shorthand: "1.5px solid var(--sd-fold)"
        expect(foldBtn.style.border).toContain("var(--sd-fold)");
        expect(foldBtn.style.color).toBe("var(--sd-fold)");
    });

    it("shows CHECK when no bet to call", () => {
        setHeroTurnState({
            players: [
                makePlayer({
                    id: "hero",
                    name: "Hero",
                    isHero: true,
                    stack: 990,
                    currentBet: 10,
                }),
                makePlayer({
                    id: "ai-1",
                    name: "Alex",
                    isHero: false,
                    stack: 990,
                    currentBet: 10,
                    isDealer: true,
                    personality: "TAG",
                }),
            ],
        });
        render(<HeroDock />);

        const checkBtn = screen.getByRole("button", { name: "Check" });
        expect(checkBtn).toHaveTextContent("CHECK");
    });

    it("shows CALL $X when facing a bet", () => {
        setHeroTurnState({
            players: [
                makePlayer({
                    id: "hero",
                    name: "Hero",
                    isHero: true,
                    stack: 980,
                    currentBet: 10,
                }),
                makePlayer({
                    id: "ai-1",
                    name: "Alex",
                    isHero: false,
                    stack: 970,
                    currentBet: 30,
                    isDealer: true,
                    personality: "TAG",
                }),
            ],
        });
        render(<HeroDock />);

        const callBtn = screen.getByRole("button", { name: /call \$20/i });
        expect(callBtn).toHaveTextContent("CALL $20");
    });

    it("raise button opens RaiseControls panel", () => {
        setHeroTurnState();
        render(<HeroDock />);

        expect(screen.queryByTestId("raise-controls")).not.toBeInTheDocument();

        const raiseBtn = screen.getByRole("button", { name: /open raise slider/i });
        fireEvent.click(raiseBtn);

        expect(screen.getByTestId("raise-controls")).toBeInTheDocument();
    });

    it("RaiseControls renders slider, preset chips, confirm button", () => {
        setHeroTurnState();
        render(<HeroDock />);

        const raiseBtn = screen.getByRole("button", { name: /open raise slider/i });
        fireEvent.click(raiseBtn);

        // Slider
        expect(screen.getByRole("slider", { name: /raise amount slider/i })).toBeInTheDocument();

        // Preset chips
        expect(screen.getByRole("button", { name: /set raise to 1\/3 pot/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /set raise to 1\/2 pot/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /set raise to 3\/4 pot/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /set raise to pot$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /set raise to all-in/i })).toBeInTheDocument();

        // Confirm button
        expect(screen.getByRole("button", { name: /confirm/i })).toBeInTheDocument();
    });

    it("preset chip '1/2 Pot' sets slider to half pot", () => {
        setHeroTurnState({ pot: 100 });
        render(<HeroDock />);

        // Open raise controls
        const raiseBtn = screen.getByRole("button", { name: /open raise slider/i });
        fireEvent.click(raiseBtn);

        // Click 1/2 Pot preset
        const halfPotBtn = screen.getByRole("button", { name: /set raise to 1\/2 pot/i });
        fireEvent.click(halfPotBtn);

        // Hero currentBet=10, maxBet across table=max(10,5)=10, so minRaiseTotal = max(10+10, 10*2) = 20
        // half pot = Math.round(100 * 0.5) = 50, clamped between 20 and maxRaiseTotal
        // maxRaiseTotal = heroStack + heroCurrentBet = 990 + 10 = 1000
        // 50 is within range, so slider = 50
        const slider = screen.getByRole("slider", { name: /raise amount slider/i });
        expect(slider).toHaveValue("50");
    });

    it("confirm raise calls performAction with correct amount", () => {
        const performActionSpy = vi.fn();
        setHeroTurnState({ pot: 100 });
        useGameStore.setState({ performAction: performActionSpy });

        render(<HeroDock />);

        // Open raise controls
        const raiseBtn = screen.getByRole("button", { name: /open raise slider/i });
        fireEvent.click(raiseBtn);

        // Click confirm (default amount is minRaiseTotal)
        const confirmBtn = screen.getByRole("button", { name: /confirm/i });
        fireEvent.click(confirmBtn);

        // currentMaxBet = max(10, 5) = 10, so > 0, actionType = "raise"
        // minRaiseTotal = max(10+10, 10*2) = 20
        expect(performActionSpy).toHaveBeenCalledWith("raise", 20);
    });
});
