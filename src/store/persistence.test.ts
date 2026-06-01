import { describe, expect, it, beforeEach } from 'vitest';
import { mergeDiagramSummaries } from './persistence';

const TOMBSTONES_KEY = 'drawer:tombstones';

describe('mergeDiagramSummaries', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('includes server-only diagrams', () => {
    const remote = [
      {
        id: 'from-server',
        name: 'Server diagram',
        dialect: 'postgres',
        tableCount: 1,
        colors: [],
        updatedAt: 100,
      },
    ];
    const diagrams = mergeDiagramSummaries(remote);
    expect(diagrams).toHaveLength(1);
    expect(diagrams[0]?.id).toBe('from-server');
  });

  it('shows server diagrams even when legacy tombstones exist (Postgres wins)', () => {
    localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(['from-server']));
    const remote = [
      {
        id: 'from-server',
        name: 'Server diagram',
        dialect: 'postgres',
        tableCount: 1,
        colors: [],
        updatedAt: 100,
      },
    ];
    const diagrams = mergeDiagramSummaries(remote);
    expect(diagrams).toHaveLength(1);
  });
});
