import { getBuyExtrasCount, getBuyTotalCards } from "@/utils/buys";

describe("Buy extras rules", () => {
  test("current player gets 4 total cards", () => {
    expect(getBuyExtrasCount(true)).toBe(3);
    expect(getBuyTotalCards(true)).toBe(4);
  });

  test("non-current player gets 3 total cards", () => {
    expect(getBuyExtrasCount(false)).toBe(2);
    expect(getBuyTotalCards(false)).toBe(3);
  });

  test("current player total already includes mandatory draw", () => {
    const total = getBuyTotalCards(true);
    expect(total).toBe(4);
  });
});
