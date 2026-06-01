/**
 * ShareModal — copy the diagram link, embed iframe code, and manage the live session.
 */
import { useEffect, useMemo, useState } from 'react';
import { useConnection, useIdentity, useOthers } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn, Modal } from '@ui/atoms';

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

const EMBED_W = 960;
const EMBED_H = 640;

export function ShareModal({ onClose }: { onClose: () => void }) {
  const { connection, shareRoom, embedUrl, leaveRoom } = useConnection();
  const others = useOthers();
  const me = useIdentity();
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState<'link' | 'embed' | null>(null);

  const isLive = connection.status !== 'local';
  const embedLink = embedUrl();
  const embedCode = useMemo(
    () =>
      embedLink
        ? `<iframe src="${embedLink}" width="${EMBED_W}" height="${EMBED_H}" style="border:0" loading="lazy" title="drawER diagram"></iframe>`
        : '',
    [embedLink],
  );

  useEffect(() => {
    if (isLive) setLink(shareRoom());
  }, [isLive, shareRoom]);

  const reconnect = () => setLink(shareRoom());

  const copyText = async (text: string, which: 'link' | 'embed') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
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
        isLive ? (
          <>
            <div className="link-box" style={{ flex: 1 }}>
              <Icon name="link" size={15} style={{ color: 'var(--ink-3)' }} />
              <code>{link}</code>
              <Btn sm icon="copy" onClick={() => copyText(link, 'link')}>
                {copied === 'link' ? 'Copied!' : 'Copy'}
              </Btn>
            </div>
            <Btn variant="primary" onClick={onClose}>
              Done
            </Btn>
          </>
        ) : (
          <Btn variant="primary" icon="share" onClick={reconnect} style={{ marginLeft: 'auto' }}>
            Connect
          </Btn>
        )
      }
    >
      {!isLive && (
        <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6 }}>
          Not connected to the sync server — edits stay local until you connect. Teammates on the
          same diagram appear automatically once you are online.
          <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)' }}>
            Run <span style={{ fontFamily: 'var(--mono)' }}>bun run sync</span> (or Docker Compose)
            and set <span style={{ fontFamily: 'var(--mono)' }}>VITE_SYNC_URL</span> if needed.
          </div>
        </div>
      )}

      {isLive && (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 16 }}>
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

          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6, color: 'var(--ink-2)' }}>Embed on your site</div>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5, margin: '0 0 8px' }}>
            Read-only viewer. Anyone with this link can view the diagram (same as the share link).
          </p>
          <div className="link-box link-box--stack">
            <code style={{ fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{embedCode}</code>
            <Btn sm icon="copy" onClick={() => copyText(embedCode, 'embed')} style={{ alignSelf: 'flex-end' }}>
              {copied === 'embed' ? 'Copied!' : 'Copy embed code'}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  );
}
