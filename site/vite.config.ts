import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Multi-page build: the landing page (index.html) and the docs page (docs.html).
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: './index.html',
        docs: './docs.html',
      },
    },
  },
})
