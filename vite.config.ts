// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl' // ← ①これを追加！

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    basicSsl() // ← ②これも追加！
  ],
  // リポジトリ名を前後スラッシュで囲む
  base: '/AI-Receipt-OCR-Pro/',
  build: {
    // 確実に assets フォルダにビルドされるように指定
    outDir: 'dist',
  }
})