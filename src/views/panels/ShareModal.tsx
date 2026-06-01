/**
 * ShareModal — start/stop a live collaboration session and share the join link.
 *
 * "Start live session" attaches the websocket provider to the current doc (the same offline
 * diagram becomes a shared room). Anyone who opens the link joins the same room and syncs.
 * Requires the sync server (`npm run sync`) or a configured VITE_SYNC_URL.
 */
import { useEffect, useState } from 'react';
import { useConnection, useIdentity, useOthers } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn, Modal } from '@ui/atoms';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

export function ShareModal({ onClose }: { onClose: () => void }) {
  const { connection, shareRoom, leaveRoom } = useConnection();
  const others = useOthers();
  const me = useIdentity();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connection.isShared) setLink(shareRoom());
  }, [connection.isShared, shareRoom]);

  const start = () => setLink(shareRoom());
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const statusText =
    connection.status === 'connected'
      ? `Live · ${others.length + 1} here`
      : connection.status === 'connecting'
        ? 'Connecting…'
        : 'Not connected';

  return (
    <Modal
      title="Share diagram"
      onClose={onClose}
      foot={
        connection.isShared ? (
          <>
            <div className="link-box" style={{ flex: 1 }}>
              <Icon name="link" size={15} style={{ color: 'var(--ink-3)' }} />
              <code>{link}</code>
              <Btn sm icon="copy" onClick={copy}>
                {copied ? 'Copied!' : 'Copy'}
              </Btn>
            </div>
            <Btn variant="primary" onClick={onClose}>
              Done
            </Btn>
          </>
        ) : (
          <Btn variant="primary" icon="share" onClick={start} style={{ marginLeft: 'auto' }}>
            Start live session
          </Btn>
        )
      }
    >
      {!connection.isShared && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Start a live session to edit this diagram with your team in real time — you'll see each
          other's cursors and changes instantly. Share the generated link to invite people.
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)' }}>
            Needs a sync server: run <span style={{ fontFamily: 'var(--mono)' }}>npm run sync</span>{' '}
            (or set <span style={{ fontFamily: 'var(--mono)' }}>VITE_SYNC_URL</span>).
          </div>
        </div>
      )}

      {connection.isShared && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              className="dot-live"
              style={{ background: connection.status === 'connected' ? 'var(--u-you)' : 'var(--ink-4)' }}
            />
            <span style={{ fontSize: 13, fontWeight: 700 }}>{statusText}</span>
            <Btn sm variant="ghost" onClick={leaveRoom} style={{ marginLeft: 'auto' }}>
              Stop sharing
            </Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div className="person" style={{ padding: '7px 4px' }}>
              <Avatar user={{ id: me.id, name: 'You', short: 'ME', color: me.color }} size={32} ring />
              <div className="person__main">
                <div className="person__name">You</div>
                <div className="person__status">{me.name}</div>
              </div>
              <span className="dot-live" />
            </div>
            {others.map((o) => (
              <div key={o.clientId} className="person" style={{ padding: '7px 4px' }}>
                <Avatar
                  user={{ id: o.user.id, name: o.user.name, short: initials(o.user.name), color: o.user.color }}
                  size={32}
                />
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
          </div>
        </>
      )}
    </Modal>
  );
}
