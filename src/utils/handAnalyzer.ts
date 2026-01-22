import { Card, ROUND_CONTRACTS, ROUND_CONTRACTS_DATA } from "@/types/game";

// Helper to sort cards for display/logic
export const sortCards = (cards: Card[]) => {
  return [...cards].sort((a, b) => {
    if (a.suit === "JOKER") return -1;
    if (b.suit === "JOKER") return 1;
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return a.value - b.value;
  });
};

const isJoker = (c: Card) => c.suit === "JOKER" || c.value === 0;

export const isValidTrio = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return true;

  const targetValue = nonJokers[0].value;
  if (!nonJokers.every((c) => c.value === targetValue)) return false;

  // New Carioca Rule: Different Suits
  const suits = new Set(nonJokers.map(c => c.suit));
  return suits.size === nonJokers.length;
};

export const isValidEscala = (
  cards: Card[],
  minLength: number = 4,
): boolean => {
  if (cards.length < minLength) return false;
  if (cards.length > 13) return false;

  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return true;

  const targetSuit = nonJokers[0].suit;
  if (nonJokers.some((c) => c.suit !== targetSuit)) return false;

  const values = nonJokers.map((c) => c.value);
  if (new Set(values).size !== values.length) return false;

  const isLinearWithShift = (vals: number[], jokerCount: number) => {
    const isLinear = (v: number[]) => {
      if (v.length === 0) return true;
      return v[v.length - 1] - v[0] + 1 - v.length <= jokerCount;
    };
    if (isLinear(vals.sort((a, b) => a - b))) return true;
    if (vals.includes(1)) {
      const highAce = vals.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
      if (isLinear(highAce)) return true;
    }
    for (let shift = 1; shift < 13; shift++) {
      const shifted = vals.map(v => {
        let s = (v + shift) % 13;
        return s === 0 ? 13 : s;
      }).sort((a, b) => a - b);
      if (isLinear(shifted)) return true;
    }
    return false;
  };

  return isLinearWithShift(values, cards.length - nonJokers.length);
};

export const findPotentialContractGroups = (
  hand: Card[],
  round: number
): { trios: Card[][], escalas: Card[][] } => {
  const reqs = ROUND_CONTRACTS_DATA[round];
  if (!reqs) return { trios: [], escalas: [] };

  const nonJokers = hand.filter(c => !isJoker(c));
  const jokers = hand.filter(isJoker);
  let availableJokers = [...jokers];

  const foundTrios: Card[][] = [];
  const foundEscalas: Card[][] = [];

  // Trios Logic
  if (reqs.differentSuitGroups > 0) {
    const byValue = new Map<number, Card[]>();
    nonJokers.forEach(c => {
      const list = byValue.get(c.value) ?? [];
      list.push(c);
      byValue.set(c.value, list);
    });

    for (const [val, cards] of byValue) {
      const uniqueSuitsMap = new Map();
      cards.forEach(c => uniqueSuitsMap.set(c.suit, c));
      const uniqueCards = Array.from(uniqueSuitsMap.values()) as Card[];

      if (uniqueCards.length >= reqs.differentSuitSize) {
        foundTrios.push(uniqueCards.slice(0, reqs.differentSuitSize));
      } else if (uniqueCards.length + availableJokers.length >= reqs.differentSuitSize) {
        const needed = reqs.differentSuitSize - uniqueCards.length;
        foundTrios.push([...uniqueCards, ...availableJokers.slice(0, needed)]);
      }
    }
  }

  // Escalas Logic
  if (reqs.escalas > 0) {
    const bySuit = new Map<string, Card[]>();
    nonJokers.forEach(c => {
      const list = bySuit.get(c.suit) ?? [];
      list.push(c);
      bySuit.set(c.suit, list);
    });

    for (const [suit, cards] of bySuit) {
      for (let start = 1; start <= 13; start++) {
        const windowValues = Array.from({ length: reqs.escalaSize }, (_, i) => ((start + i - 1) % 13) + 1);
        const cardsInWindow = cards.filter(c => windowValues.includes(c.value));

        // Simplified check
        if (isValidEscala([...cardsInWindow, ...availableJokers.slice(0, reqs.escalaSize - cardsInWindow.length)], reqs.escalaSize)) {
          foundEscalas.push([...cardsInWindow, ...availableJokers.slice(0, reqs.escalaSize - cardsInWindow.length)]);
        }
      }
    }
  }

  return { trios: foundTrios, escalas: foundEscalas };
};

export const findAllValidGroups = (hand: Card[]): { trios: Card[][], escalas: Card[][] } => {
  // For discard hint: find ANY 3-card group
  const nonJokers = hand.filter(c => !isJoker(c));
  const foundTrios: Card[][] = [];
  const foundEscalas: Card[][] = [];

  // Trios (simplified)
  const byValue = new Map<number, Card[]>();
  nonJokers.forEach(c => {
    const list = byValue.get(c.value) ?? [];
    list.push(c);
    byValue.set(c.value, list);
  });
  for (const [val, cards] of byValue) {
    const uniqueSuitsMap = new Map();
    cards.forEach(c => uniqueSuitsMap.set(c.suit, c));
    const uniqueCards = Array.from(uniqueSuitsMap.values()) as Card[];
    if (uniqueCards.length >= 3) foundTrios.push(uniqueCards.slice(0, 3));
  }

  // Escalas (simplified)
  const bySuit = new Map<string, Card[]>();
  nonJokers.forEach(c => {
    const list = bySuit.get(c.suit) ?? [];
    list.push(c);
    bySuit.set(c.suit, list);
  });
  for (const [suit, cards] of bySuit) {
    cards.sort((a, b) => a.value - b.value);
    for (let i = 0; i < cards.length - 2; i++) {
      const sub = cards.slice(i, i + 3);
      if (isValidEscala(sub, 3)) foundEscalas.push(sub);
    }
  }

  return { trios: foundTrios, escalas: foundEscalas };
}

export const canFulfillContract = (
  hand: Card[],
  round: number,
  alreadyMelded: boolean = false,
): { canDown: boolean; groups: Card[][] } => {
  if (alreadyMelded) return { canDown: false, groups: [] };

  const reqs = ROUND_CONTRACTS_DATA[round];
  const { trios, escalas } = findPotentialContractGroups(hand, round);

  if (trios.length >= reqs.differentSuitGroups && escalas.length >= reqs.escalas) {
    return {
      canDown: true,
      groups: [
        ...trios.slice(0, reqs.differentSuitGroups),
        ...escalas.slice(0, reqs.escalas)
      ]
    };
  }

  return { canDown: false, groups: [] };
};

export const organizeHandAuto = (hand: Card[], round: number, melded: boolean) => {
  return sortCards(hand);
};
