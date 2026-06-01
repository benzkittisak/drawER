/**
 * ExportModal — generate DDL for the current diagram in any dialect, with copy/download.
 * Also offers the other one-way exports (DBML/Mermaid/JSON) once those land (M3/M4).
 */
import { useMemo, useState } from 'react';
import { DIALECT_LABELS, DIALECTS, exportSql, type DialectId } from '@core';
import { useDiagram } from '@store';
import { Icon } from '@ui/Icon';
import { Btn, Modal } from '@ui/atoms';

interface ExportModalProps {
  onClose: () => void;
}

export function ExportModal({ onClose }: ExportModalProps) {
  const diagram = useDiagram();
  const [dialect, setDialect] = useState<DialectId>(diagram.dialect);
  const [copied, setCopied] = useState(false);

  const sql = useMemo(() => exportSql(diagram, dialect), [diagram, dialect]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (e.g. insecure context) — no-op
    }
  };

  const download = () => {
    const blob = new Blob([sql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name.replace(/\s+/g, '_').toLowerCase()}.${dialect}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="Export SQL"
      onClose={onClose}
      width={680}
      foot={
        <>
          <Btn icon="copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </Btn>
          <Btn variant="primary" icon="download" onClick={download}>
            Download .sql
          </Btn>
        </>
      }
    >
      <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
        {DIALECTS.map((d) => (
          <button key={d} className={dialect === d ? 'active' : ''} onClick={() => setDialect(d)}>
            {DIALECT_LABELS[d]}
          </button>
        ))}
      </div>
      <pre
        style={{
          margin: 0,
          maxHeight: 360,
          overflow: 'auto',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '12px 14px',
          fontFamily: 'var(--mono)',
          fontSize: 12.5,
          lineHeight: 1.55,
          color: 'var(--ink)',
          whiteSpace: 'pre',
        }}
      >
        {sql}
      </pre>
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="code" size={13} />
        Generated locally — clean-room engine, {DIALECT_LABELS[dialect]} dialect.
      </div>
    </Modal>
  );
}
