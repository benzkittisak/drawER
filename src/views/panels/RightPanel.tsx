/**
 * RightPanel — collaboration: People / Comments / Activity tabs.
 * Ported from docs/design-reference/editor-panels.jsx.
 */
import { useState } from 'react';
import type { DemoActivity, DemoComment, DemoUser, LiveUser } from '@data/types';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';

interface RightPanelProps {
  users: Record<string, DemoUser>;
  liveUsers: LiveUser[];
  locks: Record<string, string>;
  comments: DemoComment[];
  activity: DemoActivity[];
  onOpenComment: (c: DemoComment) => void;
  onShare: () => void;
}

export function RightPanel({
  users,
  liveUsers,
  locks,
  comments,
  activity,
  onOpenComment,
  onShare,
}: RightPanelProps) {
  const [tab, setTab] = useState<'people' | 'comments' | 'activity'>('people');
  const open = comments.filter((c) => !c.resolved);

  return (
    <div className="panel panel--right">
      <div className="panel__tabs">
        <button className={'ptab' + (tab === 'people' ? ' active' : '')} onClick={() => setTab('people')}>
          <Icon name="users" size={15} />
          People
          <span className="badge">{liveUsers.length + 1}</span>
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

      {tab === 'people' && (
        <div className="panel__body">
          <div className="panel__head" style={{ padding: '6px 4px 8px' }}>
            <span className="panel__title">In this diagram</span>
            <Btn sm variant="ghost" icon="plus" onClick={onShare}>
              Invite
            </Btn>
          </div>
          <div className="person">
            <Avatar user={users.you} size={32} ring />
            <div className="person__main">
              <div className="person__name">
                You{' '}
                <span className="chip" style={{ height: 16, padding: '0 6px', fontSize: 10 }}>
                  Owner
                </span>
              </div>
              <div className="person__status">Editing now</div>
            </div>
            <span className="dot-live" />
          </div>
          {liveUsers.map((l) => {
            const u = users[l.id];
            const editing = Object.entries(locks).find(([, uid]) => uid === l.id);
            return (
              <div key={l.id} className="person">
                <Avatar user={u} size={32} ring />
                <div className="person__main">
                  <div className="person__name">{u.name}</div>
                  <div className="person__status">
                    {editing ? 'Editing ' + editing[0] : 'Viewing ' + l.viewing}
                  </div>
                </div>
                <span
                  className="dot-live"
                  style={{
                    background: u.color,
                    boxShadow: `0 0 0 3px color-mix(in srgb, ${u.color} 22%, transparent)`,
                  }}
                />
              </div>
            );
          })}
          <div style={{ borderTop: '1px solid var(--line)', margin: '10px 4px' }} />
          <div className="person" style={{ opacity: 0.6 }}>
            <Avatar user={users.leo} size={32} />
            <div className="person__main">
              <div className="person__name">{users.leo.name}</div>
              <div className="person__status">Last seen 2h ago</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'comments' && (
        <div className="panel__body">
          {comments.map((c) => {
            const u = users[c.author];
            return (
              <div key={c.id} className="thread" onClick={() => onOpenComment(c)}>
                <div className="thread__head">
                  <Avatar user={u} size={24} />
                  <span style={{ fontSize: 12.5, fontWeight: 700 }}>{u.name.split(' ')[0]}</span>
                  <span className="thread__where">#{c.table}</span>
                  {c.resolved && (
                    <span style={{ marginLeft: 'auto', color: 'var(--u-you)' }}>
                      <Icon name="checkCircle" size={16} />
                    </span>
                  )}
                </div>
                <div className="thread__msg">{c.msg}</div>
                <div className="thread__meta">
                  <Icon name="comment" size={13} />
                  {c.replies} replies · {c.time}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'activity' && (
        <div className="panel__body">
          {activity.map((a, i) => {
            const u = users[a.who];
            return (
              <div key={a.id} className="act">
                <div className="act__rail">
                  <Avatar user={u} size={26} />
                  {i < activity.length - 1 && <div className="act__line" />}
                </div>
                <div className="act__body">
                  <div className="act__txt">
                    <b>{a.who === 'you' ? 'You' : u.name.split(' ')[0]}</b> {a.action}{' '}
                    <b>{a.target}</b>
                  </div>
                  <div className="act__time">
                    {a.live ? (
                      <span style={{ color: 'var(--u-you)', fontWeight: 700 }}>● live now</span>
                    ) : (
                      a.time
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
