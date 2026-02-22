// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('react-router')) return 'router'
          if (id.includes('@tanstack')) return 'tanstack'
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('react-hot-toast')) return 'toast'
          if (id.includes('axios')) return 'axios'
          if (
            id.includes('react-dom') ||
            id.includes('react') ||
            id.includes('scheduler') ||
            id.includes('use-sync-external-store')
          )
            return 'react'
          return
        },
      },
    },
  },
})
