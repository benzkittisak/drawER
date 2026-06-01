/**
 * CommentPins — pinned comment bubbles on the canvas (real Yjs comments). Plus an optional
 * draft pin for a comment being placed. Ported styling from editor-canvas.jsx.
 */
import type { MouseEvent } from 'react';
import type { Comment } from '@collab';
import { Icon } from '@ui/Icon';

interface CommentPinsProps {
  comments: Comment[];
  draft: { x: number; y: number } | null;
  onOpen: (id: string) => void;
}

export function CommentPins({ comments, draft, onOpen }: CommentPinsProps) {
  return (
    <>
      {comments.map((c, i) => (
        <div
          key={c.id}
          className={'pin' + (c.resolved ? ' resolved' : '')}
          style={{ left: c.x, top: c.y }}
          onMouseDown={(e: MouseEvent) => {
            e.stopPropagation();
            onOpen(c.id);
          }}
        >
          <div className="pin__bubble">{c.resolved ? <Icon name="check" size={14} /> : i + 1}</div>
        </div>
      ))}
      {draft && (
        <div className="pin" style={{ left: draft.x, top: draft.y }}>
          <div className="pin__bubble" style={{ opacity: 0.7 }}>
            <Icon name="comment" size={13} />
          </div>
        </div>
      )}
    </>
  );
}
