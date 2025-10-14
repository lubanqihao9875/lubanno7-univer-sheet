import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { UniverSheetsDataValidationPreset } from '@univerjs/preset-sheets-data-validation'
import { UniverSheetsFilterPreset } from '@univerjs/preset-sheets-filter'
import { UniverSheetsSortPreset } from '@univerjs/preset-sheets-sort'
import { UniverSheetsFindReplacePreset } from '@univerjs/preset-sheets-find-replace'
import UniverPresetSheetsDataValidationZhCN from '@univerjs/preset-sheets-data-validation/locales/zh-CN'
import UniverPresetSheetsDataValidationEnUS from '@univerjs/preset-sheets-data-validation/locales/en-US'
import UniverPresetSheetsFilterZhCN from '@univerjs/preset-sheets-filter/locales/zh-CN'
import UniverPresetSheetsFilterEnUS from '@univerjs/preset-sheets-filter/locales/en-US'
import UniverPresetSheetsSortZhCN from '@univerjs/preset-sheets-sort/locales/zh-CN'
import UniverPresetSheetsSortEnUS from '@univerjs/preset-sheets-sort/locales/en-US'
import UniverPresetSheetsFindReplaceZhCN from '@univerjs/preset-sheets-find-replace/locales/zh-CN'
import UniverPresetSheetsFindReplaceEnUS from '@univerjs/preset-sheets-find-replace/locales/en-US'
import { createUniver, LocaleType, mergeLocales, defaultTheme, greenTheme } from '@univerjs/presets'
import '@univerjs/preset-sheets-core/lib/index.css'
import '@univerjs/preset-sheets-data-validation/lib/index.css'
import '@univerjs/preset-sheets-filter/lib/index.css'
import '@univerjs/preset-sheets-sort/lib/index.css'
import '@univerjs/preset-sheets-find-replace/lib/index.css'

/**
 * 资源管理器
 * 管理组件内所有需要手动释放的资源（如事件监听器、API实例等）
 */
class ResourceManager {
  constructor() {
    // 键：资源标识，值：可释放的资源实例（需含 dispose 方法）
    this.resources = {};
  }

  /**
   * 添加可释放的资源
   * @param {string} id 资源唯一标识
   * @param {object} resource 可释放的资源实例（必须包含 dispose 方法）
   */
  add(id, resource) {
    if (typeof id !== 'string' || !id) {
      console.error('资源 ID 必须是有效字符串:', id);
      return;
    }
    if (resource && typeof resource.dispose === 'function') {
      // 存在同ID资源时先释放旧资源
      this.remove(id);
      this.resources[id] = resource;
    }
  }

  /**
   * 移除并释放指定资源
   * @param {string} id 资源唯一标识
   */
  remove(id) {
    if (this.resources[id]) {
      try {
        this.resources[id].dispose();
      } catch (e) {
        console.error(`释放资源 ${id} 失败:`, e);
      }
      delete this.resources[id];
    }
  }

  /**
   * 释放所有资源
   */
  releaseAll() {
    Object.keys(this.resources).forEach(id => this.remove(id));
  }
}

export default class Lubanno7UniverSheetCore {
  /**
   * 构造函数
   * @param {HTMLElement} container 容器DOM元素
   * @param {Object} options 配置选项对象
   * @param {Array} options.columns 列配置
   * @param {Array} options.data 表格数据
   * @param {Object} options.config 表格配置对象，包含样式、功能等配置
   */
  constructor(container, {columns, data, config = {}}) {
    // 验证参数
    if (!(container instanceof HTMLElement)) {
      throw new Error('container必须是有效的DOM元素');
    }
    if (!Array.isArray(columns)) {
      throw new Error('columns必须是数组');
    }
    if (!Array.isArray(data)) {
      throw new Error('data必须是数组');
    }

    // 初始化基本属性
    this.container = container;
    this.columns = columns;
    this.data = data;
    this.config = config;
    
    // 初始化内部状态
    this.univerInstance = null; // Univer核心实例
    this.univerAPIInstance = null; // Univer API实例
    this.isTableInitialized = false; // 表格是否初始化完成
    this.pendingDataSync = 0; // 待处理数据同步计数（防止并发冲突）
    this.headerPermissionId = null; // 表头权限ID
    this.headerRuleId = null; // 表头规则ID
    this.sheetName = 'Sheet'; // 工作表名称
    this.currentTableColumns = [...columns]; // 当前表格列配置（内部维护）
    this.currentTableData = [...data]; // 当前表格数据（内部维护）
    this.resourceManager = new ResourceManager(); // 资源管理器实例
    this.isEditing = false; // 是否处于编辑状态
    this.hasActiveRangeBeenSet = false; // 是否已设置激活范围
    this.updatingCells = []; // 正在更新的单元格数组
    this.editingCell = { row: -1, column: -1, currentValue: null }; // 当前编辑单元格信息
    this.selectedCell = { row: -1, column: -1, isNumber: false }; // 当前选中单元格信息
    this.viewportScrollY = 0; // 当前视口滚动Y值
    this.isScrolling = false; // 表格是否正在滚动
    
    // 事件监听器
    this.eventListeners = {};
    
    // 初始化表格
    this.initSheet();
  }

  // ========================== 计算属性（Getters）==========================
  /** 表头行数（缓存计算结果） */
  get headerRowCount() {
    return this.getHeaderRowCount(this.currentTableColumns);
  }

  /** 扁平化列配置（缓存计算结果，处理嵌套列） */
  get flatColumns() {
    return this.flattenColumns(this.currentTableColumns);
  }

  /** 总列数（基于扁平化列配置） */
  get totalColumns() {
    return this.flatColumns.length;
  }

  /** 是否启用异步处理 */
  get isAsyncEnabled() {
    return this.config.asyncOptions.isAsyncEnabled;
  }

  /** 边框类型 */
  get borderType() {
    const borderTypeMap = {
      horizontal: 'BOTTOM',
      vertical: 'RIGHT',
      all: 'ALL',
      none: 'NONE'
    };
    return this.univerAPIInstance.Enum.BorderType[borderTypeMap[this.config.commonStyle.borderType]];
  }

  /** 边框样式类型 */
  get borderStyleType() {
    const borderStyleTypeMap = {
      none: 'NONE',
      thin: 'THIN',
      dashed: 'DASHED',
      medium: 'MEDIUM',
      mediumDashed: 'MEDIUM_DASHED',
      thick: 'THICK'
    };
    return this.univerAPIInstance.Enum.BorderStyleTypes[borderStyleTypeMap[this.config.commonStyle.borderStyleType]];
  }

  /** 边框颜色 */
  get borderColor() {
    return this.config.commonStyle.borderColor;
  }

  /** 字体水平对齐 */
  get horizontalAlign() {
    const horizontalAlignMap = {
      left: 'LEFT',
      center: 'CENTER',
      right: 'RIGHT'
    };
    return this.univerAPIInstance.Enum.HorizontalAlign[horizontalAlignMap[this.config.commonStyle.horizontalAlign]];
  }

  /** 字体垂直对齐 */
  get verticalAlign() {
    const verticalAlignMap = {
      top: 'TOP',
      middle: 'MIDDLE',
      bottom: 'BOTTOM'
    };
    return this.univerAPIInstance.Enum.VerticalAlign[verticalAlignMap[this.config.commonStyle.verticalAlign]];
  }

  /** 字体换行策略 */
  get wrapStrategy() {
    const wrapStrategyMap = {
      wrap: 'WRAP',
      overflow: 'OVERFLOW',
      clip: 'CLIP'
    };
    return this.univerAPIInstance.Enum.WrapStrategy[wrapStrategyMap[this.config.commonStyle.wrapStrategy]];
  }

  /** 下拉选择渲染模式 */
  get selectValidationRenderMode() {
    const selectValidationRenderModeMap = {
      text: 'TEXT',
      arrow: 'ARROW',
      custom: 'CUSTOM'
    };
    return this.univerAPIInstance.Enum.DataValidationRenderMode[selectValidationRenderModeMap[this.config.selectOptions.selectValidationRenderMode]];
  }

  /** 是否需要显示加载状态 */
  get shouldShowLoading() {
    return this.pendingDataSync !== 0 || !this.isTableInitialized;
  }

