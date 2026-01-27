import type { Card, Suit } from "@/types/game";
import { canAddToMeld } from "./rules";

const isJoker = (c: Card) => c.suit === "JOKER" || c.value === 0;

const displayValue = (value: number) => {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
};

const getSuitSymbol = (suit: Suit) => {
  if (suit === "HEART") return "♥";
  if (suit === "DIAMOND") return "♦";
  if (suit === "CLUB") return "♣";
  if (suit === "SPADE") return "♠";
  return "🃏";
};

export type WatchCard =
  | { kind: "DIFFERENT_SUIT"; suits: Suit[] }
  | { kind: "ESCALA_CARD"; value: number; suit: Exclude<Suit, "JOKER"> };

export type DifferentSuitSuggestion = {
  cards: Card[];
  uniqueSuits: number;
  missingCount: number;
  missing: { kind: "DIFFERENT_SUIT"; suits: Suit[] };
};

export type EscalaSuggestion = {
  suit: Exclude<Suit, "JOKER">;
  cards: Card[];
  missing: { kind: "ESCALA_CARD"; value: number; suit: Exclude<Suit, "JOKER"> };
};

export type HandSuggestions = {
  nearDifferentSuitGroups: DifferentSuitSuggestion[];
  nearEscalas: EscalaSuggestion[];
  addableToTable: Card[];
  watch: WatchCard[];
  topDiscardMatchesWatch: boolean;
};

export const getHandSuggestions = (
  hand: Card[],
  topDiscard?: Card,
  boardMelds: Card[][] = [],
): HandSuggestions => {
  const nonJokers = hand.filter((c) => !isJoker(c));

  // Find groups with different suits (Rondas 1-7 logic)
  const nearDifferentSuitGroups: DifferentSuitSuggestion[] = [];

  // Group by VALUE first (because now they must have the same value)
  const byValue = new Map<number, Card[]>();
  for (const c of nonJokers) {
    const cards = byValue.get(c.value) ?? [];
    cards.push(c);
    byValue.set(c.value, cards);
  }

  for (const [value, cardsOfSameValue] of byValue) {
    // Use all natural cards of the same value (suits may repeat under new rules)
    const naturalCards = cardsOfSameValue;
    const jokers = hand.filter(isJoker);
    const availableJokers = [...jokers];

    const naturalCount = naturalCards.length;

    // Consider groups of minimum 3
    if (naturalCount >= 3) {
      // Already have a full group
      nearDifferentSuitGroups.push({
        cards: naturalCards.slice(0, Math.max(3, naturalCount)),
        uniqueSuits: naturalCount, // repurpose field as natural count for sorting
        missingCount: 0,
        missing: {
          kind: "DIFFERENT_SUIT",
          suits: naturalCards.map((c) => c.suit as Suit).slice(0, 3),
        },
      });
    } else if (naturalCount > 0 && naturalCount + availableJokers.length >= 3) {
      // We can complete a 3-card group with jokers (e.g., 2 naturals + 1 joker or 1 natural + 2 jokers)
      const needed = 3 - naturalCount;
      const usedJokers = Math.min(needed, availableJokers.length);
      nearDifferentSuitGroups.push({
        cards: [...naturalCards, ...availableJokers.slice(0, usedJokers)],
        uniqueSuits: naturalCount,
        missingCount: 0,
        missing: { kind: "DIFFERENT_SUIT", suits: naturalCards.map((c) => c.suit as Suit) },
      });
    } else if (naturalCount > 0) {
      // Partial suggestion: not enough to complete a group of 3 yet
      nearDifferentSuitGroups.push({
        cards: naturalCards.slice(0, Math.min(3, naturalCards.length)),
        uniqueSuits: naturalCount,
        missingCount: Math.max(0, 3 - naturalCount),
        missing: { kind: "DIFFERENT_SUIT", suits: naturalCards.map((c) => c.suit as Suit) },
      });
    }
  }

  // Sort: complete groups first, then by missing count
  nearDifferentSuitGroups.sort((a, b) => {
    if (a.missingCount !== b.missingCount) {
      return a.missingCount - b.missingCount;
    }
    return b.uniqueSuits - a.uniqueSuits;
  });

  // Find escalas (Ronda 8 logic)
  const bySuitEscala = new Map<Exclude<Suit, "JOKER">, Map<number, Card>>();
  for (const c of nonJokers) {
    const suit = c.suit as Exclude<Suit, "JOKER">;
    const map = bySuitEscala.get(suit) ?? new Map<number, Card>();
    if (!map.has(c.value)) map.set(c.value, c);
    bySuitEscala.set(suit, map);
  }

  const nearEscalas: EscalaSuggestion[] = [];
  const suitsArray: Array<Exclude<Suit, "JOKER">> = ["HEART", "DIAMOND", "CLUB", "SPADE"];
  for (const suit of suitsArray) {
    const valuesToCard = bySuitEscala.get(suit) ?? new Map<number, Card>();
    if (valuesToCard.size < 3) continue;

    // Try all 13 starting positions for a 4-card window
    for (let start = 1; start <= 13; start++) {
      const window = [start, (start % 13) + 1, ((start + 1) % 13) + 1, ((start + 2) % 13) + 1];
      const found = window.map((v) => valuesToCard.get(v)).filter((c) => c !== undefined) as Card[];

      if (found.length === 3) {
        const missing = window.find((v) => !valuesToCard.has(v))!;
        nearEscalas.push({
          suit,
          cards: found.sort((a, b) => a.value - b.value),
          missing: {
            kind: "ESCALA_CARD",
            value: missing,
            suit,
          },
        });
      }
    }
  }

  const watch: WatchCard[] = [];
  if (topDiscard && !isJoker(topDiscard)) {
    const discardSuit = topDiscard.suit as Exclude<Suit, "JOKER">;
    watch.push({ kind: "DIFFERENT_SUIT", suits: [discardSuit] });
    watch.push({
      kind: "ESCALA_CARD",
      value: topDiscard.value,
      suit: discardSuit,
    });
  }

  // Find cards addable to table
  const addableToTable: Card[] = [];
  if (boardMelds.length > 0) {
    for (const card of hand) {
      if (boardMelds.some((meld) => canAddToMeld(card, meld))) {
        addableToTable.push(card);
      }
    }
  }

  return {
    nearDifferentSuitGroups: nearDifferentSuitGroups.slice(0, 6),
    nearEscalas: nearEscalas.slice(0, 3),
    addableToTable,
    watch,
    topDiscardMatchesWatch: watch.length > 0,
  };
};

export const formatWatchCard = (w: WatchCard) => {
  if (w.kind === "DIFFERENT_SUIT") {
    const suitSymbols = w.suits.map(getSuitSymbol).join("");
    return `Palos: ${suitSymbols}`;
  }
  return `${displayValue(w.value)}${getSuitSymbol(w.suit)}`;
};

export const formatCardShort = (c: Card) => {
  if (isJoker(c)) return "Joker";
  return `${c.displayValue || displayValue(c.value)}${getSuitSymbol(c.suit)}`;
};
