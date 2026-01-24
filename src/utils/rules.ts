import { Card, ROUND_CONTRACTS, ROUND_CONTRACTS_DATA } from "@/types/game";

const isJoker = (c: Card) => c.suit === "JOKER" || c.value === 0;

/**
 * Validates a group with cards of different suits (Rondas 1-7 in Carioca)
 * At least minLength cards with different suits
 * Jokers can be used as wildcards to complete different suits
 */
export const isDifferentSuitGroup = (
  cards: Card[],
  minLength: number = 3,
): boolean => {
  if (cards.length < minLength) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  const jokers = cards.filter((c) => c.suit === "JOKER" || c.value === 0);

  if (nonJokers.length === 0) return true; // All Jokers

  // NEW: All natural cards MUST have the same value
  const firstValue = nonJokers[0].value;
  if (!nonJokers.every((c) => c.value === firstValue)) return false;

  // Get unique suits from non-jokers
  const uniqueSuits = new Set(nonJokers.map((c) => c.suit));

  // Rule: All natural cards must have different suits
  if (uniqueSuits.size !== nonJokers.length) return false;

  // Since there are only 4 legal suits, we can have at most 4 natural cards 
  // in a Different Suit Group. Any additional cards must be Jokers.
  if (nonJokers.length > 4) return false;

  const suitCount = uniqueSuits.size;
  const jokerCount = jokers.length;

  // Rule: Natural cards must be >= Jokers
  if (jokerCount > suitCount) return false;

  const totalCards = suitCount + jokerCount;
  return totalCards >= minLength;
};

/**
 * DEPRECATED: Use isDifferentSuitGroup for Rondas 1-7
 * Kept for backward compatibility with additional downs and melds
 */
export const isTrio = (cards: Card[], minLength: number = 3): boolean => {
  if (cards.length < minLength) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  const jokers = cards.filter((c) => c.suit === "JOKER" || c.value === 0);

  if (nonJokers.length === 0) return true; // All Jokers

  // Check if all non-jokers have the same value
  const firstValue = nonJokers[0].value;
  if (!nonJokers.every((c) => c.value === firstValue)) return false;

  // In Carioca, you usually need more natural cards than jokers in a trio
  if (nonJokers.length < 2 && cards.length >= 3) return false;

  return true;
};

export const isEscala = (cards: Card[], minLength: number = 4): boolean => {
  if (cards.length < minLength) return false;
  if (cards.length > 13) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  const jokers = cards.filter((c) => c.suit === "JOKER" || c.value === 0);

  if (nonJokers.length === 0) return true; // All Jokers

  // Check suit (all non-jokers must be same suit)
  const firstSuit = nonJokers[0].suit;
  if (!nonJokers.every((c) => c.suit === firstSuit)) return false;

  // Values logic (Ace can be 1 or 14 for sequence purposes)
  const values = nonJokers.map((c) => c.value).sort((a, b) => a - b);
  if (new Set(values).size !== values.length) return false;

  // Linear check helper
  const isLinearSequence = (vals: number[], jokerCount: number) => {
    const range = vals[vals.length - 1] - vals[0] + 1;
    const gaps = range - vals.length;
    return gaps <= jokerCount;
  };

  // 1. Check Standard Linear (Ace as 1)
  if (isLinearSequence(values, jokers.length)) return true;

  // 2. Check Ace as High (Ace as 14)
  if (values.includes(1)) {
    const aceHighValues = values.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
    if (isLinearSequence(aceHighValues, jokers.length)) return true;
  }

  // 3. Circular (Wrapping) Check:
  // For Carioca, we check if the sequence wraps around King to Ace to 2.
  // We can test this by trying all possible starting points (shifting values).
  for (let shift = 1; shift < 13; shift++) {
    const shiftedValues = values.map(v => {
      let shifted = (v + shift) % 13;
      return shifted === 0 ? 13 : shifted;
    }).sort((a, b) => a - b);

    if (isLinearSequence(shiftedValues, jokers.length)) return true;
  }

  return false;
};

