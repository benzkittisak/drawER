import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createDiagram } from '@core';
import {
  listDiagrams,
  loadDiagram,
  mergeDiagramSummaries,
  renameDiagramInLibrary,
  saveDiagram,
} from './persistence';

vi.mock('@collab', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@collab')>();
  return {
    ...actual,
    loadDiagramFromIndexedDB: vi.fn().mockResolvedValue(null),
  };
});

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

describe('renameDiagramInLibrary', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renames when localStorage diagram exists', async () => {
    const d = createDiagram('diag-1', 'Old name', 'postgres');
    saveDiagram(d, 100);
    const ok = await renameDiagramInLibrary('diag-1', '  New name  ');
    expect(ok).toBe(true);
    expect(loadDiagram('diag-1')?.name).toBe('New name');
    expect(listDiagrams()[0]?.name).toBe('New name');
  });

  it('uses Untitled diagram when name is blank', async () => {
    const d = createDiagram('diag-2', 'Has name', 'postgres');
    saveDiagram(d, 100);
    await renameDiagramInLibrary('diag-2', '   ');
    expect(loadDiagram('diag-2')?.name).toBe('Untitled diagram');
  });

  it('updates library metadata via PUT when no local diagram', async () => {
    localStorage.setItem(
      'drawer:library',
      JSON.stringify([
        {
          id: 'remote-only',
          name: 'Server',
          dialect: 'postgres',
          tableCount: 0,
          colors: [],
          updatedAt: 50,
        },
      ]),
    );
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 });
    vi.stubGlobal('fetch', fetchMock);

    const ok = await renameDiagramInLibrary('remote-only', 'Renamed on server');
    expect(ok).toBe(true);
    expect(listDiagrams()[0]?.name).toBe('Renamed on server');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/diagrams/remote-only'),
      expect.objectContaining({ method: 'PUT' }),
    );
  });
});
