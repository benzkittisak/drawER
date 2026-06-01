/**
 * CommentCard — compose a new pinned comment (draft) or view/reply to an existing thread.
 * Backed by real Yjs comments via @store; author info is embedded on each comment/reply.
 */
import { useState } from 'react';
import type { Comment } from '@collab';
import { useCommentActions } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

interface CommentCardProps {
  comment: Comment | null;
  draft: { x: number; y: number } | null;
  onClose: () => void;
}

export function CommentCard({ comment, draft, onClose }: CommentCardProps) {
  const { addComment, resolveComment, addReply } = useCommentActions();
  const [val, setVal] = useState('');
  const isNew = !!draft && !comment;

  const submit = () => {
    const body = val.trim();
    if (!body) {
      onClose();
      return;
    }
    if (isNew && draft) {
      addComment({ x: draft.x, y: draft.y, tableId: null, body });
      onClose();
    } else if (comment) {
      addReply(comment.id, body);
      setVal('');
    }
  };

  return (
    <div
      className="modal pop"
      style={{ position: 'absolute', top: 70, right: 24, width: 320, zIndex: 130, boxShadow: 'var(--shadow-lg)' }}
    >
      <div className="modal__head" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="comment" size={16} style={{ color: 'var(--accent)' }} />
          <div className="modal__title" style={{ fontSize: 14 }}>
            {isNew ? 'New comment' : 'Thread'}
          </div>
        </div>
        <Btn iconOnly sm variant="ghost" icon="x" onClick={onClose} />
      </div>

      <div style={{ padding: '12px 14px', maxHeight: 280, overflowY: 'auto' }}>
        {comment && (
          <>
            <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
              <Avatar user={{ id: comment.author, name: comment.authorName, short: initials(comment.authorName), color: comment.authorColor }} size={28} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {comment.authorName}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 500, marginLeft: 6 }}>{relTime(comment.createdAt)}</span>
                </div>
                <div style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{comment.body}</div>
              </div>
            </div>
            {comment.replies.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
                <Avatar user={{ id: r.author, name: r.authorName, short: initials(r.authorName), color: r.authorColor }} size={28} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    {r.authorName}
                    <span style={{ color: 'var(--ink-3)', fontWeight: 500, marginLeft: 6 }}>{relTime(r.ts)}</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{r.body}</div>
                </div>
              </div>
            ))}
          </>
        )}
        {isNew && draft && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>
            Pinned at <span style={{ fontFamily: 'var(--mono)' }}>{draft.x}, {draft.y}</span>
          </div>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--line)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          className="input"
          style={{ height: 34 }}
          autoFocus
          placeholder={isNew ? 'Write a comment…' : 'Reply…'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
        />
        <Btn iconOnly variant="primary" icon="arrowLeft" style={{ transform: 'rotate(90deg)' }} onClick={submit} />
      </div>

      {comment && (
        <div style={{ padding: '0 14px 12px' }}>
          <Btn sm variant="ghost" icon="checkCircle" onClick={() => resolveComment(comment.id)} style={{ color: 'var(--u-you)' }}>
            {comment.resolved ? 'Resolved' : 'Mark resolved'}
          </Btn>
        </div>
      )}
    </div>
  );
}
