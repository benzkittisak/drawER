/**
 * App — top-level router across the three views, plus first-run seeding of the local library.
 * State-based routing (no URL router yet); per-diagram URLs arrive with sharing in M5/M6.
 */
import { useRef, useState } from 'react';
import { createDiagram, newId } from '@core';
import { listDiagrams, saveDiagram } from '@store';
import { seedDiagram } from '@data/seedDiagram';
import { Dashboard } from '@views/Dashboard';
import { Editor } from '@views/Editor';
import { History } from '@views/History';

type Route = 'dashboard' | 'editor' | 'history';

export function App() {
  const [route, setRoute] = useState<Route>('dashboard');
  const [openId, setOpenId] = useState<string | null>(null);

  // Seed the demo diagram into the local library on first run so the app isn't empty.
  const seeded = useRef(false);
  if (!seeded.current) {
    if (listDiagrams().length === 0) saveDiagram(seedDiagram());
    seeded.current = true;
  }

  const open = (id: string) => {
    setOpenId(id);
    setRoute('editor');
  };

  const newDiagram = () => {
    const d = createDiagram(newId(), 'Untitled diagram', 'postgres');
    saveDiagram(d);
    open(d.id);
  };

  if (route === 'dashboard') return <Dashboard onOpen={open} onNew={newDiagram} />;
  if (route === 'history') return <History onBack={() => setRoute('editor')} />;
  return (
    <Editor
      diagramId={openId ?? 'core-product-db'}
      onDashboard={() => setRoute('dashboard')}
      onHistory={() => setRoute('history')}
    />
  );
}
