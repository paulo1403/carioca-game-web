import { prisma } from "@/lib/prisma";
import { GameState, Card, Player, BotDifficulty } from "@/types/game";
import { createDeck, shuffleDeck } from "@/utils/deck";
import { updateUserStats } from "@/utils/updateUserStats";
import {
  validateContract,
  validateAdditionalDown,
  isTrio,
  isEscala,
  canAddToMeld,
  canStealJoker,
  calculateHandPoints,
} from "@/utils/rules";
import { calculateBotMove } from "@/utils/botLogic";

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

  const players = session.players.map((p) => ({
    ...p,
    hand: JSON.parse(p.hand) as Card[],
    melds: p.melds ? (JSON.parse(p.melds) as Card[][]) : [],
    boughtCards: JSON.parse(p.boughtCards || "[]") as Card[],
    roundScores: JSON.parse(p.roundScores || "[]") as number[],
    roundBuys: JSON.parse(p.roundBuys || "[]") as number[],
    difficulty: (p.difficulty as BotDifficulty) || undefined,
  }));

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

export async function processMove(
  sessionId: string,
  playerId: string,
  action: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: Record<string, any> = {},
): Promise<{
  success: boolean;
  error?: string;
  status?: number;
  gameStatus?: string;
  winnerId?: string;
  nextRound?: number;
}> {
  try {
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        players: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      return { success: false, error: "Game not found", status: 404 };
    }

    if (session.status === "FINISHED") {
      return { success: false, error: "Game already finished", status: 400 };
    }

    // Parse JSONs
    const deck = JSON.parse(session.deck) as Card[];
    const discardPile = JSON.parse(session.discardPile) as Card[];
    const pendingDiscardIntents = JSON.parse(
      session.pendingDiscardIntents || "[]",
    ) as Array<{ playerId: string; timestamp: number }>;
    const pendingBuyIntents = JSON.parse(
      session.pendingBuyIntents || "[]",
    ) as Array<{
      playerId: string;
      timestamp: number;
    }>;

    let reshuffleCount = session.reshuffleCount;

    const players = session.players.map((p) => ({
      ...p,
      hand: JSON.parse(p.hand) as Card[],
      melds: p.melds ? (JSON.parse(p.melds) as Card[][]) : ([] as Card[][]),
      boughtCards: JSON.parse(p.boughtCards || "[]") as Card[],
      roundScores: JSON.parse(p.roundScores || "[]") as number[],
      roundBuys: JSON.parse(p.roundBuys || "[]") as number[],
    }));

    const currentPlayerIndex = session.currentTurn;
    const currentPlayer = players[currentPlayerIndex];

    let lastAction = session.lastAction ? JSON.parse(session.lastAction) : null;

    if (action === "DRAW_DECK") {
      if (!currentPlayer || currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
      }
      // Validation: Cannot draw if already performed an action this turn
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
          // Reshuffle discard pile into deck
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
        lastAction = {
          playerId,
          type: "DRAW_DECK",
          description: `${currentPlayer.name} robó del mazo`,
          timestamp: Date.now(),
        };
      } else {
        // No more cards after reshuffles, end round
        players.forEach((p) => {
          const handPoints = calculateHandPoints(p.hand);
          p.score = (p.score || 0) + handPoints;
        });

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            status: "ROUND_ENDED",
            readyForNextRound: "[]",
            reshuffleCount: reshuffleCount,
            lastAction: JSON.stringify({
              playerId: "SYSTEM",
              type: "DRAW_DECK",
              description:
                "El mazo se acabó después de 3 remezclas. Contando puntos.",
              timestamp: Date.now(),
            }),
          },
        });

        const playerUpdates = players.map((p) => {
          const handPoints = calculateHandPoints(p.hand);
          const roundScore = handPoints;
          p.roundScores.push(roundScore);
          p.roundBuys.push(p.buysUsed);

          return prisma.player.update({
            where: { id: p.id },
            data: {
              score: p.score,
              hand: JSON.stringify(p.hand),
              boughtCards: JSON.stringify(p.boughtCards),
              roundScores: JSON.stringify(p.roundScores),
              roundBuys: JSON.stringify(p.roundBuys),
            },
          });
        });
        await Promise.all(playerUpdates);

        // Auto-ready any bots for next round
        await autoReadyBots(sessionId);

        return { success: true, gameStatus: "ROUND_ENDED" };
      }
    } else if (action === "DRAW_DISCARD") {
      // Allow any player to attempt buying from discard pile
      // But check priority if multiple players want to buy within a short window

      const buyingPlayer = players.find((p) => p.id === playerId);
      if (!buyingPlayer) {
        return { success: false, error: "Player not found", status: 404 };
      }

      // RULE: Buying is only allowed BEFORE the current turn player has drawn
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

      // Check priority if multiple players want to buy
      // Use a 10 second window so intents have time to arrive
      const recentBuyIntents = pendingBuyIntents.filter(
        (i) => Date.now() - i.timestamp < 10000,
      );

      if (recentBuyIntents.length > 1) {
        // Multiple players want to buy - determine who has priority
        // Priority goes to the closest player clockwise from current turn
        const currentTurnIndex = session.currentTurn;

        const intentPlayers = recentBuyIntents
          .map((i) => ({
            playerId: i.playerId,
            index: players.findIndex((p) => p.id === i.playerId),
            distance: 0,
          }))
          .filter((p) => p.index >= 0)
          .map((p) => {
            // Calculate counter-clockwise (to the right) distance from current turn
            let distance =
              (currentTurnIndex - p.index + players.length) % players.length;
            // If it's the current player, distance is 0
            if (p.index === currentTurnIndex) distance = 0;
            return { ...p, distance };
          })
          .sort((a, b) => a.distance - b.distance);

        const playerHasPriority =
          intentPlayers.length > 0 && intentPlayers[0].playerId === playerId;

        if (!playerHasPriority) {
          return {
            success: false,
            error: "Otro jugador tiene prioridad para comprar.",
            status: 400,
          };
        }
      }

      const boughtCards: Card[] = [];

      const discardCard = discardPile.pop();
      if (!discardCard) {
        return {
          success: false,
          error: "No hay cartas en el descarte para comprar.",
          status: 400,
        };
      }

      buyingPlayer.hand.push(discardCard);
      buyingPlayer.boughtCards.push(discardCard);
      buyingPlayer.hasDrawn = true;
      boughtCards.push(discardCard);

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

      buyingPlayer.buysUsed = (buyingPlayer.buysUsed || 0) + 1;
      pendingBuyIntents.length = 0;

      lastAction = {
        playerId,
        type: "BUY",
        description: `${buyingPlayer.name} compró del descarte (${boughtCards.length
          } carta${boughtCards.length === 1 ? "" : "s"})`,
        timestamp: Date.now(),
      };
    } else if (action === "INTEND_BUY") {
      const existing = pendingBuyIntents.find((i) => i.playerId === playerId);
      if (!existing) {
        pendingBuyIntents.push({ playerId, timestamp: Date.now() });
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            pendingBuyIntents: JSON.stringify(pendingBuyIntents),
          },
        });
      }
      return { success: true };
    } else if (action === "INTEND_DRAW_DISCARD") {
      const existing = pendingDiscardIntents.find(
        (i) => i.playerId === playerId,
      );
      if (!existing) {
        pendingDiscardIntents.push({ playerId, timestamp: Date.now() });
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            pendingDiscardIntents: JSON.stringify(pendingDiscardIntents),
          },
        });
      }
      return { success: true };
    } else if (action === "DOWN") {
      if (currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
      }
      const { groups } = payload as { groups: Card[][] };

      const flatCards = groups.flat();
      const handIds = currentPlayer.hand.map((c) => c.id);
      const allInHand = flatCards.every((c) => handIds.includes(c.id));

      if (!allInHand) {
        return { success: false, error: "Cards not in hand", status: 400 };
      }

      const normalizedGroups = groups.map((g) =>
        g.map((c) => ({
          ...c,
          value: c.suit === "JOKER" || c.value === 0 ? 0 : c.value,
        })),
      );

      const hasCompletedInitialContract =
        currentPlayer.melds && currentPlayer.melds.length > 0;

      let validation;
      if (hasCompletedInitialContract) {
        validation = validateAdditionalDown(normalizedGroups);
      } else {
        validation = validateContract(normalizedGroups, session.currentRound);
      }

      if (!validation.valid) {
        return {
          success: false,
          error: validation.error || "Grupos inválidos",
          status: 400,
        };
      }

      const flatIds = flatCards.map((c) => c.id);
      currentPlayer.hand = currentPlayer.hand.filter(
        (c) => !flatIds.includes(c.id),
      );

      if (currentPlayer.hand.length === 0) {
        return {
          success: false,
          error:
            "No puedes bajar todos tus grupos. Debe quedarte al menos una carta en la mano.",
          status: 400,
        };
      }

      flatCards.forEach((c) => {
        const idx = currentPlayer.boughtCards.findIndex((bc) => bc.id === c.id);
        if (idx > -1) currentPlayer.boughtCards.splice(idx, 1);
      });

      if (!currentPlayer.melds) currentPlayer.melds = [];
      currentPlayer.melds.push(...groups);

      await prisma.player.update({
        where: { id: playerId },
        data: {
          hand: JSON.stringify(currentPlayer.hand),
          boughtCards: JSON.stringify(currentPlayer.boughtCards),
          ...(currentPlayer.melds && {
            melds: JSON.stringify(currentPlayer.melds),
          }),
        },
      });

      if (currentPlayer.hand.length === 0) {
        return {
          success: false,
          error:
            "Debes tener al menos una carta para descartar al final del turno.",
          status: 400,
        };
      } else if (currentPlayer.hand.length === 1) {
        const lastCard = currentPlayer.hand.pop()!;
        discardPile.push(lastCard);

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "DOWN",
              description: `${currentPlayer.name} se bajó y descartó su última carta`,
              timestamp: Date.now(),
            }),
          },
        });

        players.forEach((p) => {
          const handPoints = calculateHandPoints(p.hand);
          p.score = (p.score || 0) + handPoints;
        });

        if (session.currentRound >= 8) {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "FINISHED",
              deck: JSON.stringify(deck),
              discardPile: JSON.stringify(discardPile),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          await prisma.gameHistory.create({
            data: {
              gameSessionId: sessionId,
              winnerId: currentPlayer.id,
              participants: JSON.stringify(
                players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                })),
              ),
            },
          });

          // Update user statistics
          await updateUserStats(sessionId, currentPlayer.id);

          return {
            success: true,
            gameStatus: "FINISHED",
            winnerId: currentPlayer.id,
          };
        } else {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "ROUND_ENDED",
              readyForNextRound: "[]",
              lastAction: JSON.stringify({
                playerId: "SYSTEM",
                type: "DOWN",
                description: `¡${currentPlayer.name} ganó la ronda! Esperando que todos estén listos para la siguiente ronda.`,
                timestamp: Date.now(),
              }),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          // Auto-ready any bots for next round
          await autoReadyBots(sessionId);

          return {
            success: true,
            gameStatus: "ROUND_ENDED",
            winnerId: currentPlayer.id,
          };
        }
      } else {
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "DOWN",
              description: `${currentPlayer.name} se bajó`,
              timestamp: Date.now(),
            }),
          },
        });

        return { success: true };
      }
    } else if (action === "ADD_TO_MELD") {
      if (currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
      }
      const { cardId, targetPlayerId, meldIndex } = payload;

      if (!currentPlayer.melds || currentPlayer.melds.length === 0) {
        return {
          success: false,
          error: "Debes bajarte primero antes de añadir cartas.",
          status: 400,
        };
      }

      const targetPlayer = players.find((p) => p.id === targetPlayerId);
      if (
        !targetPlayer ||
        !targetPlayer.melds ||
        !targetPlayer.melds[meldIndex]
      ) {
        return { success: false, error: "Juego no encontrado.", status: 404 };
      }

      const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
      if (cardIndex === -1) {
        return {
          success: false,
          error: "Carta no encontrada en mano.",
          status: 400,
        };
      }
      const card = currentPlayer.hand[cardIndex];

      const targetMeld = targetPlayer.melds[meldIndex];
      if (!canAddToMeld(card, targetMeld)) {
        return {
          success: false,
          error: "La carta no sirve en este juego.",
          status: 400,
        };
      }

      currentPlayer.hand.splice(cardIndex, 1);

      const boughtIdx = currentPlayer.boughtCards.findIndex(
        (bc) => bc.id === card.id,
      );
      if (boughtIdx > -1) currentPlayer.boughtCards.splice(boughtIdx, 1);

      targetPlayer.melds[meldIndex].push(card);

      const updatePromises = [];

      updatePromises.push(
        prisma.player.update({
          where: { id: playerId },
          data: {
            hand: JSON.stringify(currentPlayer.hand),
            boughtCards: JSON.stringify(currentPlayer.boughtCards),
          },
        }),
      );

      updatePromises.push(
        prisma.player.update({
          where: { id: targetPlayerId },
          data: { melds: JSON.stringify(targetPlayer.melds) },
        }),
      );

      updatePromises.push(
        prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "ADD_TO_MELD",
              description: `${currentPlayer.name} añadió una carta a un juego`,
              timestamp: Date.now(),
            }),
          },
        }),
      );

      await prisma.$transaction(updatePromises);

      if (currentPlayer.hand.length === 0) {
        return {
          success: false,
          error:
            "Debes tener al menos una carta para descartar al final del turno.",
          status: 400,
        };
      } else if (currentPlayer.hand.length === 1) {
        const lastCard = currentPlayer.hand.pop()!;
        discardPile.push(lastCard);

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "ADD_TO_MELD",
              description: `${currentPlayer.name} añadió una carta y descartó su última carta`,
              timestamp: Date.now(),
            }),
          },
        });

        players.forEach((p) => {
          const handPoints = calculateHandPoints(p.hand);
          p.score = (p.score || 0) + handPoints;
        });

        if (session.currentRound >= 8) {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "FINISHED",
              deck: JSON.stringify(deck),
              discardPile: JSON.stringify(discardPile),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          await prisma.gameHistory.create({
            data: {
              gameSessionId: sessionId,
              winnerId: currentPlayer.id,
              participants: JSON.stringify(
                players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                })),
              ),
            },
          });

          return {
            success: true,
            gameStatus: "FINISHED",
            winnerId: currentPlayer.id,
          };
        } else {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "ROUND_ENDED",
              readyForNextRound: "[]",
              lastAction: JSON.stringify({
                playerId: "SYSTEM",
                type: "ADD_TO_MELD",
                description: `¡${currentPlayer.name} ganó la ronda! Esperando que todos estén listos para la siguiente ronda.`,
                timestamp: Date.now(),
              }),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          // Auto-ready any bots for next round
          await autoReadyBots(sessionId);

          return {
            success: true,
            gameStatus: "ROUND_ENDED",
            winnerId: currentPlayer.id,
          };
        }
      } else {
        return { success: true };
      }
    } else if (action === "STEAL_JOKER") {
      if (currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
      }
      const { cardId, targetPlayerId, meldIndex } = payload;

      if (!currentPlayer.melds || currentPlayer.melds.length === 0) {
        return {
          success: false,
          error: "Debes bajarte primero antes de robar jokers.",
          status: 400,
        };
      }

      const targetPlayer = players.find((p) => p.id === targetPlayerId);
      if (
        !targetPlayer ||
        !targetPlayer.melds ||
        !targetPlayer.melds[meldIndex]
      ) {
        return { success: false, error: "Juego no encontrado.", status: 404 };
      }

      const cardIndex = currentPlayer.hand.findIndex(
        (c: Card) => c.id === (cardId as string),
      );
      if (cardIndex === -1) {
        return {
          success: false,
          error: "Carta no encontrada en mano.",
          status: 400,
        };
      }
      const card = currentPlayer.hand[cardIndex];

      const targetMeld = targetPlayer.melds[meldIndex];
      if (!canStealJoker(card, targetMeld, currentPlayer.hand)) {
        return {
          success: false,
          error: "No puedes robar este joker con esa carta.",
          status: 400,
        };
      }

      const jokerIndex = targetMeld.findIndex((c) => c.suit === "JOKER" || c.value === 0);
      if (jokerIndex === -1) {
        return {
          success: false,
          error: "No hay joker para robar.",
          status: 400,
        };
      }
      const joker = targetMeld[jokerIndex];

      // Atomic swap logic:
      // 1. Remove card from player hand and boughtCards
      currentPlayer.hand.splice(cardIndex, 1);
      const boughtIdx = currentPlayer.boughtCards.findIndex((bc) => bc.id === card.id);
      if (boughtIdx > -1) currentPlayer.boughtCards.splice(boughtIdx, 1);

      // 2. Swap joker in target meld with the card
      targetPlayer.melds[meldIndex].splice(jokerIndex, 1);
      targetPlayer.melds[meldIndex].push(card);

      // 3. Add joker to player hand and boughtCards (so it's highlighted)
      currentPlayer.hand.push(joker);
      currentPlayer.boughtCards.push(joker);

      const updatePromises = [];

      updatePromises.push(
        prisma.player.update({
          where: { id: playerId },
          data: {
            hand: JSON.stringify(currentPlayer.hand),
            boughtCards: JSON.stringify(currentPlayer.boughtCards),
          },
        }),
      );

      updatePromises.push(
        prisma.player.update({
          where: { id: targetPlayerId },
          data: { melds: JSON.stringify(targetPlayer.melds) },
        }),
      );

      updatePromises.push(
        prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "STEAL_JOKER",
              description: `${currentPlayer.name} robó un joker`,
              timestamp: Date.now(),
            }),
          },
        }),
      );

      await prisma.$transaction(updatePromises);

      if (currentPlayer.hand.length === 0) {
        return {
          success: false,
          error:
            "Debes tener al menos una carta para descartar al final del turno.",
          status: 400,
        };
      } else if (currentPlayer.hand.length === 1) {
        const lastCard = currentPlayer.hand.pop()!;
        discardPile.push(lastCard);

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            lastAction: JSON.stringify({
              playerId,
              type: "STEAL_JOKER",
              description: `${currentPlayer.name} robó un joker y descartó su última carta`,
              timestamp: Date.now(),
            }),
          },
        });

        players.forEach((p) => {
          const handPoints = calculateHandPoints(p.hand);
          p.score = (p.score || 0) + handPoints;
        });

        if (session.currentRound >= 8) {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "FINISHED",
              deck: JSON.stringify(deck),
              discardPile: JSON.stringify(discardPile),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          await prisma.gameHistory.create({
            data: {
              gameSessionId: sessionId,
              winnerId: currentPlayer.id,
              participants: JSON.stringify(
                players.map((p) => ({
                  id: p.id,
                  name: p.name,
                  score: p.score,
                })),
              ),
            },
          });

          return {
            success: true,
            gameStatus: "FINISHED",
            winnerId: currentPlayer.id,
          };
        } else {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: {
              status: "ROUND_ENDED",
              readyForNextRound: "[]",
              lastAction: JSON.stringify({
                playerId: "SYSTEM",
                type: "STEAL_JOKER",
                description: `¡${currentPlayer.name} ganó la ronda! Esperando que todos estén listos para la siguiente ronda.`,
                timestamp: Date.now(),
              }),
            },
          });

          const playerUpdates = players.map((p) => {
            const handPoints = calculateHandPoints(p.hand);
            const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
            p.roundScores.push(roundScore);
            p.roundBuys.push(p.buysUsed);

            return prisma.player.update({
              where: { id: p.id },
              data: {
                score: p.score,
                hand: JSON.stringify(p.hand),
                boughtCards: JSON.stringify(p.boughtCards),
                roundScores: JSON.stringify(p.roundScores),
                roundBuys: JSON.stringify(p.roundBuys),
              },
            });
          });
          await Promise.all(playerUpdates);

          // Auto-ready any bots for next round
          await autoReadyBots(sessionId);

          return {
            success: true,
            gameStatus: "ROUND_ENDED",
            winnerId: currentPlayer.id,
          };
        }
      } else {
        return { success: true };
      }
    } else if (action === "DISCARD") {
      if (currentPlayer.id !== playerId) {
        return { success: false, error: "Not your turn", status: 403 };
      }
      const { cardId } = payload as { cardId: string };
      const cardIndex = currentPlayer.hand.findIndex((c) => c.id === cardId);
      if (cardIndex > -1) {
        const [card] = currentPlayer.hand.splice(cardIndex, 1);
        discardPile.push(card);

        if (currentPlayer.hand.length === 0) {
          players.forEach((p) => {
            const handPoints = calculateHandPoints(p.hand);
            p.score = (p.score || 0) + handPoints;
          });

          if (session.currentRound >= 8) {
            await prisma.gameSession.update({
              where: { id: sessionId },
              data: {
                status: "FINISHED",
                deck: JSON.stringify(deck),
                discardPile: JSON.stringify(discardPile),
              },
            });

            const playerUpdates = players.map((p) => {
              const handPoints = calculateHandPoints(p.hand);
              const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
              p.roundScores.push(roundScore);
              p.roundBuys.push(p.buysUsed);

              return prisma.player.update({
                where: { id: p.id },
                data: {
                  score: p.score,
                  hand: JSON.stringify(p.hand),
                  boughtCards: JSON.stringify(p.boughtCards),
                  roundScores: JSON.stringify(p.roundScores),
                  roundBuys: JSON.stringify(p.roundBuys),
                },
              });
            });
            await Promise.all(playerUpdates);

            await prisma.gameHistory.create({
              data: {
                gameSessionId: sessionId,
                winnerId: currentPlayer.id,
                participants: JSON.stringify(
                  players.map((p) => ({
                    id: p.id,
                    name: p.name,
                    score: p.score,
                  })),
                ),
              },
            });

            return {
              success: true,
              gameStatus: "FINISHED",
              winnerId: currentPlayer.id,
            };
          } else {
            await prisma.gameSession.update({
              where: { id: sessionId },
              data: {
                status: "ROUND_ENDED",
                readyForNextRound: "[]",
                lastAction: JSON.stringify({
                  playerId: "SYSTEM",
                  type: "DISCARD",
                  description: `¡${currentPlayer.name} ganó la ronda! Esperando que todos estén listos para la siguiente ronda.`,
                  timestamp: Date.now(),
                }),
              },
            });

            const playerUpdates = players.map((p) => {
              const handPoints = calculateHandPoints(p.hand);
              const roundScore = p.id === currentPlayer.id ? 0 : handPoints;
              p.roundScores.push(roundScore);
              p.roundBuys.push(p.buysUsed);

              return prisma.player.update({
                where: { id: p.id },
                data: {
                  score: p.score,
                  hand: JSON.stringify(p.hand),
                  boughtCards: JSON.stringify(p.boughtCards),
                  roundScores: JSON.stringify(p.roundScores),
                  roundBuys: JSON.stringify(p.roundBuys),
                },
              });
            });
            await Promise.all(playerUpdates);

            // Auto-ready any bots for next round
            await autoReadyBots(sessionId);

            return {
              success: true,
              gameStatus: "ROUND_ENDED",
              winnerId: currentPlayer.id,
            };
          }
        }

        const nextTurn = (session.currentTurn - 1 + players.length) % players.length;

        await prisma.gameSession.update({
          where: { id: sessionId },
          data: {
            currentTurn: nextTurn,
            deck: JSON.stringify(deck),
            discardPile: JSON.stringify(discardPile),
            lastAction: JSON.stringify({
              playerId,
              type: "DISCARD",
              description: `${currentPlayer.name} botó una carta`,
              timestamp: Date.now(),
            }),
          },
        });

        // Reset hasDrawn for all players when turn changes
        await prisma.player.updateMany({
          where: { gameSessionId: sessionId },
          data: { hasDrawn: false },
        });

        await prisma.player.update({
          where: { id: currentPlayer.id },
          data: {
            hand: JSON.stringify(currentPlayer.hand),
            boughtCards: "[]"
          },
        });

        return { success: true };
      }
    } else if (action === "READY_FOR_NEXT_ROUND") {
      if (session.status !== "ROUND_ENDED") {
        return {
          success: false,
          error: "La partida no está esperando para la siguiente ronda.",
          status: 400,
        };
      }

      const readyPlayers = JSON.parse(
        session.readyForNextRound || "[]",
      ) as string[];
      if (readyPlayers.includes(playerId)) {
        return {
          success: false,
          error: "Ya estás marcado como listo.",
          status: 400,
        };
      }

      readyPlayers.push(playerId);

      // Marcar automáticamente los bots como listos
      session.players.forEach((player) => {
        if (player.isBot && !readyPlayers.includes(player.id)) {
          readyPlayers.push(player.id);
        }
      });

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          readyForNextRound: JSON.stringify(readyPlayers),
          lastAction: JSON.stringify({
            playerId,
            type: "READY_FOR_NEXT_ROUND",
            description: `${currentPlayer.name} está listo para la siguiente ronda`,
            timestamp: Date.now(),
          }),
        },
      });

      return { success: true };
    } else if (action === "START_NEXT_ROUND") {
      if (session.creatorId !== playerId) {
        return {
          success: false,
          error: "Solo el anfitrión puede iniciar la siguiente ronda.",
          status: 403,
        };
      }

      if (session.status !== "ROUND_ENDED") {
        return {
          success: false,
          error: "La partida no está esperando para la siguiente ronda.",
          status: 400,
        };
      }

      const readyPlayers = JSON.parse(
        session.readyForNextRound || "[]",
      ) as string[];
      const nonHostPlayers = session.players.filter(
        (p) => p.id !== session.creatorId,
      );
      if (readyPlayers.length < nonHostPlayers.length) {
        return {
          success: false,
          error: "No todos los jugadores están listos para la siguiente ronda.",
          status: 400,
        };
      }

      const nextRound = session.currentRound + 1;

      const newDeck = shuffleDeck(createDeck());
      const newDiscardPile = [newDeck.pop()!];

      const playerUpdates = players.map((p) => {
        const newHand = newDeck.splice(0, 11);
        p.hand = newHand;
        p.melds = [];
        p.boughtCards = [];

        return prisma.player.update({
          where: { id: p.id },
          data: {
            score: p.score,
            hand: JSON.stringify(p.hand),
            melds: "[]",
            boughtCards: "[]",
            hasDrawn: false,
          },
        });
      });
      await Promise.all(playerUpdates);

      const nextStarter = (players.length - (session.currentRound % players.length)) % players.length;

      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          currentRound: nextRound,
          currentTurn: nextStarter,
          status: "PLAYING",
          direction: "counter-clockwise",
          deck: JSON.stringify(newDeck),
          discardPile: JSON.stringify(newDiscardPile),
          reshuffleCount: 0,
          pendingBuyIntents: "[]",
          pendingDiscardIntents: "[]",
          readyForNextRound: "[]",
          lastAction: JSON.stringify({
            playerId: "SYSTEM",
            type: "START_NEXT_ROUND",
            description: `¡Ronda ${nextRound} iniciada!`,
            timestamp: Date.now(),
          }),
        },
      });

      // Reset hasDrawn for all players when new round starts
      await prisma.player.updateMany({
        where: { gameSessionId: sessionId },
        data: { hasDrawn: false },
      });

      return { success: true, gameStatus: "PLAYING", nextRound: nextRound };
    }

    if (action.startsWith("DRAW") || action === "DRAW_DISCARD") {
      await prisma.gameSession.update({
        where: { id: sessionId },
        data: {
          deck: JSON.stringify(deck),
          discardPile: JSON.stringify(discardPile),
          reshuffleCount: reshuffleCount,
          lastAction: lastAction ? JSON.stringify(lastAction) : undefined,
          pendingBuyIntents: JSON.stringify(pendingBuyIntents),
        },
      });

      // For DRAW_DISCARD, update the buying player (not necessarily currentPlayer)
      if (action === "DRAW_DISCARD") {
        const buyingPlayer = players.find((p) => p.id === playerId);
        if (buyingPlayer) {
          await prisma.player.update({
            where: { id: playerId },
            data: {
              buysUsed: buyingPlayer.buysUsed,
              hand: JSON.stringify(buyingPlayer.hand),
              boughtCards: JSON.stringify(buyingPlayer.boughtCards),
              hasDrawn: buyingPlayer.hasDrawn,
            },
          });
        }
      } else {
        // For other DRAW actions, update currentPlayer
        await prisma.player.update({
          where: { id: currentPlayer.id },
          data: {
            hand: JSON.stringify(currentPlayer.hand),
            boughtCards: JSON.stringify(currentPlayer.boughtCards),
            hasDrawn: currentPlayer.hasDrawn,
          },
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "Move failed", status: 500 };
  }
}

export async function autoReadyBots(sessionId: string) {
  const session = await prisma.gameSession.findUnique({
    where: { id: sessionId },
    include: {
      players: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!session || session.status !== "ROUND_ENDED") {
    return;
  }

  const readyPlayers = JSON.parse(
    session.readyForNextRound || "[]",
  ) as string[];

  // Get all bot players who aren't ready yet
  const botPlayers = session.players.filter(
    (p) => p.isBot && !readyPlayers.includes(p.id),
  );

  // Auto-ready all bots
  if (botPlayers.length > 0) {
    const updatedReady = [...readyPlayers, ...botPlayers.map((p) => p.id)];

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        readyForNextRound: JSON.stringify(updatedReady),
      },
    });

    console.log(
      `[Bot] Auto-ready ${botPlayers.length} bots. Ready count: ${updatedReady.length
      }/${session.players.filter((p) => p.id !== session.creatorId).length}`,
    );

    // Check if all non-host players are ready and auto-start if so
    const nonHostPlayers = session.players.filter(
      (p) => p.id !== session.creatorId,
    );
    if (updatedReady.length === nonHostPlayers.length) {
      console.log(
        `[Bot] All non-host players ready. Waiting for host to start next round.`,
      );
    }
  }
}

