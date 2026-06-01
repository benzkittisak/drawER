/**
 * CanvasFind — search tables on the canvas (top-right overlay) and focus the camera on pick.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Table } from '@core';
import { Icon } from '@ui/Icon';

const MAX_RESULTS = 8;

interface CanvasFindProps {
  tables: Table[];
  onPick: (tableId: string) => void;
}

export function CanvasFind({ tables, onPick }: CanvasFindProps) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [];
    return tables.filter((t) => t.name.toLowerCase().includes(needle)).slice(0, MAX_RESULTS);
  }, [tables, q]);

  const pick = useCallback(
    (tableId: string) => {
      onPick(tableId);
      setQ('');
      setOpen(false);
      setActiveIdx(0);
      inputRef.current?.blur();
    },
    [onPick],
  );

  useEffect(() => {
    setActiveIdx(0);
  }, [results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) {
        if (el !== inputRef.current) return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setOpen(false);
        setQ('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, []);

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, Math.max(0, results.length - 1)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      pick(results[activeIdx]?.id ?? results[0].id);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQ('');
      inputRef.current?.blur();
    }
  };

  const showMenu = open && q.trim().length > 0;

  return (
    <div className="canvas-find" ref={rootRef}>
      <div className="canvas-find__field search">
        <Icon name="search" size={15} />
        <input
          ref={inputRef}
          type="search"
          placeholder="Find table…"
          title="Find table (Ctrl+F)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onInputKeyDown}
        />
      </div>
      {showMenu && (
        <div className="canvas-find__menu" role="listbox">
          {results.length === 0 ? (
            <div className="canvas-find__empty">No tables match</div>
          ) : (
            results.map((t, i) => (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={'canvas-find__item' + (i === activeIdx ? ' canvas-find__item--active' : '')}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => pick(t.id)}
              >
                <span className="canvas-find__swatch" style={{ background: t.color ?? 'var(--ink-4)' }} />
                <span className="canvas-find__name">{t.name}</span>
                <span className="canvas-find__meta">{t.fields.length} fields</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
