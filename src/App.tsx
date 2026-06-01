/**
 * App — top-level router across the three views. State-based routing (no URL router yet);
 * a real router + per-diagram routes (`/d/:id`) arrive with persistence/sharing in M4–M6.
 */
import { useState } from 'react';
import { Dashboard } from '@views/Dashboard';
import { Editor } from '@views/Editor';
import { History } from '@views/History';

type Route = 'dashboard' | 'editor' | 'history';

export function App() {
  const [route, setRoute] = useState<Route>('dashboard');

  if (route === 'dashboard') return <Dashboard onOpen={() => setRoute('editor')} />;
  if (route === 'history') return <History onBack={() => setRoute('editor')} />;
  return <Editor onDashboard={() => setRoute('dashboard')} onHistory={() => setRoute('history')} />;
}
