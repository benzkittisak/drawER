/**
 * TopBar — brand, breadcrumb, panel toggles, real presence avatars, Share.
 */
import { useConnection, useIdentity, useOthers } from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn } from '@ui/atoms';

const STATUS = {
  connected: { label: 'Live · synced', color: 'var(--u-you)' },
  connecting: { label: 'Connecting…', color: '#d97706' },
  local: { label: 'Offline', color: 'var(--ink-4)' },
} as const;

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

interface TopBarProps {
  doc: string;
  onDashboard: () => void;
  onShare: () => void;
  onHistory: () => void;
  onExport: () => void;
  onImport: () => void;
  leftOpen: boolean;
  rightOpen: boolean;
  onToggleLeft: () => void;
  onToggleRight: () => void;
}

const activeToggle = { color: 'var(--accent-strong)', background: 'var(--accent-soft)' };

export function TopBar({
  doc,
  onDashboard,
  onShare,
  onHistory,
  onExport,
  onImport,
  leftOpen,
  rightOpen,
  onToggleLeft,
  onToggleRight,
}: TopBarProps) {
  const me = useIdentity();
  const others = useOthers();
  const { connection } = useConnection();
  const status = STATUS[connection.status];
  const online = [
    { id: me.id, name: 'You', short: 'ME', color: me.color },
    ...others.map((o) => ({ id: o.user.id, name: o.user.name, short: initials(o.user.name), color: o.user.color })),
  ];
  return (
    <div className="topbar">
      <div className="brand" style={{ cursor: 'pointer' }} onClick={onDashboard} title="All diagrams">
        <div className="brand__mark">
          <Icon name="table" size={15} />
        </div>
        <div className="brand__name">
          draw<b>DB</b> Live
        </div>
      </div>
      <div className="crumb">
        <span className="crumb__sep">/</span>
        <div className="crumb__doc">
          <b>{doc}</b>
          <Icon name="chevronDown" size={14} style={{ color: 'var(--ink-3)' }} />
        </div>
        <span className="saved">
          <span className="dot" style={{ background: status.color }} />
          {status.label}
        </span>
      </div>
      <div className="spacer" />

      <Btn
        iconOnly
        variant="ghost"
        icon="table"
        title="Toggle tables panel"
        onClick={onToggleLeft}
        style={leftOpen ? activeToggle : undefined}
      />
      <Btn iconOnly variant="ghost" icon="folder" title="Import SQL / DBML" onClick={onImport} />
      <Btn iconOnly variant="ghost" icon="code" title="Export" onClick={onExport} />
      <Btn iconOnly variant="ghost" icon="clock" title="Version history" onClick={onHistory} />
      <Btn
        iconOnly
        variant="ghost"
        icon="users"
        title="Toggle collaboration panel"
        onClick={onToggleRight}
        style={rightOpen ? activeToggle : undefined}
      />

      <div style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />

      <div className="presence">
        {online.slice(0, 4).map((u) => (
          <Avatar key={u.id} user={u} size={28} ring />
        ))}
      </div>
      <Btn variant="primary" icon="share" onClick={onShare} style={{ marginLeft: 6 }}>
        Share
      </Btn>
    </div>
  );
}
