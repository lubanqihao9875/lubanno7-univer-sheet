<template>
  <div class="welcome-container">
    <!-- 恭喜信息部分 -->
    <el-card class="welcome-card">
      <div slot="header" class="card-header">
        <span>🎉 恭喜运行成功</span>
      </div>
      <div class="welcome-content">
        <p>您已成功启动 Lubanno7 Univer Sheet 组件库的演示项目。</p>
        <p>这是一个基于 Univer 表格与 Element UI 的 Vue 表格组件，为您提供强大的数据展示和编辑功能。</p>
      </div>
    </el-card>

    <!-- 表格演示部分 -->
    <el-card class="demo-card">
      <div slot="header" class="card-header">
        <span>📊 Lubanno7UniverSheet 表格演示</span>
      </div>
      <div class="demo-container">
        <Lubanno7UniverSheet
          :columns="demoColumns"
          :data="demoData"
          :config="demoConfig"
        />
      </div>
    </el-card>

    <!-- 环境要求部分 -->
    <el-card class="environment-card">
      <div slot="header" class="card-header">
        <span>🔧 环境要求</span>
      </div>
      <div class="environment-content">
        <p>该组件库需要运行在以下环境中：</p>
        <el-tag type="primary" class="environment-tag">Vue 2.x (^2.5.17)</el-tag>
      </div>
    </el-card>

    <!-- 命令行操作部分 -->
    <el-card class="commands-card">
      <div slot="header" class="card-header">
        <span>💻 命令行操作</span>
      </div>
      <div class="commands-content">
        <div class="command-group">
          <h3>启动开发服务器</h3>
          <code class="command-code">npm run dev</code>
          <p class="command-desc">启动本地开发服务器，访问 http://localhost:8080 查看演示效果</p>
        </div>
        
        <div class="command-group">
          <h3>构建 examples 演示项目</h3>
          <code class="command-code">npm run build</code>
          <p class="command-desc">构建演示项目，输出到 dist 目录</p>
        </div>
        
        <div class="command-group">
          <h3>构建组件库</h3>
          <code class="command-code">npm run build:lib</code>
          <p class="command-desc">构建组件库，输出到 lib 目录</p>
        </div>
      </div>
    </el-card>

    <!-- 引入方式部分 -->
    <el-card class="import-card">
      <div slot="header" class="card-header">
        <span>📦 引入方式</span>
      </div>
      <div class="import-content">
        <p>将组件库引入到您的项目中：</p>
        
        <!-- npm 包引入方式 -->
        <div class="import-method">
          <h3>📦 npm 包引入方式</h3>
          <div class="import-steps">
            <div class="step-container">
              <div class="step-item">
                <div class="step-number">1</div>
                <div class="step-content">
                  <h4>安装组件</h4>
                  <code>npm install lubanno7-univer-sheet</code>
                </div>
              </div>
              
              <div class="step-item">
                <div class="step-number">2</div>
                <div class="step-content">
                  <h4>引入组件</h4>
                  <pre><code>import Vue from 'vue'
import Lubanno7UniverSheet from 'lubanno7-univer-sheet'
import 'lubanno7-univer-sheet/lib/index.css'

// 全局注册
Vue.use(Lubanno7UniverSheet)

// 或局部注册
// components: {
//   Lubanno7UniverSheet
// }</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 本地文件引入方式 -->
        <div class="import-method">
          <h3>📁 本地文件引入方式</h3>
          <div class="local-import-content">
            <p>如果需要在本地项目中测试修改后的组件，可以直接复制构建后的文件到目标项目：</p>
            <ol>
              <li>复制 lib/index.umd.js 到目标项目</li>
              <li>复制 lib/index.css 到目标项目</li>
              <li>在目标项目中引入这些文件</li>
            </ol>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 本地开发与测试部分 -->
    <el-card class="develop-card">
      <div slot="header" class="card-header">
        <span>🛠️ 本地开发与测试</span>
      </div>
      <div class="develop-content">
        <div class="develop-section">
          <h3>修改组件代码</h3>
          <p>组件的代码位于以下路径：</p>
          <el-tag class="file-path">packages/lubanno7UniverSheet/</el-tag>
        </div>
        
        <div class="develop-section">
          <h3>开发与测试流程</h3>
          <el-timeline>
            <el-timeline-item>修改组件源码文件</el-timeline-item>
            <el-timeline-item>运行 <code>npm run dev</code> 启动开发服务器</el-timeline-item>
            <el-timeline-item>确认功能正常后运行 <code>npm run build:lib</code> 重新构建组件库</el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import Lubanno7UniverSheet from '../../../../packages/lubanno7UniverSheet/index.js'

