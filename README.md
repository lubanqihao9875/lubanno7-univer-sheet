# Lubanno7UniverSheet

基于 Univer 构建的高性能电子表格通用组件

## 🔗 项目链接
- [GitHub 仓库](https://github.com/lubanqihao9875/lubanno7-univer-sheet) - 源码仓库
- [npm 包](https://www.npmjs.com/package/lubanno7-univer-sheet) - 官方包
- [在线文档](https://lubanqihao9875.github.io/lubanno7-univer-sheet-docs/) - 使用说明
- [在线演示](https://lubanqihao9875.github.io/lubanno7-univer-sheet-demo/) - 交互式功能展示
- [文档仓库](https://github.com/lubanqihao9875/lubanno7-univer-sheet-docs) - 文档源码
- [演示仓库](https://github.com/lubanqihao9875/lubanno7-univer-sheet-demo) - 演示项目源码

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
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/lubanno7-univer-sheet.css';

const container = document.getElementById('table-container');

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

## 📄 许可证
[MIT License](https://github.com/lubanqihao9875/lubanno7-univer-sheet-docs/blob/main/LICENSE)

## 👨‍💻 关于作者
作者GitHub: [lubanqihao9875](https://github.com/lubanqihao9875)

如果觉得这个项目不错，欢迎给我点个小星星⭐️，你的支持是我继续开发的动力