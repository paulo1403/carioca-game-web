import { Card, ROUND_CONTRACTS } from "@/types/game";

export const isTrio = (cards: Card[], minLength: number = 3): boolean => {
  if (cards.length < minLength) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  if (nonJokers.length === 0) return true; // All Jokers
  const firstValue = nonJokers[0].value;
  return nonJokers.every((c) => c.value === firstValue);
};

export const isEscala = (cards: Card[], minLength: number = 4): boolean => {
  if (cards.length < minLength) return false;

  const nonJokers = cards.filter((c) => c.suit !== "JOKER" && c.value !== 0);
  if (nonJokers.length === 0) return true; // All Jokers

  // Check suit (all non-jokers must be same suit)
  const firstSuit = nonJokers[0].suit;
  if (!nonJokers.every((c) => c.suit === firstSuit)) return false;

  // Sort by value
  const sorted = [...nonJokers].sort((a, b) => a.value - b.value);
  const values = sorted.map((c) => c.value);

  // Check for duplicates (cannot have same card twice in a sequence)
  if (new Set(values).size !== values.length) return false;

  // Check gaps
  let gaps = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = sorted[i + 1].value - sorted[i].value;
    gaps += diff - 1;
  }

  const jokersCount = cards.length - nonJokers.length;
  return gaps <= jokersCount;
};

export const validateContract = (
  groups: Card[][],
  round: number
): { valid: boolean; error?: string } => {
  // Round 1: At least 1 group of 3+ cards of same value
  if (round === 1) {
    if (groups.length < 1)
      return {
        valid: false,
        error: "Debes bajar al menos 1 grupo de 3+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 3)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 3 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 2: At least 2 groups of 3+ cards of same value
  if (round === 2) {
    if (groups.length < 2)
      return {
        valid: false,
        error: "Debes bajar al menos 2 grupos de 3+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 3)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 3 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 3: At least 1 group of 4+ cards of same value
  if (round === 3) {
    if (groups.length < 1)
      return {
        valid: false,
        error: "Debes bajar al menos 1 grupo de 4+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 4)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 4 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 4: At least 2 groups of 4+ cards of same value
  if (round === 4) {
    if (groups.length < 2)
      return {
        valid: false,
        error: "Debes bajar al menos 2 grupos de 4+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 4)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 4 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 5: At least 1 group of 5+ cards of same value
  if (round === 5) {
    if (groups.length < 1)
      return {
        valid: false,
        error: "Debes bajar al menos 1 grupo de 5+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 5)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 5 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 6: At least 2 groups of 5+ cards of same value
  if (round === 6) {
    if (groups.length < 2)
      return {
        valid: false,
        error: "Debes bajar al menos 2 grupos de 5+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 5)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 5 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 7: At least 1 group of 6+ cards of same value
  if (round === 7) {
    if (groups.length < 1)
      return {
        valid: false,
        error: "Debes bajar al menos 1 grupo de 6+ cartas del mismo valor.",
      };
    if (!groups.every((g) => isTrio(g, 6)))
      return {
        valid: false,
        error:
          "Todos los grupos deben tener al menos 6 cartas del mismo valor.",
      };
    return { valid: true };
  }

  // Round 8: At least 1 group of 7 cards in a straight
  if (round === 8) {
    if (groups.length < 1)
      return {
        valid: false,
        error: "Debes bajar al menos 1 escalera de 7 cartas.",
      };
    if (!groups.every((g) => isEscala(g, 7)))
      return {
        valid: false,
        error:
          "Todos los grupos deben ser escaleras válidas de al menos 7 cartas.",
      };
    return { valid: true };
  }

  return { valid: false, error: "Ronda desconocida o contrato no válido." };
};

export const validateAdditionalDown = (
  groups: Card[][]
): { valid: boolean; error?: string } => {
  if (groups.length === 0) {
    return {
      valid: false,
      error: "Debes bajar al menos 1 grupo.",
    };
  }

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    if (group.length < 3) {
      return {
        valid: false,
        error: `El grupo ${i + 1} debe tener al menos 3 cartas.`,
      };
    }

    const isValidTrio = isTrio(group, 3);
    const isValidEscala = isEscala(group, 3);

    if (!isValidTrio && !isValidEscala) {
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
  hand: Card[]
): boolean => {
  // Check if meld has a joker
  if (!meld.some((c) => c.suit === "JOKER" || c.value === 0)) return false;

  const meldLength = meld.length;
  const nonJokers = meld.filter((c) => c.suit !== "JOKER" && c.value !== 0);

  // For trios (all non-jokers have same value)
  const isTrioMeld =
    nonJokers.length > 0 &&
    nonJokers.every((c) => c.value === nonJokers[0].value);

  if (isTrioMeld) {
    if (nonJokers.length > 0) {
      const value = nonJokers[0].value;
      // To steal a joker from a trio, you need (meldLength - 1) cards of that value
      // Example: (5, 5, Joker) = 3 cards total, need 2 fives to steal the joker
      // Result: (5, 5, 5, 5) = valid trio with 4 cards
      if (card.value === value) {
        // Correct Rule: You only need 1 matching card to replace the Joker in a Trio
        // The previous logic (meldLength - 1) was incorrect for Carioca.
        const neededCount = 1;
        const matchingCardsInHand = hand.filter(
          (c) => c.value === value && c.suit !== "JOKER"
        ).length;
        // We need at least 1 card (the one we are dragging/selecting is usually in hand)
        return matchingCardsInHand >= neededCount;
      }
    }
  } else {
    // For escalas: check if the card can fit in the sequence
    const newMeld = meld
      .filter((c) => c.suit !== "JOKER" && c.value !== 0)
      .concat(card);
    return isEscala(newMeld, 3);
  }

  return false;
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
