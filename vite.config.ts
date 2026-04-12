import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 允许自定义域名访问
    allowedHosts: ['stickman.zhaoyouhan.com'],
    // 确保开发服务器监听所有地址，方便外部访问
    host: '0.0.0.0',
    port: 5173
  }
})
