import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages serves this repo from /SquaredMc-website/, so the built asset
// URLs need that prefix. The deploy workflow sets VITE_BASE=/SquaredMc-website/.
// Locally (and on Vercel, and on Pages behind a custom domain like
// squaredmc.com) it stays "/". See README → Deployment.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
})
