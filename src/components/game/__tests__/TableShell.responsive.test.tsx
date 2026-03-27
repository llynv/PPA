import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TableShell } from "../TableShell";
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

function renderShell() {
    return render(
        <MemoryRouter>
            <TableShell />
        </MemoryRouter>,
    );
}

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
                    isDealer: true,
                    stack: 995,
                    currentBet: 5,
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
            pot: 30,
            activePlayerIndex: 0,
            trainingMode: true,
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
                    isDealer: true,
                    stack: 995,
                    currentBet: 5,
                    personality: "TAG",
                }),
            ],
            dealerIndex: 1,
            handNumber: 1,
            currentRound: "river",
            gamePhase: "showdown",
            communityCards: [
                { rank: "2", suit: "clubs" },
                { rank: "7", suit: "diamonds" },
                { rank: "J", suit: "hearts" },
                { rank: "Q", suit: "spades" },
                { rank: "K", suit: "clubs" },
            ],
            pot: 100,
            activePlayerIndex: 0,
            winner: "hero",
            winnerHand: "Pair of Kings",
        },
        true,
    );
}

// ── Tests ───────────────────────────────────────────────────────────

describe("TableShell responsive composition", () => {
    beforeEach(() => {
        useGameStore.setState(useGameStore.getInitialState(), true);
    });

    it("renders the desktop coach rail", () => {
        setPlayingState();
        renderShell();

        expect(screen.getByTestId("coach-panel-desktop")).toBeInTheDocument();
    });

    it("renders the mobile coach panel", () => {
        setPlayingState();
        renderShell();

        expect(screen.getByTestId("coach-panel-mobile")).toBeInTheDocument();
    });

    it("renders seats via SeatRing with player names visible", () => {
        setPlayingState();
        renderShell();

        expect(screen.getByText("Hero")).toBeInTheDocument();
        expect(screen.getByText("Alex")).toBeInTheDocument();
    });

    it("renders BoardCenter with pot visible", () => {
        setPlayingState();
        renderShell();

        expect(screen.getByText(/Pot:\s*30\.00/)).toBeInTheDocument();
    });

    it("renders HeroDock below table during playing phase", () => {
        setPlayingState();
        renderShell();

        expect(screen.getByTestId("hero-dock")).toBeInTheDocument();
    });

    it("renders ShowdownOverlay during showdown phase", () => {
        setShowdownState();
        renderShell();

        expect(screen.getByText(/Hero wins!/)).toBeInTheDocument();
        expect(screen.getByText("Pair of Kings")).toBeInTheDocument();
        expect(screen.getByText("View Analysis")).toBeInTheDocument();
        expect(screen.getByText("Next Hand")).toBeInTheDocument();
    });

    it("hides HeroDock during showdown phase", () => {
        setShowdownState();
        renderShell();

        expect(screen.queryByTestId("hero-dock")).not.toBeInTheDocument();
    });

    it("integration: settings → playing → showdown flow works", () => {
        // Start with settings phase — no table content
        useGameStore.setState(
            {
                ...useGameStore.getInitialState(),
                gamePhase: "settings",
            },
            true,
        );
        const { rerender } = render(
            <MemoryRouter>
                <TableShell />
            </MemoryRouter>,
        );

        // No players rendered in settings phase
        expect(screen.queryByText("Hero")).not.toBeInTheDocument();
        expect(screen.queryByTestId("hero-dock")).not.toBeInTheDocument();

        // Transition to playing
        setPlayingState();
        rerender(
            <MemoryRouter>
                <TableShell />
            </MemoryRouter>,
        );

        expect(screen.getByText("Hero")).toBeInTheDocument();
        expect(screen.getByText("Alex")).toBeInTheDocument();
        expect(screen.getByTestId("hero-dock")).toBeInTheDocument();
        expect(screen.queryByText(/wins!/)).not.toBeInTheDocument();

        // Transition to showdown
        setShowdownState();
        rerender(
            <MemoryRouter>
                <TableShell />
            </MemoryRouter>,
        );

        expect(screen.getByText(/Hero wins!/)).toBeInTheDocument();
        expect(screen.queryByTestId("hero-dock")).not.toBeInTheDocument();
    });
});
