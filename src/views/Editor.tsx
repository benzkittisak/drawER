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
  useSelection,
  useSelectedRel,
} from '@store';
import { Canvas } from '@canvas/Canvas';
import { TopBar } from './panels/TopBar';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { CommentCard } from './panels/CommentCard';
import { ShareModal } from './panels/ShareModal';
import { ExportModal } from './panels/ExportModal';
import { ImportModal } from './panels/ImportModal';
import { AiGenerateModal } from './panels/AiGenerateModal';
import { PanelCollapseBtn, PanelRail } from './panels/PanelRail';
const SETTINGS = { grid: true, pins: true };

const LEFT_OPEN_KEY = 'drawer:leftPanelOpen';
const RIGHT_OPEN_KEY = 'drawer:rightPanelOpen';
const RIGHT_WIDTH_KEY = 'drawer:rightPanelWidth';
const RIGHT_WIDTH_DEFAULT = 360;
const RIGHT_WIDTH_MIN = 280;
const RIGHT_WIDTH_MAX = 640;

function readRightPanelWidth(): number {
  try {
    const n = Number.parseInt(localStorage.getItem(RIGHT_WIDTH_KEY) ?? '', 10);
    if (Number.isFinite(n) && n >= RIGHT_WIDTH_MIN && n <= RIGHT_WIDTH_MAX) return n;
  } catch {
    /* ignore */
  }
  return RIGHT_WIDTH_DEFAULT;
}

function readPanelOpen(key: string, defaultOpen = true): boolean {
  try {
    const raw = localStorage.getItem(key);
    if (raw === '0' || raw === 'false') return false;
    if (raw === '1' || raw === 'true') return true;
  } catch {
    /* ignore */
  }
  return defaultOpen;
}

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
  const [leftOpen, setLeftOpen] = useState(() => readPanelOpen(LEFT_OPEN_KEY));
  const [rightOpen, setRightOpen] = useState(() => readPanelOpen(RIGHT_OPEN_KEY));
  const [rightWidth, setRightWidth] = useState(readRightPanelWidth);

  useEffect(() => {
    try {
      localStorage.setItem(LEFT_OPEN_KEY, leftOpen ? '1' : '0');
      localStorage.setItem(RIGHT_OPEN_KEY, rightOpen ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [leftOpen, rightOpen]);

  const startRightResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = rightWidth;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    let latest = startW;
    const onMove = (ev: MouseEvent) => {
      latest = Math.min(RIGHT_WIDTH_MAX, Math.max(RIGHT_WIDTH_MIN, startW + (startX - ev.clientX)));
      setRightWidth(latest);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      try {
        localStorage.setItem(RIGHT_WIDTH_KEY, String(latest));
      } catch {
        /* ignore */
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [commentsFocusKey, setCommentsFocusKey] = useState(0);
  const [draft, setDraft] = useState<{ x: number; y: number } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [selected] = useSelection();
  const [selectedRel] = useSelectedRel();
  const activeComment = comments.find((c) => c.id === openId) ?? null;

  useEffect(() => {
    if (selected || selectedRel) setRightOpen(true);
  }, [selected, selectedRel]);

  const placeComment = (x: number, y: number) => {
    setOpenId(null);
    setDraft({ x, y });
    setRightOpen(true);
    setCommentsFocusKey((k) => k + 1);
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
        {leftOpen ? (
          <div id="editor-left-panel" className="panel-shell panel-shell--left">
            <LeftPanel />
            <PanelCollapseBtn side="left" onClick={() => setLeftOpen(false)} />
          </div>
        ) : (
          <PanelRail side="left" onToggle={() => setLeftOpen(true)} />
        )}
        <Canvas
          draft={draft}
          grid={SETTINGS.grid}
          pins={SETTINGS.pins}
          onPlaceComment={placeComment}
          onOpenComment={openComment}
          onAiClick={() => setAiOpen(true)}
        />
        {rightOpen ? (
          <div id="editor-right-panel" className="panel-shell panel-shell--right" style={{ width: rightWidth }}>
            <div
              className="panel-resize-handle"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize right panel"
              onMouseDown={startRightResize}
            />
            <PanelCollapseBtn side="right" onClick={() => setRightOpen(false)} />
            <RightPanel
              onOpenComment={openComment}
              onShare={() => setShareOpen(true)}
              focusCommentsKey={commentsFocusKey}
            />
          </div>
        ) : (
          <PanelRail side="right" onToggle={() => setRightOpen(true)} />
        )}
        {(activeComment || draft) && (
          <CommentCard comment={activeComment} draft={draft} onClose={closeComment} />
        )}
        {shareOpen && <ShareModal onClose={() => setShareOpen(false)} />}
        {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
        {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
        {aiOpen && <AiGenerateModal onClose={() => setAiOpen(false)} />}
      </div>
    </div>
  );
}
