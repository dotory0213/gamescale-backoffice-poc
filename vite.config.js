import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174, // Explicitly set to 5174 to avoid conflict with saas-landing
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
})
