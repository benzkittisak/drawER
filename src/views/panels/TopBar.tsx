/**
 * TopBar — brand, breadcrumb, panel toggles, real presence avatars, Share.
 */
import {
  useConnection,
  useDiagramMeta,
  useEditorActions,
  useIdentity,
  useOthers,
  useReadonly,
} from '@store';
import { Icon } from '@ui/Icon';
import { Avatar, Btn, EditableTitle } from '@ui/atoms';

const STATUS = {
  connected: { label: 'Live · synced', color: 'var(--u-you)' },
  connecting: { label: 'Connecting…', color: '#d97706' },
  local: { label: 'Offline', color: 'var(--ink-4)' },
} as const;

const initials = (n: string): string =>
  n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || 'NA';

interface TopBarProps {
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
  const { name } = useDiagramMeta();
  const { renameDiagram } = useEditorActions();
  const readonly = useReadonly();
  const me = useIdentity();
  const others = useOthers();
  const { connection } = useConnection();
  const status = STATUS[connection.status];
  const online = [
    { id: 'local', name: 'You', short: 'ME', color: me.color },
    ...others.map((o) => ({
      id: `peer-${o.clientId}`,
      name: o.user.name,
      short: initials(o.user.name),
      color: o.user.color,
    })),
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
        <EditableTitle
          className="crumb__doc"
          value={name}
          onCommit={renameDiagram}
          activateOn="click"
          disabled={readonly}
          suffix={<Icon name="chevronDown" size={14} style={{ color: 'var(--ink-3)' }} />}
        />
        <span className="saved">
          <span className="dot" style={{ background: status.color }} />
          {status.label}
        </span>
      </div>
      <div className="spacer" />

      <Btn
        iconOnly
        variant="ghost"
        icon="grid"
        title={leftOpen ? 'Hide schema panel' : 'Show schema panel'}
        aria-expanded={leftOpen}
        aria-controls="editor-left-panel"
        onClick={onToggleLeft}
        style={leftOpen ? activeToggle : undefined}
      />
      <Btn iconOnly variant="ghost" icon="sql" title="Import SQL / DBML" onClick={onImport} />
      <Btn iconOnly variant="ghost" icon="download" title="Export diagram" onClick={onExport} />
      <Btn iconOnly variant="ghost" icon="clock" title="Version history" onClick={onHistory} />
      <Btn
        iconOnly
        variant="ghost"
        icon="edit"
        title={rightOpen ? 'Hide inspector panel' : 'Show inspector panel'}
        aria-expanded={rightOpen}
        aria-controls="editor-right-panel"
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