export const validateContract = (
  groups: Card[][],
  round: number,
): { valid: boolean; error?: string } => {
  const reqs = ROUND_CONTRACTS_DATA[round];
  if (!reqs) {
    return { valid: false, error: "Ronda desconocida o contrato no válido." };
  }

  const totalRequired = (reqs.differentSuitGroups || 0) + (reqs.escalas || 0);
  if (groups.length > totalRequired) {
    return {
      valid: false,
      error: `Solo puedes bajar exactamente lo que pide el contrato (${reqs.differentSuitGroups || 0} grupos y ${reqs.escalas || 0} escalas).`
    };
  }

  let remainingGroups = [...groups];
  let requiredDifferentSuitGroups = reqs.differentSuitGroups || 0;
  let requiredEscalas = reqs.escalas || 0;
  const usedIndices = new Set<number>();

  // 1. Fulfill Escalas
  if (requiredEscalas > 0) {
    for (let i = 0; i < remainingGroups.length; i++) {
      if (isEscala(remainingGroups[i], reqs.escalaSize)) {
        requiredEscalas--;
        usedIndices.add(i);
        if (requiredEscalas === 0) break;
      }
    }
  }

  // 2. Fulfill DifferentSuitGroups (deprecated name: these are now trios of same value)
  if (requiredDifferentSuitGroups > 0) {
    for (let i = 0; i < remainingGroups.length; i++) {
      if (usedIndices.has(i)) continue;
      // Accept any trio (same value, jokers allowed)
      if (isTrio(remainingGroups[i], reqs.differentSuitSize)) {
        requiredDifferentSuitGroups--;
        usedIndices.add(i);
        if (requiredDifferentSuitGroups === 0) break;
      }
    }
  }

  if (requiredDifferentSuitGroups > 0 || requiredEscalas > 0) {
    const errorMsg = [];
    if (requiredDifferentSuitGroups > 0)
      errorMsg.push(`${requiredDifferentSuitGroups} grupo(s) de ${reqs.differentSuitSize}+ cartas del mismo valor`);
    if (requiredEscalas > 0)
      errorMsg.push(`${requiredEscalas} escala(s) de ${reqs.escalaSize}+`);
    return {
      valid: false,
      error: `No cumples el contrato. Falta: ${errorMsg.join(" y ")}.`,
    };
  }

  if (usedIndices.size !== groups.length) {
    return {
      valid: false,
      error: "Uno de los grupos enviados no es válido para cumplir el contrato o estás bajando de más."
    };
  }

  return { valid: true };
};

export const validateAdditionalDown = (
  groups: Card[][],
): { valid: boolean; error?: string } => {
  if (groups.length === 0) return { valid: false, error: "Debes bajar al menos 1 grupo." };

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group.length < 3) return { valid: false, error: `El grupo ${i + 1} debe tener al menos 3 cartas.` };
    
    // For additional downs: accept ANY valid group
    // - isTrio: 3+ cards of same value (any suits allowed)
    // - isEscala: cards in sequence (same suit)
    // - isDifferentSuitGroup: 3+ cards of same value with different suits
    if (!isTrio(group, 3) && !isEscala(group, 3)) {
      return { valid: false, error: `El grupo ${i + 1} no es válido.` };
    }
  }
  return { valid: true };
};

export const canAddToMeld = (card: Card, meld: Card[]): boolean => {
  const isJ = isJoker(card);
  const nonJokersMeld = meld.filter(c => !isJoker(c));

  // If it's a group (DifferentSuitGroup/Trio)
  if (nonJokersMeld.length > 0 && nonJokersMeld.every(c => c.value === nonJokersMeld[0].value)) {
    // If we're adding a Joker, it's always valid for a group
    if (isJ) return true;
    // If we're adding a natural card, it must have the same value
    if (card.value === nonJokersMeld[0].value) return true;
  }

  // If it's an escala
  const newMeld = [...meld, card];
  if (isEscala(newMeld, 3)) return true;

  return false;
};

export const canStealJoker = (card: Card, meld: Card[], hand: Card[]): boolean => {
  const jokers = meld.filter((c) => c.suit === "JOKER" || c.value === 0);
  if (jokers.length === 0) return false;
  const nonJokers = meld.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  if (nonJokers.length === 0) return false;

  // Try replacing the first joker and check if it maintains validity
  const remainingJokers = jokers.slice(1);
  const newMeld = [...nonJokers, card, ...remainingJokers];

  // It must be at least as valid as it was before
  return isDifferentSuitGroup(newMeld, meld.length) || isEscala(newMeld, meld.length);
};

export const calculateHandPoints = (hand: Card[]): number => {
  return hand.reduce((total, card) => {
    if (card.suit === "JOKER" || card.value === 0) return total + 20;
    if (card.value === 1) return total + 15;
    if (card.value >= 11 && card.value <= 13) return total + 10;
    return total + card.value;
  }, 0);
};

export const getCardPoints = (card: Card): number => {
  if (card.suit === "JOKER" || card.value === 0) return 20;
  if (card.value === 1) return 15;
  if (card.value >= 11 && card.value <= 13) return 10;
  return card.value;
};
