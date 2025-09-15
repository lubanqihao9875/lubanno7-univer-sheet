<template>
  <Lubanno7UniverSheetCore
    v-if="isComponentAlive"
    ref="lubanno7UniverSheetCoreRef"
    :columns="columns"
    :data="data"
    :config="mergedConfig"
    @updateData="(params) => emitEvent('updateData', params)"
    @tableInitialized="handleTableInitialized"
    @tableDataRefreshed="(params) => emitEvent('tableDataRefreshed', params)"
    @insertRow="(params) => emitEvent('insertRow', params)"
    @deleteRow="(params) => emitEvent('deleteRow', params)"
    @rowInserted="(params) => emitEvent('rowInserted', params)"
    @rowUpdated="(params) => emitEvent('rowUpdated', params)"
    @cellClicked="(params) => emitEvent('cellClicked', params)"
  />
</template>

<script>
import Lubanno7UniverSheetCore from './core.vue'

// 深度合并函数
function deepMerge(target, source) {
  if (typeof target !== 'object' || target === null) {
    target = {};
  }
  
  if (typeof source !== 'object' || source === null) {
    source = {};
  }

  const result = { ...target };

  Object.keys(source).forEach(key => {
    const targetValue = result[key];
    const sourceValue = source[key];

    // 递归合并对象（非数组）
    if (
      typeof targetValue === 'object' && targetValue !== null &&
      typeof sourceValue === 'object' && sourceValue !== null &&
      !Array.isArray(targetValue) && !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue);
    } else {
      result[key] = sourceValue;
    }
  });

  return result;
}

export default {
  name: 'Lubanno7UniverSheet',
  components: {
    Lubanno7UniverSheetCore
  },
  props: {
    columns: {
      type: Array,
      required: true
    },
    data: {
      type: Array,
      required: true
    },
    config: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    // 合并默认配置和用户配置
    mergedConfig() {
      return deepMerge(this.defaultConfig, this.config);
    }
  },
  data() {
    return {
      isComponentAlive: true,
      isTableInitialized: false,
      exposed: this.createInitialExposed(),
      // 默认配置集中管理
      defaultConfig: {
        sheetName: 'Sheet',
        allowInsertRow: true,
        allowDeleteRow: true,
        autoRefreshOnPropChange: false,
        loadingMaskColor: '#3498db',
        loadingMessage: '数据加载中...',
        showHeader: true,
        showToolbar: true,
        showFooter: true,
        selectValidationErrorInfo: '无效只是警告，该输入不在下拉列表中，但实际可以输入',
        selectValidationErrorStop: '请从下拉列表中选择一个值',
        emptyDataText: '暂无数据',
        batchSize: 500,
        zoom: 1,
        scrollBehavior: 'stop-at-boundary',
        styleOptions: {
          width: '100%',
          height: '500px'
        },
        wheelNumberControl: {
          mode: 'editOnly',
          isCellAllowed: true,
          step: 1,
          shiftStep: 10
        },
        commonStyle: {
          defaultRowHeight: 20,
          defaultColumnWidth: 80,
          backgroundColor: '#fff',
          borderColor: '#ccc',
          color: '#000',
          fontSize: 12
        },
        headerStyle: {
          backgroundColor: '#cfe2f3',
          fontWeight: 'normal'
        },
        readonlyCellStyle: {
          backgroundColor: '#eee',
          fontWeight: 'normal'
        },
        selectCellStyle: {
          backgroundColor: '#fff',
          fontWeight: 'normal'
        },
        messages: {
          insertRowError: '表头区域不可插入行',
          deleteRowError: '表头行不可删除',
          autoFillFromHeaderError: '不可从表头行开始自动填充',
          autoFillToHeaderError: '不可填充至表头行',
          mergeCellError: '不支持合并单元格',
          unmergeCellError: '不支持取消单元格合并',
          moveHeaderError: '表头行不可移动',
          moveToHeaderError: '不可移动内容至表头区域',
          copyHeaderError: '表头行不可复制',
          readonlyCellAutoFillError: '区域包含只读单元格无法自动填充',
          readonlyCellMoveError: '区域包含只读单元格无法移动数据'
        }
      }
    }
  },
  methods: {
    // 创建初始的exposed对象
    createInitialExposed() {
      return {
        attributes: {
          defaultConfig: this.defaultConfig
        },
        methods: {
          refreshTableData: this.refreshTableData,
          recreateTable: this.recreateTable,
          refreshTableCommonConfig: this.refreshTableCommonConfig
        }
      };
    },

    // 表格操作方法
    refreshTableData() {
      if (this.isTableInitialized && this.$refs.lubanno7UniverSheetCoreRef) {
        this.$refs.lubanno7UniverSheetCoreRef.refreshTableData();
      }
    },
    
    recreateTable() {
      this.isComponentAlive = false;
      this.$nextTick(() => {
        this.isComponentAlive = true;
      });
    },
    
    refreshTableCommonConfig() {
      if (this.isTableInitialized && this.$refs.lubanno7UniverSheetCoreRef) {
        this.$refs.lubanno7UniverSheetCoreRef.setCommonSheetConfig();
      }
    },

    // 事件处理与转发
    emitEvent(eventName, params) {
      const emitData = params ? { ...params, exposed: this.exposed } : this.exposed;
      this.$emit(eventName, emitData);
    },
    
    // 表格初始化完成处理（特殊处理，需要更新exposed）
    handleTableInitialized() {
      const coreRef = this.$refs.lubanno7UniverSheetCoreRef;
      
      // 更新exposed对象，添加核心实例和方法
      this.exposed = {
        attributes: {
          defaultConfig: this.defaultConfig,
          univerInstance: coreRef.univerInstance,
          univerAPIInstance: coreRef.univerAPIInstance
        },
        methods: {
          ...this.exposed.methods,
          getCurrentTableData: coreRef.getCurrentTableData,
          endEditing: coreRef.endEditing,
          setCellFontColor: coreRef.setCellFontColor,
          getColumnName: coreRef.getColumnName,
          getColumnIndex: coreRef.getColumnIndex,
          insertRowToEnd: coreRef.insertRowToEnd,
          updateRowData: coreRef.updateRowData,
          getRowIndexByFilter: coreRef.getRowIndexByFilter,
          getRowIndexByFilterAll: coreRef.getRowIndexByFilterAll,
        }
      };
      
      this.isTableInitialized = true;
      this.emitEvent('tableInitialized');
    }
  },
  watch: {
    // 监听列配置变化
    columns: {
      handler: function() {
        if (!this.mergedConfig.autoRefreshOnPropChange) return;
        this.recreateTable();
      },
      deep: true,
      immediate: false
    }
  }
};
</script>