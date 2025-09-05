<template>
  <div class="lubanno7-universheet-wrapper" :style="config.styleOptions">
    <div ref="sheetContainer" :style="config.styleOptions"></div>
    <!-- 加载遮罩 -->
    <div v-if="pendingUpdates !== 0 || !isTableInitialized" class="custom-loading-mask">
      <div class="loading-content">
        <div class="loading-spinner" :style="{ 'border-top-color': config.loadingMaskColor }"></div>
        <div class="loading-text">{{ config.loadingMessage }}</div>
      </div>
    </div>
    <!-- 空数据遮罩 -->
    <div v-if="isTableInitialized && pendingUpdates === 0 && currentTableData.length === 0" class="empty-data-mask">
      <div class="empty-data-content">
        <div class="empty-data-text">{{ config.emptyDataText }}</div>
      </div>
    </div>
  </div>
</template>

<script>
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation'
import UniverPresetSheetsDataValidationZhCN from '@univerjs/preset-sheets-data-validation/locales/zh-CN'
import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'
import '@univerjs/preset-sheets-data-validation/lib/index.css'

/**
 * 可销毁资源管理器
 * 管理组件内所有需要手动销毁的资源（事件监听、API实例等）
 */
class DisposableManager {
  constructor() {
    // 键：资源标识，值：可销毁实例（需含dispose方法）
    this.disposables = {};
  }

  /**
   * 添加可销毁资源
   * @param {string} id 资源唯一标识
   * @param {object} disposable 可销毁实例（必须包含dispose方法）
   */
  add(id, disposable) {
    if (typeof id !== 'string' || !id) {
      console.error('Disposable ID 必须是有效字符串:', id);
      return;
    }
    if (disposable && typeof disposable.dispose === 'function') {
      // 存在同ID资源时先销毁旧资源
      this.remove(id);
      this.disposables[id] = disposable;
    }
  }

  /**
   * 移除并销毁指定资源
   * @param {string} id 资源唯一标识
   */
  remove(id) {
    if (this.disposables[id]) {
      try {
        this.disposables[id].dispose();
      } catch (e) {
        console.error(`销毁资源 ${id} 失败:`, e);
      }
      delete this.disposables[id];
    }
  }

  /**
   * 销毁所有资源
   */
  disposeAll() {
    Object.keys(this.disposables).forEach(id => this.remove(id));
  }
}

