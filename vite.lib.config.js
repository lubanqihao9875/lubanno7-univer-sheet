import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// 导出库的配置
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, 'lib'),
    emptyOutDir: true,
    lib: {
      // 入口文件
      entry: resolve(__dirname, 'packages/lubanno7UniverSheet/index.js'),
      // 库的名称
      name: 'Lubanno7UniverSheet',
      // 输出格式 - ES模块（不压缩）
      formats: ['es'],
      // 输出文件名
      fileName: (format) => `index.es.js`,
    },
    // 目标环境
    target: 'es2015',
    // 禁用压缩
    minify: false,
    // 配置外部依赖，避免打包进库文件
    rollupOptions: {
      external: [
        '@univerjs/preset-sheets-core',
        '@univerjs/preset-sheets-data-validation',
        '@univerjs/preset-sheets-filter',
        '@univerjs/preset-sheets-find-replace',
        '@univerjs/preset-sheets-sort',
        '@univerjs/presets'
      ]
    }
  }
})