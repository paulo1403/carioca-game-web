import { Card, ROUND_CONTRACTS } from "@/types/game";

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

// Check if a set of cards is a valid Trio (3+ cards of same value)
export const isValidTrio = (cards: Card[]): boolean => {
  if (cards.length < 3) return false;
  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return true;

  const targetValue = nonJokers[0].value;
  return nonJokers.every((c) => c.value === targetValue);
};

// Check if a set of cards is a valid Escala (4+ cards of same suit in sequence)
export const isValidEscala = (cards: Card[]): boolean => {
  if (cards.length < 4) return false;
  const nonJokers = cards.filter((c) => !isJoker(c));
  const jokersCount = cards.length - nonJokers.length;

  if (nonJokers.length === 0) return true;

  const targetSuit = nonJokers[0].suit;
  if (nonJokers.some((c) => c.suit !== targetSuit)) return false;

  // Sort by value
  const sorted = [...nonJokers].sort((a, b) => a.value - b.value);

  // Check gaps
  let gaps = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const diff = sorted[i + 1].value - sorted[i].value;
    if (diff === 0) return false; // Duplicate cards not allowed in straight
    gaps += diff - 1;
  }

  return gaps <= jokersCount;
};

// --- Auto Grouping Logic ---

export const getContractRequirements = (round: number) => {
  const reqs: Record<
    number,
    { trios: number; escalas: number; trioSize: number; escalaSize: number }
  > = {
    1: { trios: 1, escalas: 0, trioSize: 3, escalaSize: 0 },
    2: { trios: 2, escalas: 0, trioSize: 3, escalaSize: 0 },
    3: { trios: 1, escalas: 0, trioSize: 4, escalaSize: 0 },
    4: { trios: 2, escalas: 0, trioSize: 4, escalaSize: 0 },
    5: { trios: 1, escalas: 0, trioSize: 5, escalaSize: 0 },
    6: { trios: 2, escalas: 0, trioSize: 5, escalaSize: 0 },
    7: { trios: 1, escalas: 0, trioSize: 6, escalaSize: 0 },
    8: { trios: 0, escalas: 1, trioSize: 0, escalaSize: 7 },
  };
  return reqs[round] || { trios: 0, escalas: 0, trioSize: 0, escalaSize: 0 };
};

// Find all potential groups in a hand
export const findGroupsInHand = (
  hand: Card[]
): { trios: Card[][]; escalas: Card[][] } => {
  const trios: Card[][] = [];
  const escalas: Card[][] = [];
  const jokers = hand.filter(isJoker);
  const nonJokers = hand.filter((c) => !isJoker(c));

  // Find Trios
  const byValue: Record<number, Card[]> = {};
  nonJokers.forEach((c) => {
    if (!byValue[c.value]) byValue[c.value] = [];
    byValue[c.value].push(c);
  });

  Object.values(byValue).forEach((group) => {
    if (group.length >= 3) {
      trios.push(group);
    } else if (group.length === 2 && jokers.length >= 1) {
      trios.push([...group, jokers[0]]);
    }
  });

  // Find Escalas
  const bySuit: Record<string, Card[]> = {};
  nonJokers.forEach((c) => {
    if (!bySuit[c.suit]) bySuit[c.suit] = [];
    bySuit[c.suit].push(c);
  });

  Object.values(bySuit).forEach((suitCards) => {
    suitCards.sort((a, b) => a.value - b.value);

    let currentRun: Card[] = [suitCards[0]];
    for (let i = 1; i < suitCards.length; i++) {
      const prev = currentRun[currentRun.length - 1];
      const curr = suitCards[i];
      const diff = curr.value - prev.value;

      if (diff === 1) {
        currentRun.push(curr);
      } else if (diff === 2 && jokers.length > 0) {
        if (currentRun.length >= 3) {
          escalas.push([...currentRun]);
        } else if (currentRun.length >= 4) {
          escalas.push([...currentRun]);
        }
        currentRun = [curr];
      } else {
        if (currentRun.length >= 3) {
          escalas.push([...currentRun]);
        }
        currentRun = [curr];
      }
    }
    if (currentRun.length >= 3) {
      escalas.push([...currentRun]);
    }
  });

  return { trios, escalas };
};

