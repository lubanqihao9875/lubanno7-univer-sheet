# Lubanno7UniverSheet 组件开发文档

基于 Univer 表格与 Element UI 设计风格的 Vue 表格组件，支持嵌套表头、单元格编辑、数据双向绑定、细粒度权限控制、异步分批次加载优化，并对外暴露完整实例与生命周期钩子。

## 快速开始

### 1. 基本使用

```javascript
<template>
  <Lubanno7UniverSheet
    :columns="columns"
    :data="tableData"
    :config="config"
    @updateData="handleDataChange"
    @tableInitialized="handleTableInitialized"
    @tableDataRefreshed="handleTableDataRefreshed"
    @insertRow="handleInsertRow"
    @deleteRow="handleDeleteRow"
    @cellClicked="handleCellClicked"
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
        {
          prop: 'status',
          label: '状态',
          width: 100,
          editor: {
            type: 'select',
            options: ['满意', '不满意'],
            multiple: false,
            allowInput: false
          }
        }
      ],
      tableData: [
        { name: '张三', age: 25, status: '满意' },
        { name: '李四', age: 30, status: '不满意' }
      ],
      config: {
        defaultColumnWidth: 100,
        sheetName: '示例表',
        allowInsertRow: true,
        allowDeleteRow: true,
        autoRefreshOnPropChange: false,
        headerStyle: {
          backgroundColor: '#f5f5f5'
        },
        commonStyle: {
          fontSize: 12
        }
      }
    };
  },
  methods: {
    handleDataChange({ changedRow, changedRowIndex, changedColumn, oldValue, newVal, currentTableData, exposed: { attributes, methods } }) {
      console.log('数据已更新:', changedColumn, '从', oldValue, '变为', newVal);
      this.tableData = currentTableData; // 同步更新父组件数据
    },
    handleTableInitialized({ attributes, methods }) {
      console.log('表格已渲染完成，实例已暴露');
      // 通过 attributes.univerAPIInstance 可以调用底层 API
      // 通过 methods.getCurrentTableData 可以立即获取全量数据
    },
    handleTableDataRefreshed({ attributes, methods }) {
      console.log('表格数据已刷新');
    },
    handleInsertRow({ insertRows, insertRowStartIndex, insertRowEndIndex, currentTableData }) {
      console.log('插入了', insertRows.length, '行数据');
      this.tableData = currentTableData;
    },
    handleDeleteRow({ deleteRows, deleteRowStartIndex, deleteRowEndIndex, currentTableData }) {
      console.log('删除了', deleteRows.length, '行数据');
      this.tableData = currentTableData;
    },
    handleCellClicked({ clickedRow, clickedRowIndex, clickedColumn, clickedColumnIndex, value }) {
      console.log('单元格被点击:', clickedColumn, '值为:', value);
    }
  }
};
</script>

```

### 2. 表格表头配置

支持**基础单层表头**与**多级嵌套表头**两种配置；需注意：**列宽和只读列仅支持在叶子节点（最末级列）配置**，非叶子节点（父级表头列）不支持列宽和只读设置。

#### 示例 1：基础单层表头

适用于无层级关系的简单表头，直接通过列的`editor: { type: 'readonly' }`将指定列设为只读：

```javascript
columns: [
  { 
    prop: 'id', 
    label: 'ID', 
    width: 80,
    editor: { type: 'readonly' } // 叶子节点（单层列）支持设置只读
  },
  { prop: 'name', label: '姓名', width: 120 }, // 可编辑列
  { prop: 'age', label: '年龄', width: 80 },    // 可编辑列
  { 
    prop: 'registerTime', 
    label: '注册时间', 
    width: 160,
    editor: { type: 'readonly' } // 另一叶子节点设置只读
  }
]

```

#### 示例 2：多级嵌套表头

适用于有层级归类的复杂表头，通过`children`属性实现嵌套，仅最末级叶子节点可配置只读或下拉选择：

