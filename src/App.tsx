/**
 * App — top-level router across the three views. The open diagram is reflected in the URL as
 * `?room=<id>`, so copying the address into another browser opens the SAME diagram (same Yjs
 * room) → live collaboration. Embed mode: `?embed=1&room=<id>` (read-only iframe viewer).
 */
import { useEffect, useState } from 'react';
import { createDiagram, newId } from '@core';
import { saveDiagram } from '@store';
import { Dashboard } from '@views/Dashboard';
import { Editor } from '@views/Editor';
import { EmbedMissingRoom, EmbedView } from '@views/Embed';
import { History } from '@views/History';

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
      setOpenId(room);
      setJoinId(room);
      setRoute(room ? 'editor' : 'dashboard');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (INITIAL_EMBED) {
    const room = INITIAL_ROOM;
    return room ? <EmbedView diagramId={room} /> : <EmbedMissingRoom />;
  }

  const open = (id: string) => {
    setOpenId(id);
    setJoinId(null);
    setRoute('editor');
    setUrlRoom(id);
  };

  const goDashboard = () => {
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
  return <Dashboard key={libraryEpoch} onOpen={open} onNew={newDiagram} />;
}
