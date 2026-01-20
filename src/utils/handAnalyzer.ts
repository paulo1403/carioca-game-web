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
export const isValidEscala = (cards: Card[], minLength: number = 4): boolean => {
  if (cards.length < minLength) return false;
  if (cards.length > 13) return false;

  const nonJokers = cards.filter((c) => !isJoker(c));
  if (nonJokers.length === 0) return true; // All Jokers

  const targetSuit = nonJokers[0].suit;
  if (nonJokers.some((c) => c.suit !== targetSuit)) return false;

  // Check for duplicates
  const values = nonJokers.map((c) => c.value);
  if (new Set(values).size !== values.length) return false;

  if (nonJokers.length === 1) return true;

  // Circular straight logic
  const sorted = [...values].sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 0; i < sorted.length; i++) {
    let gap;
    if (i === sorted.length - 1) {
      gap = (sorted[0] + 13) - sorted[i];
    } else {
      gap = sorted[i + 1] - sorted[i];
    }
    if (gap > maxGap) maxGap = gap;
  }

  return (13 - maxGap + 1) <= cards.length;
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
  round: number,
  alreadyMelded: boolean = false
): { canDown: boolean; groups: Card[][] } => {
  if (alreadyMelded) {
    return canAdditionalDown(hand);
  }

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
    Object.entries(bySuit).forEach(([suit, suitCards]) => {
      const valuesInSuit = new Map<number, Card>();
      suitCards.forEach(c => valuesInSuit.set(c.value, c));

      // Try all 13 starting positions
      for (let s = 1; s <= 13; s++) {
        const currentGroup: Card[] = [];
        let jokersNeeded = 0;
        const tempUsedIds = new Set<string>();

        for (let i = 0; i < 13; i++) {
          const val = ((s + i - 1) % 13) + 1;
          const card = valuesInSuit.get(val);

          if (card && !usedCardIds.has(card.id)) {
            currentGroup.push(card);
            tempUsedIds.add(card.id);
          } else if (availableJokers - jokersNeeded > 0) {
            jokersNeeded++;
            // We use a placeholder joker for now
            currentGroup.push({ id: `TEMP-JOKER-${jokersNeeded}`, suit: 'JOKER', value: 0, displayValue: 'Joker' });
          } else {
            break;
          }

          if (currentGroup.length >= targetSize) {
            // Found a valid straight!
            // Realize this straight (use real jokers)
            const realizedGroup: Card[] = [];
            let jIndex = jokers.length - availableJokers;

            for (const c of currentGroup) {
              if (c.suit === 'JOKER') {
                const realJoker = jokers[jokers.length - availableJokers];
                realizedGroup.push(realJoker);
                usedCardIds.add(realJoker.id);
                availableJokers--;
              } else {
                realizedGroup.push(c);
                usedCardIds.add(c.id);
              }
            }
            res.push(realizedGroup);

            // Re-map suit cards to remove used ones for this suit
            suitCards = suitCards.filter(c => !usedCardIds.has(c.id));
            valuesInSuit.clear();
            suitCards.forEach(c => valuesInSuit.set(c.value, c));

            // Move to next possible straight starting further ahead
            s = (s + i); // Skip current segment
            break;
          }
        }
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
  alreadyMelded: boolean = false
): Card[] => {
  const { trios, escalas } = alreadyMelded
    ? findAllValidGroups(hand)
    : findPotentialContractGroups(hand, round);

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

  Object.entries(bySuit).forEach(([suit, suitCards]) => {
    const valuesInSuit = new Map<number, Card>();
    suitCards.forEach(c => valuesInSuit.set(c.value, c));

    // Try all 13 starting positions
    for (let s = 1; s <= 13; s++) {
      let currentGroup: Card[] = [];
      let jokersNeeded = 0;

      for (let i = 0; i < 13; i++) {
        const val = ((s + i - 1) % 13) + 1;
        const card = valuesInSuit.get(val);

        if (card && !usedCardIds.has(card.id)) {
          currentGroup.push(card);
        } else if (availableJokers - jokersNeeded > 0) {
          jokersNeeded++;
          currentGroup.push({ id: `TEMP-JOKER-${jokersNeeded}`, suit: 'JOKER', value: 0, displayValue: 'Joker' });
        } else {
          break;
        }

        // For additional groups, we need at least 3 cards
        if (currentGroup.length >= 3) {
          // If we found a valid one, let's see if we can make it longer
          // but for find all valid groups, we can just take the current one and mark as used
          // or ideally take the longest possible. 
          // Let's peek ahead to see if next card is also available
          const nextVal = ((s + currentGroup.length - 1) % 13) + 1;
          const nextCard = valuesInSuit.get(nextVal);
          if (nextCard && !usedCardIds.has(nextCard.id)) continue;
          if (availableJokers - jokersNeeded > 0 && currentGroup.length < 13) continue;

          // Realize the group
          const realizedGroup: Card[] = [];
          for (const c of currentGroup) {
            if (c.suit === 'JOKER') {
              const realJoker = jokers[jokers.length - availableJokers];
              realizedGroup.push(realJoker);
              usedCardIds.add(realJoker.id);
              availableJokers--;
            } else {
              realizedGroup.push(c);
              usedCardIds.add(c.id);
            }
          }
          foundEscalas.push(realizedGroup);

          // Move s forward
          s = (s + currentGroup.length - 1);
          break;
        }
      }
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
