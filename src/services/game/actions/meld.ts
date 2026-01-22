import { prisma } from "@/lib/prisma";
import { Card, Player } from "@/types/game";
import { validateContract, validateAdditionalDown, canAddToMeld } from "@/utils/rules";
import { autoReadyBots } from "../botActions";
import { finishRound } from "./round";

export async function handleDown(
    session: any,
    playerId: string,
    players: Player[],
    discardPile: Card[],
    groups: Card[][]
) {
    const currentPlayer = players[session.currentTurn];
    if (currentPlayer.id !== playerId) return { success: false, error: "Not your turn", status: 403 };

    const hasCompletedInitialContract = currentPlayer.melds && currentPlayer.melds.length > 0;
    const validation = hasCompletedInitialContract
        ? validateAdditionalDown(groups)
        : validateContract(groups, session.currentRound);

    if (!validation.valid) return { success: false, error: validation.error, status: 400 };

    const flatIds = groups.flat().map(c => c.id);
    currentPlayer.hand = currentPlayer.hand.filter(c => !flatIds.includes(c.id));

    if (!currentPlayer.melds) currentPlayer.melds = [];
    currentPlayer.melds.push(...groups);

    if (currentPlayer.hand.length === 0) {
        return await finishRound(session, players, playerId, discardPile, `¡${currentPlayer.name} se bajó y ganó la ronda!`);
    }

    await prisma.player.update({
        where: { id: playerId },
        data: {
            hand: JSON.stringify(currentPlayer.hand),
            melds: JSON.stringify(currentPlayer.melds),
        }
    });

    return { success: true };
}

export async function handleAddToMeld(
    session: any,
    playerId: string,
    players: Player[],
    payload: any
) {
    const currentPlayer = players[session.currentTurn];
    if (currentPlayer.id !== playerId) return { success: false, error: "Not your turn", status: 403 };

    const { cardId, targetPlayerId, meldIndex } = payload;
    const targetPlayer = players.find((p) => p.id === targetPlayerId);

    if (!targetPlayer?.melds?.[meldIndex]) {
        return { success: false, error: "Juego no encontrado.", status: 404 };
    }

    if (!currentPlayer.melds || currentPlayer.melds.length === 0) {
        return { success: false, error: "Debes bajarte primero.", status: 400 };
    }

    const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
    if (cardIndex === -1) return { success: false, error: "Carta no encontrada.", status: 400 };

    const card = currentPlayer.hand[cardIndex];
    const targetMeld = targetPlayer.melds[meldIndex];

    if (!canAddToMeld(card, targetMeld)) {
        return { success: false, error: "La carta no sirve en este juego.", status: 400 };
    }

    currentPlayer.hand.splice(cardIndex, 1);
    targetPlayer.melds[meldIndex].push(card);

    await prisma.$transaction([
        prisma.player.update({
            where: { id: playerId },
            data: { hand: JSON.stringify(currentPlayer.hand) },
        }),
        prisma.player.update({
            where: { id: targetPlayerId },
            data: { melds: JSON.stringify(targetPlayer.melds) },
        }),
        prisma.gameSession.update({
            where: { id: session.id },
            data: {
                lastAction: JSON.stringify({
                    playerId,
                    type: "ADD_TO_MELD",
                    description: `${currentPlayer.name} añadió una carta a un juego`,
                    timestamp: Date.now(),
                }),
            },
        }),
    ]);

    if (currentPlayer.hand.length === 0) {
        // We need the latest discard pile to finish the round. 
        // handleAddToMeld doesn't usually change discard pile, but we need to pass it.
        const discardPile = JSON.parse(session.discardPile);
        return await finishRound(session, players, playerId, discardPile, `¡${currentPlayer.name} puso su última carta y ganó la ronda!`);
    }

    return { success: true };
}
