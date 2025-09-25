<template>
  <Lubanno7UniverSheetCore
    v-if="isComponentAlive"
    ref="lubanno7UniverSheetCoreRef"
    :columns="columns"
    :data="data"
    :config="mergedConfig"
    @updateData="(params) => emitEvent('updateData', params)"
    @tableInitialized="handleTableInitialized"
    @insertRow="(params) => emitEvent('insertRow', params)"
    @deleteRow="(params) => emitEvent('deleteRow', params)"
    @rowInserted="(params) => emitEvent('rowInserted', params)"
    @rowUpdated="(params) => emitEvent('rowUpdated', params)"
    @cellClick="(params) => emitEvent('cellClick', params)"
    @forbiddenAction="(params) => emitEvent('forbiddenAction', params)"
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
        locale: 'zh-CN',
        darkMode: false,
        autoRefreshOnPropChange: false,
        loadingMessage: '数据加载中...',
        theme: 'defaultTheme', // 可选值：defaultTheme, greenTheme
        headerOptions: {
          show: true,          // 是否展示整个头部
          showToolbar: true,   // 是否展示头部中的工具栏
          ribbonType: 'default' // 头部功能区类型，可选 'default' 或 'simple'
        },
        footerOptions: {
          show: true,          // 是否展示整个底部
          showStatisticBar: false, // 是否展示底部的统计信息栏
          showZoomSlider: true    // 是否展示底部的缩放滑块
        },
        showContextMenu: true, // 是否展示右键上下文菜单
        selectOptions: {
          selectValidationErrorInfo: '无效只是警告，该输入不在下拉列表中，但实际可以输入',
          selectValidationErrorStop: '请从下拉列表中选择一个值',
          selectValidationRenderMode: 'arrow' // 可选值：text, arrow, custom
        },
        checkboxOptions: {
          checkboxValidationError: '请选择有效的复选框值',
          checkedValue: 1,
          uncheckedValue: 0
        },
        emptyDataText: '暂无数据',
        asyncOptions: {
          isAsyncEnabled: false,
          baseBatchSize: 500,
          loadHeaderBatchRatio: 1,
          mergeHeaderBatchRatio: 1,
          setColWidthBatchRatio: 1,
          loadDataBatchRatio: 1,
          updateReadonlyCellStylesBatchRatio: 1,
          setCellDataValidationBatchRatio: 1
        },
        permissionOptions: {
          allowInsertRow: true,
          allowDeleteRow: true
        },
        plugins: {
          filter: {
            enabled: true
          },
          sort: {
            enabled: true
          },
          findReplace: {
            enabled: true
          }
        },
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
          borderType: 'all', // 可选值：horizontal, vertical, all, none
          borderStyleType: 'thin', // 可选值：none, thin, dashed, medium, mediumDashed, thick
          horizontalAlign: 'left', // 可选值：left, center, right
          verticalAlign: 'middle', // 可选值：top, middle, bottom
          wrapStrategy: 'overflow', // 可选值：wrap, overflow, clip
          padding: {
            top: 0,
            right: 0,
            bottom: 0,
            left: 8
          },
          color: '#000',
          fontSize: 12,
          fontWeight: 'normal',
          rowHeader: {
            width: 50,
            hidden: false
          },
          columnHeader: {
            height: 20,
            hidden: false
          }
        },
        headerStyle: {
          headerRowHeight: 20,
          backgroundColor: '#cfe2f3',
          color: '#000',
          fontSize: 12,
          fontWeight: 'normal'
        },
        readonlyCellStyle: {
          backgroundColor: '#eee',
          color: '#000',
          fontWeight: 'normal'
        },
        selectCellStyle: {
          backgroundColor: '#fff',
          color: '#000',
          fontWeight: 'normal'
        },
        checkboxCellStyle: {
          backgroundColor: '#fff',
          color: '#0078d4',
          fontWeight: 'normal'
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
          recreateTable: this.recreateTable
        }
      };
    },
    
    recreateTable() {
      this.isComponentAlive = false;
      this.exposed = this.createInitialExposed();
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
      if (params) {
        this.$emit(eventName, params);
      } else {
        this.$emit(eventName);
      }
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
          getTableData: coreRef.getTableData,
          getTableHeaderRowCount: coreRef.getTableHeaderRowCount,
          getTableDataRowCount: coreRef.getTableDataRowCount,
          getTableRowCount: coreRef.getTableRowCount,
          getTableColumnCount: coreRef.getTableColumnCount,
          getRowByIndex: coreRef.getRowByIndex,
          endEditing: coreRef.endEditing,
          setCellFontColor: coreRef.setCellFontColor,
          getColumnName: coreRef.getColumnName,
          getColumnIndex: coreRef.getColumnIndex,
          insertRowBefore: coreRef.insertRowBefore,
          insertRowAfter: coreRef.insertRowAfter,
          insertRowToEnd: coreRef.insertRowToEnd,
          updateRow: coreRef.updateRow,
          deleteRow: coreRef.deleteRow,
          getRowByFilter: coreRef.getRowByFilter,
          getRowByFilterAll: coreRef.getRowByFilterAll,
          getRowIndexByFilter: coreRef.getRowIndexByFilter,
          getRowIndexByFilterAll: coreRef.getRowIndexByFilterAll,
        }
      };
      
      this.isTableInitialized = true;
      this.emitEvent('tableInitialized', { exposed: this.exposed });
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
    },
    // 监听数据变化
    data: {
      handler: function() {
        if (!this.mergedConfig.autoRefreshOnPropChange) return;
        this.recreateTable();
      },
      deep: true,
      immediate: false
    },
  }
};
</script>