  /** 是否需要显示空状态 */
  get shouldShowEmpty() {
    return this.isTableInitialized && this.pendingDataSync === 0 && this.currentTableData.length === 0;
  }

  // ========================== 生命周期相关方法 ==========================
  /**
   * 初始化Univer表格
   * 1. 创建Univer实例
   * 2. 根据配置选择创建工作表的方式（同步预生成/异步加载）
   * 3. 注册事件监听
   */
  async initSheet() {
    try {
      const presets = [
        UniverSheetsCorePreset({
          container: this.container,
          header: Boolean(this.config.headerOptions.show),
          toolbar: Boolean(this.config.headerOptions.showToolbar),
          ribbonType: this.config.headerOptions.ribbonType,
          footer: Boolean(this.config.footerOptions.show) ? {
            sheetBar: false,
            menus: false,
            statisticBar: Boolean(this.config.footerOptions.showStatisticBar),
            zoomSlider: Boolean(this.config.footerOptions.showZoomSlider)
          } : false,
          contextMenu: Boolean(this.config.showContextMenu),
          sheets: { protectedRangeShadow: false },
          menu: this.getSheetMenuConfig()
        }),
        UniverSheetsDataValidationPreset({ showEditOnDropdown: false }),
      ];
      
      if (this.config.plugins.filter.enabled) {
        presets.push(UniverSheetsFilterPreset({ enableSyncSwitch: false }));
      }
      if (this.config.plugins.sort.enabled) {
        presets.push(UniverSheetsSortPreset());
      }
      if (this.config.plugins.findReplace.enabled) {
        presets.push(UniverSheetsFindReplacePreset());
      }
      
      const { univer: univerInstance, univerAPI: univerAPIInstance } = createUniver({
        locale: this.config.locale === 'zh-CN' ? LocaleType.ZH_CN : LocaleType.EN_US,
        theme: this.config.theme === 'defaultTheme' ? defaultTheme : greenTheme,
        darkMode: Boolean(this.config.darkMode),
        locales: {
          [LocaleType.ZH_CN]: mergeLocales(
            UniverPresetSheetsCoreZhCN,
            UniverPresetSheetsDataValidationZhCN,
            UniverPresetSheetsFilterZhCN,
            UniverPresetSheetsSortZhCN,
            UniverPresetSheetsFindReplaceZhCN
          ),
          [LocaleType.EN_US]: mergeLocales(
            UniverPresetSheetsCoreEnUS,
            UniverPresetSheetsDataValidationEnUS,
            UniverPresetSheetsFilterEnUS,
            UniverPresetSheetsSortEnUS,
            UniverPresetSheetsFindReplaceEnUS
          )
        },
        presets: presets
      });

      this.univerInstance = univerInstance;
      this.univerAPIInstance = univerAPIInstance;

      this.currentTableColumns = this.columns;
      this.currentTableData = this.data;

      // 根据配置选择创建工作表的方式
      if (!this.isAsyncEnabled) {
        // 同步方式：预生成完整数据
        const sheetData = this.generateSyncTableData();
        univerAPIInstance.createWorkbook({
          sheets: {
            [sheetData.id]: sheetData
          }
        });
      } else {
        // 异步方式：先创建空工作表，后续在生命周期中加载数据
        univerAPIInstance.createWorkbook({
          sheets: {
            [this.sheetName]: {
              id: this.sheetName,
              name: this.sheetName,
              defaultColumnWidth: this.config.commonStyle.defaultColumnWidth,
              defaultRowHeight: this.config.commonStyle.defaultRowHeight,
              rowHeader: {
                width: this.config.commonStyle.rowHeader.width,
                hidden: this.config.commonStyle.rowHeader.hidden ? 1 : 0,
              },
              columnHeader: {
                height: this.config.commonStyle.columnHeader.height,
                hidden: this.config.commonStyle.columnHeader.hidden ? 1 : 0,
              }
            }
          }
        });
      }

      // 注册所有事件监听
      this.registerEvents();
    } catch (error) {
      this.handleError('初始化表格失败', error);
    }
  }

