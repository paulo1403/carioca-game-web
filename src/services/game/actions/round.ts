import { prisma } from "@/lib/prisma";
import { Player } from "@/types/game";
import { shuffleDeck, createDeck } from "@/utils/deck";

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
    const newDeck = shuffleDeck(createDeck());
    const newDiscardPile = [newDeck.pop()!];

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
                readyForNextRound: "[]"
            }
        })
    ]);

    return { success: true, gameStatus: "PLAYING", nextRound };
}
