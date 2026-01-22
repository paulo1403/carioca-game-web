import { Card } from "@/types/game";
import { isTrio, isEscala, validateContract, canAddToMeld, canStealJoker } from "@/utils/rules";

describe("Carioca Rule Validation: Failure Cases", () => {
    const createCard = (suit: string, value: number, id: string): Card => ({
        id,
        suit: suit as any,
        value,
        displayValue: String(value)
    });

    describe("isTrio Failure Cases", () => {
        test("Should reject trio with different values", () => {
            const group = [
                createCard("SPADE", 2, "1"),
                createCard("HEART", 2, "2"),
                createCard("CLUB", 3, "3"), // Different value
            ];
            expect(isTrio(group)).toBe(false);
        });

        test("Should reject trio with too many Jokers (needs 2 natural cards)", () => {
            const group = [
                createCard("SPADE", 10, "1"),
                createCard("JOKER", 0, "j1"),
                createCard("JOKER", 0, "j2"),
            ];
            // Rule implemented: nonJokers.length < 2 && cards.length >= 3 => false
            expect(isTrio(group, 3)).toBe(false);
        });
    });

    describe("isEscala Failure Cases", () => {
        test("Should reject escala with mixed suits", () => {
            const group = [
                createCard("SPADE", 4, "1"),
                createCard("HEART", 5, "2"), // Different suit
                createCard("SPADE", 6, "3"),
                createCard("SPADE", 7, "4"),
            ];
            expect(isEscala(group)).toBe(false);
        });

        test("Should reject escala with gaps and no Jokers", () => {
            const group = [
                createCard("CLUB", 4, "1"),
                createCard("CLUB", 5, "2"),
                createCard("CLUB", 7, "3"), // Gap at 6
                createCard("CLUB", 8, "4"),
            ];
            expect(isEscala(group)).toBe(false);
        });

        test("Should reject circular escala (K-A-2)", () => {
            const group = [
                createCard("DIAMOND", 13, "1"), // K
                createCard("DIAMOND", 1, "2"),  // A
                createCard("DIAMOND", 2, "3"),  // 2
                createCard("DIAMOND", 3, "4"),
            ];
            expect(isEscala(group, 4)).toBe(false);
        });
    });

    describe("validateContract Failure Cases", () => {
        test("Round 1 (1/3): Should reject if lowering 2 trios (Only main groups allowed)", () => {
            const trio1 = [createCard("SPADE", 2, "s2"), createCard("HEART", 2, "h2"), createCard("CLUB", 2, "c2")];
            const trio2 = [createCard("DIAMOND", 5, "d5"), createCard("HEART", 5, "h5"), createCard("CLUB", 5, "c5")];

            const result = validateContract([trio1, trio2], 1);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Solo puedes bajar exactamente");
        });

        test("Round 3 (1/4): Should reject if trio only has 3 cards", () => {
            const trioOf3 = [createCard("SPADE", 2, "s2"), createCard("HEART", 2, "h2"), createCard("CLUB", 2, "c2")];

            const result = validateContract([trioOf3], 3);
            expect(result.valid).toBe(false);
            expect(result.error).toContain("Falta: 1 trío(s) de 4+");
        });
    });

    describe("canAddToMeld Failure Cases", () => {
        test("Should reject adding a non-matching card to a trio", () => {
            const trio = [createCard("SPADE", 10, "1"), createCard("HEART", 10, "2"), createCard("CLUB", 10, "3")];
            const invalidCard = createCard("DIAMOND", 11, "4");
            expect(canAddToMeld(invalidCard, trio)).toBe(false);
        });
    });

    describe("canStealJoker Failure Cases", () => {
        test("Should reject stealing Joker if candidate card value doesn't match trio", () => {
            const trioWithJoker = [
                createCard("SPADE", 5, "1"),
                createCard("HEART", 5, "2"),
                createCard("JOKER", 0, "j1")
            ];
            const thiefCard = createCard("CLUB", 6, "3"); // Doesn't match 5
            expect(canStealJoker(thiefCard, trioWithJoker, [])).toBe(false);
        });

        test("Should reject stealing Joker from trio if there's only 1 natural card", () => {
            const trioWithTooManyJokers = [
                createCard("SPADE", 5, "1"),
                createCard("JOKER", 0, "j1"),
                createCard("JOKER", 0, "j2")
            ];
            const thiefCard = createCard("HEART", 5, "3");
            // Rule: Requires at least 2 natural cards in the meld to allow theft
            expect(canStealJoker(thiefCard, trioWithTooManyJokers, [])).toBe(false);
        });
    });
});
