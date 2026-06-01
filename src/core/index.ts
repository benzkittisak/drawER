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

// SQL export
export { exportSql, getDialect, DIALECT_LABELS } from './sql/export';
export type { ExportOptions, Dialect } from './sql/export';

// import + other formats
export { importSql } from './sql/import/parse';
export type { ImportResult } from './sql/import/parse';
export { dbmlToDiagram } from './dbml/import';
export { diagramToDbml } from './dbml/export';
export { diagramToMermaid } from './mermaid/export';
export { diagramToMarkdown } from './markdown/export';
export { autoLayout } from './layout/autoLayout';

// JSON interchange (native save format)
export { serialize, serializeToString, parse } from './serialize/json';
export { CURRENT_VERSION, APP_TAG } from './serialize/schema';
export type { SavedDiagram } from './serialize/schema';
export { migrate } from './serialize/migrate';
