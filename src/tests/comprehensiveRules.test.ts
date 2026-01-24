import { Card, ROUND_CONTRACTS_DATA } from "@/types/game";
import {
    isTrio,
    isEscala,
    canStealJoker,
    calculateHandPoints,
    getCardPoints,
    canAddToMeld
} from "@/utils/rules";

describe("Carioca Comprehensive Rules Verification", () => {
    const createCard = (suit: string, value: number, id: string): Card => ({
        id,
        suit: suit as any,
        value,
        displayValue: String(value)
    });

    describe("Trio Groups (Rondas 1-7)", () => {
        test("Should allow 3 cards with same value (suits may repeat)", () => {
            const group = [
                createCard("SPADE", 5, "1"),
                createCard("HEART", 5, "2"),
                createCard("SPADE", 5, "3"), // Duplicate Spade is OK under new rules
            ];
            expect(isTrio(group, 3)).toBe(true);
        });

        test("Should reject if values are different", () => {
            const group = [
                createCard("SPADE", 2, "1"),
                createCard("HEART", 2, "2"),
                createCard("CLUB", 3, "3"), // Different value
            ];
            expect(isTrio(group, 3)).toBe(false);
        });

        test("Round 5 (Size 5): Should require enough natural cards and Jokers", () => {
            const group = [
                createCard("SPADE", 2, "1"),
                createCard("HEART", 2, "2"),
                createCard("CLUB", 2, "3"),
                createCard("DIAMOND", 2, "4"),
                createCard("JOKER", 0, "j1"),
            ];
            expect(isTrio(group, 5)).toBe(true);
        });
    });

    describe("Escalas (Ronda 8)", () => {
        test("Should allow Ace-High (Q-K-A)", () => {
            const group = [
                createCard("SPADE", 12, "Q"),
                createCard("SPADE", 13, "K"),
                createCard("SPADE", 1, "A"),
            ];
            expect(isEscala(group, 3)).toBe(true);
        });

        test("Should allow Ace-Low (A-2-3)", () => {
            const group = [
                createCard("HEART", 1, "A"),
                createCard("HEART", 2, "2"),
                createCard("HEART", 3, "3"),
            ];
            expect(isEscala(group, 3)).toBe(true);
        });

        test("Should reject non-consecutive cards", () => {
            const group = [
                createCard("CLUB", 2, "2"),
                createCard("CLUB", 3, "3"),
                createCard("CLUB", 5, "5"), // Missing 4
            ];
            expect(isEscala(group, 3)).toBe(false);
        });

        test("Should allow circular escala (Q-K-A-2-3) as they wrap around", () => {
            const group = [
                createCard("SPADE", 12, "Q"),
                createCard("SPADE", 13, "K"),
                createCard("SPADE", 1, "A"),
                createCard("SPADE", 2, "2"),
                createCard("SPADE", 3, "3"),
            ];
            expect(isEscala(group, 5)).toBe(true);
        });
    });

    describe("Joker Stealing Logic", () => {
        test("In Group: Can only steal if the new suit is unique", () => {
            const meld = [
                createCard("SPADE", 10, "1"),
                createCard("HEART", 10, "2"),
                createCard("JOKER", 0, "j1"), // Joker is representing CLUB or DIAMOND
            ];
            const clubCard = createCard("CLUB", 10, "3");
            const spadeCard = createCard("SPADE", 10, "4");

            expect(canStealJoker(clubCard, meld, [])).toBe(true);
            expect(canStealJoker(spadeCard, meld, [])).toBe(false); // Already has Spade
        });

        test("In Escala: Can only steal if value and suit match exactly", () => {
            const meld = [
                createCard("DIAMOND", 4, "4"),
                createCard("JOKER", 0, "j1"), // Should be DIAMOND 5
                createCard("DIAMOND", 6, "6"),
            ];
            const correctCard = createCard("DIAMOND", 5, "5");
            const wrongCard = createCard("HEART", 5, "h5");

            expect(canStealJoker(correctCard, meld, [])).toBe(true);
            expect(canStealJoker(wrongCard, meld, [])).toBe(false); // Wrong suit
        });
    });

    describe("Scoring and Points", () => {
        test("Aces should be 15 points", () => {
            expect(getCardPoints(createCard("SPADE", 1, "A"))).toBe(15);
        });

        test("Jokers should be 20 points", () => {
            expect(getCardPoints(createCard("JOKER", 0, "J"))).toBe(20);
        });

        test("Figures (K, Q, J) should be 10 points", () => {
            expect(getCardPoints(createCard("HEART", 11, "J"))).toBe(10);
            expect(getCardPoints(createCard("HEART", 12, "Q"))).toBe(10);
            expect(getCardPoints(createCard("HEART", 13, "K"))).toBe(10);
        });

        test("Calculate total hand points accurately", () => {
            const hand = [
                createCard("SPADE", 1, "A"), // 15
                createCard("JOKER", 0, "J"), // 20
                createCard("CLUB", 13, "K"), // 10
                createCard("DIAMOND", 2, "2"), // 2
            ];
            expect(calculateHandPoints(hand)).toBe(47);
        });
    });
});
