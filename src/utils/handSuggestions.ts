import { Card, Suit } from "@/types/game";

const isJoker = (c: Card) => c.suit === "JOKER" || c.value === 0;

const displayValue = (value: number) => {
  if (value === 1) return "A";
  if (value === 11) return "J";
  if (value === 12) return "Q";
  if (value === 13) return "K";
  return String(value);
};

export type WatchCard =
  | { kind: "TRIO_VALUE"; value: number }
  | { kind: "ESCALA_CARD"; value: number; suit: Exclude<Suit, "JOKER"> };

export type TrioSuggestion = {
  value: number;
  cards: Card[];
  missing: { kind: "TRIO_VALUE"; value: number };
};

export type EscalaSuggestion = {
  suit: Exclude<Suit, "JOKER">;
  cards: Card[];
  missing: { kind: "ESCALA_CARD"; value: number; suit: Exclude<Suit, "JOKER"> };
};

export type HandSuggestions = {
  nearTrios: TrioSuggestion[];
  nearEscalas: EscalaSuggestion[];
  watch: WatchCard[];
  topDiscardMatchesWatch: boolean;
};

export const getHandSuggestions = (
  hand: Card[],
  topDiscard?: Card
): HandSuggestions => {
  const jokersCount = hand.filter(isJoker).length;
  const nonJokers = hand.filter((c) => !isJoker(c));

  const byValue = new Map<number, Card[]>();
  for (const c of nonJokers) {
    const arr = byValue.get(c.value) ?? [];
    arr.push(c);
    byValue.set(c.value, arr);
  }

  const nearTrios: TrioSuggestion[] = [];
  for (const [value, cards] of byValue.entries()) {
    if (cards.length === 2 && jokersCount === 0) {
      nearTrios.push({
        value,
        cards,
        missing: { kind: "TRIO_VALUE", value },
      });
    }
  }

  const bySuit = new Map<Exclude<Suit, "JOKER">, Map<number, Card>>();
  for (const c of nonJokers) {
    const suit = c.suit as Exclude<Suit, "JOKER">;
    const map = bySuit.get(suit) ?? new Map<number, Card>();
    if (!map.has(c.value)) map.set(c.value, c);
    bySuit.set(suit, map);
  }

  const nearEscalas: EscalaSuggestion[] = [];
  const suits: Array<Exclude<Suit, "JOKER">> = ["HEART", "DIAMOND", "CLUB", "SPADE"];
  for (const suit of suits) {
    const valuesToCard = bySuit.get(suit) ?? new Map<number, Card>();
    if (valuesToCard.size < 3) continue;

    // Try all 13 starting positions for a 4-card window
    for (let start = 1; start <= 13; start++) {
      const window = [
        start,
        ((start) % 13) + 1,
        ((start + 1) % 13) + 1,
        ((start + 2) % 13) + 1
      ];
      const present = window.filter((v) => valuesToCard.has(v));
      if (present.length !== 3) continue;
      if (jokersCount > 0) continue;

      const missingValue = window.find((v) => !valuesToCard.has(v));
      if (!missingValue) continue;

      const cards = present
        .map((v) => valuesToCard.get(v)!)
        .sort((a, b) => {
          // Special sort for circular display: if it's a wrap-around, 
          // we want to maintain the visual order. 
          // But for now, simple sort is fine as it's just for displayValue.
          return a.value - b.value;
        });

      const key = `${suit}:${missingValue}:${cards.map((c) => c.value).join(",")}`;
      if (nearEscalas.some((e) => `${e.suit}:${e.missing.value}:${e.cards.map((c) => c.value).join(",")}` === key)) {
        continue;
      }

      nearEscalas.push({
        suit,
        cards,
        missing: { kind: "ESCALA_CARD", suit, value: missingValue },
      });
    }
  }

  nearTrios.sort((a, b) => a.value - b.value);
  nearEscalas.sort((a, b) => (a.suit + a.missing.value).localeCompare(b.suit + b.missing.value));

  const watch: WatchCard[] = [];
  for (const t of nearTrios) {
    if (!watch.some((w) => w.kind === "TRIO_VALUE" && w.value === t.value)) {
      watch.push({ kind: "TRIO_VALUE", value: t.value });
    }
  }
  for (const e of nearEscalas) {
    if (
      !watch.some(
        (w) => w.kind === "ESCALA_CARD" && w.value === e.missing.value && w.suit === e.missing.suit
      )
    ) {
      watch.push({ kind: "ESCALA_CARD", value: e.missing.value, suit: e.missing.suit });
    }
  }

  const topDiscardMatchesWatch = (() => {
    if (!topDiscard) return false;
    if (isJoker(topDiscard)) return watch.length > 0;
    const suit = topDiscard.suit as Exclude<Suit, "JOKER">;
    return watch.some((w) => {
      if (w.kind === "TRIO_VALUE") return w.value === topDiscard.value;
      return w.value === topDiscard.value && w.suit === suit;
    });
  })();

  return { nearTrios, nearEscalas, watch, topDiscardMatchesWatch };
};

export const formatWatchCard = (w: WatchCard) => {
  if (w.kind === "TRIO_VALUE") return `${displayValue(w.value)} (cualquiera)`;
  const suitChar =
    w.suit === "HEART" ? "♥" : w.suit === "DIAMOND" ? "♦" : w.suit === "CLUB" ? "♣" : "♠";
  return `${displayValue(w.value)}${suitChar}`;
};

export const formatCardShort = (c: Card) => {
  if (isJoker(c)) return "Joker";
  const suitChar =
    c.suit === "HEART" ? "♥" : c.suit === "DIAMOND" ? "♦" : c.suit === "CLUB" ? "♣" : "♠";
  return `${c.displayValue || displayValue(c.value)}${suitChar}`;
};

