<template>
  <el-container class="app-container">
    <el-header class="app-header">
      <h1 class="app-title">Lubanno7 Univer Sheet</h1>
    </el-header>
    
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<script>
export default {
  name: 'App'
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
}

.app-container {
  height: 100vh;
}

.app-header {
  background-color: #1890ff;
  color: white;
  padding: 0 20px;
  display: flex;
  align-items: center;
}

.app-title {
  margin: 0;
  font-size: 20px;
}

.app-main {
  padding: 20px;
  overflow: auto;
}
</style>