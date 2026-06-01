/**
 * RelationshipContextMenu — right-click menu on a relationship line: set cardinality or delete.
 */
import { useEffect, useRef } from 'react';
import { CARDINALITIES, CARDINALITY_LABEL, type Cardinality } from '@core';
import { useEditorActions, useRelationship } from '@store';
import { Icon } from '@ui/Icon';

export function RelationshipContextMenu({
  relId,
  x,
  y,
  onClose,
}: {
  relId: string;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const rel = useRelationship(relId);
  const { updateRelationship, deleteEntity } = useEditorActions();

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScroll = () => onClose();
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  if (!rel) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 800;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 600;
  const left = Math.min(x, vw - 200);
  const top = Math.min(y, vh - 280);

  const setCard = (c: Cardinality) => {
    updateRelationship(relId, { cardinality: c });
    onClose();
  };

  return (
    <div ref={ref} className="ctx-menu" style={{ left, top }} role="menu">
      <div className="ctx-menu__title">Relationship</div>
      {CARDINALITIES.map((c) => (
        <button
          key={c}
          type="button"
          role="menuitemradio"
          aria-checked={rel.cardinality === c}
          className={'ctx-menu__item' + (rel.cardinality === c ? ' ctx-menu__item--active' : '')}
          onClick={() => setCard(c)}
        >
          <span className="ctx-menu__mono">{CARDINALITY_LABEL[c]}</span>
          {rel.cardinality === c && <Icon name="check" size={14} />}
        </button>
      ))}
      <div className="ctx-menu__sep" />
      <button
        type="button"
        role="menuitem"
        className="ctx-menu__item ctx-menu__item--danger"
        onClick={() => {
          deleteEntity(relId);
          onClose();
        }}
      >
        <Icon name="trash" size={14} />
        Delete relationship
      </button>
    </div>
  );
}
