import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import requireTransform from 'vite-plugin-require-transform';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import * as path from 'path';

// Remove `crossorigin` attribute that Vite adds to module <script> tags.
// In Electron's file:// protocol, crossorigin causes the browser to use CORS
// fetch-mode which silently fails (no CORS headers from file://) — the bundle
// never executes and nothing renders, with zero JS errors shown.
const removeModuleCrossoriginPlugin = {
  name: 'remove-module-crossorigin',
  transformIndexHtml(html: string) {
    // Strip crossorigin from all <script type="module"> tags
    return html.replace(/<script type="module" crossorigin/g, '<script type="module"');
  }
};

export default defineConfig({
  plugins: [
    removeModuleCrossoriginPlugin,
    react(),
    requireTransform({}),
    electron([
      {
        entry: path.resolve(__dirname, 'electron/main.ts'),
        vite: {
          build: {
            outDir: '../dist-electron',
            rollupOptions: {
              external: ['../build/Release/swiftshare_addon.node'],
            }
          }
        }
      },
      {
        entry: path.resolve(__dirname, 'electron/preload.ts'),
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: '../dist-electron',
          }
        }
      }
    ]),
    renderer()
  ],
  root: './src',
  base: './', // important for electron relative paths
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  resolve: {
    alias: [
      { find: 'react-native/Libraries/Utilities/codegenNativeComponent', replacement: path.resolve(__dirname, './src/mocks/codegen.ts') },
      { find: 'react-native/Libraries/ReactNative/AppContainer', replacement: path.resolve(__dirname, './src/mocks/appcontainer.ts') },
      { find: 'react', replacement: path.resolve(__dirname, 'node_modules/react') },
      { find: 'react-dom', replacement: path.resolve(__dirname, 'node_modules/react-dom') },
      { find: 'react-native-udp', replacement: path.resolve(__dirname, './src/mocks/react-native-udp.ts') },
      { find: 'react-native-fs', replacement: path.resolve(__dirname, './src/mocks/react-native-fs.ts') },
      { find: 'react-native-device-info', replacement: path.resolve(__dirname, './src/mocks/react-native-device-info.ts') },
      { find: '@react-native-documents/picker', replacement: path.resolve(__dirname, './src/mocks/document-picker.ts') },
      { find: 'react-native-permissions', replacement: path.resolve(__dirname, './src/mocks/react-native-permissions.ts') },
      { find: 'react-native-blob-util', replacement: path.resolve(__dirname, './src/mocks/react-native-blob-util.ts') },
      { find: 'lucide-react-native', replacement: 'lucide-react' },
      // Use a Regex for the root alias to avoid breaking deep imports (like /Libraries/...)
      { find: /^react-native$/, replacement: path.resolve(__dirname, './src/mocks/react-native.ts') },
      // Catch-all for any other react-native sub-imports
      { find: /^react-native\/(.*)$/, replacement: path.resolve(__dirname, 'node_modules/react-native-web/dist/$1') }
    ]
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.js', '.ts', '.web.ts', '.tsx', '.web.tsx', '.jsx']
    }
  }
});
