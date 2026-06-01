import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
// Self-hosted variable fonts (woff2, bundled & served from our origin — no render-blocking Google
// Fonts request, works offline). `font-display: swap` is the @fontsource default.
import '@fontsource-variable/hanken-grotesk';
import '@fontsource-variable/jetbrains-mono';
import './styles/styles.css';

const el = document.getElementById('root');
if (!el) throw new Error('#root element not found');

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
