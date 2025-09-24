# Lubanno7UniverSheet

基于 Univer 构建的高性能 Vue 2 电子表格组件

## 🚀 特性
- **高性能**：基于 Univer 引擎，支持大数据量表格渲染，流畅的用户体验
- **高度可配置**：丰富的配置选项，支持样式定制、权限控制、单元格编辑器等
- **易于使用**：简洁的 API 设计，完善的文档

## 🔧 快速开始

### 安装
```bash
npm install lubanno7-univer-sheet
```

### 基础使用
```javascript
<template>
  <Lubanno7UniverSheet
    :columns="columns"
    :data="tableData"
    :config="config"
    @updateData="handleDataChange"
    @tableInitialized="handleTableInitialized"
  />
</template>

<script>
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/index.css';

export default {
  components: { Lubanno7UniverSheet },
  data() {
    return {
      columns: [
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 },
        { prop: 'address', label: '地址', width: 200 }
      ],
      tableData: [
        { name: '张三', age: 25, address: '北京市' },
        { name: '李四', age: 30, address: '上海市' }
      ],
      config: {
        styleOptions: {
          width: '100%',
          height: '300px'
        }
      }
    };
  },
  methods: {
    handleDataChange({ currentTableData }) {
      this.tableData = currentTableData;
    },
    handleTableInitialized() {
      console.log('表格已渲染完成');
    },
  }
};
</script>
```

## 📚 文档
详细文档请访问：[Lubanno7 Univer Sheet 文档](https://lubanqihao9875.github.io/lubanno7-univer-sheet-docs/)

文档中包含：
- 完整的 API 参考
- 详细的配置选项说明
- 高级功能使用指南

## 💡 提示
- 支持嵌套表头、单元格编辑、数据双向绑定
- 提供细粒度权限控制和异步分批次加载优化
- 对外暴露完整实例与生命周期钩子

## 📄 许可证
[MIT License](https://github.com/lubanqihao9875/lubanno7-univer-sheet-docs/blob/main/LICENSE)