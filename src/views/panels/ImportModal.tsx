/**
 * ImportModal — paste SQL DDL or DBML and load it as the current diagram.
 * Uses the clean-room importers; surfaces parser warnings.
 */
import { useRef, useState, type ChangeEvent } from 'react';
import { dbmlToDiagram, DIALECT_LABELS, DIALECTS, importSql, parse, type DialectId } from '@core';
import { useEditorActions } from '@store';
import { Btn, Modal } from '@ui/atoms';
import { DatabaseImportPanel } from './DatabaseImportPanel';

type Source = 'sql' | 'dbml' | 'json' | 'database';

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { loadDiagram } = useEditorActions();
  const [source, setSource] = useState<Source>('sql');
  const [dialect, setDialect] = useState<DialectId>('postgres');
  const [text, setText] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Read a picked file into the textarea; auto-select the source from its extension/content so a
  // dropped `.drawdb.json` (e.g. an exported diagram or a converted schema) imports in one click.
  const onPickFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    setText(content);
    setWarnings([]);
    if (file.name.endsWith('.json') || /"app"\s*:\s*"drawDB-live"/.test(content)) setSource('json');
    else if (file.name.endsWith('.dbml')) setSource('dbml');
    else if (file.name.endsWith('.sql')) setSource('sql');
  };

  const run = async () => {
    if (!text.trim()) return;
    if (source === 'json') {
      try {
        loadDiagram(parse(text));
        onClose();
      } catch (e) {
        setWarnings([e instanceof Error ? e.message : String(e)]);
      }
      return;
    }
    const res = source === 'sql' ? await importSql(text, dialect) : await dbmlToDiagram(text, dialect);
    if (res.diagram.tables.length === 0) {
      setWarnings(res.warnings.length ? res.warnings : ['No tables found in input.']);
      return;
    }
    loadDiagram(res.diagram);
    if (res.warnings.length) {
      setWarnings(res.warnings);
    } else {
      onClose();
    }
  };

  return (
    <Modal
      title="Import schema"
      onClose={onClose}
      width={680}
      foot={
        <>
          <span style={{ flex: 1, fontSize: 11.5, color: 'var(--ink-3)' }}>
            {source === 'database'
              ? 'Connect to a database via the sync server, or upload SQLite.'
              : 'Paste or load a CREATE TABLE script, DBML, or a .drawdb.json. Replaces the current diagram.'}
          </span>
          {source !== 'database' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".json,.sql,.dbml,.txt,application/json,text/plain"
                style={{ display: 'none' }}
                onChange={onPickFile}
              />
              <Btn icon="download" onClick={() => fileRef.current?.click()}>
                Load file…
              </Btn>
              <Btn variant="primary" icon="download" onClick={run}>
                Import
              </Btn>
            </>
          )}
        </>
      }
    >
      <div className="seg" style={{ marginBottom: 10 }}>
        <button className={source === 'sql' ? 'active' : ''} onClick={() => setSource('sql')}>
          SQL
        </button>
        <button className={source === 'dbml' ? 'active' : ''} onClick={() => setSource('dbml')}>
          DBML
        </button>
        <button className={source === 'json' ? 'active' : ''} onClick={() => setSource('json')}>
          JSON
        </button>
        <button className={source === 'database' ? 'active' : ''} onClick={() => setSource('database')}>
          Database
        </button>
      </div>
      {source === 'database' && (
        <DatabaseImportPanel onImported={onClose} onWarnings={setWarnings} />
      )}
      {source === 'sql' && (
        <div className="seg" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
          {DIALECTS.map((d) => (
            <button key={d} className={dialect === d ? 'active' : ''} onClick={() => setDialect(d)}>
              {DIALECT_LABELS[d]}
            </button>
          ))}
        </div>
      )}
      {source !== 'database' && (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={
            source === 'sql'
              ? 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  ...\n);'
              : 'Table users {\n  id int [pk]\n}'
          }
          spellCheck={false}
          style={{
            width: '100%',
            height: 240,
            resize: 'vertical',
            background: 'var(--surface-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '12px 14px',
            fontFamily: 'var(--mono)',
            fontSize: 12.5,
            color: 'var(--ink)',
            outline: 'none',
          }}
        />
      )}
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
