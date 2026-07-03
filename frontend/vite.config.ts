import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Serviteca VJ ERP',
        short_name: 'Serviteca VJ',
        description: 'Sistema de Gestión VJ Serviteca',
        theme_color: '#000000',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ],
        display: 'standalone'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 5175
  }
});