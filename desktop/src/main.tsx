import React from 'react';
import { AppRegistry } from 'react-native';
import App from '../../App';

console.log('[Renderer] Starting main.tsx');
// alert('[Renderer] Starting main.tsx'); // Uncomment for hard verification if logs fail

// ─── Bridge window IPC → globalThis ───────────────────────────────────────────
// Electron's contextBridge exposes startReceiver etc. on window as read-only.
// App.tsx calls globalThis.startReceiver() — in the browser renderer,
// globalThis === window, so they're already the same object. No assignment needed.
// We just need to ensure the global declarations are satisfied at runtime.
// (The globalThis.xxx declarations in App.tsx are TypeScript-only: `declare global`)
// So nothing to bridge — the functions are already on globalThis via window.
// ────────────────────────────────────────────────────────────────────────────────

AppRegistry.registerComponent('SwiftShareX', () => App);

const rootTag = document.getElementById('root');
if (rootTag) {
  AppRegistry.runApplication('SwiftShareX', {
    initialProps: {},
    rootTag,
  });
}
