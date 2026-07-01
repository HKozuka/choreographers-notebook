import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy IAM token requests to avoid CORS
      '/api/iam': {
        target: 'https://iam.cloud.ibm.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/iam/, ''),
      },
      // Proxy watsonx.ai requests to avoid CORS
      '/api/watsonx': {
        target: 'https://us-south.ml.cloud.ibm.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/watsonx/, ''),
      },
    },
  },
})