  /**
   * 获取表格菜单配置
   * 集中管理所有菜单的显示/禁用状态
   */
  getSheetMenuConfig() {
    return {
      'sheet.command.add-worksheet-merge': { hidden: true },
      'sheet.command.add-range-protection-from-toolbar': { hidden: true },
      'sheet.menu.data-validation': { hidden: true },
      'sheet.command.insert-range-move-right-confirm': { disabled: true },
      'sheet.command.insert-range-move-down-confirm': { disabled: true },
      'sheet.command.delete-range-move-left-confirm': { disabled: true },
      'sheet.command.delete-range-move-up-confirm': { disabled: true },
      'sheet.contextMenu.permission': { hidden: true }
    };
  }

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
        handler: this.handleCellValueChanged
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
        id: 'beforeClipboardPasteDisposable',
        eventType: this.univerAPIInstance.Event.BeforeClipboardPaste,
        handler: this.handleBeforeClipboardPaste
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
      },
      {
        id: 'sheetDataValidatorStatusChangedDisposable',
        eventType: this.univerAPIInstance.Event.SheetDataValidatorStatusChanged,
        handler: this.handleSheetDataValidatorStatusChanged
      },
      {
        id: 'sheetEditChangingDisposable',
        eventType: this.univerAPIInstance.Event.SheetEditChanging,
        handler: this.handleSheetEditChanging
      },
      {
        id: 'scrollDisposable',
        eventType: this.univerAPIInstance.Event.Scroll,
        handler: this.handleScroll
      }
    ];

    // 批量注册事件
    events.forEach(({ id, eventType, handler }) => {
      this.resourceManager.add(id,
        this.univerAPIInstance.addEvent(eventType, handler.bind(this))
      );
    });

    // 注册鼠标滚轮事件
    this.addWheelEventListener();
  }

  /**
   * 添加鼠标滚轮事件监听
   */
  addWheelEventListener() {
    const sheetContainer = this.sheetContainer;
    if (!sheetContainer) return;

    // 捕获阶段的滚轮事件处理函数
    const handleWheelCapture = (event) => {
      const { mode } = this.config.wheelNumberControl;

      let targetCell = null;
      let currentValue = null;

      // 如果是editOnly或selected模式且正在编辑单元格，检查编辑单元格
      if ((mode === 'editOnly' || mode === 'selected') && this.isEditing && this.editingCell.row !== -1) {
        targetCell = this.editingCell;
        currentValue = targetCell.currentValue;
      }
      // 如果是selected模式且不在编辑态，检查选中的单元格
      else if (mode === 'selected' && !this.isEditing && this.selectedCell.row !== -1) {
        targetCell = this.selectedCell;
        // 获取选中单元格的当前值
        const worksheet = this.getActiveWorksheet();
        const cellRange = this.getCellRange(worksheet, targetCell.row, targetCell.column);
        currentValue = cellRange.getValue();
      }

      // 如果没有符合条件的目标单元格，返回
      if (!targetCell) return;

      // 检查单元格是否为只读
      if (this.isCellReadonly(targetCell.row, targetCell.column)) return;

      // 获取当前单元格相关信息
      const { row: cellRow, column: cellCol } = targetCell;
      const rowIndex = cellRow - this.headerRowCount;
      const rowData = this.currentTableData[rowIndex];
      const column = this.flatColumns[cellCol];

      // 检查单元格是否允许操作
      const wheelControl = this.config.wheelNumberControl;
      const isCellAllowed = typeof wheelControl.isCellAllowed === 'function'
        ? wheelControl.isCellAllowed({ row: rowData, rowIndex, column, columnIndex: cellCol })
        : wheelControl.isCellAllowed;

      if (!isCellAllowed) return;

      // 实时判断当前值是否为数字
      const parsedValue = this.parseCellValue(currentValue);
      if (typeof parsedValue !== 'number' || isNaN(parsedValue)) return;

      event.preventDefault();
      event.stopPropagation();

      this.withPendingDataSync(async () => {
        try {
          const worksheet = this.getActiveWorksheet();
          const { row, column } = targetCell;
          const cellRange = this.getCellRange(worksheet, row, column);

          // 计算新值（根据滚轮方向和Shift键调整步长）
          const delta = event.deltaY > 0 ? -1 : 1;
          const { step, shiftStep } = this.config.wheelNumberControl;
          const actualStep = event.shiftKey ? shiftStep : step;
          const newValue = parsedValue + delta * actualStep;

          // 更新单元格值并触发变化事件
          cellRange.setValue(newValue);

          // 如果当前正在编辑，同时更新editingCell中的值
          if (this.isEditing && this.editingCell.row === row && this.editingCell.column === column) {
            this.editingCell.currentValue = newValue;
          }

          this.handleCellValueChanged({
            effectedRanges: [cellRange]
          });
        } catch (error) {
          this.handleError('处理滚轮事件失败', error);
        }
      });
    };

    // 冒泡阶段的滚轮事件处理函数
    const handleWheelBubble = (event) => {
      const scrollBehavior = this.config.scrollBehavior;

      if (scrollBehavior === 'prevent-always') {
        // 无论表格是否滚动始终阻止默认行为
        event.preventDefault();
        event.stopPropagation();
      } else if (scrollBehavior === 'stop-at-boundary') {
        // 当表格滚动时阻止外层滚动
        if (this.isScrolling) {
          event.preventDefault();
          event.stopPropagation();
        }
      }
    };

    // 绑定事件并注册销毁
    sheetContainer.addEventListener('wheel', handleWheelCapture, true);
    sheetContainer.addEventListener('wheel', handleWheelBubble);
    this.resourceManager.add('wheelEventListenerDisposable', {
      dispose: () => {
        sheetContainer.removeEventListener('wheel', handleWheelCapture, true);
        sheetContainer.removeEventListener('wheel', handleWheelBubble);
      }
    });
  }

  /**
   * 销毁实例
   */
  dispose() {
    // 销毁Univer实例
    this.univerInstance?.dispose();
    this.univerAPIInstance?.dispose();
    
    // 释放所有资源
    this.resourceManager?.releaseAll();
    
    // 清理事件监听器
    this.eventListeners = {};
    
    this.container = null;
    
    this.univerInstance = null;
    this.univerAPIInstance = null;
    this.resourceManager = null;
  }

  // ========================== 事件处理相关方法 ==========================
  /**
   * 处理Univer生命周期变化
   * 主要监听Rendered阶段，设置表格样式
   */
  handleLifeCycleChanged({ stage }) {
    if (stage !== this.univerAPIInstance.Enum.LifecycleStages.Rendered) return;

    this.withPendingDataSync(async () => {
      try {
        const worksheet = this.getActiveWorksheet();

        // 如果是异步方式，需要加载表头和数据
        if (this.isAsyncEnabled) {
          await this.setColumns(worksheet);
          await this.setData(worksheet);
        }
        
        // 配置通用工作表设置
        this.setCommonSheetConfig(worksheet);

        // 如果是同步方式，需要初始化列宽、活动范围和表头冻结
        if(!this.isAsyncEnabled){
          this.setColumnWidth(worksheet);
          this.setActiveRange(worksheet);
          this.setHeaderFrozen(worksheet);
        }
        
        // 根据配置选择同步或异步方式更新只读单元格样式
        if (!this.isAsyncEnabled) {
          this.updateReadonlyCellStylesSync(worksheet);
        } else {
          await this.updateReadonlyCellStyles(worksheet);
        }
        
        // 根据配置选择同步或异步方式设置数据验证
        if (!this.isAsyncEnabled) {
          this.setCellDataValidationSync(worksheet);
        } else {
          await this.setCellDataValidation(worksheet);
        }

        // 初始化完成标记
        this.isTableInitialized = true;
        this.updateMaskVisibility();
        this.emit('tableInitialized');
      } catch (error) {
        this.handleError('初始化表格数据失败', error);
      }
    });
  }

  /**
   * 处理单元格值变化
   * 同步内部数据并触发外部更新事件
   */
  handleCellValueChanged({ effectedRanges }) {
    if (this.pendingDataSync || !this.isTableInitialized || !effectedRanges.length) return;

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
      this.emit('updateData', {
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
  }

  /**
   * 处理表格结构变化（插入/删除行）
   */
  handleSheetSkeletonChanged({ payload }) {
    if (this.pendingDataSync) return;

    switch (payload.id) {
      case this.univerAPIInstance.Enum.SheetSkeletonChangeType.INSERT_ROW:
        this.handleInsertRow(payload.params.range);
        break;
      case this.univerAPIInstance.Enum.SheetSkeletonChangeType.REMOVE_ROW:
        this.handleDeleteRow(payload.params.range);
        break;
    }
  }

  /**
   * 处理单元格点击事件
   */
  handleCellClicked(params) {
    const { row, column } = params;
    // 过滤表头区域
    if (row < this.headerRowCount) {
      this.selectedCell = { row: -1, column: -1, isNumber: false };
      return;
    }

    const worksheet = this.getActiveWorksheet();
    const value = this.getCellValue(worksheet, row, column);

    // 保存选中单元格信息
    this.selectedCell = {
      row,
      column,
      isNumber: typeof value === 'number' ||
        (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)))
    };
    const rowDataIndex = row - this.headerRowCount;
    const clickedRow = this.currentTableData[rowDataIndex];
    if (!clickedRow) return;

    // 触发外部点击事件
    this.emit('cellClick', {
      clickRow: { ...clickedRow },
      clickRowIndex: rowDataIndex,
      clickColumn: this.getColumnName(column),
      clickColumnIndex: column,
      value
    });
  }

  /**
   * 处理单元格编辑中事件
   */
  handleSheetEditChanging(params) {
    const { row, column } = params;
    const value = params.value.toPlainText();

    // 如果当前正在编辑的单元格和事件中的单元格一致，则更新当前值
    if (this.isEditing &&
      this.editingCell.row === row &&
      this.editingCell.column === column) {
      this.editingCell.currentValue = value;
    }
  }

  /**
   * 处理单元格编辑开始
   */
  handleSheetEditStarted(params) {
    const { row, column } = params;
    const cellRange = this.getCellRange(this.getActiveWorksheet(), row, column);
    const cellValue = cellRange.getValue();

    // 标记编辑状态和单元格信息
    this.isEditing = true;
    this.editingCell = {
      row,
      column,
      currentValue: cellValue
    };
  }

  /**
   * 处理单元格编辑结束
   */
  handleSheetEditEnded() {
    this.isEditing = false;
    this.editingCell = { row: -1, column: -1, currentValue: null };
  }

  /**
   * 处理命令执行前事件（拦截非法操作）
   */
  handleBeforeCommandExecute(event) {
    if (this.pendingDataSync) return;

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
      case 'sheet.operation.set-cell-edit-visible':
        this.handleSetCellEditVisible(event);
        break;
      case 'sheet.command.add-worksheet-merge':
      case 'sheet.command.remove-worksheet-merge':
        this.handleMergeCellCommand(id, event);
        break;
      case 'sheet.command.move-range':
        this.handleMoveRangeCommand(params, event);
        break;
      case 'sheet.command.clear-selection-content':
        this.handleClearSelectionContentCommand(event);
        break;
      case 'sheet.command.move-rows':
        this.handleMoveRowsCommand(params, event);
        break;
      case 'sheet.command.move-cols':
        this.handleMoveColsCommand(event);
        break;
    }
  }

  /**
   * 处理剪贴板操作前事件（禁止复制表头）
   */
  handleBeforeClipboardChange(params) {
    const { startRow } = params.fromRange._range;
    if (startRow < this.headerRowCount) {
      params.cancel = true;
      this.emit('forbiddenAction', { type: 'copyHeaderForbidden' });
    }
  }

  /**
   * 处理剪贴板粘贴前事件（禁止粘贴表头和只读单元格）
   */
  handleBeforeClipboardPaste(params) {
    const { row, column } = this.selectedCell;

    if (row === -1 || column === -1) {
      params.cancel = true;
      this.emit('forbiddenAction', { type: 'pasteHeaderForbidden' });
      return;
    }

    if (this.isCellReadonly(row, column)) {
      params.cancel = true;
      this.emit('forbiddenAction', { type: 'pasteReadonlyCellForbidden' });
    }
  }

  /**
   * 处理数据验证状态变化
   */
  handleSheetDataValidatorStatusChanged(params) {
    const { worksheet, row, column } = params;
    const isUpdating = this.updatingCells.some(cell =>
      cell.row === row && cell.column === column
    );

    if (isUpdating) {
      this.updatingCells = this.updatingCells.filter(cell =>
        !(cell.row === row && cell.column === column)
      );
      return;
    }

    this.updatingCells.push({ row, column });
    const range = worksheet.getRange(row, column, 1, 1);
    range.setFontSize(this.config.commonStyle.fontSize);
    range.setVerticalAlignment(this.config.commonStyle.verticalAlign);
    range.setWrapStrategy(this.wrapStrategy);
  }

  /** 处理滚动事件 */
  handleScroll(params) {
    // 保存当前滚动Y值
    const newScrollY = params.viewportScrollY || 0;

    // 判断是否正在滚动：新滚动值与旧值不同时视为正在滚动；若相同（可能已滚动至顶部或底部），则视为未在滚动
    this.isScrolling = newScrollY !== this.viewportScrollY;

    // 更新滚动Y值
    this.viewportScrollY = newScrollY;
  }

  // ========================== 命令处理子方法 ==========================
  /** 处理插入行命令（禁止表头区域插入） */
  handleInsertRowCommand(params, event) {
    if (params.range.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'insertRowInHeaderForbidden' });
    }
  }

  /** 处理删除行命令（禁止表头区域删除） */
  handleRemoveRowCommand(params, event) {
    if (params.range.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'deleteRowInHeaderForbidden' });
    }
  }

  /** 处理自动填充命令（禁止跨表头填充、只读单元格填充） */
  handleAutoFillCommand(params, event) {
    const { sourceRange, targetRange } = params;

    // 禁止从表头开始填充
    if (sourceRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'autoFillFromHeaderForbidden' });
      return;
    }

    // 禁止填充到表头
    if (targetRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'autoFillToHeaderForbidden' });
      return;
    }

    // 禁止包含只读单元格的填充
    if (this.hasReadOnlyCellInRange(sourceRange) || this.hasReadOnlyCellInRange(targetRange)) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'autoFillReadOnlyCellForbidden' });
      return;
    }
  }

  /** 处理单元格编辑命令（禁止表头编辑、只读单元格编辑） */
  handleSetActivateCellEdit(params, event) {
    const { startRow, startColumn } = params.primary;
    // 禁止表头编辑
    if (startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'editHeaderForbidden' });
      return;
    }
    // 禁止只读单元格编辑
    if (this.isCellReadonly(startRow, startColumn)) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'editReadonlyCellForbidden' });
    }
  }

  /** 处理单元格编辑可见性变化（禁止表头编辑可见性变化、只读单元格编辑可见性变化） */
  handleSetCellEditVisible(event) {
    const { row, column } = this.selectedCell
    // 禁止表头编辑可见性变化
    if (row === -1 || column === -1) {
      event.cancel = true;
    }
    // 禁止只读单元格编辑可见性变化
    if (this.isCellReadonly(row, column)) {
      event.cancel = true;
    }
  }

  /** 处理合并/取消合并命令（禁止合并操作） */
  handleMergeCellCommand(id, event) {
    if (this.isTableInitialized) {
      event.cancel = true;
      this.emit('forbiddenAction', { 
        type: id === 'sheet.command.add-worksheet-merge'
          ? 'mergeCellForbidden'
          : 'unmergeCellForbidden' 
      });
    }
  }

  /** 处理移动范围命令（禁止跨表头移动、只读单元格移动） */
  handleMoveRangeCommand(params, event) {
    const { fromRange, toRange } = params;

    // 禁止移动表头行
    if (fromRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveFromHeaderForbidden' });
      return;
    }

    // 禁止移动到表头区域
    if (toRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveToHeaderForbidden' });
      return;
    }

    // 禁止包含只读单元格的移动
    if (this.hasReadOnlyCellInRange(fromRange) || this.hasReadOnlyCellInRange(toRange)) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveReadOnlyCellForbidden' });
    }
  }

  /** 处理清除选中区域内容命令 (禁止清除表头内容、只读单元格内容) */
  handleClearSelectionContentCommand(event) {
    const { row, column } = this.selectedCell;

    if (row === -1 || column === -1) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'clearHeaderContentForbidden' });
      return;
    }

    if (this.isCellReadonly(row, column)) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'clearReadonlyCellContentForbidden' });
    }
  }

  /** 处理移动行命令 (禁止移动表头行) */
  handleMoveRowsCommand(params, event) {
    const { fromRange, toRange } = params;

    // 禁止移动表头行
    if (fromRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveFromHeaderRowForbidden' });
      return;
    }

    // 禁止移动到表头区域
    if (toRange.startRow < this.headerRowCount) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveToHeaderRowForbidden' });
      return;
    }
  }

  /** 处理移动列命令 (禁止移动列操作) */
  handleMoveColsCommand(event) {
    if (this.isTableInitialized) {
      event.cancel = true;
      this.emit('forbiddenAction', { type: 'moveColsForbidden' });
    }
  }

  // ========================== 数据操作相关方法 ==========================
  /**
   * 生成完整的工作表数据（同步方式使用）
   */
  generateSyncTableData() {
    // 1. 生成表头数据和合并信息
    const { headerRows, mergeInfos } = this.generateHeaderRows(this.currentTableColumns);
    const totalRows = this.headerRowCount + this.currentTableData.length;
    const totalColumns = this.flatColumns.length;

    // 2. 构建完整的cellData对象
    const cellData = {};

    // 3. 填充表头数据
    for (let rowIdx = 0; rowIdx < headerRows.length; rowIdx++) {
      const row = headerRows[rowIdx];
      cellData[rowIdx] = {};
      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const cellValue = row[colIdx];
        if (cellValue !== undefined) {
          cellData[rowIdx][colIdx] = { v: cellValue };
        }
      }
    }

    // 4. 填充表格数据
    for (let rowDataIdx = 0; rowDataIdx < this.currentTableData.length; rowDataIdx++) {
      const actualRowIdx = this.headerRowCount + rowDataIdx;
      const flattenedData = this.flattenRowData(this.currentTableData[rowDataIdx], this.currentTableColumns);

      cellData[actualRowIdx] = {};
      for (let colIdx = 0; colIdx < flattenedData.length; colIdx++) {
        const value = flattenedData[colIdx];
        if (value !== undefined && value !== null) {
          cellData[actualRowIdx][colIdx] = {
            v: typeof value === 'object' ? JSON.stringify(value) : value
          };
        }
      }
    }

    // 5. 构建完整的工作表数据结构
    const sheetData = {
      id: this.sheetName,
      name: this.sheetName,
      cellData,
      rowCount: totalRows,
      columnCount: totalColumns,
      showGridlines: 1,
      mergeData: mergeInfos,
      defaultColumnWidth: this.config.commonStyle.defaultColumnWidth,
      defaultRowHeight: this.config.commonStyle.defaultRowHeight,
      rowHeader: {
        width: this.config.commonStyle.rowHeader.width,
        hidden: this.config.commonStyle.rowHeader.hidden ? 1 : 0,
      },
      columnHeader: {
        height: this.config.commonStyle.columnHeader.height,
        hidden: this.config.commonStyle.columnHeader.hidden ? 1 : 0,
      }
    };

    return sheetData;
  }

  /**
   * 设置列（异步方式使用）
   */
  async setColumns(worksheet) {
    if (!this.currentTableColumns.length) {
      worksheet.setColumnCount(1);
      return;
    }

    // 生成表头数据和合并信息（处理嵌套表头）
    const { headerRows, mergeInfos } = this.generateHeaderRows(this.currentTableColumns);
    worksheet.setColumnCount(headerRows[0].length);
    worksheet.setFrozenRows(headerRows.length);

    // 分批加载表头（避免UI阻塞）
    await this.loadHeaderInBatches(worksheet, headerRows, mergeInfos);
  }

  /**
   * 设置数据（异步方式使用）
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
  }

  /**
   * 分批加载表头数据（含合并、样式）
   */
  async loadHeaderInBatches(worksheet, headerRows, mergeInfos) {
    const { baseBatchSize , loadHeaderBatchRatio, mergeHeaderBatchRatio, setColWidthBatchRatio } = this.config.asyncOptions;
    const loadBatchSize = this.floorMin1(baseBatchSize  * loadHeaderBatchRatio);
    const mergeBatchSize = this.floorMin1(baseBatchSize * mergeHeaderBatchRatio);
    const colWidthBatchSize = this.floorMin1(baseBatchSize * setColWidthBatchRatio);
    const rowCount = headerRows.length;
    const colCount = headerRows[0].length;
    // 基于列数计算单元格分批大小（自适应）
    const cellBatchSize = this.floorMin1((1 / colCount) * loadBatchSize);

    // 1. 分批加载表头单元格值
    await this.batchProcess(0, rowCount, loadBatchSize, async (startRowIdx, endRowIdx) => {
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
    await this.batchProcess(0, mergeInfos.length, mergeBatchSize, async (startIdx, endIdx) => {
      for (let i = startIdx; i < endIdx; i++) {
        const { startRow, startCol, endRow, endCol } = mergeInfos[i];
        worksheet.getRange(startRow, startCol, endRow - startRow + 1, endCol - startCol + 1).merge();
      }
    });

    // 3. 应用表头样式
    const headerRange = worksheet.getRange(0, 0, rowCount, colCount);
    const headerStyle = this.config.headerStyle;
    worksheet.setRowHeights(0, rowCount, headerStyle.headerRowHeight);
    headerRange.setBackgroundColor(headerStyle.backgroundColor);
    headerRange.setFontColor(headerStyle.color);
    headerRange.setFontSize(headerStyle.fontSize);
    headerRange.setFontWeight(headerStyle.fontWeight);
    headerRange.setBorder(
      this.borderType,
      this.borderStyleType,
      this.borderColor
    );

    // 4. 分批设置列宽
    await this.batchProcess(0, this.flatColumns.length, colWidthBatchSize, async (startIdx, endIdx) => {
      for (let i = startIdx; i < endIdx; i++) {
        const column = this.flatColumns[i];
        if (column.width) worksheet.setColumnWidth(i, column.width);
      }
    });
  }

  /**
   * 分批加载表格数据
   */
  async loadDataInBatches(worksheet) {
    const totalRows = this.currentTableData.length;
    // 基于列数计算行分批大小（自适应）
    const rowBatchSize = this.floorMin1((1 / this.totalColumns) * this.config.asyncOptions.baseBatchSize * this.config.asyncOptions.loadDataBatchRatio);

    this.hasActiveRangeBeenSet = false;

    // 分批处理数据行
    await this.batchProcess(0, totalRows, rowBatchSize, async (startIdx, endIdx) => {
      for (let rowDataIdx = startIdx; rowDataIdx < endIdx; rowDataIdx++) {
        const actualRowIdx = this.headerRowCount + rowDataIdx;
        const flattenedData = this.flattenRowData(this.currentTableData[rowDataIdx], this.currentTableColumns);
        flattenedData.forEach((value, colIndex) => {
          this.setCellValue(worksheet, actualRowIdx, colIndex, value);
          if (!this.hasActiveRangeBeenSet && !this.isCellReadonly(actualRowIdx, colIndex)) {
            worksheet.getRange(actualRowIdx, colIndex, 1, 1).activate();
            this.hasActiveRangeBeenSet = true;
          }
        });
      }
    });

    // 数据加载完成后处理样式和验证
    await this.batchProcess(0, 1, 1, async () => {
      this.updateReadonlyCellStyles(worksheet);
      await this.setCellDataValidation(worksheet);
    });
  }

  /**
   * 设置列宽
   */
  setColumnWidth(worksheet) {
    for (let i = 0; i < this.flatColumns.length; i++) {
      const column = this.flatColumns[i];
      if (column.width && column.width !== this.config.commonStyle.defaultColumnWidth) {
        worksheet.setColumnWidth(i, column.width);
      }
    }
  }

  /**
   * 设置活动范围
   */
  setActiveRange(worksheet) {
    this.hasActiveRangeBeenSet = false;
    // 遍历所有非表头单元格
    for (let rowDataIdx = 0; rowDataIdx < this.currentTableData.length; rowDataIdx++) {
      const actualRowIdx = this.headerRowCount + rowDataIdx;
      const flattenedData = this.flattenRowData(this.currentTableData[rowDataIdx], this.currentTableColumns);

      for (let colIndex = 0; colIndex < flattenedData.length; colIndex++) {
        // 检查单元格是否为非只读
        if (!this.isCellReadonly(actualRowIdx, colIndex)) {
          // 设置单元格为激活状态
          worksheet.getRange(actualRowIdx, colIndex, 1, 1).activate();
          this.hasActiveRangeBeenSet = true;
          // 找到第一个非只读单元格后立即退出循环
          return;
        }
      }
    }
  }

  /**
   * 设置表头冻结
   */
  setHeaderFrozen(worksheet) {
    worksheet.setFrozenRows(this.headerRowCount);
  }

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
        this.updateMaskVisibility();
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
            const field = column.prop;
            if (field) rowData[field] = cellValue;
          }
        });
        return rowData;
      });
      
      this.updateMaskVisibility();
    } catch (error) {
      this.handleError('同步表格数据失败', error);
    }
  }

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
    this.emit('insertRow', {
      insertRows,
      insertRowStartIndex: insertStartIdx,
      insertRowEndIndex: insertEndIdx,
      currentTableData: [...this.currentTableData]
    });
    
    this.updateMaskVisibility();
  }

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
    this.emit('deleteRow', {
      deleteRows,
      deleteRowStartIndex: deleteStartIdx,
      deleteRowEndIndex: deleteEndIdx,
      currentTableData: [...this.currentTableData]
    });
    
    this.updateMaskVisibility();
  }

  /**
   * 在指定索引前插入行
   */
  insertRowBefore(index, rowData) {
    this.syncCurrentTableData();
    this.insertRow(index - 1, rowData);
  }

  /**
   * 在指定索引后插入行
   */
  insertRowAfter(index, rowData) {
    this.syncCurrentTableData();
    this.insertRow(index, rowData);
  }

  /**
   * 向表尾插入行
   */
  insertRowToEnd(row) {
    this.syncCurrentTableData();
    this.insertRow(this.currentTableData.length - 1, row);
  }

  /**
   * 行插入方法
   */
  insertRow(index, rowData) {
    this.withPendingDataSync(() => {
      // 参数校验
      if (index < -1 || index >= this.currentTableData.length) {
        this.handleError(`插入行失败：索引${index}超出范围`);
        return;
      }
      if (!rowData || typeof rowData !== 'object') {
        this.handleError('插入行失败：行数据必须是对象');
        return;
      }

      const worksheet = this.getActiveWorksheet();

      // 计算插入位置
      const insertIndex = index + 1;
      const insertRowIdx = this.headerRowCount + insertIndex;

      // 插入行并填充数据
      worksheet.insertRowAfter(insertRowIdx - 1);
      worksheet.setRowCount(this.headerRowCount + this.currentTableData.length + 1);
      const flattenedRow = this.flattenRowData(rowData, this.currentTableColumns);
      flattenedRow.forEach((value, colIndex) => {
        this.setCellValue(worksheet, insertRowIdx, colIndex, value);
      });

      // 应用编辑器配置
      this.applyRowEditor(worksheet, insertIndex, rowData);

      // 同步内部数据并触发事件
      const newRow = { ...rowData };
      this.currentTableData.splice(insertIndex, 0, newRow);
      this.emit('rowInserted', {
        insertedRows: [newRow],
        insertedRowStartIndex: insertIndex,
        insertedRowEndIndex: insertIndex,
        currentTableData: [...this.currentTableData]
      });
      
      this.updateMaskVisibility();
    });
  }

  /**
   * 更新指定索引行数据
   */
  updateRow(index, rowData, mergeWithExisting = true) {
    this.withPendingDataSync(() => {
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
      this.emit('rowUpdated', {
        index,
        oldRow,
        newRow: { ...this.currentTableData[index] },
        currentTableData: [...this.currentTableData]
      });
    });
  }

  /**
   * 删除指定索引的行
   */
  deleteRow(index) {
    this.withPendingDataSync(() => {
      // 参数校验
      if (index < 0 || index >= this.currentTableData.length) {
        this.handleError(`删除行失败：索引${index}超出范围`);
        return;
      }

      const worksheet = this.getActiveWorksheet();
      this.syncCurrentTableData();

      // 计算实际行索引
      const actualRowIdx = this.headerRowCount + index;

      // 删除工作表中的行
      worksheet.deleteRow(actualRowIdx);

      // 同步内部数据并触发事件
      const deletedRow = this.currentTableData.splice(index, 1)[0];
      this.emit('deleteRow', {
        deleteRows: [deletedRow],
        deleteRowStartIndex: index,
        deleteRowEndIndex: index,
        currentTableData: [...this.currentTableData]
      });
      
      this.updateMaskVisibility();
    });
  }

  /**
   * 根据索引获取某一行数据
   * 先同步最新数据再返回结果
   * @param {number} index - 行索引
   * @returns {object|null} - 行数据对象，如果索引无效则返回null
   */
  getRowByIndex(index) {
    // 同步最新数据
    this.syncCurrentTableData();
    
    // 参数校验
    if (index < 0 || index >= this.currentTableData.length) {
      console.warn(`获取行数据失败：索引${index}超出范围`);
      return null;
    }
    
    // 返回行数据的深拷贝，避免外部直接修改内部数据
    return JSON.parse(JSON.stringify(this.currentTableData[index]));
  }

  /**
   * 根据筛选条件获取符合条件的第一行数据
   * @param {object} filter - 筛选条件对象
   * @returns {object|null} - 符合条件的第一行数据，如果没有符合条件的行则返回null
   */
  getRowByFilter(filter) {
    // 同步最新数据
    this.syncCurrentTableData();
    
    // 参数校验
    if (!filter || typeof filter !== 'object') {
      console.warn('筛选条件必须是非空对象');
      return null;
    }
    
    // 遍历所有行数据，查找符合筛选条件的第一行
    for (const row of this.currentTableData) {
      if (this.isRowMatchFilter(row, filter)) {
        // 返回匹配行数据的深拷贝
        return JSON.parse(JSON.stringify(row));
      }
    }
    
    // 没有找到符合条件的行
    return null;
  }

  /**
   * 根据筛选条件获取所有符合条件的行数据
   * @param {object} filter - 筛选条件对象
   * @returns {array} - 符合条件的行数据数组
   */
  getRowByFilterAll(filter) {
    // 同步最新数据
    this.syncCurrentTableData();
    
    // 参数校验
    if (!filter || typeof filter !== 'object') {
      console.warn('筛选条件必须是非空对象');
      return [];
    }
    
    const matchedRows = [];
    
    // 遍历所有行数据，查找符合筛选条件的所有行
    for (const row of this.currentTableData) {
      if (this.isRowMatchFilter(row, filter)) {
        // 添加匹配行数据的深拷贝
        matchedRows.push(JSON.parse(JSON.stringify(row)));
      }
    }
    
    return matchedRows;
  }

  /**
   * 根据过滤条件获取行索引（单个匹配）
   */
  getRowIndexByFilter(filterObj) {
    this.syncCurrentTableData();
    return this.currentTableData.findIndex(item => this.isRowMatchFilter(item, filterObj));
  }

  /**
   * 根据过滤条件获取行索引（所有匹配）
   */
  getRowIndexByFilterAll(filterObj) {
    this.syncCurrentTableData();
    return this.currentTableData.reduce((indices, item, index) => {
      if (this.isRowMatchFilter(item, filterObj)) {
        indices.push(index);
      }
      return indices;
    }, []);
  }

  // ========================== 样式与权限相关方法 ==========================
  /**
   * 设置表格通用配置
   */
  async setCommonSheetConfig() {
    const workbook = this.getActiveWorkbook();
    const worksheet = this.getActiveWorksheet();
    const permission = workbook.getPermission();
    const unitId = workbook.getId();
    const subUnitId = worksheet.getSheetId();
    // 设置默认单元格样式
    worksheet.setDefaultStyle({
      fs: this.config.commonStyle.fontSize,
      bl: this.config.commonStyle.fontWeight === 'bold' ? 1 : 0,
      ht: this.horizontalAlign,
      vt: this.verticalAlign,
      tb: this.wrapStrategy,
      bg: { rgb: this.config.commonStyle.backgroundColor },
      bd: this.getBorderConfig(),
      cl: { rgb: this.config.commonStyle.color },
      pd: {
        t: this.config.commonStyle.padding.top,
        b: this.config.commonStyle.padding.bottom,
        l: this.config.commonStyle.padding.left,
        r: this.config.commonStyle.padding.right
      }
    });
    // 设置缩放比例
    worksheet.zoom(this.config.zoom);
    // 设置表头样式
    if (!this.currentTableColumns.length) {
      return;
    }
    const { headerRows } = this.generateHeaderRows(this.currentTableColumns);
    const rowCount = headerRows.length;
    const colCount = headerRows[0].length;
    const headerRange = worksheet.getRange(0, 0, rowCount, colCount);
    const headerStyle = this.config.headerStyle;
    worksheet.setRowHeights(0, rowCount, headerStyle.headerRowHeight);
    headerRange.setBackgroundColor(headerStyle.backgroundColor);
    headerRange.setFontColor(headerStyle.color);
    headerRange.setFontSize(headerStyle.fontSize);
    headerRange.setFontWeight(headerStyle.fontWeight);
    headerRange.setBorder(
      this.borderType,
      this.borderStyleType,
      this.borderColor
    );
    // 设置工作簿权限
    this.setWorkbookPermission(unitId, permission);
    // 设置工作表权限
    await this.setWorksheetPermission(unitId, subUnitId, permission);
  }

  /**
   * 获取边框配置
   */
  getBorderConfig() {
    const border = {
      s: this.borderStyleType,
      cl: { rgb: this.borderColor }
    };
    if (this.config.commonStyle.borderType === 'horizontal') {
      return {
        t: border,
        b: border
      };
    } else if (this.config.commonStyle.borderType === 'vertical') {
      return {
        l: border,
        r: border
      };
    } else if (this.config.commonStyle.borderType === 'all') {
      return {
        t: border,
        b: border,
        l: border,
        r: border
      };
    } else {
      return {};
    }
  }

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
  }

  /**
   * 设置工作表权限
   */
  async setWorksheetPermission(unitId, subUnitId, permission) {
    const permissions = {
      WorksheetCopyPermission: true,
      WorksheetDeleteColumnPermission: false,
      WorksheetDeleteRowPermission: this.config.permissionOptions.allowDeleteRow,
      WorksheetFilterPermission: true,
      WorksheetInsertColumnPermission: false,
      WorksheetInsertHyperlinkPermission: true,
      WorksheetInsertRowPermission: this.config.permissionOptions.allowInsertRow,
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
  }

  /**
   * 更新只读单元格样式（异步分批）
   */
  updateReadonlyCellStyles(worksheet) {
    if (!worksheet || !this.config.readonlyCellStyle) return;

    const totalDataRows = this.currentTableData.length;
    const batchSize = this.floorMin1(this.config.asyncOptions.baseBatchSize * this.config.asyncOptions.updateReadonlyCellStylesBatchRatio);

    // 遍历所有数据行的单元格，分批处理
    return this.batchProcess(0, totalDataRows, batchSize, async (startIdx, endIdx) => {
      for (let rowDataIdx = startIdx; rowDataIdx < endIdx; rowDataIdx++) {
        const actualRowIdx = this.headerRowCount + rowDataIdx;
        for (let colIdx = 0; colIdx < this.totalColumns; colIdx++) {
          if (this.isCellReadonly(actualRowIdx, colIdx)) {
            const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);
            this.applyReadonlyStyleToCell(cellRange);
          }
        }
      }
    });
  }

  /**
   * 更新只读单元格样式（同步）
   */
  updateReadonlyCellStylesSync(worksheet) {
    if (!worksheet || !this.config.readonlyCellStyle) return;

    const totalDataRows = this.currentTableData.length;

    // 直接遍历所有数据行的单元格，不使用requestAnimationFrame
    for (let rowDataIdx = 0; rowDataIdx < totalDataRows; rowDataIdx++) {
      const actualRowIdx = this.headerRowCount + rowDataIdx;
      for (let colIdx = 0; colIdx < this.totalColumns; colIdx++) {
        if (this.isCellReadonly(actualRowIdx, colIdx)) {
          const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);
          this.applyReadonlyStyleToCell(cellRange);
        }
      }
    }
  }

  /**
   * 设置单元格的数据验证 - 异步分批
   */
  async setCellDataValidation(worksheet) {
    if (!this.univerAPIInstance) return;

    const totalCells = this.currentTableData.length * this.totalColumns;
    const batchSize = this.floorMin1(this.config.asyncOptions.baseBatchSize * this.config.asyncOptions.setCellDataValidationBatchRatio);
    
    // 分批处理，避免UI阻塞
    return this.batchProcess(0, totalCells, batchSize, async (startIdx, endIdx) => {
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
          if (!editorConfig || (editorConfig.type !== 'select' && editorConfig.type !== 'checkbox')) continue;

          const actualRowIdx = this.headerRowCount + rowDataIdx;
          const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);

          if (editorConfig.type === 'select') {
            this.applySelectEditor(cellRange, editorConfig);
          } else if (editorConfig.type === 'checkbox') {
            this.applyCheckboxEditor(cellRange, editorConfig);
          }
        } catch (error) {
          this.handleError(`设置单元格(${rowDataIdx},${colIdx})数据验证失败`, error);
        }
      }
    });
  }

  /**
   * 设置单元格的数据验证 - 同步
   */
  setCellDataValidationSync(worksheet) {
    if (!this.univerAPIInstance) return;

    const totalCells = this.currentTableData.length * this.totalColumns;
    
    // 直接遍历所有单元格，不使用requestAnimationFrame
    for (let i = 0; i < totalCells; i++) {
      let rowDataIdx, colIdx;
      try {
        // 计算行列索引
        rowDataIdx = Math.floor(i / this.totalColumns);
        colIdx = i % this.totalColumns;
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
        if (!editorConfig || (editorConfig.type !== 'select' && editorConfig.type !== 'checkbox')) continue;

        const actualRowIdx = this.headerRowCount + rowDataIdx;
        const cellRange = this.getCellRange(worksheet, actualRowIdx, colIdx);
        if (editorConfig.type === 'select') {
            this.applySelectEditor(cellRange, editorConfig);
          } else if (editorConfig.type === 'checkbox') {
            this.applyCheckboxEditor(cellRange, editorConfig);
          }
      } catch (error) {
        this.handleError(`设置单元格(${rowDataIdx},${colIdx})数据验证失败`, error);
      }
    }
  }

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
      cellRange.setFontColor(this.config.commonStyle.color);
      cellRange.setFontWeight('normal');
      if (this.borderColor) {
        cellRange.setBorder(
          this.borderType,
          this.borderStyleType,
          this.borderColor
        );
      }

      // 清除旧数据验证
      cellRange.setDataValidation(null);

      // 应用只读样式
      if (this.isCellReadonly(actualRowIdx, colIdx)) {
        this.applyReadonlyStyleToCell(cellRange);
      }

      const editorConfig = this.getEditorConfig(column.editor, {
        row: rowData,
        rowIndex: rowDataIdx,
        column,
        columnIndex: colIdx
      });
      // 应用select编辑器配置
      if (editorConfig && editorConfig.type === 'select') {
        this.applySelectEditor(cellRange, editorConfig);
      }
      // 应用checkbox编辑器配置
      else if (editorConfig && editorConfig.type === 'checkbox') {
        this.applyCheckboxEditor(cellRange, editorConfig);
      }
    }
  }

  // ========================== 事件系统 ==========================
  /**
   * 注册事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理函数
   * @param {boolean} isInternal - 是否为内部事件（默认false）
   */
  on(eventName, handler, isInternal = false) {
    if (!this.eventListeners[eventName]) {
      this.eventListeners[eventName] = [];
    }
    this.eventListeners[eventName].push({
      handler,
      isInternal
    });
    return this; // 支持链式调用
  }

  /**
   * 移除事件监听器
   * @param {string} eventName - 事件名称
   * @param {function} handler - 事件处理函数（可选）
   * @param {boolean} offInternal - 是否移除内部事件监听器（默认false）
   */
  off(eventName, handler, offInternal = false) {
    if (!this.eventListeners[eventName]) return this;
    
    if (handler) {
      // 移除指定的监听器。如果 offInternal 为 false，则保留所有内部监听器。
      this.eventListeners[eventName] = this.eventListeners[eventName].filter(listener => 
        (listener.isInternal && !offInternal) || (listener.handler !== handler)
      );
    } else {
      if (offInternal) {
        // 如果没有指定handler，但 offInternal 为 true，则移除所有监听器（包括内部的）
        this.eventListeners[eventName] = [];
      } else {
        // 如果没有指定handler，且 offInternal 为 false，则只保留内部监听器
        this.eventListeners[eventName] = this.eventListeners[eventName].filter(listener => 
          listener.isInternal
        );
      }
    }
    return this;
  }

  /**
   * 触发事件
   * @param {string} eventName - 事件名称
   * @param {any} data - 事件数据
   * @param {boolean} onlyInternal - 是否只触发内部事件监听器（默认false）
   */
  emit(eventName, data, onlyInternal = false) {
    if (!this.eventListeners[eventName]) return this;
    
    let listenersToEmit = this.eventListeners[eventName];
    
    // 如果 onlyInternal 为 true，则只筛选出内部监听器
    if (onlyInternal) {
      listenersToEmit = listenersToEmit.filter(listener => listener.isInternal);
    }
    
    listenersToEmit.forEach(listener => {
      try {
        listener.handler(data);
      } catch (error) {
        console.error(`事件处理器执行失败 [${eventName}]:`, error);
      }
    });
    return this;
  }

  // ========================== 工具方法 ==========================
  /**
   * 获取当前激活的工作簿
   */
  getActiveWorkbook() {
    return this.univerAPIInstance?.getActiveWorkbook();
  }

  /**
   * 获取当前激活的工作表
   */
  getActiveWorksheet() {
    const workbook = this.getActiveWorkbook();
    return workbook?.getActiveSheet();
  }

  /**
   * 获取单元格范围
   */
  getCellRange(worksheet, row, col) {
    return worksheet.getRange(row, col, 1, 1);
  }

  /**
   * 设置单元格值
   */
  setCellValue(worksheet, row, col, value) {
    if (value === undefined || value === null) {
      return;
    }
    if (typeof value !== 'object') {
      this.getCellRange(worksheet, row, col).setValue(value);
    } else {
      this.getCellRange(worksheet, row, col).setValue(JSON.stringify(value));
    }
  }

  /**
   * 获取单元格值
   */
  getCellValue(worksheet, row, col) {
    return this.getCellRange(worksheet, row, col).getValue();
  }

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
  }

  /**
   * 统一错误处理
   */
  handleError(message, error) {
    console.error(`${message}:`, error);
  }

  /**
   * 自动处理pendingDataSync计数
   * 包裹需要加锁的操作，防止并发冲突
   */
  async withPendingDataSync(handler) {
    this.pendingDataSync++;
    this.updateMaskVisibility();
    try {
      await handler();
    } finally {
      this.pendingDataSync--;
      this.updateMaskVisibility();
    }
  }

  updateMaskVisibility() {
    this.emit('maskVisibilityUpdate', {
      shouldShowLoading: this.shouldShowLoading,
      shouldShowEmpty: this.shouldShowEmpty,
    }, true);
  }

  /**
   * 分批处理工具（异步方式使用）
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
  }

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
  }

  /**
   * 应用select编辑器配置
   */
  applySelectEditor(cellRange, editorConfig) {
    const { options = [], multiple = false, allowInput = false, selectValidationError } = editorConfig;
    const errorMsg = selectValidationError || (allowInput
      ? this.config.selectOptions.selectValidationErrorInfo
      : this.config.selectOptions.selectValidationErrorStop);
    const errorStyle = allowInput
      ? this.univerAPIInstance.Enum.DataValidationErrorStyle.INFO
      : this.univerAPIInstance.Enum.DataValidationErrorStyle.STOP;

    // 创建并应用数据验证规则
    const rule = this.univerAPIInstance.newDataValidation()
      .requireValueInList(options, multiple)
      .setOptions({
        renderMode: this.selectValidationRenderMode,
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
    cellRange.setFontColor(selectStyle.color || this.config.commonStyle.color);
    if (selectStyle.fontWeight) cellRange.setFontWeight(selectStyle.fontWeight);
  }

  /**
   * 应用checkbox编辑器配置
   */
  applyCheckboxEditor(cellRange, editorConfig) {
    let { checkboxValidationError, checkedValue, uncheckedValue } = editorConfig;
    const errorMsg = checkboxValidationError || this.config.checkboxOptions.checkboxValidationError;
    checkedValue = checkedValue || this.config.checkboxOptions.checkedValue;
    uncheckedValue = uncheckedValue || this.config.checkboxOptions.uncheckedValue;

    // 创建并应用数据验证规则
    const rule = this.univerAPIInstance.newDataValidation()
      .requireCheckbox(checkedValue, uncheckedValue)
      .setOptions({
        allowBlank: true,
        showErrorMessage: true,
        error: errorMsg,
        errorStyle: this.univerAPIInstance.Enum.DataValidationErrorStyle.STOP
      })
      .build();

    cellRange.setDataValidation(rule);

    // 应用checkbox样式
    const checkboxStyle = this.config.checkboxCellStyle;
    cellRange.setBackgroundColor(checkboxStyle.backgroundColor || this.config.commonStyle.backgroundColor);
    cellRange.setFontColor(checkboxStyle.color || this.config.commonStyle.color);
    if (checkboxStyle.fontWeight) cellRange.setFontWeight(checkboxStyle.fontWeight);
  }

  /**
   * 应用只读样式到单元格
   */
  applyReadonlyStyleToCell(cellRange) {
    const readonlyStyle = this.config.readonlyCellStyle;
    cellRange.setBackgroundColor(readonlyStyle.backgroundColor);
    cellRange.setFontColor(readonlyStyle.color);
    cellRange.setFontWeight(readonlyStyle.fontWeight);
    cellRange.setBorder(
      this.borderType,
      this.borderStyleType,
      this.borderColor
    );
  }

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
  }

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
  }

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
  }

  /**
   * 计算总列数（嵌套列展开后的数量）
   */
  calculateTotalColumns(cols) {
    return cols.reduce((sum, col) => {
      return sum + (col.children?.length ? this.calculateTotalColumns(col.children) : 1);
    }, 0);
  }

  /**
   * 计算表头最大深度（嵌套列的层级）
   */
  calculateMaxDepth(cols) {
    return cols.length
      ? Math.max(...cols.map(col => col.children?.length ? 1 + this.calculateMaxDepth(col.children) : 1))
      : 0;
  }

  /**
   * 递归填充表头数据和合并信息
   */
  fillHeader(cols, row, col, headerRows, mergeInfos) {
    let currentColumn = col;

    cols.forEach(column => {
      // 设置当前单元格标签
      headerRows[row][currentColumn] = column.label;
      // 计算当前列包含的叶子节点数量
      const leafCount = column.children?.length ? this.calculateTotalColumns(column.children) : 1;

      if (column.children?.length) {
        // 横向合并当前行的列
        mergeInfos.push({
          startRow: row,
          startColumn: currentColumn,
          endRow: row,
          endColumn: currentColumn + leafCount - 1
        });
        // 递归处理子列
        currentColumn = this.fillHeader(column.children, row + 1, currentColumn, headerRows, mergeInfos);
      } else {
        // 叶子节点：纵向合并剩余行
        if (row < headerRows.length - 1) {
          mergeInfos.push({
            startRow: row,
            startColumn: currentColumn,
            endRow: headerRows.length - 1,
            endColumn: currentColumn
          });
        }
        currentColumn++;
      }
    });

    return currentColumn;
  }

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
  }

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
  }

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
  }

  /**
   * 获取列名（基于扁平化列配置）
   */
  getColumnName(colIdx) {
    if (colIdx < 0 || colIdx >= this.flatColumns.length) return '';
    const column = this.flatColumns[colIdx];
    return column?.prop || '';
  }

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
  }

  /**
   * 获取表格数据
   */
  getTableData() {
    this.syncCurrentTableData();
    return this.currentTableData;
  }

  /**
   * 结束当前编辑状态
   */
  async endEditing() {
    if (this.univerAPIInstance && this.isTableInitialized) {
      if (this.isEditing) {
        try {
          await this.univerAPIInstance.getActiveWorkbook().endEditingAsync(true);
        } catch (error) {
          this.handleError('结束编辑失败', error);
        }
      }
      return;
    }
  }

  /**
   * 根据列名获取列索引
   */
  getColumnIndex(columnName) {
    return this.flatColumns.findIndex(item => item.prop === columnName);
  }

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
  }

  /**
   * 辅助方法：检查行数据是否符合筛选条件
   * @param {object} row - 行数据对象
   * @param {object} filter - 筛选条件对象
   * @returns {boolean} - 是否符合筛选条件
   */
  isRowMatchFilter(row, filter) {
    for (const [key, value] of Object.entries(filter)) {
      // 处理嵌套属性路径
      const keys = key.split('.');
      let currentValue = row;
      
      for (const k of keys) {
        if (currentValue === undefined || currentValue === null || !(k in currentValue)) {
          return false;
        }
        currentValue = currentValue[k];
      }
      
      if (currentValue !== value) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 对数值向下取整并确保结果不小于1
   */
  floorMin1(num) {
    return Math.max(Math.floor(num), 1);
  }
  
  /**
   * 获取表格的表头行数
   */
  getTableHeaderRowCount() {
    return this.headerRowCount;
  }

  /**
   * 获取表格的数据行数
   */
  getTableDataRowCount() {
    this.syncCurrentTableData();
    return this.currentTableData.length;
  }

  /**
   * 获取表格的总行数
   */
  getTableRowCount() {
    this.syncCurrentTableData();
    return this.headerRowCount + this.currentTableData.length;
  }

  /**
   * 获取表格的总列数
   */
  getTableColumnCount() {
    return this.flatColumns.length;
  }

  /**
   * 导出表格数据为JSON格式
   * @param {string} filename - 导出的文件名
   */
  exportToJson(filename) {
    this.syncCurrentTableData();
    try {
      // 转换数据为JSON字符串
      const jsonStr = JSON.stringify(this.currentTableData, null, 2);
      // 创建Blob对象
      const blob = new Blob([jsonStr], { type: 'application/json' });
      // 创建下载链接并触发下载
      this.downloadFile(blob, filename);
      return true;
    } catch (error) {
      this.handleError('导出JSON失败', error);
      return false;
    }
  }

  /**
   * 导出表格数据为CSV格式
   * @param {string} filename - 导出的文件名
   */
  exportToCsv(filename) {
    this.syncCurrentTableData();
    try {
      if (this.currentTableData.length === 0) {
        console.warn('没有数据可导出');
        return false;
      }

      // 获取表头（使用扁平化的列配置）
      const headers = this.flatColumns.map(col => col.label || col.prop);
      const headerRow = headers.map(header => this.escapeCsv(header)).join(',');

      // 处理数据行
      const dataRows = this.currentTableData.map(row => {
        return this.flatColumns.map(col => {
          const value = row[col.prop];
          return this.escapeCsv(value !== undefined && value !== null ? String(value) : '');
        }).join(',');
      });

      // 组合CSV内容
      const csvContent = [headerRow, ...dataRows].join('\n');
      
      // 创建Blob对象，添加BOM以支持UTF-8编码
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // 创建下载链接并触发下载
      this.downloadFile(blob, filename);
      return true;
    } catch (error) {
      this.handleError('导出CSV失败', error);
      return false;
    }
  }

  /**
   * 辅助方法：处理CSV中的特殊字符
   */
  escapeCsv(value) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      // 如果值包含逗号、引号或换行符，需要用引号包裹并转义内部引号
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  /**
   * 辅助方法：创建下载链接并触发下载
   */
  downloadFile(blob, filename) {
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 释放URL对象
    URL.revokeObjectURL(url);
  }
}