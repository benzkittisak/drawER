/**
 * DatabaseImportPanel — connect to a live database via the sync server, pick a database/schema,
 * and import metadata into the current diagram.
 */
import { useRef, useState, type ChangeEvent, type CSSProperties } from 'react';
import {
  DIALECT_LABELS,
  DIALECTS,
  importFromNeutralSchema,
  type DialectId,
  type NeutralSchema,
} from '@core';
import { syncHttpBase, useDiagram, useEditorActions } from '@store';
import { Btn } from '@ui/atoms';

type ConnectResponse = {
  ok?: boolean;
  databases?: string[];
  schemas?: string[];
  serverVersion?: string;
  warnings?: string[];
  error?: string;
};

type IntrospectResponse = {
  neutral?: NeutralSchema;
  schemas?: string[];
  warnings?: string[];
  error?: string;
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--surface-2)',
  border: '1px solid var(--line)',
  borderRadius: 8,
  fontFamily: 'var(--mono)',
  fontSize: 12,
  color: 'var(--ink)',
  outline: 'none',
};

export function DatabaseImportPanel({
  onImported,
  onWarnings,
}: {
  onImported: () => void;
  onWarnings: (messages: string[]) => void;
}) {
  const diagram = useDiagram();
  const { loadDiagram } = useEditorActions();
  const [dialect, setDialect] = useState<DialectId>(
    (DIALECTS.includes(diagram.dialect as DialectId) ? diagram.dialect : 'postgres') as DialectId,
  );
  const [connection, setConnection] = useState('');
  const [databases, setDatabases] = useState<string[]>([]);
  const [schemas, setSchemas] = useState<string[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [selectedSchema, setSelectedSchema] = useState('');
  const [serverVersion, setServerVersion] = useState('');
  const [busy, setBusy] = useState(false);
  const [connectHints, setConnectHints] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const api = (path: string) => `${syncHttpBase()}${path}`;

  const connect = async () => {
    if (busy) return;
    if (dialect === 'sqlite') {
      setDatabases(['main']);
      setSchemas([]);
      setSelectedDb('main');
      setConnectHints(['Upload a .db or .sqlite file below.']);
      return;
    }
    const conn = connection.trim();
    if (!conn) {
      onWarnings(['Enter a connection URL (e.g. postgres://user:pass@host:5432/mydb).']);
      return;
    }
    setBusy(true);
    onWarnings([]);
    setConnectHints([]);
    try {
      const res = await fetch(api('/api/db/connect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dialect, connection: conn }),
      });
      const body = (await res.json()) as ConnectResponse;
      if (!res.ok) {
        onWarnings([body.error ?? `Connect failed (${res.status})`]);
        return;
      }
      const dbs = body.databases ?? [];
      setDatabases(dbs);
      setSchemas(body.schemas ?? []);
      setSelectedDb(dbs[0] ?? '');
      setSelectedSchema((body.schemas ?? [])[0] ?? '');
      setServerVersion(body.serverVersion ?? '');
      const hints = [...(body.warnings ?? [])];
      if (dbs.length === 0) hints.push('No databases returned.');
      setConnectHints(hints);
    } catch (e) {
      onWarnings([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  };

  const runImport = async (neutral: NeutralSchema, extraWarnings: string[] = []) => {
    const imported = await importFromNeutralSchema(neutral, dialect);
    if (imported.diagram.tables.length === 0) {
      onWarnings(
        imported.warnings.length
          ? imported.warnings
          : ['No tables found in the selected database.'],
      );
      return;
    }
    loadDiagram(imported.diagram);
    const all = [...extraWarnings, ...imported.warnings];
    if (all.length) onWarnings(all);
    else onImported();
  };

  const importSelected = async () => {
    if (busy || dialect === 'sqlite') return;
    const conn = connection.trim();
    if (!conn || !selectedDb) {
      onWarnings(['Connect first and select a database.']);
      return;
    }
    if (diagram.tables.length > 0) {
      const ok = window.confirm(
        'Importing from a database will replace all tables and relationships in this diagram. Continue?',
      );
      if (!ok) return;
    }
    setBusy(true);
    onWarnings([]);
    try {
      const res = await fetch(api('/api/db/introspect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dialect,
          connection: conn,
          database: selectedDb,
          schema: selectedSchema || undefined,
        }),
      });
      const body = (await res.json()) as IntrospectResponse;
      if (!res.ok) {
        onWarnings([body.error ?? `Import failed (${res.status})`]);
        return;
      }
      if (!body.neutral) {
        onWarnings(['Server returned no schema.']);
        return;
      }
      await runImport(body.neutral, body.warnings ?? []);
    } catch (e) {
      onWarnings([e instanceof Error ? e.message : String(e)]);
    } finally {
      setBusy(false);
    }
  };

  const onSqliteFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || busy) return;
    if (diagram.tables.length > 0) {
      const ok = window.confirm(
        'Importing a SQLite file will replace all tables and relationships in this diagram. Continue?',
      );
      if (!ok) return;
    }
    setBusy(true);
    onWarnings([]);
    try {
      const buf = await file.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
      const data = btoa(binary);
      const res = await fetch(api('/api/db/introspect-sqlite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, filename: file.name }),
      });
      const body = (await res.json()) as IntrospectResponse;
      if (!res.ok) {
        onWarnings([body.error ?? `Import failed (${res.status})`]);
        return;
      }
      if (!body.neutral) {
        onWarnings(['Server returned no schema.']);
        return;
      }
      await runImport(body.neutral, body.warnings ?? []);
    } catch (err) {
      onWarnings([err instanceof Error ? err.message : String(err)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="seg" style={{ marginBottom: 10, flexWrap: 'wrap' }}>
        {DIALECTS.map((d) => (
          <button
            key={d}
            type="button"
            className={dialect === d ? 'active' : ''}
            onClick={() => {
              setDialect(d);
              setDatabases([]);
              setSchemas([]);
              setSelectedDb('');
              setConnectHints([]);
            }}
          >
            {DIALECT_LABELS[d]}
          </button>
        ))}
      </div>

      {dialect === 'sqlite' ? (
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 8 }}>
            SQLite has no network server — upload a <code>.db</code> / <code>.sqlite</code> file. The sync server
            reads it temporarily and does not store it.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".db,.sqlite,.sqlite3,application/octet-stream"
            style={{ display: 'none' }}
            onChange={onSqliteFile}
          />
          <Btn icon="download" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Importing…' : 'Choose SQLite file…'}
          </Btn>
        </div>
      ) : (
        <>
          <label style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
            Connection URL
          </label>
          <input
            type="text"
            value={connection}
            onChange={(e) => setConnection(e.target.value)}
            placeholder="postgres://user:password@host:5432/"
            spellCheck={false}
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <Btn icon="link" disabled={busy} onClick={connect}>
              {busy ? 'Working…' : 'Connect'}
            </Btn>
            {databases.length > 0 && (
              <Btn variant="primary" icon="download" disabled={busy} onClick={importSelected}>
                Import selected
              </Btn>
            )}
          </div>
          {serverVersion && (
            <p style={{ fontSize: 11, color: 'var(--ink-3)', marginBottom: 8 }}>{serverVersion}</p>
          )}
          {databases.length > 0 && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
                  Database
                </label>
                <select
                  value={selectedDb}
                  onChange={(e) => setSelectedDb(e.target.value)}
                  style={inputStyle}
                >
                  {databases.map((db) => (
                    <option key={db} value={db}>
                      {db}
                    </option>
                  ))}
                </select>
              </div>
              {schemas.length > 0 && (
                <div style={{ flex: 1, minWidth: 140 }}>
                  <label style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
                    Schema
                  </label>
                  <select
                    value={selectedSchema}
                    onChange={(e) => setSelectedSchema(e.target.value)}
                    style={inputStyle}
                  >
                    {schemas.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {connectHints.map((h, i) => (
            <p key={i} style={{ fontSize: 11.5, color: 'var(--ink-3)', marginBottom: 4 }}>
              {h}
            </p>
          ))}
        </>
      )}
      <p style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 8 }}>
        Requires <code>bun run sync</code> with <code>ENABLE_REMOTE_DB_IMPORT=1</code>. Use a read-only DB account.
        One-shot import — not live sync.
      </p>
    </div>
  );
}