export const checkDiscardHint = (
  discardCard: Card | undefined,
  hand: Card[],
  currentRound: number
): boolean => {
  if (!discardCard) return false;
  const combined = [...hand, discardCard];

  // Check if with this new card we can fulfill the contract
  const { canDown } = canFulfillContract(combined, currentRound);

  // Also simple check: does it complete a Trio or Escala even if not full contract?
  // Only if we need them.
  const reqs = getContractRequirements(currentRound);
  const { trios, escalas } = findPotentialContractGroups(
    combined,
    currentRound
  );

  // If this card helps complete a group we NEED, it's useful.
  // Check if discardCard is in any of the found valid groups
  const inTrio = trios.some((g) => g.some((c) => c.id === discardCard.id));
  const inEscala = escalas.some((g) => g.some((c) => c.id === discardCard.id));

  // Prioritize based on needs
  if (reqs.trios > 0 && inTrio) return true;
  if (reqs.escalas > 0 && inEscala) return true;

  // If we can go down with it, definitely yes
  if (canDown) return true;

  return false;
};

// Check if hand can fulfill contract
export const canFulfillContract = (
  hand: Card[],
  round: number
): { canDown: boolean; groups: Card[][] } => {
  const reqs = getContractRequirements(round);

  if (round === 8) {
    // Round 8: At least 1 Escalera of 7+
    const { escalas } = findPotentialContractGroups(hand, round);
    const hasEscala7 = escalas.some((e) => e.length >= 7);
    return {
      canDown: hasEscala7,
      groups: hasEscala7
        ? escalas.filter((e) => e.length >= 7).slice(0, 1)
        : [],
    };
  }

  const { trios, escalas } = findPotentialContractGroups(hand, round);

  // Filter groups by minimum size requirements
  const validTrios = trios.filter((t) => t.length >= reqs.trioSize);
  const validEscalas = escalas.filter((e) => e.length >= reqs.escalaSize);

  // Check if we have at least the required number of groups
  if (validTrios.length >= reqs.trios && validEscalas.length >= reqs.escalas) {
    return {
      canDown: true,
      groups: [
        ...validTrios.slice(0, reqs.trios), // Take at least the required count
        ...validEscalas.slice(0, reqs.escalas),
      ],
    };
  }

  return { canDown: false, groups: [] };
};

export const findPotentialContractGroups = (
  hand: Card[],
  round: number
): { trios: Card[][]; escalas: Card[][] } => {
  const reqs = getContractRequirements(round);
  const usedCardIds = new Set<string>();
  const jokers = hand.filter(isJoker);
  let availableJokers = jokers.length;
  const nonJokers = hand.filter((c) => !isJoker(c));

  let foundTrios: Card[][] = [];
  let foundEscalas: Card[][] = [];

  const findTrios = (targetSize: number) => {
    const byValue: Record<number, Card[]> = {};
    nonJokers.forEach((c) => {
      if (usedCardIds.has(c.id)) return;
      if (!byValue[c.value]) byValue[c.value] = [];
      byValue[c.value].push(c);
    });

    const res: Card[][] = [];
    Object.values(byValue).forEach((group) => {
      if (group.length >= targetSize) {
        res.push(group);
        group.forEach((c) => usedCardIds.add(c.id));
      } else if (group.length === targetSize - 1 && availableJokers > 0) {
        availableJokers--;
        const joker = jokers[availableJokers];
        res.push([...group, joker]);
        group.forEach((c) => usedCardIds.add(c.id));
        usedCardIds.add(joker.id);
      }
    });
    return res;
  };

  const findEscalas = (targetSize: number) => {
    const bySuit: Record<string, Card[]> = {};
    nonJokers.forEach((c) => {
      if (usedCardIds.has(c.id)) return;
      if (!bySuit[c.suit]) bySuit[c.suit] = [];
      bySuit[c.suit].push(c);
    });

    const res: Card[][] = [];
    Object.values(bySuit).forEach((suitCards) => {
      suitCards.sort((a, b) => a.value - b.value);
      let currentRun: Card[] = [suitCards[0]];
      for (let i = 1; i < suitCards.length; i++) {
        const prev = currentRun[currentRun.length - 1];
        const curr = suitCards[i];
        if (curr.value === prev.value + 1) {
          currentRun.push(curr);
        } else {
          if (currentRun.length >= targetSize) {
            res.push([...currentRun]);
            currentRun.forEach((c) => usedCardIds.add(c.id));
          } else if (
            currentRun.length === targetSize - 1 &&
            availableJokers > 0
          ) {
            availableJokers--;
            const joker = jokers[availableJokers];
            currentRun.push(joker);
            res.push([...currentRun]);
            currentRun.forEach((c) => usedCardIds.add(c.id));
            usedCardIds.add(joker.id);
          }
          currentRun = [curr];
        }
      }
      if (currentRun.length >= targetSize) {
        res.push([...currentRun]);
        currentRun.forEach((c) => usedCardIds.add(c.id));
      } else if (
        currentRun.length === targetSize - 1 &&
        availableJokers > 0 &&
        !usedCardIds.has(currentRun[0].id)
      ) {
        availableJokers--;
        const joker = jokers[availableJokers];
        currentRun.push(joker);
        res.push([...currentRun]);
        currentRun.forEach((c) => usedCardIds.add(c.id));
        usedCardIds.add(joker.id);
      }
    });
    return res;
  };

  // Find groups based on round requirements
  if (reqs.trios > 0) {
    foundTrios = findTrios(reqs.trioSize);
  }
  if (reqs.escalas > 0) {
    foundEscalas = findEscalas(reqs.escalaSize);
  }

  return { trios: foundTrios, escalas: foundEscalas };
};

