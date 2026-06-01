/**
 * ID generation. Kept out of the pure model factories (which take ids as params for
 * deterministic tests); app code uses newId() when creating entities at runtime.
 */
export const newId = (): string => crypto.randomUUID();