```javascript
columns: [
  { 
    prop: 'userBase', 
    label: '用户基础信息', // 非叶子节点（父级），不支持只读配置
    children: [
      { 
        prop: 'userBase#id', 
        label: '用户ID', 
        width: 100,
        editor: { type: 'readonly' } // 叶子节点，支持只读
      },
      { prop: 'userBase#name', label: '姓名', width: 120 }, // 叶子节点，可编辑
      {
        prop: 'userBase#gender',
        label: '性别',
        width: 80,
        editor: {
          type: 'select',
          options: ['男', '女'],
          multiple: false
        }
      }
    ]
  },
  { 
    prop: 'orderInfo', 
    label: '订单信息', // 非叶子节点（父级），不支持只读配置
    children: [
      { prop: 'orderInfo#price', label: '订单金额', width: 120 }, // 叶子节点，可编辑
      { 
        prop: 'orderInfo#status', 
        label: '订单状态', 
        width: 100,
        editor: {
          type: 'select',
          options: ['待支付', '已支付', '待发货', '已发货', '已完成', '已取消'],
          multiple: false
        }
      },
      { 
        prop: 'orderInfo#createTime', 
        label: '创建时间', 
        width: 180,
        editor: { type: 'readonly' } // 叶子节点，支持只读
      }
    ]
  }
]

```

### 3. 列宽与行高配置

支持以下尺寸设置：

*   **列宽设置**：在列配置中使用 `width` 属性或通过 `config.commonStyle.defaultColumnWidth` 设置默认列宽
*   **行高设置**：通过 `config.commonStyle.defaultRowHeight` 设置默认行高

优先级：列配置的 `width` > `config.commonStyle.defaultColumnWidth`

### 4. 样式与权限配置

通过 `config` 对象可以自定义表格样式与交互权限：

```javascript
config: {
  sheetName: '示例表',              // 工作表名称
  allowInsertRow: true,             // 是否允许插入行
  allowDeleteRow: true,             // 是否允许删除行
  autoRefreshOnPropChange: false,   // 属性变化时是否自动刷新
  loadingMaskColor: '#3498db',      // 加载遮罩中旋转动画的颜色
  loadingMessage: '数据加载中...',  // 加载遮罩中显示的文本
  showHeader: true,                // 是否显示表头
  showFooter: true,                // 是否显示表尾
  batchSize: 500,                  // 每次加载的数据量，设为 Infinity 表示不限制批量加载数据量
  zoom: 1,                         // 缩放比例
  styleOptions: {                   // 容器样式
    width: '100%',
    height: '500px'
  },
  wheelNumberControl: {             // 数字单元格滚轮配置
    enabled: true,
    step: 1,
    shiftStep: 10
  },
  commonStyle: {                    // 通用样式设置
    defaultRowHeight: 20,           // 默认行高
    defaultColumnWidth: 80,        // 默认列宽
    fontSize: 12                    // 默认字体大小
  },
  headerStyle: {                    // 表头样式
    backgroundColor: '#cfe2f3',
    fontWeight: 'bold'
  },
  readonlyCellStyle: {              // 只读单元格样式
    backgroundColor: '#eee',
    fontWeight: 'bold'
  },
  messages: {                       // 提示信息配置
    insertRowError: '表头区域不可插入行',
    deleteRowError: '表头行不可删除',
    // 更多提示信息见配置项说明
  }
}

```

*   颜色值若设为空字符串 `''` 则不应用对应样式。

### 5. 数据格式要求

表格数据的字段名需与叶子节点`prop`完全一致，示例 2 对应的数据格式如下：

```javascript
tableData: [
  {
    'userBase#id': 'U001',    // 对应只读列
    'userBase#name': '张三',  // 对应可编辑列
    'userBase#gender': '男',  // 对应下拉选择列
    'orderInfo#price': 299,   // 对应可编辑列
    'orderInfo#status': '已支付', // 对应下拉选择列
    'orderInfo#createTime': '2024-01-01 10:30' // 对应只读列
  },
  {
    'userBase#id': 'U002',
    'userBase#name': '李四',
    'userBase#gender': '女',
    'orderInfo#price': 599,
    'orderInfo#status': '待发货',
    'orderInfo#createTime': '2024-01-02 14:15'
  }
]

```

### 6. 下拉选择单元格配置

通过在列配置中设置`editor`属性，可以为单元格添加下拉选择功能：

