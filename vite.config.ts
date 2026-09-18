import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['iconv1/180.png'],
      manifest: {
        id: '/',
        name: 'SmartDSP ระบบกองยุทธศาสตร์และแผนงาน',
        short_name: 'SmartDSP',
        description: 'ระบบงานสำหรับบุคลากรกองยุทธศาสตร์และแผนงาน',
        lang: 'th',
        start_url: '/login',
        scope: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#1d75bd',
        icons: [
          {
            src: '/iconv1/192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/iconv1/512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            urlPattern: ({ url }) => (
              url.hostname.endsWith('.supabase.co')
              && ['/auth/v1/', '/rest/v1/', '/functions/v1/'].some((path) => url.pathname.startsWith(path))
            ),
            handler: 'NetworkOnly',
            method: 'GET',
          },
        ],
      },
    }),
  ],
});

