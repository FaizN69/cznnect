import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' makes the built app work from any address, including a GitHub Pages subfolder.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
