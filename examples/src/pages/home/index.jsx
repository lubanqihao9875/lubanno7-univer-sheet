import Lubanno7UniverSheet from '../../../../packages/lubanno7UniverSheet';
import { Card, Tag, Timeline } from 'antd';
import { useEffect, useRef } from 'react';
import './index.css';

const { Item: TimelineItem } = Timeline;

// 表格配置数据
const demoColumns = [
  { label: '名称', prop: 'name', width: 80 },
  { label: '年龄', prop: 'age', width: 80 },
  { label: '地址', prop: 'address', width: 150 },
];

const demoData = [
  { name: '张三', age: 18, address: '北京市朝阳区' },
  { name: '李四', age: 20, address: '上海市浦东新区' },
  { name: '王五', age: 22, address: '广州市天河区' },
];

const demoConfig = {
  styleOptions: { width: '100%', height: '300px' },
};

const Home = () => {
  // 创建容器引用
  const containerRef = useRef(null);
  // 存储表格实例引用
  const tableRef = useRef(null);

  useEffect(() => {
    // 确保容器已渲染
    if (containerRef.current) {
      // 实例化表格组件
      tableRef.current = new Lubanno7UniverSheet(containerRef.current, {
        columns: demoColumns,
        data: demoData,
        config: demoConfig
      });

      // 监听表格初始化完成事件
      tableRef.current.on('tableInitialized', () => {
        console.log('表格初始化完成！');
      });
    }

    // 清理函数
    return () => {
      if (tableRef.current) {
        console.log(tableRef.current.getExposed());
        tableRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="welcome-container">
      {/* 1. 恭喜信息卡片 */}
      <Card className="welcome-card" title={<div className="card-header">🎉 恭喜运行成功</div>}>
        <div className="welcome-content">
          <p>您已成功启动 Lubanno7 Univer Sheet 组件库的演示项目。</p>
        </div>
      </Card>

      {/* 2. 表格演示卡片 */}
      <Card className="demo-card" title={<div className="card-header">📊 Lubanno7UniverSheet 表格演示</div>}>
        <div className="demo-container">
          {/* 创建表格容器 */}
          <div 
            ref={containerRef} 
            style={{
              width: demoConfig.styleOptions.width,
              height: demoConfig.styleOptions.height
            }}
          />
        </div>
      </Card>

      {/* 3. 命令行操作卡片 */}
      <Card className="commands-card" title={<div className="card-header">💻 命令行操作</div>}>
        <div className="commands-content">
          <div className="command-group">
            <h3>启动开发服务器</h3>
            <code className="command-code">npm run dev</code>
            <p className="command-desc">启动本地开发服务器，访问 http://localhost:5173 查看演示效果（Vite 默认端口）</p>
          </div>

          <div className="command-group">
            <h3>构建 examples 演示项目</h3>
            <code className="command-code">npm run build</code>
            <p className="command-desc">构建演示项目，输出到 dist 目录</p>
          </div>

          <div className="command-group">
            <h3>构建组件库</h3>
            <code className="command-code">npm run build:lib</code>
            <p className="command-desc">构建组件库，输出到 lib 目录</p>
          </div>
        </div>
      </Card>

      {/* 4. 引入方式卡片 */}
      <Card className="import-card" title={<div className="card-header">📦 引入方式</div>}>
        <div className="import-content">
          <p>将组件库引入到您的项目中：</p>

          {/* npm 包引入方式 */}
          <div className="import-method">
            <h3>📦 npm 包引入方式</h3>
            <div className="import-steps">
              <div className="step-container">
                {/* 步骤 1：安装组件 */}
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h4>安装组件</h4>
                    <code>npm install lubanno7-univer-sheet</code>
                  </div>
                </div>

                {/* 步骤 2：引入组件 */}
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h4>引入组件</h4>
                    <pre>
                      <code>{`import React from 'react';
import Lubanno7UniverSheet from 'lubanno7-univer-sheet';
import 'lubanno7-univer-sheet/lib/lubanno7-univer-sheet.css';

// 函数式组件中使用
const YourComponent = () => {
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      tableRef.current = new Lubanno7UniverSheet(containerRef.current, {
        columns: demoColumns,
        data: demoData,
        config: demoConfig
      });

      tableRef.current.on('tableInitialized', () => {
        console.log('表格初始化完成！');
      });
    }

    return () => {
      if (tableRef.current) {
        tableRef.current.dispose();
      }
    };
  }, []);

  return (
    <div ref={containerRef} />
  );
};

export default YourComponent;`}</code>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 本地文件引入方式 */}
          <div className="import-method">
            <h3>📁 本地文件引入方式</h3>
            <div className="local-import-content">
              <p>如果需要在本地项目中测试修改后的组件，可以直接复制构建后的文件到目标项目：</p>
              <ol>
                <li>复制 lib/index.es.js 到目标项目</li>
                <li>复制 lib/lubanno7-univer-sheet.css 到目标项目</li>
                <li>在目标项目中引入这些文件（示例如下）：</li>
              </ol>
              <div className="step-content">
                <pre>
                  <code>{`// 引入本地 JS 和 CSS
import Lubanno7UniverSheet from './path/to/lib/index.es.js';
import './path/to/lib/lubanno7-univer-sheet.css';

const YourComponent = () => {
  const containerRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      tableRef.current = new Lubanno7UniverSheet(containerRef.current, {
        columns,
        data,
        config
      });
    }

    return () => {
      if (tableRef.current) {
        tableRef.current.dispose();
      }
    };
  }, []);

  return (
    <div ref={containerRef} />
  );
};`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 5. 本地开发与测试卡片 */}
      <Card className="develop-card" title={<div className="card-header">🛠️ 本地开发与测试</div>}>
        <div className="develop-content">
          <div className="develop-section">
            <h3>修改组件代码</h3>
            <p>组件的代码位于以下路径：</p>
            <Tag className="file-path">packages/lubanno7UniverSheet/</Tag>
          </div>

          <div className="develop-section">
            <h3>开发与测试流程</h3>
            <Timeline mode="left">
              <TimelineItem>修改组件源码文件</TimelineItem>
              <TimelineItem>运行 <code>npm run dev</code> 启动开发服务器</TimelineItem>
              <TimelineItem>确认功能正常后运行 <code>npm run build:lib</code> 重新构建组件库</TimelineItem>
            </Timeline>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Home;