export const organizeHandAuto = (
  hand: Card[],
  round: number,
  returnGroups = false
): Card[] => {
  const { trios, escalas } = findPotentialContractGroups(hand, round);

  const organized: Card[] = [];
  const usedIds = new Set<string>();

  trios.forEach((g) => {
    organized.push(...g);
    g.forEach((c) => usedIds.add(c.id));
  });
  escalas.forEach((g) => {
    organized.push(...g);
    g.forEach((c) => usedIds.add(c.id));
  });

  hand.forEach((c) => {
    if (!usedIds.has(c.id)) organized.push(c);
  });

  return organized;
};

// Suggest a card to discard: prefer cards not in potential groups, then highest value
// Find all possible valid groups (for additional downs)
export const findAllValidGroups = (
  hand: Card[]
): { trios: Card[][]; escalas: Card[][] } => {
  const usedCardIds = new Set<string>();
  const jokers = hand.filter(isJoker);
  let availableJokers = jokers.length;
  const nonJokers = hand.filter((c) => !isJoker(c));

  let foundTrios: Card[][] = [];
  let foundEscalas: Card[][] = [];

  // Find all possible trios (3 or more cards of same value)
  const byValue: Record<number, Card[]> = {};
  nonJokers.forEach((c) => {
    if (usedCardIds.has(c.id)) return;
    if (!byValue[c.value]) byValue[c.value] = [];
    byValue[c.value].push(c);
  });

  Object.values(byValue).forEach((group) => {
    if (group.length >= 3) {
      foundTrios.push(group);
      group.forEach((c) => usedCardIds.add(c.id));
    } else if (group.length === 2 && availableJokers > 0) {
      availableJokers--;
      const joker = jokers[availableJokers];
      foundTrios.push([...group, joker]);
      group.forEach((c) => usedCardIds.add(c.id));
      usedCardIds.add(joker.id);
    }
  });

  // Find all possible escalas (3 or more cards in sequence of same suit)
  const bySuit: Record<string, Card[]> = {};
  nonJokers.forEach((c) => {
    if (usedCardIds.has(c.id)) return;
    if (!bySuit[c.suit]) bySuit[c.suit] = [];
    bySuit[c.suit].push(c);
  });

  Object.values(bySuit).forEach((suitCards) => {
    suitCards.sort((a, b) => a.value - b.value);
    let currentRun: Card[] = [suitCards[0]];
    for (let i = 1; i < suitCards.length; i++) {
      const prev = currentRun[currentRun.length - 1];
      const curr = suitCards[i];
      if (curr.value === prev.value + 1) {
        currentRun.push(curr);
      } else {
        if (currentRun.length >= 3) {
          foundEscalas.push([...currentRun]);
          currentRun.forEach((c) => usedCardIds.add(c.id));
        }
        currentRun = [curr];
      }
    }
    if (currentRun.length >= 3) {
      foundEscalas.push([...currentRun]);
      currentRun.forEach((c) => usedCardIds.add(c.id));
    }
  });

  return { trios: foundTrios, escalas: foundEscalas };
};

export const canAdditionalDown = (
  hand: Card[]
): { canDown: boolean; groups: Card[][] } => {
  const { trios, escalas } = findAllValidGroups(hand);

  // For additional downs, we need at least one valid group (trio or escala of 3+ cards)
  const validGroups = [
    ...trios.filter((t) => t.length >= 3),
    ...escalas.filter((e) => e.length >= 3),
  ];

  return {
    canDown: validGroups.length > 0,
    groups: validGroups,
  };
};
