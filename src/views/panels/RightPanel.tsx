/**
 * RightPanel — table editor (when a table is selected) + collaboration: People / Comments / Activity.
 */
import { useEffect, useState } from 'react';
import { useActivity, useComments, useConnection, useIdentity, useOthers, useSelection } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';
import { TableEditorPanel } from './TableEditorPanel';

type Tab = 'table' | 'people' | 'comments' | 'activity';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export function RightPanel({ onOpenComment, onShare }: { onOpenComment: (id: string) => void; onShare: () => void }) {
  const [tab, setTab] = useState<Tab>('people');
  const [selected, setSelected] = useSelection();
  const me = useIdentity();
  const others = useOthers();
  const comments = useComments();
  const activity = useActivity();
  const { connection } = useConnection();
  const open = comments.filter((c) => !c.resolved);

  useEffect(() => {
    if (selected) setTab('table');
  }, [selected]);

  return (
    <div className="panel panel--right">
      <div className="panel__tabs">
        <button className={'ptab' + (tab === 'table' ? ' active' : '')} onClick={() => setTab('table')}>
          <Icon name="table" size={15} />
          Table
        </button>
        <button className={'ptab' + (tab === 'people' ? ' active' : '')} onClick={() => setTab('people')}>
          <Icon name="users" size={15} />
          People
          <span className="badge">{others.length + 1}</span>
        </button>
        <button className={'ptab' + (tab === 'comments' ? ' active' : '')} onClick={() => setTab('comments')}>
          <Icon name="comment" size={15} />
          Comments
          <span className="badge">{open.length}</span>
        </button>
        <button className={'ptab' + (tab === 'activity' ? ' active' : '')} onClick={() => setTab('activity')}>
          <Icon name="activity" size={15} />
          Activity
        </button>
      </div>

      {tab === 'table' && (
        <div className="panel__body">
          {selected ? (
            <TableEditorPanel tableId={selected} onDeleted={() => setSelected(null)} />
          ) : (
            <div style={{ padding: '12px 4px', color: 'var(--ink-3)', fontSize: 13, lineHeight: 1.55 }}>
              Click a table on the canvas to edit its name, color, and fields here.
            </div>
          )}
        </div>
      )}

      {tab === 'people' && (
        <div className="panel__body">
          <div className="panel__head" style={{ padding: '6px 4px 8px' }}>
            <span className="panel__title">In this diagram</span>
            <Btn sm variant="ghost" icon="share" onClick={onShare}>
              Share
            </Btn>
          </div>
          <div className="person">
            <Avatar user={{ id: me.id, name: 'You', short: 'ME', color: me.color }} size={32} ring />
            <div className="person__main">
              <div className="person__name">You</div>
              <div className="person__status">{me.name}</div>
            </div>
            <span className="dot-live" />
          </div>
          {others.map((o) => (
            <div key={o.clientId} className="person">
              <Avatar user={{ id: o.user.id, name: o.user.name, short: initials(o.user.name), color: o.user.color }} size={32} ring />
              <div className="person__main">
                <div className="person__name">{o.user.name}</div>
                <div className="person__status">
                  {o.activity.type === 'editing' ? `Editing ${o.activity.tableId}` : 'Viewing'}
                </div>
              </div>
              <span
                className="dot-live"
                style={{ background: o.user.color, boxShadow: `0 0 0 3px color-mix(in srgb, ${o.user.color} 22%, transparent)` }}
              />
            </div>
          ))}
          {!connection.isShared && (
            <div style={{ padding: '14px 8px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              You're working solo. <button className="btn btn--ghost btn--sm" style={{ padding: '0 6px' }} onClick={onShare}>Start a live session</button> to collaborate in real time.
            </div>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="panel__body">
          {comments.length === 0 && (
            <div style={{ padding: '12px 10px', color: 'var(--ink-3)', fontSize: 13 }}>
              No comments yet — pick the comment tool and click the canvas to pin one.
            </div>
          )}
          {comments.map((c) => (
            <div key={c.id} className="thread" onClick={() => onOpenComment(c.id)}>
              <div className="thread__head">
                <Avatar user={{ id: c.author, name: c.authorName, short: initials(c.authorName), color: c.authorColor }} size={24} />
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.authorName.split(' ')[0]}</span>
                {c.tableId && <span className="thread__where">#{c.tableId}</span>}
                {c.resolved && (
                  <span style={{ marginLeft: 'auto', color: 'var(--u-you)' }}>
                    <Icon name="checkCircle" size={16} />
                  </span>
                )}
              </div>
              <div className="thread__msg">{c.body}</div>
              <div className="thread__meta">
                <Icon name="comment" size={13} />
                {c.replies.length} {c.replies.length === 1 ? 'reply' : 'replies'} · {relTime(c.createdAt)}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'activity' && (
        <div className="panel__body">
          {activity.length === 0 && (
            <div style={{ padding: '12px 10px', color: 'var(--ink-3)', fontSize: 13 }}>No activity yet.</div>
          )}
          {activity.map((a, i) => (
            <div key={a.id} className="act">
              <div className="act__rail">
                <Avatar user={{ id: a.who, name: a.whoName, short: initials(a.whoName), color: a.whoColor }} size={26} />
                {i < activity.length - 1 && <div className="act__line" />}
              </div>
              <div className="act__body">
                <div className="act__txt">
                  <b>{a.who === me.id ? 'You' : a.whoName.split(' ')[0]}</b> {a.action} <b>{a.target}</b>
                </div>
                <div className="act__time">{relTime(a.ts)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
