import { applyRemainingBuysPenalty, getBuyPenalty, getRemainingBuys, MAX_BUYS } from "@/utils/buys";

describe("Buys penalty and remaining buys", () => {
  test("returns remaining buys within bounds", () => {
    expect(getRemainingBuys(0)).toBe(MAX_BUYS);
    expect(getRemainingBuys(3)).toBe(MAX_BUYS - 3);
    expect(getRemainingBuys(MAX_BUYS)).toBe(0);
    expect(getRemainingBuys(MAX_BUYS + 2)).toBe(0);
  });

  test("applies penalty only when remaining buys exist", () => {
    expect(getBuyPenalty(0)).toBe(10);
    expect(getBuyPenalty(MAX_BUYS - 1)).toBe(10);
    expect(getBuyPenalty(MAX_BUYS)).toBe(0);
  });

  test("adjusts final score with penalty", () => {
    expect(applyRemainingBuysPenalty(50, 0)).toBe(40);
    expect(applyRemainingBuysPenalty(50, MAX_BUYS)).toBe(50);
  });
});