```javascript
columns: [
  {
    prop: 'status',
    label: '状态',
    width: 100,
    editor: {
      type: 'select',         // 选择框类型
      options: ['选项1', '选项2', '选项3'], // 可选值数组
      multiple: false,        // 是否多选
      allowInput: false,       // 是否允许输入自定义值
      selectValidationError: '请从下拉列表中选择一个值'  // 选择框校验错误提示
    }
  },
  // 函数形式的editor配置，可以根据行数据动态生成选项
  {
    prop: 'dynamicOptions',
    label: '动态选项',
    width: 120,
    editor: (params) => {
      const { row, rowIndex, column, columnIndex } = params;
      // 根据行数据返回不同的配置
      if (row.type === 'typeA') {
        return {
          type: 'select',
          options: ['A1', 'A2', 'A3'],
          multiple: false
        };
      } else {
        return {
          type: 'select',
          options: ['B1', 'B2', 'B3'],
          multiple: false
        };
      }
    }
  }
]

```

### 7. 对外暴露的实例与 API

组件通过事件参数向外暴露完整能力：

```javascript
handleTableInitialized(exposed) {
  const { attributes, methods } = exposed;
  const { univerInstance, univerAPIInstance, defaultConfig } = attributes;
  const { 
    getCurrentTableData, 
    refreshTableData, 
    recreateTable, 
    refreshTableCommonConfig,
    endEditing, 
    setCellFontColor, 
    getColumnName, 
    getColumnIndex,
    insertRowToEnd,
    updateRowData,
    getRowIndexByFilter,
    getRowIndexByFilterAll
  } = methods;

  // 示例：获取当前完整数据
  const data = getCurrentTableData();

  // 示例：刷新表格数据
  refreshTableData();

  // 示例：重建表格
  recreateTable();

  // 示例：刷新表格通用配置
  refreshTableCommonConfig();

  // 示例：结束编辑状态
  endEditing();

  // 示例：使用底层 API 设置单元格
  univerAPIInstance
    .getActiveWorkbook()
    .getActiveSheet()
    .getRange(0, 0)
    .setValue('Hello Lubanno7Universheet');

  // 示例：设置单元格字体颜色
  setCellFontColor(0, 'userBase#name', 'red');

  // 示例：获取列名
  const columnName = getColumnName(1); // 列索引从 0 开始

  // 示例：获取列索引
  const columnIndex = getColumnIndex('userBase#name');

  // 示例：插入行到末尾
  insertRowToEnd({
    'userBase#id': 'U003',
    'userBase#name': '王五',
    'userBase#gender': '男',
    'orderInfo#price': 300,
    'orderInfo#status': '待发货',
    'orderInfo#createTime': '2024-01-03 16:45'
  });
  
  // 示例：更新行数据
  updateRowData(1, {
    'userBase#name': '赵六',
    'orderInfo#price': 500
  });
  
  // 示例：根据筛选条件获取行索引
  const rowIndex = getRowIndexByFilter({
    'userBase#name': '赵六'
  });
  
  // 示例：根据筛选条件获取所有行索引
  const rowIndices = getRowIndexByFilterAll({
    'userBase#name': '赵六'
  });
}

```

## API 参考

### Props

| 参数      | 说明        | 类型     | 默认值 | 必填 |
| :------ | :-------- | :----- | :-- | :- |
| columns | 列配置数组     | Array  | -   | 是  |
| data    | 表格数据数组    | Array  | \[] | 是  |
| config  | 样式与权限配置对象 | Object | 见下方 | 否  |

### Config 配置项

