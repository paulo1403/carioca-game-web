import { prisma } from "@/lib/prisma";
import { Player, Card } from "@/types/game";
import { canStealJoker } from "@/utils/rules";

export async function handleStealJoker(
    session: any,
    playerId: string,
    players: Player[],
    payload: any
) {
    const currentPlayer = players[session.currentTurn];
    const { cardId, targetPlayerId, meldIndex } = payload;

    const targetPlayer = players.find(p => p.id === targetPlayerId);
    if (!targetPlayer?.melds?.[meldIndex]) return { success: false, error: "Game not found", status: 404 };

    const handCard = currentPlayer.hand.find(c => c.id === cardId);
    if (!handCard) return { success: false, error: "Card not in hand", status: 400 };

    const targetMeld = targetPlayer.melds[meldIndex];
    if (!canStealJoker(handCard, targetMeld, currentPlayer.hand)) {
        return { success: false, error: "Invalid theft", status: 400 };
    }

    const jokerIdx = targetMeld.findIndex(c => c.suit === "JOKER" || c.value === 0);
    const [joker] = targetMeld.splice(jokerIdx, 1);
    targetMeld.push(handCard);

    currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);
    currentPlayer.hand.push(joker);

    await prisma.$transaction([
        prisma.player.update({
            where: { id: playerId },
            data: { hand: JSON.stringify(currentPlayer.hand) }
        }),
        prisma.player.update({
            where: { id: targetPlayerId },
            data: { melds: JSON.stringify(targetPlayer.melds) }
        })
    ]);

    return { success: true };
}
