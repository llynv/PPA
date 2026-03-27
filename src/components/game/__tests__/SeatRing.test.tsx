import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeatRing } from "../SeatRing";
import { SeatCard } from "../SeatCard";
import { PlayingCard, FaceDownCard } from "../PlayingCard";
import { useGameStore } from "../../../store/gameStore";
import type { Player } from "../../../types/poker";

// ── Helpers ─────────────────────────────────────────────────────────

function makePlayer(overrides: Partial<Player> & { id: string; name: string }): Player {
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

function makePlayers(n: number): Player[] {
    const names = ["Hero", "Alex", "Blake", "Casey", "Dana", "Ellis"];
    return Array.from({ length: n }, (_, i) =>
        makePlayer({
            id: `p${i}`,
            name: names[i] ?? `Player${i}`,
            isHero: i === 0,
            isDealer: i === 1,
        }),
    );
}

/**
 * Sets the game store to a minimal "playing" state so SeatCard
 * can read Zustand selectors without errors.
 */
function setPlayingState(playerCount: number) {
    const players = makePlayers(playerCount);
    useGameStore.setState(
        {
            ...useGameStore.getInitialState(),
            settings: {
                playerCount,
                smallBlind: 5,
                bigBlind: 10,
                startingStack: 1000,
            },
            players,
            dealerIndex: 1,
            handNumber: 1,
            currentRound: "flop",
            gamePhase: "playing",
            communityCards: [
                { rank: "2", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "J", suit: "hearts" },
            ],
            pot: 30,
            activePlayerIndex: 0,
        },
        true,
    );
    return players;
}

// ── SeatRing Tests ──────────────────────────────────────────────────

describe("SeatRing", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it.each([2, 3, 4, 5, 6])("renders correct number of seats for %i players", (n) => {
        const players = setPlayingState(n);
        render(
            <SeatRing
                players={players}
                activePlayerIndex={0}
                dealerIndex={1}
                isShowdown={false}
            />,
        );

        // Each seat has an aria-label on the profile card with "position" in text
        const seatCards = screen.getAllByLabelText(/position/);
        expect(seatCards).toHaveLength(n);
    });

    it("places hero (index 0) at approximately bottom center (y > 80%)", () => {
        const players = setPlayingState(4);
        render(
            <SeatRing
                players={players}
                activePlayerIndex={0}
                dealerIndex={1}
                isShowdown={false}
            />,
        );

        // Hero's aria-label starts with "Hero"
        const heroCard = screen.getByLabelText(/^Hero/);
        // Walk up to the positioned wrapper (parent of the flex container → the absolute div)
        const positionedWrapper = heroCard.closest(".absolute") as HTMLElement;
        const topStyle = positionedWrapper.style.top;
        // Trig: angle = -PI/2, y = 50 - 38*sin(-PI/2) = 50 + 38 = 88%
        const yValue = parseFloat(topStyle);
        expect(yValue).toBeGreaterThan(80);
    });
});

// ── SeatCard Tests ──────────────────────────────────────────────────

describe("SeatCard", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("shows player name, stack, position tag", () => {
        const players = setPlayingState(2);
        render(
            <SeatCard
                player={players[0]}
                isActive={false}
                isDealer={false}
                seatIndex={0}
                dealerIndex={1}
                playerCount={2}
                placement="bottom"
            />,
        );

        expect(screen.getByText("Hero")).toBeInTheDocument();
        expect(screen.getByText("1000.00")).toBeInTheDocument();
        // Position tag — index 0, dealer 1, 2 players → offset 1 → BB
        expect(screen.getByText("BB")).toBeInTheDocument();
    });

    it("shows active ring when isActive", () => {
        const players = setPlayingState(2);
        render(
            <SeatCard
                player={players[0]}
                isActive={true}
                isDealer={false}
                seatIndex={0}
                dealerIndex={1}
                playerCount={2}
                placement="bottom"
            />,
        );

        const card = screen.getByLabelText(/Hero.*position/);
        expect(card.dataset.active).toBe("true");
    });

    it("shows dealer button when isDealer", () => {
        const players = setPlayingState(2);
        render(
            <SeatCard
                player={players[1]}
                isActive={false}
                isDealer={true}
                seatIndex={1}
                dealerIndex={1}
                playerCount={2}
                placement="top"
            />,
        );

        expect(screen.getByText("D")).toBeInTheDocument();
    });

    it("shows folded state with reduced opacity", () => {
        const players = setPlayingState(2);
        const foldedPlayer = { ...players[0], isFolded: true };
        render(
            <SeatCard
                player={foldedPlayer}
                isActive={false}
                isDealer={false}
                seatIndex={0}
                dealerIndex={1}
                playerCount={2}
                placement="bottom"
            />,
        );

        const card = screen.getByLabelText(/Hero.*position/);
        expect(card.dataset.folded).toBe("true");
        expect(card.className).toContain("opacity-40");
    });
});

// ── PlayingCard Tests ───────────────────────────────────────────────

describe("PlayingCard", () => {
    it("renders rank and suit symbol for face-up card", () => {
        render(
            <PlayingCard card={{ rank: "A", suit: "spades" }} />,
        );

        const card = screen.getByLabelText("A of spades");
        expect(card).toBeInTheDocument();
        expect(card).toHaveTextContent("A");
        expect(card).toHaveTextContent("♠");
    });

    it("renders face-down pattern", () => {
        render(
            <FaceDownCard />,
        );

        expect(screen.getByLabelText("Face-down card")).toBeInTheDocument();
    });
});
