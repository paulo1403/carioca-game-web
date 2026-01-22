import { prisma } from "@/lib/prisma";
import { Card, Player } from "@/types/game";
import { calculateHandPoints } from "@/utils/rules";
import { autoReadyBots } from "../botActions";

export async function handleDiscard(
    session: any,
    playerId: string,
    players: Player[],
    discardPile: Card[],
    cardId: string
) {
    const currentPlayer = players[session.currentTurn];
    if (currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: "Carta no encontrada", status: 400 };

    const [card] = currentPlayer.hand.splice(cardIndex, 1);
    discardPile.push(card);

    if (currentPlayer.hand.length === 0) {
        // End of round logic
        players.forEach((p) => {
            const handPoints = calculateHandPoints(p.hand);
            p.score = (p.score || 0) + handPoints;
            p.roundScores.push(p.id === currentPlayer.id ? 0 : handPoints);
            p.roundBuys.push(p.buysUsed);
        });

        if (session.currentRound >= 8) {
            // GAME FINISHED
            await prisma.gameSession.update({
                where: { id: session.id },
                data: {
                    status: "FINISHED",
                    discardPile: JSON.stringify(discardPile),
                },
            });
            // Further history recording logic...
        } else {
            await prisma.gameSession.update({
                where: { id: session.id },
                data: {
                    status: "ROUND_ENDED",
                    readyForNextRound: "[]",
                    lastAction: JSON.stringify({
                        playerId: "SYSTEM",
                        type: "DISCARD",
                        description: `¡${currentPlayer.name} ganó la ronda!`,
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
        return { success: true, gameStatus: session.currentRound >= 8 ? "FINISHED" : "ROUND_ENDED" };
    }

    const direction = session.direction === "clockwise" ? 1 : -1;
    const nextTurn = (session.currentTurn + direction + players.length) % players.length;

    await prisma.$transaction([
        prisma.gameSession.update({
            where: { id: session.id },
            data: {
                currentTurn: nextTurn,
                discardPile: JSON.stringify(discardPile),
                lastAction: JSON.stringify({
                    playerId,
                    type: "DISCARD",
                    description: `${currentPlayer.name} botó una carta`,
                    timestamp: Date.now(),
                }),
            },
        }),
        prisma.player.update({
            where: { id: currentPlayer.id },
            data: {
                hand: JSON.stringify(currentPlayer.hand),
                boughtCards: "[]",
                hasDrawn: false,
            },
        }),
        // Reset hasDrawn for next player
        prisma.player.update({
            where: { id: players[nextTurn].id },
            data: { hasDrawn: false }
        })
    ]);

    return { success: true };
}
