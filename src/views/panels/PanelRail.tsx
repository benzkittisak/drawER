/**
 * PanelRail / PanelCollapseBtn — edge affordances to show or hide left/right sidebars.
 */
import { Icon } from '@ui/Icon';

interface PanelRailProps {
  side: 'left' | 'right';
  onToggle: () => void;
}

export function PanelRail({ side, onToggle }: PanelRailProps) {
  const label = side === 'left' ? 'Show tables panel' : 'Show collaboration panel';
  return (
    <button
      type="button"
      className={`panel-rail panel-rail--${side}`}
      onClick={onToggle}
      title={label}
      aria-label={label}
    >
      <Icon name={side === 'left' ? 'chevronRight' : 'chevronLeft'} size={16} />
    </button>
  );
}

interface PanelCollapseBtnProps {
  side: 'left' | 'right';
  onClick: () => void;
}

export function PanelCollapseBtn({ side, onClick }: PanelCollapseBtnProps) {
  const label = side === 'left' ? 'Hide tables panel' : 'Hide collaboration panel';
  return (
    <button
      type="button"
      className={`panel-collapse-btn panel-collapse-btn--${side}`}
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <Icon name={side === 'left' ? 'chevronLeft' : 'chevronRight'} size={14} />
    </button>
  );
}
