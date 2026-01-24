import { prisma } from "@/lib/prisma";
import { Card, Player } from "@/types/game";
import { shuffleDeck } from "@/utils/deck";
import { calculateHandPoints } from "@/utils/rules";
import { autoReadyBots } from "../botActions";

export async function handleDrawDeck(
    session: any,
    currentPlayer: Player,
    players: Player[],
    deck: Card[],
    discardPile: Card[],
    reshuffleCount: number
) {
    if (currentPlayer.hasDrawn) {
        return {
            success: false,
            error: "Ya has robado una carta en este turno.",
            status: 400,
        };
    }

    let card = deck.pop();
    if (!card) {
        if (reshuffleCount < 3) {
            deck.push(...shuffleDeck(discardPile.splice(0)));
            discardPile.length = 0;
            reshuffleCount++;
            card = deck.pop();
        }
    }

    if (card) {
        currentPlayer.hand.push(card);
        currentPlayer.boughtCards.push(card);
        currentPlayer.hasDrawn = true;

        const lastAction = {
            playerId: currentPlayer.id,
            type: "DRAW_DECK",
            description: `${currentPlayer.name} robó del mazo`,
            timestamp: Date.now(),
        };

        // Surgical Update
        await prisma.$transaction([
            prisma.gameSession.update({
                where: { id: session.id },
                data: {
                    deck: JSON.stringify(deck),
                    discardPile: JSON.stringify(discardPile),
                    reshuffleCount,
                    lastAction: JSON.stringify(lastAction),
                },
            }),
            prisma.player.update({
                where: { id: currentPlayer.id },
                data: {
                    hand: JSON.stringify(currentPlayer.hand),
                    boughtCards: JSON.stringify(currentPlayer.boughtCards),
                    hasDrawn: true,
                },
            }),
        ]);

        return { success: true };
    } else {
        // Round ends logic
        players.forEach((p) => {
            const handPoints = calculateHandPoints(p.hand);
            p.score = (p.score || 0) + handPoints;
            p.roundScores.push(handPoints);
            p.roundBuys.push(p.buysUsed);
        });

        await prisma.gameSession.update({
            where: { id: session.id },
            data: {
                status: "ROUND_ENDED",
                readyForNextRound: "[]",
                reshuffleCount: reshuffleCount,
                lastAction: JSON.stringify({
                    playerId: "SYSTEM",
                    type: "DRAW_DECK",
                    description: "El mazo se acabó después de 3 remezclas. Contando puntos.",
                    timestamp: Date.now(),
                }),
            },
        });

        const playerUpdates = players.map((p) =>
            prisma.player.update({
                where: { id: p.id },
                data: {
                    score: p.score,
                    hand: JSON.stringify(p.hand),
                    boughtCards: JSON.stringify(p.boughtCards),
                    roundScores: JSON.stringify(p.roundScores),
                    roundBuys: JSON.stringify(p.roundBuys),
                },
            })
        );
        await Promise.all(playerUpdates);
        await autoReadyBots(session.id);

        return { success: true, gameStatus: "ROUND_ENDED" };
    }
}

export async function handleDrawDiscard(
    session: any,
    playerId: string,
    players: Player[],
    deck: Card[],
    discardPile: Card[],
    reshuffleCount: number,
    pendingBuyIntents: any[]
) {
    const buyingPlayer = players.find((p) => p.id === playerId);
    if (!buyingPlayer) return { success: false, error: "Player not found", status: 404 };

    const currentPlayer = players[session.currentTurn];
    if (currentPlayer.hasDrawn) {
        return {
            success: false,
            error: "La ventana de compra ha cerrado. El jugador de turno ya robó una carta.",
            status: 400,
        };
    }

    if (buyingPlayer.buysUsed >= 7) {
        return {
            success: false,
            error: "Ya has realizado las 7 compras permitidas en esta partida.",
            status: 400,
        };
    }

    // Priority check logic
    const recentBuyIntents = pendingBuyIntents.filter(
        (i) => Date.now() - i.timestamp < 10000
    );

    if (recentBuyIntents.length > 1) {
        const currentTurnIndex = session.currentTurn;
        const intentPlayers = recentBuyIntents
            .map((i) => ({
                playerId: i.playerId,
                index: players.findIndex((p) => p.id === i.playerId),
                distance: 0,
            }))
            .filter((p) => p.index >= 0)
            .map((p) => {
                let distance = (currentTurnIndex - p.index + players.length) % players.length;
                if (p.index === currentTurnIndex) distance = 0;
                return { ...p, distance };
            })
            .sort((a, b) => a.distance - b.distance);

        if (intentPlayers.length > 0 && intentPlayers[0].playerId !== playerId) {
            return { success: false, error: "Otro jugador tiene prioridad para comprar.", status: 400 };
        }
    }

    const isCurrentPlayer = currentPlayer.id === playerId;
    const discardCard = discardPile.pop();
    if (!discardCard) return { success: false, error: "No hay cartas en el descarte.", status: 400 };

    const boughtCards: Card[] = [discardCard];
    buyingPlayer.hand.push(discardCard);
    buyingPlayer.boughtCards.push(discardCard);

    // ALL players who buy from discard get: 1 from discard + 2 from deck
    const drawFromDeck = (): Card | undefined => {
        let card = deck.pop();
        if (!card && reshuffleCount < 3) {
            deck.push(...shuffleDeck(discardPile.splice(0)));
            discardPile.length = 0;
            reshuffleCount++;
            card = deck.pop();
        }
        return card;
    };

    for (let i = 0; i < 2; i++) {
        const extra = drawFromDeck();
        if (!extra) break;
        buyingPlayer.hand.push(extra);
        buyingPlayer.boughtCards.push(extra);
        boughtCards.push(extra);
    }

    // Track buy usage (only for non-current players)
    if (!isCurrentPlayer) {
        buyingPlayer.buysUsed = (buyingPlayer.buysUsed || 0) + 1;
    } else {
        // Current player also counts as having used their draw
        buyingPlayer.hasDrawn = true;
    }

    // Log buy event for debugging / auditing
    console.info(`[draw] DRAW_DISCARD by ${buyingPlayer.name} (isCurrentPlayer=${isCurrentPlayer}) -> buysUsed=${buyingPlayer.buysUsed}`);

    await prisma.$transaction([
        prisma.gameSession.update({
            where: { id: session.id },
            data: {
                deck: JSON.stringify(deck),
                discardPile: JSON.stringify(discardPile),
                reshuffleCount,
                pendingBuyIntents: "[]",
                lastAction: JSON.stringify({
                    playerId,
                    type: isCurrentPlayer ? "DRAW_DISCARD" : "BUY",
                    description: isCurrentPlayer
                        ? `${buyingPlayer.name} robó del descarte`
                        : `${buyingPlayer.name} compró del descarte (${boughtCards.length} cartas)`,
                    timestamp: Date.now(),
                }),
            },
        }),
        prisma.player.update({
            where: { id: playerId },
            data: {
                hand: JSON.stringify(buyingPlayer.hand),
                boughtCards: JSON.stringify(buyingPlayer.boughtCards),
                buysUsed: buyingPlayer.buysUsed,
                hasDrawn: buyingPlayer.hasDrawn,
            },
        }),
    ]);

    // Return the updated player info to allow client to update cache immediately
    return {
        success: true,
        player: {
            id: playerId,
            buysUsed: buyingPlayer.buysUsed,
            hand: buyingPlayer.hand,
            boughtCards: buyingPlayer.boughtCards,
        },
    };
}
