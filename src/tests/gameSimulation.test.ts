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

    test("Round 1: 3 Players, Bot should only go down with 1 Trio", () => {
        // Player 1: Human
        const human: Player = {
            id: "human",
            name: "Human",
            hand: [
                createCard("SPADE", 2, "s2"),
                createCard("HEART", 2, "h2"),
                createCard("CLUB", 2, "c2"), // Potential trio
                createCard("DIAMOND", 5, "d5"),
                createCard("SPADE", 7, "s7"),
                createCard("HEART", 9, "h9"),
                createCard("CLUB", 10, "c10"),
                createCard("DIAMOND", 11, "d11"),
                createCard("SPADE", 12, "s12"),
                createCard("HEART", 13, "h13"),
                createCard("CLUB", 1, "c1"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        // Player 2: Bot 1 (Medium) - Has 2 trios, but Round 1 only needs 1
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 3, "b1s3"),
                createCard("HEART", 3, "b1h3"),
                createCard("CLUB", 3, "b1c3"), // Trio 1
                createCard("DIAMOND", 4, "b1d4"),
                createCard("SPADE", 4, "b1s4"),
                createCard("HEART", 4, "b1h4"), // Trio 2
                createCard("CLUB", 8, "b1c8"),
                createCard("DIAMOND", 9, "b1d9"),
                createCard("SPADE", 10, "b1s10"),
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

        // Player 3: Bot 2 (Hard)
        const bot2: Player = {
            id: "bot2",
            name: "Bot 2",
            isBot: true,
            difficulty: "HARD",
            hand: [],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: false
        };

        const gameState = setupGameState(1, [human, bot1, bot2]);

        // Turn is bot1's turn (index 1)
        gameState.currentTurn = 1;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1); // Should ONLY be 1 trio for Round 1
            expect(groups[0].length).toBeGreaterThanOrEqual(3);

            // Validate with rules
            const validation = validateContract(groups, 1);
            expect(validation.valid).toBe(true);
        } else {
            // If it didn't choose DOWN, maybe it wanted to discard? 
            // But with 2 trios in hand it should definitely go down.
            fail("Bot 1 should have chosen to go DOWN in Round 1");
        }
    });

    test("Round 2: Bot should only go down with 2 Trios", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 3, "b1s3"),
                createCard("HEART", 3, "b1h3"),
                createCard("CLUB", 3, "b1c3"), // Trio 1
                createCard("DIAMOND", 4, "b1d4"),
                createCard("SPADE", 4, "b1s4"),
                createCard("HEART", 4, "b1h4"), // Trio 2
                createCard("CLUB", 8, "b1c8"), // Third trio potential?
                createCard("DIAMOND", 8, "b1d8"),
                createCard("SPADE", 8, "b1s8"),
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

        const gameState = setupGameState(2, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(2); // Should ONLY be 2 trios for Round 2

            const validation = validateContract(groups, 2);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 2");
        }
    });

    test("Round 3: Bot should only go down with 1 Trio of 4+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 5, "b1s5"),
                createCard("HEART", 5, "b1h5"),
                createCard("CLUB", 5, "b1c5"),
                createCard("DIAMOND", 5, "b1d5"), // Trio of 4
                createCard("SPADE", 10, "b1s10"),
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

        const gameState = setupGameState(3, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1);
            expect(groups[0].length).toBe(4);

            const validation = validateContract(groups, 3);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 3");
        }
    });

    test("Round 4: Bot should only go down with 2 Trios of 4+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 3, "s3"),
                createCard("HEART", 3, "h3"),
                createCard("CLUB", 3, "c3"),
                createCard("DIAMOND", 3, "d3"), // Group 1
                createCard("SPADE", 4, "s4"),
                createCard("HEART", 4, "h4"),
                createCard("CLUB", 4, "c4"),
                createCard("DIAMOND", 4, "d4"), // Group 2
                createCard("CLUB", 8, "c8"),
                createCard("DIAMOND", 9, "d9"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        const gameState = setupGameState(4, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(2);
            expect(groups[0].length).toBe(4);
            expect(groups[1].length).toBe(4);

            const validation = validateContract(groups, 4);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 4");
        }
    });

    test("Round 5: Bot should only go down with 1 Trio of 5+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 7, "s7-1"),
                createCard("HEART", 7, "h7-1"),
                createCard("CLUB", 7, "c7-1"),
                createCard("DIAMOND", 7, "d7-1"),
                createCard("SPADE", 7, "s7-2"), // Trio of 5
                createCard("HEART", 11, "h11"),
                createCard("CLUB", 12, "c12"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        const gameState = setupGameState(5, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1);
            expect(groups[0].length).toBe(5);

            const validation = validateContract(groups, 5);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 5");
        }
    });

    test("Round 6: Bot should only go down with 2 Trios of 5+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 3, "s3-1"), createCard("HEART", 3, "h3-1"), createCard("CLUB", 3, "c3-1"), createCard("DIAMOND", 3, "d3-1"), createCard("SPADE", 3, "s3-2"), // Trio 1
                createCard("SPADE", 4, "s4-1"), createCard("HEART", 4, "h4-1"), createCard("CLUB", 4, "c4-1"), createCard("DIAMOND", 4, "d4-1"), createCard("SPADE", 4, "s4-2"), // Trio 2
                createCard("CLUB", 8, "c8"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        // Fix Typo in test generation
        bot1.hand = [
            createCard("SPADE", 3, "s3-1"), createCard("HEART", 3, "h3-1"), createCard("CLUB", 3, "c3-1"), createCard("DIAMOND", 3, "d3-1"), createCard("SPADE", 3, "s3-2"),
            createCard("SPADE", 4, "s4-1"), createCard("HEART", 4, "h4-1"), createCard("CLUB", 4, "c4-1"), createCard("DIAMOND", 4, "d4-1"), createCard("SPADE", 4, "s4-2"),
            createCard("CLUB", 8, "c8"),
        ];

        const gameState = setupGameState(6, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(2);
            expect(groups[0].length).toBe(5);
            expect(groups[1].length).toBe(5);

            const validation = validateContract(groups, 6);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 6");
        }
    });

    test("Round 7: Bot should only go down with 1 Trio of 6+", () => {
        const bot1: Player = {
            id: "bot1",
            name: "Bot 1",
            isBot: true,
            difficulty: "MEDIUM",
            hand: [
                createCard("SPADE", 9, "s9-1"), createCard("HEART", 9, "h9-1"), createCard("CLUB", 9, "c9-1"),
                createCard("DIAMOND", 9, "d9-1"), createCard("SPADE", 9, "s9-2"), createCard("HEART", 9, "h9-2"), // Trio of 6
                createCard("CLUB", 2, "c2"),
            ],
            boughtCards: [],
            score: 0,
            roundScores: [],
            roundBuys: [],
            buysUsed: 0,
            hasDrawn: true
        };

        const gameState = setupGameState(7, [bot1]);
        gameState.currentTurn = 0;

        const move = calculateBotMove(gameState, bot1.id, "MEDIUM");

        expect(move).not.toBeNull();
        if (move && move.action === "DOWN") {
            const groups = move.payload?.groups as Card[][];
            expect(groups.length).toBe(1);
            expect(groups[0].length).toBe(6);

            const validation = validateContract(groups, 7);
            expect(validation.valid).toBe(true);
        } else {
            fail("Bot 1 should have chosen to go DOWN in Round 7");
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

    test("Validation: Should reject invalid groups as per user feedback", () => {
        const invalidGroup = [
            createCard("SPADE", 8, "s8"),
            createCard("DIAMOND", 7, "d7"),
            createCard("CLUB", 5, "c5")
        ];

        const validTrio = [
            createCard("SPADE", 2, "s2"),
            createCard("CLUB", 2, "c2"),
            createCard("HEART", 2, "h2")
        ];

        // Round 1 needs 1 trio. If we send [invalid, valid], it should fail because:
        // 1. Length > 1
        // 2. One is invalid
        const result = validateContract([invalidGroup, validTrio], 1);
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Solo puedes bajar exactamente");
    });
});
