/**
 * AiGenerateModal — describe a schema in natural language; the sync server calls OpenAI and
 * returns SQL DDL, which we import via the clean-room SQL parser.
 */
import { useState } from 'react';
import { DIALECT_LABELS, DIALECTS, importSql, type DialectId } from '@core';
import { syncHttpBase, useDiagram, useEditorActions } from '@store';
import { Btn, Modal } from '@ui/atoms';

export function AiGenerateModal({ onClose }: { onClose: () => void }) {
  const diagram = useDiagram();
  const { loadDiagram } = useEditorActions();
  const [prompt, setPrompt] = useState('');
  const [dialect, setDialect] = useState<DialectId>(
    (DIALECTS.includes(diagram.dialect as DialectId) ? diagram.dialect : 'postgres') as DialectId,
  );
  const [busy, setBusy] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const run = async () => {
    const text = prompt.trim();
    if (!text || busy) return;

    if (diagram.tables.length > 0) {
      const ok = window.confirm(
        'Generate with AI will replace all tables and relationships in this diagram. Continue?',
      );
      if (!ok) return;
    }

    setBusy(true);
    setWarnings([]);
    try {
      const res = await fetch(`${syncHttpBase()}/api/ai/generate-schema`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, dialect }),
      });
      const body = (await res.json()) as { sql?: string; error?: string };
      if (!res.ok) {
        setWarnings([body.error ?? `Request failed (${res.status})`]);
        return;
      }
      const sql = body.sql?.trim();
      if (!sql) {
        setWarnings(['The AI returned empty SQL. Try a more specific prompt.']);
        return;
      }
      const imported = await importSql(sql, dialect);
      if (imported.diagram.tables.length === 0) {
        setWarnings(
          imported.warnings.length ? imported.warnings : ['No tables could be parsed from the generated SQL.'],
        );
        return;
      }
      loadDiagram(imported.diagram);
      if (imported.warnings.length) {
        setWarnings(imported.warnings);
      } else {
        onClose();
      }
    } catch (e) {
      setWarnings([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Generate with AI"
      onClose={onClose}
      width={640}
      foot={
        <>
          <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)' }}>
            Requires sync server with OPENAI_API_KEY. Replaces the current diagram.
          </span>
          <Btn variant="primary" icon="sparkle" onClick={run} disabled={busy || !prompt.trim()}>
            {busy ? 'Generating…' : 'Generate'}
          </Btn>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 12px', lineHeight: 1.5 }}>
        Describe the database you need (entities, relationships, constraints). We ask the model for SQL DDL and
        import it into your diagram.
      </p>
      <div className="seg" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        {DIALECTS.map((d) => (
          <button key={d} className={dialect === d ? 'active' : ''} onClick={() => setDialect(d)} disabled={busy}>
            {DIALECT_LABELS[d]}
          </button>
        ))}
      </div>
      <textarea
        autoFocus
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={busy}
        placeholder="e.g. Blog with users, posts, comments, and tags. Posts belong to users; comments belong to posts and users."
        spellCheck={false}
        style={{
          width: '100%',
          height: 140,
          resize: 'vertical',
          background: 'var(--surface-2)',
          border: '1px solid var(--line)',
          borderRadius: 10,
          padding: '12px 14px',
          fontFamily: 'inherit',
          fontSize: 13,
          color: 'var(--ink)',
          outline: 'none',
        }}
      />
      {warnings.length > 0 && (
        <div
          style={{
            marginTop: 10,
            background: '#fff1e6',
            border: '1px solid var(--accent-soft)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--accent-strong)',
          }}
        >
          {warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      )}
    </Modal>
  );
}
