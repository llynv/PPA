import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BoardCenter } from "../BoardCenter";
import { ActivityRibbon } from "../ActivityRibbon";
import { useGameStore } from "../../../store/gameStore";

/**
 * Sets the store into a minimal "playing" state with community cards
 * so BoardCenter and its children render without errors.
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
            pot: 42.5,
            activePlayerIndex: 0,
        },
        true,
    );
}

describe("BoardCenter", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders pot amount", () => {
        setPlayingState();
        render(<BoardCenter />);

        expect(screen.getByText("Pot: 42.50")).toBeInTheDocument();
    });

    it("renders community cards", () => {
        setPlayingState();
        render(<BoardCenter />);

        // CommunityCards renders 3 dealt cards + 2 empty slots
        const emptySlots = screen.getAllByLabelText("Empty card slot");
        expect(emptySlots).toHaveLength(2);
    });

    it("renders street label below cards", () => {
        setPlayingState();
        render(<BoardCenter />);

        const label = screen.getByTestId("board-street-label");
        expect(label).toHaveTextContent("Flop");
    });
});

describe("ActivityRibbon", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders AI action message when toast is present", () => {
        useGameStore.setState({
            aiActionToast: {
                playerName: "Alex",
                action: "raises",
                amount: 50,
            },
        });
        render(<ActivityRibbon />);

        expect(screen.getByRole("status")).toHaveTextContent(
            "Alex raises $50",
        );
    });

    it("renders nothing when no toast", () => {
        useGameStore.setState({ aiActionToast: null });
        const { container } = render(<ActivityRibbon />);

        expect(container.firstChild).toBeNull();
    });

    it("never has absolute positioning over center", () => {
        useGameStore.setState({
            aiActionToast: {
                playerName: "Alex",
                action: "calls",
            },
        });
        render(<ActivityRibbon />);

        const ribbon = screen.getByRole("status");
        const classes = ribbon.className;
        const style = ribbon.getAttribute("style") ?? "";

        expect(classes).not.toContain("absolute");
        expect(style).not.toContain("position: absolute");
        expect(style).not.toContain("position:absolute");
    });
});
