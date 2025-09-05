import Lubanno7UniverSheet from './src/index.vue'

// 全局注册组件
Lubanno7UniverSheet.install = function(Vue) {
  Vue.component(Lubanno7UniverSheet.name, Lubanno7UniverSheet)
}

// 导出组件
export default Lubanno7UniverSheet

// 自动安装
if (typeof window !== 'undefined' && window.Vue) {
  window.Vue.component(Lubanno7UniverSheet.name, Lubanno7UniverSheet)
}