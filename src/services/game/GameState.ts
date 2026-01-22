import { prisma } from "@/lib/prisma";
import { GameState, Card, Player } from "@/types/game";
import { parsePlayer } from "./utils";

export async function getGameState(
    sessionId: string,
): Promise<GameState | null> {
    const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
            players: {
                orderBy: { createdAt: "asc" },
            },
        },
    });

    if (!session) return null;

    const players = session.players.map(parsePlayer);

    return {
        players: players as Player[],
        deck: JSON.parse(session.deck) as Card[],
        discardPile: JSON.parse(session.discardPile) as Card[],
        currentTurn: session.currentTurn,
        currentRound: session.currentRound,
        direction: "counter-clockwise",
        status: session.status as
            | "WAITING"
            | "PLAYING"
            | "ROUND_ENDED"
            | "FINISHED",
        creatorId: session.creatorId,
        readyForNextRound: JSON.parse(session.readyForNextRound || "[]"),
        lastAction: session.lastAction ? JSON.parse(session.lastAction) : undefined,
        reshuffleCount: session.reshuffleCount,
    };
}
