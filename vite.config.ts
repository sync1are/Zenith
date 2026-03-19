import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './', // ✅ REQUIRED for Electron build

    server: {
      port: 5173,
      host: '0.0.0.0',
    },

    build: {
      outDir: 'dist', // ✅ ensure output is /dist
    },

    plugins: [react()],

    define: {
      'process.env.API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY || env.VITE_OLLAMA_CLOUD_API_KEY),
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY),
      'process.env.OLLAMA_CLOUD_API_KEY': JSON.stringify(env.VITE_OLLAMA_CLOUD_API_KEY),
    },

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
