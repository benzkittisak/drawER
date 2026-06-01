/**
 * Encode a plain Diagram as a Yjs state update (for server upload without opening a room).
 */
import * as Y from 'yjs';
import type { Diagram } from '@core';
import { createDoc } from './ydoc';
import { writeDiagram } from './schema';

export function encodeDiagramState(diagram: Diagram): Uint8Array {
  const { doc, maps } = createDoc();
  writeDiagram(maps, diagram);
  const update = Y.encodeStateAsUpdate(doc);
  doc.destroy();
  return update;
}
