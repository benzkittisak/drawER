/**
 * App — top-level router across the three views. The open diagram is reflected in the URL as
 * `?room=<id>`, so copying the address into another browser opens the SAME diagram (same Yjs
 * room) → live collaboration. Embed mode: `?embed=1&room=<id>` (read-only iframe viewer).
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { createDiagram, newId } from '@core';
import { saveDiagram, useEditorStore } from '@store';

// Views are code-split: the Dashboard-first load no longer pulls the Editor (Canvas, SVG layers,
// every modal) or History up front — each becomes its own async chunk, fetched on first navigation.
const Dashboard = lazy(() => import('@views/Dashboard').then((m) => ({ default: m.Dashboard })));
const Editor = lazy(() => import('@views/Editor').then((m) => ({ default: m.Editor })));
const History = lazy(() => import('@views/History').then((m) => ({ default: m.History })));
const EmbedView = lazy(() => import('@views/Embed').then((m) => ({ default: m.EmbedView })));
const EmbedMissingRoom = lazy(() =>
  import('@views/Embed').then((m) => ({ default: m.EmbedMissingRoom })),
);

type Route = 'dashboard' | 'editor' | 'history';

const searchParams = (): URLSearchParams =>
  typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();

const roomFromUrl = (): string | null => searchParams().get('room');

const isEmbedFromUrl = (): boolean => searchParams().get('embed') === '1';

function setUrlRoom(id: string | null): void {
  if (typeof history === 'undefined') return;
  const url = id ? `?room=${encodeURIComponent(id)}` : location.pathname;
  history.pushState(null, '', url);
}

const INITIAL_ROOM = roomFromUrl();
const INITIAL_EMBED = isEmbedFromUrl();

export function App() {
  const [route, setRoute] = useState<Route>(
    INITIAL_EMBED ? 'dashboard' : INITIAL_ROOM ? 'editor' : 'dashboard',
  );
  const [openId, setOpenId] = useState<string | null>(INITIAL_EMBED ? null : INITIAL_ROOM);
  const [joinId, setJoinId] = useState<string | null>(INITIAL_EMBED ? null : INITIAL_ROOM);
  const [libraryEpoch, setLibraryEpoch] = useState(0);

  useEffect(() => {
    const onPop = () => {
      if (isEmbedFromUrl()) return;
      const room = roomFromUrl();
      // Landing on the dashboard must fully close the session — a lingering websocket keeps the
      // room's doc alive on the sync server, which resurrects diagrams deleted from the dashboard.
      if (!room) useEditorStore.getState().closeDiagram();
      setOpenId(room);
      setJoinId(room);
      setRoute(room ? 'editor' : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = (id: string) => {
    setOpenId(id);
    setJoinId(null);
    setRoute('editor');
    setUrlRoom(id);
  };

  const goDashboard = () => {
    useEditorStore.getState().closeDiagram(); // see onPop — never hold a live room on the dashboard
    setRoute('dashboard');
    setOpenId(null);
    setUrlRoom(null);
    setLibraryEpoch((n) => n + 1);
  };

  const newDiagram = () => {
    const d = createDiagram(newId(), 'Untitled diagram', 'postgres');
    saveDiagram(d);
    open(d.id);
  };

  let page: ReactNode;
  if (INITIAL_EMBED) {
    page = INITIAL_ROOM ? <EmbedView diagramId={INITIAL_ROOM} /> : <EmbedMissingRoom />;
  } else if (route === 'history') {
    page = <History onBack={() => setRoute('editor')} />;
  } else if (route === 'editor' && openId) {
    page = (
      <Editor
        key={openId}
        diagramId={openId}
        joinRoom={openId === joinId}
        onDashboard={goDashboard}
        onHistory={() => setRoute('history')}
      />
    );
  } else {
    page = <Dashboard key={libraryEpoch} onOpen={open} onNew={newDiagram} />;
  }

  // Lazy views suspend while their chunk loads; the .app shell keeps the background stable (no flash).
  return <Suspense fallback={<div className="app" />}>{page}</Suspense>;
}
