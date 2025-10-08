# Lubanno7UniverSheet

基于 Univer 构建的高性能电子表格通用组件

## 🚀 特性
- **高性能**：基于Univer引擎，提供高性能的表格渲染和操作体验
- **功能丰富**：支持数据验证、排序、筛选、查找替换等多种功能
- **易于集成**：支持任何能运行ES模块的JavaScript环境，可轻松集成到各种前端框架及原生开发项目中

## 🔧 快速开始

### 安装
```bash
npm install lubanno7-univer-sheet
```

### 基础使用

#### React 中使用
```jsx
import React, { useEffect, useRef } from 'react';
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/lubanno7-univer-sheet.css';

const TableComponent = () => {
  const containerRef = useRef(null);
  const tableInstanceRef = useRef(null);
  
  useEffect(() => {
    if (containerRef.current) {
      const columns = [
        { prop: 'name', label: '姓名', width: 120 },
        { prop: 'age', label: '年龄', width: 80 },
        { prop: 'address', label: '地址', width: 200 }
      ];
      
      const data = [
        { name: '张三', age: 25, address: '北京市' },
        { name: '李四', age: 30, address: '上海市' }
      ];
      
      const config = {
        styleOptions: {
          width: '100%',
          height: '300px'
        }
      };
      
      // 创建表格实例
      tableInstanceRef.current = new Lubanno7UniverSheet(containerRef.current, {
        columns,
        data,
        config
      });
      
      // 监听表格初始化完成事件
      tableInstanceRef.current.on('tableInitialized', () => {
        console.log('表格已渲染完成');
      });
    }
    
    // 组件卸载时销毁表格实例
    return () => {
      if (tableInstanceRef.current) {
        tableInstanceRef.current.dispose();
      }
    };
  }, []);
  
  return <div ref={containerRef} />;
};

export default TableComponent;
```

#### Vue 3 中使用
```vue
<template>
  <div ref="containerRef"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/lubanno7-univer-sheet.css';

const containerRef = ref(null);
let tableInstance = null;

onMounted(() => {
  if (containerRef.value) {
    const columns = [
      { prop: 'name', label: '姓名', width: 120 },
      { prop: 'age', label: '年龄', width: 80 },
      { prop: 'address', label: '地址', width: 200 }
    ];
    
    const data = [
      { name: '张三', age: 25, address: '北京市' },
      { name: '李四', age: 30, address: '上海市' }
    ];
    
    const config = {
      styleOptions: {
        width: '100%',
        height: '300px'
      }
    };
    
    // 创建表格实例
    tableInstance = new Lubanno7UniverSheet(containerRef.value, {
      columns,
      data,
      config
    });
    
    // 监听表格初始化完成事件
    tableInstance.on('tableInitialized', () => {
      console.log('表格已渲染完成');
    });
  }
});

onUnmounted(() => {
  if (tableInstance) {
    tableInstance.dispose();
  }
});
</script>
```

#### JS 中使用
```javascript
// 引入组件
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/lubanno7-univer-sheet.css';

// 获取容器元素
const container = document.getElementById('table-container');

// 定义列配置
const columns = [
  { prop: 'name', label: '姓名', width: 120 },
  { prop: 'age', label: '年龄', width: 80 },
  { prop: 'address', label: '地址', width: 200 }
];

// 定义表格数据
const data = [
  { name: '张三', age: 25, address: '北京市' },
  { name: '李四', age: 30, address: '上海市' }
];

// 定义配置选项
const config = {
  styleOptions: {
    width: '100%',
    height: '300px'
  }
};

// 创建表格实例
const tableInstance = new Lubanno7UniverSheet(container, {
  columns,
  data,
  config
});

// 监听表格初始化完成事件
 tableInstance.on('tableInitialized', () => {
  console.log('表格已渲染完成');
});

// 在页面关闭前清理表格实例资源
window.addEventListener('beforeunload', () => {
  tableInstance.dispose()
})
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