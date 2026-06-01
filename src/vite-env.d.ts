/// <reference types="vite/client" />

// @fontsource packages ship CSS only (no type declarations). Declare them as side-effect modules
// so the bare `import '@fontsource-variable/…'` in main.tsx type-checks under `tsc -b`.
declare module '@fontsource-variable/*';
