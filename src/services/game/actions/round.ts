import { prisma } from "@/lib/prisma";
import { Player, Card } from "@/types/game";
import { shuffleDeck, createDeck } from "@/utils/deck";
import { calculateHandPoints } from "@/utils/rules";
import { applyRemainingBuysPenalty } from "@/utils/buys";
import { autoReadyBots } from "../botActions";
import { getInitialDiscardPile } from "@/utils/gameSetup";

export async function handleReadyForNextRound(session: any, playerId: string, players: Player[]) {
    const readyPlayers = JSON.parse(session.readyForNextRound || "[]") as string[];
    if (readyPlayers.includes(playerId)) return { success: false, error: "Already ready" };

    readyPlayers.push(playerId);
    // Auto-ready bots
    players.forEach(p => {
        if (p.isBot && !readyPlayers.includes(p.id)) readyPlayers.push(p.id);
    });

    await prisma.gameSession.update({
        where: { id: session.id },
        data: { readyForNextRound: JSON.stringify(readyPlayers) }
    });

    return { success: true };
}


export async function handleStartNextRound(session: any, playerId: string, players: Player[]) {
    if (session.creatorId !== playerId) return { success: false, error: "Only host can start", status: 403 };

    const nextRound = session.currentRound + 1;

    // Defensive logging: detect unexpected jumps
    if (nextRound > session.currentRound + 1) {
        console.warn(`[round] Unexpected nextRound jump: session.currentRound=${session.currentRound} computed nextRound=${nextRound}. Clamping to ${session.currentRound + 1}`);
    }

    const newDeck = shuffleDeck(createDeck());
    const newDiscardPile = getInitialDiscardPile();

    const playerUpdates = players.map((p) => {
        const newHand = newDeck.splice(0, 11);
        return prisma.player.update({
            where: { id: p.id },
            data: {
                hand: JSON.stringify(newHand),
                melds: "[]",
                boughtCards: "[]",
                hasDrawn: false,
            },
        });
    });

    const nextStarter = (players.length - (session.currentRound % players.length)) % players.length;

    await Promise.all([
        ...playerUpdates,
        prisma.gameSession.update({
            where: { id: session.id },
            data: {
                currentRound: nextRound,
                currentTurn: nextStarter,
                status: "PLAYING",
                deck: JSON.stringify(newDeck),
                discardPile: JSON.stringify(newDiscardPile),
                readyForNextRound: "[]",
                // Audit the round start for debugging unexpected jumps
                lastAction: JSON.stringify({
                  playerId,
                  type: "START_NEXT_ROUND",
                  description: `Inicio Ronda: ${session.currentRound} -> ${nextRound}`,
                  prevRound: session.currentRound,
                  nextRound,
                  timestamp: Date.now(),
                })
            }
        })
    ]);

    console.info(`[round] startNextRound by ${playerId}: ${session.currentRound} -> ${nextRound}`);

    return { success: true, gameStatus: "PLAYING", nextRound };
}

export async function finishRound(
    session: any,
    players: Player[],
    winnerId: string,
    discardPile: Card[],
    description?: string
) {
    const winner = players.find(p => p.id === winnerId);

    players.forEach((p) => {
        const handPoints = calculateHandPoints(p.hand);
        p.score = (p.score || 0) + handPoints;
        p.roundScores.push(p.id === winnerId ? 0 : handPoints);
        p.roundBuys.push(p.buysUsed);
    });

    const isGameOver = session.currentRound >= 8;

    if (isGameOver) {
        players.forEach((p) => {
            p.score = applyRemainingBuysPenalty(p.score || 0, p.buysUsed || 0);
        });
    }

    if (isGameOver) {
        await prisma.gameSession.update({
            where: { id: session.id },
            data: {
                status: "FINISHED",
                discardPile: JSON.stringify(discardPile),
            },
        });
    } else {
        await prisma.gameSession.update({
            where: { id: session.id },
            data: {
                status: "ROUND_ENDED",
                readyForNextRound: "[]",
                discardPile: JSON.stringify(discardPile),
                lastAction: JSON.stringify({
                    playerId: "SYSTEM",
                    type: "ROUND_ENDED",
                    description: description || `¡${winner?.name || 'Alguien'} ganó la ronda!`,
                    timestamp: Date.now(),
                }),
            },
        });
    }

    const playerUpdates = players.map((p) =>
        prisma.player.update({
            where: { id: p.id },
            data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: "[]",
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
            },
        })
    );
    await Promise.all(playerUpdates);
    await autoReadyBots(session.id);
    return { success: true, gameStatus: isGameOver ? "FINISHED" : "ROUND_ENDED" };
}
