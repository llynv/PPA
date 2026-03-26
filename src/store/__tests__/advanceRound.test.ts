import { describe, it, expect, beforeEach } from "vitest";
import { useGameStore } from "../gameStore";

describe("advanceRound", () => {
    beforeEach(() => {
        useGameStore.getState().resetGame();
    });

    it("burns a card before dealing the flop (deck shrinks by 4: 1 burn + 3 flop)", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        const deckBefore = useGameStore.getState().deck.length;

        // Force all players to be active (not all-in) so advanceRound stops after one street
        const players = useGameStore.getState().players.map((p) => ({
            ...p,
            isAllIn: false,
            isFolded: false,
        }));
        useGameStore.setState({ players, currentRound: "preflop" });

        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        expect(state.currentRound).toBe("flop");
        expect(state.communityCards.length).toBe(3);
        // 1 burn + 3 flop = 4 cards removed
        expect(deckBefore - state.deck.length).toBe(4);
    });

    it("burns a card before dealing the turn (deck shrinks by 2: 1 burn + 1 turn)", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        // Set up flop state with 3 community cards
        const deck = useGameStore.getState().deck;
        const flopCards = deck.slice(0, 3);
        const afterFlop = deck.slice(3);

        const players = useGameStore.getState().players.map((p) => ({
            ...p,
            isAllIn: false,
            isFolded: false,
        }));

        useGameStore.setState({
            players,
            currentRound: "flop",
            communityCards: flopCards,
            deck: afterFlop,
        });

        const deckBefore = useGameStore.getState().deck.length;
        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        expect(state.currentRound).toBe("turn");
        expect(state.communityCards.length).toBe(4);
        // 1 burn + 1 turn = 2 cards removed
        expect(deckBefore - state.deck.length).toBe(2);
    });

    it("burns a card before dealing the river (deck shrinks by 2: 1 burn + 1 river)", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        // Set up turn state with 4 community cards
        const deck = useGameStore.getState().deck;
        const turnCards = deck.slice(0, 4);
        const afterTurn = deck.slice(4);

        const players = useGameStore.getState().players.map((p) => ({
            ...p,
            isAllIn: false,
            isFolded: false,
        }));

        useGameStore.setState({
            players,
            currentRound: "turn",
            communityCards: turnCards,
            deck: afterTurn,
        });

        const deckBefore = useGameStore.getState().deck.length;
        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        expect(state.currentRound).toBe("river");
        expect(state.communityCards.length).toBe(5);
        // 1 burn + 1 river = 2 cards removed
        expect(deckBefore - state.deck.length).toBe(2);
    });

    it("deals all remaining streets when all players are all-in (no recursion)", () => {
        useGameStore.getState().updateSettings({ playerCount: 2 });
        useGameStore.getState().startHand();

        // Set both players as all-in at preflop
        const players = useGameStore.getState().players.map((p) => ({
            ...p,
            isAllIn: true,
            isFolded: false,
        }));

        useGameStore.setState({
            players,
            currentRound: "preflop",
            contributions: { [players[0].id]: 100, [players[1].id]: 100 },
        });

        useGameStore.getState().advanceRound();

        const state = useGameStore.getState();
        // Should have dealt through to showdown
        expect(state.gamePhase).toBe("showdown");
        expect(state.communityCards.length).toBe(5);
    });
});
