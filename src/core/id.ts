/**
 * ID generation. Kept out of the pure model factories (which take ids as params for
 * deterministic tests); app code uses newId() when creating entities at runtime.
 */
const uuidFallback = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export const newId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : uuidFallback();
