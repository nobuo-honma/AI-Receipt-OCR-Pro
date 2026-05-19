import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 🌟 ここを追加！すべての資産の読み込みを相対パス（./assets/...）に変更します
})