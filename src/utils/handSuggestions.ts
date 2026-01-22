import { Card, Suit } from "@/types/game";
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
    // Unique suits for this value
    const uniqueSuitsMap = new Map<Suit, Card>();
    for (const c of cardsOfSameValue) {
      if (!uniqueSuitsMap.has(c.suit)) {
        uniqueSuitsMap.set(c.suit, c);
      }
    }

    const uniqueSuits = Array.from(uniqueSuitsMap.keys());
    const uniqueCards = Array.from(uniqueSuitsMap.values());
    const jokers = hand.filter(isJoker);
    let availableJokers = [...jokers];

    if (uniqueCards.length >= 2 || (uniqueCards.length === 1 && availableJokers.length >= 2)) {
      // Logic for Carioca: a group needs at least 3 cards total and Natural >= Jokers
      // We check if we can reach 3 cards with available jokers
      const naturalCount = uniqueCards.length;
      let usedJokers = 0;

      // If we have 2 natural, we can use 1 joker to make 3 (valid: 2 > 1)
      // If we have 2 natural, we can use 2 jokers to make 4 (valid: 2 == 2)
      // If we have 1 natural, we cannot make a valid 3+ group (needs at least 2 natural to use 1 joker)

      const potentialTotal = naturalCount + availableJokers.length;
      if (potentialTotal >= 3 && naturalCount >= Math.ceil(3 / 2)) {
        // It's a valid potential group
        const missingForThree = Math.max(0, 3 - naturalCount);
        const totalValidWithJokers = naturalCount + Math.min(availableJokers.length, naturalCount);

        nearDifferentSuitGroups.push({
          cards: [...uniqueCards, ...availableJokers.slice(0, Math.min(availableJokers.length, naturalCount))],
          uniqueSuits: naturalCount,
          missingCount: totalValidWithJokers >= 3 ? 0 : 3 - naturalCount,
          missing: { kind: "DIFFERENT_SUIT", suits: uniqueSuits },
        });
      }
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
  const suitsArray: Array<Exclude<Suit, "JOKER">> = [
    "HEART",
    "DIAMOND",
    "CLUB",
    "SPADE",
  ];
  for (const suit of suitsArray) {
    const valuesToCard = bySuitEscala.get(suit) ?? new Map<number, Card>();
    if (valuesToCard.size < 3) continue;

    // Try all 13 starting positions for a 4-card window
    for (let start = 1; start <= 13; start++) {
      const window = [
        start,
        (start % 13) + 1,
        ((start + 1) % 13) + 1,
        ((start + 2) % 13) + 1,
      ];
      const found = window
        .map((v) => valuesToCard.get(v))
        .filter((c) => c !== undefined) as Card[];

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
      if (boardMelds.some(meld => canAddToMeld(card, meld))) {
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
