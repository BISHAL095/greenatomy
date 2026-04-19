import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// Proxy backend routes in development so the frontend can call relative API paths.
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    proxy: {
      "/logs": "http://localhost:3000",
      "/health": "http://localhost:3000",
      "/test": "http://localhost:3000",
      "/heavy": "http://localhost:3000",
    },
  },
})
