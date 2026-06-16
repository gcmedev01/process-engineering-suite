import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/design-agents/',
  server: {
    host: '0.0.0.0',
    port: 3004,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Inject deployment environment for runtime detection
    'import.meta.env.VITE_DEPLOYMENT_ENV': JSON.stringify(
      process.env.DEPLOYMENT_ENV || process.env.VITE_DEPLOYMENT_ENV || 'local'
    ),
  },
})
