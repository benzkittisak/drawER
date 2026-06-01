/**
 * CommentCard — floating thread / new-comment composer. Ported from editor-panels.jsx.
 */
import { useState } from 'react';
import type { DemoComment, DemoUser } from '@data/types';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';

interface CommentCardProps {
  comment: DemoComment;
  users: Record<string, DemoUser>;
  onClose: () => void;
  onResolve: () => void;
}

export function CommentCard({ comment, users, onClose, onResolve }: CommentCardProps) {
  const [val, setVal] = useState('');
  const isNew = comment.isNew;
  const u = isNew ? users.you : users[comment.author];

  return (
    <div
      className="modal pop"
      style={{
        position: 'absolute',
        top: 70,
        right: 24,
        width: 320,
        zIndex: 130,
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <div className="modal__head" style={{ padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="comment" size={16} style={{ color: 'var(--accent)' }} />
          <div className="modal__title" style={{ fontSize: 14 }}>
            {isNew ? 'New comment' : 'Thread'}
          </div>
          {!isNew && <span className="thread__where">#{comment.table}</span>}
        </div>
        <Btn iconOnly sm variant="ghost" icon="x" onClick={onClose} />
      </div>

      <div style={{ padding: '12px 14px', maxHeight: 280, overflowY: 'auto' }}>
        {!isNew && (
          <>
            <div style={{ display: 'flex', gap: 9, marginBottom: 12 }}>
              <Avatar user={u} size={28} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {u.name}
                  <span style={{ color: 'var(--ink-3)', fontWeight: 500, marginLeft: 6 }}>
                    {comment.time}
                  </span>
                </div>
                <div style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>{comment.msg}</div>
              </div>
            </div>
            {comment.replies > 0 && (
              <div style={{ display: 'flex', gap: 9, marginBottom: 10 }}>
                <Avatar user={users.kenji} size={28} />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                    Kenji
                    <span style={{ color: 'var(--ink-3)', fontWeight: 500, marginLeft: 6 }}>8m</span>
                  </div>
                  <div style={{ fontSize: 13, marginTop: 3, lineHeight: 1.5 }}>
                    Good call — let me adjust the type and push it.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {isNew && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginBottom: 10 }}>
            Pinned at{' '}
            <span style={{ fontFamily: 'var(--mono)' }}>
              {comment.x}, {comment.y}
            </span>
          </div>
        )}
      </div>

      <div
        style={{
          padding: '10px 14px',
          borderTop: '1px solid var(--line)',
          display: 'flex',
          gap: 8,
          alignItems: 'center',
        }}
      >
        <Avatar user={users.you} size={26} />
        <input
          className="input"
          style={{ height: 34 }}
          autoFocus
          placeholder={isNew ? 'Write a comment…' : 'Reply…'}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onClose();
          }}
        />
        <Btn iconOnly variant="primary" icon="arrowLeft" style={{ transform: 'rotate(90deg)' }} onClick={onClose} />
      </div>

      {!isNew && (
        <div style={{ padding: '0 14px 12px' }}>
          <Btn sm variant="ghost" icon="checkCircle" onClick={onResolve} style={{ color: 'var(--u-you)' }}>
            {comment.resolved ? 'Resolved' : 'Mark resolved'}
          </Btn>
        </div>
      )}
    </div>
  );
}
