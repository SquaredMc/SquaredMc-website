import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base, so the same build works wherever it is served from:
// squaredmc.com/ (the custom domain) and squaredmc.github.io/SquaredMc-website/
// (the project-path fallback) both resolve ./assets/... correctly.
//
// This used to be an absolute base fed by a VITE_BASE env var in the deploy
// workflow, which meant the build was pinned to one URL shape and had to be
// changed in lockstep with the domain. Relative is safe here because the site
// is a single page with no client-side router — nested routes are where './'
// bites, and there aren't any.
export default defineConfig({
  base: './',
  plugins: [react()],
})
