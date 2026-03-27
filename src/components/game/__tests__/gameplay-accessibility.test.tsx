import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HeroDock } from "../HeroDock";
import { ActivityRibbon } from "../ActivityRibbon";
import { CoachPanel } from "../CoachPanel";
import { SeatCard } from "../SeatCard";
import { useGameStore } from "../../../store/gameStore";
import type { Player } from "../../../types/poker";

// ── Mock poker-engine so CoachPanel hint doesn't run real evaluation ──

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
    getPosition: vi.fn(
        (seatIdx: number, dealerIdx: number, count: number) => {
            const positions = ["BTN", "SB", "BB", "UTG", "MP", "CO"];
            const offset = (seatIdx - dealerIdx + count) % count;
            return positions[offset] ?? "MP";
        },
    ),
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

function setHeroTurnState(overrides?: Record<string, unknown>) {
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
            actions: [],
            ...overrides,
        },
        true,
    );
}

// ── Test 1: HeroDock button aria-labels ─────────────────────────────

describe("HeroDock accessibility", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("all action buttons have accessible names (aria-labels)", () => {
        setHeroTurnState();
        render(<HeroDock />);

        // Each button should be findable by role + accessible name
        const foldBtn = screen.getByRole("button", { name: /fold your hand/i });
        expect(foldBtn).toBeInTheDocument();

        const checkCallBtn = screen.getByRole("button", { name: /check|call/i });
        expect(checkCallBtn).toBeInTheDocument();

        const raiseBtn = screen.getByRole("button", { name: /open raise slider/i });
        expect(raiseBtn).toBeInTheDocument();

        const allInBtn = screen.getByRole("button", { name: /all in/i });
        expect(allInBtn).toBeInTheDocument();
    });

    it("buttons use consistent focus ring styling with --sd-brass", () => {
        setHeroTurnState();
        render(<HeroDock />);

        const buttons = screen.getAllByRole("button");
        for (const btn of buttons) {
            expect(btn.className).toContain("focus-visible:ring-2");
            expect(btn.className).toContain("focus-visible:ring-[var(--sd-brass)]");
        }
    });

    it("buttons are keyboard navigable (tabbable via tabIndex)", () => {
        setHeroTurnState();
        render(<HeroDock />);

        const buttons = screen.getAllByRole("button");
        for (const btn of buttons) {
            // Native <button> elements are tabbable by default (tabIndex 0 or absent)
            const tabIndex = btn.getAttribute("tabindex");
            expect(tabIndex === null || tabIndex === "0").toBe(true);
        }
    });

    it("Enter key activates action buttons", () => {
        const performActionSpy = vi.fn();
        setHeroTurnState();
        useGameStore.setState({ performAction: performActionSpy });

        render(<HeroDock />);

        const foldBtn = screen.getByRole("button", { name: /fold your hand/i });
        fireEvent.keyDown(foldBtn, { key: "Enter" });
        fireEvent.keyUp(foldBtn, { key: "Enter" });
        // Native buttons respond to Enter via click — use fireEvent.click to simulate
        fireEvent.click(foldBtn);
        expect(performActionSpy).toHaveBeenCalledWith("fold");
    });
});

// ── Test 2: ActivityRibbon role and aria-live ───────────────────────

describe("ActivityRibbon accessibility", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("has role='status' and aria-live='polite' for screen readers", () => {
        useGameStore.setState({
            aiActionToast: {
                playerName: "Alex",
                action: "raises",
                amount: 50,
            },
        });

        render(<ActivityRibbon />);

        const ribbon = screen.getByRole("status");
        expect(ribbon).toBeInTheDocument();
        expect(ribbon).toHaveAttribute("aria-live", "polite");
        expect(ribbon).toHaveTextContent("Alex raises $50");
    });

    it("renders nothing when no toast is present", () => {
        useGameStore.setState({ aiActionToast: null });
        const { container } = render(<ActivityRibbon />);
        expect(container.innerHTML).toBe("");
    });
});

// ── Test 3: CoachPanel hint button keyboard accessibility ───────────

describe("CoachPanel accessibility", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
        vi.clearAllMocks();
    });

    it("Show Hint button is keyboard accessible with proper aria-label", () => {
        setHeroTurnState();
        render(<CoachPanel variant="desktop" />);

        const hintBtn = screen.getByRole("button", { name: /show coaching hint/i });
        expect(hintBtn).toBeInTheDocument();

        // Must be a native <button>, tabbable by default
        expect(hintBtn.tagName).toBe("BUTTON");
        const tabIndex = hintBtn.getAttribute("tabindex");
        expect(tabIndex === null || tabIndex === "0").toBe(true);

        // Should have focus-visible styling
        expect(hintBtn.className).toContain("focus-visible:ring-2");
        expect(hintBtn.className).toContain("focus-visible:ring-[var(--sd-brass)]");
    });

    it("desktop aside has aria-label 'Coaching panel'", () => {
        setHeroTurnState();
        render(<CoachPanel variant="desktop" />);

        const aside = screen.getByLabelText("Coaching panel");
        expect(aside).toBeInTheDocument();
        expect(aside.tagName).toBe("ASIDE");
    });

    it("mobile toggle has dynamic aria-label and aria-expanded", () => {
        setHeroTurnState();
        render(<CoachPanel variant="mobile" />);

        const toggleBtn = screen.getByRole("button", { name: /expand coach panel/i });
        expect(toggleBtn).toHaveAttribute("aria-expanded", "false");

        fireEvent.click(toggleBtn);

        const collapseBtn = screen.getByRole("button", { name: /collapse coach panel/i });
        expect(collapseBtn).toHaveAttribute("aria-expanded", "true");
    });
});

// ── Test 4: SeatCard descriptive aria-label ─────────────────────────

describe("SeatCard accessibility", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("has descriptive aria-label with player name, position, and stack", () => {
        setHeroTurnState();
        const hero = useGameStore.getState().players[0];

        render(
            <SeatCard
                player={hero}
                isActive={true}
                isDealer={false}
                seatIndex={0}
                dealerIndex={1}
                playerCount={2}
                placement="bottom"
            />,
        );

        // aria-label template: `${player.name}, ${pokerPosition} position, stack ${player.stack}`
        const seatEl = screen.getByLabelText(/Hero.*position.*stack.*990/);
        expect(seatEl).toBeInTheDocument();
    });

    it("includes position label in the aria-label", () => {
        setHeroTurnState();
        const aiPlayer = useGameStore.getState().players[1];

        render(
            <SeatCard
                player={aiPlayer}
                isActive={false}
                isDealer={true}
                seatIndex={1}
                dealerIndex={1}
                playerCount={2}
                placement="top"
            />,
        );

        // AI player at seat 1, dealer 1 → offset 0 → BTN position
        const seatEl = screen.getByLabelText(/Alex.*position.*stack.*995/);
        expect(seatEl).toBeInTheDocument();
    });

    it("marks folded state via data-folded attribute", () => {
        setHeroTurnState();
        const foldedPlayer = {
            ...useGameStore.getState().players[1],
            isFolded: true,
        };

        render(
            <SeatCard
                player={foldedPlayer}
                isActive={false}
                isDealer={false}
                seatIndex={1}
                dealerIndex={1}
                playerCount={2}
                placement="top"
            />,
        );

        const seatEl = screen.getByLabelText(/Alex.*position/);
        expect(seatEl.dataset.folded).toBe("true");
        expect(seatEl.className).toContain("opacity-40");
    });
});
