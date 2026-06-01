/**
 * Embed — read-only diagram viewer for iframes on external sites (?embed=1&room=<id>).
 */
import { useEffect, useRef } from 'react';
import { createDiagram } from '@core';
import { loadDiagram as loadFromStorage, useDiagram, useEditorActions } from '@store';
import { Canvas } from '@canvas/Canvas';

interface EmbedViewProps {
  diagramId: string;
}

export function EmbedView({ diagramId }: EmbedViewProps) {
  const { loadDiagram, setReadonly } = useEditorActions();
  const diagram = useDiagram();
  const loadedId = useRef<string | null>(null);

  if (loadedId.current !== diagramId) {
    setReadonly(true);
    const local = loadFromStorage(diagramId);
    const initial = local ?? createDiagram(diagramId, 'Diagram', 'postgres');
    loadDiagram(initial);
    loadedId.current = diagramId;
  }

  useEffect(() => {
    setReadonly(true);
    return () => setReadonly(false);
  }, [diagramId, setReadonly]);

  const openUrl = `/?room=${encodeURIComponent(diagramId)}`;

  return (
    <div className="app app--embed">
      <header className="embed-bar">
        <div className="embed-bar__title">{diagram.name}</div>
        <a className="embed-bar__link" href={openUrl} target="_blank" rel="noopener noreferrer">
          Open in drawER
        </a>
      </header>
      <div className="embed-work">
        <Canvas draft={null} grid pins={false} onPlaceComment={() => {}} onOpenComment={() => {}} />
      </div>
    </div>
  );
}

export function EmbedMissingRoom() {
  return (
    <div className="app app--embed app--embed-empty">
      <p>Missing diagram id. Use ?embed=1&amp;room=&lt;diagram-id&gt;</p>
    </div>
  );
}
