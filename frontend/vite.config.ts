import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://172.16.8.131:8000',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://172.16.8.131:8000',
        ws: true,
      },
    },
  },
})
