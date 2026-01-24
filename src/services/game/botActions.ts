import { prisma } from "@/lib/prisma";
import { orderPlayersByTurn } from "@/utils/prismaOrder";

export async function autoReadyBots(sessionId: string) {
    const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        include: {
            players: { orderBy: orderPlayersByTurn },
        },
    });

    if (!session || session.status !== "ROUND_ENDED") return;

    const readyPlayers = JSON.parse(session.readyForNextRound || "[]") as string[];
    const botPlayers = session.players.filter(
        (p) => p.isBot && !readyPlayers.includes(p.id)
    );

    if (botPlayers.length > 0) {
        const updatedReady = [...readyPlayers, ...botPlayers.map((p) => p.id)];
        await prisma.gameSession.update({
            where: { id: sessionId },
            data: { readyForNextRound: JSON.stringify(updatedReady) },
        });
    }
}
