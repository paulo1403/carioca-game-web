import { prisma } from "@/lib/prisma";
import { parsePlayer } from "./utils";
import { handleDrawDeck, handleDrawDiscard } from "./actions/draw";
import { handleDiscard } from "./actions/discard";
import { handleDown, handleAddToMeld } from "./actions/meld";
import { handleStealJoker } from "./actions/joker";
import { handleReadyForNextRound, handleStartNextRound } from "./actions/round";
import { getGameState } from "./GameState";
import { autoReadyBots } from "./botActions";
import { calculateBotMove } from "@/utils/botLogic";

import { getCardPoints } from "./utils";

export { getGameState, autoReadyBots };

export async function checkAndProcessBotTurns(sessionId: string) {
    const MAX_BOT_ITERATIONS = 50;
    const MAX_TIME_PER_TURN = 10000;
    const startTime = Date.now();

    for (let i = 0; i < MAX_BOT_ITERATIONS; i++) {
        const gameState = await getGameState(sessionId);
        if (!gameState || gameState.status !== "PLAYING") break;

        const currentPlayer = gameState.players[gameState.currentTurn];
        if (!currentPlayer.isBot) break;

        // Watchdog timeout - force a move if taking too long
        if (Date.now() - startTime > MAX_TIME_PER_TURN) {
            console.warn(`[Watchdog] Bot ${currentPlayer.name} timeout! Forcing move.`);
            await forceEmergencyMove(sessionId, currentPlayer);
            break;
        }

        const difficulty = currentPlayer.difficulty || "MEDIUM";
        const move = calculateBotMove(gameState, currentPlayer.id, difficulty);

        if (move) {
            // Special handling for DRAW_DISCARD: register buy intent first
            if (move.action === "DRAW_DISCARD") {
                await processMove(sessionId, currentPlayer.id, "INTEND_BUY", {});
            }

            const result = await processMove(sessionId, currentPlayer.id, move.action, move.payload) as any;

            if (!result.success) {
                console.error(`[Bot] Move failed: ${result.error}. Forcing emergency move.`);
                await forceEmergencyMove(sessionId, currentPlayer);
                continue;
            }

            if (result.gameStatus === "ROUND_ENDED" || result.gameStatus === "FINISHED") break;
        } else {
            await forceEmergencyMove(sessionId, currentPlayer);
            continue;
        }
    }
}

async function forceEmergencyMove(sessionId: string, bot: any) {
    // 1. If hasn't drawn, draw from deck
    if (!bot.hasDrawn) {
        await processMove(sessionId, bot.id, "DRAW_DECK");
        // Refetch state for discard
        const state = await getGameState(sessionId);
        const refreshedBot = state?.players.find(p => p.id === bot.id);
        if (refreshedBot && refreshedBot.hand.length > 0) {
            const cardToDiscard = [...refreshedBot.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
            await processMove(sessionId, bot.id, "DISCARD", { cardId: cardToDiscard.id });
        }
    } else if (bot.hand.length > 0) {
        // 2. Already drawn, just discard highest points
        const cardToDiscard = [...bot.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
        await processMove(sessionId, bot.id, "DISCARD", { cardId: cardToDiscard.id });
    }
}

export interface MoveResult {
    success: boolean;
    error?: string;
    status?: number;
    gameStatus?: string;
    [key: string]: any;
}

export async function processMove(
    sessionId: string,
    playerId: string,
    action: string,
    payload: Record<string, any> = {}
): Promise<MoveResult> {
    try {
        const session = await prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                players: { orderBy: { createdAt: "asc" } },
            },
        });

        if (!session) return { success: false, error: "Game not found", status: 404 };
        if (session.status === "FINISHED" && action !== "READY_FOR_NEXT_ROUND") {
            return { success: false, error: "Game finished", status: 400 };
        }

        const players = session.players.map(parsePlayer);
        const currentPlayer = players[session.currentTurn];

        // LAZY PARSING
        let deck: any[] = [];
        if (action.startsWith("DRAW") || action === "START_NEXT_ROUND") {
            deck = JSON.parse(session.deck);
        }

        const discardPile = JSON.parse(session.discardPile);
        const pendingBuyIntents = JSON.parse(session.pendingBuyIntents || "[]");

        let result: MoveResult;

        switch (action) {
            case "DRAW_DECK":
                result = await handleDrawDeck(session, currentPlayer, players, deck, discardPile, session.reshuffleCount);
                break;

            case "DRAW_DISCARD":
                result = await handleDrawDiscard(session, playerId, players, deck, discardPile, session.reshuffleCount, pendingBuyIntents);
                break;

            case "DISCARD":
                result = await handleDiscard(session, playerId, players, discardPile, payload.cardId);
                break;

            case "DOWN":
                result = await handleDown(session, playerId, players, discardPile, payload.groups);
                break;

            case "ADD_TO_MELD":
                result = await handleAddToMeld(session, playerId, players, payload);
                break;

            case "STEAL_JOKER":
                result = await handleStealJoker(session, playerId, players, payload);
                break;

            case "READY_FOR_NEXT_ROUND":
                result = await handleReadyForNextRound(session, playerId, players);
                break;

            case "START_NEXT_ROUND":
                result = await handleStartNextRound(session, playerId, players);
                break;

            case "INTEND_BUY":
            case "INTEND_DRAW_DISCARD":
                const updatedIntents = [...pendingBuyIntents, { playerId, timestamp: Date.now() }];
                await prisma.gameSession.update({
                    where: { id: sessionId },
                    data: { pendingBuyIntents: JSON.stringify(updatedIntents) }
                });
                result = { success: true };
                break;

            default:
                result = { success: false, error: "Action not found", status: 400 };
                break;
        }

        return result;

    } catch (error) {
        console.error("Critical error in processMove:", error);
        return { success: false, error: "Internal server error", status: 500 };
    }
}