| 参数                      | 说明                                                      | 类型      | 默认值                                                                     |
| :---------------------- | :------------------------------------------------------ | :------ | :---------------------------------------------------------------------- |
| sheetName               | 工作表名称                                                   | String  | 'Sheet'                                                                 |
| allowInsertRow          | 是否允许插入行                                                 | Boolean | true                                                                    |
| allowDeleteRow          | 是否允许删除行                                                 | Boolean | true                                                                    |
| autoRefreshOnPropChange | 属性变化时是否自动刷新                                             | Boolean | false                                                                   |
| loadingMaskColor        | 加载遮罩中旋转动画的颜色                                            | String  | '#3498db'                                                               |
| loadingMessage          | 加载遮罩中显示的文本                                              | String  | ' 数据加载中...'                                                             |
| showHeader              | 是否显示表头                                                  | Boolean | true
| showToolbar             | 是否显示工具栏                                                  | Boolean | true
| showFooter              | 是否显示表尾                                                  | Boolean | true                                                                    |
| selectValidationErrorInfo | 下拉选择验证错误信息（允许输入时） | String | '无效只是警告，该输入不在下拉列表中，但实际可以输入' |
| selectValidationErrorStop | 下拉选择验证错误信息（禁止输入时） | String | '请从下拉列表中选择一个值' |
| emptyDataText            | 空数据提示文本 | String | '暂无数据' |
| batchSize               | 每次加载的数据量，用于异步分批次加载优化                                    | Number  | 500                                                                     |
| zoom                    | 缩放比例 | Number | 1 |
| styleOptions            | 容器样式设置                                                  | Object  | { width: '100%', height: '500px' }                                      |
| wheelNumberControl      | 数字单元格滚轮配置 | Object  | { enabled: true, step: 1, shiftStep: 10 } |
| commonStyle             | 通用样式设置 | Object  | { defaultRowHeight: 20, defaultColumnWidth: 80, backgroundColor: '#fff', borderColor: '#ccc', color: '#000', fontSize: 12 } |
| headerStyle             | 表头样式设置       | Object  | { backgroundColor: '#cfe2f3', fontWeight: 'normal' } |
| readonlyCellStyle       | 只读单元格样式设置    | Object  | { backgroundColor: '#eee', fontWeight: 'normal' }    |
| selectCellStyle         | 下拉选择单元格样式设置    | Object  | { backgroundColor: '#fff', fontWeight: 'normal' }    |
| messages                | 各类操作的提示信息配置对象                                           | Object  | 见下方详细说明                                                                 |

#### messages 配置项详情

| 参数                        | 说明                 | 默认值                |
| :------------------------ | :----------------- | :----------------- |
| insertRowError            | 表头区域插入行错误提示        | ' 表头区域不可插入行'       |
| deleteRowError            | 删除表头行错误提示          | ' 表头行不可删除'         |
| autoFillFromHeaderError   | 从表头行开始自动填充错误提示     | ' 不可从表头行开始自动填充'    |
| autoFillToHeaderError     | 填充至表头行错误提示         | ' 不可填充至表头行'        |
| mergeCellError            | 合并单元格错误提示          | ' 不支持合并单元格'        |
| unmergeCellError          | 取消单元格合并错误提示        | ' 不支持取消单元格合并'      |
| moveHeaderError           | 移动表头行错误提示          | ' 表头行不可移动'         |
| moveToHeaderError         | 移动内容至表头区域错误提示      | ' 不可移动内容至表头区域'     |
| copyHeaderError           | 复制表头行错误提示          | ' 表头行不可复制'         |
| readonlyCellAutoFillError | 区域包含只读单元格时自动填充错误提示 | ' 区域包含只读单元格无法自动填充' |
| readonlyCellMoveError     | 区域包含只读单元格时移动数据错误提示 | ' 区域包含只读单元格无法移动数据' |

### Events

| 事件名                | 触发时机     | 回调参数                                                                                                              |
| :----------------- | :------- | :---------------------------------------------------------------------------------------------------------------- |
| updateData         | 单元格数据变更  | `{ changedRow, changedRowIndex, changedColumn, changedColumnIndex, oldValue, newVal, currentTableData, exposed }` |
| tableInitialized   | 表格首次渲染完成 | `exposed`                                                                                                         |
| tableDataRefreshed | 数据重新加载完成 | `exposed`                                                                                                         |
| insertRow          | 插入行操作完成  | `{ insertRows, insertRowStartIndex, insertRowEndIndex, currentTableData, exposed }`                               |
| deleteRow          | 删除行操作完成  | `{ deleteRows, deleteRowStartIndex, deleteRowEndIndex, currentTableData, exposed }`                               |
| cellClicked        | 单元格被点击   | `{ clickedRow, clickedRowIndex, clickedColumn, clickedColumnIndex, value, exposed }`                                       |
| rowInserted        | 行插入操作完成  | `{ insertedRows, insertedRowStartIndex, insertedRowEndIndex, currentTableData, exposed }`                               |
| rowUpdated          | 行更新操作完成  | `{ index, oldRow, newRow, currentTableData, exposed }`                               |

