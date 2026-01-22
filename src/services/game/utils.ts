import { prisma } from "@/lib/prisma";
import { GameState, Card, Player, BotDifficulty } from "@/types/game";

export function parsePlayer(p: any): Player {
    return {
        ...p,
        hand: JSON.parse(p.hand) as Card[],
        melds: p.melds ? (JSON.parse(p.melds) as Card[][]) : [],
        boughtCards: JSON.parse(p.boughtCards || "[]") as Card[],
        roundScores: JSON.parse(p.roundScores || "[]") as number[],
        roundBuys: JSON.parse(p.roundBuys || "[]") as number[],
        difficulty: (p.difficulty as BotDifficulty) || undefined,
    };
}

export const getCardPoints = (card: Card): number => {
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
