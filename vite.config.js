import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // ⚠️ 關鍵修正：必須是 '/' (絕對路徑)，不能是 './' (相對路徑)
  // 這樣無論你在 /identity/ID-001 還是 /shop，都會去根目錄 /assets 找檔案
  base: '/', 

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})