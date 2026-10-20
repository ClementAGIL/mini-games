import { defineConfig } from 'vite';

// Relative base so the build works inside the Capacitor Android WebView.
export default defineConfig({
  base: './',
});
