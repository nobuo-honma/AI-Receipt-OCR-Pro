import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [react(), basicSsl()],
  base: '/AI-Receipt-OCR-Pro/', // あなたのGitHubリポジトリ名
  build: { outDir: 'dist' }
})