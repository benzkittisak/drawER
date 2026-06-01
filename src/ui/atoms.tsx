/**
 * Shared UI atoms — typed ports of docs/design-reference/ui.jsx.
 * Avatar, Btn, Modal, Pop. Styling comes from src/styles/styles.css.
 */
import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Icon, type IconName } from './Icon';

export { EditableTitle, type EditableTitleProps } from './EditableTitle';

/** Minimal person shape an Avatar needs (the seed/awareness user). */
export interface AvatarUser {
  id: string;
  name: string;
  short: string;
  color: string;
}

interface AvatarProps {
  user: AvatarUser;
  size?: number;
  ring?: boolean;
  title?: string;
  style?: CSSProperties;
}

export function Avatar({ user, size = 28, ring = false, title, style }: AvatarProps) {
  const css: CSSProperties = { '--sz': size + 'px', background: user.color, ...style } as CSSProperties;
  if (ring) (css as Record<string, string>)['--_c'] = user.color;
  return (
    <div
      className={'avatar' + (ring ? ' avatar--ring' : '')}
      style={css}
      title={title || user.name}
      data-uid={user.id}
    >
      {user.short}
    </div>
  );
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: IconName;
  variant?: 'primary' | 'ghost';
  sm?: boolean;
  iconOnly?: boolean;
  children?: ReactNode;
}

export function Btn({ icon, variant, sm, iconOnly, children, className = '', ...rest }: BtnProps) {
  let cls = 'btn';
  if (variant === 'primary') cls += ' btn--primary';
  if (variant === 'ghost') cls += ' btn--ghost';
  if (sm) cls += ' btn--sm';
  if (iconOnly) cls += ' btn--icon';
  if (className) cls += ' ' + className;
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} size={sm ? 15 : 16} />}
      {children}
    </button>
  );
}

interface PopProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}

export function Pop({ open, onClose, children, style, className = '' }: PopProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', h);
    document.addEventListener('keydown', k);
    return () => {
      document.removeEventListener('mousedown', h);
      document.removeEventListener('keydown', k);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      className={'pop ' + className}
      style={{
        position: 'absolute',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: '11px',
        boxShadow: 'var(--shadow-pop)',
        zIndex: 120,
        padding: '6px',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  foot?: ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, foot, width }: ModalProps) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="scrim" onMouseDown={onClose}>
      <div
        className="modal pop"
        style={width ? { width } : undefined}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <Btn iconOnly sm variant="ghost" icon="x" onClick={onClose} />
        </div>
        <div className="modal__body">{children}</div>
        {foot && <div className="modal__foot">{foot}</div>}
      </div>
    </div>
  );
}
