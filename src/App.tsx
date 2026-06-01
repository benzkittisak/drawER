/**
 * App — top-level router across the three views. State-based routing (no URL router yet);
 * a ?room=… link opens straight into that shared diagram. No demo content is injected — the
 * library starts empty and fills with the user's real diagrams.
 */
import { useState } from 'react';
import { createDiagram, newId } from '@core';
import { saveDiagram } from '@store';
import { Dashboard } from '@views/Dashboard';
import { Editor } from '@views/Editor';
import { History } from '@views/History';

type Route = 'dashboard' | 'editor' | 'history';

const ROOM_PARAM =
  typeof location !== 'undefined' ? new URLSearchParams(location.search).get('room') : null;

export function App() {
  const [route, setRoute] = useState<Route>(ROOM_PARAM ? 'editor' : 'dashboard');
  const [openId, setOpenId] = useState<string | null>(ROOM_PARAM);

  const open = (id: string) => {
    setOpenId(id);
    setRoute('editor');
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
        diagramId={openId}
        joinRoom={!!ROOM_PARAM && openId === ROOM_PARAM}
        onDashboard={() => setRoute('dashboard')}
        onHistory={() => setRoute('history')}
      />
    );
  }
  return <Dashboard onOpen={open} onNew={newDiagram} />;
}
