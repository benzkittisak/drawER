import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import { useCanvasPresence, useComments, useDiagramMeta, useRemoteCursors } from './hooks';

// React 19 act() requires this flag in a test environment.
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

function Probe() {
  const presence = useCanvasPresence();
  const cursors = useRemoteCursors();
  const comments = useComments();
  const meta = useDiagramMeta();
  return (
    <div>
      {presence.peers}-{cursors.length}-{comments.length}-{meta.dialect}
    </div>
  );
}

describe('store hooks — snapshot stability', () => {
  it('derived presence hooks render without an infinite update loop', () => {
    // A selector that builds a fresh array/object every call breaks useSyncExternalStore's
    // snapshot caching and throws "Maximum update depth exceeded". This guards against that.
    const el = document.createElement('div');
    const root = createRoot(el);
    act(() => {
      root.render(<Probe />);
    });
    expect(el.textContent).toBe('0-0-0-postgres');
    act(() => {
      root.unmount();
    });
  });
});
