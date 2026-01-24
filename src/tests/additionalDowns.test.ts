import { Card } from "@/types/game";
import { canDoAdditionalDown } from "@/utils/handAnalyzer";

const createCard = (suit: string, value: number, id: string): Card => ({
  id,
  suit: suit as any,
  value,
});

describe("Additional down detection", () => {
  test("Detects trio with 2 naturals + Joker as valid additional down", () => {
    // Simulate a hand where player already melded and has 4,4,Joker
    const hand = [
      createCard("HEART", 4, "c1"),
      createCard("DIAMOND", 4, "c2"),
      createCard("JOKER", 0, "j1"),
    ];

    const res = canDoAdditionalDown(hand, 2);
    expect(res.canDown).toBe(true);
    expect(res.groups.length).toBeGreaterThan(0);
    // group should include the joker (or at least be a trio of value 4)
    const group = res.groups[0];
    const values = group.map(c => c.value).sort((a, b) => a - b);
    expect(values.filter(v => v === 4).length).toBeGreaterThanOrEqual(2);
  });
});