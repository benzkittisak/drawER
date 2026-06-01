/**
 * Inline editable title — click or double-click to edit, Enter/blur to commit, Escape to cancel.
 */
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from 'react';

const DEFAULT_FALLBACK = 'Untitled diagram';

function normalizeName(raw: string, fallback: string): string {
  const t = raw.trim();
  return t || fallback;
}

export interface EditableTitleProps {
  value: string;
  onCommit: (name: string) => void;
  activateOn?: 'click' | 'dblclick';
  disabled?: boolean;
  fallback?: string;
  className?: string;
  title?: string;
  /** Extra content after the title (e.g. chevron) — hidden while editing. */
  suffix?: ReactNode;
}

export function EditableTitle({
  value,
  onCommit,
  activateOn = 'click',
  disabled = false,
  fallback = DEFAULT_FALLBACK,
  className = '',
  title,
  suffix,
}: EditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = (e: MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    setDraft(value);
    setEditing(true);
  };

  const commit = () => {
    setEditing(false);
    const next = normalizeName(draft, fallback);
    if (next !== value) onCommit(next);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  };

  if (disabled) {
    return (
      <div className={className} title={title}>
        <b>{value}</b>
        {suffix}
      </div>
    );
  }

  if (editing) {
    return (
      <div
        className={className}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="editable-title__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label="Diagram name"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  const activateProps =
    activateOn === 'dblclick'
      ? { onDoubleClick: startEdit, title: title ?? 'Double-click to rename' }
      : { onClick: startEdit, title: title ?? 'Click to rename' };

  return (
    <div className={`editable-title ${className}`.trim()} {...activateProps}>
      <b>{value}</b>
      {suffix}
    </div>
  );
}
