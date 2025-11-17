import Lubanno7UniverSheetCore from './core.js';

export default class Lubanno7UniverSheet {
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
    this.config = this.generateConfig(config);
    this.exposed = null;

    // 初始化DOM结构
    this.initDOM();
    
    // 初始化核心功能
    this.core = new Lubanno7UniverSheetCore(this.sheetContainer, {columns, data, config: this.config});

    // 使用内部事件监听器注册，这样即使外部调用off也不会移除这些监听
    this.core.eventEmitter.on('tableInitialized', () => {
      this.exposed = {
        attributes: {
          univerInstance: this.core.univerInstance,
          univerAPIInstance: this.core.univerAPIInstance
        },
        methods: {
          getTableData: () => this.core.getTableData(),
          getTableHeaderRowCount: () => this.core.getTableHeaderRowCount(),
          getTableDataRowCount: () => this.core.getTableDataRowCount(),
          getTableRowCount: () => this.core.getTableRowCount(),
          getTableColumnCount: () => this.core.getTableColumnCount(),
          getRowByIndex: (index) => this.core.getRowByIndex(index),
          endEditing: () => this.core.endEditing(),
          setCellFontColor: (rowDataIdx, columnName, color) => this.core.setCellFontColor(rowDataIdx, columnName, color),
          getColumnName: (colIdx) => this.core.getColumnName(colIdx),
          getColumnIndex: (columnName) => this.core.getColumnIndex(columnName),
          insertRowBefore: (index, rowData) => this.core.insertRowBefore(index, rowData),
          insertRowAfter: (index, rowData) => this.core.insertRowAfter(index, rowData),
          insertRowToEnd: (row) => this.core.insertRowToEnd(row),
          updateRow: (index, rowData, mergeWithExisting) => this.core.updateRow(index, rowData, mergeWithExisting),
          deleteRow: (index) => this.core.deleteRow(index),
          getRowByFilter: (filter) => this.core.getRowByFilter(filter),
          getRowByFilterAll: (filter) => this.core.getRowByFilterAll(filter),
          getRowIndexByFilter: (filterObj) => this.core.getRowIndexByFilter(filterObj),
          getRowIndexByFilterAll: (filterObj) => this.core.getRowIndexByFilterAll(filterObj),
          exportToJson: (filename) => this.core.exportToJson(filename),
          exportToCsv: (filename) => this.core.exportToCsv(filename)
        }
      }
    }, true);

