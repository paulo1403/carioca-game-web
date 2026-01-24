import { getNextTurnIndex } from "@/utils/turn";

describe("getNextTurnIndex", () => {
  test("advances clockwise", () => {
    expect(getNextTurnIndex("clockwise", 0, 4)).toBe(1);
    expect(getNextTurnIndex("clockwise", 3, 4)).toBe(0);
  });

  test("advances counter-clockwise", () => {
    expect(getNextTurnIndex("counter-clockwise", 0, 4)).toBe(3);
    expect(getNextTurnIndex("counter-clockwise", 2, 4)).toBe(1);
  });
});
