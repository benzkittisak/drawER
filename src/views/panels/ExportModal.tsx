/**
 * ExportModal — export the current diagram as SQL (any dialect), DBML, Mermaid, or Markdown,
 * with copy/download. JSON export is added in M4.
 */
import { useMemo, useState } from 'react';
import {
  diagramToDbml,
  diagramToMarkdown,
  diagramToMermaid,
  DIALECT_LABELS,
  DIALECTS,
  exportSql,
  serializeToString,
  type DialectId,
} from '@core';
import { useDiagram } from '@store';
import { Icon } from '@ui/Icon';
import { Btn, Modal } from '@ui/atoms';

type Format = 'sql' | 'dbml' | 'mermaid' | 'markdown' | 'json';
const FORMATS: { id: Format; label: string; ext: string }[] = [
  { id: 'sql', label: 'SQL', ext: 'sql' },
  { id: 'dbml', label: 'DBML', ext: 'dbml' },
  { id: 'mermaid', label: 'Mermaid', ext: 'mmd' },
  { id: 'markdown', label: 'Markdown', ext: 'md' },
  { id: 'json', label: 'JSON', ext: 'drawdb.json' },
];

export function ExportModal({ onClose }: { onClose: () => void }) {
  const diagram = useDiagram();
  const [format, setFormat] = useState<Format>('sql');
  const [dialect, setDialect] = useState<DialectId>(diagram.dialect);
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => {
    switch (format) {
      case 'sql':
        return exportSql(diagram, dialect);
      case 'dbml':
        return diagramToDbml(diagram);
      case 'mermaid':
        return diagramToMermaid(diagram);
      case 'markdown':
        return diagramToMarkdown(diagram);
      case 'json':
        return serializeToString(diagram);
    }
  }, [diagram, format, dialect]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const download = () => {
    const ext = format === 'sql' ? `${dialect}.sql` : FORMATS.find((f) => f.id === format)!.ext;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${diagram.name.replace(/\s+/g, '_').toLowerCase()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      title="Export"
      onClose={onClose}
      width={680}
      foot={
        <>
          <Btn icon="copy" onClick={copy}>
            {copied ? 'Copied!' : 'Copy'}
          </Btn>
          <Btn variant="primary" icon="download" onClick={download}>
            Download
          </Btn>
        </>
      }
    >
      <div className="seg" style={{ marginBottom: 10 }}>
        {FORMATS.map((f) => (
          <button key={f.id} className={format === f.id ? 'active' : ''} onClick={() => setFormat(f.id)}>
            {f.label}
          </button>
        ))}
      </div>
      {format === 'sql' && (
        <div className="seg" style={{ marginBottom: 12, flexWrap: 'wrap' }}>
          {DIALECTS.map((d) => (
            <button key={d} className={dialect === d ? 'active' : ''} onClick={() => setDialect(d)}>
              {DIALECT_LABELS[d]}
            </button>
          ))}
        </div>
      )}
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
        {content}
      </pre>
      <div style={{ marginTop: 8, fontSize: 11.5, color: 'var(--ink-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="code" size={13} />
        Generated locally — clean-room engine.
      </div>
    </Modal>
  );
}
