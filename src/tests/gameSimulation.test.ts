import { Card, GameState, Player } from "@/types/game";
import { calculateBotMove } from "@/utils/botLogic";
import { validateContract } from "@/utils/rules";

describe("Carioca Game Simulation", () => {
    const createCard = (suit: string, value: number, id: string): Card => ({
        id,
        suit: suit as any,
        value,
        displayValue: value === 1 ? 'A' : value === 11 ? 'J' : value === 12 ? 'Q' : value === 13 ? 'K' : String(value)
    });

    const setupGameState = (round: number, players: Player[]): GameState => ({
        players,
        deck: [],
        discardPile: [],
        currentTurn: 0,
        currentRound: round,
        direction: "counter-clockwise",
        status: "PLAYING",
        reshuffleCount: 0
    });

    test("Round 1: 3 Players, Bot should go down with 1 Group of Different Suits", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 2, "b1s2"),
                createCard("HEART", 5, "b1h5"),
                createCard("CLUB", 9, "b1c9"), // Different suits Group
                createCard("DIAMOND", 4, "b1d4"),
                createCard("SPADE", 7, "b1s7"),
                createCard("HEART", 11, "b1h11"),
                createCard("CLUB", 12, "b1c12"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        const gameState = setupGameState(1, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1);
            expect(groups[0].length).toBe(3);

            const validation = validateContract(groups, 1);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 1");
        }
    });

    test("Round 8: Bot should only go down with 1 Escala of 7+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 1, "s1"),
                createCard("SPADE", 2, "s2"),
                createCard("SPADE", 3, "s3"),
                createCard("SPADE", 4, "s4"),
                createCard("SPADE", 5, "s5"),
                createCard("SPADE", 6, "s6"),
                createCard("SPADE", 7, "s7"), // Escala of 7
                createCard("HEART", 11, "h11"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        const gameState = setupGameState(8, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1);
            expect(groups[0].length).toBe(7);

            const validation = validateContract(groups, 8);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 8");
        }
    });
});
