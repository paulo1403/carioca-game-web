import { prisma } from "@/lib/prisma";
import { Player, Card } from "@/types/game";
import { canStealJoker, isDifferentSuitGroup, isEscala, isTrio } from "@/utils/rules";

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
    if (jokerIdx === -1) return { success: false, error: "No joker in meld", status: 400 };

    const meldIsEscala = isEscala(targetMeld, targetMeld.length);
    const meldIsDifferentSuit = isDifferentSuitGroup(targetMeld, targetMeld.length);
    const meldIsTrio = isTrio(targetMeld, targetMeld.length);

    const [joker] = targetMeld.splice(jokerIdx, 1);

    if (meldIsEscala) {
        targetMeld.push(handCard);
        currentPlayer.hand = currentPlayer.hand.filter(c => c.id !== cardId);
        currentPlayer.hand.push(joker);
    } else if (meldIsDifferentSuit || meldIsTrio) {
        const nonJokers = targetMeld.filter(c => c.suit !== "JOKER" && c.value !== 0);
        const remainingJokers = targetMeld.filter(c => c.suit === "JOKER" || c.value === 0);
        const baseMeld = [...nonJokers, handCard, ...remainingJokers];
        const groupValue = handCard.value;

        const extraCandidates = currentPlayer.hand.filter(
            c => c.id !== cardId && c.suit !== "JOKER" && c.value !== 0 && c.value === groupValue
        );

        const extraCard = extraCandidates.find((c) =>
            meldIsDifferentSuit
                ? isDifferentSuitGroup([...baseMeld, c], targetMeld.length + 1)
                : isTrio([...baseMeld, c], targetMeld.length + 1)
        );

        if (!extraCard) {
            return { success: false, error: "Missing second card for joker steal", status: 400 };
        }

        targetMeld.push(handCard, extraCard);
        currentPlayer.hand = currentPlayer.hand.filter(
            c => c.id !== cardId && c.id !== extraCard.id
        );
        currentPlayer.hand.push(joker);
    } else {
        return { success: false, error: "Invalid target meld", status: 400 };
    }

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
