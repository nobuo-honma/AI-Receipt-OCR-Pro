// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    react(),
    basicSsl()
  ],
  // ⭐️ 超重要：前後に必ずスラッシュ ( / ) を入れてください！
  // 大文字・小文字もGitHubのURLと完全に一致させる必要があります。
  base: '/AI-Receipt-OCR-Pro/',

  build: {
    outDir: 'dist',
  }
})