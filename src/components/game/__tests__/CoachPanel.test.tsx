import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { CoachPanel } from "../CoachPanel";
import { useGameStore } from "../../../store/gameStore";
import type { Player } from "../../../types/poker";

// ── Mock poker-engine so we control evaluateDecision output ─────────

vi.mock("../../../lib/poker-engine", () => ({
    evaluateDecision: vi.fn(() => ({
        optimalAction: "call" as const,
        equity: 0.42,
        potOdds: 0.25,
        reasoning: "You have decent equity to continue.",
        frequencies: { fold: 0.1, call: 0.7, raise: 0.2 },
        impliedOdds: 0.3,
        spr: 4.2,
        draws: { flushDraw: false, straightDraw: false, comboCount: 0 },
        boardTexture: { paired: false, suited: false, connected: false, highCard: "A" },
        evByAction: { fold: 0, call: 5, raise: 3 },
    })),
    getPosition: vi.fn(() => "CO"),
}));

// ── Helpers ──────────────────────────────────────────────────────────

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

function setHeroFacingBetState(overrides?: Record<string, unknown>) {
    useGameStore.setState(
        {
            ...useGameStore.getInitialState(),
            trainingMode: true,
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
                    stack: 900,
                    currentBet: 50,
                }),
                makePlayer({
                    id: "ai-1",
                    name: "Alex",
                    isHero: false,
                    stack: 850,
                    currentBet: 100,
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
            pot: 200,
            activePlayerIndex: 0,
            isProcessingAI: false,
            actions: [],
            ...overrides,
        },
        true,
    );
}

// ── Tests ────────────────────────────────────────────────────────────

describe("CoachPanel", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    // Test 1: Renders pot odds when hero faces a bet
    it("renders pot odds when hero faces a bet", () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        // callAmount = 100 - 50 = 50, potOddsRatio = (200+50)/50 = 5.0
        // potOddsPct = Math.round(50 / (200+50) * 100) = 20
        expect(screen.getByText("Pot Odds")).toBeInTheDocument();
        expect(screen.getByLabelText(/pot odds: 5\.0 to 1, 20%/i)).toBeInTheDocument();
    });

    // Test 2: Renders SPR from flop onward
    it("renders SPR from flop onward", () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        // spr = heroStack / pot = 900 / 200 = 4.5
        expect(screen.getByText("SPR")).toBeInTheDocument();
        expect(screen.getByLabelText(/stack to pot ratio: 4\.5/i)).toBeInTheDocument();
    });

    // Test 3: Renders "Show Hint" button in training mode
    it("renders Show Hint button in training mode", () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        expect(
            screen.getByRole("button", { name: /show coaching hint/i }),
        ).toBeInTheDocument();
    });

    // Test 4: Shows GTO hint after clicking "Show Hint"
    it("shows GTO hint after clicking Show Hint", async () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        const showBtn = screen.getByRole("button", { name: /show coaching hint/i });

        // Click and flush the rAF + setTimeout chain
        await act(async () => {
            fireEvent.click(showBtn);
            // Advance past the requestAnimationFrame + setTimeout(10ms)
            vi.advanceTimersByTime(50);
        });

        // The mock returns optimalAction: "call", equity: 0.42
        expect(screen.getByText("Call")).toBeInTheDocument();
        expect(screen.getByText("42%")).toBeInTheDocument();
        expect(screen.getByText("You have decent equity to continue.")).toBeInTheDocument();
    });

    // Test 5: Close hint button dismisses hint and re-shows "Show Hint"
    it("closes hint and re-shows Show Hint button on X click", async () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        const showBtn = screen.getByRole("button", { name: /show coaching hint/i });

        // Open hint
        await act(async () => {
            fireEvent.click(showBtn);
            vi.advanceTimersByTime(50);
        });

        // Hint content is visible
        expect(screen.getByText("GTO Hint")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /show coaching hint/i })).not.toBeInTheDocument();

        // Click close (X) button
        const closeBtn = screen.getByRole("button", { name: /close hint panel/i });
        fireEvent.click(closeBtn);

        // Hint should be dismissed, "Show Hint" re-appears
        expect(screen.queryByText("GTO Hint")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /show coaching hint/i })).toBeInTheDocument();
    });

    // Test 6: Renders nothing when training mode is off
    it("renders nothing when trainingMode is off", () => {
        setHeroFacingBetState({ trainingMode: false });
        const { container } = render(<CoachPanel variant="desktop" />);

        expect(container.innerHTML).toBe("");
    });

    // Test 7: Renders nothing when it is not hero's turn
    it("renders nothing when it is not hero's turn", () => {
        setHeroFacingBetState({ activePlayerIndex: 1 });
        render(<CoachPanel variant="desktop" />);

        // Training mode is on so the panel shell renders,
        // but pot odds won't show (not hero turn) and hint section won't render
        expect(screen.queryByText("Pot Odds")).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /show coaching hint/i }),
        ).not.toBeInTheDocument();
    });

    // Test 8: Desktop — CoachPanel is visible as a rail (w-72)
    it("desktop: CoachPanel is visible as a rail with w-72", () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="desktop" />);

        const panel = screen.getByTestId("coach-panel-desktop");
        expect(panel).toBeInTheDocument();
        expect(panel.className).toContain("w-72");
        expect(panel.style.background).toBe("var(--sd-surface)");
        expect(panel.style.borderLeft).toBe("1px solid var(--sd-smoke)");
    });

    // Test 9: Mobile — CoachPanel is collapsible
    it("mobile: CoachPanel is collapsible", () => {
        setHeroFacingBetState();
        render(<CoachPanel variant="mobile" />);

        const panel = screen.getByTestId("coach-panel-mobile");
        expect(panel).toBeInTheDocument();

        // Should have a toggle button
        const toggleBtn = screen.getByRole("button", {
            name: /expand coach panel/i,
        });
        expect(toggleBtn).toBeInTheDocument();

        // Content should NOT be visible initially
        expect(screen.queryByText("Pot Odds")).not.toBeInTheDocument();

        // Click toggle to expand
        fireEvent.click(toggleBtn);

        // Content should now be visible
        expect(screen.getByText("Pot Odds")).toBeInTheDocument();

        // Toggle button should now say "collapse"
        expect(
            screen.getByRole("button", { name: /collapse coach panel/i }),
        ).toBeInTheDocument();
    });
});
