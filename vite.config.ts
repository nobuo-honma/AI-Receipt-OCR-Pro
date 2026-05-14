// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // 👇 ここにあなたのGitHubのリポジトリ名（URLの後ろに付く名前）を書きます
  base: '/AI-Receipt-OCR-Pro/',
})