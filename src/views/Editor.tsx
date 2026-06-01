/**
 * Editor — composes TopBar + Left/Right panels + Canvas + overlays. Diagram state lives in
 * @store (seeded once on mount); collab chrome (people/comments/activity) is still seed data
 * until M5/M6. The composition does not change when the store moves onto Yjs.
 */
import { useEffect, useRef, useState } from 'react';
import * as seed from '@data/seed';
import { seedDiagram } from '@data/seedDiagram';
import { loadDiagram as loadFromStorage, saveDiagram, useDiagram, useEditorActions } from '@store';
import type { DemoComment } from '@data/types';
import { Canvas, type NewCommentDraft } from '@canvas/Canvas';
import { TopBar } from './panels/TopBar';
import { LeftPanel } from './panels/LeftPanel';
import { RightPanel } from './panels/RightPanel';
import { CommentCard } from './panels/CommentCard';
import { ShareModal } from './panels/ShareModal';
import { ExportModal } from './panels/ExportModal';
import { ImportModal } from './panels/ImportModal';

// Until the Tweaks settings become real preferences (M7), the demo runs with everything on.
const SETTINGS = { motion: true, grid: true, pins: true };

interface EditorProps {
  diagramId: string;
  onDashboard: () => void;
  onHistory: () => void;
}

export function Editor({ diagramId, onDashboard, onHistory }: EditorProps) {
  const { loadDiagram: loadIntoStore } = useEditorActions();
  const diagram = useDiagram();

  // Load the requested diagram into the store synchronously on first render (or when it changes).
  const loadedId = useRef<string | null>(null);
  if (loadedId.current !== diagramId) {
    loadIntoStore(loadFromStorage(diagramId) ?? seedDiagram());
    loadedId.current = diagramId;
  }

  // Autosave (debounced) to the local library.
  useEffect(() => {
    const t = setTimeout(() => saveDiagram(diagram), 800);
    return () => clearTimeout(t);
  }, [diagram]);

  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [comments, setComments] = useState<DemoComment[]>(() => seed.comments.map((c) => ({ ...c })));
  const [activeComment, setActiveComment] = useState<DemoComment | null>(null);

  const openComment = (c: DemoComment | NewCommentDraft) => {
    if ('isNew' in c && c.isNew) {
      const nc: DemoComment = {
        id: 'c' + Date.now(),
        x: c.x,
        y: c.y,
        table: 'canvas',
        resolved: false,
        author: 'you',
        msg: '',
        time: 'now',
        replies: 0,
        isNew: true,
      };
      setComments((p) => [...p, nc]);
      setActiveComment(nc);
    } else {
      setActiveComment(c as DemoComment);
    }
  };

  const resolveComment = () => {
    if (!activeComment) return;
    setComments((p) => p.map((c) => (c.id === activeComment.id ? { ...c, resolved: !c.resolved } : c)));
    setActiveComment((c) => (c ? { ...c, resolved: !c.resolved } : c));
  };

  return (
    <div className="app">
      <TopBar
        users={seed.users}
        liveUsers={seed.liveUsers}
        doc="Core Product DB"
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
        {leftOpen && <LeftPanel users={seed.users} locks={seed.locks} />}
        <Canvas
          users={seed.users}
          locks={seed.locks}
          liveUsers={seed.liveUsers}
          comments={comments}
          motion={SETTINGS.motion}
          grid={SETTINGS.grid}
          pins={SETTINGS.pins}
          onOpenComment={openComment}
        />
        {rightOpen && (
          <RightPanel
            users={seed.users}
            liveUsers={seed.liveUsers}
            locks={seed.locks}
            comments={comments}
            activity={seed.activity}
            onOpenComment={openComment}
            onShare={() => setShareOpen(true)}
          />
        )}
        {activeComment && (
          <CommentCard
            comment={activeComment}
            users={seed.users}
            onClose={() => setActiveComment(null)}
            onResolve={resolveComment}
          />
        )}
        {shareOpen && <ShareModal users={seed.users} onClose={() => setShareOpen(false)} />}
        {exportOpen && <ExportModal onClose={() => setExportOpen(false)} />}
        {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      </div>
    </div>
  );
}
