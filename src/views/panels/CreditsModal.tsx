/**
 * CreditsModal — third-party license attribution (permissive licenses require it) + the
 * clean-room note. Keep this list in sync with package.json dependencies.
 */
import { Modal } from '@ui/atoms';

const CREDITS: { name: string; license: string }[] = [
  { name: 'React', license: 'MIT' },
  { name: 'Vite', license: 'MIT' },
  { name: 'TypeScript', license: 'Apache-2.0' },
  { name: 'zustand', license: 'MIT' },
  { name: 'Yjs', license: 'MIT' },
  { name: 'y-indexeddb', license: 'MIT' },
  { name: 'y-websocket', license: 'MIT' },
  { name: 'y-protocols', license: 'MIT' },
  { name: 'node-sql-parser', license: 'Apache-2.0' },
  { name: '@dbml/core', license: 'Apache-2.0' },
  { name: 'dagre', license: 'MIT' },
];

export function CreditsModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About drawDB Live" onClose={onClose} width={460}>
      <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.6, marginTop: 0 }}>
        A real-time collaborative ER diagram editor. drawDB Live is an independent, clean-room
        implementation and is not affiliated with drawdb. The SQL engine was written from vendor
        documentation; no third-party copyleft code is included.
      </p>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '14px 0 8px' }}>
        Open-source libraries
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {CREDITS.map((c) => (
          <div
            key={c.name}
            style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 2px', fontSize: 12.5, borderBottom: '1px solid var(--surface-3)' }}
          >
            <span style={{ fontFamily: 'var(--mono)' }}>{c.name}</span>
            <span className="chip" style={{ height: 18, padding: '0 7px', fontSize: 10.5 }}>{c.license}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
