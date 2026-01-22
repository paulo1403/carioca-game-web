import { Card, ROUND_CONTRACTS, ROUND_CONTRACTS_DATA } from "@/types/game";

export const isTrio = (cards: Card[], minLength: number = 3): boolean => {
  if (cards.length < minLength) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  const jokers = cards.filter((c) => c.suit === "JOKER" || c.value === 0);

  if (nonJokers.length === 0) return true; // All Jokers

  // Check if all non-jokers have the same value
  const firstValue = nonJokers[0].value;
  // In Carioca, you can't have a Trio of different values unless they are Jokers.
  if (!nonJokers.every((c) => c.value === firstValue)) return false;

  // In Carioca, you usually need more natural cards than jokers in a trio? 
  // Standard rule: at least 2 natural cards for a trio of 3.
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

  // Linear check (Ace-Low: 1, 2, 3... or Ace-High: ...Q, K, A)
  // Try Ace as 1
  const isLinearSequence = (vals: number[], jokerCount: number) => {
    const range = vals[vals.length - 1] - vals[0] + 1;
    const gaps = range - vals.length;
    return gaps <= jokerCount;
  };

  // Standard Carioca: Ace can be Low (1) or High (after King - let's treat as 14)
  if (isLinearSequence(values, jokers.length)) return true;

  // If there's an Ace (1), try it as 14
  if (values.includes(1)) {
    const aceHighValues = values.map(v => v === 1 ? 14 : v).sort((a, b) => a - b);
    if (isLinearSequence(aceHighValues, jokers.length)) return true;
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

  // Carioca Rule: On the first "down", you should ONLY be able to lower
  // what the contract requires. No extra groups allowed yet.
  if (groups.length > (reqs.trios + reqs.escalas)) {
    return {
      valid: false,
      error: `Solo puedes bajar exactamente lo que pide el contrato (${reqs.trios} tríos y ${reqs.escalas} escalas).`
    };
  }

  let remainingGroups = [...groups];
  let requiredTrios = reqs.trios;
  let requiredEscalas = reqs.escalas;
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

  // 2. Fulfill Trios
  if (requiredTrios > 0) {
    for (let i = 0; i < remainingGroups.length; i++) {
      if (usedIndices.has(i)) continue;
      if (isTrio(remainingGroups[i], reqs.trioSize)) {
        requiredTrios--;
        usedIndices.add(i);
        if (requiredTrios === 0) break;
      }
    }
  }

  if (requiredTrios > 0 || requiredEscalas > 0) {
    const errorMsg = [];
    if (requiredTrios > 0) errorMsg.push(`${requiredTrios} trío(s) de ${reqs.trioSize}+`);
    if (requiredEscalas > 0) errorMsg.push(`${requiredEscalas} escala(s) de ${reqs.escalaSize}+`);
    return {
      valid: false,
      error: `No cumples el contrato. Falta: ${errorMsg.join(" y ")}.`,
    };
  }

  // Check if there are any unused groups (shouldn't happen with the length check above, but for safety)
  if (usedIndices.size !== groups.length) {
    return {
      valid: false,
      error: "Uno de los grupos enviados no es válido para cumplir el contrato."
    };
  }

  return { valid: true };
};

export const validateAdditionalDown = (
  groups: Card[][],
): { valid: boolean; error?: string } => {
  if (groups.length === 0) {
    return {
      valid: false,
      error: "Debes bajar al menos 1 grupo.",
    };
  }

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    // In Carioca, additional groups are usually at least 3 cards.
    if (group.length < 3) {
      return {
        valid: false,
        error: `El grupo ${i + 1} debe tener al menos 3 cartas.`,
      };
    }

    if (!isTrio(group, 3) && !isEscala(group, 3)) {
      return {
        valid: false,
        error: `El grupo ${i + 1} no es un Trío ni una Escala válida.`,
      };
    }
  }

  return { valid: true };
};

export const canAddToMeld = (card: Card, meld: Card[]): boolean => {
  // For any meld (including additional ones), check if adding the card maintains validity
  const newMeld = [...meld, card];

  // Check if it's a valid trio (minimum 3 cards)
  if (isTrio(newMeld, 3)) return true;

  // Check if it's a valid escala (minimum 3 cards)
  if (isEscala(newMeld, 3)) return true;

  return false;
};

export const canStealJoker = (
  card: Card,
  meld: Card[],
  hand: Card[],
): boolean => {
  // Check if meld has a joker
  const jokers = meld.filter((c) => c.suit === "JOKER" || c.value === 0);
  if (jokers.length === 0) return false;

  const nonJokers = meld.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  if (nonJokers.length === 0) return false;

  // For trios (all non-jokers have same value)
  const isTrioMeld = nonJokers.every((c) => c.value === nonJokers[0].value);

  if (isTrioMeld) {
    // REFINED RULE: Requires 2 natural cards already in the meld
    if (nonJokers.length < 2) return false;

    // Card must match the trio's value
    return card.value === nonJokers[0].value && card.suit !== "JOKER";
  } else {
    // For escalas: check if the card can fit in the sequence replacing ONE joker
    const remainingJokers = jokers.slice(1);
    const newMeld = [...nonJokers, card, ...remainingJokers];

    // Check if it forms a valid escala of the same original length
    return isEscala(newMeld, meld.length);
  }
};

/**
 * Calcula los puntos de las cartas restantes en la mano de un jugador al final de una ronda
 * Reglas de puntuación:
 * - Figuras (K, Q, J): 10 puntos cada una
 * - Ases (A): 15 puntos cada uno
 * - Joker: 20 puntos cada uno
 * - El resto de cartas: su propio valor numérico
 */
export const calculateHandPoints = (hand: Card[]): number => {
  return hand.reduce((total, card) => {
    // Joker
    if (card.suit === "JOKER" || card.value === 0) {
      return total + 20;
    }

    // Ases (A)
    if (card.value === 1) {
      return total + 15;
    }

    // Figuras (J, Q, K)
    if (card.value >= 11 && card.value <= 13) {
      return total + 10;
    }

    // Resto de cartas: su propio valor numérico
    return total + card.value;
  }, 0);
};

/**
 * Calcula los puntos de una carta individual según las reglas de Carioca
 */
export const getCardPoints = (card: Card): number => {
  // Joker
  if (card.suit === "JOKER" || card.value === 0) {
    return 20;
  }

  // Ases (A)
  if (card.value === 1) {
    return 15;
  }

  // Figuras (J, Q, K)
  if (card.value >= 11 && card.value <= 13) {
    return 10;
  }

  // Resto de cartas: su propio valor numérico
  return card.value;
};
