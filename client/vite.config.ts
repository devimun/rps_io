import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
  // 빌드 최적화: 청크 분리로 초기 로딩 개선
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Phaser를 별도 청크로 분리 (~1MB, 캐싱 활용)
          phaser: ['phaser'],
          // React 및 상태관리 라이브러리
          vendor: ['react', 'react-dom', 'zustand', 'socket.io-client'],
        },
      },
    },
    // 청크 크기 경고 임계값 (Phaser가 큼)
    chunkSizeWarningLimit: 1500,
  },
});
