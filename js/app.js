/**
 * PEA AUC Tracking & Asset Registration Web Application
 * Master Application Logic & State Controller
 * Theme: Provincial Electricity Authority (กฟก.3)
 */

(function () {
  'use strict';

  // Default Colors & Presets Tokens
  const DEFAULT_CHART_COLORS = {
    closed: '#10B981',    // ปิดงานแล้ว (เขียวมรกต)
    total: '#A855F7',     // มูลค่ารวม (ม่วงสด)
    remaining: '#EF4444', // คงเหลือดำเนินการ (แดง)
    kpiGood: '#10B981',   // KPI 5 ยอดเยี่ยม
    kpiWarn: '#EF4444',   // KPI 1-4 ต้องเร่งรัด
    planLine: '#FFB81C'   // เส้นเป้าหมาย / แผนสะสม
  };

  const DEFAULT_BG_SETTINGS = {
    presetId: 'pea-royal',
    mode: 'preset',
    main: '#56247B',
    accent: '#7639A4'
  };

  // Application State
  const state = {
    allData: [],
    filteredData: [],
    filters: {
      criteria: 'ข้อ 1.1 งบ C.1 ก่อน 69', // เริ่มต้นที่ข้อ 1.1
      selectedCriteria: ['ข้อ 1.1 งบ C.1 ก่อน 69'],
      province: 'ALL',
      office: 'ALL',
      kpiGrade: 'ALL',
      search: '',
      unit: 'ALL',
      month: 8 // เริ่มต้นที่ ก.ย. (ไฟล์รายงาน 01 ก.ย.2569 ล่าสุด)
    },
    table: {
      page: 1,
      pageSize: 15,
      sortCol: 'id',
      sortAsc: true
    },
    activeTab: 'tab-dashboard',
    card4PctMode: 'val', // 'val' (% มูลค่า) หรือ 'jobs' (% ปิดงาน)
    selectedRecord: null,
    scenarioData: null,
    chartColors: { ...DEFAULT_CHART_COLORS },
    bgSettings: { ...DEFAULT_BG_SETTINGS },
    charts: {},
    aiActiveTab: 'summary',
    aiCollapsed: false,
    hiddenTimelineSeries: new Set(),
    timelineChartMode: 'both',
    hiddenTimelineAmountSeries: new Set(),
    next3mHBarMode: 'val',
    next3mChartType: 'donut'
  };
  window.state = state;

  // Month Names (Thai)
  const MONTHS_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // Calculate and sync sticky header height dynamically
  function updateStickyHeaderHeight() {
    const stickySection = document.querySelector('.sticky-top-section');
    if (stickySection) {
      const h = stickySection.offsetHeight;
      if (h > 0) {
        document.documentElement.style.setProperty('--sticky-header-height', (h + 8) + 'px');
      }
    }
  }

  // Initialize App on DOM Ready or immediately if already loaded
  function startApp() {
    try {
      applyTheme();
      initColorPaletteManager();
      updateStickyHeaderHeight();
      window.addEventListener('resize', updateStickyHeaderHeight);
      initData();
      initBarChartCriteriaDropdown();
      setupEventListeners();
      renderAll();
      if (window.renderDataHistoryTab) {
        window.renderDataHistoryTab();
      }
    } catch (err) {
      console.error('App initialization error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startApp);
  } else {
    startApp();
  }

  // ==========================================
  // 1. DATA INITIALIZATION & CLEANING
  // ==========================================
  // ==========================================
  // 1. DATA INITIALIZATION & 12-MONTH EXCEL SYNC
  // ==========================================
  const MONTH_EXCEL_FILES = [
    { monthIndex: 0, shortMonth: 'ม.ค.', monthName: 'มกราคม', filename: '01 รายงาน AUC เดือน 1ม.ค. (3.1 teco).xlsx', targetVar: 'AUC_DATA_JAN', pattern: /1ม\.ค\.|เดือน\s*1\b/i },
    { monthIndex: 1, shortMonth: 'ก.พ.', monthName: 'กุมภาพันธ์', filename: '01 รายงาน AUC เดือน 2ก.พ. (3.1 teco).xlsx', targetVar: 'AUC_DATA_FEB', pattern: /2ก\.พ\.|เดือน\s*2\b/i },
    { monthIndex: 2, shortMonth: 'มี.ค.', monthName: 'มีนาคม', filename: '01 รายงาน AUC เดือน 3มี.ค. (3.1 teco).xlsx', targetVar: 'AUC_DATA_MAR', pattern: /3มี\.ค\.|เดือน\s*3\b/i },
    { monthIndex: 3, shortMonth: 'เม.ย.', monthName: 'เมษายน', filename: '01 รายงาน AUC เดือน 4เม.ย. (3.1 teco).xlsx', targetVar: 'AUC_DATA_APR', pattern: /4เม\.ย\.|เดือน\s*4\b/i },
    { monthIndex: 4, shortMonth: 'พ.ค.', monthName: 'พฤษภาคม', filename: '01 รายงาน AUC เดือน 5พ.ค. (3.1 & 3.2teco).xlsx', targetVar: 'AUC_DATA_MAY', pattern: /5พ\.ค\.|เดือน\s*5\b/i },
    { monthIndex: 5, shortMonth: 'มิ.ย.', monthName: 'มิถุนายน', filename: '01 รายงาน AUC เดือน 6มิ.ย. (3.2teco).xlsx', targetVar: 'AUC_DATA_JUN', pattern: /6มิ\.ย\.|เดือน\s*6\b/i },
    { monthIndex: 6, shortMonth: 'ก.ค.', monthName: 'กรกฎาคม', filename: '01 รายงาน AUC เดือน 7ก.ค.  (3.2teco).xlsx', targetVar: 'AUC_DATA_JUL', pattern: /7ก\.ค\.|เดือน\s*7\b/i },
    { monthIndex: 7, shortMonth: 'ส.ค.', monthName: 'สิงหาคม', filename: '01 รายงาน AUC เดือน 8ส.ค.  (3.2&3.3teco).xlsx', targetVar: 'AUC_DATA_AUG', pattern: /8ส\.ค\.|เดือน\s*8\b/i },
    { monthIndex: 8, shortMonth: 'ก.ย.', monthName: 'กันยายน', filename: '01 รายงาน AUC เดือน 9ก.ย.  (3.3teco).xlsx', targetVar: 'AUC_DATA_SEP', pattern: /9ก\.ย\.|เดือน\s*9\b/i },
    { monthIndex: 9, shortMonth: 'ต.ค.', monthName: 'ตุลาคม', filename: '01 รายงาน AUC เดือน 10ต.ค. ยังไม่มี (3.3teco).xlsx', targetVar: 'AUC_DATA_OCT', pattern: /10ต\.ค\.|เดือน\s*10\b/i },
    { monthIndex: 10, shortMonth: 'พ.ย.', monthName: 'พฤศจิกายน', filename: '01 รายงาน AUC เดือน 11พ.ย. ยังไม่มี (3.3teco).xlsx', targetVar: 'AUC_DATA_NOV', pattern: /11พ\.ย\.|เดือน\s*11\b/i },
    { monthIndex: 11, shortMonth: 'ธ.ค.', monthName: 'ธันวาคม', filename: '01 รายงาน AUC เดือน 12ธ.ค. ยังไม่มี (3.3teco).xlsx', targetVar: 'AUC_DATA_DEC', pattern: /12ธ\.ค\.|เดือน\s*12\b/i }
  ];

  function matchExcelFileToMonth(filename) {
    if (!filename || !filename.toLowerCase().endsWith('.xlsx')) return null;
    const cleanName = filename.replace(/\s+/g, ' ').trim();
    for (const def of MONTH_EXCEL_FILES) {
      if (def.filename.replace(/\s+/g, ' ').trim() === cleanName) return def;
    }
    for (const def of MONTH_EXCEL_FILES) {
      if (def.pattern.test(cleanName)) return def;
    }
    return null;
  }

  function parsePeaExcelBuffer(buffer, filename) {
    if (typeof XLSX === 'undefined') {
      console.error('SheetJS (XLSX) is not loaded.');
      return [];
    }

    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) return [];

    let targetSheetName = wb.SheetNames.find(n => n.includes('รายงาน') || n.includes('01') || n.includes('กบพ')) || wb.SheetNames[0];
    const sheet = wb.Sheets[targetSheetName];
    if (!sheet) return [];

    const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (!rawRows || rawRows.length < 2) return [];

    let headerRowIdx = 0;
    for (let r = 0; r < Math.min(15, rawRows.length); r++) {
      const row = rawRows[r];
      if (!Array.isArray(row)) continue;
      const rowStr = row.join(' ');
      if (rowStr.includes('เกณฑ์วัด') || rowStr.includes('รวมงานAUC') || rowStr.includes('ปิดงานAUC') || (rowStr.includes('จังหวัด') && rowStr.includes('กฟฟ'))) {
        headerRowIdx = r;
        break;
      }
    }

    const records = [];
    let rowId = 1;
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row || !Array.isArray(row) || row.length === 0) continue;

      const criteria = String(row[0] || '').trim();
      const unit = String(row[1] || '').trim();
      const province = String(row[2] || '').trim();
      const office = String(row[4] || '').trim();

      if (!criteria && !office && !province) continue;
      if (criteria.includes('ประเภทเกณฑ์วัด') || criteria.includes('เกณฑ์วัด') || office === 'กฟฟ.' || office === 'หน่วยงาน') continue;
      if (!office && !province) continue;

      const totalJobs = Number(row[5]) || 0;
      const totalValue = Number(row[6]) || 0;
      const closedJobs = Number(row[7]) || 0;
      const closedValue = Number(row[8]) || 0;
      const remainingJobs = Number(row[9]) || 0;
      const remainingValue = Number(row[10]) || 0;

      let latestPercent = 0;
      if (row[11] !== undefined && row[11] !== '') {
        latestPercent = Number(row[11]) || 0;
        if (latestPercent > 1) latestPercent = latestPercent / 100;
      } else {
        const isJobUnit = unit === 'งาน' || criteria.includes('3.') || criteria.includes('4') || criteria.includes('C02');
        if (isJobUnit && totalJobs > 0) {
          latestPercent = closedJobs / totalJobs;
        } else if (totalValue > 0) {
          latestPercent = closedValue / totalValue;
        }
      }

      let kpiScore = 1;
      if (row[12] !== undefined && row[12] !== '') {
        kpiScore = Number(row[12]) || 0;
      }

      const isSummary = office.includes('ผลรวม') || province.includes('ผลรวม');

      records.push({
        id: rowId++,
        criteria,
        unit,
        province,
        office,
        isSummary,
        totalJobs,
        totalValue,
        closedJobs,
        closedValue,
        remainingJobs,
        remainingValue,
        latestPercent,
        kpiScore
      });
    }

    return records;
  }

  function openExcelUpdateModal() {
    const modal = document.getElementById('excelUpdateModal');
    if (modal) modal.style.display = 'flex';
  }

  function closeExcelUpdateModal() {
    const modal = document.getElementById('excelUpdateModal');
    if (modal) modal.style.display = 'none';
    const btnTop = document.getElementById('btnUpdateAllExcel');
    if (btnTop) btnTop.classList.remove('is-updating');
  }

  function renderExcelFilesListUI() {
    const container = document.getElementById('excelFilesList');
    if (!container) return;
    container.innerHTML = MONTH_EXCEL_FILES.map(def => `
      <div class="excel-file-row" id="excelRow_${def.monthIndex}">
        <span class="excel-file-month-badge">${def.shortMonth}</span>
        <span class="excel-file-row-name" title="${escapeHtml(def.filename)}">${escapeHtml(def.filename)}</span>
        <span class="excel-file-row-status status-pending" id="excelRowStatus_${def.monthIndex}">⏳ รออัปเดต</span>
      </div>
    `).join('');
  }

  async function startExcelDataUpdate() {
    openExcelUpdateModal();
    const btnTop = document.getElementById('btnUpdateAllExcel');
    if (btnTop) btnTop.classList.add('is-updating');

    const fillBar = document.getElementById('excelProgressBarFill');
    const pctBadge = document.getElementById('excelProgressPercent');
    const currentNameEl = document.getElementById('excelCurrentFileName');
    const countEl = document.getElementById('excelProgressCount');
    const totalRowsEl = document.getElementById('excelTotalRowsParsed');
    const localPrompt = document.getElementById('excelLocalFilePrompt');
    const footerStatus = document.getElementById('excelFooterStatus');
    const btnFinish = document.getElementById('btnFinishExcelModal');
    const btnRetry = document.getElementById('btnRetryExcelUpdate');

    if (fillBar) fillBar.style.width = '0%';
    if (pctBadge) pctBadge.innerText = '0%';
    if (currentNameEl) currentNameEl.innerText = 'กำลังเชื่อมต่อและค้นหาไฟล์ในโฟลเดอร์ 00AI...';
    if (countEl) countEl.innerText = 'กำลังตรวจสอบไฟล์... (0 / 12)';
    if (totalRowsEl) totalRowsEl.innerText = '0 รายการ';
    if (localPrompt) localPrompt.style.display = 'none';
    if (btnFinish) btnFinish.style.display = 'none';
    if (btnRetry) btnRetry.style.display = 'none';
    if (footerStatus) footerStatus.innerText = 'กำลังประมวลผลไฟล์ Excel...';

    renderExcelFilesListUI();

    // Test direct fetch
    let canDirectFetch = false;
    try {
      const testResp = await fetch(encodeURI(MONTH_EXCEL_FILES[0].filename), { cache: 'no-store' });
      if (testResp.ok) canDirectFetch = true;
    } catch (e) {
      canDirectFetch = false;
    }

    if (!canDirectFetch) {
      if (currentNameEl) currentNameEl.innerText = 'เบราว์เซอร์อยู่ในโหมดไฟล์เครื่อง (file://)';
      if (footerStatus) footerStatus.innerText = 'กรุณากดปุ่มด้านล่างเพื่อเลือกโฟลเดอร์ 00AI ครั้งเดียว';
      if (localPrompt) localPrompt.style.display = 'flex';
      if (btnTop) btnTop.classList.remove('is-updating');
      return;
    }

    // Direct fetch is available
    let totalParsedRows = 0;
    let successFilesCount = 0;

    for (let i = 0; i < MONTH_EXCEL_FILES.length; i++) {
      const def = MONTH_EXCEL_FILES[i];
      const rowEl = document.getElementById(`excelRow_${def.monthIndex}`);
      const statusEl = document.getElementById(`excelRowStatus_${def.monthIndex}`);

      if (rowEl) rowEl.classList.add('is-current');
      if (currentNameEl) currentNameEl.innerText = `${def.filename} (${def.monthName})`;
      if (statusEl) {
        statusEl.className = 'excel-file-row-status status-updating';
        statusEl.innerHTML = '<span class="excel-file-spinner"></span> กำลังอ่าน...';
      }

      const currentProgressPct = Math.round((i / MONTH_EXCEL_FILES.length) * 100);
      if (fillBar) fillBar.style.width = `${currentProgressPct}%`;
      if (pctBadge) pctBadge.innerText = `${currentProgressPct}%`;
      if (countEl) countEl.innerText = `กำลังประมวลผล ${i + 1} / 12 ไฟล์ (${currentProgressPct}%)`;

      try {
        const resp = await fetch(encodeURI(def.filename), { cache: 'no-store' });
        if (resp.ok) {
          const buf = await resp.arrayBuffer();
          const records = parsePeaExcelBuffer(buf, def.filename);
          if (records && records.length > 0) {
            window[def.targetVar] = records;
            if (def.monthIndex === 6) window.AUC_INITIAL_DATA = records;
            totalParsedRows += records.length;
            successFilesCount++;
            if (statusEl) {
              statusEl.className = 'excel-file-row-status status-success';
              statusEl.innerHTML = `✅ สำเร็จ (${records.length.toLocaleString()} แถว)`;
            }
          } else {
            if (statusEl) {
              statusEl.className = 'excel-file-row-status status-skip';
              statusEl.innerHTML = '⚠️ ไม่มีข้อมูล';
            }
          }
        } else {
          if (statusEl) {
            statusEl.className = 'excel-file-row-status status-skip';
            statusEl.innerHTML = '⚠️ ไม่พบไฟล์';
          }
        }
      } catch (err) {
        console.warn(`Could not read ${def.filename}:`, err);
        if (statusEl) {
          statusEl.className = 'excel-file-row-status status-skip';
          statusEl.innerHTML = '⚠️ ข้อผิดพลาด';
        }
      }

      if (rowEl) {
        rowEl.classList.remove('is-current');
        rowEl.classList.add('is-done');
      }
      if (totalRowsEl) totalRowsEl.innerText = `${totalParsedRows.toLocaleString()} รายการ`;

      await new Promise(r => setTimeout(r, 70));
    }

    if (fillBar) fillBar.style.width = '100%';
    if (pctBadge) pctBadge.innerText = '100%';
    if (currentNameEl) currentNameEl.innerText = '✅ อัปเดตข้อมูลครบทุกไฟล์ในโฟลเดอร์ 00AI เรียบร้อยแล้ว';
    if (countEl) countEl.innerText = `เสร็จสมบูรณ์ 12 / 12 ไฟล์ (100%) - รวมข้อมูล ${totalParsedRows.toLocaleString()} รายการ`;
    if (footerStatus) footerStatus.innerHTML = '<span style="color:#34D399; font-weight:700;">🎉 อัปเดตข้อมูลสำเร็จ! กราฟและการ์ดสรุปได้รับการคำนวณใหม่แล้ว</span>';
    if (btnFinish) btnFinish.style.display = 'inline-flex';
    if (btnTop) btnTop.classList.remove('is-updating');

    loadDataForMonth(state.filters.month);
    populateFilterDropdowns();
    initBarChartCriteriaDropdown();
    updateMonthButtonsUI();
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();

    showToast(`อัปเดตข้อมูลไฟล์ Excel สำเร็จ ${successFilesCount} ไฟล์ (${totalParsedRows.toLocaleString()} รายการ)`, 'success');
  }

  async function processFilesArray(fileObjects) {
    const fillBar = document.getElementById('excelProgressBarFill');
    const pctBadge = document.getElementById('excelProgressPercent');
    const currentNameEl = document.getElementById('excelCurrentFileName');
    const countEl = document.getElementById('excelProgressCount');
    const totalRowsEl = document.getElementById('excelTotalRowsParsed');
    const footerStatus = document.getElementById('excelFooterStatus');
    const btnFinish = document.getElementById('btnFinishExcelModal');
    const localPrompt = document.getElementById('excelLocalFilePrompt');
    const btnTop = document.getElementById('btnUpdateAllExcel');

    if (localPrompt) localPrompt.style.display = 'none';
    if (btnTop) btnTop.classList.add('is-updating');

    let totalParsedRows = 0;
    let matchedFilesCount = 0;

    for (let i = 0; i < MONTH_EXCEL_FILES.length; i++) {
      const def = MONTH_EXCEL_FILES[i];
      const rowEl = document.getElementById(`excelRow_${def.monthIndex}`);
      const statusEl = document.getElementById(`excelRowStatus_${def.monthIndex}`);

      if (rowEl) rowEl.classList.add('is-current');
      if (currentNameEl) currentNameEl.innerText = `${def.filename} (${def.monthName})`;
      if (statusEl) {
        statusEl.className = 'excel-file-row-status status-updating';
        statusEl.innerHTML = '<span class="excel-file-spinner"></span> กำลังอ่าน...';
      }

      const currentProgressPct = Math.round((i / MONTH_EXCEL_FILES.length) * 100);
      if (fillBar) fillBar.style.width = `${currentProgressPct}%`;
      if (pctBadge) pctBadge.innerText = `${currentProgressPct}%`;
      if (countEl) countEl.innerText = `กำลังประมวลผล ${i + 1} / 12 ไฟล์ (${currentProgressPct}%)`;

      const foundFile = fileObjects.find(f => {
        const name = f.name;
        if (!name.toLowerCase().endsWith('.xlsx')) return false;
        const matchedDef = matchExcelFileToMonth(name);
        return matchedDef && matchedDef.monthIndex === def.monthIndex;
      });

      if (foundFile) {
        try {
          const buf = await foundFile.arrayBuffer();
          const records = parsePeaExcelBuffer(buf, foundFile.name);
          if (records && records.length > 0) {
            window[def.targetVar] = records;
            if (def.monthIndex === 6) window.AUC_INITIAL_DATA = records;
            totalParsedRows += records.length;
            matchedFilesCount++;
            if (statusEl) {
              statusEl.className = 'excel-file-row-status status-success';
              statusEl.innerHTML = `✅ สำเร็จ (${records.length.toLocaleString()} แถว)`;
            }
          } else {
            if (statusEl) {
              statusEl.className = 'excel-file-row-status status-skip';
              statusEl.innerHTML = '⚠️ ไม่มีข้อมูล';
            }
          }
        } catch (err) {
          console.error(`Error reading ${foundFile.name}:`, err);
          if (statusEl) {
            statusEl.className = 'excel-file-row-status status-skip';
            statusEl.innerHTML = '⚠️ ข้อผิดพลาด';
          }
        }
      } else {
        if (statusEl) {
          statusEl.className = 'excel-file-row-status status-skip';
          statusEl.innerHTML = '⚠️ ไม่พบในโฟลเดอร์';
        }
      }

      if (rowEl) {
        rowEl.classList.remove('is-current');
        rowEl.classList.add('is-done');
      }
      if (totalRowsEl) totalRowsEl.innerText = `${totalParsedRows.toLocaleString()} รายการ`;

      await new Promise(r => setTimeout(r, 60));
    }

    if (fillBar) fillBar.style.width = '100%';
    if (pctBadge) pctBadge.innerText = '100%';
    if (currentNameEl) currentNameEl.innerText = '✅ อัปเดตข้อมูลครบ 12 ไฟล์เรียบร้อยแล้ว';
    if (countEl) countEl.innerText = `เสร็จสมบูรณ์ 12 / 12 ไฟล์ (100%) - รวมข้อมูล ${totalParsedRows.toLocaleString()} รายการ`;
    if (footerStatus) footerStatus.innerHTML = '<span style="color:#34D399; font-weight:700;">🎉 อัปเดตข้อมูลสำเร็จ! กราฟและการ์ดสรุปได้รับการคำนวณใหม่แล้ว</span>';
    if (btnFinish) btnFinish.style.display = 'inline-flex';
    if (btnTop) btnTop.classList.remove('is-updating');

    loadDataForMonth(state.filters.month);
    populateFilterDropdowns();
    initBarChartCriteriaDropdown();
    updateMonthButtonsUI();
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();

    showToast(`อัปเดตข้อมูลไฟล์ Excel สำเร็จ ${matchedFilesCount} ไฟล์ (${totalParsedRows.toLocaleString()} รายการ)`, 'success');
  }

  async function handlePickFolder00AI() {
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({
          id: 'pea-00ai-excel-directory',
          mode: 'read'
        });
        const fileObjects = [];
        let kpiFileFound = null;
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.xlsx')) {
            const f = await entry.getFile();
            fileObjects.push(f);
            if (entry.name.toLowerCase().includes('02') || entry.name.toLowerCase().includes('kpi')) {
              kpiFileFound = f;
            }
          }
        }
        if (kpiFileFound) {
          try {
            const kpiBuf = await kpiFileFound.arrayBuffer();
            const matrix = parseKpiExcelBuffer(kpiBuf);
            if (matrix && matrix.length > 0) {
              window.KPI_MATRIX = matrix;
              try { localStorage.setItem('AUC_SAVED_KPI_MATRIX', JSON.stringify(matrix)); } catch(e) {}
              console.log('✅ Updated 02 KPI from picked folder:', matrix.length);
            }
          } catch(e) {}
        }
        if (fileObjects.length > 0) {
          await processFilesArray(fileObjects);
          return;
        } else {
          showToast('ไม่พบไฟล์ Excel .xlsx ในโฟลเดอร์ที่เลือก', 'warning');
        }
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('showDirectoryPicker failed, falling back to input:', err);
      }
    }
    const input = document.getElementById('fallbackFolderInput');
    if (input) input.click();
  }

  window.startExcelDataUpdate = startExcelDataUpdate;
  window.closeExcelUpdateModal = closeExcelUpdateModal;

  function hasReportForMonth(mIdx) {
    const m = Number(mIdx);
    const raw = getRawDataForMonth(m);
    if (raw && raw.length > 0) {
      const hasClosed = raw.some(d => (Number(d.closedJobs) > 0 || Number(d.closedValue) > 0));
      if (hasClosed) return true;
    }
    return m >= 0 && m <= 8;
  }

  function getRawDataForMonth(mIdx) {
    const m = Number(mIdx);
    if (m === 0 && window.AUC_DATA_JAN && Array.isArray(window.AUC_DATA_JAN)) return window.AUC_DATA_JAN;
    if (m === 1 && window.AUC_DATA_FEB && Array.isArray(window.AUC_DATA_FEB)) return window.AUC_DATA_FEB;
    if (m === 2 && window.AUC_DATA_MAR && Array.isArray(window.AUC_DATA_MAR)) return window.AUC_DATA_MAR;
    if (m === 3 && window.AUC_DATA_APR && Array.isArray(window.AUC_DATA_APR)) return window.AUC_DATA_APR;
    if (m === 4 && window.AUC_DATA_MAY && Array.isArray(window.AUC_DATA_MAY)) return window.AUC_DATA_MAY;
    if (m === 5 && window.AUC_DATA_JUN && Array.isArray(window.AUC_DATA_JUN)) return window.AUC_DATA_JUN;
    if (m === 6 && (window.AUC_DATA_JUL || window.AUC_INITIAL_DATA)) return (window.AUC_DATA_JUL || window.AUC_INITIAL_DATA);
    if (m === 7 && window.AUC_DATA_AUG && Array.isArray(window.AUC_DATA_AUG)) return window.AUC_DATA_AUG;
    if (m === 8 && window.AUC_DATA_SEP && Array.isArray(window.AUC_DATA_SEP)) return window.AUC_DATA_SEP;
    if (m === 9 && window.AUC_DATA_OCT && Array.isArray(window.AUC_DATA_OCT)) return window.AUC_DATA_OCT;
    if (m === 10 && window.AUC_DATA_NOV && Array.isArray(window.AUC_DATA_NOV)) return window.AUC_DATA_NOV;
    if (m === 11 && window.AUC_DATA_DEC && Array.isArray(window.AUC_DATA_DEC)) return window.AUC_DATA_DEC;
    return [];
  }

  function loadDataForMonth(mIdx) {
    const m = Number(mIdx);
    let rawList = getRawDataForMonth(m);
    if (!rawList.length) {
      rawList = (window.AUC_DATA_SEP || window.AUC_DATA_AUG || window.AUC_DATA_JUL || window.AUC_INITIAL_DATA || window.AUC_DATA_JUN || window.AUC_DATA_MAY || window.AUC_DATA_APR || window.AUC_DATA_MAR || window.AUC_DATA_FEB || window.AUC_DATA_JAN || []);
    }

    state.allData = rawList.map(item => {
      const norm = normalizeRecord(item);
      if (!hasReportForMonth(m)) {
        norm.closedJobs = 0;
        norm.closedValue = 0;
        norm.remainingJobs = norm.totalJobs;
        norm.remainingValue = norm.totalValue;
        norm.latestPercent = 0;
        norm.kpiScore = 0;
      } else {
        const isJobUnit = norm.unit === 'งาน' || (norm.criteria && (norm.criteria.includes('3.') || norm.criteria.includes('4') || norm.criteria.includes('C02.2') || norm.criteria.includes('TECO')));
        const pct = isJobUnit
          ? (norm.totalJobs > 0 ? (norm.closedJobs / norm.totalJobs) * 100 : 0)
          : (norm.totalValue > 0 ? (norm.closedValue / norm.totalValue) * 100 : 0);
        norm.latestPercent = pct / 100;
        
        const evalRes = evaluateKpiScore(norm.criteria, m, pct);
        if (evalRes && evalRes.level !== undefined && evalRes.level !== null) {
          norm.kpiScore = evalRes.level;
        } else if (item.kpiScore !== undefined && item.kpiScore !== null) {
          norm.kpiScore = Number(item.kpiScore);
        } else {
          norm.kpiScore = 1;
        }
      }
      return norm;
    });
  }

  async function initData() {
    try {
      localStorage.removeItem('AUC_SAVED_KPI_MATRIX');
    } catch(e) {}
    loadDataForMonth(state.filters.month);
    populateFilterDropdowns();
    updateMonthButtonsUI();
    filterData();

    // Auto-pull 02 KPI.xlsx directly from folder 00AI if accessible via fetch
    try {
      const resp = await fetch(encodeURI('02 KPI.xlsx'), { cache: 'no-store' });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const matrix = parseKpiExcelBuffer(buf);
        if (matrix && matrix.length > 0) {
          window.KPI_MATRIX = matrix;
          filterData();
          renderAll();
          console.log('✅ Auto-loaded 02 KPI.xlsx directly from folder 00AI:', matrix.length);
        }
      }
    } catch(e) {}
  }

  function normalizeRecord(item) {
    return {
      id: item.id || 0,
      criteria: (item.criteria || '').trim(),
      unit: (item.unit || '').trim(),
      province: (item.province || '').trim(),
      office: (item.office || '').trim(),
      isSummary: (item.office || '').includes('ผลรวม') || (item.province || '').includes('ผลรวม'),
      totalJobs: Number(item.totalJobs) || 0,
      totalValue: Number(item.totalValue) || 0,
      closedJobs: Number(item.closedJobs) || 0,
      closedValue: Number(item.closedValue) || 0,
      remainingJobs: Number(item.remainingJobs) || 0,
      remainingValue: Number(item.remainingValue) || 0,
      latestPercent: Number(item.latestPercent) || 0,
      kpiScore: Number(item.kpiScore) || 0,
      monthlyPlan: Array.isArray(item.monthlyPlan) ? item.monthlyPlan.map(v => Number(v) || 0) : new Array(12).fill(0),
      monthlyTargetPct: Array.isArray(item.monthlyTargetPct) ? item.monthlyTargetPct.map(v => Number(v) || 0) : new Array(12).fill(0),
      monthlyGap: Array.isArray(item.monthlyGap) ? item.monthlyGap.map(v => Number(v) || 0) : new Array(12).fill(0)
    };
  }

  function getCriteriaShortName(c) {
    if (!c) return '';
    // Priority: Check ข้อ 4 (C02.2) and ข้อ 5 first to avoid substring collision with '2.2' in 'C02.2'
    if (c.includes('4') || c.includes('C02') || c.includes('c02') || c.startsWith('ข้อ 4') || c.startsWith('ข้อ4')) {
      return 'ข้อ 4 C02.2';
    }
    if (c.includes('5') || c.includes('จัดสรร') || c.startsWith('ข้อ 5') || c.startsWith('ข้อ5')) {
      return 'ข้อ 5 จัดสรร';
    }
    if (c.includes('1.1')) return 'ข้อ 1.1 C.1';
    if (c.includes('1.2')) return 'ข้อ 1.2 I,P';
    if (c.includes('1.3')) return 'ข้อ 1.3 I,P';
    if (c.includes('2.1')) return 'ข้อ 2.1 C.1';
    if (c.includes('2.2')) return 'ข้อ 2.2 I,P';
    if (c.includes('3.1')) return 'ข้อ 3.1 TECO';
    if (c.includes('3.2')) return 'ข้อ 3.2 TECO';
    if (c.includes('3.3')) return 'ข้อ 3.3 TECO';
    if (c.includes('3.') || c.includes('TECO') || c.includes('teco')) return 'ข้อ 3 TECO';
    return c;
  }

  function getCriteriaFullName(c) {
    if (!c) return '';
    // Priority: Check ข้อ 4 (C02.2) and ข้อ 5 first to avoid substring collision with '2.2' in 'C02.2'
    if (c.includes('4') || c.includes('C02') || c.includes('c02') || c.startsWith('ข้อ 4') || c.startsWith('ข้อ4')) {
      return 'ข้อ 4 งบ C02.2 ปี 69';
    }
    if (c.includes('5') || c.includes('จัดสรร') || c.startsWith('ข้อ 5') || c.startsWith('ข้อ5')) {
      return 'ข้อ 5 งานบ้านและที่ดินจัดสรร';
    }
    if (c.includes('1.1')) return 'ข้อ 1.1 งบ C.1 ก่อน 69';
    if (c.includes('1.2')) return 'ข้อ 1.2 งบ I , P ก่อนปี 68';
    if (c.includes('1.3')) return 'ข้อ 1.3 งบ I , P ก่อนปี 69';
    if (c.includes('2.1')) return 'ข้อ 2.1 งบ C.1 ปี 69';
    if (c.includes('2.2')) return 'ข้อ 2.2 งบ I , P ปี 69';
    if (c.includes('3.1')) return 'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)';
    if (c.includes('3.2')) return 'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)';
    if (c.includes('3.3')) return 'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)';
    if (c.includes('3.') || c.includes('TECO') || c.includes('teco')) return 'ข้อ 3 TECO D2';
    return c;
  }

  function populateFilterDropdowns() {
    const critSet = new Set();
    const provSet = new Set();

    state.allData.forEach(d => {
      if (d.criteria) critSet.add(d.criteria);
      if (d.province && !d.province.includes('ผลรวม')) provSet.add(d.province);
    });

    const standardOrder = [
      'ข้อ 1.1 งบ C.1 ก่อน 69',
      'ข้อ 1.2 งบ I , P ก่อนปี 68',
      'ข้อ 1.3 งบ I , P ก่อนปี 69',
      'ข้อ 2.1 งบ C.1 ปี 69',
      'ข้อ 2.2 งบ I , P ปี 69',
      'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)',
      'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)',
      'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)',
      'ข้อ 3.1 TECO D2',
      'ข้อ 3.2 TECO D2',
      'ข้อ 3.3 TECO D2',
      'ข้อ 4 งบ C02.2 ปี 69',
      'ข้อ5 งานบ้านและที่ดินจัดสรร'
    ];

    const availableCrits = [];
    standardOrder.forEach(c => {
      if (critSet.has(c) && !availableCrits.includes(c)) availableCrits.push(c);
    });
    critSet.forEach(c => {
      if (!availableCrits.includes(c) && c !== 'ALL') availableCrits.push(c);
    });

    const critSelect = document.getElementById('filterCriteria');
    if (critSelect) {
      // แนบหน่วยวัด (มูลค่า / งาน) เป็น data-unit ในทุกตัวเลือกข้อ 1.1 - 5 ให้ js/criteria_dropdown.js แสดงชิดขวา (value ยังเป็นชื่อเกณฑ์เดิม ไม่กระทบการกรอง)
      const critOptionHtml = (c) => {
        return `<option value="${escapeHtml(c)}" data-unit="${getCriteriaUnitKind(c)}">${escapeHtml(c)}</option>`;
      };
      let html = '<option value="ALL" data-unit="all">เลือกทั้งหมด</option>';
      availableCrits.forEach(c => {
        html += critOptionHtml(c);
      });
      if (availableCrits.length === 0) {
        html = '<option value="ALL" data-unit="all">เลือกทั้งหมด</option>';
        standardOrder.forEach(c => {
          html += critOptionHtml(c);
        });
      }
      critSelect.innerHTML = html;

      // Smart selection handling across months for ข้อ 3 TECO and ALL
      if (state.filters.criteria === 'ALL') {
        critSelect.value = 'ALL';
      } else if (critSet.has(state.filters.criteria)) {
        critSelect.value = state.filters.criteria;
      } else if (state.filters.criteria && (state.filters.criteria.includes('3.') || state.filters.criteria.includes('TECO') || state.filters.criteria.includes('teco'))) {
        const monthTeco = Array.from(critSet).find(c => c.includes('3.') || c.includes('TECO') || c.includes('teco'));
        if (monthTeco) {
          state.filters.criteria = monthTeco;
          critSelect.value = monthTeco;
        } else {
          state.filters.criteria = 'ข้อ 1.1 งบ C.1 ก่อน 69';
          critSelect.value = state.filters.criteria;
        }
      } else {
        state.filters.criteria = critSelect.options[1]?.value || 'ข้อ 1.1 งบ C.1 ก่อน 69';
        critSelect.value = state.filters.criteria;
      }

      // Sync to all chart header criteria dropdowns (.select-chart-crit)
      const chartCritHtml = html;
      document.querySelectorAll('.select-chart-crit').forEach(sel => {
        sel.innerHTML = chartCritHtml;
        sel.value = state.filters.criteria || 'ALL';
      });
    }

    updateChartMonthDropdown();

    // Render Sidebar Criteria Buttons (ปุ่มลัดประเภทเกณฑ์วัดใน Sidebar - แสดงชื่อเต็มชัดเจน เรียงข้อ 1-5 อ่านง่าย ไม่เบียด)
    const sideCritGrid = document.getElementById('sidebarCriteriaButtons');
    if (sideCritGrid) {
      const critGroups = [
        { id: '1', items: [] },
        { id: '2', items: [] },
        { id: '3', items: [] },
        { id: '4', items: [] },
        { id: '5', items: [] }
      ];

      availableCrits.forEach(c => {
        // Priority: Check ข้อ 4 (C02.2) and ข้อ 5 first so 'C02.2' never matches '2.2' for row 2
        if (c.includes('4') || c.includes('C02') || c.includes('c02') || c.startsWith('ข้อ 4') || c.startsWith('ข้อ4')) {
          critGroups[3].items.push(c);
        } else if (c.includes('5') || c.includes('จัดสรร') || c.startsWith('ข้อ 5') || c.startsWith('ข้อ5')) {
          critGroups[4].items.push(c);
        } else if (c.includes('1.1') || c.includes('1.2') || c.includes('1.3') || c.startsWith('ข้อ 1') || c.startsWith('ข้อ1')) {
          critGroups[0].items.push(c);
        } else if (c.includes('2.1') || c.includes('2.2') || c.startsWith('ข้อ 2') || c.startsWith('ข้อ2')) {
          critGroups[1].items.push(c);
        } else if (c.includes('3.') || c.includes('TECO') || c.includes('teco') || c.startsWith('ข้อ 3') || c.startsWith('ข้อ3')) {
          critGroups[2].items.push(c);
        }
      });

      let sideHtml = '';
      critGroups.forEach(group => {
        if (group.items.length > 0) {
          group.items.forEach(c => {
            const isSelected = matchCriteriaName(c, state.filters.criteria);
            const fullName = getCriteriaFullName(c);
            sideHtml += `
              <button type="button" class="btn-sidebar-pill btn-sidebar-crit ${isSelected ? 'active' : ''}" data-crit="${escapeHtml(c)}" title="${escapeHtml(fullName)}" onclick="window.selectSidebarCriteria(this.getAttribute('data-crit'))">
                <span class="crit-full-name">${escapeHtml(fullName)}</span>
              </button>
            `;
          });
        }
      });
      sideCritGrid.innerHTML = sideHtml;
    }

    // Render Chart Single-Select Criteria Quick Pills (แสดงเกณฑ์วัดบนกราฟ - แสดงอย่างเดียว กดเลือกไม่ได้)
    const critPillsContainer = document.getElementById('chartCritQuickPills');
    if (critPillsContainer) {
      const currentCrit = state.filters.criteria || 'ข้อ 1.1 งบ C.1 ก่อน 69';
      const isAll = currentCrit === 'ALL' || !currentCrit;
      let pillsHtml = '';

      availableCrits.forEach(c => {
        const isSelected = !isAll && matchCriteriaName(c, currentCrit);
        const shortName = getCriteriaShortName(c);
        pillsHtml += `
          <span class="btn-chart-crit-pill is-display-only ${isSelected ? 'active' : ''}" data-crit="${escapeHtml(c)}" title="เกณฑ์วัด: ${escapeHtml(c)}">
            <span>${escapeHtml(shortName)}</span>
          </span>
        `;
      });

      critPillsContainer.innerHTML = pillsHtml;
    }

    const provSelect = document.getElementById('filterProvince');
    if (provSelect) {
      const orderedProvs = ['กอง/กฟก.3', 'นครปฐม', 'สุพรรณบุรี', 'กาญจนบุรี', 'สมุทรสาคร'];
      let html = '<option value="ALL">กฟก.3 (ทั้งหมด)</option>';
      orderedProvs.forEach(p => {
        if (provSet.size === 0 || provSet.has(p)) {
          html += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
        }
      });
      provSet.forEach(p => {
        if (!orderedProvs.includes(p) && p !== 'ALL' && p !== 'กฟก.3') {
          html += `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`;
        }
      });
      provSelect.innerHTML = html;
      provSelect.value = state.filters.province || 'ALL';

      // Sync to all chart header province dropdowns (รองรับทุกกราฟหลักทั้งโหมดปกติ & โหมดขยายเต็มจอ)
      document.querySelectorAll('.select-chart-prov').forEach(sel => {
        sel.innerHTML = html;
        sel.value = state.filters.province || 'ALL';
      });

      const chartProvSelect = document.getElementById('chartFilterProvince');
      if (chartProvSelect) {
        chartProvSelect.innerHTML = html;
        chartProvSelect.value = state.filters.province || 'ALL';
      }
    }

    function updateChartMonthDropdown() {
      let mHtml = '';
      for (let m = 0; m < 12; m++) {
        const hasData = hasReportForMonth(m);
        const isLatest = m === 8;
        const label = isLatest ? `เดือน ${MONTHS_TH[m]} (ล่าสุด)` : `เดือน ${MONTHS_TH[m]}`;
        const suffix = hasData ? '' : ' (ยังไม่มีข้อมูล)';
        const disabledAttr = hasData ? '' : ' disabled';
        mHtml += `<option value="${m}"${disabledAttr}>${label}${suffix}</option>`;
      }
      const currentM = (typeof state.filters.month === 'number') ? state.filters.month : 8;
      document.querySelectorAll('.select-chart-month').forEach(sel => {
        sel.innerHTML = mHtml;
        sel.value = currentM;
      });

      const topMonthSelect = document.getElementById('filterMonth');
      if (topMonthSelect) {
        topMonthSelect.innerHTML = mHtml;
        topMonthSelect.value = currentM;
      }
    }

    // Render Sidebar Province Buttons (ปุ่มลัดจังหวัด/กองใน Sidebar - กฟก.3 และ กอง/กฟก.3 บรรทัดเดียวกัน)
    const sideProvGrid = document.getElementById('sidebarProvinceButtons');
    if (sideProvGrid) {
      const provRows = [
        [
          { id: 'ALL', label: 'กฟก.3 (ทั้งหมด)', title: 'กฟก.3 (ทั้งหมด)' },
          { id: 'กอง/กฟก.3', label: 'กอง/กฟก.3', title: 'กอง/กฟก.3' }
        ],
        [
          { id: 'นครปฐม', label: 'จ.นครปฐม', title: 'จังหวัดนครปฐม' },
          { id: 'สุพรรณบุรี', label: 'จ.สุพรรณบุรี', title: 'จังหวัดสุพรรณบุรี' }
        ],
        [
          { id: 'กาญจนบุรี', label: 'จ.กาญจนบุรี', title: 'จังหวัดกาญจนบุรี' },
          { id: 'สมุทรสาคร', label: 'จ.สมุทรสาคร', title: 'จังหวัดสมุทรสาคร' }
        ]
      ];

      let provHtml = '';
      provRows.forEach((row, idx) => {
        provHtml += `<div class="sidebar-prov-row ${idx === 0 ? 'row-prov-main' : 'row-prov-sub'}">`;
        row.forEach(p => {
          const isSelected = (state.filters.province || 'ALL') === p.id;
          provHtml += `
            <button type="button" class="btn-sidebar-pill ${isSelected ? 'active' : ''}" data-prov="${escapeHtml(p.id)}" title="${escapeHtml(p.title)}" onclick="window.selectSidebarProvince(this.getAttribute('data-prov'))">
              <span>${escapeHtml(p.label)}</span>
            </button>
          `;
        });
        provHtml += `</div>`;
      });
      sideProvGrid.innerHTML = provHtml;
    }

    updateOfficeDropdown();
  }

  const MONTHS_FULL_TH = [
    'มกราคม (ม.ค.)', 'กุมภาพันธ์ (ก.พ.)', 'มีนาคม (มี.ค.)', 'เมษายน (เม.ย.)',
    'พฤษภาคม (พ.ค.)', 'มิถุนายน (มิ.ย.)', 'กรกฎาคม (ก.ค.)', 'สิงหาคม (ส.ค.)',
    'กันยายน (ก.ย.)', 'ตุลาคม (ต.ค.)', 'พฤศจิกายน (พ.ย.)', 'ธันวาคม (ธ.ค.)'
  ];

  function updateMonthButtonsUI() {
    const monthBtns = document.querySelectorAll('.btn-month');
    let activeBtn = null;
    monthBtns.forEach(btn => {
      const m = parseInt(btn.getAttribute('data-month'), 10);
      const hasData = hasReportForMonth(m);
      if (hasData) {
        btn.classList.add('has-data');
        btn.classList.remove('is-disabled-month');
        btn.removeAttribute('aria-disabled');
        btn.title = `มีข้อมูลรายงานผล (${MONTHS_FULL_TH[m] || ''})`;
      } else {
        btn.classList.remove('has-data');
        btn.classList.add('is-disabled-month');
        btn.setAttribute('aria-disabled', 'true');
        btn.title = `${MONTHS_FULL_TH[m] || ''} (ยังไม่ลงข้อมูล - โชว์อย่างเดียว ไม่สามารถกดเลือกได้)`;
      }
      if (state.filters.month === m) {
        btn.classList.add('active');
        activeBtn = btn;
      } else {
        btn.classList.remove('active');
      }
    });

    const badge = document.getElementById('selectedMonthBadge');
    if (badge) {
      const mIdx = (typeof state.filters.month === 'number') ? state.filters.month : 7;
      const mName = MONTHS_TH[mIdx] || 'ส.ค.';
      const hasData = activeBtn ? activeBtn.classList.contains('has-data') : (mIdx <= 7);
      badge.textContent = `${mName} (${hasData ? 'มีข้อมูล' : 'ยังไม่มีข้อมูล'})`;
      if (hasData) {
        badge.classList.remove('no-data');
      } else {
        badge.classList.add('no-data');
      }
    }

    const topMonthSelect = document.getElementById('filterMonth');
    if (topMonthSelect && typeof state.filters.month === 'number') {
      topMonthSelect.value = state.filters.month;
    }
  }

  function updateOfficeDropdown() {
    const offSelect = document.getElementById('filterOffice');
    const chartOffSelect = document.getElementById('chartFilterOffice');

    const selectedProv = state.filters.province;
    const offSet = new Set();

    state.allData.forEach(d => {
      if (d.office && !d.office.includes('ผลรวม')) {
        if (selectedProv === 'ALL' || d.province === selectedProv) {
          offSet.add(d.office);
        }
      }
    });

    // If current office filter is not valid under the newly selected province, reset it to 'ALL'
    if (state.filters.office !== 'ALL' && !offSet.has(state.filters.office)) {
      state.filters.office = 'ALL';
    }

    const label = selectedProv === 'ALL'
      ? 'ทุกหน่วยงาน'
      : `ทุกหน่วยงาน ใน ${escapeHtml(selectedProv)}`;

    let html = `<option value="ALL">${label}</option>`;
    // จัดลำดับ: กองในสังกัด กฟก.3 (กรย., กวว., กสฟ. ฯลฯ) ขึ้นก่อน แล้วตามด้วย กฟจ./กฟส. เรียงตามตัวอักษร
    const divisionOffices = new Set();
    state.allData.forEach(d => {
      if (d.office && d.province === 'กอง/กฟก.3') divisionOffices.add(d.office);
    });
    const sortedOffices = Array.from(offSet).sort((a, b) => {
      const aDiv = divisionOffices.has(a) ? 0 : 1;
      const bDiv = divisionOffices.has(b) ? 0 : 1;
      if (aDiv !== bDiv) return aDiv - bDiv;
      return a.localeCompare(b, 'th');
    });
    sortedOffices.forEach(o => {
      const isSelected = state.filters.office === o ? ' selected' : '';
      html += `<option value="${escapeHtml(o)}"${isSelected}>${escapeHtml(o)}</option>`;
    });

    if (offSelect) offSelect.innerHTML = html;
    if (chartOffSelect) chartOffSelect.innerHTML = html;

    // Sync to all chart header office dropdowns (รองรับทุกกราฟหลักทั้งโหมดปกติ & โหมดขยายเต็มจอ)
    document.querySelectorAll('.select-chart-off').forEach(sel => {
      sel.innerHTML = html;
      sel.value = state.filters.office || 'ALL';
    });

    // Render Sidebar Office Buttons (ปุ่มลัด กอง/กฟฟ. ใน Sidebar)
    const sideOffGrid = document.getElementById('sidebarOfficeButtons');
    const officeBadge = document.getElementById('sidebarOfficeCountBadge');
    if (officeBadge) {
      officeBadge.textContent = sortedOffices.length > 0 ? `(${sortedOffices.length} แห่ง)` : '';
    }

    if (sideOffGrid) {
      const officeProvMap = {};
      state.allData.forEach(d => {
        if (d.office && d.province && !d.province.includes('ผลรวม')) {
          officeProvMap[d.office] = d.province;
        }
      });

      const isAllOffices = !state.filters.office || state.filters.office === 'ALL';
      let offHtml = `
        <button type="button" class="btn-sidebar-chip ${isAllOffices ? 'active' : ''}" data-off="ALL" title="ทุกหน่วยงาน" onclick="window.selectSidebarOffice('ALL')">
          <span>ทุกหน่วยงาน</span>
        </button>
      `;
      sortedOffices.forEach(o => {
        const isSelected = state.filters.office === o;
        const shortName = o.replace(/^การไฟฟ้าส่วนภูมิภาค/, '').trim() || o;
        const provOfOff = officeProvMap[o] || selectedProv || '';
        offHtml += `
          <button type="button" class="btn-sidebar-chip ${isSelected ? 'active' : ''}" data-off="${escapeHtml(o)}" data-prov="${escapeHtml(provOfOff)}" title="${escapeHtml(o)} (${escapeHtml(provOfOff)})" onclick="window.selectSidebarOffice(this.getAttribute('data-off'))">
            <span>${escapeHtml(shortName)}</span>
          </button>
        `;
      });
      sideOffGrid.innerHTML = offHtml;
    }

    syncSidebarFilterUI();
    syncChartFilterUI();
  }


  function syncSidebarFilterUI() {
    const currentCrit = state.filters.criteria || 'ข้อ 1.1 งบ C.1 ก่อน 69';
    const currentProv = state.filters.province || 'ALL';
    const currentOff = state.filters.office || 'ALL';

    // Sync Criteria Sidebar Buttons
    document.querySelectorAll('#sidebarCriteriaButtons .btn-sidebar-pill').forEach(btn => {
      const c = btn.getAttribute('data-crit');
      btn.classList.toggle('active', matchCriteriaName(c, currentCrit));
    });

    // Sync Province Sidebar Buttons
    document.querySelectorAll('#sidebarProvinceButtons .btn-sidebar-pill').forEach(btn => {
      const p = btn.getAttribute('data-prov');
      btn.classList.toggle('active', p === currentProv);
    });

    // Sync Office Sidebar Chips
    document.querySelectorAll('#sidebarOfficeButtons .btn-sidebar-chip').forEach(btn => {
      const o = btn.getAttribute('data-off');
      btn.classList.toggle('active', o === currentOff);
    });
  }

  function syncChartFilterUI() {
    const currentCrit = state.filters.criteria || 'ALL';
    const isAll = currentCrit === 'ALL';

    // Sync Criteria Pills
    document.querySelectorAll('#chartCritQuickPills .btn-chart-crit-pill').forEach(btn => {
      const c = btn.getAttribute('data-crit');
      const isSel = !isAll && matchCriteriaName(c, currentCrit);
      btn.classList.toggle('active', isSel);
    });

    // Sync Criteria Badge
    const badge = document.getElementById('chartCritCountBadge');
    if (badge) {
      if (isAll) {
        badge.textContent = 'ทุกเกณฑ์ (ALL)';
        badge.className = 'crit-selected-badge all';
      } else {
        badge.textContent = getCriteriaShortName(currentCrit);
        badge.className = 'crit-selected-badge single';
      }
    }

    const cProv = document.getElementById('chartFilterProvince');
    if (cProv && state.filters.province) cProv.value = state.filters.province;

    const cOff = document.getElementById('chartFilterOffice');
    if (cOff && state.filters.office) cOff.value = state.filters.office;

    // Sync all chart header dropdowns (เดือน, เกณฑ์วัด, จังหวัด, หน่วยงาน)
    const curMonth = (typeof state.filters.month === 'number') ? state.filters.month : 7;
    document.querySelectorAll('.select-chart-month').forEach(s => {
      s.value = curMonth;
    });

    const curCrit = state.filters.criteria || 'ALL';
    document.querySelectorAll('.select-chart-crit').forEach(s => {
      s.value = curCrit;
    });

    document.querySelectorAll('.select-chart-prov').forEach(s => {
      if (state.filters.province) s.value = state.filters.province;
    });
    document.querySelectorAll('.select-chart-off').forEach(s => {
      if (state.filters.office) s.value = state.filters.office;
    });

    // Sync Timeline Active Info Strip (วงที่ 1)
    const tCrit = document.getElementById('timelineSelectedCriteriaLabel');
    if (tCrit) {
      const hasMulti = Array.isArray(state.filters.selectedCriteria) && state.filters.selectedCriteria.length > 1;
      if (hasMulti) {
        tCrit.textContent = `เปรียบเทียบ ${state.filters.selectedCriteria.length} เกณฑ์วัด`;
      } else {
        tCrit.textContent = isAll ? 'ทุกเกณฑ์ (ALL)' : currentCrit;
      }
    }
    const tUnit = document.getElementById('timelineSelectedUnitLabel');
    if (tUnit) {
      const isJob = currentCrit && (currentCrit.includes('3.') || currentCrit.includes('4') || currentCrit.includes('C02.2') || currentCrit.includes('TECO'));
      tUnit.textContent = isJob ? '% ปิดงาน (จำนวนงาน)' : '% ปิดงานมูลค่า AUC';
    }
    const tProv = document.getElementById('timelineSelectedProvinceLabel');
    if (tProv) {
      if (state.filters.office && state.filters.office !== 'ALL') {
        if (!state.filters.province || state.filters.province === 'ALL') {
          tProv.textContent = state.filters.office;
        } else {
          tProv.textContent = `${state.filters.province} - ${state.filters.office}`;
        }
      } else if (!state.filters.province || state.filters.province === 'ALL') {
        tProv.textContent = 'กฟก.3 (ทั้งหมด)';
      } else {
        const p = state.filters.province;
        tProv.textContent = (p.startsWith('จ.') || p.startsWith('กอง')) ? p : `จ.${p}`;
      }
    }

    syncSidebarFilterUI();
  }

  window.selectSidebarCriteria = function(crit) {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.criteria = crit;
    state.filters.selectedCriteria = [crit];
    const sideCrit = document.getElementById('filterCriteria');
    if (sideCrit) sideCrit.value = crit;

    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
  };

  window.selectSidebarProvince = function(prov) {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.province = prov;
    const topProv = document.getElementById('filterProvince');
    if (topProv) topProv.value = prov;

    updateOfficeDropdown();
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
  };

  window.selectSidebarOffice = function(off) {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.office = (state.filters.office === off && off !== 'ALL') ? 'ALL' : off;
    const topOff = document.getElementById('filterOffice');
    if (topOff) topOff.value = state.filters.office;
    const chartOff = document.getElementById('chartFilterOffice');
    if (chartOff) chartOff.value = state.filters.office;

    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
  };

  window.selectChartCriteria = function(crit) {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.criteria = crit;
    state.filters.selectedCriteria = [crit];
    
    // Sync sidebar dropdown
    const sideCrit = document.getElementById('filterCriteria');
    if (sideCrit) {
      sideCrit.value = crit;
    }
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
  };

  // Backwards compatibility alias
  window.toggleChartCriteria = window.selectChartCriteria;

  // Reset Individual Filters via Eraser Buttons (ล้างตัวกรองเฉพาะส่วนด้วยปุ่มยางลบ - เกณฑ์วัดกลับเป็นข้อ 1.1)
  window.resetCriteriaFilter = function() {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    
    // ค้นหาชื่อเกณฑ์วัดข้อ 1.1 จากตัวเลือกที่มี
    let targetCrit = 'ข้อ 1.1 งบ C.1 ก่อน 69';
    const critEl = document.getElementById('filterCriteria');
    if (critEl && critEl.options) {
      for (let i = 0; i < critEl.options.length; i++) {
        const val = critEl.options[i].value;
        if (val.includes('1.1')) {
          targetCrit = val;
          break;
        }
      }
    }
    
    state.filters.criteria = targetCrit;
    state.filters.kpiGrade = 'ALL';
    if (critEl) critEl.value = targetCrit;
    
    document.querySelectorAll('.select-chart-crit').forEach(sel => {
      for (let i = 0; i < sel.options.length; i++) {
        if (sel.options[i].value.includes('1.1')) {
          sel.value = sel.options[i].value;
          break;
        }
      }
    });
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
    showToast(`รีเซ็ตเกณฑ์วัดกลับเป็น ${targetCrit} เรียบร้อยแล้ว`, 'info');
  };

  window.resetProvinceFilter = function() {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.province = 'ALL';
    state.filters.office = 'ALL';
    const provEl = document.getElementById('filterProvince');
    if (provEl) provEl.value = 'ALL';
    const offEl = document.getElementById('filterOffice');
    if (offEl) offEl.value = 'ALL';
    document.querySelectorAll('.select-chart-prov').forEach(sel => {
      sel.value = 'ALL';
    });
    document.querySelectorAll('.select-chart-off').forEach(sel => {
      sel.value = 'ALL';
    });
    updateOfficeDropdown();
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
    showToast('ล้างตัวกรองพื้นที่เรียบร้อยแล้ว (กฟก.3 ทั้งหมด)', 'info');
  };

  window.resetOfficeFilter = function() {
    if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
    state.filters.office = 'ALL';
    const offEl = document.getElementById('filterOffice');
    if (offEl) offEl.value = 'ALL';
    const chartOff = document.getElementById('chartFilterOffice');
    if (chartOff) chartOff.value = 'ALL';
    document.querySelectorAll('.select-chart-off').forEach(sel => {
      sel.value = 'ALL';
    });
    syncSidebarFilterUI();
    syncChartFilterUI();
    filterData();
    renderAll();
    showToast('รีเซ็ตกอง/กฟฟ. กลับเป็นทุกหน่วยงานเรียบร้อยแล้ว', 'info');
  };

  // ==========================================
  // 2. FILTERING & SEARCH
  // ==========================================
  function filterData() {
    loadDataForMonth(state.filters.month);

    const { criteria, province, office, kpiGrade, search, unit } = state.filters;
    const q = (search || '').toLowerCase().trim();
    state.filteredData = state.allData.filter(d => {
      // Exclude Grand Totals from granular filters unless specifically requested
      if (criteria && criteria !== 'ALL' && criteria !== 'เลือกทั้งหมด' && criteria !== 'ทุกเกณฑ์วัด') {
        if (!matchCriteriaName(criteria, d.criteria)) return false;
      }

      if (province !== 'ALL' && d.province !== province) return false;
      if (office !== 'ALL' && d.office !== office) return false;
      if (unit !== 'ALL' && d.unit !== unit) return false;

      if (kpiGrade && kpiGrade !== 'ALL') {
        if (kpiGrade === '5') {
          if (Math.round(d.kpiScore) < 5) return false;
        } else if (kpiGrade === '1-4' || kpiGrade === 'FAIL') {
          if (Math.round(d.kpiScore) >= 5) return false;
        } else {
          const targetKpi = Number(kpiGrade);
          if (!isNaN(targetKpi) && Math.round(d.kpiScore) !== targetKpi) return false;
        }
      }

      if (q) {
        const matchSearch = (d.office && d.office.toLowerCase().includes(q)) ||
                            (d.province && d.province.toLowerCase().includes(q)) ||
                            (d.criteria && d.criteria.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }

      return true;
    });

    state.table.page = 1;
    sortFilteredData();
  }

  function sortFilteredData() {
    const { sortCol, sortAsc } = state.table;
    state.filteredData.sort((a, b) => {
      // Keep summary rows at bottom if sorting within a group
      if (a.isSummary && !b.isSummary) return 1;
      if (!a.isSummary && b.isSummary) return -1;

      let vA = a[sortCol];
      let vB = b[sortCol];

      if (typeof vA === 'string') {
        vA = vA.toLowerCase();
        vB = (vB || '').toLowerCase();
        return sortAsc ? vA.localeCompare(vB, 'th') : vB.localeCompare(vA, 'th');
      }

      vA = Number(vA) || 0;
      vB = Number(vB) || 0;
      return sortAsc ? vA - vB : vB - vA;
    });
  }

  // ==========================================
  // 3. EVENT LISTENERS SETUP
  // ==========================================
  function setupEventListeners() {
    // Navigation Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        switchTab(targetTab);
      });
    });

    if (window.location.hash) {
      const hashTab = window.location.hash.replace('#', '');
      if (document.getElementById(hashTab)) {
        setTimeout(() => switchTab(hashTab), 100);
      }
    }

    // Top Sticky Filters
    const monthSelect = document.getElementById('filterMonth');
    if (monthSelect) {
      monthSelect.addEventListener('change', (e) => {
        const m = parseInt(e.target.value, 10);
        if (!hasReportForMonth(m)) {
          showToast(`เดือน ${MONTHS_TH[m] || ''} ยังไม่ได้ลงข้อมูล`, 'warning');
          monthSelect.value = state.filters.month;
          return;
        }
        state.filters.month = m;
        loadDataForMonth(m);
        populateFilterDropdowns();
        initBarChartCriteriaDropdown();
        updateMonthButtonsUI();
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    }

    const critSelect = document.getElementById('filterCriteria');
    if (critSelect) {
      critSelect.addEventListener('change', (e) => {
        state.filters.criteria = e.target.value;
        state.filters.selectedCriteria = [e.target.value];
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    }

    const provSelect = document.getElementById('filterProvince');
    if (provSelect) {
      provSelect.addEventListener('change', (e) => {
        state.filters.province = e.target.value;
        updateOfficeDropdown();
        filterData();
        renderAll();
      });
    }

    const offSelect = document.getElementById('filterOffice');
    if (offSelect) {
      offSelect.addEventListener('change', (e) => {
        state.filters.office = e.target.value;
        filterData();
        renderAll();
      });
    }

    const chartProv = document.getElementById('chartFilterProvince');
    if (chartProv) {
      chartProv.addEventListener('change', (e) => {
        state.filters.province = e.target.value;
        const topProv = document.getElementById('filterProvince');
        if (topProv) topProv.value = e.target.value;
        updateOfficeDropdown();
        filterData();
        renderAll();
      });
    }

    const chartOff = document.getElementById('chartFilterOffice');
    if (chartOff) {
      chartOff.addEventListener('change', (e) => {
        state.filters.office = e.target.value;
        const topOff = document.getElementById('filterOffice');
        if (topOff) topOff.value = e.target.value;
        filterData();
        renderAll();
      });
    }

    // Chart Header Month Filter (.select-chart-month)
    document.querySelectorAll('.select-chart-month').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const m = parseInt(e.target.value, 10);
        if (isNaN(m) || !hasReportForMonth(m)) return;
        state.filters.month = m;
        loadDataForMonth(m);
        populateFilterDropdowns();
        initBarChartCriteriaDropdown();
        updateMonthButtonsUI();
        document.querySelectorAll('.select-chart-month').forEach(s => s.value = m);
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    // Chart Header Criteria Filter (.select-chart-crit)
    document.querySelectorAll('.select-chart-crit').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const crit = e.target.value;
        if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
        state.filters.criteria = crit;
                const sideCrit = document.getElementById('filterCriteria');
        if (sideCrit) sideCrit.value = crit;
        document.querySelectorAll('.select-chart-crit').forEach(s => s.value = crit);
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    // Event listeners for all Chart Header Filter dropdowns (.select-chart-prov & .select-chart-off)
    document.querySelectorAll('.select-chart-prov').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const val = e.target.value;
        state.filters.province = val;
        const topProv = document.getElementById('filterProvince');
        if (topProv) topProv.value = val;
        document.querySelectorAll('.select-chart-prov').forEach(s => s.value = val);
        updateOfficeDropdown();
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    document.querySelectorAll('.select-chart-off').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const val = e.target.value;
        state.filters.office = val;
        const topOff = document.getElementById('filterOffice');
        if (topOff) topOff.value = val;
        document.querySelectorAll('.select-chart-off').forEach(s => s.value = val);
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    // Chart Quick Province Pills (Display Only - กดเลือกไม่ได้ตามข้อกำหนด วงที่ 1)
    // Synchronized automatically via syncChartFilterUI()

    // Chart Filter Reset Button
    const btnChartReset = document.getElementById('btnChartFilterReset');
    if (btnChartReset) {
      btnChartReset.addEventListener('click', () => {
        if (state.hiddenTimelineSeries) state.hiddenTimelineSeries.clear();
        state.filters.criteria = 'ข้อ 1.1 งบ C.1 ก่อน 69';
        state.filters.selectedCriteria = ['ข้อ 1.1 งบ C.1 ก่อน 69'];
        state.filters.province = 'ALL';
        state.filters.office = 'ALL';
        const topCrit = document.getElementById('filterCriteria');
        if (topCrit) topCrit.value = 'ข้อ 1.1 งบ C.1 ก่อน 69';
        const topProv = document.getElementById('filterProvince');
        if (topProv) topProv.value = 'ALL';
        updateOfficeDropdown();
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
        showToast('รีเซ็ตตัวกรองบนกราฟเป็นค่าเริ่มต้นเรียบร้อยแล้ว', 'info');
      });
    }

    // Toggle expand/collapse for Office Chips
    const btnToggleOffice = document.getElementById('btnToggleOfficeExpand');
    const sideOffContainer = document.getElementById('sidebarOfficeButtons');
    if (btnToggleOffice && sideOffContainer) {
      btnToggleOffice.addEventListener('click', () => {
        sideOffContainer.classList.toggle('expanded');
        const isExp = sideOffContainer.classList.contains('expanded');
        btnToggleOffice.innerHTML = isExp
          ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m18 15-6-6-6 6"/></svg>`
          : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>`;
        btnToggleOffice.title = isExp ? 'ย่อมุมมองหน่วยงาน' : 'ขยายดูทุกหน่วยงาน';
      });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.filters.search = e.target.value;
          filterData();
          renderAll();
        }, 200);
      });
    }

    // 12-Month Selector Buttons
    const monthBtns = document.querySelectorAll('.btn-month');
    monthBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const m = parseInt(btn.getAttribute('data-month'), 10);
        if (!hasReportForMonth(m) || !btn.classList.contains('has-data') || btn.getAttribute('aria-disabled') === 'true') {
          e.preventDefault();
          e.stopPropagation();
          showToast(`เดือน ${MONTHS_TH[m] || ''} ยังไม่ได้ลงข้อมูล (โชว์อย่างเดียว ไม่สามารถกดเลือกได้)`, 'warning');
          return;
        }
        state.filters.month = m;
        loadDataForMonth(m);
        populateFilterDropdowns();
        initBarChartCriteriaDropdown();
        updateMonthButtonsUI();
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    // Card 4 Tab Buttons (% มูลค่า vs % ปิดงาน)
    document.querySelectorAll('#kpiCard4Tabs .btn-kpi-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-pct-mode');
        if (mode) {
          state.card4PctMode = mode;
          renderKpiCards();
        }
      });
    });

    // Individual Filter Clear (Eraser) Buttons
    document.querySelectorAll('.btn-clear-field').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-clear');
        if (target === 'criteria') {
          state.filters.criteria = 'ข้อ 1.1 งบ C.1 ก่อน 69';
          const sel = document.getElementById('filterCriteria');
          if (sel) sel.value = 'ข้อ 1.1 งบ C.1 ก่อน 69';
        } else if (target === 'province') {
          state.filters.province = 'ALL';
          const sel = document.getElementById('filterProvince');
          if (sel) sel.value = 'ALL';
          updateOfficeDropdown();
        } else if (target === 'office') {
          state.filters.office = 'ALL';
          const sel = document.getElementById('filterOffice');
          if (sel) sel.value = 'ALL';
        } else if (target === 'search') {
          state.filters.search = '';
          const inp = document.getElementById('searchInput');
          if (inp) inp.value = '';
        }

        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
      });
    });

    // Reset Filters Button
    const resetBtn = document.getElementById('btnResetFilters');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        state.filters = { criteria: 'ข้อ 1.1 งบ C.1 ก่อน 69', selectedCriteria: ['ข้อ 1.1 งบ C.1 ก่อน 69'], province: 'ALL', office: 'ALL', kpiGrade: 'ALL', search: '', unit: 'ALL', month: 7 };
        updateMonthButtonsUI();
        
        const critEl = document.getElementById('filterCriteria');
        if (critEl) critEl.value = 'ข้อ 1.1 งบ C.1 ก่อน 69';
        const provEl = document.getElementById('filterProvince');
        if (provEl) provEl.value = 'ALL';
        const mEl = document.getElementById('filterMonth');
        if (mEl) mEl.value = 7;
        const s = document.getElementById('searchInput');
        if (s) s.value = '';

        updateOfficeDropdown();
        syncSidebarFilterUI();
        syncChartFilterUI();
        filterData();
        renderAll();
        showToast('รีเซ็ตตัวกรองทั้งหมดเรียบร้อยแล้ว', 'info');
      });
    }

    // Theme Toggle Button
    const themeBtn = document.getElementById('btnThemeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const html = document.documentElement;
        const current = html.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        renderAll();
        showToast(`สลับเป็น ${next === 'light' ? 'โหมดสว่าง (ขาวนวล)' : 'โหมดมืด'}`, 'info');
      });
    }

    // Table Pagination
    const prevBtn = document.getElementById('btnPrevPage');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (state.table.page > 1) {
          state.table.page--;
          renderTable();
        }
      });
    }

    const nextBtn = document.getElementById('btnNextPage');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(state.filteredData.length / state.table.pageSize);
        if (state.table.page < maxPage) {
          state.table.page++;
          renderTable();
        }
      });
    }

    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener('change', (e) => {
        state.table.pageSize = Number(e.target.value) || 15;
        state.table.page = 1;
        renderTable();
      });
    }

    // Table Column Sorting
    document.querySelectorAll('.data-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.getAttribute('data-sort');
        if (state.table.sortCol === col) {
          state.table.sortAsc = !state.table.sortAsc;
        } else {
          state.table.sortCol = col;
          state.table.sortAsc = true;
        }

        document.querySelectorAll('.data-table th').forEach(el => el.classList.remove('sort-active', 'asc'));
        th.classList.add('sort-active');
        if (state.table.sortAsc) th.classList.add('asc');

        sortFilteredData();
        renderTable();
      });
    });



    // Export Buttons
    const exportCsvBtn = document.getElementById('btnExportCsv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportToCsv);
    }

    const printBtn = document.getElementById('btnPrintReport');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }

    // Modal Close
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalBackdrop = document.getElementById('drilldownModal');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', closeModal);
    }
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }

    // File Upload Handler (Excel / CSV)
    const fileInput = document.getElementById('excelFileInput');
    if (fileInput) {
      fileInput.addEventListener('change', handleExcelUpload);
    }

    // Excel Update Modal Actions
    const btnCloseExcel = document.getElementById('btnCloseExcelModal');
    if (btnCloseExcel) {
      btnCloseExcel.addEventListener('click', closeExcelUpdateModal);
    }

    const btnFinishExcel = document.getElementById('btnFinishExcelModal');
    if (btnFinishExcel) {
      btnFinishExcel.addEventListener('click', closeExcelUpdateModal);
    }

    const btnRetryExcel = document.getElementById('btnRetryExcelUpdate');
    if (btnRetryExcel) {
      btnRetryExcel.addEventListener('click', startExcelDataUpdate);
    }

    const btnPickFolder = document.getElementById('btnPickFolder00AI');
    if (btnPickFolder) {
      btnPickFolder.addEventListener('click', handlePickFolder00AI);
    }

    const fallbackFolderInput = document.getElementById('fallbackFolderInput');
    if (fallbackFolderInput) {
      fallbackFolderInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
          await processFilesArray(files);
        }
      });
    }

    const excelUpdateBackdrop = document.getElementById('excelUpdateModal');
    if (excelUpdateBackdrop) {
      excelUpdateBackdrop.addEventListener('click', (e) => {
        if (e.target === excelUpdateBackdrop) closeExcelUpdateModal();
      });
      excelUpdateBackdrop.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      excelUpdateBackdrop.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const files = Array.from(e.dataTransfer.files || []).filter(f => f.name.toLowerCase().endsWith('.xlsx'));
        if (files.length > 0) {
          await processFilesArray(files);
        }
      });
    }

    // Office Percent Bar Chart Controls
    const barCritSel = document.getElementById('barChartCriteriaSelect');
    const barProvSel = document.getElementById('barChartProvinceSelect');
    const barSortSel = document.getElementById('barChartSortSelect');

    if (barCritSel) {
      barCritSel.addEventListener('change', () => {
        officeBarState.criteria = barCritSel.value;
        state.filters.criteria = barCritSel.value;
        const topCrit = document.getElementById('filterCriteria');
        if (topCrit) topCrit.value = barCritSel.value;
        filterData();
        renderAll();
      });
    }
    if (barProvSel) {
      barProvSel.addEventListener('change', () => {
        officeBarState.province = barProvSel.value;
        state.filters.province = barProvSel.value;
        const topProv = document.getElementById('filterProvince');
        if (topProv) topProv.value = barProvSel.value;
        updateOfficeDropdown();
        filterData();
        renderAll();
      });
    }
    if (barSortSel) {
      barSortSel.addEventListener('change', () => {
        officeBarState.sort = barSortSel.value;
        renderOfficePercentBarChart();
      });
    }
  }

  function switchTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.toggle('active', p.id === tabId);
    });

    // Re-render charts on tab switch to ensure proper canvas layout
    setTimeout(() => {
      if (tabId === 'tab-dashboard') renderDashboardCharts();
      if (tabId === 'tab-analytics') renderAnalyticsCharts();
      if (tabId === 'tab-wbs' && window.renderWbsTab) window.renderWbsTab();
      if (tabId === 'tab-data-history' && window.renderDataHistoryTab) window.renderDataHistoryTab();
    }, 50);
  }

  // ==========================================
  // 4. RENDER ALL COMPONENTS
  // ==========================================
  function renderAll() {
    renderKpiCards();
    renderProvincesOverview();
    renderCriteriaCards();
    renderDashboardCharts();
    renderAnalyticsCharts();
    renderTable();
    renderEarlyWarning();
    renderWorkflow();
    renderAiAnalysis();
    syncChartFilterUI();
    if (window.renderWbsTab) window.renderWbsTab();
  }

  // ==========================================
  // 4.1 TOP ACTIVE SELECTION STRIP (แถบแสดงค่าการเลือกด้านบน)
  // ==========================================
  /**
   * หาหน่วยการวัดของเกณฑ์วัดแต่ละข้อ: คืนค่า 'job' (งาน) หรือ 'value' (มูลค่า บาท)
   * อ่านจากหน่วย (unit) ในข้อมูลเดือนที่เลือก และมี fallback ตามชื่อเกณฑ์ (ข้อ 3.x / TECO = งาน)
   */
  function getCriteriaUnitKind(crit) {
    const sampleRow = (state.allData || []).find(d => d.criteria === crit && !d.isSummary);
    const rawUnit = sampleRow ? (sampleRow.unit || '') : '';
    if (rawUnit.includes('งาน')) return 'job';
    if (rawUnit.includes('มูลค่า') || rawUnit.includes('บาท')) return 'value';
    if (/TECO/i.test(crit || '') || /(^|\D)3\.\d/.test(crit || '')) return 'job';
    return 'value';
  }

  function updateTopSelectionDisplay(totalJobs) {
    // 1. Criteria (ประเภทเกณฑ์วัด)
    const crit = state.filters.criteria || 'ข้อ 1.1 งบ C.1 ก่อน 69';
    const isAll = crit === 'ALL' || crit === 'เลือกทั้งหมด' || crit === 'ทุกเกณฑ์วัด';
    const critEl = document.getElementById('topSelCriteriaText');
    if (critEl) {
      critEl.textContent = isAll ? 'เลือกทั้งหมด (ทุกเกณฑ์วัด)' : crit;
    }
    const nCritEl = document.getElementById('next3mSelCriteriaText');
    if (nCritEl) {
      const match = crit.match(/^(ข้อ\s*\d+(\.\d+)?)/);
      nCritEl.textContent = match ? match[1] : (isAll ? 'เลือกทั้งหมด' : crit);
      nCritEl.title = isAll ? 'เลือกทั้งหมด (ทุกเกณฑ์วัด)' : crit;
    }

    // 2. Unit (หน่วยวัด - อยู่ในพื้นหลังเดียวกัน)
    const sampleRow = state.allData.find(d => d.criteria === crit && !d.isSummary);
    const unitLabel = isAll ? 'ภาพรวมทั้งหมด (มูลค่า/งาน)' : (sampleRow ? sampleRow.unit : 'มูลค่า (บาท)');
    const unitEl = document.getElementById('topSelUnitText');
    if (unitEl) unitEl.textContent = `(${unitLabel})`;
    const nUnitEl = document.getElementById('next3mSelUnitText');
    if (nUnitEl) nUnitEl.textContent = `(${unitLabel})`;

    // 3. Month (เดือนประเมิน)
    const mIdx = (typeof state.filters.month === 'number') ? state.filters.month : 7;
    const mName = MONTHS_TH[mIdx] || 'ส.ค.';
    const monthEl = document.getElementById('topSelMonthText');
    if (monthEl) monthEl.textContent = `${mName} 2569`;
    const nMonthEl = document.getElementById('next3mSelMonthText');
    if (nMonthEl) nMonthEl.textContent = `${mName} 2569`;

    // 4. Province / Scope (จังหวัด / สังกัด)
    const prov = state.filters.province || 'ALL';
    const provText = prov === 'ALL' ? 'กฟก.3 (ทั้งหมด)' : (prov.startsWith('จ.') || prov.includes('กอง') ? prov : `จ.${prov}`);
    const provEl = document.getElementById('topSelProvinceText');
    if (provEl) {
      provEl.textContent = prov === 'ALL' ? 'กฟก.3 (ทั้งหมด)' : prov;
    }
    const nProvEl = document.getElementById('next3mSelProvinceText');
    if (nProvEl) {
      nProvEl.textContent = provText;
    }

    // 5. Specific Office (หน่วยงาน / กฟฟ.)
    const off = state.filters.office || 'ALL';
    const offWrap = document.getElementById('topSelOfficeWrapper') || document.getElementById('topSelOfficePill');
    const offEl = document.getElementById('topSelOfficeText');
    if (offWrap && offEl) {
      if (off && off !== 'ALL') {
        offEl.textContent = off;
        offWrap.style.display = 'inline-flex';
      } else {
        offWrap.style.display = 'none';
      }
    }
    const nOffWrap = document.getElementById('next3mSelOfficeWrapper');
    const nOffEl = document.getElementById('next3mSelOfficeText');
    if (nOffWrap && nOffEl) {
      if (off && off !== 'ALL') {
        nOffEl.textContent = off;
        nOffWrap.style.display = 'inline-flex';
      } else {
        nOffWrap.style.display = 'none';
      }
    }

    // 6. Quick Search Keyword (คำค้นหาด่วน)
    const search = (state.filters.search || '').trim();
    const searchWrap = document.getElementById('topSelSearchWrapper') || document.getElementById('topSelSearchPill');
    const searchEl = document.getElementById('topSelSearchText');
    if (searchWrap && searchEl) {
      if (search) {
        searchEl.textContent = `"${search}"`;
        searchWrap.style.display = 'inline-flex';
      } else {
        searchWrap.style.display = 'none';
      }
    }
    const nSearchWrap = document.getElementById('next3mSelSearchWrapper');
    const nSearchEl = document.getElementById('next3mSelSearchText');
    if (nSearchWrap && nSearchEl) {
      if (search) {
        nSearchEl.textContent = `"${search}"`;
        nSearchWrap.style.display = 'inline-flex';
      } else {
        nSearchWrap.style.display = 'none';
      }
    }

    // Update Card 1 badge in sync
    const card1Scope = document.getElementById('kpiCard1ScopeBadge');
    if (card1Scope) {
      if (off && off !== 'ALL') {
        card1Scope.textContent = off;
        card1Scope.classList.add('badge-gold-active');
      } else if (prov && prov !== 'ALL') {
        card1Scope.textContent = prov;
        card1Scope.classList.add('badge-gold-active');
      } else {
        card1Scope.textContent = 'กฟก.3';
        card1Scope.classList.remove('badge-gold-active');
      }
    }
  }

  // ==========================================
  // 5. EXECUTIVE KPI CARDS
  // ==========================================
  function renderKpiCards() {
    // Calculate totals across non-summary rows to avoid double counting
    const rows = state.filteredData.filter(d => !d.isSummary);
    const dataSetToUse = rows.length > 0 ? rows : state.filteredData;

    let totalVal = 0;
    let closedVal = 0;
    let remainVal = 0;
    let totalJobs = 0;
    let closedJobs = 0;
    let remainJobs = 0;
    let kpiSum = 0;
    let kpiCount = 0;

    dataSetToUse.forEach(d => {
      totalVal += d.totalValue;
      closedVal += d.closedValue;
      remainVal += d.remainingValue;
      totalJobs += d.totalJobs;
      closedJobs += d.closedJobs;
      remainJobs += d.remainingJobs;
      if (d.kpiScore > 0) {
        kpiSum += d.kpiScore;
        kpiCount++;
      }
    });

    const pctClosedVal = totalVal > 0 ? (closedVal / totalVal) * 100 : 0;
    const pctClosedJobs = totalJobs > 0 ? (closedJobs / totalJobs) * 100 : 0;
    const pctRemainJobs = totalJobs > 0 ? (remainJobs / totalJobs) * 100 : 0;

    // Check if any filter is actively selected
    const isFilterSelected = state.filters.criteria !== 'ALL' ||
                             state.filters.province !== 'ALL' ||
                             state.filters.office !== 'ALL' ||
                             Boolean(state.filters.search && state.filters.search.trim());

    // Update DOM
    setElemText('kpiTotalVal', formatCurrency(totalVal));
    setElemText('kpiTotalJobsSub', `${formatNumber(totalJobs)} งาน`);

    setElemText('kpiClosedVal', formatCurrency(closedVal));
    setElemText('kpiClosedJobsSub', `ปิดแล้ว ${formatNumber(closedJobs)} งาน (${pctClosedJobs.toFixed(2)}%)`);

    setElemText('kpiRemainVal', formatCurrency(remainVal));
    setElemText('kpiRemainJobsSub', `คงเหลือ ${formatNumber(remainJobs)} งาน`);

    // Update top selection display (แถบแสดงค่าการเลือกด้านบน)
    updateTopSelectionDisplay(totalJobs);

    // Card 4: แสดงทั้ง 2 ค่า (% ปิดงานมูลค่า อยู่ด้านบน, % ปิดงาน อยู่ด้านล่าง พร้อมแถบเหลืองทั้ง 2 อัน)
    setElemText('kpiMainPctClosed', `${pctClosedVal.toFixed(2)}%`);
    setElemText('kpiJobPctClosed', `${pctClosedJobs.toFixed(2)}%`);
    setBarWidth('barMainPctClosed', pctClosedVal);
    setBarWidth('barJobPctClosed', pctClosedJobs);

    // ป้ายเป้าหมาย (อ้างอิงจากไฟล์ 02 KPI เดือน ธ.ค.)
    const decTarget = getDecemberKpiTarget(state.filters.criteria);
    setElemText('kpiCard4TargetBadge', `เป้าหมายเดือน ธ.ค. = ${decTarget}`);
    const elTargetCircle = document.getElementById('kpiTargetCircleBadge');
    if (elTargetCircle) elTargetCircle.title = `เป้าหมายเดือน ธ.ค. = ${decTarget}`;

    setElemText('kpiPctVal', `${pctClosedVal.toFixed(2)}%`);

    setElemText('kpiTotalJobs', formatNumber(totalJobs));
    setElemText('kpiClosedJobs', formatNumber(closedJobs));
    setElemText('kpiRemainJobs', formatNumber(remainJobs));
    setElemText('kpiClosedJobsPct', `(${pctClosedJobs.toFixed(2)}%)`);
    setElemText('kpiRemainJobsPct', `(${pctRemainJobs.toFixed(2)}%)`);

    // Update Progress Bars
    setBarWidth('barValProgress', pctClosedJobs); // Calculated from number of jobs
    setBarWidth('barRemainProgress', pctRemainJobs); // แถบสีแดง: % งานคงเหลือ

    // Card 1: Dual Progress Bar (เขียว=สำเร็จ / แดง=คงเหลือ)
    if (totalJobs > 0) {
      setBarWidth('barDualClosed', pctClosedJobs);
      setBarWidth('barDualRemain', Math.max(0, 100 - pctClosedJobs));
    } else {
      setBarWidth('barDualClosed', 0);
      setBarWidth('barDualRemain', 0);
    }

    const elDualClosed = document.getElementById('barDualClosed');
    if (elDualClosed) {
      elDualClosed.title = `สำเร็จ: ${formatNumber(closedJobs)} งาน (${pctClosedJobs.toFixed(2)}%) | ${formatCurrency(closedVal)}`;
    }
    const elDualRemain = document.getElementById('barDualRemain');
    if (elDualRemain) {
      elDualRemain.title = `คงเหลือ: ${formatNumber(remainJobs)} งาน (${pctRemainJobs.toFixed(2)}%) | ${formatCurrency(remainVal)}`;
    }

    // KPI Card (Card 5) - Calculated based on 02 KPI ปี 2569: Criteria, Month, % Closed AUC
    const kpiBadge = document.getElementById('kpiAvgBadge');
    const kpiUnit = document.getElementById('kpiAvgUnit');

    const isCriteriaSelected = state.filters.criteria && state.filters.criteria !== 'ALL';
    const isZeroData = (totalVal === 0 && totalJobs === 0);

    const isJobBasedCriteria = (crit) => {
      if (!crit || crit === 'ALL') return false;
      const c = crit.replace(/\s+/g, '');
      return c.includes('3.1') || c.includes('3.2') || c.includes('3.3') ||
             c.includes('TECO') || c.includes('4') || c.includes('C02.2');
    };

    if (isZeroData) {
      // ถ้าไม่มีข้อมูล หรือรวมมูลค่า AUC = 0 และ รวมงาน = 0 ให้แสดงค่า KPI เป็น "-"
      setElemText('kpiAvgKpi', '-');
      setElemText('kpiCalcMethodText', 'ระดับการประเมิน');
      if (kpiUnit) kpiUnit.style.display = 'none';
      if (kpiBadge) {
        kpiBadge.className = 'kpi-score-badge kpi-score-neutral';
        kpiBadge.innerHTML = '-';
      }
    } else if (!isCriteriaSelected) {
      // เมื่อเลือก 'เลือกทั้งหมด' (ALL) ให้นำระดับ KPI ของทุกเกณฑ์วัดมาคิดค่าเฉลี่ย
      const avgKpi = kpiCount > 0 ? (kpiSum / kpiCount) : 0;
      const roundedLevel = Math.max(1, Math.min(5, Math.round(avgKpi)));
      setElemText('kpiAvgKpi', avgKpi > 0 ? avgKpi.toFixed(2) : '-');
      setElemText('kpiCalcMethodText', 'ค่าเฉลี่ยทุกเกณฑ์วัด');
      if (kpiUnit) kpiUnit.style.display = avgKpi > 0 ? '' : 'none';
      if (kpiBadge) {
        kpiBadge.className = `kpi-score-badge kpi-score-${roundedLevel}`;
        kpiBadge.innerHTML = `★ เฉลี่ยรวม (ระดับ ${roundedLevel})`;
      }
    } else {
      // หากเลือกเกณฑ์วัดข้อ 3.1 - 3.3 หรือ ข้อ 4 ให้นำ % ปิดงานแล้ว (จากจำนวนงาน) ไปคำนวณ KPI แทน
      const isJobMode = isJobBasedCriteria(state.filters.criteria);
      setElemText('kpiCalcMethodText', isJobMode ? 'ใช้ % ปิดงาน' : 'ใช้ % ปิดงานมูลค่า');

      const pctToEvaluate = isJobMode ? pctClosedJobs : pctClosedVal;
      const evalRes = evaluateKpiScore(state.filters.criteria, state.filters.month, pctToEvaluate);
      if (evalRes && evalRes.score !== '-') {
        setElemText('kpiAvgKpi', evalRes.score);
        if (kpiUnit) kpiUnit.style.display = '';
        if (kpiBadge) {
          kpiBadge.className = `kpi-score-badge kpi-score-${evalRes.level}`;
          kpiBadge.innerHTML = `★ ${evalRes.gradeText}`;
        }
      } else if (evalRes && evalRes.score === '-') {
        setElemText('kpiAvgKpi', '-');
        if (kpiUnit) kpiUnit.style.display = 'none';
        if (kpiBadge) {
          kpiBadge.className = 'kpi-score-badge kpi-score-neutral';
          kpiBadge.innerHTML = evalRes.gradeText || '-';
        }
      } else {
        setElemText('kpiAvgKpi', '-');
        if (kpiUnit) kpiUnit.style.display = 'none';
        if (kpiBadge) {
          kpiBadge.className = 'kpi-score-badge kpi-score-neutral';
          kpiBadge.innerHTML = '-';
        }
      }
    }

    // แถบ % ปิดงาน: ข้อ 1,2,5 หรือทั้งหมด (ALL) วิ่งตาม % ปิดงานมูลค่า AUC / ข้อ 3,4 วิ่งตาม % ปิดจำนวนงาน
    const runJobBar = isCriteriaSelected && isJobBasedCriteria(state.filters.criteria);
    const runValBar = isCriteriaSelected ? !runJobBar : true;
    const valBarEl = document.getElementById('barMainPctClosed');
    const jobBarEl = document.getElementById('barJobPctClosed');
    if (valBarEl) valBarEl.classList.toggle('running', runValBar);
    if (jobBarEl) jobBarEl.classList.toggle('running', runJobBar);

    // ไฮไลต์ระดับ KPI (1-5) ในการ์ดแบบตั้ง
    const kpiLevelNow = parseInt((document.getElementById('kpiAvgKpi') || {}).textContent, 10);
    const kpiLevelCard = document.getElementById('kpiLevelCard');
    if (kpiLevelCard) {
      kpiLevelCard.dataset.level = (kpiLevelNow >= 1 && kpiLevelNow <= 5) ? String(kpiLevelNow) : '0';
      kpiLevelCard.querySelectorAll('.kpi-level-step').forEach(step => {
        step.classList.toggle('active', Number(step.dataset.level) === kpiLevelNow);
      });
    }

    // วาดกราฟวงกลมโดนัท AUC (ปิดแล้ว vs คงเหลือ) กะทัดรัด ประหยัดเนื้อที่
    renderExecutiveDonutChart(closedVal, remainVal, totalVal, closedJobs, remainJobs, totalJobs);

    // แผนเป้าหมายปิดงานเพิ่ม 3 เดือนถัดไป (ก.ย. - พ.ย. 69)
    renderNext3MonthsProjection();
  }

  // =========================================================================
  // 5.1.1 EXECUTIVE DONUT CHART: Closed vs Remaining AUC (Compact & Luminous)
  // =========================================================================
  let lastExecDonutData = { closedVal: 0, remainVal: 0, totalVal: 0, closedJobs: 0, remainJobs: 0, totalJobs: 0 };

  function renderExecutiveDonutChart(closedVal, remainVal, totalVal, closedJobs, remainJobs, totalJobs) {
    if (arguments.length >= 3) {
      lastExecDonutData = { closedVal, remainVal, totalVal, closedJobs, remainJobs, totalJobs };
    } else {
      ({ closedVal, remainVal, totalVal, closedJobs, remainJobs, totalJobs } = lastExecDonutData);
    }

    const canvas = document.getElementById('executiveDonutChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssSize = 104;

    if (canvas.width !== Math.round(cssSize * dpr) || canvas.height !== Math.round(cssSize * dpr)) {
      canvas.width = Math.round(cssSize * dpr);
      canvas.height = Math.round(cssSize * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssSize, cssSize);

    const cx = cssSize / 2;
    const cy = cssSize / 2;
    const outerR = 49;
    const innerR = 36;
    const lineWidth = outerR - innerR; // 13px
    const radius = (outerR + innerR) / 2;

    const isJobCrit = state.filters.criteria && (
      state.filters.criteria.includes('3.1') || state.filters.criteria.includes('3.2') ||
      state.filters.criteria.includes('3.3') || state.filters.criteria.includes('TECO') ||
      state.filters.criteria.includes('4')
    );

    let closedRatio = 0;
    let remainRatio = 0;

    if (isJobCrit && totalJobs > 0) {
      closedRatio = closedJobs / totalJobs;
      remainRatio = remainJobs / totalJobs;
    } else if (totalVal > 0) {
      closedRatio = closedVal / totalVal;
      remainRatio = remainVal / totalVal;
    }

    // Clamp between 0 and 1
    closedRatio = Math.max(0, Math.min(1, closedRatio));
    remainRatio = Math.max(0, Math.min(1, remainRatio));

    // Update ratio text badges
    const elClosedRatio = document.getElementById('donutClosedValRatio');
    const elRemainRatio = document.getElementById('donutRemainValRatio');
    if (elClosedRatio) elClosedRatio.textContent = (closedRatio * 100).toFixed(1) + '%';
    if (elRemainRatio) elRemainRatio.textContent = (remainRatio * 100).toFixed(1) + '%';

    // Track circle background
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    if (closedRatio <= 0 && remainRatio <= 0) {
      ctx.restore();
      return;
    }

    if (closedRatio >= 0.999) {
      const grad = ctx.createLinearGradient(0, 0, cssSize, cssSize);
      grad.addColorStop(0, '#34D399');
      grad.addColorStop(1, '#059669');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = 'rgba(16, 185, 129, 0.4)';
      ctx.shadowBlur = 8;
      ctx.stroke();
    } else if (remainRatio >= 0.999) {
      const grad = ctx.createLinearGradient(0, 0, cssSize, cssSize);
      grad.addColorStop(0, '#F87171');
      grad.addColorStop(1, '#DC2626');
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
      ctx.shadowBlur = 8;
      ctx.stroke();
    } else {
      const gap = 0.08; // gap in radians (~4.5 deg)
      const availableAngle = Math.PI * 2 - (gap * 2);
      const closedSweep = Math.max(0.06, closedRatio * availableAngle);
      const remainSweep = Math.max(0.06, remainRatio * availableAngle);

      // กราฟสีเขียว (ปิดแล้ว) อยู่ด้านบน: กึ่งกลางที่ -Math.PI / 2
      const closedStart = (-Math.PI / 2) - (closedSweep / 2);
      const closedEnd = (-Math.PI / 2) + (closedSweep / 2);

      const gradClosed = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy);
      gradClosed.addColorStop(0, '#10B981');
      gradClosed.addColorStop(1, '#059669');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, closedStart, closedEnd);
      ctx.strokeStyle = gradClosed;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(16, 185, 129, 0.45)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();

      // กราฟสีแดง (คงเหลือ) ปรับอยู่ด้านล่าง: กึ่งกลางที่ +Math.PI / 2
      const remainStart = (Math.PI / 2) - (remainSweep / 2);
      const remainEnd = (Math.PI / 2) + (remainSweep / 2);

      const gradRemain = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy + radius);
      gradRemain.addColorStop(0, '#EF4444');
      gradRemain.addColorStop(1, '#B91C1C');

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, radius, remainStart, remainEnd);
      ctx.strokeStyle = gradRemain;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(239, 68, 68, 0.45)';
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    }

    // Inner subtle gold border
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 184, 28, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Outer subtle border
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
  window.renderExecutiveDonutChart = renderExecutiveDonutChart;
  window.addEventListener('resize', () => {
    if (typeof renderExecutiveDonutChart === 'function') {
      renderExecutiveDonutChart();
    }
  });

  // =========================================================================
  // 5.2 แผนเป้าหมายปิดงานเพิ่ม 3 เดือนถัดไป (ก.ย. - พ.ย. 69)
  // - เกณฑ์ 1, 2, 5 (มูลค่า): (รวมมูลค่า AUC * % ระดับ 5) - ปิดมูลค่าล่าสุด + 5% ของคงเหลือมูลค่า AUC
  // - เกณฑ์ 3, 4 (จำนวนงาน): (รวมงาน AUC * % ระดับ 5) - ปิดงานล่าสุด + 5% ของคงเหลืองาน AUC
  // =========================================================================

  let isNext3mCardsExpanded = false;
  window.toggleNext3mCards = function () {
    const container = document.getElementById('next3mCardsContainer');
    const toggleText = document.getElementById('next3mCardsToggleText');
    if (!container) return;
    isNext3mCardsExpanded = !isNext3mCardsExpanded;
    container.style.display = isNext3mCardsExpanded ? '' : 'none';
    if (toggleText) {
      toggleText.textContent = isNext3mCardsExpanded ? 'ซ่อนการ์ดเป้าหมาย' : 'แสดงการ์ดเป้าหมาย';
    }
  };

  let isNext3mTableExpanded = false;
  window.toggleNext3mTable = function () {
    const wrapper = document.getElementById('next3mTableWrapper');
    const toggleText = document.getElementById('next3mTableToggleText');
    if (!wrapper) return;
    isNext3mTableExpanded = !isNext3mTableExpanded;
    wrapper.style.display = isNext3mTableExpanded ? 'block' : 'none';
    if (toggleText) {
      toggleText.textContent = isNext3mTableExpanded ? 'ซ่อนตารางเจาะลึก' : 'แสดงตารางเจาะลึก';
    }
  };

  let isNext3mMonthlyBarsVisible = false;
  window.toggleNext3mMonthlyBars = function () {
    const list = document.getElementById('next3mMonthlyBarsList');
    const hint = document.getElementById('singleBarClickHint');
    if (!list) return;
    isNext3mMonthlyBarsVisible = !isNext3mMonthlyBarsVisible;
    list.style.display = isNext3mMonthlyBarsVisible ? 'flex' : 'none';
    if (hint) {
      hint.textContent = isNext3mMonthlyBarsVisible ? '▲ ซ่อนรายละเอียดรายเดือน' : '▼ คลิกเพื่อดูรายละเอียดรายเดือน';
    }
  };

  function renderNext3MonthsProjection() {
    const container = document.getElementById('next3mCardsContainer');
    const tableBody = document.getElementById('next3mTableBody');
    const tableFoot = document.getElementById('next3mTableFoot');
    if (!container) return;

    // Sync cards visibility state
    container.style.display = isNext3mCardsExpanded ? '' : 'none';
    const cardsToggleText = document.getElementById('next3mCardsToggleText');
    if (cardsToggleText) {
      cardsToggleText.textContent = isNext3mCardsExpanded ? 'ซ่อนการ์ดเป้าหมาย' : 'แสดงการ์ดเป้าหมาย';
    }

    // 1. Identify base month (from user active filter or latest available month)
    let latestMonthIdx = 7;
    for (let m = 11; m >= 0; m--) {
      if (typeof hasReportForMonth === 'function' && hasReportForMonth(m)) {
        latestMonthIdx = m;
        break;
      }
    }
    const baseMonthIdx = (typeof state.filters.month === 'number') ? state.filters.month : latestMonthIdx;
    const baseMonthName = MONTHS_TH[baseMonthIdx] || 'ส.ค.';

    // Define upcoming months (เพิ่มเดือน ธ.ค. รวม 4 เดือน: ก.ย., ต.ค., พ.ย., ธ.ค.)
    const nextMonths = [];
    let maxOffsets = 4;
    if (baseMonthIdx >= 8 && baseMonthIdx < 11) {
      maxOffsets = 11 - baseMonthIdx;
    } else if (baseMonthIdx === 11) {
      maxOffsets = 1;
    }

    for (let offset = 1; offset <= maxOffsets; offset++) {
      const targetMIdx = (baseMonthIdx + offset) % 12;
      const targetMNum = targetMIdx + 1; // 1-indexed for KPI_MATRIX
      nextMonths.push({
        offset: offset,
        monthIdx: targetMIdx,
        monthNum: targetMNum,
        shortName: MONTHS_TH[targetMIdx] || `เดือน ${targetMNum}`,
        fullName: (typeof MONTHS_FULL_TH !== 'undefined' && MONTHS_FULL_TH[targetMIdx]) ? `${MONTHS_FULL_TH[targetMIdx]} 2569` : `เดือน ${targetMNum}`
      });
    }

    // Update section badges and headers
    const badgeEl = document.getElementById('next3mBaseMonthBadge');
    if (badgeEl) badgeEl.textContent = `ฐานข้อมูล: ${baseMonthName} 69`;

    const titleEl = document.getElementById('next3mSectionTitle');
    if (titleEl && nextMonths.length > 0) {
      const endMonthName = nextMonths[nextMonths.length - 1].shortName;
      titleEl.textContent = `เป้าหมายที่ต้องปิดงานเพิ่ม (${nextMonths[0].shortName} - ${endMonthName} 2569)`;
    }

    const th1 = document.getElementById('thNext3mMonth1');
    const th2 = document.getElementById('thNext3mMonth2');
    const th3 = document.getElementById('thNext3mMonth3');
    const th4 = document.getElementById('thNext3mMonth4');
    const ths = [th1, th2, th3, th4];
    ths.forEach((thEl, i) => {
      if (!thEl) return;
      if (nextMonths[i]) {
        thEl.style.display = '';
        thEl.textContent = `${nextMonths[i].shortName} 69 (ต้องปิดเพิ่ม)`;
      } else {
        thEl.style.display = 'none';
      }
    });

    const thTotBase = document.getElementById('thNext3mTotBase');
    const thClosedBase = document.getElementById('thNext3mClosedBase');
    const thRemainBase = document.getElementById('thNext3mRemainBase');
    if (thTotBase) thTotBase.textContent = `รวมทั้งสิ้น (${baseMonthName})`;
    if (thClosedBase) thClosedBase.textContent = `ปิดแล้ว (${baseMonthName})`;
    if (thRemainBase) thRemainBase.textContent = `คงเหลือ (${baseMonthName})`;

    // 2. Reference records according to active filters (ตามแถวที่เลือกตัวกรอง)
    const { province, office, criteria, selectedCriteria } = state.filters || {};
    const hasMultiCrit = Array.isArray(selectedCriteria) && selectedCriteria.length > 1;

    // Use filtered records directly from state.filteredData
    // Exclude summary rows if office is 'ALL' to avoid double-counting, but preserve if user selected a summary row
    const nonSummaryRows = (state.filteredData || []).filter(d => !d.isSummary && d.office !== 'กฟก.3 ผลรวม');
    const filteredRecords = nonSummaryRows.length > 0 ? nonSummaryRows : (state.filteredData || []);

    // 3. Dynamic TECO Criteria Identification & Master Criteria Definitions
    const activeTecoRecord = (state.allData || []).find(d => d.criteria && (d.criteria.includes('TECO') || d.criteria.includes('3.')));
    const activeTecoName = activeTecoRecord ? activeTecoRecord.criteria : 'ข้อ 3 TECO D2';

    const MASTER_CRITERIA = [
      { name: 'ข้อ 1.1 งบ C.1 ก่อน 69', category: 1, type: 'val', label: 'เกณฑ์ 1.1 (มูลค่า)', matcher: (c) => matchCriteriaName('1.1', c) },
      { name: 'ข้อ 1.2 งบ I , P ก่อนปี 68', category: 1, type: 'val', label: 'เกณฑ์ 1.2 (มูลค่า)', matcher: (c) => matchCriteriaName('1.2', c) },
      { name: 'ข้อ 1.3 งบ I , P ก่อนปี 69', category: 1, type: 'val', label: 'เกณฑ์ 1.3 (มูลค่า)', matcher: (c) => matchCriteriaName('1.3', c) },
      { name: 'ข้อ 2.1 งบ C.1 ปี 69', category: 2, type: 'val', label: 'เกณฑ์ 2.1 (มูลค่า)', matcher: (c) => matchCriteriaName('2.1', c) },
      { name: 'ข้อ 2.2 งบ I , P ปี 69', category: 2, type: 'val', label: 'เกณฑ์ 2.2 (มูลค่า)', matcher: (c) => matchCriteriaName('2.2', c) },
      { name: activeTecoName, category: 3, type: 'job', label: 'เกณฑ์ 3 TECO D2 (งาน)', matcher: (c) => c && (c.includes('TECO') || c.includes('3.')) },
      { name: 'ข้อ 4 งบ C02.2 ปี 69', category: 4, type: 'job', label: 'เกณฑ์ 4 (งาน)', matcher: (c) => matchCriteriaName('4', c) || (c && c.includes('C02')) },
      { name: 'ข้อ5 งานบ้านและที่ดินจัดสรร', category: 5, type: 'val', label: 'เกณฑ์ 5 (มูลค่า)', matcher: (c) => matchCriteriaName('5', c) || (c && c.includes('บ้าน')) }
    ];

    function getLevel5TargetRatio(critDef, mNum) {
      if (!window.KPI_MATRIX || !Array.isArray(window.KPI_MATRIX)) return null;

      // Special handling for TECO D2 (Category 3):
      // In KPI_MATRIX, TECO D2 has entries 3.1 (m1-5), 3.2 (m6-8), 3.3 (m9-12).
      // Find the active TECO row in target month mNum.
      if (critDef.category === 3 || (critDef.name && (critDef.name.includes('TECO') || critDef.name.includes('3.')))) {
        const tecoRow = window.KPI_MATRIX.find(r => r.monthNum === mNum && (r.criteria.includes('TECO') || r.criteria.includes('3.')) && r.level5 && r.level5 !== '-');
        if (tecoRow) {
          const num = parseFloat(tecoRow.level5.replace('%', '').trim());
          return isNaN(num) ? null : (num / 100);
        }
      }

      // Special handling for ข้อ 4 (Category 4):
      if (critDef.category === 4 || (critDef.name && (critDef.name.includes('C02') || critDef.name.includes('ข้อ 4') || critDef.name.includes('ข้อ4')))) {
        const c02Row = window.KPI_MATRIX.find(r => r.monthNum === mNum && (r.criteria.includes('C02') || r.criteria.includes('ข้อ 4') || r.criteria.includes('ข้อ4')) && r.level5 && r.level5 !== '-');
        if (c02Row) {
          const num = parseFloat(c02Row.level5.replace('%', '').trim());
          return isNaN(num) ? null : (num / 100);
        }
      }

      const row = window.KPI_MATRIX.find(r => r.monthNum === mNum && (critDef.matcher ? critDef.matcher(r.criteria) : matchCriteriaName(critDef.name, r.criteria)));
      if (!row || !row.level5 || row.level5 === '-') return null;
      const num = parseFloat(row.level5.replace('%', '').trim());
      return isNaN(num) ? null : (num / 100);
    }

    const criteriaResults = [];
    let grandTotValCat125 = 0;
    let grandClosedValCat125 = 0;
    let grandRemainValCat125 = 0;
    let grandTotJobsCat34 = 0;
    let grandClosedJobsCat34 = 0;
    let grandRemainJobsCat34 = 0;

    MASTER_CRITERIA.forEach((critDef, idx) => {
      const matched = filteredRecords.filter(d => critDef.matcher ? critDef.matcher(d.criteria) : matchCriteriaName(critDef.name, d.criteria));

      let totalVal = 0;
      let closedVal = 0;
      let remainVal = 0;
      let totalJobs = 0;
      let closedJobs = 0;
      let remainJobs = 0;

      matched.forEach(d => {
        totalVal += (Number(d.totalValue) || 0);
        closedVal += (Number(d.closedValue) || 0);
        remainVal += (Number(d.remainingValue) !== undefined && !isNaN(Number(d.remainingValue)) ? Number(d.remainingValue) : Math.max(0, (Number(d.totalValue) || 0) - (Number(d.closedValue) || 0)));
        totalJobs += (Number(d.totalJobs) || 0);
        closedJobs += (Number(d.closedJobs) || 0);
        remainJobs += (Number(d.remainingJobs) !== undefined && !isNaN(Number(d.remainingJobs)) ? Number(d.remainingJobs) : Math.max(0, (Number(d.totalJobs) || 0) - (Number(d.closedJobs) || 0)));
      });

      if (remainVal === 0 && totalVal > closedVal) {
        remainVal = Math.max(0, totalVal - closedVal);
      }
      if (remainJobs === 0 && totalJobs > closedJobs) {
        remainJobs = Math.max(0, totalJobs - closedJobs);
      }

      const isFilteredOut = (criteria && criteria !== 'ALL' && !(critDef.matcher ? critDef.matcher(criteria) : matchCriteriaName(criteria, critDef.name))) ||
                            (hasMultiCrit && !selectedCriteria.some(c => (critDef.matcher ? critDef.matcher(c) : matchCriteriaName(c, critDef.name))));

      if (!isFilteredOut) {
        if (critDef.type === 'val') {
          grandTotValCat125 += totalVal;
          grandClosedValCat125 += closedVal;
          grandRemainValCat125 += remainVal;
        } else {
          grandTotJobsCat34 += totalJobs;
          grandClosedJobsCat34 += closedJobs;
          grandRemainJobsCat34 += remainJobs;
        }
      }

      // Calculations for each of the 3 upcoming months
      // Formula เกณฑ์มูลค่า: (รวมมูลค่า AUC × % ระดับ 5) − ปิดมูลค่าล่าสุด + (5% ของคงเหลือมูลค่า AUC)
      // Formula เกณฑ์งาน (ข้อ 3, 4): (รวมงาน AUC × % ระดับ 5) − ปิดงานล่าสุด + (5% ของคงเหลืองาน AUC)
      const monthsCalc = nextMonths.map(nm => {
        const targetRatio = getLevel5TargetRatio(critDef, nm.monthNum);
        if (targetRatio === null) {
          return { targetRatio: null, targetPctStr: '-', reqAmount: null, isAchieved: false };
        }

        const targetPctStr = `${(targetRatio * 100).toFixed(0)}%`;
        if (critDef.type === 'val') {
          const req = (totalVal * targetRatio) - closedVal + (0.05 * remainVal);
          const positiveReq = Math.max(0, req);
          const isAchieved = req <= 0 && totalVal > 0;
          return {
            targetRatio,
            targetPctStr,
            reqAmount: positiveReq,
            rawReq: req,
            isAchieved
          };
        } else {
          const req = (totalJobs * targetRatio) - closedJobs + (0.05 * remainJobs);
          const positiveReq = Math.max(0, Math.ceil(req));
          const isAchieved = req <= 0 && totalJobs > 0;
          return {
            targetRatio,
            targetPctStr,
            reqAmount: positiveReq,
            rawReq: req,
            isAchieved
          };
        }
      });

      criteriaResults.push({
        critDef,
        idx: idx + 1,
        totalVal,
        closedVal,
        remainVal,
        totalJobs,
        closedJobs,
        remainJobs,
        monthsCalc,
        isFilteredOut
      });
    });

    // 4. Summaries for Month 1, Month 2, Month 3 Cards
    const monthSummaries = nextMonths.map((nm, mIdx) => {
      let sumReqValCat125 = 0;
      let sumReqJobsCat34 = 0;
      let hasValTarget = false;
      let hasJobTarget = false;

      let totalValBaseCat125 = 0;
      let closedValBaseCat125 = 0;
      let remainValBaseCat125 = 0;
      let fivePctRemainValCat125 = 0;
      let targetValL5Cat125 = 0;
      const activeValTargetPctStrs = [];

      let totalJobsBaseCat34 = 0;
      let closedJobsBaseCat34 = 0;
      let remainJobsBaseCat34 = 0;
      let fivePctRemainJobsCat34 = 0;
      let targetJobsL5Cat34 = 0;
      const activeJobTargetPctStrs = [];

      criteriaResults.forEach(cr => {
        if (cr.isFilteredOut) return;
        const mc = cr.monthsCalc[mIdx];
        if (cr.critDef.type === 'val') {
          if (mc.targetRatio !== null && mc.targetRatio > 0) {
            hasValTarget = true;
            if (mc.targetPctStr && mc.targetPctStr !== '-' && mc.targetPctStr !== '0%' && !activeValTargetPctStrs.includes(mc.targetPctStr)) {
              activeValTargetPctStrs.push(mc.targetPctStr);
            }
          }
          if (mc.reqAmount !== null) {
            sumReqValCat125 += mc.reqAmount;
            if (mc.targetRatio !== null) {
              totalValBaseCat125 += cr.totalVal;
              closedValBaseCat125 += cr.closedVal;
              remainValBaseCat125 += cr.remainVal;
              fivePctRemainValCat125 += (0.05 * cr.remainVal);
              targetValL5Cat125 += (cr.totalVal * mc.targetRatio);
            }
          }
        } else {
          if (mc.targetRatio !== null && mc.targetRatio > 0) {
            hasJobTarget = true;
            if (mc.targetPctStr && mc.targetPctStr !== '-' && mc.targetPctStr !== '0%' && !activeJobTargetPctStrs.includes(mc.targetPctStr)) {
              activeJobTargetPctStrs.push(mc.targetPctStr);
            }
          }
          if (mc.reqAmount !== null) {
            sumReqJobsCat34 += mc.reqAmount;
            if (mc.targetRatio !== null) {
              totalJobsBaseCat34 += cr.totalJobs;
              closedJobsBaseCat34 += cr.closedJobs;
              remainJobsBaseCat34 += cr.remainJobs;
              fivePctRemainJobsCat34 += (0.05 * cr.remainJobs);
              targetJobsL5Cat34 += (cr.totalJobs * mc.targetRatio);
            }
          }
        }
      });

      // Compute display string for Value Level 5 Target %
      let valTargetPctDisplay = '-';
      if (activeValTargetPctStrs.length === 1) {
        valTargetPctDisplay = activeValTargetPctStrs[0];
      } else if (activeValTargetPctStrs.length > 1) {
        if (totalValBaseCat125 > 0) {
          const wPct = (targetValL5Cat125 / totalValBaseCat125) * 100;
          valTargetPctDisplay = `~${(wPct % 1 === 0 ? wPct.toFixed(0) : wPct.toFixed(1))}%`;
        } else {
          valTargetPctDisplay = activeValTargetPctStrs.join(', ');
        }
      }
      if (valTargetPctDisplay === '-' || valTargetPctDisplay === '0%' || valTargetPctDisplay === '0.00%') {
        hasValTarget = false;
      }

      // Compute display string for Job Level 5 Target %
      let jobTargetPctDisplay = '-';
      if (activeJobTargetPctStrs.length === 1) {
        jobTargetPctDisplay = activeJobTargetPctStrs[0];
      } else if (activeJobTargetPctStrs.length > 1) {
        if (totalJobsBaseCat34 > 0) {
          const wPct = (targetJobsL5Cat34 / totalJobsBaseCat34) * 100;
          jobTargetPctDisplay = `~${(wPct % 1 === 0 ? wPct.toFixed(0) : wPct.toFixed(1))}%`;
        } else {
          jobTargetPctDisplay = activeJobTargetPctStrs.join(', ');
        }
      }
      if (jobTargetPctDisplay === '-' || jobTargetPctDisplay === '0%' || jobTargetPctDisplay === '0.00%') {
        hasJobTarget = false;
      }

      return {
        monthInfo: nm,
        sumReqValCat125,
        sumReqJobsCat34,
        totalValBaseCat125,
        closedValBaseCat125,
        remainValBaseCat125,
        fivePctRemainValCat125,
        targetValL5Cat125,
        totalJobsBaseCat34,
        closedJobsBaseCat34,
        remainJobsBaseCat34,
        fivePctRemainJobsCat34,
        targetJobsL5Cat34,
        hasValTarget,
        hasJobTarget,
        valTargetPctDisplay,
        jobTargetPctDisplay,
        baseTotVal: grandTotValCat125,
        baseTotJobs: grandTotJobsCat34
      };
    });

    // Check if user specifically filtered a Criteria
    const isSingleCritFiltered = criteria && criteria !== 'ALL';
    let singleCritDef = isSingleCritFiltered ? MASTER_CRITERIA.find(c => (c.matcher ? c.matcher(criteria) : matchCriteriaName(criteria, c.name))) : null;
    if (!singleCritDef && isSingleCritFiltered) {
      const isJobUnit = criteria.includes('3.') || criteria.includes('4') || criteria.includes('C02.2') || criteria.includes('TECO') || criteria.includes('teco');
      singleCritDef = {
        name: criteria,
        category: isJobUnit ? 3 : 1,
        type: isJobUnit ? 'job' : 'val',
        label: isJobUnit ? 'เกณฑ์งาน' : 'เกณฑ์มูลค่า'
      };
    }

    let hasValInSelection = true;
    let hasJobInSelection = true;
    if (singleCritDef) {
      hasValInSelection = singleCritDef.type === 'val';
      hasJobInSelection = singleCritDef.type === 'job';
    } else if (hasMultiCrit) {
      const selectedTypes = selectedCriteria.map(c => {
        const found = MASTER_CRITERIA.find(m => (m.matcher ? m.matcher(c) : matchCriteriaName(c, m.name)));
        if (found) return found.type;
        return (c.includes('3.') || c.includes('4') || c.includes('TECO') || c.includes('teco')) ? 'job' : 'val';
      });
      hasValInSelection = selectedTypes.includes('val');
      hasJobInSelection = selectedTypes.includes('job');
    }

    // Check if the filtered scope has no work and no value for the active selection
    const isValNoWork = hasValInSelection && grandTotValCat125 === 0;
    const isJobNoWork = hasJobInSelection && grandTotJobsCat34 === 0;
    const isSelectionNoWork = (hasValInSelection && !hasJobInSelection && isValNoWork) ||
                             (!hasValInSelection && hasJobInSelection && isJobNoWork) ||
                             (hasValInSelection && hasJobInSelection && isValNoWork && isJobNoWork);

    const noWorkBadge = document.getElementById('next3mSelNoWorkBadge');
    if (noWorkBadge) {
      noWorkBadge.style.display = isSelectionNoWork ? 'inline-flex' : 'none';
    }

    // Save simulation calculation result to window for consumption by WBS tab
    window.next3mSimulationData = {
      monthSummaries,
      criteriaResults,
      singleCritDef,
      hasValInSelection,
      hasJobInSelection,
      baseMonthName,
      nextMonths,
      criteria: state.filters.criteria,
      province: state.filters.province,
      office: state.filters.office
    };

    // 5. Render Month Target Cards (รวม ธ.ค.)
    container.innerHTML = monthSummaries.map((ms, idx) => {
      const nm = ms.monthInfo;
      const cardClass = `month-${idx + 1}`;
      const stepText = (nm.shortName === 'ธ.ค.' || (idx === monthSummaries.length - 1 && nm.monthIdx === 11))
        ? `เดือนถัดไปที่ ${idx + 1} (สิ้นปี 69)`
        : `เดือนถัดไปที่ ${idx + 1}`;

      const valMillions = (ms.sumReqValCat125 / 1e6).toFixed(2);
      const valFormatted = formatCurrency(ms.sumReqValCat125);
      const jobsFormatted = formatNumber(ms.sumReqJobsCat34);

      let valBlockHtml = '';
      if (hasValInSelection) {
        const isThisValNoKpi = !ms.hasValTarget || !ms.valTargetPctDisplay || ms.valTargetPctDisplay === '-' || ms.valTargetPctDisplay === '0%' || ms.valTargetPctDisplay === '0.00%';
        const isThisValNoWork = !isThisValNoKpi && (ms.baseTotVal === 0);
        const isValAchieved = !isThisValNoKpi && !isThisValNoWork && ms.sumReqValCat125 === 0;

        let valMainText = '';
        let valValClass = 'gold';

        if (isThisValNoKpi) {
          valMainText = 'ไม่มีเกณฑ์ประเมินในเดือนนี้';
          valValClass = 'dim';
        } else if (isThisValNoWork) {
          valMainText = '(ไม่มีงานและมูลค่า AUC)';
          valValClass = 'no-work';
        } else if (isValAchieved) {
          valMainText = '0.00 ฿ (⭐ ครบเกณฑ์ระดับ 5 🎉)';
          valValClass = 'achieved';
        } else {
          valMainText = `${valMillions} ล้านบาท`;
          valValClass = 'gold';
        }

        const targetChipHtml = isThisValNoKpi
          ? `<span class="formula-chip no-kpi" style="background:rgba(167, 139, 250, 0.15); color:#C4B5FD; border:1px solid rgba(167, 139, 250, 0.35);">ไม่มีเกณฑ์ประเมินในเดือนนี้</span>`
          : isThisValNoWork
            ? `<span class="formula-chip" style="background:rgba(148, 163, 184, 0.15); color:#94A3B8; border:1px solid rgba(148, 163, 184, 0.35);">ไม่มีงาน AUC</span>`
            : `<span class="formula-chip gold" title="เป้าหมายระดับ 5 (${ms.valTargetPctDisplay}) + 5% ของคงเหลือมูลค่า AUC">
                เป้า ${ms.valTargetPctDisplay} (+5%)
              </span>`;

        const subTextHtml = isThisValNoKpi
          ? `<span>(ไม่มีเกณฑ์ประเมินในเดือนนี้)${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ''}</span>`
          : isThisValNoWork
            ? `<span>(มูลค่า AUC = 0.00 ฿)${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ''}</span>`
            : `<span>(${valFormatted})${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ''}</span>`;

        const valCalcBoxHtml = (isThisValNoKpi || isThisValNoWork) ? '' : `
          <div class="next3m-calc-source">
            <div class="next3m-source-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--pea-gold-400);">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>ที่มาของค่าที่ใช้คำนวณ:</span>
            </div>
            <div class="next3m-source-grid">
              <div class="source-item" title="รวมมูลค่า AUC ทั้งสิ้น = ${formatCurrency(ms.totalValBaseCat125)}">
                <span class="s-label">รวม AUC:</span>
                <span class="s-val">${formatCurrencyShort(ms.totalValBaseCat125)}</span>
              </div>
              <div class="source-item" title="เป้าหมาย ${ms.valTargetPctDisplay} = ${formatCurrency(ms.targetValL5Cat125)}">
                <span class="s-label">เป้า ${ms.valTargetPctDisplay}:</span>
                <span class="s-val gold">${formatCurrencyShort(ms.targetValL5Cat125)}</span>
              </div>
              <div class="source-item" title="ปิดมูลค่าล่าสุดแล้ว = ${formatCurrency(ms.closedValBaseCat125)}">
                <span class="s-label">ปิดแล้ว:</span>
                <span class="s-val green">${formatCurrencyShort(ms.closedValBaseCat125)}</span>
              </div>
              <div class="source-item" title="คงเหลือมูลค่า AUC = ${formatCurrency(ms.remainValBaseCat125)}">
                <span class="s-label">คงเหลือ:</span>
                <span class="s-val red">${formatCurrencyShort(ms.remainValBaseCat125)}</span>
              </div>
              <div class="source-item span-full highlight" title="5% ของคงเหลือมูลค่า AUC = ${formatCurrency(ms.fivePctRemainValCat125)}">
                <span class="s-label">+5% ของคงเหลือ:</span>
                <span class="s-val gold">+${formatCurrencyShort(ms.fivePctRemainValCat125)}</span>
              </div>
            </div>
            <div class="next3m-source-equation" title="แทนค่าสูตรละเอียด: (${formatCurrency(ms.targetValL5Cat125)} − ${formatCurrency(ms.closedValBaseCat125)}) + ${formatCurrency(ms.fivePctRemainValCat125)} = ${formatCurrency(ms.sumReqValCat125)}">
              <span class="eq-icon">📐</span>
              <span class="eq-text">
                แทนค่า: (${formatCurrencyShort(ms.targetValL5Cat125)} − ${formatCurrencyShort(ms.closedValBaseCat125)}) + ${formatCurrencyShort(ms.fivePctRemainValCat125)} = <strong>${isValAchieved ? '0.00 ฿ (⭐ ครบเกณฑ์ระดับ 5)' : `${valMillions} ลบ.`}</strong>
              </span>
            </div>
          </div>
        `;

        valBlockHtml = `
          <div class="next3m-metric-box metric-value ${isThisValNoWork ? 'is-no-work' : ''}">
            <div class="next3m-metric-label">
              <span>💰 ต้องปิดมูลค่าเพิ่ม (${singleCritDef ? (singleCritDef.label || 'เกณฑ์ที่เลือก') : 'เกณฑ์ 1, 2, 5'})</span>
              ${targetChipHtml}
            </div>
            <div class="next3m-metric-val ${valValClass}" style="${isThisValNoWork ? 'font-size:1.02rem; color:#FCA5A5; font-weight:600; line-height:1.4;' : ''}">
              ${valMainText}
            </div>
            <div class="next3m-metric-sub">
              ${subTextHtml}
            </div>
            ${valCalcBoxHtml}
          </div>
        `;
      }

      let jobBlockHtml = '';
      if (hasJobInSelection) {
        const isThisJobNoKpi = !ms.hasJobTarget || !ms.jobTargetPctDisplay || ms.jobTargetPctDisplay === '-' || ms.jobTargetPctDisplay === '0%' || ms.jobTargetPctDisplay === '0.00%';
        const isThisJobNoWork = !isThisJobNoKpi && (ms.baseTotJobs === 0);
        const isJobAchieved = !isThisJobNoKpi && !isThisJobNoWork && ms.sumReqJobsCat34 === 0;

        let jobMainText = '';
        let jobValClass = 'pink';

        if (isThisJobNoKpi) {
          jobMainText = 'ไม่มีเกณฑ์ประเมินในเดือนนี้';
          jobValClass = 'dim';
        } else if (isThisJobNoWork) {
          jobMainText = '(ไม่มีงานและมูลค่า AUC)';
          jobValClass = 'no-work';
        } else if (isJobAchieved) {
          jobMainText = '0 งาน (⭐ ครบเกณฑ์ระดับ 5 🎉)';
          jobValClass = 'achieved';
        } else {
          jobMainText = `${jobsFormatted} งาน`;
          jobValClass = 'pink';
        }

        const targetChipHtml = isThisJobNoKpi
          ? `<span class="formula-chip no-kpi" style="background:rgba(167, 139, 250, 0.15); color:#C4B5FD; border:1px solid rgba(167, 139, 250, 0.35);">ไม่มีเกณฑ์ประเมินในเดือนนี้</span>`
          : isThisJobNoWork
            ? `<span class="formula-chip" style="background:rgba(148, 163, 184, 0.15); color:#94A3B8; border:1px solid rgba(148, 163, 184, 0.35);">ไม่มีงาน AUC</span>`
            : `<span class="formula-chip pink" title="เป้าหมายระดับ 5 (${ms.jobTargetPctDisplay}) + 5% ของคงเหลืองาน AUC">
                เป้า ${ms.jobTargetPctDisplay} (+5%)
              </span>`;

        const subTextHtml = isThisJobNoKpi
          ? `<span>(ไม่มีเกณฑ์ประเมินในเดือนนี้)${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ''}</span>`
          : isThisJobNoWork
            ? `<span>(จำนวนงาน AUC = 0 งาน)${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ''}</span>`
            : `<span>(${jobsFormatted} งาน)${singleCritDef ? ` • ${escapeHtml(singleCritDef.name)}` : ' • เกณฑ์ TECO D2 และงบ C02.2'}</span>`;

        const jobCalcBoxHtml = (isThisJobNoKpi || isThisJobNoWork) ? '' : `
          <div class="next3m-calc-source">
            <div class="next3m-source-header">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--sweet-pink, #FF79B8);">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>ที่มาของค่าที่ใช้คำนวณ:</span>
            </div>
            <div class="next3m-source-grid">
              <div class="source-item" title="รวมงาน AUC ทั้งสิ้น = ${formatNumber(ms.totalJobsBaseCat34)} งาน">
                <span class="s-label">รวมงาน:</span>
                <span class="s-val">${formatNumber(ms.totalJobsBaseCat34)} งาน</span>
              </div>
              <div class="source-item" title="เป้าหมาย ${ms.jobTargetPctDisplay} = ${formatNumber(Math.round(ms.targetJobsL5Cat34))} งาน">
                <span class="s-label">เป้า ${ms.jobTargetPctDisplay}:</span>
                <span class="s-val pink">${formatNumber(Math.round(ms.targetJobsL5Cat34))} งาน</span>
              </div>
              <div class="source-item" title="ปิดงานล่าสุดแล้ว = ${formatNumber(ms.closedJobsBaseCat34)} งาน">
                <span class="s-label">ปิดแล้ว:</span>
                <span class="s-val green">${formatNumber(ms.closedJobsBaseCat34)} งาน</span>
              </div>
              <div class="source-item" title="คงเหลืองาน AUC = ${formatNumber(ms.remainJobsBaseCat34)} งาน">
                <span class="s-label">คงเหลือ:</span>
                <span class="s-val red">${formatNumber(ms.remainJobsBaseCat34)} งาน</span>
              </div>
              <div class="source-item span-full highlight" title="5% ของคงเหลืองาน AUC = ${formatNumber(Math.ceil(ms.fivePctRemainJobsCat34))} งาน">
                <span class="s-label">+5% ของคงเหลือ:</span>
                <span class="s-val pink">+${formatNumber(Math.ceil(ms.fivePctRemainJobsCat34))} งาน</span>
              </div>
            </div>
            <div class="next3m-source-equation" title="แทนค่าสูตรละเอียด: (${formatNumber(Math.round(ms.targetJobsL5Cat34))} − ${formatNumber(ms.closedJobsBaseCat34)}) + ${formatNumber(Math.ceil(ms.fivePctRemainJobsCat34))} = ${formatNumber(ms.sumReqJobsCat34)} งาน">
              <span class="eq-icon">📐</span>
              <span class="eq-text">
                แทนค่า: (${formatNumber(Math.round(ms.targetJobsL5Cat34))} − ${formatNumber(ms.closedJobsBaseCat34)}) + ${formatNumber(Math.ceil(ms.fivePctRemainJobsCat34))} = <strong>${isJobAchieved ? '0 งาน (⭐ ครบเกณฑ์ระดับ 5)' : `${jobsFormatted} งาน`}</strong>
              </span>
            </div>
          </div>
        `;

        jobBlockHtml = `
          <div class="next3m-metric-box metric-jobs ${isThisJobNoWork ? 'is-no-work' : ''}">
            <div class="next3m-metric-label">
              <span>⚡ ต้องปิดงานเพิ่ม (${singleCritDef ? (singleCritDef.label || 'เกณฑ์ที่เลือก') : 'เกณฑ์ 3, 4'})</span>
              ${targetChipHtml}
            </div>
            <div class="next3m-metric-val ${jobValClass}" style="${isThisJobNoWork ? 'font-size:1.02rem; color:#FCA5A5; font-weight:600; line-height:1.4;' : ''}">
              ${jobMainText}
            </div>
            <div class="next3m-metric-sub">
              ${subTextHtml}
            </div>
            ${jobCalcBoxHtml}
          </div>
        `;
      }

      return `
        <div class="next3m-month-card ${cardClass}">
          <div class="next3m-card-header">
            <div class="next3m-month-title">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="color:var(--pea-gold-400);">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${nm.fullName}</span>
            </div>
            <span class="next3m-month-step-badge">${stepText}</span>
          </div>

          ${valBlockHtml}
          ${jobBlockHtml}
        </div>
      `;
    }).join('');

    // 6. Render Table Rows
    if (tableBody) {
      tableBody.innerHTML = criteriaResults.map(cr => {
        if (cr.isFilteredOut) return '';
        const isVal = cr.critDef.type === 'val';
        const typeBadge = isVal
          ? '<span class="formula-chip gold">มูลค่า (บาท)</span>'
          : '<span class="formula-chip pink">งาน</span>';

        const isRowNoWork = (isVal ? cr.totalVal <= 0 : cr.totalJobs <= 0);
        const totDisplay = isVal ? formatCurrency(cr.totalVal) : `${formatNumber(cr.totalJobs)} งาน`;
        const closedDisplay = isVal ? formatCurrency(cr.closedVal) : `${formatNumber(cr.closedJobs)} งาน`;
        const remainDisplay = isVal ? formatCurrency(cr.remainVal) : `${formatNumber(cr.remainJobs)} งาน`;

        const mCells = cr.monthsCalc.map(mc => {
          if (isRowNoWork) {
            return '<td style="text-align:right; color:var(--text-muted); font-size:0.8rem;">- (ไม่มีงาน AUC)</td>';
          }
          if (mc.targetRatio === null) {
            return '<td style="text-align:right; color:var(--text-muted);">-</td>';
          }
          if (mc.isAchieved || mc.reqAmount === 0) {
            return `
              <td style="text-align:right;">
                <span class="next3m-table-badge-achieved">⭐ ✓ ครบเกณฑ์ระดับ 5 (${mc.targetPctStr})</span>
              </td>
            `;
          }
          const amtStr = isVal
            ? `${(mc.reqAmount / 1e6).toFixed(2)} ลบ.`
            : `${formatNumber(mc.reqAmount)} งาน`;
          const fivePctVal = isVal ? (0.05 * cr.remainVal) : Math.ceil(0.05 * cr.remainJobs);
          const fivePctStr = isVal ? formatCurrencyShort(fivePctVal) : `${fivePctVal} งาน`;
          const targetNum = isVal ? (cr.totalVal * mc.targetRatio) : Math.round(cr.totalJobs * mc.targetRatio);
          const detailFormulaTitle = isVal
            ? `สูตร: (${formatCurrencyShort(targetNum)} − ${formatCurrencyShort(cr.closedVal)}) + ${fivePctStr} = ${amtStr}`
            : `สูตร: (${targetNum} − ${cr.closedJobs}) + ${fivePctVal} = ${amtStr}`;
          return `
            <td style="text-align:right; font-weight:700; color:${isVal ? 'var(--pea-gold-400)' : 'var(--sweet-pink, #FF79B8)'};" title="${detailFormulaTitle}">
              ${amtStr} <span style="font-size:0.7rem; font-weight:400; color:var(--text-dim);">(${mc.targetPctStr})</span>
            </td>
          `;
        }).join('');

        return `
          <tr>
            <td style="text-align:center; color:var(--text-dim);">${cr.idx}</td>
            <td><strong>${escapeHtml(cr.critDef.name)}</strong></td>
            <td style="text-align:center;">${typeBadge}</td>
            <td style="text-align:right;">${totDisplay}</td>
            <td style="text-align:right;">${closedDisplay}</td>
            <td style="text-align:right; color:#FCA5A5;">${remainDisplay}</td>
            ${mCells}
          </tr>
        `;
      }).join('');
    }

    // 7. Render Table Foot
    if (tableFoot) {
      let footHtml = '';
      if (hasValInSelection) {
        const valCellsHtml = monthSummaries.map(ms => {
          const mValStr = !ms.hasValTarget ? '- (ไม่มีเกณฑ์)' : (grandTotValCat125 === 0 ? '- (ไม่มีงาน AUC)' : `${(ms.sumReqValCat125 / 1e6).toFixed(2)} ล้านบาท`);
          return `<td style="text-align:right; font-size:0.95rem;">${mValStr}</td>`;
        }).join('');

        footHtml += `
          <tr style="border-top:2px solid rgba(255,184,28,0.4); color:var(--pea-gold-400);">
            <td colspan="3" style="text-align:left;">รวมมูลค่าที่ต้องปิดเพิ่ม (${singleCritDef ? (singleCritDef.label || 'เกณฑ์ที่เลือก') : 'เกณฑ์ 1, 2, 5'})</td>
            <td style="text-align:right;">${formatCurrency(grandTotValCat125)}</td>
            <td style="text-align:right;">${formatCurrency(grandClosedValCat125)}</td>
            <td style="text-align:right; color:#FCA5A5;">${formatCurrency(grandRemainValCat125)}</td>
            ${valCellsHtml}
          </tr>
        `;
      }
      if (hasJobInSelection) {
        const jobCellsHtml = monthSummaries.map(ms => {
          const mJobStr = !ms.hasJobTarget ? '- (ไม่มีเกณฑ์)' : (grandTotJobsCat34 === 0 ? '- (ไม่มีงาน AUC)' : `${formatNumber(ms.sumReqJobsCat34)} งาน`);
          return `<td style="text-align:right; font-size:0.95rem;">${mJobStr}</td>`;
        }).join('');

        footHtml += `
          <tr style="${hasValInSelection ? '' : 'border-top:2px solid rgba(255,121,184,0.4);'} color:var(--sweet-pink, #FF79B8);">
            <td colspan="3" style="text-align:left;">รวมจำนวนงานที่ต้องปิดเพิ่ม (${singleCritDef ? (singleCritDef.label || 'เกณฑ์ที่เลือก') : 'เกณฑ์ 3, 4'})</td>
            <td style="text-align:right;">${formatNumber(grandTotJobsCat34)} งาน</td>
            <td style="text-align:right;">${formatNumber(grandClosedJobsCat34)} งาน</td>
            <td style="text-align:right; color:#FCA5A5;">${formatNumber(grandRemainJobsCat34)} งาน</td>
            ${jobCellsHtml}
          </tr>
        `;
      }
      tableFoot.innerHTML = footHtml;
    }

    // 8. Render Horizontal Bar Chart (กราฟแท่งแนวนอนเป้าหมายปิดงานเพิ่ม ก.ย. - ธ.ค. 69)
    renderNext3mHorizontalBarChart(monthSummaries, hasValInSelection, hasJobInSelection, singleCritDef, baseMonthName, criteriaResults);
  }

  window.setNext3mHBarMode = function (mode) {
    state.next3mHBarMode = mode;
    renderNext3MonthsProjection();
  };

  function renderNext3mHorizontalBarChart(monthSummaries, hasValInSelection, hasJobInSelection, singleCritDef, baseMonthName, criteriaResults) {
    const container = document.getElementById('next3mHBarChartContainer');
    const headerEl = document.getElementById('next3mChartHeader');
    const controls = document.getElementById('next3mHBarControls');
    const btnVal = document.getElementById('btnNext3mModeVal');
    const btnJob = document.getElementById('btnNext3mModeJob');
    if (!container || !Array.isArray(monthSummaries) || monthSummaries.length === 0) return;

    if (!baseMonthName) {
      let latestMonthIdx = 7;
      for (let m = 11; m >= 0; m--) {
        if (typeof hasReportForMonth === 'function' && hasReportForMonth(m)) {
          latestMonthIdx = m;
          break;
        }
      }
      const bMonthIdx = (typeof state.filters.month === 'number') ? state.filters.month : latestMonthIdx;
      baseMonthName = MONTHS_TH[bMonthIdx] || 'ส.ค.';
    }

    // Determine active mode (val vs job)
    let activeMode = state.next3mHBarMode || 'val';
    if (!hasValInSelection && hasJobInSelection) {
      activeMode = 'job';
      state.next3mHBarMode = 'job';
    } else if (hasValInSelection && !hasJobInSelection) {
      activeMode = 'val';
      state.next3mHBarMode = 'val';
    }

    const showControls = (hasValInSelection && hasJobInSelection);
    if (headerEl) {
      headerEl.style.display = showControls ? 'flex' : 'none';
    }
    if (controls) {
      controls.style.display = showControls ? 'flex' : 'none';
      if (btnVal) btnVal.classList.toggle('active', activeMode === 'val');
      if (btnJob) btnJob.classList.toggle('active', activeMode === 'job');
    }

    const isVal = activeMode === 'val';

    const isAllNoKpi = monthSummaries.every(ms => isVal 
      ? (!ms.hasValTarget || ms.valTargetPctDisplay === '-' || ms.valTargetPctDisplay === '0%' || ms.valTargetPctDisplay === '0.00%') 
      : (!ms.hasJobTarget || ms.jobTargetPctDisplay === '-' || ms.jobTargetPctDisplay === '0%' || ms.jobTargetPctDisplay === '0.00%')
    );
    const isAllNoWork = !isAllNoKpi && monthSummaries.every(ms => isVal ? ms.baseTotVal === 0 : ms.baseTotJobs === 0);
    const totalRequired = monthSummaries.reduce((sum, ms) => sum + (isVal ? ms.sumReqValCat125 : ms.sumReqJobsCat34), 0);
    const maxVal = Math.max(...monthSummaries.map(ms => isVal ? ms.sumReqValCat125 : ms.sumReqJobsCat34), 1);
    const dotColors = ['#FFB81C', '#10B981', '#06B6D4', '#A855F7'];

    const startMonthName = monthSummaries[0]?.monthInfo?.shortName || 'ก.ย.';
    const endMonthName = monthSummaries[monthSummaries.length - 1]?.monthInfo?.shortName || 'ธ.ค.';

    const isCardFullscreen = document.getElementById('unifiedProjectionOfficeCard')?.classList.contains('is-fullscreen');

    // Determine active criteria name, unit, and scope text for display in top section
    let activeCritName = 'ทุกประเภทเกณฑ์วัด (รวม 7 เกณฑ์)';
    if (singleCritDef && singleCritDef.name) {
      activeCritName = singleCritDef.name;
    } else if (state.filters.criteria && state.filters.criteria !== 'ALL') {
      activeCritName = state.filters.criteria;
    }

    let activeUnitLabel = isVal ? 'มูลค่า (บาท)' : 'จำนวนงาน (งาน)';
    if (singleCritDef) {
      activeUnitLabel = singleCritDef.type === 'job' ? 'จำนวนงาน (งาน)' : 'มูลค่า (บาท)';
    }

    const filterProv = state.filters.province;
    const filterOff = state.filters.office;
    let scopeText = '(กฟก.3 + 34 หน่วยงาน)';
    if (filterOff && filterOff !== 'ALL') {
      scopeText = `(${filterOff})`;
    } else if (filterProv && filterProv !== 'ALL' && filterProv !== 'กฟก.3' && filterProv !== 'กฟก.3 (ทั้งหมด)') {
      const pText = filterProv.startsWith('จ.') || filterProv.includes('กอง') ? filterProv : `จ.${filterProv}`;
      scopeText = `(${pText})`;
    }

    // คำนวณยอดภาพรวม AUC ตามตัวกรองปัจจุบัน สำหรับแสดงผลเฉพาะหน้าจอขยายเต็มจอ (ตำแหน่งวงกลมแดง)
    let fsTotVal = 0, fsClosedVal = 0, fsRemainVal = 0;
    let fsTotJobs = 0, fsClosedJobs = 0, fsRemainJobs = 0;

    if (Array.isArray(criteriaResults) && criteriaResults.length > 0) {
      criteriaResults.forEach(cr => {
        if (cr.isFilteredOut) return;
        fsTotVal += (Number(cr.totalVal) || 0);
        fsClosedVal += (Number(cr.closedVal) || 0);
        fsRemainVal += (Number(cr.remainVal) || 0);
        fsTotJobs += (Number(cr.totalJobs) || 0);
        fsClosedJobs += (Number(cr.closedJobs) || 0);
        fsRemainJobs += (Number(cr.remainJobs) || 0);
      });
    } else {
      const nonSummaryRows = (state.filteredData || []).filter(d => !d.isSummary && d.office !== 'กฟก.3 ผลรวม');
      const fRecords = nonSummaryRows.length > 0 ? nonSummaryRows : (state.filteredData || []);
      fRecords.forEach(d => {
        fsTotVal += (Number(d.totalValue) || 0);
        fsClosedVal += (Number(d.closedValue) || 0);
        fsRemainVal += (Number(d.remainingValue) !== undefined && !isNaN(Number(d.remainingValue)) ? Number(d.remainingValue) : Math.max(0, (Number(d.totalValue) || 0) - (Number(d.closedValue) || 0)));
        fsTotJobs += (Number(d.totalJobs) || 0);
        fsClosedJobs += (Number(d.closedJobs) || 0);
        fsRemainJobs += (Number(d.remainingJobs) !== undefined && !isNaN(Number(d.remainingJobs)) ? Number(d.remainingJobs) : Math.max(0, (Number(d.totalJobs) || 0) - (Number(d.closedJobs) || 0)));
      });
    }

    if (fsRemainVal === 0 && fsTotVal > fsClosedVal) {
      fsRemainVal = Math.max(0, fsTotVal - fsClosedVal);
    }
    if (fsRemainJobs === 0 && fsTotJobs > fsClosedJobs) {
      fsRemainJobs = Math.max(0, fsTotJobs - fsClosedJobs);
    }

    const fsValPct = fsTotVal > 0 ? ((fsClosedVal / fsTotVal) * 100).toFixed(1) + '%' : '0.0%';
    const fsJobPct = fsTotJobs > 0 ? ((fsClosedJobs / fsTotJobs) * 100).toFixed(1) + '%' : '0.0%';

    // ตรวจสอบว่าเป็นเกณฑ์ข้อ 3 (TECO D2) หรือ ข้อ 4 (งบ C02.2) หรือเกณฑ์นับจำนวนงาน
    const isCrit3or4 = (singleCritDef && (singleCritDef.category === 3 || singleCritDef.category === 4 || singleCritDef.type === 'job')) ||
      (activeCritName && (
        activeCritName.includes('3.') || 
        activeCritName.includes('ข้อ 3') || 
        activeCritName.includes('ข้อ3') || 
        activeCritName.includes('TECO') || 
        activeCritName.includes('teco') || 
        activeCritName.includes('4') || 
        activeCritName.includes('C02')
      )) || (!isVal);

    const fsTotMbStr = `${(fsTotVal / 1e6).toFixed(2)} ลบ.`;
    const fsClosedMbStr = `${(fsClosedVal / 1e6).toFixed(2)} ลบ.`;
    const fsRemainMbStr = `${(fsRemainVal / 1e6).toFixed(2)} ลบ.`;

    let fsTotalDisplay = '';
    let fsClosedDisplay = '';
    let fsRemainDisplay = '';

    if (isCrit3or4) {
      // เกณฑ์ข้อ 3 และ ข้อ 4: %ปิดแล้ว ให้คิดจาก %ปิดงาน เสมอ
      if (fsTotVal > 0 && fsTotJobs > 0) {
        fsTotalDisplay = `${fsTotMbStr} / ${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${fsClosedMbStr} / ${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsJobPct})</span>`;
        fsRemainDisplay = `${fsRemainMbStr} / ${formatNumber(fsRemainJobs)} งาน`;
      } else {
        fsTotalDisplay = `${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsJobPct})</span>`;
        fsRemainDisplay = `${formatNumber(fsRemainJobs)} งาน`;
      }
    } else if (singleCritDef && singleCritDef.type === 'val') {
      // เกณฑ์ข้อ 1, 2, 5 (เกณฑ์มูลค่า): %ปิดแล้ว คิดจาก %ปิดมูลค่า
      if (fsTotVal > 0 && fsTotJobs > 0) {
        fsTotalDisplay = `${fsTotMbStr} / ${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${fsClosedMbStr} / ${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsValPct})</span>`;
        fsRemainDisplay = `${fsRemainMbStr} / ${formatNumber(fsRemainJobs)} งาน`;
      } else if (fsTotVal > 0) {
        fsTotalDisplay = `${fsTotMbStr}`;
        fsClosedDisplay = `${fsClosedMbStr} <span class="fs-stat-pct" style="color:#34D399;">(${fsValPct})</span>`;
        fsRemainDisplay = `${fsRemainMbStr}`;
      } else {
        fsTotalDisplay = `${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsJobPct})</span>`;
        fsRemainDisplay = `${formatNumber(fsRemainJobs)} งาน`;
      }
    } else {
      // รวมทุกประเภทเกณฑ์วัด (ALL Criteria): แสดง % แยกทั้งมูลค่าและงาน
      if (fsTotVal > 0 && fsTotJobs > 0) {
        fsTotalDisplay = `${fsTotMbStr} / ${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${fsClosedMbStr} <span class="fs-stat-pct" style="color:var(--pea-gold-400);">(${fsValPct})</span> / ${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsJobPct})</span>`;
        fsRemainDisplay = `${fsRemainMbStr} / ${formatNumber(fsRemainJobs)} งาน`;
      } else if (fsTotVal > 0) {
        fsTotalDisplay = `${fsTotMbStr}`;
        fsClosedDisplay = `${fsClosedMbStr} <span class="fs-stat-pct" style="color:#34D399;">(${fsValPct})</span>`;
        fsRemainDisplay = `${fsRemainMbStr}`;
      } else {
        fsTotalDisplay = `${formatNumber(fsTotJobs)} งาน`;
        fsClosedDisplay = `${formatNumber(fsClosedJobs)} งาน <span class="fs-stat-pct" style="color:#34D399;">(${fsJobPct})</span>`;
        fsRemainDisplay = `${formatNumber(fsRemainJobs)} งาน`;
      }
    }

    // Common Header row inside card with View Switcher
    const headerMetaHtml = `
      <div class="next3m-single-bar-wrap">
        <div class="single-bar-meta">
          <div class="single-bar-left-tags" style="display:flex; align-items:center; gap:0.55rem; flex-wrap:wrap;">
            <div class="next3m-card-inline-title">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--pea-gold-400);">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
              <span id="next3mSectionTitle">เป้าหมายที่ต้องปิดงานเพิ่ม (${startMonthName} - ${endMonthName} 2569)</span>
            </div>
            <span class="badge-pea-tag" id="next3mSingleBarKpiBadge"
              style="background:rgba(255,184,28,0.18); color:var(--pea-gold-400); border-color:rgba(255,184,28,0.4); font-size:0.75rem; font-weight:700; padding:0.18rem 0.55rem;">
              KPI ระดับ 5 (+5%)
            </span>
            ${isAllNoKpi ? '<span style="color:#C4B5FD; font-size:0.8rem; font-weight:600;">(ไม่มีเกณฑ์ประเมินในช่วงเดือนนี้)</span>' : (isAllNoWork ? '<span style="color:#94A3B8; font-size:0.8rem; font-weight:600;">(ไม่มีงานและมูลค่า AUC)</span>' : '')}
          </div>
          <div class="single-bar-actions" style="display:flex; align-items:center; gap:0.4rem; margin-left:auto; flex-wrap:wrap;">
            <!-- Metric Toggle if selection contains both Val & Job -->
            ${showControls ? `
              <div class="next3m-metric-toggle-wrap">
                <button type="button" class="btn-next3m-metric-sm ${activeMode === 'val' ? 'active' : ''}"
                  onclick="window.setNext3mHBarMode('val')" title="สลับแสดงหน่วยมูลค่า (ล้านบาท)">
                  💰 มูลค่า
                </button>
                <button type="button" class="btn-next3m-metric-sm ${activeMode === 'job' ? 'active' : ''}"
                  onclick="window.setNext3mHBarMode('job')" title="สลับแสดงหน่วยจำนวนงาน (งาน)">
                  ⚡ งาน
                </button>
              </div>
            ` : ''}

            <span class="badge-pea-tag" id="next3mBaseMonthBadge"
              style="background:rgba(16,185,129,0.15); color:#6EE7B7; border-color:rgba(16,185,129,0.4); font-size:0.72rem; padding:0.18rem 0.5rem;">
              ฐานข้อมูล: ${baseMonthName} 69
            </span>
            <button type="button" class="btn-sm btn-outline" id="btnToggleNext3mCards"
              onclick="window.toggleNext3mCards()" title="สลับแสดง/ซ่อน การ์ดเป้าหมายรายเดือนทั้ง 3 ใบ"
              style="padding:0.18rem 0.55rem; font-size:0.74rem;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="3" width="7" height="7" rx="1"></rect>
                <rect x="14" y="14" width="7" height="7" rx="1"></rect>
                <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              </svg>
              <span id="next3mCardsToggleText">${isNext3mCardsExpanded ? 'ซ่อนการ์ดเป้าหมาย' : 'แสดงการ์ดเป้าหมาย'}</span>
            </button>
            <button type="button" class="btn-fullscreen" onclick="toggleCardFullscreen(this)" title="${isCardFullscreen ? 'ย่อขนาดปกติ (ESC)' : 'ขยายกราฟเต็มหน้าจอ'}"
              style="padding:0.18rem 0.55rem; font-size:0.74rem;">
              ${isCardFullscreen ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7"></path>
                </svg>
                <span>ย่อขนาดปกติ</span>
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                </svg>
                <span>ขยายเต็มจอ</span>
              `}
            </button>
          </div>
        </div>

        <!-- Row 2: Selected Filter Display Strip & Fullscreen Stats Strip (แสดงเฉพาะขยายเต็มหน้าจอ ตามตำแหน่งวงกลมแดง) -->
        <div class="next3m-substrip-row" style="display:flex; align-items:center; gap:0.65rem; flex-wrap:wrap; margin:0.35rem 0 0.55rem 0;">
          <div class="next3m-active-filter-strip" style="display:inline-flex; align-items:center; gap:0.45rem; flex-wrap:wrap; font-size:0.76rem; margin:0; padding:0.22rem 0.65rem; background:rgba(20,5,35,0.45); border-radius:var(--radius-sm, 6px); border:1px solid var(--border-subtle, rgba(255,255,255,0.1)); width:fit-content;">
            <span style="color:var(--text-dim); display:inline-flex; align-items:center; gap:4px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              ตัวกรองที่เลือก:
            </span>
            <strong id="next3mSelectedCritName" style="color:var(--pea-gold-400);">${escapeHtml(activeCritName)}</strong>
            <span class="badge-pea-tag" id="next3mSelectedUnitBadge" style="background:rgba(236,72,153,0.18); color:#F472B6; border-color:rgba(236,72,153,0.4); font-size:0.72rem; padding:0.12rem 0.45rem;">
              ${escapeHtml(activeUnitLabel)}
            </span>
            <span id="next3mSelectedScopeText" style="color:var(--text-muted); font-size:0.74rem;">${escapeHtml(scopeText)}</span>
          </div>

          <!-- Fullscreen Stats Strip (เฉพาะหน้าขยายเต็มหน้าจอ ตามตำแหน่งวงกลมแดง) -->
          <div class="next3m-fullscreen-stats-strip" id="next3mFullscreenStatsStrip" title="สรุปภาพรวม AUC ตามตัวกรองปัจจุบัน (เฉพาะโหมดขยายเต็มหน้าจอ)">
            <div class="fs-stat-block" title="รวมมูลค่า AUC ทั้งสิ้น: ${fsTotVal > 0 ? formatCurrency(fsTotVal) + ' / ' : ''}${formatNumber(fsTotJobs)} งาน">
              <span class="fs-stat-dot" style="background:#FFB81C; box-shadow:0 0 6px rgba(255,184,28,0.6);"></span>
              <span class="fs-stat-label">ภาพรวมมูลค่างาน / งาน:</span>
              <span class="fs-stat-val" style="color:var(--pea-gold-400);">${fsTotalDisplay}</span>
            </div>
            <span class="fs-stat-divider">|</span>
            <div class="fs-stat-block" title="ปิดงานแล้วล่าสุด: ${fsTotVal > 0 ? formatCurrency(fsClosedVal) + ' / ' : ''}${formatNumber(fsClosedJobs)} งาน (${isCrit3or4 ? fsJobPct : fsValPct})">
              <span class="fs-stat-dot" style="background:#10B981; box-shadow:0 0 6px rgba(16,185,129,0.6);"></span>
              <span class="fs-stat-label">ปิดแล้ว:</span>
              <span class="fs-stat-val" style="color:#34D399;">${fsClosedDisplay}</span>
            </div>
            <span class="fs-stat-divider">|</span>
            <div class="fs-stat-block" title="คงเหลือ: ${fsTotVal > 0 ? formatCurrency(fsRemainVal) + ' / ' : ''}${formatNumber(fsRemainJobs)} งาน">
              <span class="fs-stat-dot" style="background:#EF4444; box-shadow:0 0 6px rgba(239,68,68,0.6);"></span>
              <span class="fs-stat-label">คงเหลือ:</span>
              <span class="fs-stat-val" style="color:#F87171;">${fsRemainDisplay}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    if (state.charts.next3mDonut) {
      state.charts.next3mDonut.destroy();
      state.charts.next3mDonut = null;
    }

    // 1. Single Segmented Horizontal Bar (แท่งแนวนอน 1 แท่ง รวมช่วงเดือน)
    // ปรับความกว้างกราฟ: จัดสรรความกว้างขั้นต่ำที่เหมาะสมให้แต่ละช่วงเดือน (baseShare) 
    // โดยคำนึงถึงปริมาณข้อความ (เดือนที่บรรลุเป้าหมายจะมีป้าย ✓ บรรลุเป้า เพิ่มเข้ามา)
    // เพื่อให้ตัวอักษรและป้ายเป้าหมาย KPI + ยอดเงิน แสดงได้ครบถ้วน 100% ไม่ถูกบังหรือตัดทอน
    const nMonths = monthSummaries.length;

    const segmentConfigs = monthSummaries.map((ms) => {
      const hasKpiTarget = isVal 
        ? (ms.hasValTarget && ms.valTargetPctDisplay && ms.valTargetPctDisplay !== '-' && ms.valTargetPctDisplay !== '0%' && ms.valTargetPctDisplay !== '0.00%')
        : (ms.hasJobTarget && ms.jobTargetPctDisplay && ms.jobTargetPctDisplay !== '-' && ms.jobTargetPctDisplay !== '0%' && ms.jobTargetPctDisplay !== '0.00%');
      const file01HasWork = isVal ? (ms.baseTotVal > 0) : (ms.baseTotJobs > 0);
      const isNoKpi = !hasKpiTarget;
      const isNoWork = hasKpiTarget && !file01HasWork;

      const amt = isVal ? ms.sumReqValCat125 : ms.sumReqJobsCat34;
      const kpiPct = isVal ? ms.valTargetPctDisplay : ms.jobTargetPctDisplay;
      const amtStr = isVal ? `${(amt / 1e6).toFixed(2)} ลบ.` : `${formatNumber(amt)} งาน`;
      const isAchieved = hasKpiTarget && file01HasWork && amt === 0;

      // Base share ให้เพียงพอกับเนื้อหาป้ายและตัวอักษรขนาดใหญ่
      let baseShare = 30;
      if (nMonths <= 2) {
        baseShare = isAchieved ? 48 : 46;
      } else if (nMonths === 3) {
        baseShare = isAchieved ? 34 : 29;
      } else if (nMonths === 4) {
        baseShare = isAchieved ? 27 : 22;
      } else {
        baseShare = 100 / nMonths;
      }

      return {
        ms,
        hasKpiTarget,
        file01HasWork,
        isNoKpi,
        isNoWork,
        amt,
        kpiPct,
        amtStr,
        isAchieved,
        baseShare
      };
    });

    const totalBaseShare = segmentConfigs.reduce((acc, cur) => acc + cur.baseShare, 0);
    const poolRemaining = Math.max(0, 100 - totalBaseShare);

    const segmentsHtml = segmentConfigs.map((cfg, idx) => {
      let pctShare = cfg.baseShare;
      if (totalRequired > 0 && cfg.amt > 0) {
        pctShare += (cfg.amt / totalRequired) * poolRemaining;
      } else if (totalRequired === 0) {
        pctShare = 100 / nMonths;
      }

      let segLabel = '';
      if (cfg.isNoKpi) {
        segLabel = `<span class="seg-mname">${cfg.ms.monthInfo.shortName}</span> <span class="seg-val">(-)</span>`;
      } else if (cfg.isNoWork) {
        segLabel = `<span class="seg-mname">${cfg.ms.monthInfo.shortName}</span> <span class="seg-val">(ไม่มีงาน)</span>`;
      } else if (cfg.isAchieved) {
        segLabel = `<span class="seg-mname">${cfg.ms.monthInfo.shortName}</span> <span class="seg-kpi-badge">เป้า KPI: ${cfg.kpiPct}</span> <span class="seg-amt">(${cfg.amtStr})</span> <span class="seg-status">✓ บรรลุเป้า</span>`;
      } else {
        segLabel = `<span class="seg-mname">${cfg.ms.monthInfo.shortName}</span> <span class="seg-kpi-badge">เป้า KPI: ${cfg.kpiPct}</span> <span class="seg-amt">(${cfg.amtStr})</span>`;
      }

      const hoverTitle = cfg.isNoKpi
        ? `${cfg.ms.monthInfo.fullName}: (ไม่มีเกณฑ์ประเมินในเดือนนี้)`
        : cfg.isNoWork
          ? `${cfg.ms.monthInfo.fullName}: (ไม่มีงานและมูลค่า AUC)`
          : (cfg.isAchieved ? `${cfg.ms.monthInfo.fullName}: บรรลุเป้าหมายเกณฑ์ระดับ 5 แล้ว (${cfg.amtStr}) [เป้าหมาย KPI: ${cfg.kpiPct} (+5%)]` : `${cfg.ms.monthInfo.fullName}: ต้องปิดเพิ่ม ${cfg.amtStr} [เป้าหมาย KPI: ${cfg.kpiPct} (+5%)] คิดเป็น ${((cfg.amt / (totalRequired || 1)) * 100).toFixed(1)}% ของยอดรวม`);

      return `
        <div class="single-bar-segment seg-${idx + 1}" style="width: ${pctShare.toFixed(1)}%; ${(cfg.isNoKpi || cfg.isNoWork) ? 'filter: grayscale(0.8) opacity(0.5);' : ''}"
          title="${hoverTitle}">
          ${segLabel}
        </div>
      `;
    }).join('');

    const singleBarHtml = `
      <div class="next3m-single-bar-wrap" style="margin-top:0.35rem;">
        <div class="single-bar-track">
          ${isAllNoKpi ? `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#C4B5FD; font-size:0.84rem; font-weight:600; background:rgba(255,255,255,0.02);">
              (ไม่มีเกณฑ์ประเมินในช่วงเดือนนี้)
            </div>
          ` : isAllNoWork ? `
            <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#94A3B8; font-size:0.84rem; font-weight:600; background:rgba(255,255,255,0.02);">
              (ไม่มีงานและมูลค่า AUC)
            </div>
          ` : segmentsHtml}
        </div>
      </div>
    `;

    container.innerHTML = `
      ${headerMetaHtml}
      ${singleBarHtml}
    `;
  }

  /**
   * Helper for WBS tab to retrieve KPI Level 5 Target Months for any Criteria
   */
  window.getKpiSimulationTargetMonths = function (customCrit) {
    if (!window.next3mSimulationData) {
      if (typeof renderNext3MonthsProjection === 'function') {
        renderNext3MonthsProjection();
      }
    }
    const sim = window.next3mSimulationData;
    if (!sim || !Array.isArray(sim.monthSummaries)) return [];

    const activeCrit = customCrit !== undefined ? customCrit : (state.filters.criteria || 'ALL');
    const isSingleCrit = activeCrit && activeCrit !== 'ALL';

    // Determine criteria unit: 'job' for Criteria 3 & 4, otherwise 'val'
    const isCritJob = activeCrit.includes('3.') || activeCrit.includes('ข้อ 3') || activeCrit.includes('ข้อ3') ||
                      activeCrit.includes('4') || activeCrit.includes('C02.2') ||
                      activeCrit.includes('TECO') || activeCrit.includes('teco');

    let singleCr = null;
    if (isSingleCrit && Array.isArray(sim.criteriaResults)) {
      singleCr = sim.criteriaResults.find(cr => cr.critDef && (
        (cr.critDef.matcher && cr.critDef.matcher(activeCrit)) ||
        matchCriteriaName(activeCrit, cr.critDef.name) ||
        (cr.critDef.name && cr.critDef.name.includes(activeCrit))
      ));
    }

    return sim.monthSummaries.map((ms, mIdx) => {
      let amt = 0;
      let kpiPct = '-';
      let isAchieved = false;

      if (singleCr && singleCr.monthsCalc && singleCr.monthsCalc[mIdx]) {
        const mc = singleCr.monthsCalc[mIdx];
        amt = mc.reqAmount !== null ? mc.reqAmount : 0;
        kpiPct = mc.targetPctStr || '-';
        isAchieved = mc.isAchieved || (mc.targetRatio !== null && amt <= 0 && (singleCr.critDef.type === 'job' ? singleCr.totalJobs > 0 : singleCr.totalVal > 0));
      } else {
        amt = isCritJob ? ms.sumReqJobsCat34 : ms.sumReqValCat125;
        kpiPct = isCritJob ? ms.jobTargetPctDisplay : ms.valTargetPctDisplay;
        isAchieved = (amt <= 0);
      }

      const unit = (singleCr ? singleCr.critDef.type === 'job' : isCritJob) ? 'job' : 'val';
      const unitLabel = unit === 'job' ? 'งาน' : 'บาท';
      const unitShort = unit === 'job' ? 'งาน' : 'ลบ.';
      const amtStr = unit === 'job' ? `${formatNumber(amt)} งาน` : `${(amt / 1e6).toFixed(2)} ลบ.`;

      return {
        monthNum: ms.monthInfo.monthNum,
        monthIdx: ms.monthInfo.monthIdx,
        shortName: ms.monthInfo.shortName,
        fullName: ms.monthInfo.fullName,
        amt: amt,
        amtStr: amtStr,
        kpiPct: kpiPct,
        isAchieved: isAchieved,
        unit: unit,
        unitLabel: unitLabel,
        unitShort: unitShort,
        hasTarget: unit === 'job' ? ms.hasJobTarget : ms.hasValTarget
      };
    });
  };

  // ==========================================
  // 5.1 DYNAMIC KPI EVALUATION (จากไฟล์ 02 KPI ปี 2569)
  // ==========================================
  function matchCriteriaName(target, candidate) {
    if (!target || target === 'ALL' || target === 'เลือกทั้งหมด' || target === 'ทุกเกณฑ์วัด' || target === 'ทั้งหมด') return true;
    if (!candidate) return false;
    const clean = (s) => (s || '').replace(/\s+/g, '').replace(/ปี/g, '').replace(/ก่อน/g, '');
    const t = clean(target);
    const c = clean(candidate);
    if (t === c) return true;

    // Specific match for ข้อ 4 (งบ C02.2) - Avoid collision with ข้อ 2.2
    const isCrit4_T = t.includes('ข้อ4') || t.includes('C02') || t.includes('c02') || (t.includes('4') && !t.includes('1.') && !t.includes('2.') && !t.includes('3.'));
    const isCrit4_C = c.includes('ข้อ4') || c.includes('C02') || c.includes('c02') || (c.includes('4') && !c.includes('1.') && !c.includes('2.') && !c.includes('3.'));
    if (isCrit4_T || isCrit4_C) {
      return isCrit4_T && isCrit4_C;
    }

    // Specific match for ข้อ 5 (งานบ้านและที่ดินจัดสรร)
    const isCrit5_T = t.includes('5') || t.includes('บ้าน');
    const isCrit5_C = c.includes('5') || c.includes('บ้าน');
    if (isCrit5_T || isCrit5_C) {
      return isCrit5_T && isCrit5_C;
    }

    // Specific match for other criteria (1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3)
    const tags = ['1.1', '1.2', '1.3', '2.1', '2.2', '3.1', '3.2', '3.3'];
    for (const tag of tags) {
      if (t.includes(tag) && c.includes(tag)) {
        return true;
      }
    }

    return t.includes(c) || c.includes(t);
  }

  function getDecemberKpiTarget(criteria) {
    if (!window.KPI_MATRIX || !Array.isArray(window.KPI_MATRIX)) return '100%';
    if (!criteria || criteria === 'ALL') return '100%';

    const row = window.KPI_MATRIX.find(r => r.monthNum === 12 && matchCriteriaName(criteria, r.criteria));
    if (row && row.level5 && row.level5 !== '-') {
      return row.level5;
    }
    return '100%';
  }

  function getKpiLevel5Target(criteria, monthIdx) {
    if (!window.KPI_MATRIX || !Array.isArray(window.KPI_MATRIX)) return null;

    const monthNum = (monthIdx !== undefined && monthIdx !== null && monthIdx !== 'ALL')
      ? (Number(monthIdx) + 1)
      : 8;

    if (!criteria || criteria === 'ALL') {
      const rows = window.KPI_MATRIX.filter(r => r.monthNum === monthNum && r.level5 && r.level5 !== '-');
      if (!rows.length) return null;
      let sum = 0;
      rows.forEach(r => {
        const num = parseFloat(r.level5.replace('%', '').trim());
        if (!isNaN(num)) sum += num;
      });
      return Math.round((sum / rows.length) * 100) / 100;
    }

    let row = window.KPI_MATRIX.find(r => r.monthNum === monthNum && matchCriteriaName(criteria, r.criteria));
    if (!row && (criteria.includes('TECO') || criteria.includes('teco') || criteria.includes('3.'))) {
      row = window.KPI_MATRIX.find(r => r.monthNum === monthNum && (r.criteria.includes('TECO') || r.criteria.includes('3.')) && r.level5 && r.level5 !== '-');
    }
    if (!row && (criteria.includes('C02') || criteria.includes('c02') || criteria.includes('4'))) {
      row = window.KPI_MATRIX.find(r => r.monthNum === monthNum && (r.criteria.includes('C02') || r.criteria.includes('4')) && r.level5 && r.level5 !== '-');
    }
    if (!row && (criteria.includes('บ้าน') || criteria.includes('จัดสรร') || criteria.includes('5'))) {
      row = window.KPI_MATRIX.find(r => r.monthNum === monthNum && (r.criteria.includes('บ้าน') || r.criteria.includes('จัดสรร')) && r.level5 && r.level5 !== '-');
    }

    if (!row || !row.level5 || row.level5 === '-') return null;
    const num = parseFloat(row.level5.replace('%', '').trim());
    return isNaN(num) ? null : num;
  }

  function evaluateKpiScore(criteria, monthIdx, actualPct) {
    if (!window.KPI_MATRIX || !Array.isArray(window.KPI_MATRIX)) return null;

    // เดือนที่ประเมิน (1-12)
    const monthNum = (monthIdx !== 'ALL' && monthIdx !== null && monthIdx !== undefined)
                     ? (Number(monthIdx) + 1)
                     : 7; // ค่าเริ่มต้น ก.ค. (เดือนตามรายงาน)

    const parsePct = (val) => {
      if (!val || val === '-' || typeof val !== 'string') return null;
      const num = parseFloat(val.replace('%', '').trim());
      return isNaN(num) ? null : num;
    };

    const getMatrixRow = (crit, mNum) => {
      return window.KPI_MATRIX.find(r => r.monthNum === mNum && matchCriteriaName(crit, r.criteria));
    };

    // กรณีเลือกเกณฑ์วัดเฉพาะ
    if (criteria && criteria !== 'ALL') {
      const row = getMatrixRow(criteria, monthNum);
      if (!row) return null;

      const l1 = parsePct(row.level1);
      const l2 = parsePct(row.level2);
      const l3 = parsePct(row.level3);
      const l4 = parsePct(row.level4);
      const l5 = parsePct(row.level5);

      if (l1 === null && l2 === null && l3 === null && l4 === null && l5 === null) {
        return {
          score: '-',
          level: 0,
          gradeText: 'ไม่มีเกณฑ์ประเมินในเดือนนี้',
          targets: null
        };
      }

      const p = actualPct;
      let level = 1;
      let gradeText = 'ระดับ 1 (ปรับปรุง)';

      if (l5 !== null && p >= l5) {
        level = 5;
        gradeText = 'ระดับ 5 (ผ่านเกณฑ์)';
      } else if (l4 !== null && p >= l4) {
        level = 4;
        gradeText = 'ระดับ 4 (ดีมาก)';
      } else if (l3 !== null && p >= l3) {
        level = 3;
        gradeText = 'ระดับ 3 (ดี)';
      } else if (l2 !== null && p >= l2) {
        level = 2;
        gradeText = 'ระดับ 2 (พอใช้)';
      } else if (l1 !== null && p >= l1) {
        level = 1;
        gradeText = 'ระดับ 1 (ปรับปรุง)';
      } else {
        level = 1;
        gradeText = 'ระดับ 1 (ต่ำกว่าเกณฑ์)';
      }

      return {
        score: String(level),
        scoreNum: level,
        level,
        gradeText,
        targets: { l1, l2, l3, l4, l5 }
      };
    }

    // กรณีเลือกทุกเกณฑ์วัด (ALL): ประเมินรายเกณฑ์และเฉลี่ย
    const allCrits = [
      'ข้อ 1.1 งบ C.1 ก่อน 69',
      'ข้อ 1.2 งบ I , P ก่อนปี 68',
      'ข้อ 1.3 งบ I , P ก่อนปี 69',
      'ข้อ 2.1 งบ C.1 ปี 69',
      'ข้อ 2.2 งบ I , P ปี 69',
      'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)',
      'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)',
      'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)',
      'ข้อ 3.1 TECO D2',
      'ข้อ 3.2 TECO D2',
      'ข้อ 3.3 TECO D2',
      'ข้อ 4 งบ C02.2 ปี 69',
      'ข้อ 5 งานบ้านและที่ดินจัดสรร',
      'ข้อ5 งานบ้านและที่ดินจัดสรร'
    ];
    const presentCrits = new Set(state.allData.map(d => d.criteria).filter(Boolean));
    let critList = allCrits.filter(c => presentCrits.has(c));
    if (critList.length === 0) critList = Array.from(presentCrits);

    let totalScore = 0;
    let evaluatedCount = 0;

    critList.forEach(crit => {
      const critRows = state.allData.filter(d => {
        let match = d.criteria === crit && !d.isSummary;
        if (state.filters.province !== 'ALL') match = match && d.province === state.filters.province;
        if (state.filters.office !== 'ALL') match = match && d.office === state.filters.office;
        return match;
      });

      let cVal = 0, tVal = 0, cJobs = 0, tJobs = 0;
      critRows.forEach(r => {
        cVal += r.closedValue;
        tVal += r.totalValue;
        cJobs += r.closedJobs;
        tJobs += r.totalJobs;
      });
      const cleanC = (crit || '').replace(/\s+/g, '');
      const isJobBased = cleanC.includes('3.1') || cleanC.includes('3.2') || cleanC.includes('3.3') ||
                         cleanC.includes('TECO') || cleanC.includes('4') || cleanC.includes('C02.2');
      const critPct = isJobBased
        ? (tJobs > 0 ? (cJobs / tJobs) * 100 : 0)
        : (tVal > 0 ? (cVal / tVal) * 100 : 0);

      const evalRes = evaluateKpiScore(crit, monthIdx, critPct);
      if (evalRes && evalRes.score !== '-' && evalRes.scoreNum > 0) {
        totalScore += evalRes.scoreNum;
        evaluatedCount++;
      }
    });

    if (evaluatedCount === 0) return null;
    const avgScore = totalScore / evaluatedCount;
    const roundLvl = Math.max(1, Math.min(5, Math.round(avgScore)));
    const gradeTexts = {
      5: 'ระดับ 5 (ผ่านเกณฑ์)',
      4: 'ระดับ 4 (ดีมาก)',
      3: 'ระดับ 3 (ดี)',
      2: 'ระดับ 2 (พอใช้)',
      1: 'ระดับ 1 (ปรับปรุง)'
    };

    return {
      score: String(roundLvl),
      scoreNum: roundLvl,
      level: roundLvl,
      gradeText: gradeTexts[roundLvl] || 'ระดับการประเมิน',
      targets: null
    };
  }

  // ==========================================
  // 6. PROVINCES OVERVIEW CARDS
  // ==========================================
  function renderProvincesOverview() {
    const container = document.getElementById('provincesOverviewGrid');
    if (!container) return;

    const hasReport = hasReportForMonth(state.filters.month);
    const provList = ['นครปฐม', 'สุพรรณบุรี', 'กาญจนบุรี', 'สมุทรสาคร', 'กอง/กฟก.3'];
    let html = '';

    provList.forEach(prov => {
      const pRows = state.allData.filter(d => d.province === prov && !d.isSummary);
      let tVal = 0, cVal = 0, rVal = 0, tJobs = 0, cJobs = 0;

      pRows.forEach(d => {
        tVal += d.totalValue;
        cVal += d.closedValue;
        rVal += d.remainingValue;
        cJobs += d.closedJobs;
        tJobs += d.totalJobs;
      });

      const pct = tVal > 0 ? (cVal / tVal) * 100 : (tJobs > 0 ? (cJobs / tJobs) * 100 : 0);
      
      let provKpi = null;
      if (hasReport && (tVal > 0 || tJobs > 0)) {
        const evalRes = evaluateKpiScore(state.filters.criteria, state.filters.month, pct);
        if (evalRes) provKpi = evalRes.level;
      }
      const roundedKpi = provKpi || 1;
      const isActive = state.filters.province === prov;

      html += `
        <div class="province-card ${isActive ? 'active' : ''}" onclick="window.selectProvinceFilter('${prov}')">
          <div class="province-header">
            <div class="province-name">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
              <span>${prov === 'กอง/กฟก.3' ? 'กองในสังกัด กฟก.3' : 'จังหวัด' + prov}</span>
            </div>
          </div>
          
          <div class="province-metrics-grid">
            <div class="prov-metric-item">
              <span class="prov-metric-label">มูลค่ารวม AUC</span>
              <span class="prov-metric-val">${formatCurrencyShort(tVal)}</span>
            </div>
            <div class="prov-metric-item">
              <span class="prov-metric-label">ปิดงานแล้ว</span>
              <span class="prov-metric-val text-gold">${formatCurrencyShort(cVal)}</span>
            </div>
            <div class="prov-metric-item">
              <span class="prov-metric-label">คงเหลือ</span>
              <span class="prov-metric-val">${formatCurrencyShort(rVal)}</span>
            </div>
            <div class="prov-metric-item">
              <span class="prov-metric-label">จำนวนงานทั้งหมด</span>
              <span class="prov-metric-val">${formatNumber(tJobs)} งาน</span>
            </div>
          </div>

          <div class="progress-track">
            <div class="progress-fill ${pct >= 100 ? 'fill-success' : (pct >= 60 ? 'fill-warning' : 'fill-danger')}" style="width:${Math.min(100, pct)}%"></div>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-dim); margin-top:0.35rem;">
            <span>สำเร็จ ${pct.toFixed(2)}%</span>
            <span>ปิด ${formatNumber(cJobs)} / ${formatNumber(tJobs)} งาน</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.selectProvinceFilter = function (prov) {
    state.filters.province = state.filters.province === prov ? 'ALL' : prov;
    const sel = document.getElementById('filterProvince');
    if (sel) sel.value = state.filters.province;
    
    updateOfficeDropdown();
    filterData();
    renderAll();
  };

  // ==========================================
  // 7. CRITERIA BREAKDOWN CARDS (8 ข้อ)
  // ==========================================
  function renderCriteriaCards() {
    const container = document.getElementById('criteriaOverviewGrid');
    if (!container) return;

    const allCrits = [
      'ข้อ 1.1 งบ C.1 ก่อน 69',
      'ข้อ 1.2 งบ I , P ก่อนปี 68',
      'ข้อ 1.3 งบ I , P ก่อนปี 69',
      'ข้อ 2.1 งบ C.1 ปี 69',
      'ข้อ 2.2 งบ I , P ปี 69',
      'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)',
      'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)',
      'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)',
      'ข้อ 3.1 TECO D2',
      'ข้อ 3.2 TECO D2',
      'ข้อ 3.3 TECO D2',
      'ข้อ 4 งบ C02.2 ปี 69',
      'ข้อ5 งานบ้านและที่ดินจัดสรร'
    ];
    const presentCrits = new Set(state.allData.map(d => d.criteria).filter(Boolean));
    let critList = allCrits.filter(c => presentCrits.has(c));
    if (critList.length === 0) critList = Array.from(presentCrits);

    const hasReport = hasReportForMonth(state.filters.month);
    let html = '';
    critList.forEach((crit, idx) => {
      const cRows = state.allData.filter(d => d.criteria === crit && !d.isSummary);
      let tVal = 0, cVal = 0, rVal = 0, tJobs = 0, cJobs = 0;
      const unit = cRows.length > 0 ? cRows[0].unit : 'มูลค่า (บาท)';

      cRows.forEach(d => {
        tVal += d.totalValue;
        cVal += d.closedValue;
        rVal += d.remainingValue;
        cJobs += d.closedJobs;
        tJobs += d.totalJobs;
      });

      const isJobUnit = unit === 'งาน' || (crit.includes('3.') || crit.includes('4') || crit.includes('C02.2') || crit.includes('TECO'));
      const pct = isJobUnit
        ? (tJobs > 0 ? (cJobs / tJobs) * 100 : 0)
        : (tVal > 0 ? (cVal / tVal) * 100 : 0);

      let critKpi = null;
      if (hasReport && (tVal > 0 || tJobs > 0)) {
        const evalRes = evaluateKpiScore(crit, state.filters.month, pct);
        if (evalRes) critKpi = evalRes.level;
      }
      const roundedCritKpi = critKpi || 1;
      const isActive = state.filters.criteria === crit;

      html += `
        <div class="criteria-card ${isActive ? 'active' : ''}" style="cursor:pointer;" onclick="window.selectCriteriaFilter('${escapeHtml(crit)}')">
          <div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
              <span class="badge-pea-tag">${crit.split(' ')[0]} ${crit.split(' ')[1] || ''}</span>
            </div>
            <div class="criteria-name">${escapeHtml(crit)}</div>
            <div style="font-size:0.75rem; color:var(--text-dim); margin-bottom:0.5rem;">
              หน่วยวัด: <strong>${unit}</strong>
            </div>
          </div>
          
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
              <span style="color:var(--text-muted);">ยอดรวม:</span>
              <strong>${isJobUnit ? formatNumber(tJobs) + ' งาน' : formatCurrencyShort(tVal)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.25rem;">
              <span style="color:var(--text-muted);">ปิดแล้ว:</span>
              <strong class="text-gold">${isJobUnit ? formatNumber(cJobs) + ' งาน' : formatCurrencyShort(cVal)}</strong>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:0.4rem;">
              <span style="color:var(--text-muted);">คงเหลือ:</span>
              <strong style="color:${rVal > 0 ? 'var(--status-danger)' : 'var(--text-dim)'};">${isJobUnit ? formatNumber(tJobs - cJobs) + ' งาน' : formatCurrencyShort(rVal)}</strong>
            </div>

            <div class="progress-track">
              <div class="progress-fill ${pct >= 100 ? 'fill-success' : (pct >= 60 ? 'fill-warning' : 'fill-danger')}" style="width:${Math.min(100, pct)}%"></div>
            </div>
            <div style="text-align:right; font-size:0.75rem; color:var(--text-dim); margin-top:0.25rem;">
              ปิดแล้ว ${pct.toFixed(2)}%
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  window.selectCriteriaFilter = function (crit) {
    state.filters.criteria = state.filters.criteria === crit ? 'ALL' : crit;
    const sel = document.getElementById('filterCriteria');
    if (sel) sel.value = state.filters.criteria;

    filterData();
    renderAll();
  };

  window.selectOfficeFilter = function (office) {
    state.filters.office = state.filters.office === office ? 'ALL' : office;
    const sel = document.getElementById('filterOffice');
    if (sel) sel.value = state.filters.office;

    filterData();
    renderAll();
  };

  // ==========================================
  // 8. CHARTS RENDERING (DASHBOARD)
  // ==========================================
  function renderDashboardCharts() {
    renderCriteriaComparisonBar();
    renderRadarProvincialKpi();
    renderMonthlyTimelineChart();
    renderMonthlyAmountTimelineChart();
    renderOfficePercentBarChart();
  }

  // ==========================================
  // 8b. OFFICE PERCENT BAR CHART (กฟฟ. vs % เกณฑ์ปิดงาน)
  // ==========================================

  // Criteria list for the bar chart dropdown
  const OFFICE_CHART_CRITS = [
    { label: 'เลือกทั้งหมด', value: 'ALL' },
    { label: 'ข้อ 1.1 งบ C.1 ก่อน 69', value: 'ข้อ 1.1 งบ C.1 ก่อน 69' },
    { label: 'ข้อ 1.2 งบ I , P ก่อนปี 68', value: 'ข้อ 1.2 งบ I , P ก่อนปี 68' },
    { label: 'ข้อ 1.3 งบ I , P ก่อนปี 69', value: 'ข้อ 1.3 งบ I , P ก่อนปี 69' },
    { label: 'ข้อ 2.1 งบ C.1 ปี 69', value: 'ข้อ 2.1 งบ C.1 ปี 69' },
    { label: 'ข้อ 2.2 งบ I , P ปี 69', value: 'ข้อ 2.2 งบ I , P ปี 69' },
    { label: 'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)', value: 'ข้อ 3.1 TECO D2 (1มี.ค.-31พ.ค.)' },
    { label: 'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)', value: 'ข้อ 3.2 TECO D2(1มิ.ย.-31ส.ค.)' },
    { label: 'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)', value: 'ข้อ 3.3 TECO D2(1ก.ย.-31ธ.ค.)' },
    { label: 'ข้อ 3.1 TECO D2', value: 'ข้อ 3.1 TECO D2' },
    { label: 'ข้อ 3.2 TECO D2', value: 'ข้อ 3.2 TECO D2' },
    { label: 'ข้อ 3.3 TECO D2', value: 'ข้อ 3.3 TECO D2' },
    { label: 'ข้อ 4 งบ C02.2 ปี 69', value: 'ข้อ 4 งบ C02.2 ปี 69' },
    { label: 'ข้อ5 งานบ้านและที่ดินจัดสรร', value: 'ข้อ5 งานบ้านและที่ดินจัดสรร' }
  ];

  // State for the office bar chart controls
  const officeBarState = {
    criteria: 'ข้อ 1.1 งบ C.1 ก่อน 69',
    province: 'ALL',
    sort: 'pct-desc'
  };

  function initBarChartCriteriaDropdown() {
    const sel = document.getElementById('barChartCriteriaSelect');
    if (!sel) return;
    const presentCrits = new Set(state.allData.map(d => d.criteria).filter(Boolean));
    let availableCrits = [{ label: 'เลือกทั้งหมด', value: 'ALL' }];
    OFFICE_CHART_CRITS.forEach(c => {
      if (c.value !== 'ALL' && presentCrits.has(c.value)) {
        availableCrits.push(c);
      }
    });
    presentCrits.forEach(c => {
      if (!availableCrits.some(ac => ac.value === c) && c !== 'ALL') {
        availableCrits.push({ label: c, value: c });
      }
    });
    if (availableCrits.length <= 1) availableCrits = OFFICE_CHART_CRITS;

    sel.innerHTML = availableCrits.map(c =>
      `<option value="${escapeHtml(c.value)}">${escapeHtml(c.label)}</option>`
    ).join('');

    if (officeBarState.criteria === 'ALL') {
      sel.value = 'ALL';
    } else if (availableCrits.some(c => c.value === officeBarState.criteria)) {
      sel.value = officeBarState.criteria;
    } else if (officeBarState.criteria && (officeBarState.criteria.includes('3.') || officeBarState.criteria.includes('TECO') || officeBarState.criteria.includes('teco'))) {
      const teco = availableCrits.find(c => c.value.includes('3.') || c.value.includes('TECO') || c.value.includes('teco'));
      if (teco) {
        officeBarState.criteria = teco.value;
        sel.value = teco.value;
      } else if (availableCrits.length > 0) {
        officeBarState.criteria = availableCrits[0].value;
        sel.value = officeBarState.criteria;
      }
    } else if (availableCrits.length > 0) {
      officeBarState.criteria = availableCrits[0].value;
      sel.value = officeBarState.criteria;
    }
  }

  function renderOfficePercentBarChart() {
    const canvas = document.getElementById('officePercentBarChart');
    const listContainer = document.getElementById('officePercentRankingList');
    if (!canvas && !listContainer) return;

    // Sync criteria with top toolbar filter
    const critSel = document.getElementById('barChartCriteriaSelect');
    if (state.filters.criteria) {
      officeBarState.criteria = state.filters.criteria;
      if (critSel) critSel.value = state.filters.criteria;
    } else if (critSel && critSel.value) {
      officeBarState.criteria = critSel.value;
    }

    // Sync province with top toolbar filter
    const provSel = document.getElementById('barChartProvinceSelect');
    if (state.filters.province) {
      officeBarState.province = state.filters.province;
      if (provSel) provSel.value = state.filters.province;
    } else if (provSel && provSel.value) {
      officeBarState.province = provSel.value;
    }

    const sortSel = document.getElementById('barChartSortSelect');
    const selectedCrit = officeBarState.criteria || (critSel ? critSel.value : 'ข้อ 1.1 งบ C.1 ก่อน 69');
    const selectedProv = officeBarState.province || (provSel ? provSel.value : 'ALL');
    const selectedSort = (sortSel && sortSel.value) ? sortSel.value : officeBarState.sort;

    // Update info labels
    const critLabel = document.getElementById('barChartSelectedCriteriaLabel');
    if (critLabel) critLabel.textContent = (selectedCrit === 'ALL') ? 'เลือกทั้งหมด (ทุกเกณฑ์วัด)' : selectedCrit;

    // Determine unit for selected criteria
    const sampleRow = state.allData.find(d => d.criteria === selectedCrit && !d.isSummary);
    const unitLabel = (selectedCrit === 'ALL') ? 'ภาพรวมทั้งหมด (มูลค่า/งาน)' : (sampleRow ? sampleRow.unit : 'มูลค่า (บาท)');
    const isJobUnit = unitLabel === 'งาน' || (selectedCrit && (selectedCrit.includes('3.') || selectedCrit.includes('4') || selectedCrit.includes('C02.2') || selectedCrit.includes('TECO')));
    const unitEl = document.getElementById('barChartSelectedUnitLabel');
    if (unitEl) unitEl.textContent = unitLabel;

    // Also sync to top section's selected filter display
    const topCritName = document.getElementById('next3mSelectedCritName');
    if (topCritName) topCritName.textContent = (selectedCrit === 'ALL') ? 'เลือกทั้งหมด' : selectedCrit;
    const topUnitBadge = document.getElementById('next3mSelectedUnitBadge');
    if (topUnitBadge) topUnitBadge.textContent = unitLabel;

    // Filter offices based on criteria, province, specific office dropdown, and search keyword
    const filterOffice = state.filters.office;
    const searchLower = (state.filters.search || '').trim().toLowerCase();

    // Aggregate: one entry per office
    const officeMap = {};
    state.allData
      .filter(d => {
        if (d.isSummary) return false;
        if (selectedCrit !== 'ALL' && d.criteria !== selectedCrit) return false;
        if (selectedProv !== 'ALL' && d.province !== selectedProv) return false;
        // if (filterOffice && filterOffice !== 'ALL' && d.office !== filterOffice) return false; // Highlight mode: don't filter out other offices
        if (searchLower) {
          const matchOffice = (d.office || '').toLowerCase().includes(searchLower);
          const matchProv = (d.province || '').toLowerCase().includes(searchLower);
          if (!matchOffice && !matchProv) return false;
        }
        return true;
      })
      .forEach(d => {
        if (!officeMap[d.office]) {
          officeMap[d.office] = { office: d.office, province: d.province, total: 0, closed: 0, totalJobs: 0, closedJobs: 0, kpi: d.kpiScore };
        }
        officeMap[d.office].total += d.totalValue;
        officeMap[d.office].closed += d.closedValue;
        officeMap[d.office].totalJobs += d.totalJobs;
        officeMap[d.office].closedJobs += d.closedJobs;
        if (d.kpiScore > officeMap[d.office].kpi) officeMap[d.office].kpi = d.kpiScore;
      });

    // Include offices; filter out offices where รวมงาน AUC == 0 หรือ รวมมูลค่า AUC == 0 (ไม่ต้องแสดงในกราฟ)
    let officeList = Object.values(officeMap)
      .map(o => {
        const isNoWork = (!o.totalJobs || Number(o.totalJobs) <= 0 || !o.total || Number(o.total) <= 0);
        return {
          ...o,
          isNoWork: isNoWork,
          pct: isNoWork
            ? 0
            : (selectedCrit === 'ALL'
                ? (o.total > 0 ? (o.closed / o.total) * 100 : (o.totalJobs > 0 ? (o.closedJobs / o.totalJobs) * 100 : 0))
                : (isJobUnit
                    ? (o.totalJobs > 0 ? (o.closedJobs / o.totalJobs) * 100 : 0)
                    : (o.total > 0 ? (o.closed / o.total) * 100 : 0)))
        };
      });
      // แสดงหน่วยงานที่ไม่มีงานด้วยตามคำขอของผู้ใช้

    // Aggregate overall กฟก.3 (ทั้งหมด) for selected criteria
    const kfgSummaryRow = selectedCrit !== 'ALL' ? state.allData.find(d => 
      d.criteria === selectedCrit && 
      (d.office === 'กฟก.3 ผลรวม' || d.office === 'ผลรวม กฟก.3' || (d.province === 'กฟก.3' && d.isSummary))
    ) : null;

    let kfgTotal = 0, kfgClosed = 0, kfgTotalJobs = 0, kfgClosedJobs = 0, kfgKpi = 0;
    if (kfgSummaryRow && (kfgSummaryRow.totalValue > 0 || kfgSummaryRow.totalJobs > 0)) {
      kfgTotal = kfgSummaryRow.totalValue;
      kfgClosed = kfgSummaryRow.closedValue;
      kfgTotalJobs = kfgSummaryRow.totalJobs;
      kfgClosedJobs = kfgSummaryRow.closedJobs;
      kfgKpi = kfgSummaryRow.kpiScore || 0;
    } else {
      // Fallback: sum all non-summary rows for selectedCrit
      const allRowsForCrit = state.allData.filter(d => !d.isSummary && (selectedCrit === 'ALL' || d.criteria === selectedCrit));
      allRowsForCrit.forEach(d => {
        kfgTotal += d.totalValue || 0;
        kfgClosed += d.closedValue || 0;
        kfgTotalJobs += d.totalJobs || 0;
        kfgClosedJobs += d.closedJobs || 0;
      });
    }

    const kfgIsNoWork = (!kfgTotalJobs || Number(kfgTotalJobs) <= 0 || !kfgTotal || Number(kfgTotal) <= 0);
    const kfgPct = kfgIsNoWork
      ? 0
      : (selectedCrit === 'ALL'
          ? (kfgTotal > 0 ? (kfgClosed / kfgTotal) * 100 : (kfgTotalJobs > 0 ? (kfgClosedJobs / kfgTotalJobs) * 100 : 0))
          : (isJobUnit
              ? (kfgTotalJobs > 0 ? (kfgClosedJobs / kfgTotalJobs) * 100 : 0)
              : (kfgTotal > 0 ? (kfgClosed / kfgTotal) * 100 : 0)));

    if (hasReportForMonth(state.filters.month) && !kfgIsNoWork) {
      const evalRes = evaluateKpiScore(selectedCrit, state.filters.month, kfgPct);
      if (evalRes && evalRes.level) {
        kfgKpi = evalRes.level;
      }
    }
    if (kfgKpi === 0 && kfgSummaryRow && kfgSummaryRow.kpiScore) {
      kfgKpi = kfgSummaryRow.kpiScore;
    }
    if (kfgKpi === 0 && !kfgIsNoWork) {
      const l5Target = getKpiLevel5Target(selectedCrit, (state.filters.month !== undefined && state.filters.month !== 'ALL') ? Number(state.filters.month) : 6);
      kfgKpi = (l5Target !== null && kfgPct >= l5Target) ? 5 : 1;
    }

    const kfgItem = {
      office: 'กฟก.3 (ทั้งหมด)',
      province: 'กฟก.3',
      total: kfgTotal,
      closed: kfgClosed,
      totalJobs: kfgTotalJobs,
      closedJobs: kfgClosedJobs,
      kpi: kfgKpi,
      isNoWork: kfgIsNoWork,
      pct: kfgPct,
      isKfg3Total: true,
      showDividerAfter: false
    };

    // Include กฟก.3 (ทั้งหมด) in officeList to be sorted in ranking order (ไม่ต้องอยู่หน้าสุด)
    // แสดงเฉพาะเมื่อตัวเลือกจังหวัด / กอง เลือกเป็น 'กฟก.3 (ทั้งหมด)' เท่านั้น
    const isProvAll = (selectedProv === 'ALL' || selectedProv === 'กฟก.3' || selectedProv === 'กฟก.3 (ทั้งหมด)');
    const isOfficeAll = (!filterOffice || filterOffice === 'ALL');
    const isSearchMatch = !searchLower || 'กฟก.3 (ทั้งหมด)'.toLowerCase().includes(searchLower) || 'กฟก.3'.includes(searchLower);
    const shouldIncludeKfg = isProvAll && isSearchMatch;

    if (shouldIncludeKfg) {
      officeList.push(kfgItem);
    }

    // Sort: sort active offices (including กฟก.3) based on selectedSort
    if (selectedSort === 'pct-desc') {
      officeList.sort((a, b) => b.pct - a.pct);
    } else if (selectedSort === 'pct-asc') {
      officeList.sort((a, b) => a.pct - b.pct);
    } else {
      officeList.sort((a, b) => a.office.localeCompare(b.office, 'th'));
    }

    const countEl = document.getElementById('barChartCountLabel');
    if (countEl) {
      const branchCount = officeList.filter(o => !o.isKfg3Total).length;
      const hasKfg = officeList.some(o => o.isKfg3Total);
      if (branchCount === 0) {
        countEl.textContent = `(ไม่มีหน่วยงานที่มีงานและมูลค่า AUC)`;
      } else {
        countEl.textContent = hasKfg ? `(กฟก.3 + ${branchCount} หน่วยงาน)` : `(${branchCount} หน่วยงาน)`;
      }
      const topScope = document.getElementById('next3mSelectedScopeText');
      if (topScope) topScope.textContent = countEl.textContent;
    }

    const labels = officeList.map(o => o.office);
    const pcts = officeList.map(o => Math.round(o.pct * 10) / 10);
    const cColors = state.chartColors || DEFAULT_CHART_COLORS;
    const isAnyOfficeFiltered = filterOffice && filterOffice !== 'ALL';
    const barColors = officeList.map(o => {
      let color = o.isNoWork ? '#475569' : (o.kpi >= 5 ? cColors.kpiGood : cColors.kpiWarn);
      const isSelected = !isAnyOfficeFiltered || o.office === filterOffice;
      if (!isSelected) {
        // Dim unselected bars (including Kfg3Total) to highlight the selected one
        color = o.isNoWork ? 'rgba(71, 85, 105, 0.2)' : (o.kpi >= 5 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)');
      }
      return color;
    });

    // Sync dots in info strip
    const legendGood = document.getElementById('legendKpiGoodDot');
    if (legendGood) legendGood.style.background = cColors.kpiGood;
    const legendWarn = document.getElementById('legendKpiWarnDot');
    if (legendWarn) legendWarn.style.background = cColors.kpiWarn;

    // Dynamically update KFG badge in legend based on KPI grade (แสดงเฉพาะเมื่อมี กฟก.3 ทั้งหมด ในกราฟ)
    const legendKfgBadge = document.getElementById('legendKfgBadge');
    const legendKfgDot = document.getElementById('legendKfgDot');
    const legendKfgText = document.getElementById('legendKfgText');
    if (legendKfgBadge && legendKfgDot && legendKfgText) {
      const hasKfg = officeList.some(o => o.isKfg3Total);
      if (hasKfg) {
        legendKfgBadge.style.display = 'inline-flex';
        const isGood = kfgKpi >= 5;
        legendKfgBadge.style.background = isGood ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
        legendKfgBadge.style.borderColor = isGood ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)';
        legendKfgDot.style.background = isGood 
          ? 'repeating-linear-gradient(45deg, #10B981, #10B981 3px, #34D399 3px, #34D399 6px)' 
          : 'repeating-linear-gradient(45deg, #EF4444, #EF4444 3px, #F87171 3px, #F87171 6px)';
        legendKfgDot.style.boxShadow = isGood ? '0 0 8px rgba(16, 185, 129, 0.9)' : '0 0 8px rgba(239, 68, 68, 0.9)';
        legendKfgText.style.color = isGood ? '#6EE7B7' : '#FCA5A5';
        legendKfgText.textContent = `★ กฟก.3 (ทั้งหมด) [${isGood ? 'KPI 5 ยอดเยี่ยม' : 'KPI 1-4 ต้องเร่งรัด'}]`;
      } else {
        legendKfgBadge.style.display = 'none';
      }
    }

    // Calculate Level 5 KPI Target Lines (%) based on selected criteria, evaluation month, next 3 months, and December (ธ.ค.)
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const mIdx = (typeof state.filters.month === 'number') ? state.filters.month : 7;

    const rawTargetLines = [];

    // 1. Current selected month (เดือนล่าสุด)
    const level5Target = getKpiLevel5Target(selectedCrit, mIdx);
    if (level5Target !== null) {
      rawTargetLines.push({
        monthIdx: mIdx,
        value: level5Target,
        monthName: monthNames[mIdx],
        color: cColors.planLine || '#FFB81C',
        textColor: '#FFD25A'
      });
    }

    // 2. Next month (+1)
    if (mIdx + 1 <= 11) {
      const next1Target = getKpiLevel5Target(selectedCrit, mIdx + 1);
      if (next1Target !== null) {
        rawTargetLines.push({
          monthIdx: mIdx + 1,
          value: next1Target,
          monthName: monthNames[mIdx + 1],
          color: (mIdx + 1 === 11) ? '#C084FC' : '#34D399',
          textColor: (mIdx + 1 === 11) ? '#F3E8FF' : '#6EE7B7'
        });
      }
    }

    // 3. Next 2nd month (+2)
    if (mIdx + 2 <= 11) {
      const next2Target = getKpiLevel5Target(selectedCrit, mIdx + 2);
      if (next2Target !== null) {
        rawTargetLines.push({
          monthIdx: mIdx + 2,
          value: next2Target,
          monthName: monthNames[mIdx + 2],
          color: (mIdx + 2 === 11) ? '#C084FC' : '#F472B6',
          textColor: (mIdx + 2 === 11) ? '#F3E8FF' : '#F9A8D4'
        });
      }
    }

    // 4. Month ธ.ค. (สิ้นปี 2569) - แสดง 2 เดือนถัดไป (+1, +2) และเดือน ธ.ค.
    const decIdx = 11; // ธ.ค. (index 11, monthNum 12)
    if (decIdx > mIdx + 2) {
      const decTarget = getKpiLevel5Target(selectedCrit, decIdx);
      if (decTarget !== null) {
        rawTargetLines.push({
          monthIdx: decIdx,
          value: decTarget,
          monthName: 'ธ.ค.',
          color: '#C084FC',
          textColor: '#F3E8FF'
        });
      }
    }

    // Deduplicate / merge any target lines that share the exact same target percent value (ทศนิยม 2 ตำแหน่ง)
    const targetLines = [];
    rawTargetLines.forEach(tl => {
      const valStr = `${Number(tl.value).toFixed(2)}%`;
      const existing = targetLines.find(t => Math.abs(t.value - tl.value) < 0.001);
      if (existing) {
        existing.label = `${existing.label.replace(` (${valStr})`, '')}, ${tl.monthName} (${valStr})`;
      } else {
        targetLines.push({
          ...tl,
          label: `${tl.monthName} (${valStr})`
        });
      }
    });

    // ปรับระยะแท่งกราฟ: leftPad ให้ป้ายสถิติด้านซ้ายมีที่ว่าง, rightPad ชิดขอบอย่างสมดุล, bottomPad ป้องกันชื่อหน่วยงานโดนบัง/โดนตัด
    const leftPad = targetLines.length > 0 ? 68 : 34;
    const rightPad = 14;
    const bottomPad = 132;

    // Target line badges removed per user request
    const targetBadgeContainer = document.getElementById('barChartTargetLinesBadgeContainer');
    if (targetBadgeContainer) {
      targetBadgeContainer.innerHTML = '';
    }

    // Update calculation formula breakdown panel if present
    updateCalcFormulaPanel(selectedCrit, mIdx, level5Target);

    const barValueFormatter = (v, gIdx) => {
      const o = officeList[gIdx];
      if (o && o.isNoWork) return 'ไม่มีงาน';
      return (v >= 100 ? '100%' : (v % 1 === 0 ? v.toFixed(0) + '%' : v.toFixed(1) + '%'));
    };

    if (!state.charts.officeBar) {
      state.charts.officeBar = new PeaChart(canvas, {
        type: 'bar',
        barRatio: 0.92,
        barGap: 1.5,
        padding: { top: 46, right: rightPad, bottom: bottomPad, left: leftPad },
        formatY: (v) => `${v}%`,
        yMax: 100,
        gridSteps: 2, // Only 0%, 50%, 100%
        rotateXLabels: true,
        xLabelFontSize: 12.5,
        xLabelFontWeight: '600',
        barFontSize: 9.8,
        showBarValues: true,
        barValuePosition: 'top',
        forceBarValueAbove: true,
        barValueColor: '#FFD25A',
        showGridLines: true,
        formatBarValue: barValueFormatter,
        targetLines: targetLines,
        showLegend: false,
        onClick: (item) => {
          if (item && item.label && typeof window.selectSidebarOffice === 'function') {
            if (item.extra && item.extra.isKfg3Total) {
              window.selectSidebarOffice('ALL');
            } else {
              window.selectSidebarOffice(item.label);
            }
          }
        }
      });
    } else {
      state.charts.officeBar.options.yMax = 100;
      state.charts.officeBar.options.gridSteps = 2; // Only 0%, 50%, 100%
      state.charts.officeBar.options.rotateXLabels = true;
      state.charts.officeBar.options.xLabelFontSize = 12.5;
      state.charts.officeBar.options.xLabelFontWeight = '600';
      state.charts.officeBar.options.barFontSize = 9.8;
      state.charts.officeBar.options.barRatio = 0.92;
      state.charts.officeBar.options.barGap = 1.5;
      state.charts.officeBar.options.showBarValues = true;
      state.charts.officeBar.options.barValuePosition = 'top';
      state.charts.officeBar.options.forceBarValueAbove = true;
      state.charts.officeBar.options.barValueColor = '#FFD25A';
      state.charts.officeBar.options.showGridLines = true;
      state.charts.officeBar.options.formatBarValue = barValueFormatter;
      state.charts.officeBar.options.targetLines = targetLines;
      delete state.charts.officeBar.options.targetLine;
      state.charts.officeBar.options.padding = { top: 46, right: rightPad, bottom: bottomPad, left: leftPad };
    }

    state.charts.officeBar.update(
      {
        labels,
        datasets: [
          {
            label: '% เกณฑ์ปิดงาน',
            data: pcts,
            colors: barColors,
            extra: officeList.map(o => {
              const isSelected = !isAnyOfficeFiltered || o.office === filterOffice;
              return {
                isNoWork: o.isNoWork,
                isKfg3Total: o.isKfg3Total,
                isSelected: isSelected,
                isDimmed: !isSelected,
                showDividerAfter: o.showDividerAfter,
                closed: o.isNoWork ? 'ไม่มีงาน' : (isJobUnit ? o.closedJobs.toLocaleString('th-TH') + ' งาน' : (o.closed / 1000000).toFixed(2) + ' ลบ.'),
                total: o.isNoWork ? 'ไม่มีงาน' : (isJobUnit ? o.totalJobs.toLocaleString('th-TH') + ' งาน' : (o.total / 1000000).toFixed(2) + ' ลบ.'),
                kpi: o.isNoWork ? '-' : o.kpi
              };
            })
          }
        ]
      },
      {
        yMax: 100,
        rotateXLabels: true,
        xLabelFontSize: 12.5,
        xLabelFontWeight: '600',
        barFontSize: 9.8,
        barRatio: 0.92,
        barGap: 1.5,
        showBarValues: true,
        barValuePosition: 'top',
        forceBarValueAbove: true,
        barValueColor: '#FFD25A',
        showGridLines: true,
        formatBarValue: barValueFormatter,
        targetLines: targetLines,
        padding: { top: 46, right: rightPad, bottom: bottomPad, left: leftPad },
        showLegend: false
      }
    );

    // AI Executive Analysis for failing KPI units (KPI 1 - 4 & % closed < Level 5 target)
    renderBarChartAiAnalysis(selectedCrit, mIdx, level5Target, officeList, isJobUnit);
  }

  // =========================================================================
  // CALCULATION FORMULA & KPI BREAKDOWN CONTROLLER (สูตรการคำนวณ %ปิดงาน และ %KPI)
  // =========================================================================

  let isCalcFormulaCollapsed = true;

  window.toggleCalcFormula = function (forcedState) {
    const panel = document.getElementById('calcFormulaPanel');
    const btn = document.getElementById('btnToggleCalcFormula');
    const btnText = document.getElementById('btnToggleCalcFormulaText');
    if (!panel) return;

    if (typeof forcedState === 'boolean') {
      isCalcFormulaCollapsed = !forcedState;
    } else {
      isCalcFormulaCollapsed = !isCalcFormulaCollapsed;
    }

    if (isCalcFormulaCollapsed) {
      panel.style.display = 'none';
      if (btn) btn.classList.remove('active');
      if (btnText) btnText.textContent = 'สูตรคำนวณ (เลือกทั้งหมด)';
      if (typeof showToast === 'function') {
        showToast('ซ่อนกล่องสูตรการคำนวณแล้ว (คลิกปุ่มเพื่อแสดงใหม่)', 'info');
      }
    } else {
      panel.style.display = 'block';
      if (btn) btn.classList.add('active');
      if (btnText) btnText.textContent = 'ซ่อนสูตรคำนวณ';
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      if (typeof showToast === 'function') {
        showToast('แสดงสูตรการคำนวณ %ปิดงาน และ %KPI เรียบร้อยแล้ว', 'success');
      }
    }
  };

  function updateCalcFormulaPanel(crit, mIdx, level5Target) {
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const curMName = monthNames[mIdx] || 'ส.ค.';
    const chip = document.getElementById('calcFormulaMonthChip');
    if (chip) chip.textContent = `ประจำเดือน ${curMName} 2569`;

    const curBadge = document.getElementById('calcCurMonthBadge');
    if (curBadge) curBadge.textContent = curMName;

    const curVal = document.getElementById('calcCurMonthVal');
    if (curVal && level5Target !== null && level5Target !== undefined) {
      curVal.textContent = `${Number(level5Target).toFixed(2)}%`;
    }

    const curCalc = document.getElementById('calcCurMonthCalc');
    if (curCalc) {
      if (crit === 'ALL' || !crit) {
        if (mIdx === 7) { // ส.ค.
          curCalc.textContent = '(71+70+60+45+30+100+71+30) ÷ 8 = 477 ÷ 8';
        } else if (mIdx === 8) { // ก.ย.
          curCalc.textContent = '(80+75+65+50+35+100+80+35) ÷ 8 = 520 ÷ 8';
        } else if (mIdx === 9) { // ต.ค.
          curCalc.textContent = '(90+80+70+60+40+100+90+40) ÷ 8 = 570 ÷ 8';
        } else if (mIdx === 11) { // ธ.ค.
          curCalc.textContent = '(100+90+80+70+50+100+100+50) ÷ 8 = 640 ÷ 8';
        } else {
          curCalc.textContent = `เฉลี่ยเป้าหมาย Level 5 ของทุกเกณฑ์ในเดือน ${curMName}`;
        }
      } else {
        curCalc.textContent = `เป้าหมาย Level 5 ของเกณฑ์ "${crit}" ในเดือน ${curMName}`;
      }
    }
  }

  // =========================================================================
  // AI EXECUTIVE ANALYSIS FOR FAILING KPI UNITS IN SELECTED CRITERIA (KPI 1 - 4)
  // =========================================================================

  let isBarAiSpeaking = false;
  let lastBarAiTextForCopy = '';
  let lastBarAiTextForSpeech = '';
  let barAiCollapsed = false;

  window.toggleBarAiAnalysis = function () {
    const panel = document.getElementById('barChartAiAnalysisPanel');
    if (!panel) return;
    barAiCollapsed = !barAiCollapsed;
    panel.classList.toggle('is-collapsed', barAiCollapsed);
    const btn = document.getElementById('btnToggleBarAiAnalysis');
    if (btn) {
      btn.classList.toggle('active', !barAiCollapsed);
    }
  };

  window.toggleBarAiSpeech = function () {
    if (!('speechSynthesis' in window)) {
      showToast('เบราว์เซอร์ของท่านไม่รองรับการสังเคราะห์เสียงพูด (Speech Synthesis)', 'warning');
      return;
    }
    const btn = document.getElementById('btnBarAiSpeech');
    const btnText = document.getElementById('barAiSpeechBtnText');

    if (isBarAiSpeaking) {
      window.speechSynthesis.cancel();
      isBarAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
      return;
    }

    if (!lastBarAiTextForSpeech) {
      showToast('ไม่พบข้อความสำหรับอ่านออกเสียง', 'warning');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastBarAiTextForSpeech);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const thVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
    if (thVoice) utterance.voice = thVoice;

    utterance.onstart = () => {
      isBarAiSpeaking = true;
      if (btn) btn.classList.add('active-speaking');
      if (btnText) btnText.textContent = 'หยุดอ่าน';
    };

    utterance.onend = () => {
      isBarAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
    };

    utterance.onerror = () => {
      isBarAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
    };

    window.speechSynthesis.speak(utterance);
  };

  window.copyBarAiText = function () {
    if (!lastBarAiTextForCopy) {
      showToast('ยังไม่มีข้อมูลการวิเคราะห์สำหรับคัดลอก', 'warning');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastBarAiTextForCopy).then(() => {
        showToast('คัดลอกบทวิเคราะห์ AI รายหน่วยงานเรียบร้อยแล้ว นำไปส่งต่อได้ทันที', 'success');
      }).catch(() => {
        fallbackCopy(lastBarAiTextForCopy);
      });
    } else {
      fallbackCopy(lastBarAiTextForCopy);
    }
  };

  function getAiDirectiveForOffice(crit, office, kpi, gapStr, isJobUnit) {
    const c = (crit || '').toLowerCase();
    if (c.includes('c.1 ก่อน 69') || c.includes('1.1')) {
      return `ให้ ${office} จัดทีมเฉพาะกิจร่วมระหว่างแผนกก่อสร้างและบัญชี ตรวจสอบงานที่จ่ายไฟแล้วเสร็จแต่ยังค้างสถานะ AUC เพื่อทำ Settlement และ TECO ตัดโอนเป็นสินทรัพย์ถาวร (Fixed Asset) ในระบบ SAP ด่วนที่สุดเพื่อลดมูลค่างบค้างปิดลง ${gapStr} ให้บรรลุเป้าหมาย`;
    } else if (c.includes('i , p ก่อน') || c.includes('1.2') || c.includes('1.3')) {
      return `เร่งรัดตรวจรับพัสดุและส่งมอบงานโครงการงบ I และ P ค้างเก่า เคลียร์รายการคืนพัสดุและติดตามงวดงานสุดท้ายกับผู้รับจ้าง เพื่อบันทึกปิดโครงการและปลดภาระผูกพันคงค้างอีก ${gapStr}`;
    } else if (c.includes('2.1') || c.includes('2.2') || c.includes('ปี 69')) {
      return `เร่งผลักดันหน้างานโครงการปี 69 ให้เป็นไปตาม Milestone ประจำเดือน ติดตามใบสั่งซื้อสั่งจ้าง (PO) และการตรวจรับพัสดุก่อสร้างให้ทันรอบเบิกจ่ายอีก ${gapStr}`;
    } else if (c.includes('teco') || c.includes('d2') || c.includes('3.')) {
      return `ตรวจสอบ Order D2 ในระบบ SAP ที่สถานะค้างที่ REL/CRTD ให้เจ้าหน้าที่เร่งบันทึกยืนยันเวลาทำงาน (CNF) และกดปิดสถานะทางเทคนิค (TECO) ทันที เพื่อเก็บยอดงานที่เหลืออีก ${gapStr}`;
    } else if (c.includes('c02.2') || c.includes('ข้อ 4')) {
      return `ติดตามแผนบำรุงรักษาระบบจำหน่าย (PM) ประสานทีมปฏิบัติการให้เร่งบันทึกผลงานการซ่อมบำรุงและปิด Job บัญชี C02.2 ในระบบให้ครบถ้วน ${gapStr}`;
    } else {
      return `จัดประชุม War Room ติดตามงานค้างปิดรายสัปดาห์ มอบหมายผู้รับผิดชอบรายโครงการประสานงานระหว่างฝ่ายเทคนิคและฝ่ายบัญชีเพื่อปลดล็อกงานค้าง ${gapStr} ให้สำเร็จตามรอบ`;
    }
  }

  function renderBarChartAiAnalysis(selectedCrit, mIdx, level5Target, officeList, isJobUnit) {
    const panel = document.getElementById('barChartAiAnalysisPanel');
    if (!panel || panel.style.display === 'none') return;

    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const monthFullNames = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
      'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
    ];
    const mName = monthNames[mIdx] || 'ปัจจุบัน';
    const mFullName = monthFullNames[mIdx] || mName;

    // Filter out KFG.3 summary row and non-work offices (รวมงาน AUC <= 0 หรือ รวมมูลค่า AUC <= 0 ไม่ต้องนำมาวิเคราะห์ AI)
    const branchOffices = officeList.filter(o => 
      !o.isKfg3Total && 
      !o.isNoWork && 
      (Number(o.totalJobs) || 0) > 0 && 
      (Number(o.total) || 0) > 0
    );

    // KFG summary item (ต้องมีทั้งงานและมูลค่า > 0)
    const kfgItem = officeList.find(o => 
      o.isKfg3Total && 
      !o.isNoWork && 
      (Number(o.totalJobs) || 0) > 0 && 
      (Number(o.total) || 0) > 0
    );
    const kfgIsFailing = kfgItem && (kfgItem.kpi < 5 || (level5Target !== null && kfgItem.pct < (level5Target - 0.05)));

    const badge = document.getElementById('barAiFailingCountBadge');

    // Maintain collapsed state
    if (barAiCollapsed) {
      panel.classList.add('is-collapsed');
    } else {
      panel.classList.remove('is-collapsed');
    }

    // กรณีไม่มีหน่วยงานใดที่มีงานหรือมูลค่า AUC (รวมงาน AUC = 0 หรือ รวมมูลค่า AUC = 0 ทุกแห่ง)
    if (branchOffices.length === 0) {
      if (badge) {
        badge.textContent = 'ไม่มีงาน AUC ⚪';
        badge.className = 'ai-warning-count-dot';
        badge.style.background = 'rgba(100, 116, 139, 0.25)';
        badge.style.borderColor = 'rgba(148, 163, 184, 0.5)';
        badge.style.color = '#CBD5E1';
      }

      lastBarAiTextForCopy = `ℹ️ เกณฑ์ ${selectedCrit} ไม่มีข้อมูลงานหรือมูลค่า AUC (รวมงาน AUC = 0 หรือ รวมมูลค่า AUC = 0) จึงไม่แสดงในกราฟและบทวิเคราะห์`;
      lastBarAiTextForSpeech = `เกณฑ์ ${selectedCrit} ไม่มีข้อมูลงานหรือมูลค่า AUC สำหรับวิเคราะห์ค่ะ`;

      panel.innerHTML = `
        <div class="bar-ai-header">
          <div class="bar-ai-title-group">
            <div class="bar-ai-icon-badge" style="background:rgba(100, 116, 139, 0.3); border-color:rgba(148, 163, 184, 0.5); box-shadow:none;">🤖</div>
            <div>
              <div class="bar-ai-title-text">
                <span>บทวิเคราะห์ AI เจาะลึกหน่วยงานที่ตกเกณฑ์ KPI (ระดับ 1 - 4)</span>
                <span class="bar-ai-chip" style="background:rgba(100, 116, 139, 0.2); border-color:rgba(148, 163, 184, 0.4); color:#CBD5E1;">ไม่มีงาน AUC</span>
              </div>
              <div class="bar-ai-subtitle">
                เกณฑ์ที่ประเมิน: <strong style="color:var(--pea-gold-400);">${escapeHtml(selectedCrit)}</strong> &nbsp;|&nbsp; 
                เป้าหมาย KPI ระดับ 5: <strong style="color:#6EE7B7;">≥ ${level5Target !== null ? level5Target + '%' : '-'}</strong> (เดือน${mName})
              </div>
            </div>
          </div>
          <div class="ai-panel-tools">
            <button class="ai-tool-btn" onclick="window.toggleBarAiAnalysis()" title="ซ่อน/แสดง บทวิเคราะห์">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
              <span>ย่อ/ขยาย</span>
            </button>
          </div>
        </div>
        <div class="bar-ai-body">
          <div style="display:flex; align-items:center; gap:0.85rem; background:rgba(71, 85, 105, 0.2); border:1px solid rgba(148, 163, 184, 0.35); border-radius:10px; padding:1.1rem 1.25rem; margin-top:0.75rem;">
            <span style="font-size:1.6rem; line-height:1;">ℹ️</span>
            <div>
              <div style="font-size:0.95rem; font-weight:700; color:#E2E8F0; margin-bottom:0.25rem;">ไม่มีข้อมูลงานหรือมูลค่า AUC ที่ต้องวิเคราะห์</div>
              <div style="font-size:0.8rem; color:#94A3B8; line-height:1.45;">
                ในเกณฑ์ <strong>${escapeHtml(selectedCrit)}</strong> ทุกหน่วยงานมี รวมงาน AUC = 0 หรือ รวมมูลค่า AUC = 0 จึงไม่นำมาแสดงผลในกราฟแท่งและบทวิเคราะห์ AI ตามเงื่อนไข
              </div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    // Failing offices: kpi 1-4 OR pct < level5Target
    const targetVal = level5Target !== null ? level5Target : 100;
    const failingOffices = branchOffices.filter(o => {
      const isKpiFailing = (o.kpi !== undefined && o.kpi !== null && o.kpi >= 1 && o.kpi < 5);
      const isPctBelowL5 = (level5Target !== null) ? (o.pct < (level5Target - 0.05)) : false;
      return isKpiFailing || isPctBelowL5;
    });

    // Sort failing offices by pct ascending (most critical first)
    failingOffices.sort((a, b) => a.pct - b.pct);

    // Update button badge on bar chart card header
    if (badge) {
      badge.style.background = '';
      badge.style.borderColor = '';
      badge.style.color = '';
      if (failingOffices.length > 0) {
        badge.textContent = `${failingOffices.length} แห่ง 🔴`;
        badge.className = 'ai-warning-count-dot';
      } else {
        badge.textContent = 'ผ่านครบ 100% 🟢';
        badge.className = 'ai-warning-count-dot is-success';
      }
    }

    let failingCardsHtml = '';
    let copyListText = '';
    let totalGapValue = 0;
    let totalGapJobs = 0;

    failingOffices.forEach((o, idx) => {
      const pctFormatted = o.pct.toFixed(1);
      const deficitPct = Math.max(0, targetVal - o.pct).toFixed(1);

      let totalStr = '';
      let closedStr = '';
      let remainStr = '';
      let gapStr = '';
      let gapDesc = '';

      if (!isJobUnit) {
        // Currency (Baht)
        const totalValBaht = o.total || 0;
        const closedValBaht = o.closed || 0;
        const remainValBaht = Math.max(0, totalValBaht - closedValBaht);
        const requiredToL5Baht = (targetVal / 100) * totalValBaht;
        const needBaht = Math.max(0, requiredToL5Baht - closedValBaht);
        totalGapValue += needBaht;

        totalStr = (totalValBaht / 1000000).toFixed(2) + ' ลบ.';
        closedStr = (closedValBaht / 1000000).toFixed(2) + ' ลบ.';
        remainStr = (remainValBaht / 1000000).toFixed(2) + ' ลบ.';
        gapStr = needBaht >= 1000000
          ? (needBaht / 1000000).toFixed(2) + ' ล้านบาท'
          : Math.round(needBaht).toLocaleString('th-TH') + ' บาท';

        gapDesc = `ต้องเร่งปิดงานเพิ่มอีกอย่างน้อย <strong>${gapStr}</strong> (คิดเป็น ${(totalValBaht > 0 ? (needBaht / totalValBaht * 100).toFixed(1) : '0')}%) เพื่อยกระดับสู่ KPI ระดับ 5`;
      } else {
        // Jobs (งาน)
        const totalJ = o.totalJobs || 0;
        const closedJ = o.closedJobs || 0;
        const remainJ = Math.max(0, totalJ - closedJ);
        const requiredToL5Jobs = Math.ceil((targetVal / 100) * totalJ);
        const needJobs = Math.max(0, requiredToL5Jobs - closedJ);
        totalGapJobs += needJobs;

        totalStr = totalJ.toLocaleString('th-TH') + ' งาน';
        closedStr = closedJ.toLocaleString('th-TH') + ' งาน';
        remainStr = remainJ.toLocaleString('th-TH') + ' งาน';
        gapStr = needJobs.toLocaleString('th-TH') + ' งาน';

        gapDesc = `ต้องเร่งปิด Job งานเพิ่มอีกอย่างน้อย <strong>${gapStr}</strong> เพื่อยกระดับสู่ KPI ระดับ 5`;
      }

      let kpiBadgeHtml = '';
      if (o.kpi === 1) {
        kpiBadgeHtml = `<span class="kpi-status-badge" style="background:rgba(239,68,68,0.25); border-color:#EF4444; color:#FCA5A5;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#EF4444; box-shadow:0 0 6px #EF4444;"></span> KPI ระดับ 1 🔴 (วิกฤต)</span>`;
      } else if (o.kpi === 2) {
        kpiBadgeHtml = `<span class="kpi-status-badge" style="background:rgba(249,115,22,0.25); border-color:#F97316; color:#FDBA74;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#F97316;"></span> KPI ระดับ 2 🟠 (ต่ำมาก)</span>`;
      } else if (o.kpi === 3) {
        kpiBadgeHtml = `<span class="kpi-status-badge" style="background:rgba(234,179,8,0.2); border-color:#EAB308; color:#FDE047;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#EAB308;"></span> KPI ระดับ 3 🟡 (ปานกลาง)</span>`;
      } else if (o.kpi === 4) {
        kpiBadgeHtml = `<span class="kpi-status-badge" style="background:rgba(59,130,246,0.2); border-color:#3B82F6; color:#93C5FD;"><span style="display:inline-block; width:7px; height:7px; border-radius:50%; background:#3B82F6;"></span> KPI ระดับ 4 🔵 (ใกล้เป้า)</span>`;
      } else {
        kpiBadgeHtml = `<span class="kpi-status-badge">KPI ต่ำกว่าระดับ 5</span>`;
      }

      const aiDirective = getAiDirectiveForOffice(selectedCrit, o.office, o.kpi, gapStr, isJobUnit);

      failingCardsHtml += `
        <div class="failing-unit-card">
          <div class="failing-card-header">
            <div class="unit-title-group">
              <span class="unit-name">${escapeHtml(o.office)}</span>
              <span class="unit-prov-badge">จ.${escapeHtml(o.province)}</span>
            </div>
            ${kpiBadgeHtml}
          </div>

          <div class="failing-metrics-row">
            <div class="metric-box">
              <div class="metric-label">% ปิดงานจริง</div>
              <div class="metric-value" style="color:#EF4444;">${pctFormatted}%</div>
              <div class="metric-sub" style="color:#FCA5A5;">(ขาดอีก -${deficitPct}%)</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">เป้าหมายระดับ 5</div>
              <div class="metric-value" style="color:var(--pea-gold-400);">${targetVal}%</div>
              <div class="metric-sub">รอบเดือน${mName}</div>
            </div>
            <div class="metric-box">
              <div class="metric-label">${isJobUnit ? 'งานปิดแล้ว / ทั้งหมด' : 'มูลค่าปิด / ทั้งหมด'}</div>
              <div class="metric-value">${closedStr}</div>
              <div class="metric-sub">จาก ${totalStr} (คงค้าง ${remainStr})</div>
            </div>
          </div>

          <div class="target-action-box">
            <div class="target-action-icon">🎯</div>
            <div>
              <div class="target-action-title">เป้าหมายที่ต้องทำให้ผ่าน KPI ระดับ 5:</div>
              <div class="target-action-desc">${gapDesc}</div>
            </div>
          </div>

          <div class="ai-recommendation-box">
            <div class="ai-rec-header">
              <span style="font-size:0.85rem;">🤖</span>
              <span class="ai-rec-title">ข้อเสนอแนะเชิงรุกจาก AI:</span>
            </div>
            <div class="ai-rec-text">${aiDirective}</div>
          </div>
        </div>
      `;

      copyListText += `${idx + 1}. ${o.office} (จ.${o.province})\n`;
      copyListText += `   • ผลงานจริง: ${pctFormatted}% | เป้าหมายระดับ 5: ${targetVal}% (ขาดอีก ${deficitPct}%)\n`;
      copyListText += `   • สถานะ: KPI ระดับ ${o.kpi || '-'} | คงค้าง: ${remainStr}\n`;
      copyListText += `   • ต้องเร่งปิดงานเพิ่ม: ${gapStr} เพื่อบรรลุ KPI ระดับ 5\n`;
      copyListText += `   • ข้อเสนอแนะ AI: ${aiDirective.replace(/<[^>]*>?/gm, '')}\n\n`;
    });

    let speechText = '';
    let copyText = '';

    if (failingOffices.length > 0) {
      const topFailing = failingOffices[0];
      speechText = `รายงานบทวิเคราะห์ AI เกณฑ์ ${selectedCrit} ประจำเดือน${mFullName} พบหน่วยงานตกเกณฑ์ KPI ระดับหนึ่งถึงสี่ จำนวน ${failingOffices.length} หน่วยงาน จากทั้งหมด ${branchOffices.length} หน่วยงาน โดยหน่วยงานที่ต้องเร่งรัดสูงสุดคือ ${topFailing.office} มีผลงานร้อยละ ${topFailing.pct.toFixed(1)} ขอให้เร่งรัดปิดงานตามข้อเสนอแนะค่ะ`;

      copyText = `📊 บทวิเคราะห์ AI หน่วยงานที่ตกเกณฑ์ KPI (ระดับ 1 - 4)\n`;
      copyText += `🎯 เกณฑ์วัด: ${selectedCrit}\n`;
      copyText += `📅 รอบประเมิน: เดือน${mFullName} (เป้าหมาย KPI ระดับ 5 = ${level5Target !== null ? level5Target + '%' : '-'})\n`;
      copyText += `⚠️ จำนวนหน่วยงานที่ตกเกณฑ์: ${failingOffices.length} จาก ${branchOffices.length} หน่วยงาน\n\n`;
      if (kfgIsFailing && kfgItem) {
        copyText += `🚨 ภาพรวมเขต กฟก.3 (ทั้งหมด): ได้ ${kfgItem.pct.toFixed(1)}% (KPI ${kfgItem.kpi}) ต่ำกว่าเป้าหมายระดับ 5 เช่นกัน\n\n`;
      }
      copyText += `📋 รายละเอียดหน่วยงานที่ต้องเร่งรัดเป็นรายแห่ง:\n`;
      copyText += copyListText;
      copyText += `📌 สรุปรายงานโดยระบบ AI วิเคราะห์ผลงาน - การไฟฟ้าส่วนภูมิภาค เขต 3 (ภาคกลาง)`;
    } else {
      speechText = `ยอดเยี่ยมมากค่ะ ทุกหน่วยงานในเขต กฟก.3 ผ่านเกณฑ์ KPI ระดับห้าครบถ้วนสำหรับเกณฑ์ ${selectedCrit} ประจำเดือน${mFullName} ค่ะ`;
      copyText = `🎉 รายงานผลการวิเคราะห์ AI: ทุกหน่วยงานผ่านเกณฑ์ KPI ระดับ 5 ครบ 100%\n`;
      copyText += `🎯 เกณฑ์วัด: ${selectedCrit}\n`;
      copyText += `📅 รอบประเมิน: เดือน${mFullName} (เป้าหมาย KPI ระดับ 5 = ${level5Target !== null ? level5Target + '%' : '-'})\n`;
      copyText += `✅ ทุกหน่วยงาน (${branchOffices.length} แห่ง) บรรลุเกณฑ์ยอดเยี่ยมเรียบร้อยแล้ว`;
    }

    lastBarAiTextForCopy = copyText;
    lastBarAiTextForSpeech = speechText;

    let regionalAlertHtml = '';
    if (kfgIsFailing && kfgItem) {
      regionalAlertHtml = `
        <div style="background:linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(185, 28, 28, 0.25)); border:1.5px solid rgba(239, 68, 68, 0.5); border-radius:8px; padding:0.75rem 1rem; margin-top:0.85rem; display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:1.5rem; line-height:1;">⚠️</span>
          <div style="flex:1;">
            <div style="font-weight:700; color:#FCA5A5; font-size:0.85rem;">แจ้งเตือนระดับเขต: ภาพรวม กฟก.3 (ทั้งหมด) อยู่ที่ ${kfgItem.pct.toFixed(1)}% (KPI ระดับ ${kfgItem.kpi}) ต่ำกว่าเป้าหมายระดับ 5 (${level5Target}%)</div>
            <div style="font-size:0.75rem; color:#FECACA; margin-top:2px;">หากหน่วยงานที่ตกเกณฑ์ด้านล่างนี้เร่งรัดปิดงานตามเป้าหมาย จะช่วยดึงภาพรวมทั้งเขต กฟก.3 ให้บรรลุ KPI ระดับ 5 ได้สำเร็จ</div>
          </div>
        </div>
      `;
    }

    panel.innerHTML = `
      <div class="bar-ai-header">
        <div class="bar-ai-title-group">
          <div class="bar-ai-icon-badge">🤖</div>
          <div>
            <div class="bar-ai-title-text">
              <span>บทวิเคราะห์ AI เจาะลึกหน่วยงานที่ตกเกณฑ์ KPI (ระดับ 1 - 4)</span>
              <span class="bar-ai-chip" style="${failingOffices.length === 0 ? 'background:rgba(16,185,129,0.2); border-color:rgba(16,185,129,0.5); color:#6EE7B7;' : ''}">${failingOffices.length > 0 ? `พบตกเกณฑ์ ${failingOffices.length} แห่ง` : 'ผ่านเกณฑ์ครบ 100%'}</span>
            </div>
            <div class="bar-ai-subtitle">
              เกณฑ์ที่ประเมิน: <strong style="color:var(--pea-gold-400);">${escapeHtml(selectedCrit)}</strong> &nbsp;|&nbsp; 
              เป้าหมาย KPI ระดับ 5: <strong style="color:#6EE7B7;">≥ ${level5Target !== null ? level5Target + '%' : '-'}</strong> (เดือน${mName}) &nbsp;|&nbsp;
              เกณฑ์ที่วิเคราะห์: หน่วยงานที่มี KPI 1-4 หรือ %ปิดงาน < ระดับ 5
            </div>
          </div>
        </div>
        <div class="ai-panel-tools">
          <button class="ai-tool-btn ${isBarAiSpeaking ? 'active-speaking' : ''}" id="btnBarAiSpeech" onclick="window.toggleBarAiSpeech()" title="ฟังเสียง AI อ่านสรุปผล">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span id="barAiSpeechBtnText">${isBarAiSpeaking ? 'หยุดอ่าน' : 'ฟังเสียง AI'}</span>
          </button>
          <button class="ai-tool-btn" onclick="window.copyBarAiText()" title="คัดลอกสรุปข้อความสำหรับส่งต่อใน LINE">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>คัดลอกสรุป</span>
          </button>
          <button class="ai-tool-btn" onclick="window.toggleBarAiAnalysis()" title="ซ่อน/แสดง บทวิเคราะห์">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
            <span>ย่อ/ขยาย</span>
          </button>
        </div>
      </div>

      <div class="bar-ai-body">
        ${regionalAlertHtml}
        ${failingOffices.length > 0 ? `<div class="failing-units-grid">${failingCardsHtml}</div>` : `
          <div class="all-passed-card">
            <div class="all-passed-icon">🎉</div>
            <div>
              <div class="all-passed-title">ยอดเยี่ยมมาก! ไม่มีหน่วยงานใดตกเกณฑ์ KPI (ระดับ 1 - 4)</div>
              <div class="all-passed-desc">
                ทุกหน่วยงานในเขต กฟก.3 (${branchOffices.length} แห่ง) ดำเนินการบรรลุเป้าหมาย KPI ระดับ 5 (≥ ${level5Target !== null ? level5Target + '%' : '-'}) ครบถ้วน 100% สำหรับเกณฑ์ <strong>${escapeHtml(selectedCrit)}</strong> ในรอบเดือน${mFullName}
              </div>
            </div>
          </div>
        `}
      </div>
    `;
  }

  function renderProvincialBarChart() {
    const canvas = document.getElementById('provincialComparisonChart');
    if (!canvas) return;

    const hasReport = hasReportForMonth(state.filters.month);
    const provs = ['นครปฐม', 'สุพรรณบุรี', 'กาญจนบุรี', 'สมุทรสาคร', 'กอง/กฟก.3'];
    const totalVals = [];
    const closedVals = [];
    const remainVals = [];

    provs.forEach(prov => {
      const rows = state.allData.filter(d => d.province === prov && !d.isSummary);
      let t = 0, c = 0, r = 0;
      rows.forEach(d => {
        t += d.totalValue;
        if (hasReport) {
          c += d.closedValue;
          r += d.remainingValue;
        } else {
          r += d.totalValue;
        }
      });
      totalVals.push(Math.round(t / 1000000));
      closedVals.push(Math.round(c / 1000000));
      remainVals.push(Math.round(r / 1000000));
    });

    const cColors = state.chartColors || DEFAULT_CHART_COLORS;

    if (!state.charts.provBar) {
      state.charts.provBar = new PeaChart(canvas, {
        type: 'bar',
        padding: { top: 25, right: 20, bottom: 40, left: 60 },
        formatY: (v) => `${v} ลบ.`
      });
    }

    state.charts.provBar.update({
      labels: provs.map(p => p.replace('กอง/กฟก.3', 'กองใน กฟก.3')),
      datasets: [
        { label: 'มูลค่ารวม (ล้านบาท)', data: totalVals, color: cColors.total },
        { label: 'ปิดงานแล้ว (ล้านบาท)', data: closedVals, color: cColors.closed },
        { label: 'คงเหลือ (ล้านบาท)', data: remainVals, color: cColors.remaining }
      ]
    });
  }

  /**
   * Helper: Calculate month-over-month growth % for both Total AUC (ภาพรวมมูลค่า/งาน) and Closed AUC (ปิดงานแล้ว)
   * across all 12 months with footer row average
   */
  function calculateTimelineComprehensiveGrowth(totalValues, closedValues, actualPcts, isJobCrit) {
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const unit = isJobCrit ? 'งาน' : 'ลบ.';
    const rows = [];

    let prevValidTotal = null;
    let prevValidClosed = null;
    let prevValidPct = null;

    let totalMoMCount = 0;
    let totalMoMSum = 0;

    let closedMoMCount = 0;
    let closedMoMSum = 0;

    for (let m = 0; m < 12; m++) {
      const rawTot = (totalValues && totalValues[m] !== null && totalValues[m] !== undefined && !isNaN(totalValues[m]))
        ? Number(totalValues[m])
        : null;
      const rawCls = (closedValues && closedValues[m] !== null && closedValues[m] !== undefined && !isNaN(closedValues[m]))
        ? Number(closedValues[m])
        : null;

      // Determine closed percentage
      let curPct = null;
      if (actualPcts && actualPcts[m] !== null && actualPcts[m] !== undefined && !isNaN(actualPcts[m])) {
        curPct = Number(actualPcts[m]);
      } else if (rawTot !== null && rawCls !== null) {
        curPct = rawTot > 0 ? Number(((rawCls / rawTot) * 100).toFixed(2)) : 0;
      }

      if (rawTot === null && rawCls === null && curPct === null) {
        rows.push({
          month: months[m],
          monthIdx: m,
          hasData: false,
          totalText: '-',
          totalCls: 'val-growth-none',
          totalTooltip: 'ยังไม่มีข้อมูล',
          closedText: '-',
          closedCls: 'val-growth-none',
          closedTooltip: 'ยังไม่มีข้อมูล'
        });
        continue;
      }

      // 1. Total AUC Growth % (ภาพรวมมูลค่า/งาน เพิ่มหรือลดลงเป็น %)
      let totalText = '-';
      let totalCls = 'val-growth-none';
      let totalTooltip = '';

      if (rawTot !== null) {
        if (prevValidTotal === null) {
          // First reporting month (Baseline)
          totalText = '-';
          totalCls = 'val-growth-none';
          const formattedVal = isJobCrit ? `${Math.round(rawTot).toLocaleString()} งาน` : `${rawTot.toFixed(2)} ลบ.`;
          totalTooltip = `${months[m]} 2569: ฐานภาพรวมเริ่มต้น ${formattedVal}`;
          prevValidTotal = rawTot;
        } else {
          const deltaTot = rawTot - prevValidTotal;
          const momGrowth = prevValidTotal > 0 ? (deltaTot / prevValidTotal) * 100 : 0;
          prevValidTotal = rawTot;
          totalMoMCount++;
          totalMoMSum += momGrowth;

          const deltaFormatted = isJobCrit 
            ? (deltaTot >= 0 ? `+${Math.round(deltaTot).toLocaleString()} งาน` : `${Math.round(deltaTot).toLocaleString()} งาน`)
            : (deltaTot >= 0 ? `+${deltaTot.toFixed(2)} ลบ.` : `${deltaTot.toFixed(2)} ลบ.`);
          const valFormatted = isJobCrit ? `${Math.round(rawTot).toLocaleString()} งาน` : `${rawTot.toFixed(2)} ลบ.`;

          if (momGrowth > 0.001) {
            totalText = `+${momGrowth.toFixed(2)}%`;
            totalCls = 'val-growth-pos';
          } else if (momGrowth < -0.001) {
            totalText = `${momGrowth.toFixed(2)}%`;
            totalCls = 'val-growth-neg';
          } else {
            totalText = `0.00%`;
            totalCls = 'val-growth-zero';
          }
          totalTooltip = `${months[m]} 2569: ภาพรวม ${valFormatted} (เปลี่ยนแปลง ${deltaFormatted} หรือ ${totalText})`;
        }
      }

      // 2. Closed AUC Growth % (ปิดงานแล้ว เพิ่มหรือลดลงเป็น %)
      let closedText = '-';
      let closedCls = 'val-growth-none';
      let closedTooltip = '';

      if (curPct !== null) {
        let deltaPct = 0;
        if (prevValidPct === null) {
          // Month 0: Closed from beginning of year (0.00%)
          deltaPct = curPct;
        } else {
          deltaPct = curPct - prevValidPct;
        }
        prevValidPct = curPct;
        closedMoMCount++;
        closedMoMSum += deltaPct;

        if (deltaPct > 0.001) {
          closedText = `+${deltaPct.toFixed(2)}%`;
          closedCls = 'val-growth-pos';
        } else if (deltaPct < -0.001) {
          closedText = `${deltaPct.toFixed(2)}%`;
          closedCls = 'val-growth-neg';
        } else {
          closedText = `0.00%`;
          closedCls = 'val-growth-zero';
        }

        const closedValStr = rawCls !== null 
          ? (isJobCrit ? `${Math.round(rawCls).toLocaleString()} งาน` : `${rawCls.toFixed(2)} ลบ.`)
          : '';
        const closedDeltaStr = (rawCls !== null && prevValidClosed !== null)
          ? (isJobCrit 
              ? (rawCls - prevValidClosed >= 0 ? `+${Math.round(rawCls - prevValidClosed).toLocaleString()} งาน` : `${Math.round(rawCls - prevValidClosed).toLocaleString()} งาน`)
              : (rawCls - prevValidClosed >= 0 ? `+${(rawCls - prevValidClosed).toFixed(2)} ลบ.` : `${(rawCls - prevValidClosed).toFixed(2)} ลบ.`))
          : (rawCls !== null ? (isJobCrit ? `+${Math.round(rawCls).toLocaleString()} งาน` : `+${rawCls.toFixed(2)} ลบ.`) : '');

        if (rawCls !== null) prevValidClosed = rawCls;

        closedTooltip = `${months[m]} 2569: ปิดสะสม ${closedValStr} (สัดส่วน ${curPct.toFixed(2)}%${closedDeltaStr ? `, ปิดเพิ่มในเดือน ${closedDeltaStr} หรือ ${closedText}` : ''})`;
      }

      rows.push({
        month: months[m],
        monthIdx: m,
        hasData: true,
        totalText,
        totalCls,
        totalTooltip,
        closedText,
        closedCls,
        closedTooltip
      });
    }

    // Calculate Averages
    const avgTotal = totalMoMCount > 0 ? (totalMoMSum / totalMoMCount) : null;
    const avgTotalText = avgTotal !== null
      ? (avgTotal > 0.001 ? `+${avgTotal.toFixed(2)}%` : `${avgTotal.toFixed(2)}%`)
      : '-';

    const avgClosed = closedMoMCount > 0 ? (closedMoMSum / closedMoMCount) : null;
    const avgClosedText = avgClosed !== null
      ? (avgClosed > 0.001 ? `+${avgClosed.toFixed(2)}%` : `${avgClosed.toFixed(2)}%`)
      : '-';

    return {
      rows,
      avgTotal,
      avgTotalText,
      avgClosed,
      avgClosedText,
      isJobCrit,
      unit
    };
  }

  /**
   * Helper: Render growth table on the right side of timeline charts
   * - If options.showTotal is false: renders 2 columns (Month & %)
   * - If options.showTotal is true: renders 3 columns (Month, Total %, and Closed %)
   */
  function renderTimelineGrowthTable(targetElementId, growthData, options = {}) {
    const wrap = document.getElementById(targetElementId);
    if (!wrap) return;

    if (!growthData || !growthData.rows) {
      wrap.innerHTML = '';
      return;
    }

    const title = options.title || '📈 % เพิ่ม/ลด รายเดือน';
    const showTotal = options.showTotal === true;

    if (showTotal) {
      wrap.classList.add('is-3col');
      wrap.innerHTML = `
        <div class="timeline-side-table-card">
          <div class="timeline-side-table-title">
            <span>${title}</span>
            <span style="font-size:0.67rem; color:var(--text-muted); font-weight:normal;">ม.ค. - ธ.ค.</span>
          </div>
          <table class="timeline-growth-table">
            <thead>
              <tr>
                <th style="width:24%;">เดือน</th>
                <th class="col-growth-total" style="width:38%;" title="อัตราเพิ่ม/ลดภาพรวมมูลค่า หรือจำนวนงาน AUC รายเดือน">
                  <span style="color:#FFD25A; font-size:0.68rem;">●</span> ภาพรวม
                </th>
                <th class="col-growth-closed" style="width:38%;" title="อัตราการปิดงานมูลค่า หรือจำนวนงานที่เพิ่ม/ลดลงรายเดือน">
                  <span style="color:#34D399; font-size:0.68rem;">●</span> ปิดงาน
                </th>
              </tr>
            </thead>
            <tbody>
              ${growthData.rows.map(r => `
                <tr class="${r.hasData ? 'has-data' : 'no-data'}">
                  <td>${r.month}</td>
                  <td class="col-growth-total ${r.totalCls}" title="${escapeHtml(r.totalTooltip)}">${r.totalText}</td>
                  <td class="col-growth-closed ${r.closedCls}" title="${escapeHtml(r.closedTooltip)}">${r.closedText}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="row-average">
                <td>ค่าเฉลี่ย</td>
                <td class="col-growth-total val-growth-avg" title="ค่าเฉลี่ยอัตราการเพิ่มขึ้นของภาพรวมต่อเดือน (${growthData.avgTotalText})">${growthData.avgTotalText}</td>
                <td class="col-growth-closed val-growth-avg" title="ค่าเฉลี่ยอัตราการปิดงานที่เพิ่มขึ้นต่อเดือน (${growthData.avgClosedText})">${growthData.avgClosedText}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    } else {
      wrap.classList.remove('is-3col');
      wrap.innerHTML = `
        <div class="timeline-side-table-card">
          <div class="timeline-side-table-title">
            <span>${title}</span>
            <span style="font-size:0.67rem; color:var(--text-muted); font-weight:normal;">ม.ค. - ธ.ค.</span>
          </div>
          <table class="timeline-growth-table">
            <thead>
              <tr>
                <th style="width:38%;">เดือน</th>
                <th style="width:62%; text-align:right;">%</th>
              </tr>
            </thead>
            <tbody>
              ${growthData.rows.map(r => `
                <tr class="${r.hasData ? 'has-data' : 'no-data'}">
                  <td>${r.month}</td>
                  <td class="${r.closedCls}" title="${escapeHtml(r.closedTooltip)}">${r.closedText}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="row-average">
                <td>ค่าเฉลี่ย</td>
                <td class="val-growth-avg" title="ค่าเฉลี่ยอัตราการปิดงานที่เพิ่มขึ้นต่อเดือน (${growthData.avgClosedText})">${growthData.avgClosedText}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }
  }

  function renderMonthlyTimelineChart() {
    const canvas = document.getElementById('monthlyTimelineChart');
    if (!canvas) return;

    const isJobCrit = (state.filters.criteria && state.filters.criteria !== 'ALL')
      ? (
          state.filters.criteria.includes('3.') || 
          state.filters.criteria.includes('4') || 
          state.filters.criteria.includes('C02.2') || 
          state.filters.criteria.includes('TECO') ||
          state.filters.criteria.includes('teco')
        )
      : (
          Array.isArray(state.filters.selectedCriteria) && 
          state.filters.selectedCriteria.length > 0 &&
          state.filters.selectedCriteria.every(c => 
            c.includes('3.') || c.includes('4') || c.includes('C02.2') || c.includes('TECO') || c.includes('teco')
          )
        );

    const isProvinceSelected = state.filters.province && state.filters.province !== 'ALL';
    const isAllOfficesInProv = !state.filters.office || state.filters.office === 'ALL';
    const isMultiOffices = isProvinceSelected && isAllOfficesInProv;
    const hasMultiCrit = Array.isArray(state.filters.selectedCriteria) && state.filters.selectedCriteria.length > 1;

    // Sync header badge and title
    const badge = document.getElementById('timelineChartUnitBadge');
    if (badge) {
      if (isMultiOffices) {
        badge.textContent = isJobCrit ? '% ปิดงานสะสม (รายหน่วยงาน)' : '% ปิดงานมูลค่า AUC (รายหน่วยงาน)';
      } else if (hasMultiCrit) {
        badge.textContent = `เปรียบเทียบ ${state.filters.selectedCriteria.length} เกณฑ์วัด`;
      } else {
        badge.textContent = isJobCrit ? '% ปิดงานสะสม (จำนวนงาน)' : '% ปิดงานมูลค่า AUC (ล้านบาท)';
      }
    }
    const titleEl = document.getElementById('timelineChartTitle');
    if (titleEl) {
      if (isMultiOffices) {
        const critSuffix = (state.filters.selectedCriteria && state.filters.selectedCriteria.length > 1)
          ? ` (${state.filters.selectedCriteria.length} เกณฑ์)`
          : '';
        titleEl.textContent = isJobCrit
          ? `% ปิดงานสะสมรายเดือน รายหน่วยงานใน${state.filters.province}${critSuffix} (ม.ค. - ธ.ค. 2569)`
          : `% ปิดงานมูลค่า AUC สะสมรายเดือน รายหน่วยงานใน${state.filters.province}${critSuffix} (ม.ค. - ธ.ค. 2569)`;
      } else if (hasMultiCrit) {
        titleEl.textContent = `% ปิดงานสะสมรายเดือน เปรียบเทียบ ${state.filters.selectedCriteria.length} เกณฑ์วัด (ม.ค. - ธ.ค. 2569)`;
      } else {
        titleEl.textContent = isJobCrit
          ? '% ปิดงานสะสมรายเดือน ตลอดปี 2569 (ม.ค. - ธ.ค.)'
          : '% ปิดงานมูลค่า AUC สะสมรายเดือน ตลอดปี 2569 (ม.ค. - ธ.ค.)';
      }
    }

    // Sync Timeline Active Info Strip (วงที่ 1)
    const tCritChart = document.getElementById('timelineSelectedCriteriaLabel');
    if (tCritChart) {
      if (hasMultiCrit) {
        tCritChart.textContent = `เปรียบเทียบ ${state.filters.selectedCriteria.length} เกณฑ์วัด`;
      } else {
        tCritChart.textContent = (state.filters.criteria && state.filters.criteria !== 'ALL')
          ? state.filters.criteria
          : 'ทุกเกณฑ์ (ALL)';
      }
    }
    const tUnitChart = document.getElementById('timelineSelectedUnitLabel');
    if (tUnitChart) {
      tUnitChart.textContent = isJobCrit ? '% ปิดงาน (จำนวนงาน)' : '% ปิดงานมูลค่า AUC (ล้านบาท)';
    }
    const tProvChart = document.getElementById('timelineSelectedProvinceLabel');
    if (tProvChart) {
      if (!state.filters.province || state.filters.province === 'ALL') {
        tProvChart.textContent = 'กฟก.3 (ทั้งหมด)';
      } else if (state.filters.office && state.filters.office !== 'ALL') {
        tProvChart.textContent = `${state.filters.province} - ${state.filters.office}`;
      } else {
        const p = state.filters.province;
        tProvChart.textContent = (p.startsWith('จ.') || p.startsWith('กอง')) ? p : `จ.${p}`;
      }
    }

    // Compute summary actual percentages across all 12 months for current filter selection
    const summaryActualPcts = [];
    const summaryTotalVals = [];
    const summaryClosedVals = [];
    const summaryMonthlyDetails = [];
    for (let m = 0; m < 12; m++) {
      if (hasReportForMonth(m)) {
        const rawList = getRawDataForMonth(m);
        let rows = rawList.filter(d => !d.isSummary && !(d.office && d.office.includes('ผลรวม')) && !(d.province && d.province.includes('ผลรวม')));

        if (hasMultiCrit) {
          rows = rows.filter(d => state.filters.selectedCriteria.some(c => matchCriteriaName(c, d.criteria)));
        } else if (state.filters.criteria && state.filters.criteria !== 'ALL') {
          rows = rows.filter(d => matchCriteriaName(state.filters.criteria, d.criteria));
        }

        if (state.filters.province && state.filters.province !== 'ALL') {
          rows = rows.filter(d => d.province === state.filters.province);
        }
        if (state.filters.office && state.filters.office !== 'ALL') {
          rows = rows.filter(d => d.office === state.filters.office);
        }
        if (state.filters.search) {
          const q = state.filters.search.toLowerCase();
          rows = rows.filter(d => (d.office && d.office.toLowerCase().includes(q)) || (d.province && d.province.toLowerCase().includes(q)));
        }

        let totVal = 0, clsVal = 0;
        let totJob = 0, clsJob = 0;
        rows.forEach(d => {
          totVal += Number(d.totalValue) || 0;
          clsVal += Number(d.closedValue) || 0;
          totJob += Number(d.totalJobs) || 0;
          clsJob += Number(d.closedJobs) || 0;
        });

        const isNoWork = (totVal === 0 && totJob === 0);
        let pct = null;
        if (!isNoWork) {
          if (isJobCrit) {
            pct = totJob > 0 ? Number(((clsJob / totJob) * 100).toFixed(2)) : 0;
            summaryTotalVals.push(totJob);
            summaryClosedVals.push(clsJob);
          } else {
            pct = totVal > 0 ? Number(((clsVal / totVal) * 100).toFixed(2)) : 0;
            summaryTotalVals.push(totVal / 1000000);
            summaryClosedVals.push(clsVal / 1000000);
          }
        } else {
          summaryTotalVals.push(null);
          summaryClosedVals.push(null);
        }
        summaryActualPcts.push(pct);
        summaryMonthlyDetails.push({
          isNoWork: isNoWork,
          closed: isNoWork ? 'ไม่มีงาน' : (isJobCrit ? `${clsJob.toLocaleString()} งาน` : formatCurrencyShort(clsVal)),
          total: isNoWork ? 'ไม่มีงาน' : (isJobCrit ? `${totJob.toLocaleString()} งาน` : formatCurrencyShort(totVal))
        });
      } else {
        summaryTotalVals.push(null);
        summaryClosedVals.push(null);
        summaryActualPcts.push(null);
        summaryMonthlyDetails.push(null);
      }
    }

    const targetPcts = [];
    // 1. KPI Level 5 Target % across all 12 months (0 to 11 = Jan to Dec)
    const critForTarget = (state.filters.selectedCriteria && state.filters.selectedCriteria.length > 0)
      ? state.filters.selectedCriteria[0]
      : state.filters.criteria;
    for (let m = 0; m < 12; m++) {
      const targetVal = getKpiLevel5Target(critForTarget, m);
      targetPcts.push(targetVal !== null ? targetVal : null);
    }

    const cColors = state.chartColors || DEFAULT_CHART_COLORS;
    const datasets = [];

    if (isMultiOffices) {
      // Find all affiliated offices in the selected province
      const officeSet = new Set();
      for (let m = 0; m < 12; m++) {
        if (hasReportForMonth(m)) {
          const list = getRawDataForMonth(m);
          list.forEach(d => {
            if (d.province === state.filters.province && d.office && !d.office.includes('ผลรวม')) {
              officeSet.add(d.office);
            }
          });
        }
      }
      if (officeSet.size === 0) {
        state.allData.forEach(d => {
          if (d.province === state.filters.province && d.office && !d.office.includes('ผลรวม')) {
            officeSet.add(d.office);
          }
        });
      }

      let offices = Array.from(officeSet).sort((a, b) => a.localeCompare(b, 'th'));
      if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        offices = offices.filter(o => o.toLowerCase().includes(q));
      }

      const MULTI_OFFICE_COLORS = [
        '#10B981', // เขียวมรกต
        '#06B6D4', // ฟ้าสว่าง
        '#3B82F6', // น้ำเงินสด
        '#A855F7', // ม่วงสด
        '#EC4899', // ชมพูบานเย็น
        '#F97316', // ส้มสด
        '#14B8A6', // เขียวหัวเป็ด
        '#8B5CF6', // ม่วงคราม
        '#F59E0B', // ทองเหลือง
        '#6366F1', // น้ำเงินคราม
        '#E11D48', // แดงกุหลาบ
        '#84CC16'  // เขียวมะนาว
      ];

      offices.forEach((off, idx) => {
        const offPcts = [];
        const offDetails = [];
        let hasAnyWorkOverall = false;

        for (let m = 0; m < 12; m++) {
          if (hasReportForMonth(m)) {
            const rawList = getRawDataForMonth(m);
            let rows = rawList.filter(d => 
              !d.isSummary && 
              d.province === state.filters.province && 
              d.office === off &&
              !(d.office && d.office.includes('ผลรวม')) && 
              !(d.province && d.province.includes('ผลรวม'))
            );

            if (hasMultiCrit) {
              rows = rows.filter(d => state.filters.selectedCriteria.some(c => matchCriteriaName(c, d.criteria)));
            } else if (state.filters.criteria && state.filters.criteria !== 'ALL') {
              rows = rows.filter(d => matchCriteriaName(state.filters.criteria, d.criteria));
            }

            let totVal = 0, clsVal = 0;
            let totJob = 0, clsJob = 0;
            let jobUnit = isJobCrit;

            rows.forEach(d => {
              totVal += Number(d.totalValue) || 0;
              clsVal += Number(d.closedValue) || 0;
              totJob += Number(d.totalJobs) || 0;
              clsJob += Number(d.closedJobs) || 0;
            });

            const isNoWork = (totVal === 0 && totJob === 0);
            if (!isNoWork) {
              hasAnyWorkOverall = true;
            }

            let pct = 0;
            if (isNoWork) {
              pct = null; // Do not plot misleading 0% line
            } else if (jobUnit) {
              pct = totJob > 0 ? Number(((clsJob / totJob) * 100).toFixed(2)) : 0;
            } else {
              pct = totVal > 0 ? Number(((clsVal / totVal) * 100).toFixed(2)) : 0;
            }

            offPcts.push(pct);
            offDetails.push({
              isNoWork: isNoWork,
              closed: isNoWork ? 'ไม่มีงาน' : (jobUnit ? `${clsJob.toLocaleString()} งาน` : formatCurrencyShort(clsVal)),
              total: isNoWork ? 'ไม่มีงาน' : (jobUnit ? `${totJob.toLocaleString()} งาน` : formatCurrencyShort(totVal))
            });
          } else {
            offPcts.push(null);
            offDetails.push(null);
          }
        }

        const color = hasAnyWorkOverall
          ? MULTI_OFFICE_COLORS[idx % MULTI_OFFICE_COLORS.length]
          : 'rgba(156, 163, 175, 0.45)';
        const label = hasAnyWorkOverall ? off : `${off} (ไม่มีงาน)`;
        const isHidden = state.hiddenTimelineSeries ? state.hiddenTimelineSeries.has(label) : false;

        datasets.push({
          label: label,
          data: offPcts,
          color: color,
          fill: false,
          borderWidth: hasAnyWorkOverall ? 2.3 : 1.2,
          showValues: hasAnyWorkOverall,
          showLastValueOnly: true,
          valuePosition: 'above',
          valueColor: color,
          valueBorderColor: color,
          hidden: isHidden,
          formatValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : '',
          extra: offDetails
        });
      });

    } else if (hasMultiCrit) {
      // Comparison lines for each selected criteria
      const CRIT_COLORS = [
        '#10B981', // เขียวมรกต
        '#06B6D4', // ฟ้าสว่าง
        '#F59E0B', // ทองเหลือง
        '#A855F7', // ม่วงสด
        '#EC4899', // ชมพูบานเย็น
        '#3B82F6', // น้ำเงินสด
        '#F97316', // ส้มสด
        '#14B8A6', // เขียวหัวเป็ด
        '#84CC16'  // เขียวมะนาว
      ];

      state.filters.selectedCriteria.forEach((crit, idx) => {
        const critPcts = [];
        const critDetails = [];
        const isJob = crit.includes('3.') || crit.includes('4') || crit.includes('C02.2') || crit.includes('TECO');

        for (let m = 0; m < 12; m++) {
          if (hasReportForMonth(m)) {
            const rawList = getRawDataForMonth(m);
            let rows = rawList.filter(d => 
              !d.isSummary && 
              !(d.office && d.office.includes('ผลรวม')) && 
              !(d.province && d.province.includes('ผลรวม')) &&
              matchCriteriaName(crit, d.criteria)
            );

            if (state.filters.province && state.filters.province !== 'ALL') {
              rows = rows.filter(d => d.province === state.filters.province);
            }
            if (state.filters.office && state.filters.office !== 'ALL') {
              rows = rows.filter(d => d.office === state.filters.office);
            }
            if (state.filters.search) {
              const q = state.filters.search.toLowerCase();
              rows = rows.filter(d => (d.office && d.office.toLowerCase().includes(q)) || (d.province && d.province.toLowerCase().includes(q)));
            }

            let totVal = 0, clsVal = 0;
            let totJob = 0, clsJob = 0;
            rows.forEach(d => {
              totVal += Number(d.totalValue) || 0;
              clsVal += Number(d.closedValue) || 0;
              totJob += Number(d.totalJobs) || 0;
              clsJob += Number(d.closedJobs) || 0;
            });

            let pct = 0;
            if (isJob) {
              pct = totJob > 0 ? Number(((clsJob / totJob) * 100).toFixed(2)) : 0;
            } else {
              pct = totVal > 0 ? Number(((clsVal / totVal) * 100).toFixed(2)) : 0;
            }

            critPcts.push(pct);
            critDetails.push({
              closed: isJob ? `${clsJob.toLocaleString()} งาน` : formatCurrencyShort(clsVal),
              total: isJob ? `${totJob.toLocaleString()} งาน` : formatCurrencyShort(totVal)
            });
          } else {
            critPcts.push(null);
            critDetails.push(null);
          }
        }

        const color = CRIT_COLORS[idx % CRIT_COLORS.length];
        const shortLabel = getCriteriaShortName(crit);
        const isHidden = state.hiddenTimelineSeries ? state.hiddenTimelineSeries.has(shortLabel) : false;
        datasets.push({
          label: shortLabel,
          data: critPcts,
          color: color,
          fill: false,
          borderWidth: 2.5,
          showValues: true,
          showLastValueOnly: true,
          valuePosition: 'above',
          valueColor: color,
          valueBorderColor: color,
          hidden: isHidden,
          formatValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : '',
          extra: critDetails
        });
      });

    } else {
      // Single combined line (ALL provinces or specific single office)
      const actualPcts = summaryActualPcts;
      const monthlyDetails = summaryMonthlyDetails;

      const singleLabel = isJobCrit ? '% ปิดงานสะสมจริง (ผลงาน)' : '% ปิดงานมูลค่า AUC สะสมจริง (ผลงาน)';
      const isHidden = state.hiddenTimelineSeries ? state.hiddenTimelineSeries.has(singleLabel) : false;
      datasets.push({
        label: singleLabel,
        data: actualPcts,
        color: cColors.closed || '#10B981',
        fill: true,
        borderWidth: 3,
        showValues: true,
        showLastValueOnly: false,
        valuePosition: 'above',
        valueColor: '#34D399',
        valueBorderColor: 'rgba(16, 185, 129, 0.85)',
        hidden: isHidden,
        formatValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : '',
        extra: monthlyDetails
      });
    }

    // Target Line
    // Target Line - Always shown, never hidden (วงที่ 2: แสดงค่ากราฟตลอด ไม่ต้องมีปุ่มติ๊ก)
    const hasAnyTarget = targetPcts.some(v => v !== null && v > 0);
    if (hasAnyTarget) {
      const targetLabel = '% เป้าหมาย KPI (ระดับ 5)';
      datasets.push({
        label: targetLabel,
        data: targetPcts,
        color: cColors.planLine || '#FFB81C',
        dashed: true,
        borderWidth: 2.5,
        showValues: true,
        showLastValueOnly: false,
        valuePosition: 'below',
        valueColor: '#FFD25A',
        valueBorderColor: 'rgba(255, 184, 28, 0.65)',
        hidden: false, // Always visible!
        isTarget: true,
        formatValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : ''
      });
    }

    const topPad = 22;

    if (!state.charts.timeline) {
      state.charts.timeline = new PeaChart(canvas, {
        type: 'line',
        padding: { top: topPad, right: 32, bottom: 42, left: 65 },
        formatY: (v) => `${Math.round(v)}%`,
        yMin: 0,
        yMax: 100,
        showLegend: false,
        showPointValues: true,
        formatPointValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : ''
      });
    } else {
      state.charts.timeline.options.padding = { top: topPad, right: 32, bottom: 42, left: 65 };
      state.charts.timeline.options.yMin = 0;
      state.charts.timeline.options.yMax = 100;
      state.charts.timeline.options.formatY = (v) => `${Math.round(v)}%`;
      state.charts.timeline.options.showLegend = false;
      state.charts.timeline.options.showPointValues = true;
      state.charts.timeline.options.formatPointValue = (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : '';
    }

    state.charts.timeline.update({
      labels: MONTHS_TH,
      datasets: datasets
    }, {
      showLegend: false,
      showPointValues: true,
      formatPointValue: (v) => (v !== null && v !== undefined && !isNaN(v)) ? `${Number(v).toFixed(2)}%` : '',
      padding: { top: topPad, right: 32, bottom: 42, left: 65 }
    });

    renderTimelineInteractiveLegend(datasets);

    // Render 2-column monthly growth table on the right side (% column and Month column with Average row - NO Total column)
    const growthData = calculateTimelineComprehensiveGrowth(summaryTotalVals, summaryClosedVals, summaryActualPcts, isJobCrit);
    renderTimelineGrowthTable('timelinePctGrowthTableWrap', growthData, {
      title: '📈 % เพิ่ม/ลด รายเดือน',
      showTotal: false,
      isJobCrit: isJobCrit
    });

    renderMonthlyAmountTimelineChart();
    renderAiAnalysis();
  }

  // Interactive Timeline Legend with Checkboxes (ปุ่มติ๊ก แสดง-ไม่แสดง กราฟ)
  function renderTimelineInteractiveLegend(datasets) {
    const container = document.getElementById('timelineInteractiveLegend');
    const legendWrapper = document.getElementById('timelineLegendContainer');
    if (!container || !legendWrapper) return;

    if (!datasets || datasets.length === 0) {
      legendWrapper.style.display = 'none';
      return;
    }
    legendWrapper.style.display = 'block';

    let html = '';
    datasets.forEach((ds) => {
      const isTarget = !!ds.isTarget || (ds.label && ds.label.includes('เป้าหมาย KPI'));
      const labelEsc = escapeHtml(ds.label);
      const isDashed = !!ds.dashed;
      const color = ds.color || (isTarget ? '#FFB81C' : '#A855F7');

      // วงที่ 2: เป้าหมาย KPI ไม่ต้องมีปุ่มติ๊ก ให้แสดงค่ากราฟตลอด
      if (isTarget) {
        html += `
          <div class="timeline-legend-kpi-badge" title="เส้นเป้าหมาย KPI ระดับ 5 (แสดงบนกราฟตลอด ไม่ต้องติ๊ก)">
            <span class="legend-color-indicator is-dashed" style="border-top-color: ${color};"></span>
            <span class="legend-label-text">${labelEsc}</span>
          </div>
        `;
        return;
      }

      // เส้นหน่วยงาน / เกณฑ์อื่นๆ: มีปุ่มติ๊ก แสดง-ไม่แสดง
      const isHidden = !!ds.hidden;
      const safeAttr = encodeURIComponent(ds.label);

      html += `
        <button type="button" 
                class="timeline-legend-chip ${isHidden ? 'is-muted' : 'is-active'}" 
                data-series="${safeAttr}"
                onclick="window.toggleTimelineSeries(decodeURIComponent('${safeAttr}'))"
                title="${isHidden ? 'คลิกปุ่มติ๊กเพื่อแสดงเส้นกราฟ: ' + labelEsc : 'คลิกเพื่อซ่อนเส้นกราฟ: ' + labelEsc}">
          <span class="legend-checkbox ${isHidden ? 'unchecked' : 'checked'}" style="${!isHidden ? 'background:' + color + '; border-color:' + color + ';' : ''}">
            ${isHidden 
              ? '' 
              : '<svg viewBox="0 0 24 24" width="10" height="10" stroke="#FFFFFF" stroke-width="3.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>'
            }
          </span>
          <span class="legend-color-indicator ${isDashed ? 'is-dashed' : ''}" style="${isDashed ? 'border-top-color:' + color + ';' : 'background-color:' + color + ';'}"></span>
          <span class="legend-label-text">${labelEsc}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  window.toggleTimelineSeries = function(label) {
    if (!label || label.includes('เป้าหมาย KPI')) return; // Target line is always visible
    if (!state.hiddenTimelineSeries) {
      state.hiddenTimelineSeries = new Set();
    }
    if (state.hiddenTimelineSeries.has(label)) {
      state.hiddenTimelineSeries.delete(label);
    } else {
      state.hiddenTimelineSeries.add(label);
    }
    renderMonthlyTimelineChart();
  };

  window.toggleAllTimelineSeries = function(showAll) {
    if (!state.hiddenTimelineSeries) {
      state.hiddenTimelineSeries = new Set();
    }
    if (showAll) {
      state.hiddenTimelineSeries.clear();
    } else {
      if (state.charts.timeline && state.charts.timeline.options && state.charts.timeline.options.data) {
        const dss = state.charts.timeline.options.data.datasets || [];
        dss.forEach(ds => {
          if (ds.label && !ds.isTarget && !ds.label.includes('เป้าหมาย KPI')) {
            state.hiddenTimelineSeries.add(ds.label);
          }
        });
      }
    }
    renderMonthlyTimelineChart();
  };

  // ==========================================
  // 8a.2 MONETARY AMOUNT TIMELINE CHART (จำนวนเงินภาพรวมมูลค่า AUC และปิดงานแล้ว)
  // ==========================================
  window.setTimelineChartMode = function(mode) {
    state.timelineChartMode = mode;
    const btnPct = document.getElementById('btnTimelineModePct');
    const btnAmount = document.getElementById('btnTimelineModeAmount');
    const btnBoth = document.getElementById('btnTimelineModeBoth');
    const secPct = document.getElementById('timelinePctSection');
    const secAmount = document.getElementById('timelineAmountSection');
    const titleEl = document.getElementById('timelineChartTitle');

    if (btnPct) btnPct.classList.toggle('active', mode === 'pct');
    if (btnAmount) btnAmount.classList.toggle('active', mode === 'amount');
    if (btnBoth) btnBoth.classList.toggle('active', mode === 'both');

    if (secPct) secPct.style.display = (mode === 'pct' || mode === 'both') ? 'block' : 'none';
    if (secAmount) secAmount.style.display = (mode === 'amount' || mode === 'both') ? 'block' : 'none';

    if (titleEl) {
      if (mode === 'pct') {
        titleEl.textContent = '% ปิดงานมูลค่า AUC สะสมรายเดือน ตลอดปี 2569 (ม.ค. - ธ.ค.)';
      } else if (mode === 'amount') {
        titleEl.textContent = 'จำนวนเงินภาพรวมมูลค่า AUC และปิดงานแล้ว สะสมรายเดือน ตลอดปี 2569 (ม.ค. - ธ.ค.)';
      } else {
        titleEl.textContent = 'ภาพรวมมูลค่า AUC สะสมรายเดือน ตลอดปี 2569 (ร้อยละ % & จำนวนเงิน)';
      }
    }

    setTimeout(() => {
      if (mode === 'pct' || mode === 'both') {
        if (state.charts.timeline) {
          state.charts.timeline.resize();
          state.charts.timeline.render();
        }
      }
      if (mode === 'amount' || mode === 'both') {
        renderMonthlyAmountTimelineChart();
      }
    }, 50);
  };

  function renderMonthlyAmountTimelineChart() {
    const canvas = document.getElementById('monthlyAmountTimelineChart');
    if (!canvas) return;

    const secAmount = document.getElementById('timelineAmountSection');
    if (secAmount && secAmount.style.display === 'none') return;

    const isJobCrit = (state.filters.criteria && state.filters.criteria !== 'ALL')
      ? (
          state.filters.criteria.includes('3.') || 
          state.filters.criteria.includes('4') || 
          state.filters.criteria.includes('C02.2') || 
          state.filters.criteria.includes('TECO') ||
          state.filters.criteria.includes('teco')
        )
      : (
          Array.isArray(state.filters.selectedCriteria) && 
          state.filters.selectedCriteria.length > 0 &&
          state.filters.selectedCriteria.every(c => 
            c.includes('3.') || c.includes('4') || c.includes('C02.2') || c.includes('TECO') || c.includes('teco')
          )
        );

    const hasMultiCrit = Array.isArray(state.filters.selectedCriteria) && state.filters.selectedCriteria.length > 1;

    // Sync header / strip labels
    const tCritChart = document.getElementById('timelineAmountCriteriaLabel');
    if (tCritChart) {
      if (hasMultiCrit) {
        tCritChart.textContent = `เปรียบเทียบ ${state.filters.selectedCriteria.length} เกณฑ์วัด`;
      } else {
        tCritChart.textContent = (state.filters.criteria && state.filters.criteria !== 'ALL')
          ? state.filters.criteria
          : 'ทุกเกณฑ์ (ALL)';
      }
    }
    const tUnitChart = document.getElementById('timelineAmountUnitLabel');
    if (tUnitChart) {
      tUnitChart.textContent = isJobCrit ? 'จำนวนงาน (งาน)' : 'มูลค่า (ล้านบาท)';
    }
    const tProvChart = document.getElementById('timelineAmountProvinceLabel');
    if (tProvChart) {
      if (!state.filters.province || state.filters.province === 'ALL') {
        tProvChart.textContent = 'กฟก.3 (ทั้งหมด)';
      } else if (state.filters.office && state.filters.office !== 'ALL') {
        tProvChart.textContent = `${state.filters.province} - ${state.filters.office}`;
      } else {
        const p = state.filters.province;
        tProvChart.textContent = (p.startsWith('จ.') || p.startsWith('กอง')) ? p : `จ.${p}`;
      }
    }

    // Calculate monthly amounts across 12 months
    const totalAmounts = [];
    const closedAmounts = [];
    const remainAmounts = [];
    const monthlyAmountDetails = [];

    let latestTotalRaw = 0;
    let latestClosedRaw = 0;
    let latestRemainRaw = 0;
    let hasAnyData = false;

    for (let m = 0; m < 12; m++) {
      if (hasReportForMonth(m)) {
        const rawList = getRawDataForMonth(m);
        let rows = rawList.filter(d => !d.isSummary && !(d.office && d.office.includes('ผลรวม')) && !(d.province && d.province.includes('ผลรวม')));

        if (hasMultiCrit) {
          rows = rows.filter(d => state.filters.selectedCriteria.some(c => matchCriteriaName(c, d.criteria)));
        } else if (state.filters.criteria && state.filters.criteria !== 'ALL') {
          rows = rows.filter(d => matchCriteriaName(state.filters.criteria, d.criteria));
        }
        if (state.filters.province && state.filters.province !== 'ALL') {
          rows = rows.filter(d => d.province === state.filters.province);
        }
        if (state.filters.office && state.filters.office !== 'ALL') {
          rows = rows.filter(d => d.office === state.filters.office);
        }
        if (state.filters.search) {
          const q = state.filters.search.toLowerCase();
          rows = rows.filter(d => (d.office && d.office.toLowerCase().includes(q)) || (d.province && d.province.toLowerCase().includes(q)));
        }

        let totVal = 0, clsVal = 0, remVal = 0;
        let totJob = 0, clsJob = 0, remJob = 0;
        let jobUnit = isJobCrit;

        rows.forEach(d => {
          totVal += Number(d.totalValue) || 0;
          clsVal += Number(d.closedValue) || 0;
          remVal += Number(d.remainingValue) || Math.max(0, (Number(d.totalValue) || 0) - (Number(d.closedValue) || 0));
          totJob += Number(d.totalJobs) || 0;
          clsJob += Number(d.closedJobs) || 0;
          remJob += Number(d.remainingJobs) || Math.max(0, (Number(d.totalJobs) || 0) - (Number(d.closedJobs) || 0));
        });

        const isNoWork = (totVal === 0 && totJob === 0);
        if (!isNoWork) {
          hasAnyData = true;
          latestTotalRaw = jobUnit ? totJob : totVal;
          latestClosedRaw = jobUnit ? clsJob : clsVal;
          latestRemainRaw = jobUnit ? remJob : remVal;
        }

        if (isNoWork) {
          totalAmounts.push(null);
          closedAmounts.push(null);
          remainAmounts.push(null);
          monthlyAmountDetails.push(null);
        } else if (jobUnit) {
          totalAmounts.push(totJob);
          closedAmounts.push(clsJob);
          remainAmounts.push(remJob);
          const p = totJob > 0 ? ((clsJob / totJob) * 100).toFixed(2) : '0.00';
          monthlyAmountDetails.push({
            isJob: true,
            totalVal: `${totJob.toLocaleString()} งาน`,
            closedVal: `${clsJob.toLocaleString()} งาน`,
            remainVal: `${remJob.toLocaleString()} งาน`,
            pct: `${p}%`,
            tooltipText: `ปิด ${clsJob.toLocaleString()} / รวม ${totJob.toLocaleString()} งาน (${p}%)`
          });
        } else {
          // Convert to million Baht for plot readability with 2 decimals
          const tMb = Math.round((totVal / 1000000) * 100) / 100;
          const cMb = Math.round((clsVal / 1000000) * 100) / 100;
          const rMb = Math.round((remVal / 1000000) * 100) / 100;
          const p = totVal > 0 ? ((clsVal / totVal) * 100).toFixed(2) : '0.00';

          totalAmounts.push(tMb);
          closedAmounts.push(cMb);
          remainAmounts.push(rMb);
          monthlyAmountDetails.push({
            isJob: false,
            totalVal: formatCurrency(totVal),
            totalMb: `${tMb.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ลบ.`,
            closedVal: formatCurrency(clsVal),
            closedMb: `${cMb.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ลบ.`,
            remainVal: formatCurrency(remVal),
            remainMb: `${rMb.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ลบ.`,
            pct: `${p}%`,
            tooltipText: `ปิด ${cMb.toFixed(2)} / รวม ${tMb.toFixed(2)} ลบ. (${p}%)`
          });
        }
      } else {
        totalAmounts.push(null);
        closedAmounts.push(null);
        remainAmounts.push(null);
        monthlyAmountDetails.push(null);
      }
    }

    // Update Quick Stat Pills
    const pillTotEl = document.getElementById('timelineAmountTotalVal');
    const pillClsEl = document.getElementById('timelineAmountClosedVal');
    const pillRemEl = document.getElementById('timelineAmountRemainVal');
    if (pillTotEl && pillClsEl && pillRemEl) {
      if (hasAnyData) {
        if (isJobCrit) {
          pillTotEl.textContent = `${latestTotalRaw.toLocaleString()} งาน`;
          const p = latestTotalRaw > 0 ? ((latestClosedRaw / latestTotalRaw) * 100).toFixed(1) : '0';
          pillClsEl.textContent = `${latestClosedRaw.toLocaleString()} งาน (${p}%)`;
          pillRemEl.textContent = `${latestRemainRaw.toLocaleString()} งาน`;
        } else {
          const tMb = (latestTotalRaw / 1000000).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const cMb = (latestClosedRaw / 1000000).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const rMb = (latestRemainRaw / 1000000).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const p = latestTotalRaw > 0 ? ((latestClosedRaw / latestTotalRaw) * 100).toFixed(1) : '0';
          pillTotEl.textContent = `${tMb} ลบ.`;
          pillClsEl.textContent = `${cMb} ลบ. (${p}%)`;
          pillRemEl.textContent = `${rMb} ลบ.`;
        }
      } else {
        pillTotEl.textContent = '-';
        pillClsEl.textContent = '-';
        pillRemEl.textContent = '-';
      }
    }

    const cColors = state.chartColors || DEFAULT_CHART_COLORS;
    const datasets = [];

    const labelTotal = isJobCrit ? 'ภาพรวมงาน AUC (จำนวนงาน)' : 'ภาพรวมมูลค่า AUC (ล้านบาท)';
    const labelClosed = isJobCrit ? 'ปิดงานแล้ว (จำนวนงาน)' : 'ปิดงานแล้ว (ล้านบาท)';
    const labelRemain = isJobCrit ? 'คงเหลือ (จำนวนงาน)' : 'คงเหลือ (ล้านบาท)';

    const isHiddenTotal = state.hiddenTimelineAmountSeries ? state.hiddenTimelineAmountSeries.has(labelTotal) : false;
    const isHiddenClosed = state.hiddenTimelineAmountSeries ? state.hiddenTimelineAmountSeries.has(labelClosed) : false;
    const isHiddenRemain = state.hiddenTimelineAmountSeries ? state.hiddenTimelineAmountSeries.has(labelRemain) : false;

    // 1. ภาพรวมมูลค่า AUC (Total) - สีเหลืองทองอร่าม
    datasets.push({
      label: labelTotal,
      data: totalAmounts,
      color: '#FFB81C',
      fill: false,
      borderWidth: 3,
      showValues: true,
      showLastValueOnly: false,
      valuePosition: 'above',
      valueColor: '#FFD25A',
      valueBorderColor: 'rgba(255, 184, 28, 0.9)',
      hidden: isHiddenTotal,
      formatValue: (v) => isJobCrit ? `${Math.round(v).toLocaleString()} งาน` : `${Number(v).toFixed(2)} ลบ.`,
      extra: monthlyAmountDetails.map(d => d ? {
        tooltipText: isJobCrit ? `${labelTotal}: ${d.totalVal}` : `${labelTotal}: ${d.totalVal} (${d.totalMb})`
      } : null)
    });

    // 2. ปิดงานแล้ว (Closed)
    datasets.push({
      label: labelClosed,
      data: closedAmounts,
      color: cColors.closed || '#10B981',
      fill: true,
      borderWidth: 3,
      showValues: true,
      showLastValueOnly: false,
      valuePosition: 'above',
      valueColor: '#34D399',
      valueBorderColor: 'rgba(16, 185, 129, 0.85)',
      hidden: isHiddenClosed,
      formatValue: (v) => isJobCrit ? `${Math.round(v).toLocaleString()} งาน` : `${Number(v).toFixed(2)} ลบ.`,
      extra: monthlyAmountDetails.map(d => d ? {
        tooltipText: isJobCrit ? `${labelClosed}: ${d.closedVal} (สัดส่วน ${d.pct})` : `${labelClosed}: ${d.closedVal} (${d.closedMb} • สัดส่วน ${d.pct})`
      } : null)
    });

    // 3. คงเหลือ (Remaining) - เส้นทึบสีแดง
    datasets.push({
      label: labelRemain,
      data: remainAmounts,
      color: cColors.remaining || '#EF4444',
      dashed: false,
      borderWidth: 2.6,
      showValues: true,
      showLastValueOnly: false,
      valuePosition: 'below',
      valueColor: '#FCA5A5',
      valueBorderColor: 'rgba(239, 68, 68, 0.85)',
      hidden: isHiddenRemain,
      formatValue: (v) => isJobCrit ? `${Math.round(v).toLocaleString()} งาน` : `${Number(v).toFixed(2)} ลบ.`,
      extra: monthlyAmountDetails.map(d => d ? {
        tooltipText: isJobCrit ? `${labelRemain}: ${d.remainVal}` : `${labelRemain}: ${d.remainVal} (${d.remainMb})`
      } : null)
    });

    const topPad = 24;
    const formatYFn = (v) => isJobCrit
      ? `${Math.round(v).toLocaleString()} งาน`
      : `${Math.round(v).toLocaleString()} ลบ.`;

    if (!state.charts.timelineAmount) {
      state.charts.timelineAmount = new PeaChart(canvas, {
        type: 'line',
        padding: { top: topPad, right: 35, bottom: 42, left: 75 },
        formatY: formatYFn,
        yMin: 0,
        showLegend: false,
        showPointValues: true
      });
    } else {
      state.charts.timelineAmount.options.padding = { top: topPad, right: 35, bottom: 42, left: 75 };
      state.charts.timelineAmount.options.yMin = 0;
      delete state.charts.timelineAmount.options.yMax; // Auto-scale to data
      state.charts.timelineAmount.options.formatY = formatYFn;
      state.charts.timelineAmount.options.showLegend = false;
      state.charts.timelineAmount.options.showPointValues = true;
    }

    state.charts.timelineAmount.update({
      labels: MONTHS_TH,
      datasets: datasets
    }, {
      showLegend: false,
      padding: { top: topPad, right: 35, bottom: 42, left: 75 }
    });

    renderTimelineAmountInteractiveLegend(datasets);

    // Render 3-column monthly growth table for amounts/jobs on the right side (% Total & % Closed)
    const amountGrowthData = calculateTimelineComprehensiveGrowth(totalAmounts, closedAmounts, null, isJobCrit);
    renderTimelineGrowthTable('timelineAmountGrowthTableWrap', amountGrowthData, {
      title: '📈 % เพิ่ม/ลด รายเดือน',
      showTotal: true,
      isJobCrit: isJobCrit
    });
  }

  // Interactive Legend for Amount Chart
  function renderTimelineAmountInteractiveLegend(datasets) {
    const container = document.getElementById('timelineAmountInteractiveLegend');
    const legendWrapper = document.getElementById('timelineAmountLegendContainer');
    if (!container || !legendWrapper) return;

    if (!datasets || datasets.length === 0) {
      legendWrapper.style.display = 'none';
      return;
    }
    legendWrapper.style.display = 'block';

    let html = '';
    datasets.forEach((ds) => {
      const labelEsc = escapeHtml(ds.label);
      const isDashed = !!ds.dashed;
      const color = ds.color || '#FFB81C';
      const isHidden = !!ds.hidden;
      const safeAttr = encodeURIComponent(ds.label);

      html += `
        <button type="button" class="timeline-legend-chip ${isHidden ? 'is-muted' : 'is-active'}"
          style="--chip-color: ${color};"
          data-series-label="${safeAttr}"
          onclick="window.toggleTimelineAmountSeries(decodeURIComponent('${safeAttr}'))"
          title="คลิกเพื่อ${isHidden ? 'แสดง' : 'ซ่อน'}เส้น ${labelEsc}">
          <span class="legend-checkbox ${isHidden ? 'unchecked' : 'checked'}" style="${isHidden ? '' : `background:${color}; border-color:${color};`}">
            ${!isHidden ? `
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ` : ''}
          </span>
          <span class="legend-color-indicator ${isDashed ? 'is-dashed' : ''}" style="${isDashed ? `border-top-color: ${color};` : `background: ${color};`}"></span>
          <span class="legend-label-text">${labelEsc}</span>
        </button>
      `;
    });

    container.innerHTML = html;
  }

  window.toggleTimelineAmountSeries = function(label) {
    if (!state.hiddenTimelineAmountSeries) {
      state.hiddenTimelineAmountSeries = new Set();
    }
    if (state.hiddenTimelineAmountSeries.has(label)) {
      state.hiddenTimelineAmountSeries.delete(label);
    } else {
      state.hiddenTimelineAmountSeries.add(label);
    }
    renderMonthlyAmountTimelineChart();
  };

  window.toggleAllTimelineAmountSeries = function(showAll) {
    if (!state.hiddenTimelineAmountSeries) {
      state.hiddenTimelineAmountSeries = new Set();
    }
    if (showAll) {
      state.hiddenTimelineAmountSeries.clear();
    } else {
      if (state.charts.timelineAmount && state.charts.timelineAmount.options && state.charts.timelineAmount.options.data) {
        const dss = state.charts.timelineAmount.options.data.datasets || [];
        dss.forEach(ds => {
          if (ds.label) {
            state.hiddenTimelineAmountSeries.add(ds.label);
          }
        });
      }
    }
    renderMonthlyAmountTimelineChart();
  };

  // ==========================================
  // 8c. AI SMART EXECUTIVE ANALYSIS & INSIGHTS
  // ==========================================

  let isAiSpeaking = false;
  let lastGeneratedAiTextForCopy = '';
  let lastGeneratedAiTextForSpeech = '';

  window.toggleAiAnalysisSection = function () {
    const panel = document.getElementById('timelineAiAnalysisPanel');
    if (!panel) return;
    panel.classList.toggle('is-collapsed');
    state.aiCollapsed = panel.classList.contains('is-collapsed');
    const btn = document.getElementById('btnToggleAiAnalysis');
    if (btn) {
      btn.classList.toggle('active', !state.aiCollapsed);
    }
  };

  window.switchAiTab = function (tabKey) {
    state.aiActiveTab = tabKey;
    document.querySelectorAll('.ai-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.aitab === tabKey);
    });
    document.querySelectorAll('.ai-tab-pane').forEach(pane => {
      pane.classList.toggle('active', pane.id === `aiTabPane-${tabKey}`);
    });
  };

  window.toggleAiSpeech = function () {
    if (!('speechSynthesis' in window)) {
      showToast('เบราว์เซอร์ของท่านไม่รองรับการสังเคราะห์เสียงพูด (Speech Synthesis)', 'warning');
      return;
    }
    const btn = document.getElementById('btnAiSpeech');
    const btnText = document.getElementById('aiSpeechBtnText');

    if (isAiSpeaking) {
      window.speechSynthesis.cancel();
      isAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
      return;
    }

    if (!lastGeneratedAiTextForSpeech) {
      showToast('ไม่พบข้อความสำหรับอ่านออกเสียง', 'warning');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastGeneratedAiTextForSpeech);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const thVoice = voices.find(v => v.lang === 'th-TH' || v.lang.startsWith('th'));
    if (thVoice) utterance.voice = thVoice;

    utterance.onstart = () => {
      isAiSpeaking = true;
      if (btn) btn.classList.add('active-speaking');
      if (btnText) btnText.textContent = 'หยุดอ่าน';
    };

    utterance.onend = () => {
      isAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
    };

    utterance.onerror = () => {
      isAiSpeaking = false;
      if (btn) btn.classList.remove('active-speaking');
      if (btnText) btnText.textContent = 'ฟังเสียง AI';
    };

    window.speechSynthesis.speak(utterance);
  };

  window.copyAiAnalysisText = function () {
    if (!lastGeneratedAiTextForCopy) {
      showToast('ยังไม่มีข้อมูลการวิเคราะห์สำหรับคัดลอก', 'warning');
      return;
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastGeneratedAiTextForCopy).then(() => {
        showToast('คัดลอกบทวิเคราะห์ AI เรียบร้อยแล้ว สามารถนำไปส่งต่อได้ทันที', 'success');
      }).catch(() => {
        fallbackCopy(lastGeneratedAiTextForCopy);
      });
    } else {
      fallbackCopy(lastGeneratedAiTextForCopy);
    }
  };

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('คัดลอกบทวิเคราะห์ AI เรียบร้อยแล้ว', 'success');
    } catch (e) {
      showToast('ไม่สามารถคัดลอกข้อความได้ กรุณาลองใหม่อีกครั้ง', 'warning');
    }
    document.body.removeChild(ta);
  }

  window.refreshAiAnalysis = function () {
    const panel = document.getElementById('timelineAiAnalysisPanel');
    if (panel) {
      panel.style.opacity = '0.5';
      setTimeout(() => {
        renderAiAnalysis();
        panel.style.opacity = '1';
        showToast('ประมวลผลบทวิเคราะห์ AI ใหม่เรียบร้อยแล้ว', 'success');
      }, 200);
    }
  };

  function renderAiAnalysis() {
    try {
      const container = document.getElementById('timelineAiAnalysisPanel');
      if (!container || container.style.display === 'none') return;

      const m = (state.filters.month !== undefined && state.filters.month !== null) ? Number(state.filters.month) : 7;
    const monthName = MONTHS_TH[m] || 'ส.ค.';
    const monthFullName = MONTHS_FULL_TH[m] || `${monthName} 2569`;
    const crit = state.filters.criteria || 'ข้อ 1.1 งบ C.1 ก่อน 69';
    const isJobCrit = crit && (crit.includes('3.') || crit.includes('4') || crit.includes('C02.2') || crit.includes('TECO'));
    const unitLabel = isJobCrit ? 'งาน' : 'บาท';

    // Target KPI Level 5 for active month & next month
    const targetVal = getKpiLevel5Target(crit, m);
    const targetPct = targetVal !== null ? Math.round(targetVal * 10) / 10 : 71.0;
    const nextTargetVal = (m < 11) ? getKpiLevel5Target(crit, m + 1) : 100;
    const nextTargetPct = nextTargetVal !== null ? Math.round(nextTargetVal * 10) / 10 : Math.min(100, targetPct + 9);
    const nextMonthName = (m < 11) ? MONTHS_TH[m + 1] : 'ธ.ค.';

    const isProv = state.filters.province && state.filters.province !== 'ALL';
    const isAllOfficesInProv = !state.filters.office || state.filters.office === 'ALL';
    const isMultiOffices = isProv && isAllOfficesInProv;
    const isSingleOffice = isProv && !isAllOfficesInProv;
    const isAllProvinces = !isProv;

    let items = [];
    let scopeTitle = '';

    if (isMultiOffices) {
      scopeTitle = `จังหวัด${state.filters.province}`;

      const officeSet = new Set();
      for (let mon = 0; mon <= 7; mon++) {
        if (hasReportForMonth(mon)) {
          const list = getRawDataForMonth(mon);
          list.forEach(d => {
            if (d.province === state.filters.province && d.office && !d.office.includes('ผลรวม')) {
              officeSet.add(d.office);
            }
          });
        }
      }
      if (officeSet.size === 0) {
        state.allData.forEach(d => {
          if (d.province === state.filters.province && d.office && !d.office.includes('ผลรวม')) {
            officeSet.add(d.office);
          }
        });
      }

      let offices = Array.from(officeSet).sort((a, b) => a.localeCompare(b, 'th'));
      if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        offices = offices.filter(o => o.toLowerCase().includes(q));
      }

      offices.forEach(off => {
        let totVal = 0, clsVal = 0, remVal = 0;
        let totJob = 0, clsJob = 0, remJob = 0;

        if (hasReportForMonth(m)) {
          const rawList = getRawDataForMonth(m);
          let rows = rawList.filter(d => 
            !d.isSummary && 
            d.province === state.filters.province && 
            d.office === off &&
            !(d.office && d.office.includes('ผลรวม')) && 
            !(d.province && d.province.includes('ผลรวม'))
          );
          if (crit && crit !== 'ALL') {
            rows = rows.filter(d => matchCriteriaName(crit, d.criteria));
          }

          rows.forEach(d => {
            totVal += Number(d.totalValue) || 0;
            clsVal += Number(d.closedValue) || 0;
            remVal += Number(d.remainingValue) || 0;
            totJob += Number(d.totalJobs) || 0;
            clsJob += Number(d.closedJobs) || 0;
            remJob += Number(d.remainingJobs) || 0;
          });
        }

        let pct = isJobCrit 
          ? (totJob > 0 ? (clsJob / totJob) * 100 : 0) 
          : (totVal > 0 ? (clsVal / totVal) * 100 : 0);
        pct = Math.round(pct * 10) / 10;

        // Previous month growth (velocity)
        let momGrowth = null;
        if (m > 0 && hasReportForMonth(m - 1)) {
          let prevTotVal = 0, prevClsVal = 0, prevTotJob = 0, prevClsJob = 0;
          const prevRaw = getRawDataForMonth(m - 1);
          let prevRows = prevRaw.filter(d => 
            !d.isSummary && 
            d.province === state.filters.province && 
            d.office === off &&
            !(d.office && d.office.includes('ผลรวม')) && 
            !(d.province && d.province.includes('ผลรวม'))
          );
          if (crit && crit !== 'ALL') {
            prevRows = prevRows.filter(d => matchCriteriaName(crit, d.criteria));
          }
          prevRows.forEach(d => {
            prevTotVal += Number(d.totalValue) || 0;
            prevClsVal += Number(d.closedValue) || 0;
            prevTotJob += Number(d.totalJobs) || 0;
            prevClsJob += Number(d.closedJobs) || 0;
          });
          const prevPct = isJobCrit
            ? (prevTotJob > 0 ? (prevClsJob / prevTotJob) * 100 : 0)
            : (prevTotVal > 0 ? (prevClsVal / prevTotVal) * 100 : 0);
          momGrowth = Math.round((pct - prevPct) * 10) / 10;
        }

        const gap = Math.round((pct - targetPct) * 10) / 10;
        let status = 'good';
        if (pct >= 99.9) {
          status = 'completed100';
        } else if (pct < targetPct) {
          status = 'critical';
        } else if (gap <= 3.0) {
          status = 'borderline';
        }

        items.push({
          name: off,
          pct: pct,
          gap: gap,
          status: status,
          momGrowth: momGrowth,
          totalVal: totVal,
          closedVal: clsVal,
          remainVal: remVal,
          totalJobs: totJob,
          closedJobs: clsJob,
          remainJobs: remJob
        });
      });

    } else if (isAllProvinces) {
      scopeTitle = 'ภาพรวมทุกจังหวัดในเขต กฟก.3';
      const provList = ['นครปฐม', 'ราชบุรี', 'กาญจนบุรี', 'สุพรรณบุรี', 'กอง/กฟก.3'];

      provList.forEach(prov => {
        let totVal = 0, clsVal = 0, remVal = 0;
        let totJob = 0, clsJob = 0, remJob = 0;

        if (hasReportForMonth(m)) {
          const rawList = getRawDataForMonth(m);
          let rows = rawList.filter(d => 
            !d.isSummary && 
            d.province === prov &&
            !(d.office && d.office.includes('ผลรวม')) && 
            !(d.province && d.province.includes('ผลรวม'))
          );
          if (crit && crit !== 'ALL') {
            rows = rows.filter(d => matchCriteriaName(crit, d.criteria));
          }
          rows.forEach(d => {
            totVal += Number(d.totalValue) || 0;
            clsVal += Number(d.closedValue) || 0;
            remVal += Number(d.remainingValue) || 0;
            totJob += Number(d.totalJobs) || 0;
            clsJob += Number(d.closedJobs) || 0;
            remJob += Number(d.remainingJobs) || 0;
          });
        }

        let pct = isJobCrit 
          ? (totJob > 0 ? (clsJob / totJob) * 100 : 0) 
          : (totVal > 0 ? (clsVal / totVal) * 100 : 0);
        pct = Math.round(pct * 10) / 10;

        const gap = Math.round((pct - targetPct) * 10) / 10;
        let status = pct >= 99.9 ? 'completed100' : (pct >= targetPct ? (gap <= 3.0 ? 'borderline' : 'good') : 'critical');

        items.push({
          name: prov === 'กอง/กฟก.3' ? 'กองใน กฟก.3' : `จ.${prov}`,
          rawName: prov,
          pct: pct,
          gap: gap,
          status: status,
          momGrowth: null,
          totalVal: totVal,
          closedVal: clsVal,
          remainVal: remVal,
          totalJobs: totJob,
          closedJobs: clsJob,
          remainJobs: remJob
        });
      });

    } else {
      // Single Office
      const off = state.filters.office;
      scopeTitle = off;

      let totVal = 0, clsVal = 0, remVal = 0;
      let totJob = 0, clsJob = 0, remJob = 0;

      if (hasReportForMonth(m)) {
        const rawList = getRawDataForMonth(m);
        let rows = rawList.filter(d => 
          !d.isSummary && 
          d.province === state.filters.province && 
          d.office === off &&
          !(d.office && d.office.includes('ผลรวม'))
        );
        if (crit && crit !== 'ALL') {
          rows = rows.filter(d => matchCriteriaName(crit, d.criteria));
        }
        rows.forEach(d => {
          totVal += Number(d.totalValue) || 0;
          clsVal += Number(d.closedValue) || 0;
          remVal += Number(d.remainingValue) || 0;
          totJob += Number(d.totalJobs) || 0;
          clsJob += Number(d.closedJobs) || 0;
          remJob += Number(d.remainingJobs) || 0;
        });
      }

      let pct = isJobCrit 
        ? (totJob > 0 ? (clsJob / totJob) * 100 : 0) 
        : (totVal > 0 ? (clsVal / totVal) * 100 : 0);
      pct = Math.round(pct * 10) / 10;

      const gap = Math.round((pct - targetPct) * 10) / 10;
      let status = pct >= 99.9 ? 'completed100' : (pct >= targetPct ? (gap <= 3.0 ? 'borderline' : 'good') : 'critical');

      items.push({
        name: off,
        pct: pct,
        gap: gap,
        status: status,
        momGrowth: null,
        totalVal: totVal,
        closedVal: clsVal,
        remainVal: remVal,
        totalJobs: totJob,
        closedJobs: clsJob,
        remainJobs: remJob
      });
    }

    // Sort items descending by percentage
    items.sort((a, b) => b.pct - a.pct);

    const totalCount = items.length;
    let sumTotVal = 0, sumClsVal = 0, sumRemVal = 0;
    let sumTotJob = 0, sumClsJob = 0, sumRemJob = 0;
    items.forEach(i => {
      sumTotVal += i.totalVal;
      sumClsVal += i.closedVal;
      sumRemVal += i.remainVal;
      sumTotJob += i.totalJobs;
      sumClsJob += i.closedJobs;
      sumRemJob += i.remainJobs;
    });

    const overallPct = isJobCrit
      ? (sumTotJob > 0 ? Math.round((sumClsJob / sumTotJob) * 1000) / 10 : 0)
      : (sumTotVal > 0 ? Math.round((sumClsVal / sumTotVal) * 1000) / 10 : 0);

    const overallGap = Math.round((overallPct - targetPct) * 10) / 10;

    const completed100List = items.filter(i => i.status === 'completed100');
    const goodList = items.filter(i => i.status === 'good');
    const borderlineList = items.filter(i => i.status === 'borderline');
    const criticalList = items.filter(i => i.status === 'critical');
    const passedList = items.filter(i => i.pct >= targetPct);
    const passRate = totalCount > 0 ? Math.round((passedList.length / totalCount) * 1000) / 10 : 0;

    const topItem = items[0] || null;
    const lowestItem = items[items.length - 1] || null;
    const biggestBacklogItem = [...items].sort((a,b) => b.remainVal - a.remainVal)[0] || null;
    const fastestGrowthItem = [...items].filter(i => i.momGrowth !== null && i.momGrowth > 0).sort((a,b) => b.momGrowth - a.momGrowth)[0] || null;

    // Active Tab State
    const activeTab = state.aiActiveTab || 'summary';
    const isCollapsedClass = state.aiCollapsed ? 'is-collapsed' : '';

    // Build Formatted Narrative Text for Copy & Speech
    let copyText = `📊 ผลการวิเคราะห์และข้อเสนอแนะโดย AI (กฟก.3)\n`;
    copyText += `📍 ขอบเขต: ${scopeTitle} | เดือน: ${monthFullName}\n`;
    copyText += `🎯 เกณฑ์วัด: ${crit}\n`;
    copyText += `📈 เป้าหมาย KPI ระดับ 5: ${targetPct}% | ผลงานจริงสะสม: ${overallPct}% (${overallGap >= 0 ? `+${overallGap}% เหนือเป้าหมาย` : `${overallGap}% ต่ำกว่าเป้าหมาย`})\n`;
    copyText += `✅ ผ่านเกณฑ์: ${passedList.length}/${totalCount} หน่วยงาน (${passRate}%)\n\n`;

    copyText += `💡 บทสรุปผู้บริหาร:\n`;
    copyText += `1. ภาพรวมการปิดงาน AUC สะสมอยู่ที่ ${overallPct}% ${overallGap >= 0 ? `สูงกว่าเป้าหมายเดือน ${monthName} (${targetPct}%) อยู่ +${overallGap}%` : `ต่ำกว่าเป้าหมายเดือน ${monthName} (${targetPct}%) อยู่ ${overallGap}%`}\n`;
    if (completed100List.length > 0) {
      copyText += `2. ผลงานยอดเยี่ยม 100%: ปิดงานสำเร็จครบตามเป้าหมายทั้งปีแล้ว ${completed100List.length} แห่ง ได้แก่ ${completed100List.map(i => i.name).join(', ')}\n`;
    }
    if (criticalList.length > 0) {
      copyText += `3. จุดที่ต้องเร่งรัดด่วน: มี ${criticalList.length} แห่งที่ต่ำกว่าเกณฑ์ KPI ได้แก่ ${criticalList.map(i => `${i.name} (${i.pct}%)`).join(', ')} โดยเฉพาะ ${lowestItem ? lowestItem.name : ''} ยอดคงเหลือ ${lowestItem ? formatCurrencyShort(lowestItem.remainVal) : ''}\n`;
    }
    if (borderlineList.length > 0) {
      copyText += `4. กลุ่มเฝ้าระวัง: ${borderlineList.map(i => `${i.name} (${i.pct}%)`).join(', ')} เกาะเส้นพอดี ต้องเตรียมรองรับเป้าหมายเดือน ${nextMonthName} (${nextTargetPct}%)\n`;
    }

    copyText += `\n🎯 ข้อเสนอแนะเร่งรัด:\n`;
    copyText += `• โฟกัส ${biggestBacklogItem ? biggestBacklogItem.name : (lowestItem ? lowestItem.name : 'หน่วยงานคงค้าง')} เร่งรัดออกเอกสารตรวจรับ TECO ในระบบ SAP ทันที\n`;
    copyText += `• เตรียมผลงานล่วงหน้าสำหรับเดือน ${nextMonthName} (${nextTargetPct}%)\n`;
    copyText += `• บูรณาการตัดจ่ายสินทรัพย์ AUC เข้าสินทรัพย์ถาวรเพื่อปิด WBS ให้สมบูรณ์`;

    lastGeneratedAiTextForCopy = copyText;

    // Speech text (clean Thai words)
    let speechText = `รายงานสรุปผลการวิเคราะห์โดย เอไอ ประจำเดือน ${monthFullName} ในพื้นที่ ${scopeTitle}. `;
    speechText += `ผลการปิดงานสะสมเฉลี่ยอยู่ที่ ร้อยละ ${overallPct} ซึ่ง${overallGap >= 0 ? `สูงกว่าเป้าหมาย เคพีไอ ระดับห้า อยู่ ร้อยละ ${overallGap}` : `ยังต่ำกว่าเป้าหมาย เคพีไอ อยู่ ร้อยละ ${Math.abs(overallGap)}`}. `;
    if (completed100List.length > 0) {
      speechText += `มีหน่วยงานที่ปิดงานสำเร็จครบหนึ่งร้อยเปอร์เซ็นต์แล้ว ${completed100List.length} แห่ง ได้แก่ ${completed100List.map(i => i.name).join(' และ ')}. `;
    }
    if (criticalList.length > 0) {
      speechText += `จุดที่ต้องเร่งรัดเป็นพิเศษ ได้แก่ ${lowestItem ? lowestItem.name : ''} ซึ่งมีผลงาน ร้อยละ ${lowestItem ? lowestItem.pct : 0} ต่ำกว่าเป้าหมาย. `;
    }
    speechText += `ข้อเสนอแนะ คือ เร่งตรวจรับงานในระบบ แซป และส่งมอบบัญชีขึ้นทะเบียนทรัพย์สินโดยเร็ว.`;
    lastGeneratedAiTextForSpeech = speechText;

    // Build HTML Panel
    let html = `
      <div class="ai-panel-header">
        <div class="ai-panel-title-group">
          <div class="ai-icon-badge" title="ขับเคลื่อนด้วยโมเดลวิเคราะห์อัจฉริยะ PEA AI Engine">
            ✨
          </div>
          <div>
            <div class="ai-panel-title-text">
              <span>ผลการวิเคราะห์โดย AI เชิงบริหาร</span>
              <span class="ai-chip-auto">AI Smart Insights</span>
            </div>
            <div class="ai-panel-subtitle">
              📍 ขอบเขต: <strong style="color:var(--pea-gold-300);">${escapeHtml(scopeTitle)}</strong> &nbsp;|&nbsp; 
              สะสมถึง: <strong style="color:#FFFFFF;">${escapeHtml(monthFullName)}</strong> &nbsp;|&nbsp; 
              เกณฑ์: <strong style="color:var(--text-muted);">${escapeHtml(crit)}</strong>
            </div>
          </div>
        </div>

        <div class="ai-panel-tools">
          <button class="ai-tool-btn ${isAiSpeaking ? 'active-speaking' : ''}" id="btnAiSpeech" onclick="window.toggleAiSpeech()" title="ฟังเสียงอ่านบทวิเคราะห์ภาษาไทย">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <span id="aiSpeechBtnText">${isAiSpeaking ? 'หยุดอ่าน' : 'ฟังเสียง AI'}</span>
          </button>

          <button class="ai-tool-btn" onclick="window.copyAiAnalysisText()" title="คัดลอกข้อความสรุปสำหรับส่งต่อใน LINE หรือทำรายงาน">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>คัดลอกสรุป</span>
          </button>

          <button class="ai-tool-btn" onclick="window.refreshAiAnalysis()" title="ประมวลผลการวิเคราะห์ใหม่ตามข้อมูลล่าสุด">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>วิเคราะห์ใหม่</span>
          </button>

          <button class="ai-tool-btn" onclick="window.toggleAiAnalysisSection()" title="ย่อ/ขยาย กล่องบทวิเคราะห์">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="18 15 12 9 6 15"></polyline>
            </svg>
          </button>
        </div>
      </div>

      <!-- 4-Card Top Metrics Grid -->
      <div class="ai-stats-grid">
        <!-- 1. Overall Completion -->
        <div class="ai-stat-card">
          <div class="ai-stat-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            <span>% ปิดงานสะสม (${scopeTitle})</span>
          </div>
          <div class="ai-stat-val-row">
            <span class="ai-stat-main-val" style="color:${overallGap >= 0 ? '#34D399' : '#F87171'};">${overallPct}%</span>
            <span class="ai-stat-badge ${overallGap >= 0 ? 'badge-success' : 'badge-danger'}">
              ${overallGap >= 0 ? `+${overallGap}% เหนือเป้า` : `${overallGap}% ต่ำกว่าเป้า`}
            </span>
          </div>
          <div class="ai-stat-subtext">
            เป้าหมาย KPI ระดับ 5 (${monthName}): <strong>${targetPct}%</strong>
          </div>
        </div>

        <!-- 2. Passing Rate -->
        <div class="ai-stat-card">
          <div class="ai-stat-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            <span>ผ่านเกณฑ์ KPI ระดับ 5</span>
          </div>
          <div class="ai-stat-val-row">
            <span class="ai-stat-main-val text-gold">${passedList.length} / ${totalCount}</span>
            <span class="ai-stat-badge badge-warning">
              ${passRate >= 80 ? 'ดีเยี่ยม 🌟' : (passRate >= 50 ? 'ปานกลาง 🟢' : 'ต้องเร่งรัด 🔴')}
            </span>
          </div>
          <div class="ai-stat-subtext">
            คิดเป็น <strong>${passRate}%</strong> ของหน่วยงานทั้งหมด
          </div>
        </div>

        <!-- 3. Completed 100% -->
        <div class="ai-stat-card">
          <div class="ai-stat-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span>ปิดงานครบ 100% แล้ว</span>
          </div>
          <div class="ai-stat-val-row">
            <span class="ai-stat-main-val" style="color:#38BDF8;">${completed100List.length} แห่ง</span>
            <span class="ai-stat-badge badge-success">
              ${completed100List.length > 0 ? 'ทะลุเป้าทั้งปี 🏆' : 'รอปิดงาน'}
            </span>
          </div>
          <div class="ai-stat-subtext" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${completed100List.map(i => i.name).join(', ') || 'ยังไม่มี'}">
            ${completed100List.length > 0 ? completed100List.map(i => i.name).join(', ') : 'ยังไม่มีหน่วยงาน 100%'}
          </div>
        </div>

        <!-- 4. Critical Action -->
        <div class="ai-stat-card">
          <div class="ai-stat-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>จุดวิกฤต/ต้องเร่งรัดด่วน</span>
          </div>
          <div class="ai-stat-val-row">
            <span class="ai-stat-main-val" style="color:#F87171; font-size:1.15rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              ${criticalList.length > 0 ? (lowestItem ? lowestItem.name : `${criticalList.length} แห่ง`) : 'ไม่มีจุดวิกฤต'}
            </span>
            <span class="ai-stat-badge ${criticalList.length > 0 ? 'badge-danger' : 'badge-success'}">
              ${criticalList.length > 0 ? `${criticalList.length} แห่ง 🔴` : 'ผ่านเกณฑ์ 🟢'}
            </span>
          </div>
          <div class="ai-stat-subtext">
            ${lowestItem && lowestItem.status === 'critical' ? `ผลงาน ${lowestItem.pct}% (ต่ำกว่าเป้า ${lowestItem.gap}%)` : 'ทุกหน่วยงานอยู่ตามแผน'}
          </div>
        </div>
      </div>

      <!-- Navigation Tabs -->
      <div class="ai-tabs-strip">
        <button class="ai-tab-btn ${activeTab === 'summary' ? 'active' : ''}" data-aitab="summary" onclick="window.switchAiTab('summary')">
          <span>💡 สรุปใจความสำคัญ</span>
        </button>
        <button class="ai-tab-btn ${activeTab === 'breakdown' ? 'active' : ''}" data-aitab="breakdown" onclick="window.switchAiTab('breakdown')">
          <span>📊 จัดกลุ่มผลงานรายหน่วยงาน</span>
        </button>
        <button class="ai-tab-btn ${activeTab === 'recommendations' ? 'active' : ''}" data-aitab="recommendations" onclick="window.switchAiTab('recommendations')">
          <span>🎯 ข้อเสนอแนะเชิงปฏิบัติการ</span>
        </button>
        <button class="ai-tab-btn ${activeTab === 'forecast' ? 'active' : ''}" data-aitab="forecast" onclick="window.switchAiTab('forecast')">
          <span>📈 พยากรณ์แนวโน้มสิ้นปี</span>
        </button>
      </div>

      <!-- Tab 1: Executive Summary -->
      <div class="ai-tab-pane ${activeTab === 'summary' ? 'active' : ''}" id="aiTabPane-summary">
        <div class="ai-summary-box">
          <div class="ai-summary-lead">
            ผลการปิดงาน AUC สะสมประจำเดือน <strong>${escapeHtml(monthFullName)}</strong> ในพื้นที่ <strong>${escapeHtml(scopeTitle)}</strong> อยู่ในระดับ 
            <strong style="color:${overallGap >= 0 ? '#34D399' : '#F87171'}; font-size:1.05rem;">${overallPct}%</strong> 
            ซึ่ง <strong style="color:${overallGap >= 0 ? '#34D399' : '#F87171'};">${overallGap >= 0 ? `สูงกว่าเป้าหมาย KPI ระดับ 5 (+${overallGap}%)` : `ต่ำกว่าเป้าหมาย KPI ระดับ 5 (${overallGap}%)`}</strong> 
            (เป้าหมายเดือน ${monthName} กำหนดไว้ที่ <strong>${targetPct}%</strong>) 
            โดยมีหน่วยงานที่สามารถทำผลงานผ่านเกณฑ์จำนวน <strong>${passedList.length} จากทั้งหมด ${totalCount} หน่วยงาน</strong> (${passRate}%)
          </div>

          <div class="ai-bullets-list">
            ${completed100List.length > 0 ? `
              <div class="ai-bullet-item">
                <span class="ai-bullet-icon">🌟</span>
                <div class="ai-bullet-text">
                  <strong style="color:#FFD25A;">ผลงานยอดเยี่ยมบรรลุเป้าทั้งปี 100%:</strong> 
                  มี <strong>${completed100List.length} หน่วยงาน</strong> ที่สามารถปิดงานมูลค่า AUC ได้ครบถ้วน 100% เรียบร้อยแล้ว ได้แก่ 
                  <strong>${completed100List.map(i => i.name).join(' และ ')}</strong> ถือเป็นต้นแบบการเร่งรัดงานที่ดีเยี่ยม
                </div>
              </div>
            ` : ''}

            ${fastestGrowthItem ? `
              <div class="ai-bullet-item">
                <span class="ai-bullet-icon">⚡</span>
                <div class="ai-bullet-text">
                  <strong style="color:#38BDF8;">หน่วยงานที่มีอัตราเร่งสูงสุด (MoM Velocity):</strong> 
                  <strong>${fastestGrowthItem.name}</strong> มีความก้าวหน้าโดดเด่น เพิ่มขึ้น 
                  <strong style="color:#34D399;">+${fastestGrowthItem.momGrowth}%</strong> จากเดือนก่อนหน้า
                </div>
              </div>
            ` : ''}

            ${criticalList.length > 0 ? `
              <div class="ai-bullet-item">
                <span class="ai-bullet-icon">⚠️</span>
                <div class="ai-bullet-text">
                  <strong style="color:#F87171;">จุดวิกฤตที่ต้องเร่งรัดด่วน:</strong> 
                  มี <strong>${criticalList.length} หน่วยงาน</strong> ที่ยังตามหลังเส้นเป้าหมาย ได้แก่ 
                  ${criticalList.map(i => `<strong>${i.name}</strong> (${i.pct}%)`).join(', ')} 
                  โดยเฉพาะ <strong>${lowestItem ? lowestItem.name : ''}</strong> ที่ยังตามหลังเป้าหมายอยู่ 
                  <strong style="color:#F87171;">${lowestItem ? Math.abs(lowestItem.gap) : 0}%</strong> 
                  และยังมียอดคงค้างรอปิดงานอีก 
                  <strong style="color:#FBBF24;">${lowestItem ? (isJobCrit ? `${lowestItem.remainJobs.toLocaleString()} งาน` : formatCurrency(lowestItem.remainVal)) : ''}</strong>
                </div>
              </div>
            ` : `
              <div class="ai-bullet-item">
                <span class="ai-bullet-icon">✅</span>
                <div class="ai-bullet-text">
                  <strong style="color:#34D399;">ความเสี่ยงต่ำ:</strong> 
                  ทุกหน่วยงานในพื้นที่สามารถทำผลงานปิดงานได้สูงกว่าหรือเท่ากับเป้าหมาย KPI ระดับ 5
                </div>
              </div>
            `}

            ${borderlineList.length > 0 ? `
              <div class="ai-bullet-item">
                <span class="ai-bullet-icon">🔍</span>
                <div class="ai-bullet-text">
                  <strong style="color:#FBBF24;">กลุ่มเฝ้าระวังใกล้ชิด:</strong> 
                  ${borderlineList.map(i => `<strong>${i.name}</strong> (${i.pct}%)`).join(', ')} 
                  ผ่านเกณฑ์แต่เกาะเส้นเป้าหมายพอดี (+0% ถึง +3%) ต้องเร่งสะสมงานล่วงหน้าเพื่อเตรียมรับเป้าหมายเดือนถัดไป 
                  (<strong>${nextMonthName} 2569: ${nextTargetPct}%</strong>)
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Tab 2: Performance Breakdown -->
      <div class="ai-tab-pane ${activeTab === 'breakdown' ? 'active' : ''}" id="aiTabPane-breakdown">
        ${completed100List.length > 0 ? `
          <div class="ai-tier-section">
            <div class="ai-tier-title" style="color:#38BDF8;">
              <span>🌟 กลุ่มปิดงานสำเร็จครบ 100% (บรรลุเป้าหมายตลอดทั้งปี 2569 ล่วงหน้า)</span>
            </div>
            <div class="ai-tier-grid">
              ${completed100List.map(item => `
                <div class="ai-unit-chip tier-100">
                  <div class="ai-unit-chip-header">
                    <span class="ai-unit-chip-name">${escapeHtml(item.name)}</span>
                    <span class="ai-unit-chip-pct" style="color:#38BDF8;">100.0%</span>
                  </div>
                  <div class="ai-unit-chip-details">
                    <span>ปิดแล้ว: ${isJobCrit ? `${item.closedJobs.toLocaleString()} งาน` : formatCurrencyShort(item.closedVal)}</span>
                    <span class="ai-stat-badge badge-success">สำเร็จ 100% 🏆</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${goodList.length > 0 ? `
          <div class="ai-tier-section">
            <div class="ai-tier-title" style="color:#34D399;">
              <span>🟢 กลุ่มผลงานสูงกว่าเป้าหมาย KPI เดือน ${monthName} (${targetPct}%)</span>
            </div>
            <div class="ai-tier-grid">
              ${goodList.map(item => `
                <div class="ai-unit-chip tier-good">
                  <div class="ai-unit-chip-header">
                    <span class="ai-unit-chip-name">${escapeHtml(item.name)}</span>
                    <span class="ai-unit-chip-pct" style="color:#34D399;">${item.pct}%</span>
                  </div>
                  <div class="ai-unit-chip-details">
                    <span>ปิดแล้ว: ${isJobCrit ? `${item.closedJobs.toLocaleString()} งาน` : formatCurrencyShort(item.closedVal)}</span>
                    <span class="ai-stat-badge badge-success">+${item.gap}% เหนือเป้า</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${borderlineList.length > 0 ? `
          <div class="ai-tier-section">
            <div class="ai-tier-title" style="color:#FBBF24;">
              <span>🟡 กลุ่มเฝ้าระวัง (ผ่านเกณฑ์แบบเกาะเส้นเป้าหมาย Margin ≤ 3%)</span>
            </div>
            <div class="ai-tier-grid">
              ${borderlineList.map(item => `
                <div class="ai-unit-chip tier-borderline">
                  <div class="ai-unit-chip-header">
                    <span class="ai-unit-chip-name">${escapeHtml(item.name)}</span>
                    <span class="ai-unit-chip-pct" style="color:#FBBF24;">${item.pct}%</span>
                  </div>
                  <div class="ai-unit-chip-details">
                    <span>คงเหลือ: ${isJobCrit ? `${item.remainJobs.toLocaleString()} งาน` : formatCurrencyShort(item.remainVal)}</span>
                    <span class="ai-stat-badge badge-warning">เกาะเส้น (+${item.gap}%)</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${criticalList.length > 0 ? `
          <div class="ai-tier-section">
            <div class="ai-tier-title" style="color:#F87171;">
              <span>🔴 กลุ่มต่ำกว่าเป้าหมาย KPI (ต้องเร่งรัดเป็นลำดับแรก)</span>
            </div>
            <div class="ai-tier-grid">
              ${criticalList.map(item => `
                <div class="ai-unit-chip tier-critical">
                  <div class="ai-unit-chip-header">
                    <span class="ai-unit-chip-name">${escapeHtml(item.name)}</span>
                    <span class="ai-unit-chip-pct" style="color:#F87171;">${item.pct}%</span>
                  </div>
                  <div class="ai-unit-chip-details">
                    <span>คงเหลือ: ${isJobCrit ? `${item.remainJobs.toLocaleString()} งาน` : formatCurrencyShort(item.remainVal)}</span>
                    <span class="ai-stat-badge badge-danger">ขาดอีก ${Math.abs(item.gap)}%</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Tab 3: Action Recommendations -->
      <div class="ai-tab-pane ${activeTab === 'recommendations' ? 'active' : ''}" id="aiTabPane-recommendations">
        <div class="ai-actions-list">
          <div class="ai-action-card">
            <div class="ai-action-num">1</div>
            <div class="ai-action-content">
              <div class="ai-action-title">
                เจาะจงเร่งรัดยอดคงค้างใน ${biggestBacklogItem ? biggestBacklogItem.name : (lowestItem ? lowestItem.name : 'หน่วยงานหลัก')}
              </div>
              <div class="ai-action-desc">
                ${biggestBacklogItem ? `<strong>${biggestBacklogItem.name}</strong> มียอดคงเหลือรอปิดงานสูงที่สุดถึง <strong>${isJobCrit ? `${biggestBacklogItem.remainJobs.toLocaleString()} งาน` : formatCurrency(biggestBacklogItem.remainVal)}</strong> แนะนำให้จัดตั้งทีมติดตามเฉพาะกิจ ตรวจสอบโครงการที่ก่อสร้างเสร็จและจ่ายไฟแล้ว (Energized) ให้เร่งส่งมอบงานทางเทคนิคและบันทึก TECO ในระบบ SAP โดยเร็ว` : 'ติดตามงานคงค้างเพื่อปิดบัญชีตามกำหนด'}
              </div>
            </div>
          </div>

          <div class="ai-action-card">
            <div class="ai-action-num">2</div>
            <div class="ai-action-content">
              <div class="ai-action-title">
                สร้าง Buffer รับเป้าหมายเดือนถัดไป (${nextMonthName} 2569: ${nextTargetPct}%)
              </div>
              <div class="ai-action-desc">
                หน่วยงานในกลุ่มเฝ้าระวัง ${borderlineList.length > 0 ? `(${borderlineList.map(i => i.name).join(', ')})` : ''} ที่ผลงานเกาะเส้นเป้าหมายเดือนนี้ ต้องเร่งสะสมงานล่วงหน้าอย่างน้อย 5-10% ภายใน 2 สัปดาห์แรกของเดือน เพื่อป้องกันไม่ให้คะแนน KPI ตกต่ำลงเมื่อเป้าหมายขยับสูงขึ้น
              </div>
            </div>
          </div>

          <div class="ai-action-card">
            <div class="ai-action-num">3</div>
            <div class="ai-action-content">
              <div class="ai-action-title">
                ตัดจ่าย AUC เข้าสินทรัพย์ถาวร (Asset Capitalization) แบบ Fast-Track
              </div>
              <div class="ai-action-desc">
                ประสานงานอย่างใกล้ชิดระหว่างแผนกก่อสร้างและแผนกบัญชีการเงิน ตรวจสอบความถูกต้องของใบสั่งซื้อพัสดุและค่าแรง เพื่อให้สามารถตั้งหนี้ ชำระเงิน และตัดจ่ายจากบัญชีงานระหว่างก่อสร้าง (AUC) เข้าเป็นทรัพย์สินถาวรได้ทันทีหลัง TECO และปิด WBS ได้สมบูรณ์ 100%
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Tab 4: Forecast -->
      <div class="ai-tab-pane ${activeTab === 'forecast' ? 'active' : ''}" id="aiTabPane-forecast">
        <div class="ai-forecast-container">
          <div class="ai-forecast-box">
            <div class="ai-forecast-box-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              <span>การประเมินโอกาสแตะเป้าหมาย 100% สิ้นปี 2569</span>
            </div>
            <div class="ai-forecast-desc">
              ${overallGap >= 0 ? `
                จากอัตราเร่งเฉลี่ยในปัจจุบัน พื้นที่ <strong>${escapeHtml(scopeTitle)}</strong> มีแนวโน้มสูงมากที่จะสามารถปิดงานได้ครบ <strong>100% ภายในเดือน พฤศจิกายน 2569</strong> ซึ่งเร็วกว่าเส้นตายสิ้นปี โดยมีปัจจัยสำคัญอยู่ที่การเร่งรัดยอดคงเหลือใน <strong>${lowestItem ? lowestItem.name : ''}</strong> ให้ตามทันตามแผน
              ` : `
                เนื่องจากผลงานสะสมยังต่ำกว่าเป้าหมาย หากรักษาอัตราเร่งเดิม อาจเสี่ยงที่จะปิดงานไม่ทัน 100% ในเดือน ธันวาคม 2569 จึงจำเป็นต้องเพิ่มความเร็วในการปิดงานอีกอย่างน้อย <strong>15% ต่อเดือน</strong> ในช่วงไตรมาสที่ 4
              `}
            </div>
          </div>

          <div class="ai-forecast-box">
            <div class="ai-forecast-box-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
              <span>เป้าหมายขั้นบันไดถัดไป (KPI Escalation)</span>
            </div>
            <div class="ai-forecast-desc">
              • <strong>เดือน ${nextMonthName} 2569</strong>: เป้าหมาย KPI ระดับ 5 จะปรับขึ้นเป็น <strong>${nextTargetPct}%</strong> (เพิ่มขึ้น +${Math.round((nextTargetPct - targetPct) * 10) / 10}%)<br>
              • <strong>เดือน ต.ค. 2569</strong>: เป้าหมายปรับขึ้นเป็น <strong>90.0%</strong><br>
              • <strong>เดือน พ.ย. 2569</strong>: เป้าหมายปรับขึ้นเป็น <strong>95.0%</strong><br>
              • <strong>เดือน ธ.ค. 2569</strong>: เป้าหมายปิดงานสมบูรณ์ <strong>100.0%</strong>
            </div>
          </div>
        </div>
      </div>
    `;

    container.className = `ai-analysis-panel ${isCollapsedClass}`;
    container.innerHTML = html;
    } catch (err) {
      console.error('Error rendering AI Analysis:', err);
    }
  }

  function renderDonutOverall() {
    const canvas = document.getElementById('donutCompletionChart');
    if (!canvas) return;

    const rows = state.filteredData.filter(d => !d.isSummary);
    const dataSet = rows.length > 0 ? rows : state.filteredData;

    let cVal = 0, rVal = 0;
    dataSet.forEach(d => {
      cVal += d.closedValue;
      rVal += d.remainingValue;
    });

    const total = cVal + rVal;
    const pct = total > 0 ? Math.round((cVal / total) * 100) : 0;

    if (!state.charts.donut) {
      state.charts.donut = new PeaChart(canvas, {
        type: 'donut',
        formatY: (v) => formatCurrencyShort(v)
      });
    }

    const cColors = state.chartColors || DEFAULT_CHART_COLORS;
    state.charts.donut.update({
      labels: ['ปิดงานแล้ว', 'คงเหลือดำเนินการ'],
      datasets: [
        {
          data: [cVal, rVal],
          colors: [cColors.closed, cColors.remaining]
        }
      ]
    }, {
      centerText: `${pct}%`,
      centerSubText: 'ปิดงานสะสม'
    });
  }

  // ==========================================
  // 9. ANALYTICS TAB CHARTS
  // ==========================================
  function renderAnalyticsCharts() {
    renderRankings();
  }

  function getCriteriaOrderRank(c) {
    if (!c) return 999;
    const s = String(c).trim();
    // Priority: Check ข้อ 4 (C02.2) and ข้อ 5 first so 'C02.2' never matches '2.2'
    if (s.includes('4') || s.includes('C02') || s.includes('c02')) return 40;
    if (s.includes('5') || s.includes('จัดสรร')) return 50;
    if (s.includes('1.1')) return 11;
    if (s.includes('1.2')) return 12;
    if (s.includes('1.3')) return 13;
    if (s.includes('2.1')) return 21;
    if (s.includes('2.2')) return 22;
    if (s.includes('3.1')) return 31;
    if (s.includes('3.2')) return 32;
    if (s.includes('3.3')) return 33;
    if (s.includes('3.') || s.includes('TECO') || s.includes('teco')) return 30;
    return 90;
  }

  function getCriteriaBarShortLabel(c) {
    if (!c) return '';
    const s = String(c).trim();
    if (s.includes('4') || s.includes('C02') || s.includes('c02')) return '4 C02.2 ปี 69';
    if (s.includes('5') || s.includes('จัดสรร')) return '5 บ้านจัดสรร';
    if (s.includes('1.1')) return '1.1 C.1 ก่อน 69';
    if (s.includes('1.2')) return '1.2 I,P ก่อน 68';
    if (s.includes('1.3')) return '1.3 I,P ก่อน 69';
    if (s.includes('2.1')) return '2.1 C.1 ปี 69';
    if (s.includes('2.2')) return '2.2 I,P ปี 69';
    if (s.includes('3.1')) return '3.1 TECO D2';
    if (s.includes('3.2')) return '3.2 TECO D2';
    if (s.includes('3.3')) return '3.3 TECO D2';
    if (s.includes('3.') || s.includes('TECO') || s.includes('teco')) return '3 TECO D2';
    return s;
  }

  function getCriteriaRadarShortLabel(c) {
    if (!c) return '';
    const s = String(c).trim();
    if (s.includes('4') || s.includes('C02') || s.includes('c02')) return '4 C02.2';
    if (s.includes('5') || s.includes('จัดสรร')) return '5 จัดสรร';
    if (s.includes('1.1')) return '1.1 C.1';
    if (s.includes('1.2')) return '1.2 I,P(68)';
    if (s.includes('1.3')) return '1.3 I,P(69)';
    if (s.includes('2.1')) return '2.1 C.1';
    if (s.includes('2.2')) return '2.2 I,P';
    if (s.includes('3.1')) return '3.1 TECO';
    if (s.includes('3.2')) return '3.2 TECO';
    if (s.includes('3.3')) return '3.3 TECO';
    if (s.includes('3.') || s.includes('TECO') || s.includes('teco')) return '3 TECO';
    return s;
  }

  // ==========================================
  // CELEBRATORY FIREWORKS SYSTEM FOR CRITERIA > KPI ธ.ค.
  // ==========================================
  window.CriteriaFireworks = {
    canvas: null,
    ctx: null,
    animId: null,
    targets: [],
    particles: [],
    stars: [],
    rings: [],
    width: 0,
    height: 0,
    dpr: 1,
    initialized: false,
    burstTimer: 0,
    burstInterval: 1100, // แสดงพลุฉลองต่อเนื่องตลอดเวลา (Continuous Fireworks) ทุก 1.1 วินาที ไม่ขาดตอน

    init() {
      if (this.initialized && this.canvas) return;
      this.canvas = document.getElementById('criteriaFireworksCanvas');
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.resize();
      window.addEventListener('resize', () => {
        this.resize();
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else if (this.targets.length > 0) {
          this.start();
        }
      });
      this.initialized = true;
    },

    resize() {
      if (!this.canvas || !this.canvas.parentElement) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 1.5); // จำกัด DPR เพื่อประสิทธิภาพ ไม่ให้กินแรงเครื่อง
      this.width = rect.width || 400;
      this.height = rect.height || 280;
      this.canvas.width = Math.floor(this.width * this.dpr);
      this.canvas.height = Math.floor(this.height * this.dpr);
      this.canvas.style.width = `${this.width}px`;
      this.canvas.style.height = `${this.height}px`;
      if (this.ctx) {
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(this.dpr, this.dpr);
      }
    },

    updateTargets(chart) {
      this.init();
      this.resize();

      if (!chart || !chart.renderedBars || !chart.renderedBars.length) {
        this.clearAndStop();
        return;
      }

      // กรองแท่งทั้งหมดที่ผ่านเกณฑ์ KPI ธ.ค.
      const qualifying = chart.renderedBars.filter(b => b.ext && b.ext.isExceedDecKpi);
      if (!qualifying.length) {
        this.clearAndStop();
        return;
      }

      this.targets = qualifying.map((b, idx) => ({
        centerX: b.centerX,
        topY: b.topY,
        barW: b.barW,
        label: b.label,
        val: b.value,
        decTarget: b.ext.decTarget,
        paletteIdx: idx % 3
      }));

      this.burstTimer = 0;

      // แสดงพลุพร้อมกันทุกเกณฑ์วัดที่ผ่านเงื่อนไขทันที
      this.triggerSimultaneousBursts();
      this.start();
    },

    triggerSimultaneousBursts() {
      if (!this.targets || !this.targets.length) return;
      // จุดพลุพร้อมกันทุกเกณฑ์วัดที่ผ่านเกณฑ์ KPI ธ.ค. ตลอดเวลา
      this.targets.forEach((t) => {
        this.createBurst(t.centerX, Math.max(18, t.topY - 22), t.paletteIdx);
      });
    },

    clearAndStop() {
      this.targets = [];
      this.particles = [];
      this.stars = [];
      this.rings = [];
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
      this.stop();
    },

    start() {
      if (this.animId) return;
      let lastTime = performance.now();
      const loop = (now) => {
        const dt = Math.min(35, now - lastTime);
        lastTime = now;
        this.tick(dt, now);
        this.render(now);

        if (this.targets.length > 0 || this.particles.length > 0 || this.stars.length > 0 || this.rings.length > 0) {
          this.animId = requestAnimationFrame(loop);
        } else {
          this.animId = null;
        }
      };
      this.animId = requestAnimationFrame(loop);
    },

    stop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
    },

    createBurst(x, y, paletteIdx = 0) {
      // โทนสีปลอดสีเหลือง 100% (No Yellow): ม่วง กฟภ., เขียวมรกตแห่งความสำเร็จ, ฟ้าคราม และชมพูสดใส
      const palettes = [
        ['#C084FC', '#A855F7', '#E9D5FF', '#FFFFFF'], // PEA Violet & Pure White
        ['#10B981', '#34D399', '#6EE7B7', '#FFFFFF'], // Emerald & Mint Green
        ['#38BDF8', '#06B6D4', '#F472B6', '#FFFFFF']  // Cyan & Radiant Rose
      ];
      const colors = palettes[paletteIdx % palettes.length];

      // 1. วงแหวนกระจายแสง 1 วง (เบาบางและนุ่มนวล)
      this.rings.push({
        x: x,
        y: y,
        r: 3,
        maxR: 20,
        alpha: 0.55,
        color: colors[0]
      });

      // 2. ละอองประกายไฟ (6 อนุภาคต่อจุด เบาสบายตา ไม่ใช้สีเหลือง)
      const count = 6;
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.35;
        const speed = 0.9 + Math.random() * 1.5;
        const col = colors[i % colors.length];
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed * 0.8 - 0.25,
          color: col,
          size: 1.1 + Math.random() * 0.9,
          alpha: 0.92,
          decay: 0.02 + Math.random() * 0.008, // ค่อยๆ จางลงพอดีกับรอบถัดไป
          gravity: 0.028,
          drag: 0.965
        });
      }

      // 3. ดาวประกายระยิบ 1 ดวง
      this.stars.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y - 5 + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -0.2 - Math.random() * 0.2,
        size: 3.0,
        rotation: 0,
        rotSpeed: 0.04,
        alpha: 0.92,
        decay: 0.018,
        color: colors[1] || colors[0]
      });
    },

    tick(dt, now) {
      // แสดงพลุพร้อมกันทุกเกณฑ์วัดที่ผ่านเงื่อนไขอย่างต่อเนื่องตลอดเวลา
      if (this.targets.length > 0) {
        this.burstTimer += dt;
        if (this.burstTimer >= this.burstInterval) {
          this.burstTimer = 0;
          this.triggerSimultaneousBursts();
        }
      }

      // อัปเดตวงแหวน
      for (let i = this.rings.length - 1; i >= 0; i--) {
        const r = this.rings[i];
        r.r += 0.8;
        r.alpha -= 0.035;
        if (r.alpha <= 0 || r.r >= r.maxR) {
          this.rings.splice(i, 1);
        }
      }

      // อัปเดตละอองไฟ
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.vx *= p.drag;
        p.vy = (p.vy * p.drag) + p.gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
        }
      }

      // อัปเดตดาวประกาย
      for (let i = this.stars.length - 1; i >= 0; i--) {
        const s = this.stars[i];
        s.x += s.vx;
        s.y += s.vy;
        s.rotation += s.rotSpeed;
        s.alpha -= s.decay;
        if (s.alpha <= 0) {
          this.stars.splice(i, 1);
        }
      }
    },

    render(now) {
      if (!this.ctx) return;
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.width, this.height);

      if (this.rings.length === 0 && this.particles.length === 0 && this.stars.length === 0) {
        return;
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter'; // ให้แสงสว่างเรืองรองโดยไม่ต้องใช้ shadowBlur

      // 1. วงแหวน (Rings)
      for (let i = 0; i < this.rings.length; i++) {
        const r = this.rings[i];
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      // 2. ละอองไฟ (Sparks - วาดเร็วขึ้น ไม่เรียก save/restore และ shadowBlur ในลูป)
      for (let i = 0; i < this.particles.length; i++) {
        const p = this.particles[i];
        ctx.beginPath();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // 3. ดาวประกายระยิบ (Stars)
      for (let i = 0; i < this.stars.length; i++) {
        const s = this.stars[i];
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rotation);
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = s.color;

        const rOuter = s.size;
        const rInner = s.size * 0.25;
        ctx.beginPath();
        for (let pt = 0; pt < 8; pt++) {
          const r = (pt % 2 === 0) ? rOuter : rInner;
          const a = (pt * Math.PI) / 4;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (pt === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }
  };

  function renderCriteriaComparisonBar() {
    const canvas = document.getElementById('criteriaComparisonChart');
    if (!canvas) return;

    // Collect all unique criteria present in current state.allData (excluding summary rows)
    const presentCrits = Array.from(new Set((state.allData || []).map(d => d.criteria).filter(Boolean)));
    if (!presentCrits.length) return;

    // Sort in logical criteria order (1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4, 5)
    presentCrits.sort((a, b) => getCriteriaOrderRank(a) - getCriteriaOrderRank(b));

    const labels = presentCrits.map(c => getCriteriaBarShortLabel(c));

    // Support province filter if selected
    const provFilter = state.filters && state.filters.province;
    const isFilteredProv = provFilter && provFilter !== 'ALL' && provFilter !== 'กฟก.3' && provFilter !== 'กฟก.3 (ทั้งหมด)';

    // Support office filter (หน่วยงาน 41 แห่ง)
    const offFilter = state.filters && state.filters.office;
    const isFilteredOff = offFilter && offFilter !== 'ALL';

    // Target Lines for criteriaComparisonChart: เดือนล่าสุด และ 3 เดือนถัดไป เท่านั้น (ทศนิยม 2 ตำแหน่ง)
    const monthNames = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const curMonthIdx = (typeof state.filters.month === 'number') ? state.filters.month : 7; // ค่าเริ่มต้น ส.ค. (index 7, monthNum 8)

    // Helper to get Level 5 KPI Target for any criteria and month
    function getCriteriaTarget(critName, mIdx) {
      if (!window.KPI_MATRIX || !Array.isArray(window.KPI_MATRIX)) return null;
      const mNum = (mIdx !== undefined && mIdx !== null && mIdx !== 'ALL') ? (Number(mIdx) + 1) : 8;

      // 1. Direct match
      let row = window.KPI_MATRIX.find(r => r.monthNum === mNum && matchCriteriaName(critName, r.criteria));

      // 2. Fallback for general TECO (only if not specifically 3.1, 3.2, 3.3)
      if (!row && !critName.includes('3.1') && !critName.includes('3.2') && !critName.includes('3.3') && (critName.includes('TECO') || critName.includes('teco') || critName.includes('3.'))) {
        row = window.KPI_MATRIX.find(r => r.monthNum === mNum && (r.criteria.includes('TECO') || r.criteria.includes('3.')) && r.level5 && r.level5 !== '-');
      }

      // 3. Fallback for Category 4 (C02.2)
      if (!row && (critName.includes('C02') || critName.includes('c02') || critName.includes('4'))) {
        row = window.KPI_MATRIX.find(r => r.monthNum === mNum && (r.criteria.includes('C02') || r.criteria.includes('4')) && r.level5 && r.level5 !== '-');
      }

      // 4. Fallback for Category 5 (บ้านจัดสรร)
      if (!row && (critName.includes('บ้าน') || critName.includes('จัดสรร') || critName.includes('5'))) {
        row = window.KPI_MATRIX.find(r => r.monthNum === mNum && (r.criteria.includes('บ้าน') || r.criteria.includes('จัดสรร')) && r.level5 && r.level5 !== '-');
      }

      if (!row || !row.level5 || row.level5 === '-') return null;
      const num = parseFloat(row.level5.replace('%', '').trim());
      return isNaN(num) ? null : num;
    }

    const pcts = [];
    const extraList = [];
    const barColors = [];
    const targetColors = ['#34D399', '#F472B6', '#38BDF8'];
    const textColors = ['#6EE7B7', '#F9A8D4', '#7DD3FC'];

    presentCrits.forEach(crit => {
      let rows = state.allData.filter(d => d.criteria === crit && !d.isSummary);
      if (isFilteredOff) {
        rows = rows.filter(d => d.office === offFilter);
      } else if (isFilteredProv) {
        rows = rows.filter(d => d.province === provFilter);
      }

      let totalVal = 0, closedVal = 0;
      const isJobUnit = crit.includes('TECO') || crit.includes('teco') || crit.includes('3.') || crit.includes('4') || crit.includes('C02.2') || (rows[0] && rows[0].unit === 'งาน');

      rows.forEach(d => {
        if (isJobUnit) {
          totalVal += (d.totalJobs || 0);
          closedVal += (d.closedJobs || 0);
        } else {
          totalVal += (d.totalValue || 0);
          closedVal += (d.closedValue || 0);
        }
      });

      // ผลงานจริงคำนวณทศนิยม 2 ตำแหน่ง
      let pct = 0;
      if (totalVal > 0) {
        pct = Number(((closedVal / totalVal) * 100).toFixed(2));
      } else if (rows.length === 1 && typeof rows[0].latestPercent === 'number' && rows[0].latestPercent > 0) {
        pct = Number(rows[0].latestPercent.toFixed(2));
      }

      const isNoWork = totalVal === 0;

      // Determine KPI Level (1-5)
      let kpi = 0;
      if (isFilteredOff && rows[0] && typeof rows[0].kpiScore === 'number' && rows[0].kpiScore > 0) {
        kpi = rows[0].kpiScore;
      } else if (!isNoWork) {
        const evalRes = evaluateKpiScore(crit, state.filters.month, pct);
        if (evalRes && evalRes.level) {
          kpi = evalRes.level;
        } else {
          const l5Target = getCriteriaTarget(crit, state.filters.month);
          kpi = (l5Target !== null && pct >= l5Target) ? 5 : (pct >= 100 ? 5 : 1);
        }
      }

      // Bar color: KPI ระดับ 5 -> Green (#10B981), KPI 1-4 -> Red (#EF4444), ไม่มีงาน -> Slate (#64748B)
      let barColor = '#10B981';
      if (isNoWork) {
        barColor = '#64748B';
      } else if (kpi >= 5) {
        barColor = '#10B981'; // เขียว: KPI ระดับ 5
      } else {
        barColor = '#EF4444'; // แดง: KPI ระดับ 1-4
      }
      barColors.push(barColor);

      // คำนวณเส้นและป้ายเป้าหมาย % KPI ระดับ 5 ในแท่งกราฟ แยกอิสระตามประเภทเกณฑ์วัด:
      // - เป้าเดือนล่าสุด: ใช้สีเหลืองทอง (#FFB81C)
      // - เป้าเดือนถัดไป ถึง เดือน ธ.ค.: หาก %ปิดงาน >= KPI ให้ใช้สีเขียว (#10B981), หาก < KPI ให้ใช้สีแดง (#EF4444)
      const rawBarTargets = [];
      const targetLatest = getCriteriaTarget(crit, curMonthIdx);
      if (targetLatest !== null) {
        rawBarTargets.push({
          isLatestMonth: true,
          monthIdx: curMonthIdx,
          monthName: monthNames[curMonthIdx] || 'ส.ค.',
          value: targetLatest,
          color: '#FFB81C',
          textColor: '#FFD25A'
        });
      }

      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = curMonthIdx + offset;
        if (nextIdx <= 11) {
          const nextTarget = getCriteriaTarget(crit, nextIdx);
          if (nextTarget !== null) {
            const isPass = (pct >= (nextTarget - 0.001));
            rawBarTargets.push({
              isLatestMonth: false,
              monthIdx: nextIdx,
              monthName: monthNames[nextIdx],
              value: nextTarget,
              isPass: isPass,
              color: isPass ? '#00FF88' : '#FF2D55', // สีเขียวทับทิม สว่าง (#00FF88) เมื่อผ่านเกณฑ์, สีแดงทับทิม (#FF2D55) เมื่อต้องเร่งรัด
              textColor: isPass ? '#E8FFF2' : '#FFE4E8'
            });
          }
        }
      }

      // เป้าหมายเดือน ธ.ค. (สิ้นปี 2569) - ตรวจสอบว่า % ปิดงาน ชนะ/บรรลุเป้าหมายเดือน ธ.ค. หรือไม่
      const decMonthIdx = 11; // ธ.ค. (index 11, monthNum 12)
      const decTarget = getCriteriaTarget(crit, decMonthIdx);
      const isExceedDecKpi = (!isNoWork && typeof decTarget === 'number' && decTarget > 0 && pct >= (decTarget - 0.001));

      if (decMonthIdx > curMonthIdx + 2) {
        if (decTarget !== null) {
          const isPass = (pct >= (decTarget - 0.001));
          rawBarTargets.push({
            isLatestMonth: false,
            monthIdx: decMonthIdx,
            monthName: 'ธ.ค.',
            value: decTarget,
            isPass: isPass,
            color: isPass ? '#00FF88' : '#FF2D55',
            textColor: isPass ? '#E8FFF2' : '#FFE4E8'
          });
        }
      }

      // รวมเป้าหมายเดือนถัดไปที่ค่าเท่ากันและสถานะเดียวกันบนแท่งเดียวกัน เพื่อไม่ให้ป้ายซ้อนทับกัน (เป้าเดือนล่าสุดแยกเดี่ยวเป็นสีเหลืองทองเสมอ)
      const barTargetLines = [];
      rawBarTargets.forEach(bt => {
        const valStr = `${Number(bt.value).toFixed(2)}%`;
        const existing = !bt.isLatestMonth && barTargetLines.find(x => !x.isLatestMonth && Math.abs(Number(x.value) - Number(bt.value)) < 0.001 && x.isPass === bt.isPass);
        if (existing) {
          if (!existing.monthNames) existing.monthNames = [existing.monthName];
          if (!existing.monthNames.includes(bt.monthName)) {
            existing.monthNames.push(bt.monthName);
          }
          const mNames = existing.monthNames;
          if (mNames.includes('ก.ย.') && mNames.includes('ธ.ค.') && mNames.length >= 2) {
            existing.label = `ก.ย.-ธ.ค. ${valStr}`;
          } else if (mNames.includes('ต.ค.') && mNames.includes('ธ.ค.') && mNames.length >= 2) {
            existing.label = `ต.ค.-ธ.ค. ${valStr}`;
          } else if (mNames.includes('ก.ย.') && mNames.includes('ต.ค.') && mNames.length >= 2) {
            existing.label = `ก.ย.-ต.ค. ${valStr}`;
          } else if (mNames.length > 1) {
            existing.label = `${mNames.join(', ')} ${valStr}`;
          }
        } else {
          barTargetLines.push({
            ...bt,
            monthNames: [bt.monthName],
            label: `${bt.monthName} ${valStr}`
          });
        }
      });

      // เป้า KPI ระดับ 5 ใน tooltip สำหรับเดือนล่าสุด, 2 เดือนถัดไป, และเดือน ธ.ค. (สิ้นปี 69)
      const kpiTargets = [];
      if (targetLatest !== null) {
        kpiTargets.push({
          label: `เป้า ${monthNames[curMonthIdx] || 'ส.ค.'} (ล่าสุด)`,
          value: `${targetLatest.toFixed(2)}%`,
          color: '#FFB81C'
        });
      }

      for (let offset = 1; offset <= 2; offset++) {
        const nextIdx = curMonthIdx + offset;
        if (nextIdx <= 11) {
          const tVal = getCriteriaTarget(crit, nextIdx);
          if (tVal !== null) {
            const isPass = (pct >= (tVal - 0.001));
            kpiTargets.push({
              label: `เป้า ${monthNames[nextIdx]} (+${offset})`,
              value: `${tVal.toFixed(2)}%`,
              color: isPass ? '#00FF88' : '#FF2D55'
            });
          }
        }
      }

      if (decMonthIdx > curMonthIdx + 2) {
        if (decTarget !== null) {
          const isPass = (pct >= (decTarget - 0.001));
          kpiTargets.push({
            label: 'เป้า ธ.ค. (สิ้นปี 69)',
            value: `${decTarget.toFixed(2)}%`,
            color: isPass ? '#00FF88' : '#FF2D55'
          });
        }
      }

      // คำนวณจำนวนดาว KPI ระดับ 5: ผ่านเกณฑ์ 1 เดือน ให้ 1 ดาว, 2 เดือน 2 ดาว ตามลำดับ
      // ตรวจสอบตั้งแต่เดือนปัจจุบันจนถึงสิ้นปี (ธ.ค.)
      let starCount = 0;
      if (!isNoWork) {
        for (let m = curMonthIdx; m <= 11; m++) {
          const tVal = getCriteriaTarget(crit, m);
          if (tVal !== null && typeof tVal === 'number' && tVal > 0) {
            if (pct >= (tVal - 0.001)) {
              starCount++;
            } else {
              break; // หลุดเกณฑ์เดือนใด หยุดนับทันที
            }
          }
        }
        // หากผลงานผ่านเกณฑ์ KPI ระดับ 5 (kpi >= 5) แต่ยังไม่ได้ดาว ให้ได้อย่างน้อย 1 ดาว
        if (kpi >= 5 && starCount === 0) {
          starCount = 1;
        }
      }

      pcts.push(pct);
      extraList.push({
        fullTitle: crit,
        closed: isJobUnit ? `${closedVal.toLocaleString()} งาน` : `${formatCurrency(closedVal)} บาท`,
        total: isJobUnit ? `${totalVal.toLocaleString()} งาน` : `${formatCurrency(totalVal)} บาท`,
        isNoWork: isNoWork,
        kpi: isNoWork ? '-' : kpi,
        targetBenchmark: targetLatest,
        barTargetLines: barTargetLines,
        kpiTargets: kpiTargets,
        decTarget: decTarget,
        isExceedDecKpi: isExceedDecKpi,
        starCount: starCount
      });
    });

    // Update title with actual count of criteria and province/office
    const titleEl = document.getElementById('criteriaComparisonTitle');
    if (titleEl) {
      let filterText = '';
      if (isFilteredOff) {
        filterText = isFilteredProv ? ` (${provFilter} - ${offFilter})` : ` (${offFilter})`;
      } else if (isFilteredProv) {
        filterText = ` (${provFilter})`;
      }
      titleEl.innerHTML = `<span class="criteria-title-full">ร้อยละความสำเร็จการปิดงาน (% Closed) แยกตาม ${labels.length} ประเภทเกณฑ์วัด${escapeHtml(filterText)}</span>`;
    }

    const cColors = state.chartColors || DEFAULT_CHART_COLORS;

    const chartOptions = {
      type: 'bar',
      barRatio: 0.82, // สัดส่วนความกว้างแท่งกราฟสำหรับพื้นที่กราฟ ~65%
      maxBarWidth: 80, // กำหนดความกว้างแท่งสูงสุดให้สมดุลสวยงาม
      padding: { top: 52, right: 20, bottom: 85, left: 62 },
      formatY: (v) => `${Number(v).toFixed(2)}%`,
      yLabelAlign: 'right', // จัดชิดขวาของแกน Y เว้นระยะห่างจากเส้นกราฟอย่างสมดุล ไม่ชิดหรือทับกราฟ
      yLabelRightGap: 8, // เว้นระยะห่างจากขอบกราฟ 8px
      yFontSize: 11, // เพิ่มขนาดอักษรแกน Y ให้ใหญ่ ชัดเจน อ่านง่าย
      yFontWeight: '600',
      yLabelColor: '#E2D4F0',
      yMax: 100,
      gridSteps: 2,
      targetBadgeFontSize: 8.2, // ขนาดตัวอักษรเกณฑ์วัด KPI ชัดเจน อ่านง่าย
      targetBadgeHeight: 13, // ความสูงป้ายเกณฑ์วัด
      badgeInset: 7, // เว้นระยะขอบซ้าย-ขวาให้เห็นเส้นและสีเรืองแสงของขอบแท่งกราฟอย่างชัดเจน
      targetBadgeFullWidth: true, // ปรับความกว้างของป้ายเกณฑ์วัด % ให้เกือบเต็มแท่งกราฟ (เว้นขอบแท่ง)
      showBarValues: true,
      barValuePosition: 'bottom', // เฉพาะกราฟนี้ ปรับ % ทุกกราฟแท่ง มาไว้ล่างสุด
      barValueTheme: 'gold', // เปลี่ยนสี % ทุกแท่งเป็นสีเหลืองทองตามคำขอ
      barValueColor: '#FFD25A', // สีเหลืองทอง PEA Gold
      barValueFontSize: 10, // ขนาดตัวเลข % สีเหลืองทอง
      barValueHeight: 15.5,
      barValueFullWidth: true, // ปรับความกว้างของป้าย % ล่างสุดให้เกือบเต็มแท่งกราฟ (เว้นขอบแท่ง)
      showBarTargetLines: false, // เอาเส้นตรงแนวนอนออกทั้งหมด (ไม่วาดเส้นประแนวนอนเป้าหมายบนแท่งกราฟ)
      showGridLines: false, // เอาเส้นตรงแนวนอนออกทั้งหมด (ไม่วาดเส้นกริดแนวนอน)
      rotateXLabels: true,
      xLabelFontWeight: '600',
      xLabelFontSize: 12,
      xLabelColor: '#FFFFFF',
      targetLines: [], // ไม่ใช้เส้นรวมทั้งกราฟ แต่แยกอิสระในแต่ละแท่งตามเกณฑ์วัด
      formatBarValue: (val, idx) => {
        const ext = extraList[idx];
        if (ext && ext.isNoWork) return 'ไม่มีงาน';
        return `${Number(val).toFixed(2)}%`;
      },
      showLegend: true,
      customLegend: [
        { label: 'KPI ระดับ 5 (ผ่านเป้าหมาย)', color: '#10B981' },
        { label: 'KPI ระดับ 1-4 (ต้องเร่งรัด)', color: '#EF4444' },
        { label: `เป้า ${monthNames[curMonthIdx] || 'ส.ค.'} (ล่าสุด)`, color: '#FFB81C' },
        { label: 'เป้าถัดไป-สิ้นปี (ผ่านเกณฑ์)', color: '#00FF88' },
        { label: 'เป้าถัดไป-สิ้นปี (ต้องเร่งรัด)', color: '#FF2D55' },
        { label: '★ ผ่านเกณฑ์สะสม (1 ดาว/เดือน)', color: '#FFD25A' },
        { label: '✓ บรรลุเป้าหมาย ธ.ค. (สิ้นปี 69)', color: '#00FF88' }
      ],
      onRender: (chart) => {
        if (window.CriteriaFireworks && typeof window.CriteriaFireworks.updateTargets === 'function') {
          window.CriteriaFireworks.updateTargets(chart);
        }
      }
    };

    if (!state.charts.critBar) {
      state.charts.critBar = new PeaChart(canvas, chartOptions);
    } else {
      state.charts.critBar.options.targetLines = [];
      Object.assign(state.charts.critBar.options, chartOptions);
    }

    state.charts.critBar.update({
      labels: labels,
      datasets: [
        {
          label: isFilteredOff ? `% ความสำเร็จ (${offFilter})` : (isFilteredProv ? `% ความสำเร็จ (${provFilter})` : '% ความสำเร็จปิดงาน'),
          data: pcts,
          color: '#10B981',
          colors: barColors,
          extra: extraList
        }
      ]
    }, chartOptions);

    if (window.CriteriaFireworks && typeof window.CriteriaFireworks.updateTargets === 'function') {
      window.CriteriaFireworks.updateTargets(state.charts.critBar);
    }
  }

  function renderRadarProvincialKpi() {
    const canvas = document.getElementById('radarProvincialChart');
    if (!canvas) return;

    // Collect all unique criteria present in current state.allData (excluding summary rows)
    const presentCrits = Array.from(new Set((state.allData || []).map(d => d.criteria).filter(Boolean)));
    if (!presentCrits.length) return;

    // Sort in logical criteria order (1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3, 4, 5)
    presentCrits.sort((a, b) => getCriteriaOrderRank(a) - getCriteriaOrderRank(b));

    const labels = presentCrits.map(c => getCriteriaRadarShortLabel(c));

    const provFilter = state.filters && state.filters.province;
    const isFilteredProv = provFilter && provFilter !== 'ALL' && provFilter !== 'กฟก.3' && provFilter !== 'กฟก.3 (ทั้งหมด)';

    const offFilter = state.filters && state.filters.office;
    const isFilteredOff = offFilter && offFilter !== 'ALL';

    let datasets = [];

    if (isFilteredOff) {
      // Find office province for benchmark comparison
      const offRow = (state.allData || []).find(d => d.office === offFilter && !d.isSummary);
      const offProv = offRow ? offRow.province : (isFilteredProv ? provFilter : '');

      // 1. Selected Office Dataset
      const officeScores = presentCrits.map(crit => {
        const rows = state.allData.filter(d => d.office === offFilter && d.criteria === crit && !d.isSummary);
        if (!rows.length) return 0;
        return rows[0].kpiScore || 0;
      });

      datasets.push({
        label: offFilter,
        data: officeScores,
        color: '#FFB81C', // Bright PEA Gold
        max: 5
      });

      // 2. Benchmark Dataset: Provincial Average (or Region กฟก.3)
      let benchmarkLabel = 'เฉลี่ย กฟก.3 (ภาพรวม)';
      let benchmarkRows = state.allData.filter(d => !d.isSummary && d.office !== 'กฟก.3 ผลรวม');
      if (offProv && offProv !== 'ALL' && offProv !== 'กฟก.3') {
        benchmarkLabel = offProv.includes('กอง') ? 'เฉลี่ย กองใน กฟก.3' : `เฉลี่ย จ.${offProv}`;
        benchmarkRows = benchmarkRows.filter(d => d.province === offProv);
      }

      const benchmarkScores = presentCrits.map(crit => {
        const rows = benchmarkRows.filter(d => d.criteria === crit);
        if (!rows.length) return 0;
        let sum = 0, count = 0;
        rows.forEach(r => {
          if (r.kpiScore > 0) {
            sum += r.kpiScore;
            count++;
          }
        });
        return count > 0 ? Number((sum / count).toFixed(2)) : 0;
      });

      datasets.push({
        label: benchmarkLabel,
        data: benchmarkScores,
        color: '#A855F7', // PEA Purple
        max: 5
      });
    } else {
      // "ทุกหน่วยงาน"
      const provs = (provFilter === 'กอง/กฟก.3')
        ? ['กอง/กฟก.3', 'นครปฐม', 'สุพรรณบุรี', 'กาญจนบุรี', 'สมุทรสาคร']
        : ['นครปฐม', 'สุพรรณบุรี', 'กาญจนบุรี', 'สมุทรสาคร'];
      const colors = ['#A855F7', '#FFB81C', '#10B981', '#06B6D4', '#EC4899'];

      datasets = provs.map((p, idx) => {
        const data = presentCrits.map(crit => {
          const rows = state.allData.filter(d => d.province === p && d.criteria === crit && !d.isSummary);
          if (!rows.length) return 0;
          let sum = 0, count = 0;
          rows.forEach(r => {
            if (r.kpiScore > 0) {
              sum += r.kpiScore;
              count++;
            }
          });
          return count > 0 ? Number((sum / count).toFixed(2)) : 0;
        });

        return {
          label: p,
          data,
          color: colors[idx % colors.length],
          max: 5
        };
      });
    }

    // Update Radar Title
    const radarTitleEl = document.getElementById('radarProvincialTitle');
    if (radarTitleEl) {
      if (isFilteredOff) {
        radarTitleEl.textContent = `แผนภูมิเรดาร์คะแนน KPI: ${offFilter} (Radar Analysis)`;
      } else if (isFilteredProv) {
        radarTitleEl.textContent = `แผนภูมิเรดาร์คะแนน KPI รายจังหวัด (${provFilter}) (Radar Analysis)`;
      } else {
        radarTitleEl.textContent = 'แผนภูมิเรดาร์คะแนน KPI รายจังหวัด (Radar Analysis)';
      }
    }

    if (!state.charts.radar) {
      state.charts.radar = new PeaChart(canvas, {
        type: 'radar',
        padding: { top: 30, right: 30, bottom: 30, left: 30 }
      });
    }

    state.charts.radar.update({
      labels,
      datasets
    });
  }

  function renderRankings() {
    const topContainer = document.getElementById('topRankingsList');
    const botContainer = document.getElementById('bottomRankingsList');
    if (!topContainer || !botContainer) return;

    // Aggregate by office
    const officeMap = {};
    state.allData.filter(d => !d.isSummary).forEach(d => {
      if (!officeMap[d.office]) {
        officeMap[d.office] = {
          office: d.office,
          province: d.province,
          kpiSum: 0,
          kpiCount: 0,
          totalVal: 0,
          closedVal: 0,
          remainVal: 0,
          totalJobs: 0,
          closedJobs: 0
        };
      }
      officeMap[d.office].totalVal += d.totalValue;
      officeMap[d.office].closedVal += d.closedValue;
      officeMap[d.office].remainVal += d.remainingValue;
      officeMap[d.office].totalJobs += d.totalJobs;
      officeMap[d.office].closedJobs += d.closedJobs;
      if (d.kpiScore > 0) {
        officeMap[d.office].kpiSum += d.kpiScore;
        officeMap[d.office].kpiCount++;
      }
    });

    const officeList = Object.values(officeMap).map(o => ({
      ...o,
      avgKpi: o.kpiCount > 0 ? (o.kpiSum / o.kpiCount) : 0,
      pct: o.totalVal > 0 ? (o.closedVal / o.totalVal) * 100 : 0
    }));

    officeList.sort((a, b) => b.avgKpi - a.avgKpi || b.pct - a.pct);

    const top5 = officeList.slice(0, 5);
    const bot5 = officeList.slice(-5).reverse();

    topContainer.innerHTML = top5.map((o, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.75rem; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:var(--radius-md); margin-bottom:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="width:24px; height:24px; border-radius:50%; background:#10B981; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">${i + 1}</span>
          <div>
            <strong style="font-size:0.875rem; color:var(--text-main);">${escapeHtml(o.office)}</strong>
            <div style="font-size:0.725rem; color:var(--text-dim);">${escapeHtml(o.province)} • สำเร็จ ${o.pct.toFixed(2)}%</div>
          </div>
        </div>
        <span class="kpi-score-badge kpi-score-5">★ ${Math.round(o.avgKpi)}</span>
      </div>
    `).join('');

    botContainer.innerHTML = bot5.map((o, i) => `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.75rem; background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); border-radius:var(--radius-md); margin-bottom:0.5rem;">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <span style="width:24px; height:24px; border-radius:50%; background:#EF4444; color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">${i + 1}</span>
          <div>
            <strong style="font-size:0.875rem; color:var(--text-main);">${escapeHtml(o.office)}</strong>
            <div style="font-size:0.725rem; color:var(--text-dim);">${escapeHtml(o.province)} • คงเหลือ ${formatCurrencyShort(o.remainVal)}</div>
          </div>
        </div>
        <span class="kpi-score-badge kpi-score-1">★ ${Math.round(o.avgKpi)}</span>
      </div>
    `).join('');
  }

  // ==========================================
  // 10. DATA TABLE RENDERING & PAGINATION
  // ==========================================
  function renderTable() {
    const tbody = document.getElementById('aucTableBody');
    if (!tbody) return;

    const { page, pageSize } = state.table;
    const totalRecords = state.filteredData.length;
    const startIdx = (page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalRecords);
    const pagedRecords = state.filteredData.slice(startIdx, endIdx);

    setElemText('tableTotalCount', totalRecords.toLocaleString());
    setElemText('tablePageRange', `${totalRecords === 0 ? 0 : startIdx + 1} - ${endIdx}`);

    if (totalRecords === 0) {
      const hasReport = hasReportForMonth(state.filters.month);
      tbody.innerHTML = `
        <tr>
          <td colspan="11" style="text-align:center; padding:3rem 1rem; color:var(--text-dim);">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin:0 auto 0.75rem; opacity:0.5; display:block;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div style="font-size:0.95rem; font-weight:600; color:var(--text-muted); margin-bottom:0.25rem;">
              ${hasReport ? 'ไม่พบข้อมูลที่ตรงกับเงื่อนไขการค้นหา / ตัวกรอง' : 'ไม่มีข้อมูลรายงานประจำเดือนนี้'}
            </div>
            <div style="font-size:0.8rem; color:var(--text-dim);">
              ${hasReport ? 'โปรดลองเปลี่ยนคำค้นหาหรือตัวกรองใหม่อีกครั้ง' : 'ข้อมูลผลการดำเนินงานจริงผูกกับเดือน <strong>มกราคม (ม.ค.)</strong>, <strong>กุมภาพันธ์ (ก.พ.)</strong> และ <strong>กรกฎาคม (ก.ค.)</strong>'}
            </div>
          </td>
        </tr>
      `;
      return;
    }

    let html = '';
    pagedRecords.forEach((d, idx) => {
      const isJob = d.unit === 'งาน';
      const totVal = Number(d.totalValue) || 0;
      const totJobs = Number(d.totalJobs) || 0;
      const isNoWork = totVal === 0 && totJobs === 0;

      const pct = isJob
        ? (totJobs > 0 ? (d.closedJobs / totJobs) * 100 : 0)
        : (totVal > 0 ? (d.closedValue / totVal) * 100 : 0);

      const kpiScoreRound = Math.max(1, Math.min(5, Math.round(d.kpiScore)));
      const rowClass = d.isSummary ? 'row-summary' : '';

      html += `
        <tr class="${rowClass}">
          <td style="text-align:center; color:var(--text-dim); font-size:0.75rem;">${startIdx + idx + 1}</td>
          <td>
            <strong>${escapeHtml(d.office)}</strong>
            ${d.isSummary ? '<span class="badge-pea-tag" style="margin-left:6px;">ผลรวม</span>' : ''}
          </td>
          <td>
            <span style="font-size:0.8rem; color:var(--text-muted);">${escapeHtml(d.province)}</span>
          </td>
          <td>
            <span style="font-size:0.8rem;">${escapeHtml(d.criteria)}</span>
          </td>
          <td style="text-align:center;">
            <span class="badge-pea-tag" style="background:rgba(104,44,145,0.3);">${escapeHtml(d.unit)}</span>
          </td>
          <td style="text-align:right; font-variant-numeric:tabular-nums;">
            ${isNoWork
              ? '<span class="badge-pea-tag" style="background:rgba(255,255,255,0.06); color:var(--text-muted); border:1px solid rgba(255,255,255,0.12); font-weight:600;">ไม่มีงาน</span>'
              : (isJob ? formatNumber(d.totalJobs) + ' งาน' : formatCurrency(d.totalValue))}
          </td>
          <td style="text-align:right; font-variant-numeric:tabular-nums; color:var(--pea-gold-400); font-weight:600;">
            ${isNoWork ? '<span style="color:var(--text-dim);">-</span>' : (isJob ? formatNumber(d.closedJobs) + ' งาน' : formatCurrency(d.closedValue))}
          </td>
          <td style="text-align:right; font-variant-numeric:tabular-nums; color:${d.remainingValue > 0 ? 'var(--status-danger)' : 'var(--text-dim)'};">
            ${isNoWork ? '<span style="color:var(--text-dim);">-</span>' : (isJob ? formatNumber(d.remainingJobs) + ' งาน' : formatCurrency(d.remainingValue))}
          </td>
          <td>
            ${isNoWork
              ? `<div style="display:flex; align-items:center; justify-content:center;">
                   <span class="badge-pea-tag" style="background:rgba(255,255,255,0.06); color:var(--text-muted); border:1px solid rgba(255,255,255,0.12); padding:0.2rem 0.65rem; border-radius:12px; font-size:0.75rem; font-weight:700;">ไม่มีงาน</span>
                 </div>`
              : `<div style="display:flex; align-items:center; gap:8px;">
                   <div class="progress-track" style="flex:1; margin:0; min-width:60px;">
                     <div class="progress-fill ${pct >= 100 ? 'fill-success' : (pct >= 60 ? 'fill-warning' : 'fill-danger')}" style="width:${Math.min(100, pct)}%"></div>
                   </div>
                   <span style="font-size:0.775rem; font-weight:600; min-width:48px; text-align:right;">${pct.toFixed(2)}%</span>
                 </div>`
            }
          </td>
          <td style="text-align:center;">
            ${isNoWork
              ? '<span class="kpi-score-badge kpi-score-neutral" title="ไม่มีงาน ไม่นำมาคิดคะแนน">-</span>'
              : `<span class="kpi-score-badge ${d.kpiScore > 0 ? 'kpi-score-' + kpiScoreRound : 'kpi-score-neutral'}">${d.kpiScore > 0 ? '★ ' + d.kpiScore : '-'}</span>`
            }
          </td>
          <td style="text-align:center;">
            <button class="btn btn-outline" style="padding:0.3rem 0.65rem; font-size:0.75rem;" onclick="window.openDrilldownModal(${d.id})">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              แผนรายเดือน
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Update Pagination Controls
    const maxPage = Math.ceil(totalRecords / pageSize);
    const prevBtn = document.getElementById('btnPrevPage');
    const nextBtn = document.getElementById('btnNextPage');
    if (prevBtn) prevBtn.disabled = page <= 1;
    if (nextBtn) nextBtn.disabled = page >= maxPage;

    renderPaginationNumbers(maxPage);
  }

  function renderPaginationNumbers(maxPage) {
    const container = document.getElementById('paginationNumbers');
    if (!container) return;

    let html = '';
    const cur = state.table.page;
    const start = Math.max(1, cur - 2);
    const end = Math.min(maxPage, cur + 2);

    for (let i = start; i <= end; i++) {
      html += `
        <button class="page-btn ${i === cur ? 'active' : ''}" onclick="window.goToPage(${i})">${i}</button>
      `;
    }
    container.innerHTML = html;
  }

  window.goToPage = function (p) {
    state.table.page = p;
    renderTable();
  };

  // ==========================================
  // 11. DRILL-DOWN MODAL & SCENARIO SIMULATOR
  // ==========================================
  window.openDrilldownModal = function (recId) {
    const rec = state.allData.find(d => d.id === recId);
    if (!rec) return;

    state.selectedRecord = rec;
    state.scenarioData = {
      ...rec,
      monthlyPlan: [...rec.monthlyPlan]
    };

    setElemText('modalOfficeName', rec.office);
    setElemText('modalProvinceBadge', rec.province);
    setElemText('modalCriteriaBadge', rec.criteria);
    setElemText('modalUnitBadge', rec.unit);

    renderModalContent();

    const modal = document.getElementById('drilldownModal');
    if (modal) modal.classList.add('show');
  };

  function renderModalContent() {
    const rec = state.scenarioData || state.selectedRecord;
    if (!rec) return;

    const isJob = rec.unit === 'งาน';
    const total = isJob ? rec.totalJobs : rec.totalValue;
    const closed = isJob ? rec.closedJobs : rec.closedValue;
    const remain = isJob ? rec.remainingJobs : rec.remainingValue;
    const isNoWork = (Number(rec.totalValue) || 0) === 0 && (Number(rec.totalJobs) || 0) === 0;
    const pct = total > 0 ? (closed / total) * 100 : 0;

    // Overview numbers
    setElemText('modalTotalVal', isNoWork ? 'ไม่มีงาน' : (isJob ? `${formatNumber(total)} งาน` : formatCurrency(total)));
    setElemText('modalClosedVal', isNoWork ? '-' : (isJob ? `${formatNumber(closed)} งาน` : formatCurrency(closed)));
    setElemText('modalRemainVal', isNoWork ? '-' : (isJob ? `${formatNumber(remain)} งาน` : formatCurrency(remain)));
    setElemText('modalPctVal', isNoWork ? 'ไม่มีงาน' : `${pct.toFixed(2)}%`);
    setElemText('modalKpiVal', isNoWork ? '-' : `★ ${rec.kpiScore} / 5`);

    // Monthly breakdown table
    const tableBody = document.getElementById('modalMonthlyTableBody');
    if (tableBody) {
      let html = '';
      for (let m = 0; m < 12; m++) {
        const plan = rec.monthlyPlan[m] || 0;
        const targetPct = (rec.monthlyTargetPct[m] || 0) * 100;
        const gap = rec.monthlyGap[m] || 0;

        html += `
          <tr>
            <td style="font-weight:600; text-align:center;">${MONTHS_TH[m]}</td>
            <td style="text-align:right;">
              <input type="number" step="any" class="form-input" style="width:140px; text-align:right; padding:0.25rem 0.5rem; font-size:0.8rem;"
                     value="${plan}" onchange="window.updateScenarioMonth(${m}, this.value)" />
            </td>
            <td style="text-align:center; color:var(--text-dim);">${targetPct.toFixed(0)}%</td>
            <td style="text-align:right; font-variant-numeric:tabular-nums; color:${gap < 0 ? 'var(--status-danger)' : 'var(--status-success)'};">
              ${isJob ? formatNumber(gap) + ' งาน' : formatCurrency(gap)}
            </td>
          </tr>
        `;
      }
      tableBody.innerHTML = html;
    }

    // Render Modal Mini Chart
    setTimeout(() => {
      const canvas = document.getElementById('modalTimelineChart');
      if (canvas) {
        if (!state.charts.modalChart) {
          state.charts.modalChart = new PeaChart(canvas, {
            type: 'line',
            padding: { top: 20, right: 20, bottom: 35, left: 60 },
            formatY: (v) => isJob ? `${Math.round(v)}` : `${(v / 1000000).toFixed(1)}M`
          });
        }
        const cColors = state.chartColors || DEFAULT_CHART_COLORS;
        state.charts.modalChart.update({
          labels: MONTHS_TH,
          datasets: [
            {
              label: isJob ? 'แผนปิดงาน (งาน)' : 'แผนปิดงาน (บาท)',
              data: rec.monthlyPlan,
              color: cColors.planLine,
              fill: true
            },
            {
              label: isJob ? 'ส่วนต่าง Gap (งาน)' : 'ส่วนต่าง Gap (บาท)',
              data: rec.monthlyGap,
              color: cColors.remaining,
              dashed: true
            }
          ]
        });
      }
    }, 50);
  }

  window.updateScenarioMonth = function (monthIdx, newVal) {
    if (!state.scenarioData) return;
    const val = Number(newVal) || 0;
    state.scenarioData.monthlyPlan[monthIdx] = val;

    // Recalculate planned sum
    const totalPlanned = state.scenarioData.monthlyPlan.reduce((acc, v) => acc + v, 0);
    showToast(`อัปเดตแผนเดือน ${MONTHS_TH[monthIdx]}: ${val.toLocaleString()} เรียบร้อย`, 'info');
    renderModalContent();
  };

  function closeModal() {
    const modal = document.getElementById('drilldownModal');
    if (modal) modal.classList.remove('show');
    state.selectedRecord = null;
    state.scenarioData = null;
  }

  // ==========================================
  // 12. EARLY WARNING & ACTION CENTER
  // ==========================================
  function renderEarlyWarning() {
    const container = document.getElementById('earlyWarningList');
    if (!container) return;

    // Find critical records (KPI <= 2 or large remaining balance, exclude offices with no work)
    const criticals = state.allData.filter(d => 
      !d.isSummary && 
      (Number(d.totalValue) > 0 || Number(d.totalJobs) > 0) &&
      (d.kpiScore <= 2 || d.remainingValue > 8000000)
    );
    criticals.sort((a, b) => a.kpiScore - b.kpiScore || b.remainingValue - a.remainingValue);

    setElemText('criticalCountBadge', criticals.length);

    if (criticals.length === 0) {
      container.innerHTML = `
        <div style="text-align:center; padding:2rem; color:var(--status-success);">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:0.5rem;">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>ยอดเยี่ยม! ไม่มีหน่วยงานใดที่อยู่ในเกณฑ์วิกฤต (KPI < 3)</div>
        </div>
      `;
      return;
    }

    let html = '';
    criticals.slice(0, 10).forEach(d => {
      const isJob = d.unit === 'งาน';
      const recText = d.criteria.includes('TECO')
        ? 'เร่งดำเนินการตรวจสอบหน้างานและตัดเสร็จทางเทคนิค (TECO) ในระบบ SAP'
        : (d.criteria.includes('C.1')
          ? 'เร่งรวบรวมเอกสารค่าใช้จ่ายจากผู้รับจ้างและทำบัญชีตัดจ่ายสินทรัพย์ถาวร'
          : 'ตรวจสอบสถานะงานคงค้างและประสานงาน กบล./กบพ. เพื่อเร่งรัดปิดบัญชี');

      html += `
        <div class="alert-card-danger" style="display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;">
          <div>
            <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
              <strong style="color:#FFFFFF; font-size:0.95rem;">${escapeHtml(d.office)}</strong>
              <span class="badge-pea-tag" style="background:#EF4444;">${escapeHtml(d.province)}</span>
              <span class="kpi-score-badge kpi-score-1">★ KPI ${d.kpiScore}</span>
            </div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:0.4rem;">
              เกณฑ์วัด: <strong>${escapeHtml(d.criteria)}</strong> • คงเหลือ: <strong style="color:#EF4444;">${isJob ? formatNumber(d.remainingJobs) + ' งาน' : formatCurrency(d.remainingValue)}</strong>
            </div>
            <div style="font-size:0.775rem; color:var(--pea-gold-300); display:flex; align-items:center; gap:0.35rem;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              ข้อเสนอแนะ: ${recText}
            </div>
          </div>
          <button class="btn btn-outline" style="padding:0.35rem 0.75rem; font-size:0.75rem; flex-shrink:0;" onclick="window.openDrilldownModal(${d.id})">
            จัดทำแผนเร่งรัด
          </button>
        </div>
      `;
    });

    container.innerHTML = html;
  }

  // ==========================================
  // 13. AUC WORKFLOW TRACKER
  // ==========================================
  function renderWorkflow() {
    // Keep workflow interactive if needed
  }

  // ==========================================
  // 14. EXCEL UPLOAD & CSV EXPORT
  // ==========================================
  function parseKpiExcelBuffer(buffer) {
    if (!window.XLSX) {
      console.error('XLSX library not loaded');
      return null;
    }
    const wb = window.XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (!rows || rows.length < 2) return null;

    const monthNames = {
      1: 'ม.ค.', 2: 'ก.พ.', 3: 'มี.ค.', 4: 'เม.ย.',
      5: 'พ.ค.', 6: 'มิ.ย.', 7: 'ก.ค.', 8: 'ส.ค.',
      9: 'ก.ย.', 10: 'ต.ค.', 11: 'พ.ย.', 12: 'ธ.ค.'
    };

    const matrix = [];
    let currentCriteria = '';

    const formatPct = (val) => {
      if (val === null || val === undefined || val === '' || val === '-') return '-';
      const num = Number(val);
      if (!isNaN(num)) {
        return (num * 100).toFixed(2) + '%';
      }
      return String(val).trim();
    };

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row.length) continue;

      if (row[0] && String(row[0]).trim()) {
        currentCriteria = String(row[0]).trim();
      }

      const monthNum = parseInt(row[1], 10);
      if (monthNum >= 1 && monthNum <= 12) {
        const l5 = formatPct(row[7]);

        matrix.push({
          criteria: currentCriteria,
          monthNum: monthNum,
          monthName: monthNames[monthNum] || '',
          level1: formatPct(row[3]),
          level2: formatPct(row[4]),
          level3: formatPct(row[5]),
          level4: formatPct(row[6]),
          level5: l5
        });
      }
    }

    return matrix;
  }

  async function pull02KpiOnly() {
    showToast('กำลังดึงข้อมูลไฟล์ 02 KPI.xlsx จากโฟลเดอร์ 00AI...', 'info');

    // 1. Direct fetch (fastest and zero-click if server/accessible)
    try {
      const resp = await fetch(encodeURI('02 KPI.xlsx'), { cache: 'no-store' });
      if (resp.ok) {
        const buf = await resp.arrayBuffer();
        const matrix = parseKpiExcelBuffer(buf);
        if (matrix && matrix.length > 0) {
          window.KPI_MATRIX = matrix;
          try { localStorage.setItem('AUC_SAVED_KPI_MATRIX', JSON.stringify(matrix)); } catch (e) {}
          loadDataForMonth(state.filters.month);
          filterData();
          renderAll();
          showToast(`🎉 ดึงข้อมูลไฟล์ 02 KPI.xlsx จากโฟลเดอร์ 00AI สำเร็จ (${matrix.length} รายการ)`, 'success');
          return;
        }
      }
    } catch (e) {
      console.warn('Direct fetch failed, falling back:', e);
    }

    // 2. Directory Picker (if running locally on Chromium / file://)
    if (window.showDirectoryPicker) {
      try {
        const dirHandle = await window.showDirectoryPicker({
          id: 'pea-00ai-excel-directory',
          mode: 'read'
        });
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && (entry.name.toLowerCase().includes('02') || entry.name.toLowerCase().includes('kpi')) && entry.name.toLowerCase().endsWith('.xlsx')) {
            const f = await entry.getFile();
            const buf = await f.arrayBuffer();
            const matrix = parseKpiExcelBuffer(buf);
            if (matrix && matrix.length > 0) {
              window.KPI_MATRIX = matrix;
              try { localStorage.setItem('AUC_SAVED_KPI_MATRIX', JSON.stringify(matrix)); } catch (e) {}
              loadDataForMonth(state.filters.month);
              filterData();
              renderAll();
              showToast(`🎉 ดึงข้อมูลไฟล์ ${entry.name} จากโฟลเดอร์ 00AI สำเร็จ (${matrix.length} รายการ)`, 'success');
              return;
            }
          }
        }
        showToast('ไม่พบไฟล์ 02 KPI.xlsx ในโฟลเดอร์ 00AI ที่เลือก', 'warning');
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.warn('Directory picker failed:', err);
      }
    }

    // 3. Fallback: trigger single file picker
    const input = document.getElementById('fallbackKpiInput');
    if (input) input.click();
  }
  window.pull02KpiOnly = pull02KpiOnly;

  function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = evt.target.result;
        showToast(`กำลังประมวลผลไฟล์ ${file.name}...`, 'info');

        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed)) {
            state.allData = parsed.map(item => normalizeRecord(item));
            populateFilterDropdowns();
            filterData();
            renderAll();
            showToast(`โหลดข้อมูลสำเร็จ ${state.allData.length} รายการ`, 'success');
          }
        } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
          // Check if it's a KPI matrix file (02 KPI.xlsx)
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes('kpi') || lowerName.includes('02')) {
            const kpiMatrix = parseKpiExcelBuffer(data);
            if (kpiMatrix && kpiMatrix.length > 0) {
              window.KPI_MATRIX = kpiMatrix;
              try {
                localStorage.setItem('AUC_SAVED_KPI_MATRIX', JSON.stringify(kpiMatrix));
              } catch (e) {}
              loadDataForMonth(state.filters.month);
              filterData();
              renderAll();
              showToast(`🎉 อัปเดตเกณฑ์ชี้วัด KPI ปี 2569 จากไฟล์ ${file.name} สำเร็จ (${kpiMatrix.length} รายการ)`, 'success');
              if (window.recordLiveImportAuditLog) window.recordLiveImportAuditLog(file.name, kpiMatrix.length, 'js/kpi_matrix.js (localStorage: AUC_SAVED_KPI_MATRIX)');
              return;
            }
          }

          // Check if it's a WBS file (03 WBSคงเหลือ or 04 WBS ZBUDR064 or 05 WBS CN41 or 06 Google Sheet)
          if (lowerName.includes('wbs') || lowerName.includes('03') || lowerName.includes('04') || lowerName.includes('05') || lowerName.includes('06') || lowerName.includes('sheet') || lowerName.includes('แผนงาน') || lowerName.includes('zbudr') || lowerName.includes('cn41')) {
            if (window.handleWbsExcelBuffer && window.handleWbsExcelBuffer(data, file.name)) {
              if (window.recordLiveImportAuditLog) window.recordLiveImportAuditLog(file.name, null, 'js/data_wbs.js (window.AUC_WBS_REMAINING_DATA)');
              return;
            }
          }

          const records = parsePeaExcelBuffer(data, file.name);
          if (records && records.length > 0) {
            const matchedDef = matchExcelFileToMonth(file.name);
            if (matchedDef) {
              window[matchedDef.targetVar] = records;
              if (matchedDef.monthIndex === 6) window.AUC_INITIAL_DATA = records;
              state.filters.month = matchedDef.monthIndex;
              updateMonthButtonsUI();
            }
            loadDataForMonth(state.filters.month);
            populateFilterDropdowns();
            initBarChartCriteriaDropdown();
            filterData();
            renderAll();
            showToast(`อ่านข้อมูลจาก ${file.name} สำเร็จ ${records.length.toLocaleString()} รายการ`, 'success');
            if (window.recordLiveImportAuditLog) window.recordLiveImportAuditLog(file.name, records.length, matchedDef ? matchedDef.targetVar : 'js/data.js');
          } else {
            showToast(`ไม่พบข้อมูลที่ตรงกับตารางรายงาน AUC ในไฟล์ ${file.name}`, 'warning');
          }
        } else {
          showToast(`ไฟล์ ${file.name} ถูกโหลดเข้าสู่ระบบเรียบร้อย`, 'success');
        }
      } catch (err) {
        console.error(err);
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + err.message, 'error');
      }
    };

    if (file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
  }

  function exportToCsv() {
    if (!state.filteredData.length) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'error');
      return;
    }

    const headers = [
      'ลำดับ', 'หน่วยงาน/กฟฟ.', 'จังหวัด', 'ประเภทเกณฑ์วัด', 'หน่วยวัด',
      'รวมงานAUC', 'รวมมูลค่าAUC', 'ปิดงานAUC', 'ปิดมูลค่าAUC',
      'คงเหลืองานAUC', 'คงเหลือมูลค่าAUC', '% ปิดงาน', 'KPI'
    ];

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Thai language support
    csvContent += headers.join(',') + '\r\n';

    state.filteredData.forEach((d, i) => {
      const row = [
        i + 1,
        `"${d.office.replace(/"/g, '""')}"`,
        `"${d.province.replace(/"/g, '""')}"`,
        `"${d.criteria.replace(/"/g, '""')}"`,
        `"${d.unit.replace(/"/g, '""')}"`,
        d.totalJobs,
        d.totalValue,
        d.closedJobs,
        d.closedValue,
        d.remainingJobs,
        d.remainingValue,
        (d.latestPercent * 100).toFixed(2),
        d.kpiScore
      ];
      csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `PEA_AUC_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('ดาวน์โหลดรายงาน CSV เรียบร้อยแล้ว', 'success');
  }

  // ==========================================
  // 15. THEME & TOAST UTILITIES
  // ==========================================
  function toggleTheme() {
    const curTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = curTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('pea_auc_theme', newTheme);
    updateThemeIcon(newTheme);
    renderAll();
  }

  function applyTheme() {
    const saved = localStorage.getItem('pea_auc_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeIcon(saved);
  }

  function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;
    if (theme === 'light') {
      icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    } else {
      icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    }
  }

  function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>${escapeHtml(msg)}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Formatting Helpers
  function formatCurrency(val) {
    return Number(val || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿';
  }

  function formatCurrencyShort(val) {
    const num = Number(val || 0);
    if (Math.abs(num) >= 1000000) {
      return (num / 1000000).toFixed(2) + ' ลบ.';
    }
    if (Math.abs(num) >= 1000) {
      return (num / 1000).toFixed(1) + ' พัน฿';
    }
    return num.toLocaleString('th-TH', { maximumFractionDigits: 0 }) + ' ฿';
  }

  function formatNumber(val) {
    return Number(val || 0).toLocaleString('th-TH');
  }

  function setElemText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function setBarWidth(id, pct) {
    const el = document.getElementById(id);
    if (el) el.style.width = `${Math.max(0, Math.min(100, pct))}%`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================
  // FULLSCREEN CHART EXPANSION
  // ==========================================
  window.toggleCardFullscreen = function (btn) {
    const card = btn ? btn.closest('.content-card') : document.getElementById('unifiedProjectionOfficeCard');
    if (!card) return;

    const isFull = card.classList.toggle('is-fullscreen');
    document.body.classList.toggle('has-fullscreen-chart', isFull);

    const allBtns = card.querySelectorAll('.btn-fullscreen');
    allBtns.forEach(b => {
      if (isFull) {
        b.setAttribute('title', 'ย่อขนาดปกติ (ESC)');
        b.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7"></path>
          </svg>
          <span>ย่อขนาดปกติ</span>
        `;
      } else {
        b.setAttribute('title', 'ขยายกราฟเต็มหน้าจอ');
        b.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          <span>ขยายเต็มจอ</span>
        `;
      }
    });

    if (state && state.charts && state.charts.officeBar && card.querySelector('#officePercentBarChart')) {
      state.charts.officeBar.options.padding = isFull
        ? { top: 58, right: 20, bottom: 85, left: 98 }
        : { top: 58, right: 14, bottom: 85, left: 98 };
    }

    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      if (state && state.charts) {
        Object.values(state.charts).forEach(c => {
          if (c && typeof c.resize === 'function' && typeof c.render === 'function') {
            c.resize();
            c.render();
          }
        });
      }
      if (window.CriteriaFireworks && state && state.charts && state.charts.critBar) {
        window.CriteriaFireworks.updateTargets(state.charts.critBar);
      }
    }, 80);
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const fullCard = document.querySelector('.content-card.is-fullscreen');
      if (fullCard) {
        const btn = fullCard.querySelector('.btn-fullscreen');
        if (btn) window.toggleCardFullscreen(btn);
      }
      togglePalettePanel(false);
    }
  });

  // ==========================================
  // 16. COLOR PALETTE & BACKGROUND MANAGER
  // ==========================================
  const BG_PRESETS = [
    {
      id: 'pea-royal',
      name: 'ม่วงเข้ม กฟภ.',
      main: '#56247B',
      accent: '#7639A4'
    },
    {
      id: 'dark-onyx',
      name: 'ดำสนิท ออนิกซ์',
      main: '#121214',
      accent: '#26272F'
    },
    {
      id: 'midnight-navy',
      name: 'น้ำเงินมิดไนท์',
      main: '#0B1528',
      accent: '#1D2E4D'
    },
    {
      id: 'royal-sapphire',
      name: 'ไพลินหลวง',
      main: '#19173D',
      accent: '#312E81'
    },
    {
      id: 'emerald-dark',
      name: 'เขียวมรกตหรู',
      main: '#064E3B',
      accent: '#047857'
    },
    {
      id: 'ruby-crimson',
      name: 'แดงทับทิมหรู',
      main: '#4C0519',
      accent: '#831843'
    },
    {
      id: 'warm-espresso',
      name: 'ช็อกโกแลตอุ่น',
      main: '#271810',
      accent: '#4B2817'
    },
    {
      id: 'titanium-slate',
      name: 'เทาไทเทเนียม',
      main: '#1E293B',
      accent: '#334155'
    },
    {
      id: 'pearl-light',
      name: 'ขาวไข่มุก กฟภ.',
      main: '#F8FAFC',
      accent: '#EDE9FE'
    }
  ];

  const CHART_PALETTES = [
    {
      id: 'standard',
      name: 'กฟภ. มาตรฐาน (เขียว/ม่วง/แดง)',
      closed: '#10B981',
      total: '#A855F7',
      remaining: '#EF4444',
      kpiGood: '#10B981',
      kpiWarn: '#EF4444',
      planLine: '#FFB81C'
    },
    {
      id: 'gold-cyan',
      name: 'ทองหรู & ฟ้าไซยาน',
      closed: '#06B6D4',
      total: '#FFB81C',
      remaining: '#F43F5E',
      kpiGood: '#06B6D4',
      kpiWarn: '#F43F5E',
      planLine: '#FBBF24'
    },
    {
      id: 'cyber-neon',
      name: 'นีออนไซเบอร์ (มิ้นต์/ม่วง)',
      closed: '#00F5A0',
      total: '#B5179E',
      remaining: '#FF0055',
      kpiGood: '#00F5A0',
      kpiWarn: '#FF0055',
      planLine: '#FFD166'
    },
    {
      id: 'pastel',
      name: 'พาสเทลนุ่มตา',
      closed: '#34D399',
      total: '#C084FC',
      remaining: '#FB7185',
      kpiGood: '#34D399',
      kpiWarn: '#FB7185',
      planLine: '#FCD34D'
    },
    {
      id: 'cobalt-emerald',
      name: 'โคบอลต์บลู & มรกต',
      closed: '#10B981',
      total: '#3B82F6',
      remaining: '#F97316',
      kpiGood: '#10B981',
      kpiWarn: '#F97316',
      planLine: '#F59E0B'
    }
  ];

  function adjustBrightness(hex, percent) {
    let cleanHex = (hex || '#000000').replace('#', '').trim();
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(c => c + c).join('');
    }
    const num = parseInt(cleanHex, 16);
    if (isNaN(num)) return hex;
    let r = (num >> 16) + Math.round(255 * (percent / 100));
    let g = ((num >> 8) & 0x00FF) + Math.round(255 * (percent / 100));
    let b = (num & 0x0000FF) + Math.round(255 * (percent / 100));
    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
  }

  function isValidHex(hex) {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
  }

  function applyBgSettings(settings) {
    if (!settings || !settings.main || !settings.accent) return;
    state.bgSettings = { ...state.bgSettings, ...settings };
    const { main, accent } = state.bgSettings;

    document.documentElement.style.setProperty('--bg-app', main);
    const darkShade = adjustBrightness(main, -28);
    const gradient = `radial-gradient(circle at 15% 15%, ${accent} 0%, ${main} 55%, ${darkShade} 100%), radial-gradient(circle at 85% 85%, rgba(255, 184, 28, 0.08) 0%, transparent 60%)`;
    document.documentElement.style.setProperty('--bg-gradient', gradient);

    // Sync input values & preview dots
    const pMain = document.getElementById('pickerCustomBgMain');
    const tMain = document.getElementById('textCustomBgMain');
    const sMain = document.getElementById('swatchPreviewBgMain');
    const pAcc = document.getElementById('pickerCustomBgAccent');
    const tAcc = document.getElementById('textCustomBgAccent');
    const sAcc = document.getElementById('swatchPreviewBgAccent');

    if (pMain && pMain.value.toUpperCase() !== main.toUpperCase()) pMain.value = main;
    if (tMain && tMain.value.toUpperCase() !== main.toUpperCase()) tMain.value = main.toUpperCase();
    if (sMain) sMain.style.background = main;

    if (pAcc && pAcc.value.toUpperCase() !== accent.toUpperCase()) pAcc.value = accent;
    if (tAcc && tAcc.value.toUpperCase() !== accent.toUpperCase()) tAcc.value = accent.toUpperCase();
    if (sAcc) sAcc.style.background = accent;

    // Active state in preset cards
    document.querySelectorAll('.bg-preset-card').forEach(card => {
      card.classList.toggle('active', card.dataset.presetId === state.bgSettings.presetId);
    });

    if (state.bgSettings.presetId === 'pearl-light') {
      document.documentElement.setAttribute('data-theme', 'light');
      updateThemeIcon('light');
    } else if (state.bgSettings.mode === 'preset') {
      document.documentElement.setAttribute('data-theme', 'dark');
      updateThemeIcon('dark');
    }

    try {
      localStorage.setItem('pea_auc_bg_settings', JSON.stringify(state.bgSettings));
    } catch (e) {}
  }

  function applyChartColors(newColors, save = true) {
    if (!newColors) return;
    state.chartColors = { ...state.chartColors, ...newColors };

    if (state.chartColors.kpiGood) {
      document.documentElement.style.setProperty('--status-success', state.chartColors.kpiGood);
    }
    if (state.chartColors.kpiWarn) {
      document.documentElement.style.setProperty('--status-danger', state.chartColors.kpiWarn);
    }

    const legendGood = document.getElementById('legendKpiGoodDot');
    if (legendGood && state.chartColors.kpiGood) {
      legendGood.style.background = state.chartColors.kpiGood;
    }
    const legendWarn = document.getElementById('legendKpiWarnDot');
    if (legendWarn && state.chartColors.kpiWarn) {
      legendWarn.style.background = state.chartColors.kpiWarn;
    }

    const fabInd = document.getElementById('fabColorIndicator');
    if (fabInd && state.chartColors.kpiGood) {
      fabInd.style.background = state.chartColors.kpiGood;
    }

    const colorKeys = [
      { key: 'closed', pId: 'pickerChartClosed', tId: 'textChartClosed', dId: 'dotChartClosed' },
      { key: 'total', pId: 'pickerChartTotal', tId: 'textChartTotal', dId: 'dotChartTotal' },
      { key: 'remaining', pId: 'pickerChartRemaining', tId: 'textChartRemaining', dId: 'dotChartRemaining' },
      { key: 'kpiGood', pId: 'pickerChartKpiGood', tId: 'textChartKpiGood', dId: 'dotChartKpiGood' },
      { key: 'kpiWarn', pId: 'pickerChartKpiWarn', tId: 'textChartKpiWarn', dId: 'dotChartKpiWarn' },
      { key: 'planLine', pId: 'pickerChartPlan', tId: 'textChartPlan', dId: 'dotChartPlan' }
    ];

    colorKeys.forEach(({ key, pId, tId, dId }) => {
      const val = state.chartColors[key];
      if (!val) return;
      const pEl = document.getElementById(pId);
      const tEl = document.getElementById(tId);
      const dEl = document.getElementById(dId);
      if (pEl && pEl.value.toUpperCase() !== val.toUpperCase()) pEl.value = val;
      if (tEl && tEl.value.toUpperCase() !== val.toUpperCase()) tEl.value = val.toUpperCase();
      if (dEl) dEl.style.background = val;
    });

    document.querySelectorAll('.chart-theme-card').forEach(card => {
      const pid = card.dataset.themeId;
      const preset = CHART_PALETTES.find(p => p.id === pid);
      if (preset) {
        const match = preset.closed.toLowerCase() === state.chartColors.closed.toLowerCase() &&
                      preset.total.toLowerCase() === state.chartColors.total.toLowerCase() &&
                      preset.remaining.toLowerCase() === state.chartColors.remaining.toLowerCase();
        card.classList.toggle('active', match);
      }
    });

    if (save) {
      try {
        localStorage.setItem('pea_auc_chart_colors', JSON.stringify(state.chartColors));
      } catch (e) {}
    }

    // Refresh charts
    renderCriteriaComparisonBar();
    renderRadarProvincialKpi();
    renderOfficePercentBarChart();
    renderMonthlyTimelineChart();
    renderMonthlyAmountTimelineChart();
    if (state.selectedRecord) {
      renderModalContent();
    }
  }

  function togglePalettePanel(forceOpen) {
    const panel = document.getElementById('palettePanel');
    if (!panel) return;
    const willOpen = forceOpen !== undefined ? forceOpen : !panel.classList.contains('is-open');
    if (willOpen) {
      panel.classList.add('is-open');
    } else {
      panel.classList.remove('is-open');
    }
  }

  function switchPaletteSubtab(tabName) {
    document.querySelectorAll('.palette-subtab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subtab === tabName);
    });
    const bgTab = document.getElementById('tabContentBg');
    const chartTab = document.getElementById('tabContentChart');
    if (bgTab && chartTab) {
      bgTab.classList.toggle('active', tabName === 'bgTab');
      chartTab.classList.toggle('active', tabName === 'chartTab');
    }
  }

  function renderBgPresets() {
    const container = document.getElementById('bgPresetGrid');
    if (!container) return;
    container.innerHTML = BG_PRESETS.map(p => `
      <div class="bg-preset-card ${state.bgSettings.presetId === p.id ? 'active' : ''}" data-preset-id="${p.id}" title="${p.name}">
        <div class="bg-preset-swatch" style="background: linear-gradient(135deg, ${p.accent}, ${p.main});"></div>
        <div class="bg-preset-name">${p.name}</div>
      </div>
    `).join('');

    container.querySelectorAll('.bg-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const pid = card.dataset.presetId;
        const found = BG_PRESETS.find(p => p.id === pid);
        if (found) {
          applyBgSettings({
            presetId: found.id,
            mode: 'preset',
            main: found.main,
            accent: found.accent
          });
          showToast(`เปลี่ยนสีพื้นหลัง: ${found.name}`, 'info');
        }
      });
    });
  }

  function renderChartPresets() {
    const container = document.getElementById('chartThemeGrid');
    if (!container) return;
    container.innerHTML = CHART_PALETTES.map(p => {
      const isAct = p.closed.toLowerCase() === state.chartColors.closed.toLowerCase() &&
                    p.total.toLowerCase() === state.chartColors.total.toLowerCase();
      return `
        <div class="chart-theme-card ${isAct ? 'active' : ''}" data-theme-id="${p.id}" title="${p.name}">
          <div class="chart-theme-name">${p.name}</div>
          <div class="chart-theme-dots">
            <span style="background:${p.closed};" title="ปิดงานแล้ว"></span>
            <span style="background:${p.total};" title="มูลค่ารวม"></span>
            <span style="background:${p.remaining};" title="คงเหลือ"></span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.chart-theme-card').forEach(card => {
      card.addEventListener('click', () => {
        const tid = card.dataset.themeId;
        const found = CHART_PALETTES.find(p => p.id === tid);
        if (found) {
          applyChartColors({
            closed: found.closed,
            total: found.total,
            remaining: found.remaining,
            kpiGood: found.kpiGood,
            kpiWarn: found.kpiWarn,
            planLine: found.planLine
          });
          showToast(`เปลี่ยนชุดสีกราฟ: ${found.name}`, 'info');
        }
      });
    });
  }

  function initColorPaletteManager() {
    // 1. Load saved settings from localStorage
    try {
      const savedBg = localStorage.getItem('pea_auc_bg_settings');
      if (savedBg) {
        const parsed = JSON.parse(savedBg);
        if (parsed && parsed.main && parsed.accent) {
          state.bgSettings = parsed;
        }
      }
    } catch (e) {}

    try {
      const savedColors = localStorage.getItem('pea_auc_chart_colors');
      if (savedColors) {
        const parsed = JSON.parse(savedColors);
        if (parsed && typeof parsed === 'object') {
          state.chartColors = { ...DEFAULT_CHART_COLORS, ...parsed };
        }
      }
    } catch (e) {}

    // 2. Initial application of theme tokens & chart colors
    applyBgSettings(state.bgSettings);
    applyChartColors(state.chartColors, false);

    // 3. Render presets
    renderBgPresets();
    renderChartPresets();

    // 4. Toggle buttons (FAB & Top Header button & Close & Collapse)
    const fabBtn = document.getElementById('btnTogglePaletteFab');
    if (fabBtn) {
      fabBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePalettePanel();
      });
    }

    const headerPaletteBtn = document.getElementById('btnTopHeaderPalette');
    if (headerPaletteBtn) {
      headerPaletteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePalettePanel();
      });
    }

    const closeBtn = document.getElementById('btnClosePalettePanel');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePalettePanel(false);
      });
    }

    const collapseFooterBtn = document.getElementById('btnCollapsePaletteFooter');
    if (collapseFooterBtn) {
      collapseFooterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePalettePanel(false);
      });
    }

    // Dismiss palette panel when clicking outside
    document.addEventListener('click', (e) => {
      const panel = document.getElementById('palettePanel');
      const container = document.getElementById('paletteWidgetContainer');
      if (panel && panel.classList.contains('is-open')) {
        if (!container || !container.contains(e.target)) {
          togglePalettePanel(false);
        }
      }
    });

    // 5. Subtab navigation
    document.querySelectorAll('.palette-subtab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.subtab;
        if (target) switchPaletteSubtab(target);
      });
    });

    // 6. Custom Background Pickers
    const pMain = document.getElementById('pickerCustomBgMain');
    const tMain = document.getElementById('textCustomBgMain');
    const pAcc = document.getElementById('pickerCustomBgAccent');
    const tAcc = document.getElementById('textCustomBgAccent');

    if (pMain) {
      pMain.addEventListener('input', (e) => {
        const hex = e.target.value;
        if (tMain) tMain.value = hex.toUpperCase();
        applyBgSettings({ presetId: 'custom', mode: 'custom', main: hex, accent: pAcc ? pAcc.value : state.bgSettings.accent });
      });
    }

    if (tMain) {
      tMain.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (isValidHex(val)) {
          if (pMain) pMain.value = val;
          applyBgSettings({ presetId: 'custom', mode: 'custom', main: val, accent: pAcc ? pAcc.value : state.bgSettings.accent });
        } else {
          tMain.value = state.bgSettings.main.toUpperCase();
        }
      });
    }

    if (pAcc) {
      pAcc.addEventListener('input', (e) => {
        const hex = e.target.value;
        if (tAcc) tAcc.value = hex.toUpperCase();
        applyBgSettings({ presetId: 'custom', mode: 'custom', main: pMain ? pMain.value : state.bgSettings.main, accent: hex });
      });
    }

    if (tAcc) {
      tAcc.addEventListener('change', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        if (isValidHex(val)) {
          if (pAcc) pAcc.value = val;
          applyBgSettings({ presetId: 'custom', mode: 'custom', main: pMain ? pMain.value : state.bgSettings.main, accent: val });
        } else {
          tAcc.value = state.bgSettings.accent.toUpperCase();
        }
      });
    }

    // 7. Custom Chart Color Pickers
    const colorFields = [
      { key: 'closed', pId: 'pickerChartClosed', tId: 'textChartClosed' },
      { key: 'total', pId: 'pickerChartTotal', tId: 'textChartTotal' },
      { key: 'remaining', pId: 'pickerChartRemaining', tId: 'textChartRemaining' },
      { key: 'kpiGood', pId: 'pickerChartKpiGood', tId: 'textChartKpiGood' },
      { key: 'kpiWarn', pId: 'pickerChartKpiWarn', tId: 'textChartKpiWarn' },
      { key: 'planLine', pId: 'pickerChartPlan', tId: 'textChartPlan' }
    ];

    colorFields.forEach(({ key, pId, tId }) => {
      const pEl = document.getElementById(pId);
      const tEl = document.getElementById(tId);

      if (pEl) {
        pEl.addEventListener('input', (e) => {
          const hex = e.target.value;
          if (tEl) tEl.value = hex.toUpperCase();
          const patch = {};
          patch[key] = hex;
          applyChartColors(patch, true);
        });
      }

      if (tEl) {
        tEl.addEventListener('change', (e) => {
          let val = e.target.value.trim();
          if (!val.startsWith('#')) val = '#' + val;
          if (isValidHex(val)) {
            if (pEl) pEl.value = val;
            const patch = {};
            patch[key] = val;
            applyChartColors(patch, true);
          } else {
            tEl.value = (state.chartColors[key] || '').toUpperCase();
          }
        });
      }
    });

    // 8. Reset Button
    const resetBtn = document.getElementById('btnPaletteReset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        applyBgSettings({ ...DEFAULT_BG_SETTINGS });
        applyChartColors({ ...DEFAULT_CHART_COLORS });
        showToast('รีเซ็ตชุดสีและพื้นหลังกลับสู่ค่าเริ่มต้น กฟภ.', 'success');
      });
    }
  }

  window.__APP_LOADED = true;
})();