export default {
  name: 'Home',
  components: {
    Lubanno7UniverSheet
  },
  data() {
    return {
      // 表格列配置
      demoColumns: [
        {
          label: '名称',
          prop: 'name',
          width: 80
        },
        {
          label: '年龄',
          prop: 'age',
          width: 80
        },
        {
          label: '地址',
          prop: 'address',
          width: 150
        }
      ],
      // 示例数据
      demoData: [
        {
          name: '张三',
          age: 18,
          address: '北京市朝阳区'
        },
        {
          name: '李四',
          age: 20,
          address: '上海市浦东新区'
        },
        {
          name: '王五',
          age: 22,
          address: '广州市天河区'
        }
      ],
      // 表格选项配置
      demoConfig: {
        styleOptions: {
          width: '100%',
          height: '300px'
        }
      }
    }
  }
}
</script>

<style scoped>
.welcome-container {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 500;
}

.welcome-card,
.environment-card,
.commands-card,
.import-card,
.develop-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.welcome-content,
.environment-content,
.commands-content,
.import-content,
.develop-content {
  padding: 20px;
}

.welcome-content p,
.environment-content p,
.commands-content p,
.import-content p,
.develop-content p {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 10px;
}

.environment-tag {
  margin-right: 10px;
  margin-bottom: 10px;
}

.command-group {
  margin-bottom: 20px;
}

.command-group:last-child {
  margin-bottom: 0;
}

.command-group h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.command-code {
  display: inline-block;
  background-color: #f5f7fa;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  margin-bottom: 5px;
  color: #e96900;
}

.command-desc {
  margin: 5px 0 0 0 !important;
  font-size: 14px;
  color: #909399;
}

.import-steps {
  margin-top: 20px;
}

/* 自定义步骤条样式 */
.step-container {
  width: 100%;
}

.step-item {
  display: flex;
  margin-bottom: 30px;
  position: relative;
}

/* 为中间的步骤添加连接线 */
.step-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 20px;
  top: 40px;
  width: 2px;
  height: calc(100% + 20px);
  background-color: #e4e7ed;
  z-index: 0;
}

.step-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #1890ff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 16px;
  margin-right: 20px;
  position: relative;
  z-index: 1;
}

.step-content {
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-content h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.step-content code {
  display: inline-block;
  background-color: #f5f7fa;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #e96900;
  margin-bottom: 10px;
}

.step-content pre {
  background-color: #f5f7fa;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  margin-bottom: 10px;
}

.step-content pre code {
  background: none;
  padding: 0;
  margin: 0;
  display: block;
}

.step-content ol {
  padding-left: 20px;
  margin: 10px 0;
}

.step-content ol li {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 5px;
}

.file-path {
  background-color: #ecf5ff;
  color: #409eff;
  border-color: #c6e2ff;
  margin-bottom: 10px;
}

.develop-section {
  margin-bottom: 20px;
}

.develop-section:last-child {
  margin-bottom: 0;
}

.develop-section h3 {
  margin: 0 0 10px 0;
  font-size: 16px;
  color: #303133;
}

.develop-section ul {
  padding-left: 20px;
  margin: 10px 0;
}

.develop-section li {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 5px;
}

.develop-section strong {
  color: #303133;
}

.develop-section code {
  display: inline-block;
  background-color: #f5f7fa;
  padding: 6px 10px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  color: #e96900;
  margin-bottom: 10px;
}

.el-timeline {
  padding-left: 0;
}

.el-timeline-item {
  padding-bottom: 15px;
}

.el-timeline-item__timestamp {
  font-size: 14px;
  color: #909399;
}

/* 添加演示按钮样式 */
.demo-button {
  margin-top: 20px;
}

/* 演示卡片样式 */
.demo-card {
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 演示容器样式 */
.demo-container {
  width: 100%;
}

.demo-description {
  margin-bottom: 20px;
  color: #606266;
}

/* 引入方式相关样式 */
.import-method {
  margin-bottom: 25px;
  padding: 15px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.import-method:last-child {
  margin-bottom: 0;
}

.import-method h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #303133;
  font-size: 16px;
}

.local-import-content {
  padding-left: 10px;
}

.local-import-content ol {
  margin: 10px 0;
}

.local-import-content li {
  line-height: 1.8;
  color: #606266;
  margin-bottom: 5px;
}
</style>