    this.core.eventEmitter.on('maskVisibilityUpdate', (maskVisibility) => {
      this.updateMaskVisibility(maskVisibility);
    }, true);
  }

  // ========================== 事件相关方法 ==========================
  /**
   * 注册事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} handler 事件处理函数
   */
  on(eventName, handler) {
    this.core.eventEmitter.on(eventName, handler);
  }

  /**
   * 移除事件监听器
   * @param {string} eventName 事件名称
   * @param {Function} handler 事件处理函数
   */
  off(eventName, handler) {
    this.core.eventEmitter.off(eventName, handler);
  }

  // ========================== DOM操作方法 ==========================
  /**
   * 初始化DOM结构
   * 创建表格容器、加载遮罩和空数据遮罩等DOM元素
   */
  initDOM() {
    // 清空容器
    this.container.innerHTML = '';
    
    // 创建包装器
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'lubanno7-univer-sheet-wrapper';
    const wrapperFixedStyles = {
      position: 'relative',
      overflow: 'hidden',
    };
    const wrapperMergedStyles = { ...wrapperFixedStyles, ...this.config.styleOptions };
    this.wrapper.style.cssText = this.styleObjectToCssText(wrapperMergedStyles);
    
    // 创建表格容器
    this.sheetContainer = document.createElement('div');
    this.sheetContainer.style.cssText = this.styleObjectToCssText(this.config.styleOptions);
    
    // 创建加载遮罩
    this.loadingMask = document.createElement('div');
    this.loadingMask.className = 'custom-loading-mask';
    
    // 使用配置的loading选项
    const loadingOptions = this.config.loadingOptions || {};
    
    this.loadingMask.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${loadingOptions.maskBackgroundColor};
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      pointer-events: auto;
    `;
    
    const loadingContent = document.createElement('div');
    loadingContent.style.textAlign = 'center';
    
    const loadingSpinner = document.createElement('div');
    loadingSpinner.style.cssText = `
      width: ${loadingOptions.spinnerSize}px;
      height: ${loadingOptions.spinnerSize}px;
      border: ${loadingOptions.spinnerCircleThickness}px solid ${loadingOptions.spinnerCircleColor};
      border-radius: 50%;
      border-top-color: ${loadingOptions.spinnerCircleHighlightColor};
      animation: lubanno7-univer-sheet-loading-spin ${loadingOptions.spinnerAnimationDuration} linear infinite;
      margin: 0 auto 10px;
    `;
    
    const loadingText = document.createElement('div');
    loadingText.textContent = loadingOptions.text;
    loadingText.style.cssText = `
      color: ${loadingOptions.textColor};
      font-size: ${loadingOptions.fontSize}px;
    `;
    
    loadingContent.appendChild(loadingSpinner);
    loadingContent.appendChild(loadingText);
    this.loadingMask.appendChild(loadingContent);
    
    // 使用配置的emptyData选项
    const emptyDataOptions = this.config.emptyDataOptions || {};
    
    // 创建空数据遮罩
    this.emptyDataMask = document.createElement('div');
    this.emptyDataMask.className = 'empty-data-mask';
    this.emptyDataMask.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: ${emptyDataOptions.maskBackgroundColor};
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 999;
      pointer-events: auto;
    `;
    
    const emptyDataContent = document.createElement('div');
    emptyDataContent.style.cssText = `text-align: center;`;
    
    const emptyDataText = document.createElement('div');
    emptyDataText.textContent = emptyDataOptions.text;
    emptyDataText.style.cssText = `
      color: ${emptyDataOptions.textColor};
      font-size: ${emptyDataOptions.fontSize}px;
    `;
    
    emptyDataContent.appendChild(emptyDataText);
    this.emptyDataMask.appendChild(emptyDataContent);
    
    // 添加CSS动画
    let animationExists = false;
    const styleTags = document.querySelectorAll('style');
    styleTags.forEach(tag => {
      if (tag.textContent.includes('@keyframes lubanno7-univer-sheet-loading-spin')) {
        animationExists = true;
      }
    });
    
    if (!animationExists) {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes lubanno7-univer-sheet-loading-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // 组装DOM结构
    this.wrapper.appendChild(this.sheetContainer);
    this.wrapper.appendChild(this.loadingMask);
    this.wrapper.appendChild(this.emptyDataMask);
    this.container.appendChild(this.wrapper);
    
    // 初始化时根据数据状态更新遮罩
    this.updateMaskVisibility({ shouldShowLoading: true, shouldShowEmpty: this.data.length === 0 });
  }

  /**
   * 更新遮罩显示状态
   * @param {Object} maskVisibility 遮罩显示状态对象
   * @param {boolean} maskVisibility.shouldShowLoading 是否显示加载遮罩
   * @param {boolean} maskVisibility.shouldShowEmpty 是否显示空数据遮罩
   */
  updateMaskVisibility({ shouldShowLoading, shouldShowEmpty }) {
    if (shouldShowLoading !== undefined) {
      this.loadingMask.style.display = shouldShowLoading ? 'flex' : 'none';
    }
    if (shouldShowEmpty !== undefined) {
      this.emptyDataMask.style.display = shouldShowEmpty ? 'flex' : 'none';
    }
  }

  /**
   * 将样式对象转换为 CSS 字符串
   * @param {Object} styleObj 样式对象，键为驼峰命名，值为 CSS 属性值
   * @returns {string} 转换后的 CSS 字符串
   */
  styleObjectToCssText(styleObj) {
    return Object.entries(styleObj)
      .map(([key, value]) => {
        const cssKey = key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
        return `${cssKey}: ${value};`;
      })
      .join(' ');
  }

  // ========================== 配置相关方法 ==========================
  /**
   * 深度合并函数
   * @param {Object} target 目标对象
   * @param {Object} source 源对象
   * @returns {Object} 合并后的对象
   */
  deepMerge(target, source) {
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
        result[key] = this.deepMerge(targetValue, sourceValue);
      } else {
        result[key] = sourceValue;
      }
    });

    return result;
  }

  /**
   * 生成合并后的配置
   * @param {Object} config 用户配置
   * @returns {Object} 合并默认配置后的完整配置
   */
  generateConfig(config) {
    const defaultConfig = {
      locale: 'zh-CN',
      darkMode: false,
      loadingOptions: {
        text: '数据加载中...',
        maskBackgroundColor: 'rgba(255, 255, 255, 0.8)',
        spinnerSize: 40,
        spinnerCircleThickness: 4,
        spinnerCircleColor: '#f3f3f3',
        spinnerCircleHighlightColor: '#3498db',
        spinnerAnimationDuration: '1s',
        textColor: '#333333',
        fontSize: 14
      },
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
      emptyDataOptions: {
        text: '暂无数据',
        maskBackgroundColor: 'rgba(255, 255, 255, 0.9)',
        textColor: '#666666',
        fontSize: 16
      },
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
        mode: 'disabled', // 可选值：disabled, editOnly, selected
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
        padding: null,
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
        headerRowHeight: null,
        backgroundColor: null,
        color: null,
        fontSize: null,
        fontWeight: null
      },
      readonlyCellStyle: {
        backgroundColor: null,
        color: null,
        fontWeight: null
      },
      selectCellStyle: {
        backgroundColor: null,
        color: null,
        fontWeight: null
      },
      checkboxCellStyle: {
        backgroundColor: null,
        color: null,
        fontWeight: null
      }
    };
    
    const mergedConfig = this.deepMerge(defaultConfig, config);
    
    // 设置默认值
    if(mergedConfig.commonStyle.padding === null) {
      mergedConfig.commonStyle.padding = {
        top: 0,
        right: mergedConfig.commonStyle.horizontalAlign === 'right' ? 8 : 0,
        bottom: 0,
        left: mergedConfig.commonStyle.horizontalAlign === 'left' || mergedConfig.commonStyle.horizontalAlign === 'center' ? 8 : 0
      };
    }
    if(mergedConfig.headerStyle.headerRowHeight === null) {
      mergedConfig.headerStyle.headerRowHeight = mergedConfig.commonStyle.defaultRowHeight;
    }
    if(mergedConfig.headerStyle.backgroundColor === null) {
      mergedConfig.headerStyle.backgroundColor = mergedConfig.commonStyle.backgroundColor;
    }
    if(mergedConfig.headerStyle.color === null) {
      mergedConfig.headerStyle.color = mergedConfig.commonStyle.color;
    }
    if(mergedConfig.headerStyle.fontSize === null) {
      mergedConfig.headerStyle.fontSize = mergedConfig.commonStyle.fontSize;
    }
    if(mergedConfig.headerStyle.fontWeight === null) {
      mergedConfig.headerStyle.fontWeight = mergedConfig.commonStyle.fontWeight;
    }
    if(mergedConfig.readonlyCellStyle.backgroundColor === null) {
      mergedConfig.readonlyCellStyle.backgroundColor = mergedConfig.commonStyle.backgroundColor;
    }
    if(mergedConfig.readonlyCellStyle.color === null) {
      mergedConfig.readonlyCellStyle.color = mergedConfig.commonStyle.color;
    }
    if(mergedConfig.readonlyCellStyle.fontWeight === null) {
      mergedConfig.readonlyCellStyle.fontWeight = mergedConfig.commonStyle.fontWeight;
    }
    if(mergedConfig.selectCellStyle.backgroundColor === null) {
      mergedConfig.selectCellStyle.backgroundColor = mergedConfig.commonStyle.backgroundColor;
    }
    if(mergedConfig.selectCellStyle.color === null) {
      mergedConfig.selectCellStyle.color = mergedConfig.commonStyle.color;
    }
    if(mergedConfig.selectCellStyle.fontWeight === null) {
      mergedConfig.selectCellStyle.fontWeight = mergedConfig.commonStyle.fontWeight;
    }
    if(mergedConfig.checkboxCellStyle.backgroundColor === null) {
      mergedConfig.checkboxCellStyle.backgroundColor = mergedConfig.commonStyle.backgroundColor;
    }
    if(mergedConfig.checkboxCellStyle.color === null) {
      mergedConfig.checkboxCellStyle.color = mergedConfig.commonStyle.color;
    }
    if(mergedConfig.checkboxCellStyle.fontWeight === null) {
      mergedConfig.checkboxCellStyle.fontWeight = mergedConfig.commonStyle.fontWeight;
    }
    
    return mergedConfig;
  }

  // ========================== 生命周期方法 ==========================
  /**
   * 销毁组件实例
   * 清理DOM元素、释放资源和引用
   */
  dispose() {
    // 确保core实例存在并调用其dispose方法
    if (this.core) {
      this.core.dispose();
      this.core = null;
    }
    
    // 清理DOM元素
    if (this.container && this.wrapper && this.container.contains(this.wrapper)) {
      this.container.removeChild(this.wrapper);
    }
    
    // 清理所有引用
    this.container = null;
    this.wrapper = null;
    this.sheetContainer = null;
    this.loadingMask = null;
    this.emptyDataMask = null;
    this.exposed = null;
  }

  // ========================== 暴露API方法 ==========================
  /**
   * 获取暴露的属性和方法
   * @returns {Object} 暴露的API对象
   */
  getExposed() {
    return this.exposed;
  }
}