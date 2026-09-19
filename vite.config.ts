import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const devSecurityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://asntgpqwccsbdzppnjxk.supabase.co; font-src 'self' data:; connect-src 'self' https://asntgpqwccsbdzppnjxk.supabase.co wss://asntgpqwccsbdzppnjxk.supabase.co ws: http:; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

const prodSecurityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; style-src-elem 'self'; style-src-attr 'unsafe-inline'; img-src 'self' data: blob: https://asntgpqwccsbdzppnjxk.supabase.co; font-src 'self' data:; connect-src 'self' https://asntgpqwccsbdzppnjxk.supabase.co wss://asntgpqwccsbdzppnjxk.supabase.co; worker-src 'self' blob:; manifest-src 'self'; media-src 'self' blob:; frame-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
};

export default defineConfig({
  server: {
    headers: devSecurityHeaders,
  },
  preview: {
    headers: prodSecurityHeaders,
  },
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
