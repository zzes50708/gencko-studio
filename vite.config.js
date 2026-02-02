import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  // 這裡可以設定 alias (別名)，例如將 @ 指向 src
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})