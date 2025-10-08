import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import router from './routes/index.jsx';
import 'antd/dist/reset.css'; // 引入 Ant Design 的重置样式

// 找到 HTML 中的 root 元素
const rootElement = document.getElementById('root');

// 创建 React 根节点
const root = ReactDOM.createRoot(rootElement);

// 渲染应用
root.render(
  <React.StrictMode>
    {/* 使用 RouterProvider 提供路由配置 */}
    <RouterProvider router={router} />
  </React.StrictMode>
);