### 回调参数详情

#### updateData 回调参数

| 字段                 | 说明              |
| :----------------- | :-------------- |
| changedRow         | 变更后的行数据         |
| changedRowIndex    | 数据行索引（已自动减去表头行） |
| changedColumn      | 变更的列名           |
| changedColumnIndex | 列索引             |
| oldValue           | 旧值              |
| newVal             | 新值              |
| currentTableData   | 完整表格数据          |
| exposed            | 暴露对象            |

#### insertRow 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| insertRows          | 插入的行数据数组   |
| insertRowStartIndex | 插入行的起始索引   |
| insertRowEndIndex   | 插入行的结束索引   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

#### deleteRow 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| deleteRows          | 删除的行数据数组   |
| deleteRowStartIndex | 删除行的起始索引   |
| deleteRowEndIndex   | 删除行的结束索引   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

#### cellClicked 回调参数

| 字段                 | 说明              |
| :----------------- | :-------------- |
| clickedRow         | 被点击的行数据         |
| clickedRowIndex    | 数据行索引            |
| clickedColumn      | 被点击的列名          |
| clickedColumnIndex | 列索引             |
| value              | 单元格当前值          |
| exposed            | 暴露对象            |

#### rowInserted 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| insertedRows          | 插入的行数据数组   |
| insertedRowStartIndex | 插入行的起始索引   |
| insertedRowEndIndex   | 插入行的结束索引   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

#### rowUpdated 回调参数

| 字段                  | 说明         |
| :------------------ | :--------- |
| index          | 更新的行索引   |
| oldRow          | 更新前的行数据   |
| newRow          | 更新后的行数据   |
| currentTableData    | 更新后的完整表格数据 |
| exposed             | 暴露对象       |

### exposed 对象说明

| 字段                               | 说明                                       |
| :------------------------------- | :--------------------------------------- |
| attributes.univerInstance        | Univer 原始实例                              |
| attributes.univerAPIInstance     | Univer API 封装实例                          |
| attributes.defaultConfig         | 组件默认配置                                   |
| methods.getCurrentTableData      | 获取当前完整表格数据                               |
| methods.refreshTableData         | 刷新表格数据                                   |
| methods.recreateTable            | 销毁并重建表格组件                                |
| methods.refreshTableCommonConfig | 刷新表格通用配置                                 |
| methods.endEditing               | 结束所有单元格的编辑状态，返回 Promise                  |
| methods.setCellFontColor         | 设置单元格字体颜色，参数：rowIndex, columnName, color |
| methods.getColumnName            | 获取列名，参数：columnIndex                      |
| methods.getColumnIndex           | 获取列索引，参数：columnName                      |
| methods.insertRowToEnd           | 插入行到表格末尾，参数：rowData                      |
| methods.updateRowData           | 更新行数据，参数：rowIndex, rowData, mergeWithExisting                |
| methods.getRowIndexByFilter     | 根据筛选条件获取行索引，参数：filterObj                      |
| methods.getRowIndexByFilterAll | 根据筛选条件获取所有行索引，参数：filterObj                      |

## 注意事项

1.  **列名匹配**：数据字段名必须与 `columns` 中的 `prop` 完全一致
2.  **嵌套表头**：子列的宽度设置仅在子列配置中生效
3.  **性能优化**：
    *   组件采用异步分批次加载优化大数据量场景
    *   避免在`autoRefreshOnPropChange`为`true`时频繁修改 `columns`、`data` 和 `config`，这会导致表格重新渲染
    *   合理设置`batchSize`以平衡性能和响应速度
4.  **表头操作限制**：表头区域默认不可编辑、不可移动、不可复制
5.  **单元格操作限制**：默认禁止合并和取消合并单元格操作
6.  **自动填充限制**：不可从表头开始自动填充，也不可填充到表头区域
7.  **只读单元格**：通过设置列的 `editor: { type: 'readonly' }` 可将整列设为只读
8.  **下拉选择**：通过设置列的`editor: { type: 'select', options: [...] }`可添加下拉选择功能
9.  **样式继承**：表头样式和只读单元格样式支持 backgroundColor 和 fontWeight 属性
10. **权限控制**：通过 `allowInsertRow` 和 `allowDeleteRow` 可控制行操作权限