/**
 * Sequential migrations for the saved JSON format. Each migration upgrades the raw object by
 * exactly one version. Add an entry keyed by the FROM version when you bump CURRENT_VERSION.
 */
import { CURRENT_VERSION } from './schema';

type RawObj = Record<string, unknown>;

/** key N = migration from version N → N+1. */
const migrations: Record<number, (raw: RawObj) => RawObj> = {
  // 1: (raw) => ({ ...raw, version: 2, diagram: <upgraded> }),
};

export function migrate(raw: RawObj): RawObj {
  let out = raw;
  let version = typeof out.version === 'number' ? out.version : 1;
  while (version < CURRENT_VERSION) {
    const step = migrations[version];
    if (!step) break; // no migration registered — accept as-is, bump version
    out = step(out);
    version += 1;
  }
  return { ...out, version: CURRENT_VERSION };
}
