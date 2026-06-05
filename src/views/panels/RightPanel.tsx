/**
 * RightPanel — table editor (when a table is selected) + collaboration: People / Comments / Activity.
 */
import { useEffect, useState } from 'react';
import {
  useActivity,
  useComments,
  useConnection,
  useIdentity,
  useOthers,
  useSelectedRel,
  useSelection,
  useRelationships,
  useTables,
} from '@store';
import { Icon, type IconName } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';
import { AddRelationshipModal } from './AddRelationshipModal';
import { RelationshipEditorPanel } from './RelationshipEditorPanel';
import { RelationshipList } from './relationshipList';
import { TableEditorPanel } from './TableEditorPanel';

type Tab = 'table' | 'link' | 'people' | 'comments' | 'activity';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

const relTime = (ts: number): string => {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 45) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

function TabBtn({
  active,
  title,
  icon,
  badge,
  onClick,
}: {
  active: boolean;
  title: string;
  icon: IconName;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={'ptab ptab--icon' + (active ? ' active' : '')}
      title={title}
      aria-label={title}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
    >
      <Icon name={icon} size={17} />
      {badge != null && badge > 0 && <span className="ptab__badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}

export function RightPanel({
  onOpenComment,
  onShare,
  focusCommentsKey = 0,
}: {
  onOpenComment: (id: string) => void;
  onShare: () => void;
  /** Increment to switch to the Comments tab (e.g. after placing a pin). */
  focusCommentsKey?: number;
}) {
  const [tab, setTab] = useState<Tab>('people');
  /** Non-null = Add-relationship modal open; `fieldId` pre-selects that column as the FK side. */
  const [addRel, setAddRel] = useState<{ fieldId?: string } | null>(null);
  const [selected, setSelected] = useSelection();
  const [selectedRel, setSelectedRel] = useSelectedRel();
  const me = useIdentity();
  const others = useOthers();
  const tables = useTables();
  const rels = useRelationships();
  const comments = useComments();
  const activity = useActivity();
  const { connection } = useConnection();
  const open = comments.filter((c) => !c.resolved);
  const selectedTable = selected ? tables.find((t) => t.id === selected) : undefined;

  useEffect(() => {
    if (selectedRel) setTab('link');
    else if (selected) setTab('table');
  }, [selected, selectedRel]);

  useEffect(() => {
    if (focusCommentsKey > 0) setTab('comments');
  }, [focusCommentsKey]);

  return (
    <div className="panel panel--right">
      <div className="panel__tabs panel__tabs--icons">
        <div className="panel__tabs-group" role="tablist" aria-label="Schema">
          <TabBtn active={tab === 'table'} title="Table" icon="table" onClick={() => setTab('table')} />
          <TabBtn active={tab === 'link'} title="Link / relationship" icon="link" onClick={() => setTab('link')} />
        </div>
        <div className="panel__tabs-sep" aria-hidden />
        <div className="panel__tabs-group" role="tablist" aria-label="Collaboration">
          <TabBtn active={tab === 'people'} title="People" icon="users" badge={others.length + 1} onClick={() => setTab('people')} />
          <TabBtn active={tab === 'comments'} title="Comments" icon="comment" badge={open.length} onClick={() => setTab('comments')} />
          <TabBtn active={tab === 'activity'} title="Activity" icon="activity" onClick={() => setTab('activity')} />
        </div>
      </div>

      {tab === 'table' && (
        <div className="panel__body">
          {selected ? (
            <TableEditorPanel
              tableId={selected}
              onDeleted={() => setSelected(null)}
              onAddForeignKey={(fieldId) => setAddRel({ fieldId })}
            />
          ) : (
            <div className="te-empty te-empty--pad">Click a table on the canvas to edit name, columns, and indexes.</div>
          )}
        </div>
      )}

      {tab === 'link' && (
        <>
          <div className="panel__head" style={{ padding: '8px 10px 4px' }}>
            <span className="panel__title">Relationship</span>
            <Btn sm variant="primary" icon="plus" onClick={() => setAddRel({})}>
              Add
            </Btn>
          </div>
          <div className="panel__body" style={{ paddingTop: 4 }}>
            {selectedRel ? (
              <RelationshipEditorPanel relId={selectedRel} onDeleted={() => setSelectedRel(null)} />
            ) : selected ? (
              <RelationshipList
                rels={rels}
                tables={tables}
                tableId={selected}
                tableName={selectedTable?.name}
                selectedRel={selectedRel}
                onSelectRel={setSelectedRel}
              />
            ) : (
              <div className="te-empty te-empty--pad">
                Select a table or relationship line on the canvas, or use <b>Add</b> to create a link.
              </div>
            )}
          </div>
        </>
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
          {connection.status === 'local' && (
            <div style={{ padding: '14px 8px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Offline — reconnect with <b>Share</b> or check that the sync server is running.
            </div>
          )}
          {connection.status !== 'local' && others.length === 0 && (
            <div style={{ padding: '14px 8px', fontSize: 12.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>
              Only you here. Anyone who opens this same diagram (same link or dashboard card) appears
              automatically — send them the URL from <b>Share</b> if needed.
            </div>
          )}
        </div>
      )}

      {tab === 'comments' && (
        <div className="panel__body">
          {comments.length === 0 && (
            <div className="te-empty te-empty--pad">No comments yet — pick the comment tool and click the canvas to pin one.</div>
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
          {activity.length === 0 && <div className="te-empty te-empty--pad">No activity yet.</div>}
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
      {addRel && (
        <AddRelationshipModal fromTableId={selected ?? undefined} fromFieldId={addRel.fieldId} onClose={() => setAddRel(null)} />
      )}
    </div>
  );
}
