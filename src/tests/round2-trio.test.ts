import { Card } from "@/types/game";
import { findPotentialContractGroups, canDoInitialDown } from "@/utils/handAnalyzer";

const createCard = (suit: string, value: number, id: string): Card => ({
  id,
  suit: suit as any,
  value,
});

test("Round 2: K K Joker + J J J should allow initial down (2 trios)", () => {
  const hand = [
    createCard("SPADE", 13, "k1"),
    createCard("HEART", 13, "k2"),
    createCard("JOKER", 0, "jk"),

    createCard("SPADE", 11, "j1"),
    createCard("HEART", 11, "j2"),
    createCard("CLUB", 11, "j3"),
  ];

  const { trios } = findPotentialContractGroups(hand, 2);
  expect(trios.length).toBeGreaterThanOrEqual(2);

  const result = canDoInitialDown(hand, 2);
  expect(result.canDown).toBe(true);
});