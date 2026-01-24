import { getInitialDiscardPile } from "@/utils/gameSetup";

describe("Round start discard pile", () => {
  test("starts empty", () => {
    const discardPile = getInitialDiscardPile();
    expect(discardPile.length).toBe(0);
  });
});
