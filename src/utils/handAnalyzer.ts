import { type Card, ROUND_CONTRACTS, ROUND_CONTRACTS_DATA } from "@/types/game";

// Helper to sort cards for display/logic
export const sortCards = (cards: Card[]) => {
  return [...cards].sort((a, b) => {
    if (a.suit === "JOKER") return -1;
    if (b.suit === "JOKER") return 1;
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit);
    return a.value - b.value;
  });
};

export const sortCardsByRank = (cards: Card[]) => {
  return [...cards].sort((a, b) => {
    if (a.suit === "JOKER") return -1;
    if (b.suit === "JOKER") return 1;
    if (a.value !== b.value) return a.value - b.value;
    return a.suit.localeCompare(b.suit);
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
  const suits = new Set(nonJokers.map((c) => c.suit));
  return suits.size === nonJokers.length;
};

export const isValidEscala = (cards: Card[], minLength: number = 4): boolean => {
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
      const highAce = vals.map((v) => (v === 1 ? 14 : v)).sort((a, b) => a - b);
      if (isLinear(highAce)) return true;
    }
    for (let shift = 1; shift < 13; shift++) {
      const shifted = vals
        .map((v) => {
          const s = (v + shift) % 13;
          return s === 0 ? 13 : s;
        })
        .sort((a, b) => a - b);
      if (isLinear(shifted)) return true;
    }
    return false;
  };

  return isLinearWithShift(values, cards.length - nonJokers.length);
};

export const findPotentialContractGroups = (
  hand: Card[],
  round: number,
): { trios: Card[][]; escalas: Card[][] } => {
  const reqs = ROUND_CONTRACTS_DATA[round];
  if (!reqs) return { trios: [], escalas: [] };

  const nonJokers = hand.filter((c) => !isJoker(c));
  const jokers = hand.filter(isJoker);
  let availableJokers = [...jokers];

  const foundTrios: Card[][] = [];
  const foundEscalas: Card[][] = [];

  // Trios Logic (updated): groups are 3+ cards of same value (jokers allowed), suits may repeat
  if (reqs.differentSuitGroups > 0) {
    const byValue = new Map<number, Card[]>();
    nonJokers.forEach((c) => {
      const list = byValue.get(c.value) ?? [];
      list.push(c);
      byValue.set(c.value, list);
    });

    for (const [val, cards] of byValue) {
      const naturalCards = cards as Card[]; // same value, suits may repeat
      const cardNames = naturalCards.map((c) => `${c.value}${c.suit}`).join(", ");

      if (naturalCards.length >= reqs.differentSuitSize) {
        const group = naturalCards.slice(0, reqs.differentSuitSize);
        foundTrios.push(group);
      } else if (naturalCards.length + availableJokers.length >= reqs.differentSuitSize) {
        const needed = reqs.differentSuitSize - naturalCards.length;
        const jokerGroup = availableJokers.slice(0, needed);
        const fullGroup = [...naturalCards, ...jokerGroup];
        foundTrios.push(fullGroup);
        // Consume the jokers used
        availableJokers = availableJokers.slice(needed);
      } else {
      }
    }
  }

  // Escalas Logic
  if (reqs.escalas > 0) {
    const bySuit = new Map<string, Card[]>();
    nonJokers.forEach((c) => {
      const list = bySuit.get(c.suit) ?? [];
      list.push(c);
      bySuit.set(c.suit, list);
    });

    for (const [suit, cards] of bySuit) {
      for (let start = 1; start <= 13; start++) {
        const windowValues = Array.from(
          { length: reqs.escalaSize },
          (_, i) => ((start + i - 1) % 13) + 1,
        );
        const usedValues = new Set<number>();
        const cardsInWindow: Card[] = [];
        for (const c of cards) {
          if (!windowValues.includes(c.value)) continue;
          if (usedValues.has(c.value)) continue;
          usedValues.add(c.value);
          cardsInWindow.push(c);
        }

        // Simplified check
        const needed = reqs.escalaSize - cardsInWindow.length;
        if (
          needed <= availableJokers.length &&
          isValidEscala([...cardsInWindow, ...availableJokers.slice(0, needed)], reqs.escalaSize)
        ) {
          const jokerGroup = availableJokers.slice(0, needed);
          foundEscalas.push([...cardsInWindow, ...jokerGroup]);
          // Consume the jokers used
          availableJokers = availableJokers.slice(needed);
        }
      }
    }
  }

  return { trios: foundTrios, escalas: foundEscalas };
};

