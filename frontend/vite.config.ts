// vite.config.ts
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig(({ mode }) => {
  const analyze = process.env.ANALYZE === 'true' || mode === 'analyze'
  const plugins: PluginOption[] = [react()]

  if (analyze) {
    plugins.push(
      visualizer({
        filename: 'dist/bundle-stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
      visualizer({
        filename: 'dist/bundle-stats.json',
        template: 'raw-data',
        gzipSize: true,
        brotliSize: true,
      })
    )
  }

  return {
    plugins,
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('/node_modules/')) return

            if (
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react/') ||
              id.includes('/node_modules/scheduler/') ||
              id.includes('/node_modules/use-sync-external-store/')
            )
              return 'react'

            if (id.includes('/node_modules/react-router/') || id.includes('/node_modules/react-router-dom/'))
              return 'router'

            if (id.includes('/node_modules/@tanstack/')) return 'tanstack'
            if (id.includes('/node_modules/@supabase/')) return 'supabase'
            if (id.includes('/node_modules/react-hot-toast/')) return 'toast'
            if (id.includes('/node_modules/axios/')) return 'axios'
            if (
              id.includes('/node_modules/recharts/') ||
              id.includes('/node_modules/d3-') ||
              id.includes('/node_modules/victory-vendor/')
            )
              return 'charts'
            if (id.includes('/node_modules/@heroicons/')) return 'icons'

            return
          },
        },
      },
    },
  }
})
