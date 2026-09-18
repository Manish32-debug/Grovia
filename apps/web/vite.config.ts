import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Exact-match regexes: a plain string alias for '@grovia/shared' would also
    // capture '@grovia/shared/tokens' and rewrite it to <index.ts>/tokens.
    alias: [
      { find: /^@\/(.*)$/, replacement: `${fileURLToPath(new URL('./src', import.meta.url))}/$1` },
      {
        find: /^@grovia\/shared$/,
        replacement: fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
      },
      {
        find: /^@grovia\/shared\/tokens$/,
        replacement: fileURLToPath(
          new URL('../../packages/shared/src/design-tokens.ts', import.meta.url),
        ),
      },
    ],
  },
  server: {
    port: 5173,
    // Same-origin in dev so cookies behave exactly as they will in production.
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});
