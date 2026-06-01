/**
 * @core public API — the only surface other modules should import from.
 * Keep this curated; internal helpers stay unexported.
 */
export * from './model/types';
export * from './model/factory';
export { validateDiagram, isDiagram } from './model/guards';
export { CATALOGS, TYPE_KEYS, typeDef } from './catalog';
export type { TypeDef, TypeCatalog, TypeCategory } from './catalog';
export { newId } from './id';
