import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // リポジトリ名を前後スラッシュで囲む
  base: '/AI-Receipt-OCR-Pro/',
  build: {
    // 確実に assets フォルダにビルドされるように指定
    outDir: 'dist',
  }
})