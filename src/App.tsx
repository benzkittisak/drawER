/**
 * App — top-level router across the three views. The open diagram is reflected in the URL as
 * `?room=<id>`, so copying the address into another browser opens the SAME diagram (same Yjs
 * room) → live collaboration. No demo content is injected; the library is the user's real data.
 */
import { useEffect, useState } from 'react';
import { createDiagram, newId } from '@core';
import { saveDiagram } from '@store';
import { Dashboard } from '@views/Dashboard';
import { Editor } from '@views/Editor';
import { History } from '@views/History';

type Route = 'dashboard' | 'editor' | 'history';

const roomFromUrl = (): string | null =>
  typeof location !== 'undefined' ? new URLSearchParams(location.search).get('room') : null;

function setUrlRoom(id: string | null): void {
  if (typeof history === 'undefined') return;
  const url = id ? `?room=${encodeURIComponent(id)}` : location.pathname;
  history.pushState(null, '', url);
}

const INITIAL_ROOM = roomFromUrl();

export function App() {
  const [route, setRoute] = useState<Route>(INITIAL_ROOM ? 'editor' : 'dashboard');
  const [openId, setOpenId] = useState<string | null>(INITIAL_ROOM);
  // The diagram id the URL was carrying when it was opened — used to auto-join its room.
  const [joinId, setJoinId] = useState<string | null>(INITIAL_ROOM);

  // Keep routing in sync with browser back/forward.
  useEffect(() => {
    const onPop = () => {
      const room = roomFromUrl();
      setOpenId(room);
      setJoinId(room);
      setRoute(room ? 'editor' : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const open = (id: string) => {
    setOpenId(id);
    setJoinId(null); // opened from within the app — we already own this diagram
    setRoute('editor');
    setUrlRoom(id);
  };

  const goDashboard = () => {
    setRoute('dashboard');
    setOpenId(null);
    setUrlRoom(null);
  };

  const newDiagram = () => {
    const d = createDiagram(newId(), 'Untitled diagram', 'postgres');
    saveDiagram(d);
    open(d.id);
  };

  if (route === 'history') return <History onBack={() => setRoute('editor')} />;
  if (route === 'editor' && openId) {
    return (
      <Editor
        key={openId}
        diagramId={openId}
        joinRoom={openId === joinId}
        onDashboard={goDashboard}
        onHistory={() => setRoute('history')}
      />
    );
  }
  return <Dashboard onOpen={open} onNew={newDiagram} />;
}
