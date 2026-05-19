import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AI-Receipt-OCR-Pro/',  // ← GitHub Pages は https://user.github.io/repo-name/ になるため必須
})