export default {
  name: 'Lubanno7UniverSheetCore',
  props: {
    // 列配置
    columns: {
      type: Array,
      required: true,
      validator: val => Array.isArray(val)
    },
    // 表格数据
    data: {
      type: Array,
      required: true,
      validator: val => Array.isArray(val)
    },
    // config配置
    config: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    /** 是否需要自动刷新（统一判断条件） */
    shouldAutoRefresh() {
      return this.config.autoRefreshOnPropChange;
    },
    /** 表头行数（缓存计算结果） */
    headerRowCount() {
      return this.getHeaderRowCount(this.currentTableColumns);
    },
    /** 扁平化列配置（缓存计算结果，处理嵌套列） */
    flatColumns() {
      return this.flattenColumns(this.currentTableColumns);
    },
    /** 总列数（基于扁平化列配置） */
    totalColumns() {
      return this.flatColumns.length;
    }
  },
  data() {
    return {
      univerInstance: null, // Univer核心实例
      univerAPIInstance: null, // Univer API实例
      isTableInitialized: false, // 表格是否初始化完成
      pendingUpdates: 0, // 待处理更新计数（防止并发冲突）
      headerPermissionId: null, // 表头权限ID
      headerRuleId: null, // 表头规则ID
      currentTableColumns: [], // 当前表格列配置（内部维护）
      currentTableData: [], // 当前表格数据（内部维护）
      disposableManager: new DisposableManager(), // 资源管理器实例
      isEditing: false, // 是否处于编辑状态
      editingCell: { row: -1, column: -1, isNumber: false } // 当前编辑单元格信息
    };
  },
  mounted() {
    this.initSheet(); // 组件挂载后初始化表格
  },
  beforeUnmount() {
    // 组件卸载前销毁所有资源
    this.univerInstance?.dispose();
    this.univerAPIInstance?.dispose();
    this.disposableManager?.disposeAll();
  },
  watch: {
    // 深度监听数据变化，自动刷新
    data: {
      handler(newData) {
        if (!this.shouldAutoRefresh) return;
        this.currentTableData = newData;
        this.refreshTableData();
      },
      deep: true,
      immediate: false
    },
    // 深度监听配置变化，更新表格配置
    config: {
      handler() {
        if (!this.shouldAutoRefresh) return;
        this.setCommonSheetConfig();
      },
      deep: true,
      immediate: false
    }
  },
  methods: {
    // ========================== 初始化相关方法 ==========================
    /**
     * 初始化Univer表格
     * 1. 创建Univer实例
     * 2. 创建工作表
     * 3. 注册事件监听
     */
    initSheet() {
      try {
        // 创建Univer实例（配置国际化和预设）
        const { univer: univerInstance, univerAPI: univerAPIInstance } = createUniver({
          locale: LocaleType.ZH_CN,
          locales: {
            [LocaleType.ZH_CN]: mergeLocales(
              UniverPresetSheetsCoreZhCN,
              UniverPresetSheetsDataValidationZhCN
            )
          },
          presets: [
            // 核心表格预设
            UniverSheetsCorePreset({
              container: this.$refs.sheetContainer,
              header: this.config.showHeader,
              toolbar: this.config.showToolbar,
              footer: this.config.showFooter,
              sheets: { protectedRangeShadow: false }
            }),
            // 数据验证预设（下拉选择等）
            UniverSheetsDataValidationPreset({ showEditOnDropdown: false })
          ]
        });

        this.univerInstance = univerInstance;
        this.univerAPIInstance = univerAPIInstance;

        // 创建工作表（使用配置的表名）
        univerAPIInstance.createWorkbook({
          sheets: {
            [this.config.sheetName]: {
              id: this.config.sheetName,
              name: this.config.sheetName,
              defaultRowHeight: this.config.commonStyle.defaultRowHeight,
              defaultColumnWidth: this.config.commonStyle.defaultColumnWidth
            }
          }
        });

        // 注册所有事件监听
        this.registerEvents();
      } catch (error) {
        this.handleError('初始化表格失败', error);
      }
    },

    /**
     * 注册所有事件监听
     * 统一管理事件订阅，便于销毁
     */
    registerEvents() {
      // 事件配置列表（事件标识 + 事件类型 + 处理函数）
      const events = [
        {
          id: 'lifecycleDisposable',
          eventType: this.univerAPIInstance.Event.LifeCycleChanged,
          handler: this.handleLifeCycleChanged
        },
        {
          id: 'sheetValueChangedDisposable',
          eventType: this.univerAPIInstance.Event.SheetValueChanged,
          handler: this.handleSheetValueChanged
        },
        {
          id: 'sheetSkeletonChangedDisposable',
          eventType: this.univerAPIInstance.Event.SheetSkeletonChanged,
          handler: this.handleSheetSkeletonChanged
        },
        {
          id: 'beforeCommandExecuteDisposable',
          eventType: this.univerAPIInstance.Event.BeforeCommandExecute,
          handler: this.handleBeforeCommandExecute
        },
        {
          id: 'beforeClipboardChangeDisposable',
          eventType: this.univerAPIInstance.Event.BeforeClipboardChange,
          handler: this.handleBeforeClipboardChange
        },
        {
          id: 'cellClickedDisposable',
          eventType: this.univerAPIInstance.Event.CellClicked,
          handler: this.handleCellClicked
        },
        {
          id: 'sheetEditStartedDisposable',
          eventType: this.univerAPIInstance.Event.SheetEditStarted,
          handler: this.handleSheetEditStarted
        },
        {
          id: 'sheetEditEndedDisposable',
          eventType: this.univerAPIInstance.Event.SheetEditEnded,
          handler: this.handleSheetEditEnded
        }
      ];

      // 批量注册事件
      events.forEach(({ id, eventType, handler }) => {
        this.disposableManager.add(id,
          this.univerAPIInstance.addEvent(eventType, handler.bind(this))
        );
      });

      // 注册鼠标滚轮事件
      this.addWheelEventListener();
    },

    /**
     * 添加鼠标滚轮事件监听（数字单元格编辑时调整值）
     */
    addWheelEventListener() {
      const sheetContainer = this.$refs.sheetContainer;
      if (!sheetContainer) return;

      // 滚轮事件处理函数
      const handleWheel = (event) => {
        const { enabled } = this.config.wheelNumberControl;
        // 仅在配置启用且编辑数字单元格时处理
        if (!enabled || !this.isEditing || !this.editingCell.isNumber) return;

        event.preventDefault();
        this.withPendingUpdate(async () => {
          try {
            const worksheet = this.getActiveWorksheet();
            const { row, column } = this.editingCell;
            const cellRange = this.getCellRange(worksheet, row, column);

            // 解析单元格值（处理字符串转数字）
            let currentValue = this.parseCellValue(cellRange.getValue());
            if (typeof currentValue !== 'number' || isNaN(currentValue)) return;

            // 计算新值（根据滚轮方向和Shift键调整步长）
            const delta = event.deltaY > 0 ? -1 : 1;
            const { step, shiftStep } = this.config.wheelNumberControl;
            const actualStep = event.shiftKey ? shiftStep : step;
            const newValue = currentValue + delta * actualStep;

            // 更新单元格值并触发变化事件
            cellRange.setValue(newValue);
            this.handleSheetValueChanged({
              effectedRanges: [cellRange]
            });
          } catch (error) {
            this.handleError('处理滚轮事件失败', error);
          }
        });
      };

      // 绑定事件并注册销毁
      sheetContainer.addEventListener('wheel', handleWheel);
      this.disposableManager.add('wheelEventListenerDisposable', {
        dispose: () => sheetContainer.removeEventListener('wheel', handleWheel)
      });
    },

    // ========================== 事件处理相关方法 ==========================
    /**
     * 处理Univer生命周期变化
     * 主要监听Rendered阶段，初始化表格数据和样式
     */
    handleLifeCycleChanged({ stage }) {
      if (stage !== this.univerAPIInstance.Enum.LifecycleStages.Rendered) return;

      this.withPendingUpdate(async () => {
        try {
          const worksheet = this.getActiveWorksheet();
          // 同步初始列和数据
          this.currentTableColumns = this.columns;
          this.currentTableData = this.data;

          // 初始化表格流程
          this.setCommonSheetConfigBeforeSetData(worksheet);
          await this.setColumns(worksheet); // 设置列（含表头）
          await this.setData(worksheet); // 设置数据
          await this.setCommonSheetConfigAfterSetData(); // 设置权限等后续配置

          // 初始化完成标记
          this.isTableInitialized = true;
          this.$emit('tableInitialized');
        } catch (error) {
          this.handleError('初始化表格数据失败', error);
        }
      });
    },

    /**
     * 处理单元格值变化
     * 同步内部数据并触发外部更新事件
     */
    handleSheetValueChanged({ effectedRanges }) {
      if (this.pendingUpdates || !this.isTableInitialized || !effectedRanges.length) return;

      try {
        const range = effectedRanges[0];
        const { startRow, startColumn } = range._range;
        const newValue = range.getValue();

        // 过滤表头区域（仅处理数据行）
        if (startRow < this.headerRowCount) return;

        // 计算数据行索引和列名
        const rowDataIndex = startRow - this.headerRowCount;
        const changedRow = this.currentTableData[rowDataIndex];
        if (!changedRow) return;

        const changedColumn = this.getColumnName(startColumn);
        const oldValue = changedRow[changedColumn];

        // 数值无变化则跳过
        if (oldValue === newValue || newValue === null) return;

        // 同步内部数据并触发外部事件
        const updatedRow = { ...changedRow, [changedColumn]: newValue };
        this.currentTableData[rowDataIndex] = updatedRow;
        this.$emit('updateData', {
          changedRow: updatedRow,
          changedRowIndex: rowDataIndex,
          changedColumn,
          changedColumnIndex: startColumn,
          oldValue,
          newValue,
          currentTableData: [...this.currentTableData]
        });
      } catch (error) {
        this.handleError('处理单元格值变化失败', error);
      }
    },

    /**
     * 处理表格结构变化（插入/删除行）
     */
    handleSheetSkeletonChanged({ payload }) {
      if (this.pendingUpdates) return;

      switch (payload.id) {
        case this.univerAPIInstance.Enum.SheetSkeletonChangeType.INSERT_ROW:
          this.handleInsertRow(payload.params.range);
          break;
        case this.univerAPIInstance.Enum.SheetSkeletonChangeType.REMOVE_ROW:
          this.handleDeleteRow(payload.params.range);
          break;
      }
    },

    /**
     * 处理单元格点击事件
     */
    handleCellClicked(params) {
      const { row, column, value } = params;
      // 过滤表头区域
      if (row < this.headerRowCount) return;

      const rowDataIndex = row - this.headerRowCount;
      const clickedRow = this.currentTableData[rowDataIndex];
      if (!clickedRow) return;

      // 触发外部点击事件
      this.$emit('cellClicked', {
        clickedRow: { ...clickedRow },
        clickedRowIndex: rowDataIndex,
        clickedColumn: this.getColumnName(column),
        clickedColumnIndex: column,
        value
      });
    },

    /**
     * 处理单元格编辑开始
     */
    handleSheetEditStarted(params) {
      const { row, column } = params;
      const cellRange = this.getCellRange(this.getActiveWorksheet(), row, column);
      const cellValue = cellRange.getValue();

      // 标记编辑状态和单元格类型（是否为数字）
      this.isEditing = true;
      this.editingCell = {
        row,
        column,
        isNumber: typeof cellValue === 'number' || 
          (typeof cellValue === 'string' && cellValue.trim() !== '' && !isNaN(Number(cellValue)))
      };
    },

    /**
     * 处理单元格编辑结束
     */
    handleSheetEditEnded() {
      this.isEditing = false;
      this.editingCell = { row: -1, column: -1, isNumber: false };
    },

    /**
     * 处理命令执行前事件（拦截非法操作）
     */
    handleBeforeCommandExecute(event) {
      if (this.pendingUpdates) return;

      const { params, id } = event;
      switch (id) {
        case 'sheet.command.insert-row':
          this.handleInsertRowCommand(params, event);
          break;
        case 'sheet.command.remove-row':
          this.handleRemoveRowCommand(params, event);
          break;
        case 'sheet.command.auto-fill':
          this.handleAutoFillCommand(params, event);
          break;
        case 'sheet.operation.set-activate-cell-edit':
          this.handleSetActivateCellEdit(params, event);
          break;
        case 'sheet.command.add-worksheet-merge':
        case 'sheet.command.remove-worksheet-merge':
          this.handleMergeCellCommand(id, event);
          break;
        case 'sheet.command.move-range':
          this.handleMoveRangeCommand(params, event);
          break;
      }
    },

    /**
     * 处理剪贴板操作前事件（禁止复制表头）
     */
    handleBeforeClipboardChange(params) {
      const { startRow } = params.fromRange._range;
      if (startRow < this.headerRowCount) {
        params.cancel = true;
        this.$message?.error(this.config.messages.copyHeaderError);
      }
    },

    // ========================== 命令处理子方法 ==========================
    /** 处理插入行命令（禁止表头区域插入） */
    handleInsertRowCommand(params, event) {
      if (params.range.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.insertRowError);
      }
    },

    /** 处理删除行命令（禁止表头区域删除） */
    handleRemoveRowCommand(params, event) {
      if (params.range.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.deleteRowError);
      }
    },

    /** 处理自动填充命令（禁止跨表头填充、只读单元格填充） */
    handleAutoFillCommand(params, event) {
      const { sourceRange, targetRange } = params;

      // 禁止从表头开始填充
      if (sourceRange.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.autoFillFromHeaderError);
        return;
      }

      // 禁止填充到表头
      if (targetRange.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.autoFillToHeaderError);
        return;
      }

      // 禁止包含只读单元格的填充
      if (this.hasReadOnlyCellInRange(sourceRange) || this.hasReadOnlyCellInRange(targetRange)) {
        event.cancel = true;
        this.$message?.error(this.config.messages.readonlyCellAutoFillError);
      }
    },

    /** 处理单元格编辑命令（禁止表头编辑、只读单元格编辑） */
    handleSetActivateCellEdit(params, event) {
      const { startRow, startColumn } = params.primary;
      // 禁止表头编辑
      if (startRow < this.headerRowCount) {
        event.cancel = true;
        return;
      }
      // 禁止只读单元格编辑
      if (this.isCellReadonly(startRow, startColumn)) {
        event.cancel = true;
      }
    },

    /** 处理合并/取消合并命令（禁止合并操作） */
    handleMergeCellCommand(id, event) {
      if (this.isTableInitialized) {
        event.cancel = true;
        const message = id === 'sheet.command.add-worksheet-merge'
          ? this.config.messages.mergeCellError
          : this.config.messages.unmergeCellError;
        this.$message?.error(message);
      }
    },

    /** 处理移动范围命令（禁止跨表头移动、只读单元格移动） */
    handleMoveRangeCommand(params, event) {
      const { fromRange, toRange } = params;

      // 禁止移动表头行
      if (fromRange.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.moveHeaderError);
        return;
      }

      // 禁止移动到表头区域
      if (toRange.startRow < this.headerRowCount) {
        event.cancel = true;
        this.$message?.error(this.config.messages.moveToHeaderError);
        return;
      }

      // 禁止包含只读单元格的移动
      if (this.hasReadOnlyCellInRange(fromRange) || this.hasReadOnlyCellInRange(toRange)) {
        event.cancel = true;
        this.$message?.error(this.config.messages.readonlyCellMoveError);
      }
    },

    // ========================== 数据操作相关方法 ==========================
    /**
     * 设置表格列配置（含表头、合并、样式）
     */
    async setColumns(worksheet) {
      if (!this.currentTableColumns.length) {
        worksheet.setColumnCount(1);
        return;
      }

      // 生成表头数据和合并信息（处理嵌套表头）
      const { headerRows, mergeInfos } = this.generateHeaderRows(this.currentTableColumns);
      worksheet.setColumnCount(headerRows[0].length);

      // 分批加载表头（避免UI阻塞）
      await this.loadHeaderInBatches(worksheet, headerRows, mergeInfos);
    },

    /**
     * 设置表格数据（分批加载，避免UI阻塞）
     */
    async setData(worksheet) {
      if (!this.currentTableData.length) {
        worksheet.setRowCount(1);
        return;
      }

      // 设置总行数（表头行 + 数据行）
      worksheet.setRowCount(this.headerRowCount + this.currentTableData.length);
      // 分批加载数据
      await this.loadDataInBatches(worksheet);
    },

    /**
     * 刷新表格数据（外部调用入口）
     */
    async refreshTableData() {
      if (!this.univerAPIInstance || !this.isTableInitialized) return;

      this.withPendingUpdate(async () => {
        try {
          const worksheet = this.getActiveWorksheet();
          await this.setData(worksheet);
          this.$emit('tableDataRefreshed');
        } catch (error) {
          this.handleError('刷新表格数据失败', error);
        }
      });
    },

    /**
     * 同步内部表格数据（从Univer实例读取最新数据）
     */
    syncCurrentTableData() {
      if (!this.univerAPIInstance || !this.isTableInitialized) return;

      try {
        const worksheet = this.getActiveWorksheet();
        const lastRow = worksheet.getLastRow();
        const lastColumn = worksheet.getLastColumn();

        // 无数据行时清空
        if (lastRow < this.headerRowCount) {
          this.currentTableData = [];
          return;
        }

        // 读取数据区域并转换为内部格式
        const dataRange = worksheet.getRange(
          this.headerRowCount,
          0,
          lastRow - this.headerRowCount + 1,
          lastColumn + 1
        );
        const dataValues = dataRange.getValues();

        // 映射为键值对格式
        this.currentTableData = dataValues.map(row => {
          const rowData = {};
          row.forEach((cellValue, colIndex) => {
            const column = this.flatColumns[colIndex];
            if (column) {
              const field = column.prop || column.dataIndex;
              if (field) rowData[field] = cellValue;
            }
          });
          return rowData;
        });
      } catch (error) {
        this.handleError('同步表格数据失败', error);
      }
    },

    // ========================== 行操作相关方法 ==========================
    /**
     * 处理插入行（同步内部数据并触发事件）
     */
    handleInsertRow(range) {
      const { startRow, endRow } = range;
      if (startRow < this.headerRowCount) return;

      // 计算数据行索引
      const insertStartIdx = startRow - this.headerRowCount;
      const insertEndIdx = endRow - this.headerRowCount;
      const insertCount = insertEndIdx - insertStartIdx + 1;

      // 创建空行并插入
      const insertRows = this.createEmptyRows(insertCount);
      this.currentTableData.splice(insertStartIdx, 0, ...insertRows);

      // 触发外部事件
      this.$emit('insertRow', {
        insertRows,
        insertRowStartIndex: insertStartIdx,
        insertRowEndIndex: insertEndIdx,
        currentTableData: [...this.currentTableData]
      });
    },

    /**
     * 处理删除行（同步内部数据并触发事件）
     */
    handleDeleteRow(range) {
      const { startRow, endRow } = range;
      if (startRow < this.headerRowCount) return;

      // 计算数据行索引
      const deleteStartIdx = startRow - this.headerRowCount;
      const deleteEndIdx = endRow - this.headerRowCount;
      const deleteCount = deleteEndIdx - deleteStartIdx + 1;

      // 边界校验
      if (deleteStartIdx >= this.currentTableData.length) return;

      // 获取删除的行数据并删除
      const deleteRows = this.currentTableData.splice(deleteStartIdx, deleteCount);

      // 触发外部事件
      this.$emit('deleteRow', {
        deleteRows,
        deleteRowStartIndex: deleteStartIdx,
        deleteRowEndIndex: deleteEndIdx,
        currentTableData: [...this.currentTableData]
      });
    },

    /**
     * 向表尾插入行
     */
    insertRowToEnd(row) {
      this.withPendingUpdate(() => {
        // 参数校验
        if (!row || typeof row !== 'object') {
          this.handleError('插入行失败：行数据必须是对象');
          return;
        }

        const worksheet = this.getActiveWorksheet();
        this.syncCurrentTableData();

        // 计算插入位置
        const lastDataRow = this.headerRowCount + this.currentTableData.length - 1;
        const insertRowIdx = lastDataRow + 1;

        // 插入行并填充数据
        worksheet.insertRowAfter(lastDataRow);
        worksheet.setRowCount(insertRowIdx + 1);
        const flattenedRow = this.flattenRowData(row, this.currentTableColumns);
        flattenedRow.forEach((value, colIndex) => {
          this.setCellValue(worksheet, insertRowIdx, colIndex, value);
        });

        // 应用编辑器配置（下拉选择等）
        this.applyRowEditor(worksheet, this.currentTableData.length, row);

        // 同步内部数据并触发事件
        const newRow = { ...row };
        this.currentTableData.push(newRow);
        this.$emit('rowInserted', {
          insertedRows: [newRow],
          insertedRowStartIndex: this.currentTableData.length - 1,
          insertedRowEndIndex: this.currentTableData.length - 1,
          currentTableData: [...this.currentTableData]
        });
      });
    },

    /**
     * 更新指定索引行数据
     */
    updateRowData(index, rowData, mergeWithExisting = true) {
      this.withPendingUpdate(() => {
        // 参数校验
        if (index < 0 || index >= this.currentTableData.length) {
          this.handleError(`更新行失败：索引${index}超出范围`);
          return;
        }
        if (!rowData || typeof rowData !== 'object') {
          this.handleError('更新行失败：行数据必须是对象');
          return;
        }

        const worksheet = this.getActiveWorksheet();
        this.syncCurrentTableData();

        // 保存旧数据并更新
        const oldRow = { ...this.currentTableData[index] };
        this.currentTableData[index] = mergeWithExisting
          ? { ...oldRow, ...rowData }
          : { ...rowData };

        // 更新表格单元格
        const actualRowIdx = this.headerRowCount + index;
        const flattenedRow = this.flattenRowData(this.currentTableData[index], this.currentTableColumns);
        flattenedRow.forEach((value, colIndex) => {
          this.setCellValue(worksheet, actualRowIdx, colIndex, value);
        });

        // 应用编辑器配置
        this.applyRowEditor(worksheet, index, this.currentTableData[index]);

        // 触发外部事件
        this.$emit('rowUpdated', {
          index,
          oldRow,
          newRow: { ...this.currentTableData[index] },
          currentTableData: [...this.currentTableData]
        });
      });
    },

    // ========================== 样式与权限相关方法 ==========================
    /**
     * 设置表格通用配置（整合前后置配置）
     */
    setCommonSheetConfig() {
      const worksheet = this.getActiveWorksheet();
      this.setCommonSheetConfigBeforeSetData(worksheet);
      this.setCommonSheetConfigAfterSetData();
    },

    /**
     * 设置表格前置配置（数据加载前的样式、默认配置）
     */
    setCommonSheetConfigBeforeSetData(worksheet) {
      // 设置默认单元格样式
      worksheet.setDefaultStyle({
        fs: this.config.commonStyle.fontSize,
        ht: this.univerAPIInstance.Enum.HorizontalAlign.LEFT,
        vt: this.univerAPIInstance.Enum.VerticalAlign.MIDDLE,
        tb: this.univerAPIInstance.Enum.WrapStrategy.WRAP,
        bg: { rgb: this.config.commonStyle.backgroundColor },
        bd: {
          t: { cl: { rgb: this.config.commonStyle.borderColor } },
          b: { cl: { rgb: this.config.commonStyle.borderColor } },
          l: { cl: { rgb: this.config.commonStyle.borderColor } },
          r: { cl: { rgb: this.config.commonStyle.borderColor } }
        },
        cl: { rgb: this.config.commonStyle.color },
        pd: { t: 0, b: 0, l: 8, r: 0 }
      });
      // 设置缩放比例
      worksheet.zoom(this.config.zoom);
    },

    /**
     * 设置表格后置配置（数据加载后的权限、保护等）
     */
    async setCommonSheetConfigAfterSetData() {
      const workbook = this.getActiveWorkbook();
      const worksheet = this.getActiveWorksheet();
      const permission = workbook.getPermission();
      const unitId = workbook.getId();
      const subUnitId = worksheet.getSheetId();

      // 设置工作簿权限
      this.setWorkbookPermission(unitId, permission);
      // 设置工作表权限
      await this.setWorksheetPermission(unitId, subUnitId, permission);
      // 设置表头保护权限
      // await this.setHeaderProtectionPermission(unitId, subUnitId, worksheet, permission);
    },

    /**
     * 设置工作簿权限
     */
    setWorkbookPermission(unitId, permission) {
      const permissions = {
        WorkbookEditablePermission: true,
        WorkbookPrintPermission: true,
        WorkbookCommentPermission: true,
        WorkbookViewPermission: true,
        WorkbookCopyPermission: true,
        WorkbookExportPermission: true,
        WorkbookManageCollaboratorPermission: false,
        WorkbookCreateSheetPermission: false,
        WorkbookDeleteSheetPermission: false,
        WorkbookRenameSheetPermission: false,
        WorkbookHideSheetPermission: false,
        WorkbookSharePermission: true,
        WorkbookMoveSheetPermission: false
      };

      Object.entries(permissions).forEach(([key, value]) => {
        permission.setWorkbookPermissionPoint(
          unitId,
          permission.permissionPointsDefinition[key],
          value
        );
      });
    },

    /**
     * 设置工作表权限
     */
    async setWorksheetPermission(unitId, subUnitId, permission) {
      const permissions = {
        WorksheetCopyPermission: true,
        WorksheetDeleteColumnPermission: false,
        WorksheetDeleteRowPermission: this.config.allowDeleteRow,
        WorksheetFilterPermission: true,
        WorksheetInsertColumnPermission: false,
        WorksheetInsertHyperlinkPermission: true,
        WorksheetInsertRowPermission: this.config.allowInsertRow,
        WorksheetPivotTablePermission: true,
        WorksheetSetCellStylePermission: true,
        WorksheetSetCellValuePermission: true,
        WorksheetSetColumnStylePermission: true,
        WorksheetSetRowStylePermission: true,
        WorksheetSortPermission: true,
        WorksheetViewPermission: true,
        WorksheetEditPermission: true
      };
      
      const worksheetPermissionId = await permission.addWorksheetBasePermission(unitId, subUnitId);
      permission.sheetRuleChangedAfterAuth$.subscribe(currentId => {
        if (currentId === worksheetPermissionId) {
          Object.entries(permissions).forEach(([key, value]) => {
            permission.setWorksheetPermissionPoint(
              unitId,
              subUnitId,
              permission.permissionPointsDefinition[key],
              value
            );
          });
        }
      });
    },

    /**
     * 设置表头保护权限
     */
    async setHeaderProtectionPermission(unitId, subUnitId, worksheet, permission) {
      const headerRange = worksheet.getRange(0, 0, this.headerRowCount, this.totalColumns);
      const { permissionId, ruleId } = await permission.addRangeBaseProtection(unitId, subUnitId, [headerRange]);

      this.headerPermissionId = permissionId;
      this.headerRuleId = ruleId;

      // 表头保护权限（仅查看，禁止编辑）
      const permissions = {
        RangeProtectionPermissionViewPoint: true,
        RangeProtectionPermissionEditPoint: false
      };

      permission.rangeRuleChangedAfterAuth$.subscribe(currentId => {
        if (currentId === permissionId) {
          Object.entries(permissions).forEach(([key, value]) => {
            permission.setRangeProtectionPermissionPoint(
              unitId,
              subUnitId,
              permissionId,
              permission.permissionPointsDefinition[key],
              value
            );
          });
        }
      });
    },

    /**
     * 更新只读单元格样式
     */
    updateReadonlyCellStyles(worksheet) {
      if (!worksheet || !this.config.readonlyCellStyle) return;

      const readonlyStyle = this.config.readonlyCellStyle;
      const totalDataRows = this.currentTableData.length;

      // 遍历所有数据行的单元格
      this.batchProcess(0, totalDataRows, this.config.batchSize, async (startIdx, endIdx) => {
        for (let rowDataIdx = startIdx; rowDataIdx < endIdx; rowDataIdx++) {
          const actualRowIdx = this.headerRowCount + rowDataIdx;
          for (let colIdx = 0; colIdx < this.totalColumns; colIdx++) {
            if (this.isCellReadonly(actualRowIdx, colIdx)) {
              const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);
              // 应用只读样式
              cellRange.setBackgroundColor(readonlyStyle.backgroundColor);
              cellRange.setFontWeight(readonlyStyle.fontWeight);
              cellRange.setBorder(
                this.univerAPIInstance.Enum.BorderType.ALL,
                this.univerAPIInstance.Enum.BorderStyleTypes.THIN,
                this.config.commonStyle.borderColor
              );
            }
          }
        }
      });
    },

    /**
     * 设置select类型单元格的数据验证（下拉选择）
     */
    async setSelectCellDataValidation(worksheet) {
      if (!this.univerAPIInstance) return;

      const totalCells = this.currentTableData.length * this.totalColumns;
      // 分批处理，避免UI阻塞
      await this.batchProcess(0, totalCells, this.config.batchSize, async (startIdx, endIdx) => {
        for (let i = startIdx; i < endIdx; i++) {
          try {
            // 计算行列索引
            const rowDataIdx = Math.floor(i / this.totalColumns);
            const colIdx = i % this.totalColumns;
            const row = this.currentTableData[rowDataIdx];
            const column = this.flatColumns[colIdx];
            if (!column) continue;

            // 获取编辑器配置（处理函数/对象两种形式）
            const editorConfig = this.getEditorConfig(column.editor, {
              row,
              rowIndex: rowDataIdx,
              column,
              columnIndex: colIdx
            });
            if (!editorConfig || editorConfig.type !== 'select') continue;

            // 解析select配置
            const { options = [], multiple = false, allowInput = false, selectValidationError } = editorConfig;
            const errorMsg = selectValidationError || (allowInput 
              ? this.config.messages.selectValidationErrorInfo 
              : this.config.messages.selectValidationErrorStop);
            const errorStyle = allowInput 
              ? this.univerAPIInstance.Enum.DataValidationErrorStyle.INFO 
              : this.univerAPIInstance.Enum.DataValidationErrorStyle.STOP;

            // 创建数据验证规则并应用
            const actualRowIdx = this.headerRowCount + rowDataIdx;
            const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);
            const rule = this.univerAPIInstance.newDataValidation()
              .requireValueInList(options, multiple)
              .setOptions({
                renderMode: this.univerAPIInstance.Enum.DataValidationRenderMode.ARROW,
                allowBlank: true,
                showErrorMessage: true,
                error: errorMsg,
                errorStyle
              })
              .build();

            cellRange.setDataValidation(rule);

            // 应用select单元格样式
            if (this.config.selectCellStyle) {
              const selectStyle = this.config.selectCellStyle;
              cellRange.setBackgroundColor(selectStyle.backgroundColor || this.config.commonStyle.backgroundColor);
              if (selectStyle.fontWeight) cellRange.setFontWeight(selectStyle.fontWeight);
            }
          } catch (error) {
            this.handleError(`设置单元格(${rowDataIdx},${colIdx})下拉配置失败`, error);
          }
        }
      });
    },

    /**
     * 应用行编辑器配置（下拉选择、只读样式等）
     */
    applyRowEditor(worksheet, rowDataIdx, rowData) {
      const actualRowIdx = this.headerRowCount + rowDataIdx;
      // 遍历行内所有列
      for (let colIdx = 0; colIdx < this.totalColumns; colIdx++) {
        const column = this.flatColumns[colIdx];
        const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);

        // 重置基础样式
        cellRange.setBackgroundColor(this.config.commonStyle.backgroundColor);
        cellRange.setFontWeight('normal');
        if (this.config.commonStyle.borderColor) {
          cellRange.setBorder(
            this.univerAPIInstance.Enum.BorderType.ALL,
            this.univerAPIInstance.Enum.BorderStyleTypes.THIN,
            this.config.commonStyle.borderColor
          );
        }

        // 清除旧数据验证
        cellRange.setDataValidation(null);

        // 应用只读样式
        if (this.config.readonlyCellStyle && this.isCellReadonly(actualRowIdx, colIdx)) {
          const readonlyStyle = this.config.readonlyCellStyle;
          cellRange.setBackgroundColor(readonlyStyle.backgroundColor);
          cellRange.setFontWeight(readonlyStyle.fontWeight);
        }

        // 应用select编辑器配置
        const editorConfig = this.getEditorConfig(column.editor, {
          row: rowData,
          rowIndex: rowDataIdx,
          column,
          columnIndex: colIdx
        });
        if (editorConfig && editorConfig.type === 'select') {
          this.applySelectEditor(cellRange, editorConfig);
        }
      }
    },

    // ========================== 分批加载相关方法 ==========================
    /**
     * 分批加载表头数据（含合并、样式）
     */
    async loadHeaderInBatches(worksheet, headerRows, mergeInfos) {
      const { batchSize } = this.config;
      const rowCount = headerRows.length;
      const colCount = headerRows[0].length;
      // 基于列数计算单元格分批大小（自适应）
      const cellBatchSize = Math.max(Math.floor((1 / colCount) * batchSize), 1);

      // 1. 分批加载表头单元格值
      await this.batchProcess(0, rowCount, batchSize, async (startRowIdx, endRowIdx) => {
        for (let rowIdx = startRowIdx; rowIdx < endRowIdx; rowIdx++) {
          const row = headerRows[rowIdx];
          // 每行单元格也分批处理
          await this.batchProcess(0, colCount, cellBatchSize, async (startColIdx, endColIdx) => {
            for (let colIdx = startColIdx; colIdx < endColIdx; colIdx++) {
              const cellValue = row[colIdx];
              if (cellValue !== undefined) {
                this.setCellValue(worksheet, rowIdx, colIdx, cellValue);
              }
            }
          });
        }
      });

      // 2. 分批处理表头合并
      await this.batchProcess(0, mergeInfos.length, batchSize, async (startIdx, endIdx) => {
        for (let i = startIdx; i < endIdx; i++) {
          const { startRow, startCol, endRow, endCol } = mergeInfos[i];
          worksheet.getRange(startRow, startCol, endRow - startRow + 1, endCol - startCol + 1).merge();
        }
      });

      // 3. 应用表头样式
      const headerRange = worksheet.getRange(0, 0, rowCount, colCount);
      const headerStyle = this.config.headerStyle;
      headerRange.setBackgroundColor(headerStyle.backgroundColor);
      headerRange.setFontWeight(headerStyle.fontWeight);
      headerRange.setBorder(
        this.univerAPIInstance.Enum.BorderType.ALL,
        this.univerAPIInstance.Enum.BorderStyleTypes.THIN,
        this.config.commonStyle.borderColor
      );

      // 4. 分批设置列宽
      await this.batchProcess(0, this.flatColumns.length, batchSize, async (startIdx, endIdx) => {
        for (let i = startIdx; i < endIdx; i++) {
          const column = this.flatColumns[i];
          if (column.width) worksheet.setColumnWidth(i, column.width);
        }
      });
    },

    /**
     * 分批加载表格数据
     */
    async loadDataInBatches(worksheet) {
      const totalRows = this.currentTableData.length;
      // 基于列数计算行分批大小（自适应）
      const rowBatchSize = Math.max(Math.floor((1 / this.totalColumns) * this.config.batchSize), 1);

      // 分批处理数据行
      await this.batchProcess(0, totalRows, rowBatchSize, async (startIdx, endIdx) => {
        for (let rowDataIdx = startIdx; rowDataIdx < endIdx; rowDataIdx++) {
          const actualRowIdx = this.headerRowCount + rowDataIdx;
          const flattenedData = this.flattenRowData(this.currentTableData[rowDataIdx], this.currentTableColumns);
          // 填充当前行所有单元格
          flattenedData.forEach((value, colIdx) => {
            this.setCellValue(worksheet, actualRowIdx, colIdx, value);
          });
        }
      });

      // 数据加载完成后处理样式和验证
      await this.batchProcess(0, 1, 1, async () => {
        this.updateReadonlyCellStyles(worksheet);
        await this.setSelectCellDataValidation(worksheet);
      });
    },

    // ========================== 工具方法 ==========================
    /**
     * 获取当前激活的工作簿
     */
    getActiveWorkbook() {
      return this.univerAPIInstance?.getActiveWorkbook();
    },

    /**
     * 获取当前激活的工作表
     */
    getActiveWorksheet() {
      const workbook = this.getActiveWorkbook();
      return workbook?.getActiveSheet();
    },

    /**
     * 获取单元格范围
     */
    getCellRange(worksheet, row, col) {
      return worksheet.getRange(row, col, 1, 1);
    },

    /**
     * 设置单元格值
     */
    setCellValue(worksheet, row, col, value) {
      if (typeof value !== 'object' || value === null) {
        this.getCellRange(worksheet, row, col).setValue(value);
      } else {
        this.getCellRange(worksheet, row, col).setValue(JSON.stringify(value));
      }
    },

    /**
     * 获取单元格值
     */
    getCellValue(worksheet, row, col) {
      return this.getCellRange(worksheet, row, col).getValue();
    },

    /**
     * 解析单元格值（字符串转数字）
     */
    parseCellValue(value) {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? Number(trimmed) : NaN;
      }
      return NaN;
    },

    /**
     * 统一错误处理
     */
    handleError(message, error) {
      console.error(`${message}:`, error);
    },

    /**
     * 自动处理pendingUpdates计数
     * 包裹需要加锁的操作，防止并发冲突
     */
    async withPendingUpdate(handler) {
      this.pendingUpdates++;
      try {
        await handler();
      } finally {
        this.pendingUpdates--;
      }
    },

    /**
     * 分批处理工具
     * @param {number} start 起始索引
     * @param {number} total 总数量
     * @param {number} batchSize 每批大小
     * @param {function} processor 每批处理函数
     */
    async batchProcess(start, total, batchSize, processor) {
      if (total <= 0) return;

      let current = start;
      while (current < total) {
        const end = Math.min(current + batchSize, total);
        await new Promise(resolve => requestAnimationFrame(async () => {
          await processor(current, end);
          resolve();
        }));
        current = end;
      }
    },

    /**
     * 获取编辑器配置（统一处理函数/对象）
     */
    getEditorConfig(editor, params) {
      if (!editor) return null;

      // 编辑器为函数时，执行函数获取配置
      if (typeof editor === 'function') {
        try {
          return editor(params) || null;
        } catch (error) {
          this.handleError('执行editor函数失败', error);
          return null;
        }
      }

      // 编辑器为对象时，直接返回
      return typeof editor === 'object' ? editor : null;
    },

    /**
     * 应用select编辑器配置
     */
    applySelectEditor(cellRange, editorConfig) {
      const { options = [], multiple = false, allowInput = false, selectValidationError } = editorConfig;
      const errorMsg = selectValidationError || (allowInput 
        ? this.config.messages.selectValidationErrorInfo 
        : this.config.messages.selectValidationErrorStop);
      const errorStyle = allowInput 
        ? this.univerAPIInstance.Enum.DataValidationErrorStyle.INFO 
        : this.univerAPIInstance.Enum.DataValidationErrorStyle.STOP;

      // 创建并应用数据验证规则
      const rule = this.univerAPIInstance.newDataValidation()
        .requireValueInList(options, multiple)
        .setOptions({
          renderMode: this.univerAPIInstance.Enum.DataValidationRenderMode.ARROW,
          allowBlank: true,
          showErrorMessage: true,
          error: errorMsg,
          errorStyle
        })
        .build();

      cellRange.setDataValidation(rule);

      // 应用select样式
      const selectStyle = this.config.selectCellStyle;
      cellRange.setBackgroundColor(selectStyle.backgroundColor || this.config.commonStyle.backgroundColor);
      if (selectStyle.fontWeight) cellRange.setFontWeight(selectStyle.fontWeight);
    },

    /**
     * 检查单元格是否为只读
     */
    isCellReadonly(rowIdx, colIdx) {
      // 表头行默认只读
      if (rowIdx < this.headerRowCount) return true;
      // 列索引越界时非只读
      if (colIdx >= this.totalColumns) return false;

      const column = this.flatColumns[colIdx];
      const editorConfig = this.getEditorConfig(column.editor, {
        row: this.currentTableData[rowIdx - this.headerRowCount] || {},
        rowIndex: rowIdx - this.headerRowCount,
        column,
        columnIndex: colIdx
      });

      // editor类型为readonly时只读
      return editorConfig?.type === 'readonly';
    },

    /**
     * 检查范围是否包含只读单元格
     */
    hasReadOnlyCellInRange(range) {
      const { startRow, endRow, startColumn, endColumn } = range;

      // 遍历范围内所有单元格
      for (let row = startRow; row <= endRow; row++) {
        // 跳过表头行
        if (row < this.headerRowCount) continue;
        for (let col = startColumn; col <= endColumn; col++) {
          if (this.isCellReadonly(row, col)) return true;
        }
      }
      return false;
    },

    /**
     * 生成表头行数据和合并信息（处理嵌套表头）
     */
    generateHeaderRows(columns) {
      const totalCols = this.calculateTotalColumns(columns);
      const maxDepth = this.calculateMaxDepth(columns);
      // 初始化表头行（空字符串填充）
      const headerRows = Array.from({ length: maxDepth }, () => new Array(totalCols).fill(''));
      const mergeInfos = [];

      // 递归填充表头和合并信息
      this.fillHeader(columns, 0, 0, headerRows, mergeInfos);

      return { headerRows, mergeInfos };
    },

    /**
     * 计算总列数（嵌套列展开后的数量）
     */
    calculateTotalColumns(cols) {
      return cols.reduce((sum, col) => {
        return sum + (col.children?.length ? this.calculateTotalColumns(col.children) : 1);
      }, 0);
    },

    /**
     * 计算表头最大深度（嵌套列的层级）
     */
    calculateMaxDepth(cols) {
      return cols.length 
        ? Math.max(...cols.map(col => col.children?.length ? 1 + this.calculateMaxDepth(col.children) : 1)) 
        : 0;
    },

    /**
     * 递归填充表头数据和合并信息
     */
    fillHeader(cols, row, col, headerRows, mergeInfos) {
      let currentCol = col;

      cols.forEach(column => {
        // 设置当前单元格标签
        headerRows[row][currentCol] = column.label;
        // 计算当前列包含的叶子节点数量
        const leafCount = column.children?.length ? this.calculateTotalColumns(column.children) : 1;

        if (column.children?.length) {
          // 横向合并当前行的列
          mergeInfos.push({
            startRow: row,
            startCol: currentCol,
            endRow: row,
            endCol: currentCol + leafCount - 1
          });
          // 递归处理子列
          currentCol = this.fillHeader(column.children, row + 1, currentCol, headerRows, mergeInfos);
        } else {
          // 叶子节点：纵向合并剩余行
          if (row < headerRows.length - 1) {
            mergeInfos.push({
              startRow: row,
              startCol: currentCol,
              endRow: headerRows.length - 1,
              endCol: currentCol
            });
          }
          currentCol++;
        }
      });

      return currentCol;
    },

    /**
     * 获取表头行数（嵌套列的层级）
     */
    getHeaderRowCount(columns) {
      let maxLevel = 1;
      columns.forEach(col => {
        if (col.children && col.children.length > 0) {
          const level = 1 + this.getHeaderRowCount(col.children);
          maxLevel = Math.max(maxLevel, level);
        }
      });
      return maxLevel;
    },

    /**
     * 创建指定数量的空行
     */
    createEmptyRows(count) {
      return Array.from({ length: count }, () => {
        const emptyRow = {};
        this.flatColumns.forEach(column => {
          emptyRow[column.prop] = '';
        });
        return emptyRow;
      });
    },

    /**
     * 展平行数据（处理嵌套列）
     */
    flattenRowData(row, columns, result = []) {
      columns.forEach(col => {
        if (col.children && col.children.length > 0) {
          this.flattenRowData(row, col.children, result);
        } else {
          result.push(row[col.prop] ?? '');
        }
      });
      return result;
    },

    /**
     * 获取列名（基于扁平化列配置）
     */
    getColumnName(colIdx) {
      if (colIdx < 0 || colIdx >= this.flatColumns.length) return '';
      const column = this.flatColumns[colIdx];
      return column?.prop || column?.dataIndex || '';
    },

    /**
     * 扁平化列配置（处理嵌套列）
     */
    flattenColumns(columns) {
      const result = [];
      const traverse = cols => {
        cols.forEach(col => {
          if (!col.children || col.children.length === 0) {
            result.push(col);
          } else {
            traverse(col.children);
          }
        });
      };
      traverse(columns || []);
      return result;
    },

    /**
     * 获取当前表格数据（外部调用入口，自动同步最新数据）
     */
    getCurrentTableData() {
      this.syncCurrentTableData();
      return this.currentTableData;
    },

    /**
     * 结束当前编辑状态
     */
    endEditing() {
      if (this.univerAPIInstance && this.isTableInitialized) {
        return this.getActiveWorkbook().endEditingAsync(true);
      }
    },

    /**
     * 根据列名获取列索引
     */
    getColumnIndex(columnName) {
      return this.flatColumns.findIndex(item => item.prop === columnName);
    },

    /**
     * 设置指定单元格的字体颜色
     */
    setCellFontColor(rowDataIdx, columnName, color) {
      if (!this.univerAPIInstance || !this.isTableInitialized) {
        this.handleError('设置字体颜色失败：表格未初始化');
        return false;
      }

      try {
        const worksheet = this.getActiveWorksheet();
        const actualRowIdx = this.headerRowCount + rowDataIdx;
        const colIdx = this.getColumnIndex(columnName);

        if (colIdx === -1) {
          this.handleError(`设置字体颜色失败：未找到列${columnName}`);
          return false;
        }

        this.getCellRange(worksheet, actualRowIdx, colIdx).setFontColor(color);
        return true;
      } catch (error) {
        this.handleError('设置字体颜色失败', error);
        return false;
      }
    },

    /**
     * 根据过滤条件获取行索引（单个匹配）
     */
    getRowIndexByFilter(filterObj) {
      return this.currentTableData.findIndex(item => {
        return Object.keys(filterObj).every(key => item[key] === filterObj[key]);
      });
    },

    /**
     * 根据过滤条件获取行索引（所有匹配）
     */
    getRowIndexByFilterAll(filterObj) {
      return this.currentTableData.reduce((indices, item, index) => {
        const isMatch = Object.keys(filterObj).every(key => {
          // 处理undefined/null的相等性
          if (item[key] === undefined || item[key] === null) {
            return filterObj[key] === undefined || filterObj[key] === null;
          }
          return item[key] === filterObj[key];
        });
        if (isMatch) indices.push(index);
        return indices;
      }, []);
    }
  }
};
</script>

<style scoped>
/* 定义CSS变量，统一样式管理 */
.lubanno7-universheet-wrapper {
  position: relative;
  overflow: hidden;
  --loading-bg: rgba(255, 255, 255, 0.8);
  --empty-bg: rgba(255, 255, 255, 0.9);
  --text-color: #333333;
  --empty-text-color: #666666;
  --loading-spinner-size: 40px;
  --loading-text-size: 14px;
  --empty-text-size: 16px;
}

/* 加载遮罩 */
.custom-loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--loading-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  pointer-events: auto;
}

.loading-content {
  text-align: center;
}

.loading-spinner {
  width: var(--loading-spinner-size);
  height: var(--loading-spinner-size);
  border: 4px solid #f3f3f3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

.loading-text {
  color: var(--text-color);
  font-size: var(--loading-text-size);
}

/* 空数据遮罩 */
.empty-data-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--empty-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  pointer-events: auto;
}

.empty-data-content {
  text-align: center;
  padding: 40px;
}

.empty-data-text {
  color: var(--empty-text-color);
  font-size: var(--empty-text-size);
}

/* 旋转动画 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>