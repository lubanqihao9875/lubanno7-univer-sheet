const { defineConfig } = require('@vue/cli-service')
module.exports = defineConfig({
  transpileDependencies: true,
  productionSourceMap: false,
  publicPath: './',
  devServer: {
    port: 8080
  },
  pages: {
    index: {
      entry: 'examples/src/main.js',
      template: 'examples/public/index.html',
      filename: 'index.html'
    }
  },
  chainWebpack: (config) => {
    if (process.env.NODE_ENV === 'production' && process.env.BUILD_TARGET === 'library') {
      config.entry('app').clear().add('./packages/lubanno7UniverSheet/index.js')
      config.externals({
        vue: {
          commonjs: 'vue',
          commonjs2: 'vue',
          amd: 'vue',
          root: 'Vue'
        }
      })
      config.optimization.minimize(false)
    }
  }
})