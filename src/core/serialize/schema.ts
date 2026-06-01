/** The versioned JSON save format. Mirrors schemas/saved-diagram.schema.json. */
import type { Diagram } from '../model/types';

export const CURRENT_VERSION = 1;
export const APP_TAG = 'drawDB-live' as const;

export interface SavedDiagram {
  version: number;
  exportedAt?: string;
  app: typeof APP_TAG;
  diagram: Diagram;
}