export async function checkAndProcessBotTurns(sessionId: string) {
  const MAX_BOT_ITERATIONS = 50;
  const MAX_TIME_PER_TURN = 10000; // 10 seconds max per turn (Watchdog)
  const startTime = Date.now();

  for (let i = 0; i < MAX_BOT_ITERATIONS; i++) {
    const gameState = await getGameState(sessionId);
    if (!gameState || gameState.status !== "PLAYING") break;

    const currentPlayer = gameState.players[gameState.currentTurn];
    if (!currentPlayer.isBot) break;

    // Check timeout - if we're taking too long, force a basic legal move
    if (Date.now() - startTime > MAX_TIME_PER_TURN) {
      console.warn(`[Watchdog] Bot ${currentPlayer.name} timeout! Forcing emergency move.`);

      // Emergency Move: Draw if needed, then discard highest card
      if (!currentPlayer.hasDrawn) {
        await processMove(sessionId, currentPlayer.id, "DRAW_DECK");
        // Refresh player state after draw
        const updatedState = await getGameState(sessionId);
        const refreshedPlayer = updatedState?.players.find(p => p.id === currentPlayer.id);
        if (refreshedPlayer) {
          const cardToDiscard = [...refreshedPlayer.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
          await processMove(sessionId, refreshedPlayer.id, "DISCARD", { cardId: cardToDiscard.id });
        }
      } else {
        const cardToDiscard = [...currentPlayer.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
        await processMove(sessionId, currentPlayer.id, "DISCARD", { cardId: cardToDiscard.id });
      }
      break;
    }

    const difficulty = currentPlayer.difficulty || "MEDIUM";

    const move = calculateBotMove(gameState, currentPlayer.id, difficulty);

    if (move) {
      console.log(
        `Bot ${currentPlayer.name} (${difficulty}) moving:`,
        move.action,
      );

      // Special handling for DRAW_DISCARD: first register intent, then execute
      if (move.action === "DRAW_DISCARD") {
        console.log(
          `[Bot] ${currentPlayer.name} registering buy intent before purchasing`,
        );
        const intentResult = await processMove(
          sessionId,
          currentPlayer.id,
          "INTEND_BUY",
          {},
        );
        if (!intentResult.success) {
          console.warn(
            `[Bot] Failed to register buy intent:`,
            intentResult.error,
          );
        }
      }

      const result = await processMove(
        sessionId,
        currentPlayer.id,
        move.action,
        move.payload,
      );
      if (!result.success) {
        console.error("Bot move failed:", result.error);

        // If the bot failed to perform an action (like DOWN or ADD),
        // try to force a DISCARD to keep the game moving
        if (
          move.action !== "DISCARD" &&
          move.action !== "DRAW_DECK" &&
          move.action !== "DRAW_DISCARD"
        ) {
          console.log(
            `[Bot] ${currentPlayer.name} failed ${move.action}, attempting emergency discard...`,
          );
          const hand = currentPlayer.hand;
          if (hand.length > 0) {
            const cardToDiscard = hand[0];
            const discardResult = await processMove(
              sessionId,
              currentPlayer.id,
              "DISCARD",
              {
                cardId: cardToDiscard.id,
              },
            );
            if (discardResult.success) {
              console.log(
                `[Bot] ${currentPlayer.name} emergency discard succeeded`,
              );
              continue;
            }
          }
        }
        break;
      }

      if (
        result.gameStatus === "ROUND_ENDED" ||
        result.gameStatus === "FINISHED"
      ) {
        break;
      }
    } else {
      // calculateBotMove returned null - bot couldn't decide
      console.log(`[Bot] ${currentPlayer.name} couldn't decide. Forcing emergency move...`);

      if (!currentPlayer.hasDrawn) {
        await processMove(sessionId, currentPlayer.id, "DRAW_DECK");
        // Re-fetch to get new hand
        const updatedState = await getGameState(sessionId);
        const refreshedPlayer = updatedState?.players.find(p => p.id === currentPlayer.id);
        if (refreshedPlayer && refreshedPlayer.hand.length > 0) {
          const cardToDiscard = [...refreshedPlayer.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
          await processMove(sessionId, refreshedPlayer.id, "DISCARD", { cardId: cardToDiscard.id });
        }
      } else if (currentPlayer.hand.length > 0) {
        const cardToDiscard = [...currentPlayer.hand].sort((a, b) => getCardPoints(b) - getCardPoints(a))[0];
        await processMove(sessionId, currentPlayer.id, "DISCARD", { cardId: cardToDiscard.id });
      } else {
        break;
      }
    }
  }
}

// Helper to get card points (imported from rules)
const getCardPoints = (card: Card): number => {
  if (card.suit === "JOKER" || card.value === 0) {
    return 20;
  }
  if (card.value === 1) {
    return 15;
  }
  if (card.value >= 11 && card.value <= 13) {
    return 10;
  }
  return card.value;
};
