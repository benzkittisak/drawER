/**
 * Editor — composes TopBar + Left/Right panels + Canvas + overlays. All state is real: the
 * diagram comes from the local store (@store, loaded from IndexedDB/localStorage or created
 * blank), and collaboration is live via Yjs. No mock teammates or seed content.
 */
import { useEffect, useRef, useState } from 'react';
import { createDiagram } from '@core';
import {
  loadDiagram as loadFromStorage,
  saveDiagram,
  useComments,
  useConnection,
  useDiagram,
  useEditorActions,
} from '@store';
import { Canvas } from '@canvas/Canvas';
import { TopBar } from './panels/TopBar';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { CommentCard } from './panels/CommentCard';
import { ShareModal } from './panels/ShareModal';
import { ExportModal } from './panels/ExportModal';
import { ImportModal } from './panels/ImportModal';

const SETTINGS = { grid: true, pins: true };

interface EditorProps {
  diagramId: string;
  /** Opened via a ?room=… share link — auto-join the live session. */
  joinRoom?: boolean;
  onDashboard: () => void;
  onHistory: () => void;
}

export function Editor({ diagramId, joinRoom = false, onDashboard, onHistory }: EditorProps) {
  const { loadDiagram: loadIntoStore } = useEditorActions();
  const { shareRoom } = useConnection();
  const diagram = useDiagram();

  // Load the requested diagram into the store synchronously on first render (or when it changes).
  // A joined room with no local copy starts empty and is filled by the websocket sync.
  const loadedId = useRef<string | null>(null);
  if (loadedId.current !== diagramId) {
    const local = loadFromStorage(diagramId);
    const initial =
      local ?? createDiagram(diagramId, joinRoom ? 'Shared diagram' : 'Untitled diagram', 'postgres');
    loadIntoStore(initial);
    loadedId.current = diagramId;
  }

  // Auto-join the live session when opened from a share link.
  const joined = useRef(false);
  useEffect(() => {
    if (joinRoom && !joined.current) {
      joined.current = true;
      shareRoom();
    }
  }, [joinRoom, shareRoom]);

  // Autosave (debounced) to the local library.
  useEffect(() => {
    const t = setTimeout(() => saveDiagram(diagram), 800);
    return () => clearTimeout(t);
  }, [diagram]);

  const comments = useComments();
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const activeComment = comments.find((c) => c.id === openId) ?? null;

  const placeComment = (x: number, y: number) => {
    setOpenId(null);
    setDraft({ x, y });
  };
  const openComment = (id: string) => {
    setDraft(null);
    setOpenId(id);
  };
  const closeComment = () => {
    setDraft(null);
    setOpenId(null);
  };

  return (
    <div className="app">
      <TopBar
        doc={diagram.name}
        onDashboard={onDashboard}
        onShare={() => setShareOpen(true)}
        onHistory={onHistory}
        onExport={() => setExportOpen(true)}
        onImport={() => setImportOpen(true)}
        leftOpen={leftOpen}
        rightOpen={rightOpen}
        onToggleLeft={() => setLeftOpen((v) => !v)}
        onToggleRight={() => setRightOpen((v) => !v)}
      />
      <div className="work">
        {leftOpen && <LeftPanel />}
        <Canvas
          draft={draft}
          grid={SETTINGS.grid}
          pins={SETTINGS.pins}
          onPlaceComment={placeComment}
          onOpenComment={openComment}
        />
        {rightOpen && <RightPanel onOpenComment={openComment} onShare={() => setShareOpen(true)} />}
        {(activeComment || draft) && (
          <CommentCard comment={activeComment} draft={draft} onClose={closeComment} />
        )}
        {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
        {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
        {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      </div>
    </div>
  );
}
