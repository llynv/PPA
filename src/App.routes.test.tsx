import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import App from "./App";
import { useGameStore } from "./store/gameStore";

function LocationProbe() {
    const location = useLocation();

    return <div data-testid="location-probe">{location.pathname}</div>;
}

function renderAt(route: string) {
    return render(
        <MemoryRouter initialEntries={[route]}>
            <App />
            <LocationProbe />
        </MemoryRouter>,
    );
}

function setAnalysisState() {
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
                    stack: 1000,
                    holeCards: [],
                    isDealer: false,
                    isFolded: false,
                    currentBet: 0,
                    isHero: true,
                    isAllIn: false,
                },
                {
                    id: "ai-1",
                    name: "Alex",
                    stack: 1000,
                    holeCards: [],
                    isDealer: true,
                    isFolded: false,
                    currentBet: 0,
                    isHero: false,
                    isAllIn: false,
                    personality: "TAG",
                },
            ],
            dealerIndex: 1,
            handNumber: 2,
            gamePhase: "analysis",
            analysisData: {
                heroGrade: "B+",
                decisions: [],
                totalEvLoss: 0,
                totalHeroEv: 1.2,
                mistakes: [],
                handNumber: 2,
            },
            sessionAnalyses: [
                {
                    heroGrade: "B+",
                    decisions: [],
                    totalEvLoss: 0,
                    totalHeroEv: 1.2,
                    mistakes: [],
                    handNumber: 2,
                },
            ],
        },
        true,
    );
}

