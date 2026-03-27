import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TableShell } from "../TableShell";
import { useGameStore } from "../../../store/gameStore";

/**
 * Wraps component with MemoryRouter since TableShell's children
 * (ShowdownOverlay) may use routing-dependent features.
 */
function renderInRouter(ui: React.ReactElement) {
    return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/**
 * Sets the store into a minimal "playing" state so TableShell
 * and its children render without errors.
 */
function setPlayingState() {
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
                    stack: 990,
                    holeCards: [
                        { rank: "A", suit: "spades" },
                        { rank: "K", suit: "hearts" },
                    ],
                    isDealer: false,
                    isFolded: false,
                    currentBet: 10,
                    isHero: true,
                    isAllIn: false,
                },
                {
                    id: "ai-1",
                    name: "Alex",
                    stack: 995,
                    holeCards: [
                        { rank: "Q", suit: "clubs" },
                        { rank: "J", suit: "diamonds" },
                    ],
                    isDealer: true,
                    isFolded: false,
                    currentBet: 5,
                    isHero: false,
                    isAllIn: false,
                    personality: "TAG",
                },
            ],
            dealerIndex: 1,
            handNumber: 3,
            currentRound: "flop",
            gamePhase: "playing",
            communityCards: [
                { rank: "2", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "J", suit: "hearts" },
            ],
            pot: 20,
            activePlayerIndex: 0,
        },
        true,
    );
}

/**
 * Returns the GameTopBar container element.
 * GameTopBar is the first child of the TableShell flex column —
 * the shrink-0 div with the sd-surface background.
 */
function getTopBar(): HTMLElement {
    // GameTopBar renders "Hand #" text which is unique to it
    const handLabel = screen.getByText(/Hand #/);
    // Walk up to the bar container (parent span → parent div)
    return handLabel.closest(
        "[class*='shrink-0'][class*='flex'][class*='justify-between']",
    ) as HTMLElement;
}

describe("TableShell", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders GameTopBar with hand number", () => {
        setPlayingState();
        renderInRouter(<TableShell />);

        expect(screen.getByText(/Hand #3/)).toBeInTheDocument();
    });

    it("displays the current round label in GameTopBar", () => {
        setPlayingState();
        renderInRouter(<TableShell />);

        const topBar = getTopBar();
        expect(within(topBar).getByText("Flop")).toBeInTheDocument();
    });

    it("displays blind levels in GameTopBar", () => {
        setPlayingState();
        renderInRouter(<TableShell />);

        const topBar = getTopBar();
        expect(within(topBar).getByText("5/10")).toBeInTheDocument();
    });

    it("renders the table stage content area", () => {
        setPlayingState();
        renderInRouter(<TableShell />);

        // SeatRing renders player seats — verify a player name appears
        expect(screen.getByText("Hero")).toBeInTheDocument();
        // BoardCenter renders the pot amount
        expect(screen.getByText(/Pot:/)).toBeInTheDocument();
    });

    it("renders GameTopBar round label for preflop", () => {
        setPlayingState();
        useGameStore.setState({ currentRound: "preflop" });
        renderInRouter(<TableShell />);

        const topBar = getTopBar();
        expect(within(topBar).getByText("Preflop")).toBeInTheDocument();
    });
});