export const findAllValidGroups = (hand: Card[]): { trios: Card[][]; escalas: Card[][] } => {
  // For additional downs: find ANY 3-card group (3+ same value, or valid escala)
  const nonJokers = hand.filter((c) => !isJoker(c));
  const jokers = hand.filter(isJoker);
  let availableJokers = [...jokers];
  const foundTrios: Card[][] = [];
  const foundEscalas: Card[][] = [];

  // Trios: 3+ cards of same value (any suits - jokers allowed, but require at least 2 naturals when using jokers)
  const byValue = new Map<number, Card[]>();
  nonJokers.forEach((c) => {
    const list = byValue.get(c.value) ?? [];
    list.push(c);
    byValue.set(c.value, list);
  });
  for (const [val, cards] of byValue) {
    // If we already have 3+ naturals, it's a triable group
    if (cards.length >= 3) {
      foundTrios.push(cards.slice(0, 3));
      continue;
    }

    // Otherwise, try to complete with jokers, but only if we have at least 2 naturals
    if (cards.length >= 2) {
      const needed = 3 - cards.length;
      if (availableJokers.length >= needed) {
        const jokerGroup = availableJokers.slice(0, needed);
        const fullGroup = [...cards, ...jokerGroup];
        foundTrios.push(fullGroup);
        // consume jokers used
        availableJokers = availableJokers.slice(needed);
      }
    }
  }

  // Escalas (simplified) - still need same suit for sequences, jokers may help
  const bySuit = new Map<string, Card[]>();
  nonJokers.forEach((c) => {
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
};

/**
 * Check if can do initial down (fulfilling round contract)
 */
export const canDoInitialDown = (
  hand: Card[],
  round: number,
): { canDown: boolean; groups: Card[][] } => {
  const reqs = ROUND_CONTRACTS_DATA[round];
  const { trios, escalas } = findPotentialContractGroups(hand, round);

  if (trios.length >= reqs.differentSuitGroups && escalas.length >= reqs.escalas) {
    return {
      canDown: true,
      groups: [...trios.slice(0, reqs.differentSuitGroups), ...escalas.slice(0, reqs.escalas)],
    };
  }

  return { canDown: false, groups: [] };
};

/**
 * Check if can do additional down (already melded, just need 1+ valid group)
 * For additional downs, ANY valid group works (3+ cards of same value with different suits, or a valid escala)
 */
export const canDoAdditionalDown = (
  hand: Card[],
  round: number,
): { canDown: boolean; groups: Card[][] } => {
  // For additional downs, we need ANY valid group, not following round contract
  // Just check if there's at least 1 valid trio or escala using findAllValidGroups
  const { trios, escalas } = findAllValidGroups(hand);

  // For additional downs, need at least 1 trio OR 1 escala
  const hasValidGroup = trios.length > 0 || escalas.length > 0;

  if (hasValidGroup) {
    // Return just the first available group
    const groups: Card[][] = [];
    if (trios.length > 0) {
      groups.push(trios[0]);
    } else if (escalas.length > 0) {
      groups.push(escalas[0]);
    }

    return { canDown: true, groups };
  }

  return { canDown: false, groups: [] };
};

export const canFulfillContract = (
  hand: Card[],
  round: number,
  alreadyMelded: boolean = false,
): { canDown: boolean; groups: Card[][] } => {
  if (alreadyMelded) {
    return canDoAdditionalDown(hand, round);
  }

  return canDoInitialDown(hand, round);
};

export const organizeHandAuto = (hand: Card[], round: number, melded: boolean) => {
  return sortCards(hand);
};