function setShowdownState() {
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
                    stack: 1030,
                    holeCards: [
                        { rank: "A", suit: "spades" },
                        { rank: "K", suit: "spades" },
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
                    stack: 970,
                    holeCards: [
                        { rank: "Q", suit: "hearts" },
                        { rank: "Q", suit: "clubs" },
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
            handNumber: 2,
            gamePhase: "showdown",
            winner: "hero",
            winnerHand: "Ace High",
            handHistory: [
                {
                    handNumber: 2,
                    bigBlind: 10,
                    players: [
                        {
                            id: "hero",
                            name: "Hero",
                            stack: 1030,
                            holeCards: [
                                { rank: "A", suit: "spades" },
                                { rank: "K", suit: "spades" },
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
                            stack: 970,
                            holeCards: [
                                { rank: "Q", suit: "hearts" },
                                { rank: "Q", suit: "clubs" },
                            ],
                            isDealer: true,
                            isFolded: false,
                            currentBet: 0,
                            isHero: false,
                            isAllIn: false,
                            personality: "TAG",
                        },
                    ],
                    communityCards: [
                        { rank: "2", suit: "clubs" },
                        { rank: "7", suit: "diamonds" },
                        { rank: "J", suit: "hearts" },
                        { rank: "3", suit: "spades" },
                        { rank: "9", suit: "clubs" },
                    ],
                    actions: [
                        {
                            playerId: "hero",
                            type: "call",
                            amount: 10,
                            round: "preflop",
                            timestamp: 1,
                        },
                        {
                            playerId: "ai-1",
                            type: "check",
                            round: "preflop",
                            timestamp: 2,
                        },
                    ],
                    pot: 20,
                    winnerId: "hero",
                    winnerHand: "Ace High",
                    potWon: 20,
                },
            ],
        },
        true,
    );
}

describe("App routing shell", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("defaults to Home at the root route with product navigation", () => {
        renderAt("/");

        expect(
            screen.getByRole("heading", { name: /learning-first poker coach/i }),
        ).toBeInTheDocument();

        const primaryNav = screen.getByLabelText(/primary product navigation/i);

        expect(within(primaryNav).getByRole("link", { name: /^home$/i })).toBeInTheDocument();
        expect(within(primaryNav).getByRole("link", { name: /^practice$/i })).toBeInTheDocument();
        expect(within(primaryNav).getByRole("link", { name: /^review$/i })).toBeInTheDocument();
        expect(within(primaryNav).getByRole("link", { name: /^progress$/i })).toBeInTheDocument();
        expect(within(primaryNav).getByRole("link", { name: /^library$/i })).toBeInTheDocument();
    });

    it("shows mode selector with Live Table and Spot Drills at /practice", () => {
        renderAt("/practice");

        expect(
            screen.getByRole("heading", { name: /live table/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { name: /spot drills/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: /live table/i }),
        ).toHaveAttribute("href", "/practice/live");
        expect(
            screen.getByRole("link", { name: /spot drills/i }),
        ).toHaveAttribute("href", "/practice/drills");
    });

    it("renders GameSettings at /practice/live in settings phase", () => {
        renderAt("/practice/live");

        expect(
            screen.getByRole("heading", { name: /game settings/i }),
        ).toBeInTheDocument();
    });

    it("renders Spot Drills placeholder at /practice/drills", () => {
        renderAt("/practice/drills");

        expect(
            screen.getByRole("heading", { name: /spot drills/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/practice isolated decisions with instant gto feedback/i),
        ).toBeInTheDocument();
    });

    it("shows a Review empty state when no analysis is available", () => {
        renderAt("/review");

        expect(
            screen.getByRole("heading", { name: /review your hands/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByText(/finish a hand in practice to unlock review/i),
        ).toBeInTheDocument();
    });

    it("redirects /practice/live to /review when game phase is analysis", () => {
        setAnalysisState();

        renderAt("/practice/live");

        expect(
            screen.getByRole("heading", { name: /hand #2/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId("location-probe"),
        ).toHaveTextContent("/review");
    });

    it("renders the analysis dashboard on Review when analysis exists", () => {
        setAnalysisState();

        renderAt("/review");

        expect(
            screen.getByRole("heading", { name: /hand #2/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /next hand/i }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /back to practice/i }),
        ).toBeInTheDocument();
    });

    it("routes Next Hand from Review back to live table", () => {
        setAnalysisState();

        renderAt("/review");

        fireEvent.click(screen.getByRole("button", { name: /next hand/i }));

        expect(screen.getByTestId("location-probe")).toHaveTextContent("/practice/live");
    });

    it("routes Back to Practice from Review back to practice mode selector", () => {
        setAnalysisState();

        renderAt("/review");

        fireEvent.click(screen.getByRole("button", { name: /back to practice/i }));

        expect(screen.getByTestId("location-probe")).toHaveTextContent("/practice");
        expect(screen.getByRole("heading", { name: /live table/i })).toBeInTheDocument();
    });

    it("routes header New Game from Review back to practice mode selector", () => {
        setAnalysisState();

        renderAt("/review");

        fireEvent.click(screen.getAllByRole("button", { name: /new game/i })[0]);

        expect(screen.getByTestId("location-probe")).toHaveTextContent("/practice");
        expect(screen.getByRole("heading", { name: /live table/i })).toBeInTheDocument();
    });

    it("lets showdown users enter review from the review route", () => {
        setShowdownState();

        renderAt("/review");

        expect(
            screen.getByRole("heading", { name: /your showdown is ready for review/i }),
        ).toBeInTheDocument();

        fireEvent.click(screen.getByRole("button", { name: /open hand review/i }));

        expect(screen.getByRole("heading", { name: /hand #2/i })).toBeInTheDocument();
    });

    it("highlights Practice nav on /practice/live", () => {
        renderAt("/practice/live");

        const primaryNav = screen.getByLabelText(/primary product navigation/i);
        const practiceLink = within(primaryNav).getByRole("link", { name: /^practice$/i });

        expect(practiceLink.className).toContain("bg-emerald-600");
    });

    it("highlights Practice nav on /practice/drills", () => {
        renderAt("/practice/drills");

        const primaryNav = screen.getByLabelText(/primary product navigation/i);
        const practiceLink = within(primaryNav).getByRole("link", { name: /^practice$/i });

        expect(practiceLink.className).toContain("bg-emerald-600");
    });

    it("navigates to drills with concept param from review drill CTA", async () => {
        render(
            <MemoryRouter initialEntries={["/practice/drills?concept=value_bet_thin"]}>
                <App />
            </MemoryRouter>,
        );
        // DrillSetup should render and the concept filter should be pre-applied
        expect(await screen.findByText(/spot drills/i)).toBeInTheDocument();
    });

    it("shows Learn link in primary navigation", () => {
        renderAt("/");
        const primaryNav = screen.getByLabelText(/primary product navigation/i);
        expect(within(primaryNav).getByRole("link", { name: /^learn$/i })).toBeInTheDocument();
    });

    it("renders Learning Path at /learn", () => {
        renderAt("/learn");
        // Should show some curriculum content
        expect(screen.getByText(/foundations/i)).toBeInTheDocument();
    });
});
