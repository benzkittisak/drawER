/**
 * ShareModal — invite teammates + copyable share link. Ported from editor-panels.jsx.
 * (Roles are UI-present; enforcement arrives with accounts in M7 — see plan.)
 */
import { useState } from 'react';
import type { DemoUser } from '@data/types';
import { Icon } from '@ui/Icon';
import { Avatar, Btn, Modal } from '@ui/atoms';

interface ShareModalProps {
  users: Record<string, DemoUser>;
  onClose: () => void;
}

export function ShareModal({ users, onClose }: ShareModalProps) {
  const [role] = useState('Can edit');
  const members = [
    { u: users.you, role: 'Owner' },
    { u: users.maya, role: 'Can edit' },
    { u: users.kenji, role: 'Can edit' },
    { u: users.aisha, role: 'Can comment' },
    { u: users.leo, role: 'Can view' },
  ];

  return (
    <Modal
      title="Share “Core Product DB”"
      onClose={onClose}
      foot={
        <>
          <div className="link-box" style={{ flex: 1 }}>
            <Icon name="link" size={15} style={{ color: 'var(--ink-3)' }} />
            <code>drawdb.live/d/core-product-db</code>
            <Btn sm icon="copy">
              Copy
            </Btn>
          </div>
          <Btn variant="primary" onClick={onClose}>
            Done
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', gap: 8 }}>
        <input className="input" placeholder="Invite by email…" autoFocus />
        <button className="select">
          {role}
          <Icon name="chevronDown" size={14} />
        </button>
        <Btn variant="primary">Invite</Btn>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {members.map((m) => (
          <div key={m.u.id} className="person" style={{ padding: '7px 4px' }}>
            <Avatar user={m.u} size={32} />
            <div className="person__main">
              <div className="person__name">{m.u.name === 'You' ? 'You' : m.u.name}</div>
              <div className="person__status">{m.u.role}</div>
            </div>
            <button
              className="select"
              disabled={m.role === 'Owner'}
              style={m.role === 'Owner' ? { opacity: 0.6 } : undefined}
            >
              {m.role}
              {m.role !== 'Owner' && <Icon name="chevronDown" size={14} />}
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
