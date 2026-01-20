import Joi from 'joi';

// Schema para creación de partida
export const createGameSchema = Joi.object({
    creatorName: Joi.string().min(2).max(50).required(),
    difficulty: Joi.string().valid('EASY', 'MEDIUM', 'HARD').optional(),
});

// Schema para unirse a partida
export const joinGameSchema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
});

// Schema para movimientos del juego
export const moveSchema = Joi.object({
    playerId: Joi.string().required(),
    action: Joi.string().valid(
        'DRAW_DECK',
        'DRAW_DISCARD',
        'DOWN',
        'ADD_TO_MELD',
        'STEAL_JOKER',
        'DISCARD',
        'INTEND_BUY',
        'INTEND_DRAW_DISCARD',
        'READY_FOR_NEXT_ROUND',
        'START_NEXT_ROUND'
    ).required(),
    payload: Joi.object().default({}),
});

// Middleware de validación para API Routes (compatible con Next.js App Router)
export async function validateRequest(schema: Joi.ObjectSchema, data: any) {
    try {
        const value = await schema.validateAsync(data, {
            abortEarly: false,
            stripUnknown: true,
        });
        return { value, error: null };
    } catch (err: any) {
        const details = err.details.map((d: any) => ({
            message: d.message,
            path: d.path,
        }));
        return { value: null, error: details };
    }
}
