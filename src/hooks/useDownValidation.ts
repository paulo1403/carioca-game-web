import { Card } from "@/types/game";
import { validateContract, validateAdditionalDown } from "@/utils/rules";

export interface DownValidationResult {
  isValid: boolean;
  error?: string;
  canConfirm: boolean;
  handWarning?: string;
}

export const useDownValidation = () => {
  const validateDown = (
    groups: Card[][],
    currentRound: number,
    alreadyMelded: boolean,
    handSize: number,
    totalCards: number,
  ): DownValidationResult => {
    // Check if hand will be empty after melding
    const cardsRemaining = handSize - totalCards;
    if (cardsRemaining <= 0) {
      return {
        isValid: false,
        error: "Debes dejar al menos 1 carta en la mano",
        canConfirm: false,
      };
    }

    // Validate contract rules
    const validation = alreadyMelded
      ? validateAdditionalDown(groups)
      : validateContract(groups, currentRound);

    if (!validation.valid) {
      return {
        isValid: false,
        error: validation.error,
        canConfirm: false,
      };
    }

    return {
      isValid: true,
      error: undefined,
      canConfirm: true,
      handWarning:
        cardsRemaining === 1
          ? "Cuidado: Te quedará solo 1 carta después de bajar"
          : undefined,
    };
  };

  return { validateDown };
};
