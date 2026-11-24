import { defineConfig } from 'vite';
import path from 'node:path';

// 移动端/WEB 构建：root=web，复用 ../src 共享渲染层，产物进 www/（Capacitor webDir）。
export default defineConfig({
  root: 'web',
  base: './',
  server: { port: 5180, fs: { allow: [path.resolve('.')] } },
  build: {
    outDir: path.resolve('www'),
    emptyOutDir: true,
    target: 'es2020',
  },
});
