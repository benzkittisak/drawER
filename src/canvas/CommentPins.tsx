/**
 * CommentPins — pinned comment bubbles on the canvas. Ported from editor-canvas.jsx.
 */
import type { MouseEvent } from 'react';
import type { DemoComment } from '@data/types';
import { Icon } from '@ui/Icon';

interface CommentPinsProps {
  comments: DemoComment[];
  onOpen: (c: DemoComment) => void;
}

export function CommentPins({ comments, onOpen }: CommentPinsProps) {
  return (
    <>
      {comments.map((c, i) => (
        <div
          key={c.id}
          className={'pin' + (c.resolved ? ' resolved' : '')}
          style={{ left: c.x, top: c.y }}
          onMouseDown={(e: MouseEvent) => {
            e.stopPropagation();
            onOpen(c);
          }}
        >
          <div className="pin__bubble">
            {c.resolved ? <Icon name="check" size={14} /> : i + 1}
          </div>
        </div>
      ))}
    </>
  );
}
