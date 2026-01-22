import { Card, Suit } from "@/types/game";

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
  watch: WatchCard[];
  topDiscardMatchesWatch: boolean;
};

export const getHandSuggestions = (
  hand: Card[],
  topDiscard?: Card,
): HandSuggestions => {
  const jokersCount = hand.filter(isJoker).length;
  const nonJokers = hand.filter((c) => !isJoker(c));

  // Find groups with different suits (Rondas 1-7 logic)
  const nearDifferentSuitGroups: DifferentSuitSuggestion[] = [];

  // Group by suit
  const bySuit = new Map<Exclude<Suit, "JOKER">, Card[]>();
  for (const c of nonJokers) {
    const suit = c.suit as Exclude<Suit, "JOKER">;
    const cards = bySuit.get(suit) ?? [];
    cards.push(c);
    bySuit.set(suit, cards);
  }

  // Find combinations of 2+ suits with at least 1 card each
  const suits = Array.from(bySuit.keys());

  // First, find all 2-suit combinations (need 1 joker)
  for (let i = 0; i < suits.length; i++) {
    for (let j = i + 1; j < suits.length; j++) {
      const suit1 = suits[i];
      const suit2 = suits[j];
      const cards = [bySuit.get(suit1)![0], bySuit.get(suit2)![0]];
      const uniqueSuits = 2;
      const missingCount = 3 - uniqueSuits; // need 1 more

      nearDifferentSuitGroups.push({
        cards,
        uniqueSuits,
        missingCount,
        missing: { kind: "DIFFERENT_SUIT", suits: [suit1, suit2] },
      });
    }
  }

  // Then find all 3-suit combinations (complete groups)
  for (let i = 0; i < suits.length; i++) {
    for (let j = i + 1; j < suits.length; j++) {
      for (let k = j + 1; k < suits.length; k++) {
        const suit1 = suits[i];
        const suit2 = suits[j];
        const suit3 = suits[k];
        const cardsThree = [
          bySuit.get(suit1)![0],
          bySuit.get(suit2)![0],
          bySuit.get(suit3)![0],
        ];
        nearDifferentSuitGroups.push({
          cards: cardsThree,
          uniqueSuits: 3,
          missingCount: 0,
          missing: { kind: "DIFFERENT_SUIT", suits: [suit1, suit2, suit3] },
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

  return {
    nearDifferentSuitGroups: nearDifferentSuitGroups.slice(0, 6),
    nearEscalas: nearEscalas.slice(0, 3),
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
