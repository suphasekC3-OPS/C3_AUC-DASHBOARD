/**
 * PEA AUC Dashboard - WBS Remaining Jobs Module
 * (03 WBSคงเหลือ ผสานไฟล์ 04 WBS ZBUDR064 และไฟล์ 05 WBS CN41 มูลค่า AUC)
 * Connected with Executive Dashboard Filters (Month, Criteria, Province, Office, Search)
 * Fully interactive with Sort, Pagination, Visual Analytics, Column Filtering, and CSV Export
 */

(function () {
  'use strict';

  // Group definitions for Column Selector
  const WBS_COL_GROUPS = [
    { id: '03', label: 'ข้อมูลงาน WBS (จากไฟล์ 03)', icon: '📋' },
    { id: 'custom', label: 'คอลัมน์สร้างใหม่ (CUSTOM)', icon: '✨' },
    { id: '04_info', label: 'รายละเอียดโครงการ & สถานะ SAP เต็ม (ไฟล์ 04)', icon: '🏷️' },
    { id: '04_budget', label: 'งบประมาณ (ไฟล์ 04 ZBUDR064)', icon: '💰' },
    { id: '04_act', label: 'ค่าใช้จ่ายจริง Actual (ไฟล์ 04 ZBUDR064)', icon: '⚡' },
    { id: '04_plan', label: 'แผนงาน Plan (ไฟล์ 04 ZBUDR064)', icon: '📊' },
    { id: '05_cn41', label: 'ข้อมูล CN41 มูลค่า AUC (ไฟล์ 05)', icon: '📑' },
    { id: '06_sheet', label: 'แผนงานแล้วเสร็จ (ไฟล์ 06 Google Sheet)', icon: '📅' }
  ];

  // Comprehensive Column definitions (03 WBS base + 04 WBS ZBUDR064 + 05 WBS CN41)
  const WBS_COL_DEFS = [
    // --- Group 1: File 03 Base Columns ---
    { id: 'id', label: 'ลำดับ', width: '55px', align: 'center', sortKey: 'id', defaultVisible: true, group: '03' },
    { id: 'wbs', label: 'WBS (เลขที่งาน)', minWidth: '220px', align: 'left', sortKey: 'wbs', defaultVisible: true, group: '03' },
    { id: 'criteria', label: 'ประเภทเกณฑ์วัด', minWidth: '180px', align: 'left', sortKey: 'criteria', defaultVisible: false, group: '03' },
    { id: 'province', label: 'พื้นที่', minWidth: '100px', align: 'left', sortKey: 'province', defaultVisible: false, group: '03' },
    { id: 'office', label: 'กอง / กฟฟ.', minWidth: '150px', align: 'left', sortKey: 'office', defaultVisible: true, group: '03' },
    { id: 'budget', label: 'งบ', width: '75px', align: 'center', sortKey: 'budget', defaultVisible: false, group: '03' },
    { id: 'engineer', label: 'ช่างคุมงาน', minWidth: '180px', align: 'left', sortKey: 'engineer', defaultVisible: true, group: '03' },
    { id: 'department', label: 'สังกัด', minWidth: '160px', align: 'left', sortKey: 'department', defaultVisible: false, group: '03' },
    { id: 'type', label: 'ประเภท', width: '85px', align: 'center', sortKey: 'type', defaultVisible: false, group: '03' },

    // --- Group 2: File 04 Project Info & SAP Status ---
    { id: 'description', label: 'คำอธิบายภาษาไทย (ชื่องาน)', minWidth: '230px', align: 'left', sortKey: 'description', defaultVisible: true, group: '04_info' },
    { id: 'statusSap', label: 'สถานะ SAP', minWidth: '145px', width: '150px', align: 'center', sortKey: 'statusSap', defaultVisible: true, group: 'custom' },
    { id: 'status', label: 'Status (สถานะ SAP เต็ม)', minWidth: '180px', align: 'left', sortKey: 'status', defaultVisible: false, group: '04_info' },
    { id: 'level', label: 'Lv', width: '60px', align: 'center', sortKey: 'level', defaultVisible: false, isNumeric: true, group: '04_info' },

    // --- Group 3: File 04 Budgets ---
    { id: 'budgetOrigin', label: 'งบประมาณต้นแบบ', minWidth: '135px', align: 'right', sortKey: 'budgetOrigin', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_budget' },
    { id: 'budgetCurrent', label: 'งบประมาณปัจจุบัน', minWidth: '135px', align: 'right', sortKey: 'budgetCurrent', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_budget' },
    { id: 'budgetAlloc', label: 'ที่จัดสรร', minWidth: '120px', align: 'right', sortKey: 'budgetAlloc', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_budget' },
    { id: 'budgetDist', label: 'ที่กระจายได้', minWidth: '125px', align: 'right', sortKey: 'budgetDist', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_budget' },
    { id: 'budgetRemain', label: 'งบประมาณคงเหลือ', minWidth: '135px', align: 'right', sortKey: 'budgetRemain', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_budget' },

    // --- Group 4: File 04 Actual Costs ---
    { id: 'actTotalCtrl', label: 'รวม Act.ทั้งหมดที่ควบคุม งปม.', minWidth: '160px', align: 'right', sortKey: 'actTotalCtrl', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'prPo', label: 'PR/PO', minWidth: '110px', align: 'right', sortKey: 'prPo', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actMat121', label: 'Act.ค่าวัสดุ 121*', minWidth: '125px', align: 'right', sortKey: 'actMat121', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actMatCheck', label: 'Act.ค่าวัสดุ(เช็คงบ)', minWidth: '135px', align: 'right', sortKey: 'actMatCheck', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actMatPost', label: 'Act.ค่าวัสดุ(Post ย้อน 2016)', minWidth: '145px', align: 'right', sortKey: 'actMatPost', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actMatNoCheck', label: 'Act.ค่าวัสดุ(ไม่เช็คงบ)', minWidth: '135px', align: 'right', sortKey: 'actMatNoCheck', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actMatSite', label: 'Act.ค่าวัสดุเข้างาน (53051080)', minWidth: '150px', align: 'right', sortKey: 'actMatSite', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actLabor', label: 'Act.ค่าจ้างเหมา', minWidth: '125px', align: 'right', sortKey: 'actLabor', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actCoord', label: 'Act.ค่าประสานงาน', minWidth: '125px', align: 'right', sortKey: 'actCoord', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },
    { id: 'actOtherSite', label: 'Act.คชจ.หน้างานอื่นๆ', minWidth: '135px', align: 'right', sortKey: 'actOtherSite', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_act' },

    // --- Group 5: File 04 Plan & Approvals ---
    { id: 'planMat', label: 'Plan ค่าวัสดุ', minWidth: '125px', align: 'right', sortKey: 'planMat', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_plan' },
    { id: 'pctMatWithdraw', label: '% เบิกพัสดุ', minWidth: '115px', align: 'right', sortKey: 'pctMatWithdraw', defaultVisible: true, isPercent: true, isNumeric: true, group: 'custom' },
    { id: 'planMatSite', label: 'Plan ค่าวัสดุเข้างาน (53051080)', minWidth: '150px', align: 'right', sortKey: 'planMatSite', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_plan' },
    { id: 'planSite', label: 'Plan คชจ.หน้างาน', minWidth: '130px', align: 'right', sortKey: 'planSite', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_plan' },
    { id: 'pctExpenseWithdraw', label: '% เบิก คชจ.', minWidth: '115px', align: 'right', sortKey: 'pctExpenseWithdraw', defaultVisible: true, isPercent: true, isNumeric: true, group: 'custom' },
    { id: 'apprSite', label: 'อนุมัติ คชจ.หน้างาน', minWidth: '130px', align: 'right', sortKey: 'apprSite', defaultVisible: false, isMoney: true, isNumeric: true, group: '04_plan' },

    // --- Group 6: File 05 CN41 AUC Values ---
    { id: 'cn41ActualCost', label: 'มูลค่า AUC(บาท)', oldLabel: 'ต้นทุนจริง (มูลค่า AUC CN41)', minWidth: '165px', align: 'right', sortKey: 'cn41ActualCost', defaultVisible: true, isMoney: true, isNumeric: true, group: '05_cn41' },
    { id: 'cn41ObjDesc', label: 'ออบเจคโครงการ (CN41)', minWidth: '220px', align: 'left', sortKey: 'cn41ObjDesc', defaultVisible: false, group: '05_cn41' },
    { id: 'cn41Level', label: 'ระดับ (CN41)', width: '75px', align: 'center', sortKey: 'cn41Level', defaultVisible: false, group: '05_cn41' },
    { id: 'cn41Currency', label: 'สกุลเงิน (CN41)', width: '75px', align: 'center', sortKey: 'cn41Currency', defaultVisible: false, group: '05_cn41' },
    { id: 'cn41Row', label: 'ลำดับ CN41 (.)', width: '75px', align: 'center', sortKey: 'cn41Row', defaultVisible: false, group: '05_cn41' },

    // --- Group 7: File 06 Google Sheet แผนงานแล้วเสร็จ ---
    { id: 'planClose', label: 'แผนปิดงาน (ไฟล์ 06)', minWidth: '140px', align: 'center', sortKey: 'planClose', defaultVisible: true, group: '06_sheet' },
    { id: 'note', label: 'หมายเหตุ (ไฟล์ 06)', minWidth: '240px', align: 'left', sortKey: 'note', defaultVisible: true, group: '06_sheet' }
  ];

  /**
   * Helper: Format full SAP status into short status (e.g. 'REL D1', 'TECO D2', 'CLSD F4')
   * ตัดอักษรตรงกลางออก คงเหลือ 3-4 อักษรตัวแรก (REL, CLSD, TECO ฯลฯ) และ 2 อักษรตัวสุดท้าย (D1, F4, C1 ฯลฯ)
   */
  function formatSapStatusShort(status) {
    if (!status || typeof status !== 'string') return '';
    const s = status.trim();
    if (!s) return '';

    // Extract first 3-4 letters (REL, CLSD, TECO, CRTD, etc.)
    let first = '';
    const firstMatch = s.match(/^([A-Za-z]{3,4})\b/);
    if (firstMatch) {
      first = firstMatch[1].toUpperCase();
    } else {
      const parts = s.split(/\s+/);
      first = parts[0] ? parts[0].toUpperCase() : '';
    }

    // Extract last 2 characters (e.g. D1, F4, C1, etc. after // or at end)
    let last = '';
    const slashMatch = s.match(/\/\/\s*([A-Za-z0-9]{2})\s*$/);
    if (slashMatch) {
      last = slashMatch[1].toUpperCase();
    } else {
      const endMatch = s.match(/([A-Za-z0-9]{2})\s*$/);
      if (endMatch) {
        last = endMatch[1].toUpperCase();
      }
    }

    if (first && last) {
      return `${first} ${last}`;
    }
    return first || s;
  }

  function getSapBadgeClass(val) {
    if (!val) return '';
    const upper = String(val).toUpperCase().trim();
    if (upper.startsWith('CLSD') || upper.includes('CLSD')) return 'badge-sap-clsd';
    if (upper.startsWith('TECO') || upper.includes('TECO')) return 'badge-sap-teco';
    if (upper.startsWith('REL') || upper.includes('REL')) return 'badge-sap-rel';
    return '';
  }

  const DEFAULT_WBS_COL_ORDER = [
    'id',
    'wbs',
    'office',
    'description',
    'statusSap',
    'cn41ActualCost',
    'pctMatWithdraw',
    'pctExpenseWithdraw',
    'engineer',
    'planClose',
    'note'
  ];

  function getDefaultColumnOrder() {
    const defaultSet = new Set(DEFAULT_WBS_COL_ORDER);
    const remaining = WBS_COL_DEFS.map(c => c.id).filter(id => !defaultSet.has(id));
    return [...DEFAULT_WBS_COL_ORDER, ...remaining];
  }

  const WBS_COL_STORAGE_KEY = 'auc_wbs_visible_cols_v9';
  const WBS_COL_ORDER_KEY = 'auc_wbs_col_order_v5';

  function loadVisibleColumns() {
    try {
      const saved = localStorage.getItem(WBS_COL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          const res = {};
          WBS_COL_DEFS.forEach(c => {
            res[c.id] = (parsed[c.id] !== undefined) ? !!parsed[c.id] : c.defaultVisible;
          });
          return res;
        }
      }
    } catch (e) {}
    const def = {};
    WBS_COL_DEFS.forEach(c => { def[c.id] = c.defaultVisible; });
    return def;
  }

  function saveVisibleColumns() {
    try {
      localStorage.setItem(WBS_COL_STORAGE_KEY, JSON.stringify(wbsState.visibleColumns));
    } catch (e) {}
  }

  function loadColumnOrder() {
    try {
      const saved = localStorage.getItem(WBS_COL_ORDER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validIds = new Set(WBS_COL_DEFS.map(c => c.id));
          const ordered = parsed.filter(id => validIds.has(id));
          // Append or insert any newly added columns that were not in saved order
          WBS_COL_DEFS.forEach((c) => {
            if (!ordered.includes(c.id)) {
              ordered.push(c.id);
            }
          });
          return ordered;
        }
      }
    } catch (e) {}
    return getDefaultColumnOrder();
  }

  function saveColumnOrder() {
    try {
      localStorage.setItem(WBS_COL_ORDER_KEY, JSON.stringify(wbsState.columnOrder));
    } catch (e) {}
  }

  function getOrderedColDefs() {
    const colMap = new Map();
    WBS_COL_DEFS.forEach(c => colMap.set(c.id, c));
    const ordered = [];
    (wbsState.columnOrder || []).forEach(id => {
      const col = colMap.get(id);
      if (col) ordered.push(col);
    });
    // Fallback: append any missing defs
    WBS_COL_DEFS.forEach(c => {
      if (!ordered.some(o => o.id === c.id)) {
        ordered.push(c);
      }
    });
    return ordered;
  }

  // Local state for WBS Tab
  const wbsState = {
    search: '',
    budget: 'ALL',
    office: 'ALL',
    engineer: 'ALL',
    planClose: 'ALL',
    sapStatus: 'ALL',
    selectedSapStatuses: new Set(),
    tableSapStatuses: new Set(),
    selectedWbs: new Set(),
    selectionCriteriaKey: '',
    selectionInitialized: false,
    kpiTargetMonth: null, // selected month number (e.g. 10 for ต.ค.)
    sortCol: 'id',
    sortAsc: true,
    page: 1,
    pageSize: 25,
    visibleColumns: loadVisibleColumns(),
    columnOrder: loadColumnOrder(),
    colViewMode: 'order', // 'order' (ลำดับการแสดง)
    colSearchQuery: '',
    chartMode: 'stacked', // 'stacked' or 'grouped'
    chartScope: 'all', // 'all' (แสดงทั้งหมดที่มีงานคงเหลือ) or 'top10' (10 อันดับแรก)
    charts: {}
  };

  /**
   * Helper: Format Currency / Money
   */
  function formatMoney(val) {
    if (val === null || val === undefined || val === '') return '-';
    const num = Number(val);
    if (isNaN(num)) return escapeHtml(val);
    return num.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Helper: Format Currency / Money without decimals (จำนวนเต็ม ไม่มีจุดทศนิยม สำหรับแสดงในการ์ด)
   */
  function formatMoneyNoDecimals(val) {
    if (val === null || val === undefined || val === '') return '0';
    const num = Number(val);
    if (isNaN(num)) return escapeHtml(val);
    return Math.round(num).toLocaleString('th-TH');
  }

  /**
   * Helper: Match Criteria with potential suffix variations
   */
  function matchesCriteria(itemCrit, filterCrit) {
    if (!filterCrit || filterCrit === 'ALL' || filterCrit === 'เลือกทั้งหมด' || filterCrit === 'ทุกเกณฑ์วัด' || filterCrit === 'ทั้งหมด') return true;
    if (!itemCrit) return false;
    if (itemCrit === filterCrit) return true;

    const getPrefix = (s) => (s.match(/^(ข้อ\s*[\d\.]+)/) || [])[1] || s;
    const p1 = getPrefix(itemCrit).replace(/\s+/g, '');
    const p2 = getPrefix(filterCrit).replace(/\s+/g, '');
    if (p1 && p2 && p1 === p2) return true;

    return itemCrit.includes(p2) || filterCrit.includes(p1);
  }

  /**
   * Helper: Escape HTML
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Helper: Copy text to clipboard with toast notification
   */
  function copyTextToClipboard(text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast(msg || 'คัดลอกเรียบร้อยแล้ว', 'success');
      }).catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  }

  function fallbackCopy(text, msg) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    try {
      document.execCommand('copy');
      if (window.showToast) window.showToast(msg || 'คัดลอกเรียบร้อยแล้ว', 'success');
    } catch (e) {
      if (window.showToast) window.showToast('ไม่สามารถคัดลอกได้: ' + e.message, 'error');
    }
    document.body.removeChild(ta);
  }

  /**
   * Helper: Check if a search query is targeting SAP status keywords or codes (TECO, REL, CLSD, CRTD, D1, D2, F4, etc.)
   * เพื่อป้องกันไม่ให้คำว่า TECO ในหมายเหตุ (note) ของงานที่สถานะ SAP ยังเป็น REL แสดงขึ้นมาปะปน
   */
  function isStatusKeyword(term) {
    if (!term) return false;
    const t = term.trim().toLowerCase();
    if (/^(teco|rel|clsd|crtd)\b/i.test(t)) return true;
    if (['teco', 'rel', 'clsd', 'crtd'].some(s => s.startsWith(t) && t.length >= 2)) return true;
    if (/\b(teco|rel|clsd|crtd)\b/i.test(t)) return true;
    if (/^(d\d|f\d|e\d|b\d)\b/i.test(t)) return true;
    return false;
  }

  /**
   * Get filtered WBS records based on both Top Global Filters and In-table Filters
   */
  function getFilteredWbsData(skipLocalOffice = false, skipLocalSap = false, skipTableSap = false) {
    const rawData = window.AUC_WBS_REMAINING_DATA;
    if (!rawData || !Array.isArray(rawData)) return [];

    // Global Top Filters
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};

    const topCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const topProv = globalFilters.province || (document.getElementById('filterProvince') ? document.getElementById('filterProvince').value : 'ALL');
    const topOff = globalFilters.office || (document.getElementById('filterOffice') ? document.getElementById('filterOffice').value : 'ALL');
    const topSearch = (globalFilters.search !== undefined ? globalFilters.search : (document.getElementById('searchInput') ? document.getElementById('searchInput').value : '')).trim().toLowerCase();

    // Local WBS Sub-filters
    const localSearch = (wbsState.search || '').trim().toLowerCase();
    const localBudget = wbsState.budget || 'ALL';
    const localOffice = skipLocalOffice ? 'ALL' : (wbsState.office || 'ALL');
    const localEng = wbsState.engineer || 'ALL';
    const localPlanClose = wbsState.planClose || 'ALL';

    return rawData.filter(item => {
      // 1. Top Criteria Filter
      if (topCrit !== 'ALL' && topCrit !== 'เลือกทั้งหมด' && !matchesCriteria(item.criteria, topCrit)) {
        return false;
      }

      // 2. Top Province Filter
      if (topProv !== 'ALL' && item.province !== topProv) {
        return false;
      }

      // 3. Top Office Filter
      if (topOff !== 'ALL' && item.office !== topOff) {
        return false;
      }

      // 4. Global Search Filter
      if (topSearch) {
        const isStatusTerm = isStatusKeyword(topSearch);
        const isNoteVisible = wbsState.visibleColumns && wbsState.visibleColumns['note'];
        const matchGlobal =
          (item.wbs && item.wbs.toLowerCase().includes(topSearch)) ||
          (item.description && item.description.toLowerCase().includes(topSearch)) ||
          (item.statusSap && item.statusSap.toLowerCase().includes(topSearch)) ||
          (item.office && item.office.toLowerCase().includes(topSearch)) ||
          (item.province && item.province.toLowerCase().includes(topSearch)) ||
          (item.engineer && item.engineer.toLowerCase().includes(topSearch)) ||
          (item.department && item.department.toLowerCase().includes(topSearch)) ||
          (item.criteria && item.criteria.toLowerCase().includes(topSearch)) ||
          (item.budget && item.budget.toLowerCase().includes(topSearch)) ||
          (item.planClose && item.planClose.toLowerCase().includes(topSearch)) ||
          (!isStatusTerm && isNoteVisible && item.note && item.note.toLowerCase().includes(topSearch));
        if (!matchGlobal) return false;
      }

      // 5. Local In-Table Budget Filter
      if (localBudget !== 'ALL') {
        if (localBudget === 'C.1' && !item.budget.includes('C.1')) return false;
        if (localBudget === 'C02.2' && !item.budget.includes('C02')) return false;
        if (localBudget === 'I' && (item.budget !== 'I' && !item.budget.includes('I'))) return false;
        if (localBudget === 'P' && (item.budget !== 'P' && !item.budget.includes('P'))) return false;
      }

      // 5.1 Local In-Table Office Filter
      if (localOffice !== 'ALL' && item.office !== localOffice) {
        return false;
      }

      // 6. Local In-Table Engineer Filter
      if (localEng !== 'ALL' && item.engineer !== localEng) {
        return false;
      }

      // 7. Local In-Table Plan Close Filter (File 06)
      if (localPlanClose !== 'ALL') {
        const p = (item.planClose || '').trim();
        if (localPlanClose === 'EMPTY') {
          if (p) return false;
        } else {
          if (!p.includes(localPlanClose)) return false;
        }
      }

      // 8. Local In-Table Search Filter
      if (localSearch) {
        const isStatusTerm = isStatusKeyword(localSearch);
        const isNoteVisible = wbsState.visibleColumns && wbsState.visibleColumns['note'];
        const matchLocal =
          (item.wbs && item.wbs.toLowerCase().includes(localSearch)) ||
          (item.description && item.description.toLowerCase().includes(localSearch)) ||
          (item.statusSap && item.statusSap.toLowerCase().includes(localSearch)) ||
          (item.engineer && item.engineer.toLowerCase().includes(localSearch)) ||
          (item.department && item.department.toLowerCase().includes(localSearch)) ||
          (item.office && item.office.toLowerCase().includes(localSearch)) ||
          (item.province && item.province.toLowerCase().includes(localSearch)) ||
          (item.criteria && item.criteria.toLowerCase().includes(localSearch)) ||
          (item.budget && item.budget.toLowerCase().includes(localSearch)) ||
          (item.planClose && item.planClose.toLowerCase().includes(localSearch)) ||
          (!isStatusTerm && isNoteVisible && item.note && item.note.toLowerCase().includes(localSearch));
        if (!matchLocal) return false;
      }

      // 9. Local In-Table SAP Status Filter (From Clicking SAP Summary Cards) - รองรับหลายสถานะพร้อมกัน
      if (!skipLocalSap && wbsState.selectedSapStatuses && wbsState.selectedSapStatuses.size > 0) {
        const itemSap = item.statusSap || formatSapStatusShort(item.status);
        if (!wbsState.selectedSapStatuses.has(itemSap)) {
          return false;
        }
      } else if (!skipLocalSap && wbsState.sapStatus && wbsState.sapStatus !== 'ALL') {
        const itemSap = item.statusSap || formatSapStatusShort(item.status);
        if (itemSap !== wbsState.sapStatus) {
          return false;
        }
      }

      // 10. Table Header Multi-select SAP Dropdown Filter (กรองเฉพาะในตาราง WBS หน้านั้นเท่านั้น)
      if (!skipTableSap && wbsState.tableSapStatuses && wbsState.tableSapStatuses.size > 0) {
        const itemSap = item.statusSap || formatSapStatusShort(item.status);
        if (!wbsState.tableSapStatuses.has(itemSap)) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Sort WBS Data (Supports both numeric/currency and Thai text)
   */
  function sortWbsData(data) {
    const colId = wbsState.sortCol;
    const asc = wbsState.sortAsc;
    const colDef = WBS_COL_DEFS.find(c => c.sortKey === colId);

    return [...data].sort((a, b) => {
      let va = a[colId];
      let vb = b[colId];

      if (va === undefined || va === null) va = '';
      if (vb === undefined || vb === null) vb = '';

      if (colDef && colDef.isNumeric) {
        const na = Number(va) || 0;
        const nb = Number(vb) || 0;
        return asc ? na - nb : nb - na;
      }

      if (typeof va === 'number' && typeof vb === 'number') {
        return asc ? va - vb : vb - va;
      }

      va = String(va).toLowerCase();
      vb = String(vb).toLowerCase();
      return asc ? va.localeCompare(vb, 'th') : vb.localeCompare(va, 'th');
    });
  }

  /**
   * Main Render Function for WBS Tab
   */
  function renderWbsTab() {
    const rawData = window.AUC_WBS_REMAINING_DATA;
    if (!rawData || !Array.isArray(rawData)) {
      console.warn('WBS Data not loaded yet.');
      return;
    }

    // Ensure statusSap is populated across all items if missing
    if (rawData.length > 0 && !rawData[0].statusSap && rawData[0].status) {
      rawData.forEach(item => {
        if (!item.statusSap && item.status) {
          item.statusSap = formatSapStatusShort(item.status);
        }
      });
    }

    const baseFiltered = getFilteredWbsData(true, true, true);
    const sapFiltered = getFilteredWbsData(false, true, true);
    const filtered = getFilteredWbsData(false, false, true);
    const tableFiltered = getFilteredWbsData(false, false, false);
    const sorted = sortWbsData(tableFiltered);

    // Get current criteria & determine excluded closed SAP status:
    // เกณฑ์วัดข้อ 1, 2, 3, 5: ยกเว้น CLSD F4
    // เกณฑ์วัดข้อ 4: ยกเว้น CLSD F2
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    // Auto-initialize or reset selection when criteria changes (Default: ทุกช่องไม่ถูกเลือก Unchecked)
    if (!wbsState.selectionInitialized || wbsState.selectionCriteriaKey !== currentCrit) {
      wbsState.selectedWbs.clear();
      wbsState.selectionInitialized = true;
      wbsState.selectionCriteriaKey = currentCrit;
    }

    // 1. Update Navigation Tab Badge
    const tabBadge = document.getElementById('wbsTabTotalBadge');
    if (tabBadge) {
      tabBadge.textContent = filtered.length.toLocaleString('th-TH');
    }

    // 2. Update Top Active Filter Pills Banner
    renderActiveFilterPills(filtered);

    // 2.1 Render SAP Status Summary Section (ตำแหน่งตามรูป 41 ชี้ระหว่างกราฟแท่งกับตาราง WBS)
    renderWbsSapSummary(sapFiltered, wbsState.sapStatus);

    // 2.2 Render Selected Items Summary Card (ต่อจากแถวสรุปสถานะ sap - ใช้ sapFiltered เพื่อให้คงรายการที่เลือกไว้ทั้งหมดแม้กรองสถานะ SAP)
    renderWbsSelectedSummaryCard(sapFiltered, currentCrit, excludedSap);

    // 2.3 Render Target Comparison & Progress Simulation Section (กราฟแนวนอน 2 ชั้น เปรียบเทียบเป้าหมาย KPI ระดับ 5)
    renderWbsTargetComparisonSection(sapFiltered, currentCrit, excludedSap);

    // 3. Update KPI Stat Cards
    renderWbsStatCards(filtered, rawData.length);

    // 4. Update Responsible Office, Engineer & Plan Close Dropdown Options
    updateWbsOfficeDropdown(baseFiltered);
    updateWbsEngineerDropdown(filtered);
    updateWbsPlanCloseDropdown(filtered);

    // 5. Update Column Visibility Dropdown & Table Head
    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead(sorted);

    // 6. Render Master Table & Pagination (กรองเฉพาะในตาราง WBS หน้านั้น)
    renderWbsTable(sorted, tableFiltered.length);

    // 7. Render Visual Charts: หากเลือกสถานะ SAP ที่การ์ด ให้กราฟแสดงเฉพาะที่เลือกในการ์ด ทุกๆ สถานะ
    const hasSapFilter = (wbsState.selectedSapStatuses && wbsState.selectedSapStatuses.size > 0) || (wbsState.sapStatus && wbsState.sapStatus !== 'ALL');
    const chartFiltered = hasSapFilter ? getFilteredWbsData(true, false, true) : baseFiltered;
    renderWbsCharts(chartFiltered);
  }

  /**
   * Render Active Filter Pills on WBS Banner
   * แสดงวันที่ และเวลา ที่แก้ไขไฟล์ 03 04 05 06 ตามคำสั่งผู้ใช้งาน (นำป้ายที่กากบาทออก)
   */
  function renderActiveFilterPills(filtered) {
    const pillsWrap = document.getElementById('wbsActiveFilterPills');
    if (!pillsWrap) return;

    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const crit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const prov = globalFilters.province || (document.getElementById('filterProvince') ? document.getElementById('filterProvince').value : 'ALL');
    const off = globalFilters.office || (document.getElementById('filterOffice') ? document.getElementById('filterOffice').value : 'ALL');

    // Update criteria indicator above table
    const tableCritVal = document.getElementById('wbsTableActiveCriteriaVal');
    if (tableCritVal) {
      const isAllCrit = !crit || crit === 'ALL' || crit === 'เลือกทั้งหมด' || crit === 'ทุกเกณฑ์วัด';
      if (!isAllCrit) {
        tableCritVal.textContent = crit;
      } else {
        tableCritVal.textContent = `เลือกทั้งหมด (ทุกเกณฑ์วัด ${filtered.length.toLocaleString('th-TH')} งาน)`;
      }
    }

    let html = '';

    // วันที่/เวลา นำเข้าข้อมูล และชื่อเต็มไฟล์ 03, 04, 05, 06 ตามคำสั่งผู้ใช้งาน
    html += `
      <span class="wbs-pill pill-gold" style="font-weight:700;" title="วันที่และเวลานำเข้าข้อมูลไฟล์ WBS เข้าสู่ระบบ">
        📥 วันที่/เวลา นำเข้าข้อมูล:
      </span>
      <span class="wbs-pill pill-file pill-file-03" onclick="if(window.openDhModelModal)window.openDhModelModal('src_03')" title="วันที่/เวลา นำเข้าข้อมูล: 17 ต.ค. 2569, 13:20 น. (ไฟล์ 03 WBSงานคงเหลือเดือนล่าสุด.xlsx)">
        📋 <strong>03 WBSงานคงเหลือเดือนล่าสุด.xlsx:</strong> 17 ต.ค. 2569, 13:20 น.
      </span>
      <span class="wbs-pill pill-file pill-file-04" onclick="if(window.openDhModelModal)window.openDhModelModal('src_04')" title="วันที่/เวลา นำเข้าข้อมูล: 19 ต.ค. 2569, 08:34 น. (ไฟล์ 04 WBS ZBUDR064 %พัสดุและค่าแรงและสถานะsap.xlsx)">
        ⚡ <strong>04 WBS ZBUDR064 %พัสดุและค่าแรงและสถานะsap.xlsx:</strong> 19 ต.ค. 2569, 08:34 น.
      </span>
      <span class="wbs-pill pill-file pill-file-05" onclick="if(window.openDhModelModal)window.openDhModelModal('src_05')" title="วันที่/เวลา นำเข้าข้อมูล: 22 ก.ย. 2569, 10:20 น. (ไฟล์ 05 WBS CN41 มูลค่า AUC new.xlsx)">
        📑 <strong>05 WBS CN41 มูลค่า AUC new.xlsx:</strong> 22 ก.ย. 2569, 10:20 น.
      </span>
      <span class="wbs-pill pill-file pill-file-06" onclick="if(window.openDhModelModal)window.openDhModelModal('src_06')" title="วันที่/เวลา นำเข้าข้อมูล: 22 ก.ย. 2569, 10:17 น. (ไฟล์ 06  google sheet แผนงานแล้วเสร็จ.xlsx)">
        📊 <strong>06 google sheet แผนงานแล้วเสร็จ.xlsx:</strong> 22 ก.ย. 2569, 10:17 น.
      </span>
    `;

    // Province Pill (if filtered)
    if (prov && prov !== 'ALL') {
      html += `<span class="wbs-pill pill-gold" title="พื้นที่ที่เลือก">
        📍 <span>${escapeHtml(prov)}</span>
      </span>`;
    }

    // Office Pill (if filtered)
    if (off && off !== 'ALL') {
      html += `<span class="wbs-pill pill-gold" title="หน่วยงานที่เลือก">
        🏢 <span>${escapeHtml(off)}</span>
      </span>`;
    }

    // Active SAP Status Pill (if filtered)
    const activeSapList = wbsState.selectedSapStatuses ? Array.from(wbsState.selectedSapStatuses) : [];
    if (activeSapList.length > 0) {
      const label = activeSapList.length >= 9 ? `ทุกสถานะ (${activeSapList.length} สถานะ)` : (activeSapList.length === 1 ? activeSapList[0] : `${activeSapList.join(', ')} (${activeSapList.length} สถานะ)`);
      html += `<span class="wbs-pill" style="background:rgba(168,85,247,0.25); color:#E9D5FF; border-color:rgba(168,85,247,0.6); cursor:pointer;" onclick="window.setWbsSapStatusFilter('ALL')" title="คลิกเพื่อล้างตัวกรองสถานะ SAP (${activeSapList.length} สถานะ)">
        🏷️ สถานะ SAP: <strong>${escapeHtml(label)}</strong> <span style="margin-left:4px; font-weight:bold;">✕</span>
      </span>`;
    } else if (wbsState.sapStatus && wbsState.sapStatus !== 'ALL') {
      html += `<span class="wbs-pill" style="background:rgba(168,85,247,0.25); color:#E9D5FF; border-color:rgba(168,85,247,0.6); cursor:pointer;" onclick="window.setWbsSapStatusFilter('ALL')" title="คลิกเพื่อล้างตัวกรองสถานะ SAP">
        🏷️ สถานะ SAP: <strong>${escapeHtml(wbsState.sapStatus)}</strong> <span style="margin-left:4px; font-weight:bold;">✕</span>
      </span>`;
    }

    pillsWrap.innerHTML = html;
  }

  /**
   * Set SAP Status Filter (from clicking SAP Summary Cards)
   * รองรับการเลือกสถานะ SAP หลายประเภทพร้อมกัน
   */
  window.setWbsSapStatusFilter = function (sapStatus) {
    if (!wbsState.selectedSapStatuses) {
      wbsState.selectedSapStatuses = new Set();
    }

    if (!sapStatus || sapStatus === 'ALL') {
      wbsState.selectedSapStatuses.clear();
      wbsState.sapStatus = 'ALL';
      if (window.showToast) window.showToast('แสดงสถานะ SAP ทั้งหมด', 'info');
    } else {
      if (wbsState.selectedSapStatuses.has(sapStatus)) {
        wbsState.selectedSapStatuses.delete(sapStatus);
        if (window.showToast) window.showToast(`ปลดการกรองสถานะ: ${sapStatus}`, 'info');
      } else {
        wbsState.selectedSapStatuses.add(sapStatus);
        if (window.showToast) window.showToast(`กรองสถานะ: ${sapStatus} (เลือกแล้ว ${wbsState.selectedSapStatuses.size} สถานะ)`, 'success');
      }

      if (wbsState.selectedSapStatuses.size === 0) {
        wbsState.sapStatus = 'ALL';
      } else if (wbsState.selectedSapStatuses.size === 1) {
        wbsState.sapStatus = Array.from(wbsState.selectedSapStatuses)[0];
      } else {
        wbsState.sapStatus = Array.from(wbsState.selectedSapStatuses).join(', ');
      }
    }

    wbsState.page = 1;
    renderWbsTab();
  };

  /**
   * Render SAP Status Summary Section (Horizontal Badges / Stat Cards Strip)
   * แสดงตำแหน่งตามรูป 41 ชี้ระหว่างกราฟแท่งหน่วยงานกับตาราง WBS
   */
  function renderWbsSapSummary(records, currentSap) {
    const container = document.getElementById('wbsSapSummarySection');
    if (!container) return;

    if (!records || !records.length) {
      container.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 0.75rem; font-size: 0.85rem;">
          ไม่พบข้อมูลสถานะ SAP ตามเงื่อนไขตัวกรองปัจจุบัน
        </div>
      `;
      return;
    }

    const totalJobs = records.length;
    let totalAuc = 0;
    let totalSelectedJobs = 0;
    let totalSelectedAuc = 0;
    const sapMap = {};

    records.forEach(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status) || 'ไม่ระบุ';
      const auc = Number(item.cn41ActualCost) || 0;
      totalAuc += auc;

      if (!sapMap[sap]) {
        sapMap[sap] = {
          status: sap,
          count: 0,
          auc: 0,
          selectedCount: 0,
          selectedAuc: 0
        };
      }
      sapMap[sap].count++;
      sapMap[sap].auc += auc;

      // ตรวจสอบและนับรายการที่เลือก Checkbox
      if (wbsState.selectedWbs && wbsState.selectedWbs.has(item.wbs)) {
        totalSelectedJobs++;
        totalSelectedAuc += auc;
        sapMap[sap].selectedCount++;
        sapMap[sap].selectedAuc += auc;
      }
    });

    // เรียงลำดับ: CLSD -> TECO -> REL/อื่นๆ ท้ายสุด
    // ภายในกลุ่มเดียวกัน ดูรหัสท้ายสถานะ (ตัวอักษรอังกฤษ + ตัวเลข): ตัวอักษรมาก->น้อย (F ... B) และตัวเลขมาก->น้อย (F4 แรกสุด, B1 ท้ายสุด)
    const sapGroupRank = (status) => {
      const up = String(status || '').toUpperCase().trim();
      if (up.startsWith('CLSD')) return 0;
      if (up.startsWith('TECO')) return 1;
      if (up.startsWith('REL')) return 2;
      return 3;
    };
    const parseSapCode = (status) => {
      const m = String(status || '').toUpperCase().match(/\b([A-Z])\s*0*(\d+)\s*$/);
      if (!m) return null;
      return { letter: m[1], num: parseInt(m[2], 10) };
    };
    const sortedList = Object.values(sapMap).sort((a, b) => {
      const ra = sapGroupRank(a.status);
      const rb = sapGroupRank(b.status);
      if (ra !== rb) return ra - rb;

      const ca = parseSapCode(a.status);
      const cb = parseSapCode(b.status);
      if (ca && cb) {
        if (ca.letter !== cb.letter) return ca.letter < cb.letter ? 1 : -1; // Z -> A
        if (ca.num !== cb.num) return cb.num - ca.num;                      // สูง -> ต่ำ
        return 0;
      }
      if (ca && !cb) return -1; // ไม่มีรหัสไปท้ายกลุ่ม
      if (!ca && cb) return 1;
      return b.auc - a.auc;
    });

    // Build Header
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');

    const activeSapList = wbsState.selectedSapStatuses ? Array.from(wbsState.selectedSapStatuses) : [];
    const isFiltered = activeSapList.length > 0;
    const isAllSelected = sortedList.length > 0 && activeSapList.length >= sortedList.length;
    let filterLabel = '';
    if (isAllSelected) {
      filterLabel = `ทุกสถานะ (${activeSapList.length} สถานะ)`;
    } else if (activeSapList.length === 1) {
      filterLabel = activeSapList[0];
    } else {
      filterLabel = `${activeSapList.join(', ')} (${activeSapList.length} สถานะ)`;
    }

    let headerHtml = `
      <div class="wbs-sap-summary-header">
        <div class="wbs-sap-summary-title">
          <span>🏷️ สรุปสถานะ SAP</span>
          <span class="wbs-sap-summary-subtitle">(แยกทุกประเภทงาน &amp; มูลค่า AUC รวม ${sortedList.length} สถานะ)</span>
        </div>
        <div class="wbs-sap-summary-actions">
          <span style="font-size:0.75rem; color:var(--text-dim);">💡 คลิกที่การ์ดสถานะเพื่อกรองตารางด้านล่าง (สามารถเลือกหลายสถานะพร้อมกันได้)</span>
        </div>
      </div>
    `;

    // Build Cards Grid (รวมข้อมูลรายการที่เลือก Checkbox ไว้ในแต่ละการ์ด)
    let cardsHtml = `<div class="wbs-sap-summary-grid">`;

    // 1. ALL Card
    const isAllActive = activeSapList.length === 0;
    const allAucFmt = formatMoneyNoDecimals(totalAuc);
    const hasAllSelection = totalSelectedJobs > 0;
    const allSelectedJobsPct = totalJobs > 0 ? ((totalSelectedJobs / totalJobs) * 100).toFixed(1) : '0';
    const allSelectedAucFmt = formatMoneyNoDecimals(totalSelectedAuc);

    cardsHtml += `
      <div class="wbs-sap-card card-all ${isAllActive ? 'active' : ''}"
        style="border-color: rgba(56, 189, 248, 0.4); position: relative;"
        onclick="window.setWbsSapStatusFilter('ALL')"
        title="คลิกเพื่อแสดงสถานะ SAP ทั้งหมด (${totalJobs.toLocaleString('th-TH')} งาน | มูลค่า ${allAucFmt} บาท)">
        <div class="wbs-sap-card-accent" style="position:absolute; top:0; left:0; right:0; height:3px; background:#38BDF8; border-radius:8px 8px 0 0;"></div>
        
        <div class="wbs-sap-card-main-info">
          <div class="wbs-sap-card-top">
            <span class="wbs-sap-card-badge badge-all" style="background:rgba(56, 189, 248, 0.2); color:#38BDF8; border:1px solid rgba(56, 189, 248, 0.5); font-weight:700;">ทั้งหมด</span>
          </div>
          <div class="wbs-sap-card-jobs">
            <span class="wbs-sap-jobs-val">${totalJobs.toLocaleString('th-TH')}</span>
            <span class="wbs-sap-jobs-unit">งาน</span>
          </div>
          <div class="wbs-sap-card-auc">
            <span class="wbs-sap-auc-label">มูลค่า AUC รวม</span>
            <span class="wbs-sap-auc-val">฿${allAucFmt}</span>
          </div>
        </div>

        <!-- กล่องข้อมูลที่เลือก Checkbox ด้านล่างการ์ด (ล็อค 2 บรรทัด: บรรทัดจำนวนงาน, บรรทัดมูลค่า ไม่แสดง % ตัวเลขไม่โดนบัง) -->
        <div class="wbs-sap-card-cb-box cat-all ${hasAllSelection ? 'has-selection' : 'no-selection'}"
          title="รายการที่เลือก Checkbox ทั้งหมด: ${totalSelectedJobs.toLocaleString('th-TH')} งาน | มูลค่า ฿${allSelectedAucFmt} บาท">
          <div class="wbs-sap-cb-row-jobs">
            <span class="wbs-sap-cb-tag">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              เลือก
            </span>
            <span class="wbs-sap-cb-count">${totalSelectedJobs.toLocaleString('th-TH')} งาน</span>
          </div>
          <div class="wbs-sap-cb-row-auc">
            <span class="wbs-sap-cb-auc-lbl">มูลค่า</span>
            <span class="wbs-sap-cb-auc-val">฿${allSelectedAucFmt}</span>
          </div>
        </div>
      </div>
    `;

    // 2. Each Distinct SAP Status Card (ปรับสี สถานะกราฟในการ์ด ให้ตรงกับสีกราฟแท่ง, นำข้อมูล Checkbox มารวมไว้ด้านล่าง)
    sortedList.forEach(item => {
      const isActive = wbsState.selectedSapStatuses && wbsState.selectedSapStatuses.has(item.status);
      const pctJobs = totalJobs > 0 ? ((item.count / totalJobs) * 100).toFixed(1) : '0';
      const pctAuc = totalAuc > 0 ? ((item.auc / totalAuc) * 100).toFixed(1) : '0';
      const aucFmt = formatMoneyNoDecimals(item.auc);
      const style = getSapSegmentStyle(item.status, currentCrit);

      let badgeStyleAttr = '';
      let cardStyleAttr = '';
      let topBarColor = style.bgTop || '#A855F7';
      let jobsColor = '#FFFFFF';

      if (style.hasPattern) {
        if (style.cat === 'CLSD') {
          // CLSD F4 / F2 with Mint Green diagonal stripes pattern matching the bar chart
          badgeStyleAttr = `background: repeating-linear-gradient(45deg, #48D0A2, #48D0A2 3px, #10B981 3px, #10B981 6px); color: #022C22; border: 1.5px solid #A1FCDB; font-weight: 800; text-shadow: 0 1px 0 rgba(255,255,255,0.4); box-shadow: 0 0 8px rgba(72, 208, 162, 0.35);`;
          cardStyleAttr = `border-color: rgba(72, 208, 162, 0.45);`;
          topBarColor = '#48D0A2';
          jobsColor = '#A1FCDB';
        } else if (style.cat === 'TECO') {
          // TECO D2 with Golden Amber diagonal stripes pattern matching the bar chart (สีคงเดิม)
          badgeStyleAttr = `background: repeating-linear-gradient(45deg, #FBBF24, #FBBF24 3px, #F59E0B 3px, #F59E0B 6px); color: #451A03; border: 1.5px solid #FDE047; font-weight: 800; text-shadow: 0 1px 0 rgba(255,255,255,0.35); box-shadow: 0 0 8px rgba(251, 191, 36, 0.35);`;
          cardStyleAttr = `border-color: rgba(245, 158, 11, 0.55);`;
          topBarColor = '#F59E0B';
          jobsColor = '#FDE047';
        } else {
          // REL C3 with Coral Red diagonal stripes pattern matching the bar chart (สีคงเดิม)
          badgeStyleAttr = `background: repeating-linear-gradient(45deg, #F87171, #F87171 3px, #EF4444 3px, #EF4444 6px); color: #FFFFFF; border: 1.5px solid #FCA5A5; font-weight: 800; text-shadow: 0 1px 1px rgba(0,0,0,0.5); box-shadow: 0 0 8px rgba(239, 68, 68, 0.35);`;
          cardStyleAttr = `border-color: rgba(239, 68, 68, 0.55);`;
          topBarColor = '#EF4444';
          jobsColor = '#FCA5A5';
        }
      } else {
        badgeStyleAttr = `background: linear-gradient(135deg, ${style.bgTop}, ${style.bgBottom}); color: ${style.textColor}; border: 1px solid ${style.stroke}; font-weight: 700;`;
        cardStyleAttr = `border-color: ${style.stroke};`;
        if (style.cat === 'TECO') {
          jobsColor = '#FDE047';
        } else if (style.cat === 'REL') {
          jobsColor = '#FCA5A5';
        }
      }

      let cardTypeCls = 'card-rel';
      let cbCatCls = 'cat-rel';
      if (style.cat === 'CLSD') {
        cardTypeCls = 'card-clsd';
        cbCatCls = 'cat-clsd';
      } else if (style.cat === 'TECO') {
        cardTypeCls = 'card-teco';
        cbCatCls = 'cat-teco';
      }

      const hasStatusSelection = item.selectedCount > 0;
      const statusSelectedJobsPct = item.count > 0 ? ((item.selectedCount / item.count) * 100).toFixed(0) : '0';
      const statusSelectedAucFmt = formatMoneyNoDecimals(item.selectedAuc);

      cardsHtml += `
        <div class="wbs-sap-card ${cardTypeCls} ${isActive ? 'active' : ''}"
          style="${cardStyleAttr} position: relative;"
          onclick="window.setWbsSapStatusFilter('${escapeHtml(item.status)}')"
          title="สถานะ SAP: ${escapeHtml(item.status)} | ${item.count} งาน (${pctJobs}%) | มูลค่า ${aucFmt} บาท (${pctAuc}% ของ AUC รวม) | คลิกเพื่อเลือก/ปลดเลือกตัวกรองนี้">
          <div class="wbs-sap-card-accent" style="position:absolute; top:0; left:0; right:0; height:3px; background:${topBarColor}; border-radius:8px 8px 0 0;"></div>
          
          <div class="wbs-sap-card-main-info">
            <div class="wbs-sap-card-top">
              <span class="badge-sap-short" style="font-size:0.75rem; padding:0.12rem 0.42rem; border-radius:4px; ${badgeStyleAttr}">
                ${escapeHtml(item.status)}
              </span>
            </div>
            <div class="wbs-sap-card-jobs">
              <span class="wbs-sap-jobs-val" style="color:${jobsColor};">${item.count.toLocaleString('th-TH')}</span>
              <span class="wbs-sap-jobs-unit">งาน (${pctJobs}%)</span>
            </div>
            <div class="wbs-sap-card-auc">
              <span class="wbs-sap-auc-label">มูลค่า AUC</span>
              <span class="wbs-sap-auc-val">฿${aucFmt}</span>
            </div>
          </div>

          <!-- กล่องข้อมูลที่เลือก Checkbox ด้านล่างการ์ด (ล็อค 2 บรรทัด: บรรทัดจำนวนงาน, บรรทัดมูลค่า ไม่แสดง % ตัวเลขไม่โดนบัง) -->
          <div class="wbs-sap-card-cb-box ${cbCatCls} ${hasStatusSelection ? 'has-selection' : 'no-selection'}"
            title="สถานะ ${escapeHtml(item.status)} ที่เลือก Checkbox: ${item.selectedCount.toLocaleString('th-TH')} งาน | มูลค่า ฿${statusSelectedAucFmt} บาท">
            <div class="wbs-sap-cb-row-jobs">
              <span class="wbs-sap-cb-tag">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                เลือก
              </span>
              <span class="wbs-sap-cb-count">${item.selectedCount.toLocaleString('th-TH')} งาน</span>
            </div>
            <div class="wbs-sap-cb-row-auc">
              <span class="wbs-sap-cb-auc-lbl">มูลค่า</span>
              <span class="wbs-sap-cb-auc-val">฿${statusSelectedAucFmt}</span>
            </div>
          </div>
        </div>
      `;
    });

    cardsHtml += `</div>`;

    // แถบปุ่มล้างข้อมูลเฉพาะ Checkbox ใต้การ์ดสรุปสถานะ SAP วางชิดขวาตามคำสั่งผู้ใช้งาน
    const selCheckboxCount = wbsState.selectedWbs ? wbsState.selectedWbs.size : 0;
    const hasCheckboxSelection = selCheckboxCount > 0;

    const footerHtml = `
      <div class="wbs-sap-summary-footer-bar">
        <button type="button" class="btn-clear-wbs-checkbox ${hasCheckboxSelection ? 'active' : ''}" id="wbsCheckboxClearBtn"
          onclick="window.clearWbsCheckboxSelection()"
          ${hasCheckboxSelection ? '' : 'disabled'}
          title="${hasCheckboxSelection ? 'ล้างข้อมูลที่เลือกจาก Check Box' : 'ยังไม่มีรายการที่เลือกจาก Check Box'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          <span>ล้างข้อมูลที่เลือกจาก Check Box</span>
        </button>
      </div>
    `;

    // ประกอบโครงสร้าง: หัวข้อสรุป + การ์ดสถานะ + ปุ่มล้างข้อมูลที่เลือกใต้การ์ด
    container.innerHTML = headerHtml + cardsHtml + footerHtml;

    // Update select all button active state on top header
    const selectAllBtn = document.getElementById('wbsOfficeChartSelectAllBtn');
    if (selectAllBtn) {
      if (isAllSelected) {
        selectAllBtn.classList.add('active');
        selectAllBtn.title = 'กำลังเลือกการ์ดทุกสถานะ (คลิกเพื่อยกเลิกการเลือก)';
      } else {
        selectAllBtn.classList.remove('active');
        selectAllBtn.title = 'เลือกการ์ดสถานะ SAP ทั้งหมด (แสดงข้อมูลทุกสถานะ)';
      }
    }

    // Update clear button in WBS chart header (ล้างข้อมูลทุกสถานะ: ทั้ง Checkbox, สถานะการ์ด และ กราฟ - ไม่แสดงตัวเลข)
    const clearBtn = document.getElementById('wbsOfficeChartClearBtn');
    const clearBtnLabel = document.getElementById('wbsOfficeChartClearLabel');
    if (clearBtnLabel) {
      clearBtnLabel.textContent = 'ล้างข้อมูลทุกสถานะ';
    }
    const clearBtnCount = document.getElementById('wbsOfficeChartClearCount');
    if (clearBtnCount) {
      clearBtnCount.style.display = 'none'; // คำสั่งผู้ใช้งาน: ไม่ต้องมีตัวเลข
    }

    if (clearBtn) {
      const selWbsCount = wbsState.selectedWbs ? wbsState.selectedWbs.size : 0;
      const selSapCount = activeSapList.length;
      const isOfficeFiltered = (wbsState.office && wbsState.office !== 'ALL');
      if (selWbsCount > 0 || selSapCount > 0 || isOfficeFiltered) {
        clearBtn.removeAttribute('disabled');
        clearBtn.style.opacity = '1';
        clearBtn.style.pointerEvents = 'auto';
        clearBtn.title = 'ล้างข้อมูลทุกสถานะ (ทั้งสถานะการ์ด กราฟ และรายการที่เลือก)';
      } else {
        clearBtn.setAttribute('disabled', 'true');
        clearBtn.style.opacity = '0.45';
        clearBtn.style.pointerEvents = 'none';
        clearBtn.title = 'ล้างข้อมูลทุกสถานะ (ทั้งสถานะการ์ด กราฟ และรายการที่เลือก)';
      }
    }
  }

  /**
   * Helper: Determine excluded closed SAP status by Criteria
   * ข้อ 1, 2, 3, 5: ยกเว้น CLSD F4
   * ข้อ 4: ยกเว้น CLSD F2
   */
  function getExcludedSapForCriteria(crit) {
    if (!crit || crit === 'ALL') return 'CLSD F4';
    const c = String(crit).trim();
    if (c.includes('ข้อ 4') || c.includes('ข้อ4') || c.includes('C02.2')) {
      return 'CLSD F2';
    }
    return 'CLSD F4';
  }

  /**
   * Helper: Check if a WBS item should be excluded from having a checkbox
   * กฎเกณฑ์วัด:
   * 1. หากเป็น CLSD E2 ให้เอา Checkbox ออกทั้งหมด (ไม่มี Checkbox ในทุกเกณฑ์วัด)
   * 2. ข้อ 4 (งบ C02.2): ปิดงาน SAP คือ CLSD F2 -> ยกเว้นเฉพาะ CLSD F2 (ไม่มี Checkbox)
   * 3. ข้อ 1, 2, 3, 5: ปิดงาน SAP คือ CLSD F4 -> ยกเว้นเฉพาะ CLSD F4 (ไม่มี Checkbox)
   *    ส่วน CLSD F2 ในข้อ 1, 2, 3, 5 จะต้องมี Checkbox ให้เลือกได้ตามคำสั่งผู้ใช้งาน!
   */
  function isWbsItemExcludedFromCheckbox(sapVal, currentCrit) {
    if (!sapVal) return false;
    const sap = String(sapVal).toUpperCase().trim();

    // หากเป็น CLSD E2 ให้เอา Checkbox ออกทั้งหมดทุกเกณฑ์วัด
    if (sap === 'CLSD E2' || sap.includes('E2') || sap.includes('CLSD 2.0') || sap.includes('E 2')) {
      return true;
    }

    const cStr = String(currentCrit || '').trim();
    const isCrit4 = (cStr.includes('ข้อ 4') || cStr.includes('ข้อ4') || cStr.includes('C02.2'));

    if (isCrit4) {
      // ข้อ 4: ยกเว้นเฉพาะ CLSD F2 (และ CLSD E2 ที่เช็คไปแล้วข้างต้น)
      return (sap === 'CLSD F2' || sap.includes('F2') || sap.includes('CLSD 2'));
    } else {
      // ข้อ 1, 2, 3, 5 (และเกณฑ์วัดอื่นๆ): ยกเว้นเฉพาะ CLSD F4 เท่านั้น!
      // ถ้าเป็น CLSD F2 จะต้องมี Checkbox ให้เลือกได้ตามคำสั่งผู้ใช้งาน
      return (sap === 'CLSD F4' || sap.includes('F4') || sap.includes('CLSD 4'));
    }
  }

  /**
   * Toggle Individual WBS Row Checkbox
   */
  window.toggleWbsRowCheckbox = function (wbs, isChecked) {
    if (isChecked) {
      wbsState.selectedWbs.add(wbs);
    } else {
      wbsState.selectedWbs.delete(wbs);
    }

    const filtered = getFilteredWbsData(false, false);
    const sapFiltered = getFilteredWbsData(false, true);
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    renderWbsSelectedSummaryCard(sapFiltered, currentCrit, excludedSap);
    renderWbsTargetComparisonSection(sapFiltered, currentCrit, excludedSap);
    renderWbsSapSummary(sapFiltered, wbsState.sapStatus);

    // Update master header checkbox state if present
    const masterCb = document.getElementById('wbsMasterHeaderCb');
    if (masterCb && filtered.length > 0) {
      const checkable = filtered.filter(i => {
        const sap = i.statusSap || formatSapStatusShort(i.status);
        return !isWbsItemExcludedFromCheckbox(sap, currentCrit);
      });
      masterCb.checked = checkable.length > 0 && checkable.every(i => wbsState.selectedWbs.has(i.wbs));
    }
  };

  /**
   * Toggle Master Header Checkbox
   */
  window.toggleMasterHeaderCheckbox = function (isChecked) {
    const filtered = getFilteredWbsData(false, false);
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    if (isChecked) {
      filtered.forEach(i => {
        const sap = i.statusSap || formatSapStatusShort(i.status);
        if (!isWbsItemExcludedFromCheckbox(sap, currentCrit)) {
          wbsState.selectedWbs.add(i.wbs);
        }
      });
    } else {
      filtered.forEach(i => {
        wbsState.selectedWbs.delete(i.wbs);
      });
    }
    renderWbsTab();
  };

  /**
   * Select according to criteria exception preset
   * ข้อ 1, 2, 3, 5: ยกเว้น CLSD F4 (ไม่มี Checkbox)
   * ข้อ 4: ยกเว้น CLSD F2 (ไม่มี Checkbox)
   */
  window.selectWbsPresetCriteria = function () {
    const filtered = getFilteredWbsData(false, false);
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    wbsState.selectedWbs.clear();
    let count = 0;
    filtered.forEach(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status);
      if (!isWbsItemExcludedFromCheckbox(sap, currentCrit)) {
        wbsState.selectedWbs.add(item.wbs);
        count++;
      }
    });

    renderWbsTab();
    if (window.showToast) window.showToast(`เลือกงานที่มี Checkbox ทั้งหมด ${count.toLocaleString('th-TH')} รายการ`, 'success');
  };

  /**
   * Select All WBS (Only items with checkboxes)
   */
  window.selectAllWbs = function () {
    window.selectWbsPresetCriteria();
  };

  /**
   * Select All SAP Status Cards (ปุ่มเลือกการ์ด ทุกสถานะทั้งหมด ไว้ด้านบน)
   * เมื่อคลิกจะเลือกการ์ดสถานะ SAP ทุกใบให้ Active พร้อมอัปเดตกราฟและตาราง
   * หากเลือกครบทุกสถานะอยู่แล้ว การคลิกอีกครั้งจะเป็นการสลับ (Toggle) ยกเลิกการเลือกกลับสู่การแสดงผลทั้งหมดแบบปกติ
   */
  window.selectAllWbsSapStatuses = function () {
    if (!wbsState.selectedSapStatuses) {
      wbsState.selectedSapStatuses = new Set();
    }

    // ดึงข้อมูลก่อนการกรองสถานะ SAP เพื่อให้ได้ทุกสถานะที่มีในตัวกรองหลักปัจจุบัน
    const sapFiltered = getFilteredWbsData(false, true);
    if (!sapFiltered || !sapFiltered.length) return;

    // รวบรวมสถานะ SAP ทั้งหมดที่มีอยู่จริง
    const distinctStatuses = new Set();
    sapFiltered.forEach(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status) || 'ไม่ระบุ';
      if (sap) distinctStatuses.add(sap);
    });

    const totalDistinct = distinctStatuses.size;
    if (totalDistinct === 0) return;

    // ตรวจสอบว่าเลือกครบทุกสถานะอยู่แล้วหรือไม่
    const allAlreadySelected = totalDistinct === wbsState.selectedSapStatuses.size &&
      Array.from(distinctStatuses).every(s => wbsState.selectedSapStatuses.has(s));

    if (allAlreadySelected) {
      // หากเลือกครบอยู่แล้ว คลิกอีกครั้งจะเป็นการยกเลิกการเลือกสถานะการ์ด (กลับสู่โหมดเริ่มต้น)
      wbsState.selectedSapStatuses.clear();
      wbsState.sapStatus = 'ALL';
      if (window.showToast) window.showToast('ยกเลิกการเลือกสถานะการ์ด แสดงทุกสถานะตามปกติ', 'info');
    } else {
      // เลือกการ์ดทุกสถานะลงใน selectedSapStatuses
      wbsState.selectedSapStatuses.clear();
      distinctStatuses.forEach(s => wbsState.selectedSapStatuses.add(s));
      wbsState.sapStatus = Array.from(wbsState.selectedSapStatuses).join(', ');
      if (window.showToast) window.showToast(`เลือกการ์ดทุกสถานะแล้ว (${totalDistinct} สถานะ)`, 'success');
    }

    wbsState.page = 1;
    renderWbsTab();
  };

  /* ==========================================================================
   * WBS Table Header: Multi-select SAP Status Dropdown Filter Functions
   * ========================================================================== */

  /**
   * Render SAP Status Multi-select Dropdown List Items inside #wbsSapThDropdownList
   */
  function renderWbsSapThDropdownList() {
    const listContainer = document.getElementById('wbsSapThDropdownList');
    if (!listContainer) return;

    // ดึงข้อมูลก่อนกรองสถานะ SAP เพื่อให้ได้ทุกสถานะที่มีในตัวกรองหลักปัจจุบัน (ข้ามทั้ง localSap และ tableSap)
    const sapFiltered = getFilteredWbsData(false, true, true);
    if (!sapFiltered || !sapFiltered.length) {
      listContainer.innerHTML = '<div style="padding:0.75rem; text-align:center; color:var(--text-muted); font-size:0.8rem;">ไม่พบข้อมูลสถานะ SAP</div>';
      return;
    }

    const sapMap = {};
    sapFiltered.forEach(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status) || 'ไม่ระบุ';
      if (!sapMap[sap]) {
        sapMap[sap] = { status: sap, count: 0 };
      }
      sapMap[sap].count++;
    });

    const sapGroupRank = (status) => {
      const up = String(status || '').toUpperCase().trim();
      if (up.startsWith('CLSD')) return 0;
      if (up.startsWith('TECO')) return 1;
      if (up.startsWith('REL')) return 2;
      return 3;
    };

    const sortedStatuses = Object.keys(sapMap).sort((a, b) => {
      const rankA = sapGroupRank(a);
      const rankB = sapGroupRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return a.localeCompare(b, 'th');
    });

    const activeSet = wbsState.tableSapStatuses || new Set();
    const hasFilter = activeSet.size > 0;

    let itemsHtml = '';
    sortedStatuses.forEach(status => {
      const statInfo = sapMap[status] || { count: 0 };
      const isChecked = activeSet.has(status);
      const badgeClass = getSapBadgeClass(status);

      itemsHtml += `
        <div class="sap-dropdown-item ${isChecked ? 'is-selected' : ''}" 
             onclick="window.toggleWbsSapDropdownStatus('${escapeHtml(status)}', event)"
             title="คลิกเพื่อเลือก / ปลดสถานะ ${escapeHtml(status)} (${statInfo.count.toLocaleString('th-TH')} งาน)">
          <span class="badge-sap-short ${badgeClass}">${escapeHtml(status)}</span>
          <span class="sap-dropdown-item-count">${statInfo.count.toLocaleString('th-TH')} งาน</span>
        </div>
      `;
    });

    listContainer.innerHTML = itemsHtml;

    // Update count badge in header
    const badgeEl = document.getElementById('wbsSapDropdownCountBadge');
    if (badgeEl) {
      if (hasFilter) {
        badgeEl.textContent = `(เลือก ${activeSet.size}/${sortedStatuses.length})`;
        badgeEl.style.color = '#38BDF8';
      } else {
        badgeEl.textContent = `(ทุกสถานะ ${sortedStatuses.length})`;
        badgeEl.style.color = 'var(--pea-gold-400)';
      }
    }

    // Update summary text in footer
    const summaryEl = document.getElementById('wbsSapDropdownSummaryText');
    if (summaryEl) {
      if (!hasFilter) {
        const totalAll = Object.values(sapMap).reduce((sum, s) => sum + s.count, 0);
        summaryEl.textContent = `แสดงทุกสถานะ (${sortedStatuses.length} สถานะ: ${totalAll.toLocaleString('th-TH')} งาน)`;
      } else {
        const totalJobs = Array.from(activeSet).reduce((sum, s) => sum + (sapMap[s] ? sapMap[s].count : 0), 0);
        summaryEl.textContent = `กรอง ${activeSet.size} สถานะ (${totalJobs.toLocaleString('th-TH')} งาน)`;
      }
    }
  }

  /**
   * Reposition Multi-select SAP Status Dropdown directly under button (อยู่ด้านล่างอย่างเดียว ไม่ขึ้นข้างบน)
   */
  function repositionWbsSapDropdown() {
    const panel = document.getElementById('wbsSapThDropdownPanel');
    const btn = document.getElementById('btnWbsSapThDropdown');
    if (!panel || panel.style.display === 'none' || !btn) return;

    if (panel.parentNode !== document.body) {
      document.body.appendChild(panel);
    }

    const rect = btn.getBoundingClientRect();
    const panelWidth = 200;
    let left = rect.left + (rect.width / 2) - (panelWidth / 2);
    if (left + panelWidth > window.innerWidth - 12) {
      left = window.innerWidth - panelWidth - 12;
    }
    if (left < 12) left = 12;

    // ตำแหน่งแนวตั้ง: อยู่ด้านล่างปุ่มเสมอ (ไม่ให้พลิกกลับไปด้านบน)
    const top = rect.bottom + 4;

    // ปรับ max-height ของรายการให้พอดีกับพื้นที่ด้านล่างหน้าจอ ไม่ให้ล้นจอ
    const listEl = document.getElementById('wbsSapThDropdownList');
    if (listEl) {
      const availableHeight = Math.max(120, window.innerHeight - top - 75);
      listEl.style.maxHeight = `${Math.min(240, availableHeight)}px`;
    }

    panel.style.position = 'fixed';
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
    panel.style.zIndex = '999999';
  }

  /**
   * Toggle Multi-select SAP Status Dropdown Popover
   */
  window.toggleWbsSapThDropdown = function (evt) {
    if (evt) evt.stopPropagation();
    const panel = document.getElementById('wbsSapThDropdownPanel');
    if (!panel) return;

    const isVisible = panel.style.display !== 'none';
    if (isVisible) {
      window.closeWbsSapThDropdown();
      return;
    }

    renderWbsSapThDropdownList();

    const btn = document.getElementById('btnWbsSapThDropdown') || (evt && evt.currentTarget);
    if (btn) btn.classList.add('is-open');

    panel.style.display = 'flex';
    repositionWbsSapDropdown();

    window.removeEventListener('scroll', repositionWbsSapDropdown, true);
    window.addEventListener('scroll', repositionWbsSapDropdown, true);
    window.removeEventListener('resize', repositionWbsSapDropdown);
    window.addEventListener('resize', repositionWbsSapDropdown);
  };

  /**
   * Close Multi-select SAP Status Dropdown Popover
   */
  window.closeWbsSapThDropdown = function () {
    const panel = document.getElementById('wbsSapThDropdownPanel');
    if (panel) panel.style.display = 'none';
    const btn = document.getElementById('btnWbsSapThDropdown');
    if (btn) btn.classList.remove('is-open');

    window.removeEventListener('scroll', repositionWbsSapDropdown, true);
    window.removeEventListener('resize', repositionWbsSapDropdown);
  };

  /**
   * Toggle Single SAP Status Selection inside Dropdown (กรองเฉพาะในตาราง WBS เท่านั้น)
   */
  window.toggleWbsSapDropdownStatus = function (status, evt) {
    if (evt) evt.stopPropagation();
    if (!wbsState.tableSapStatuses) {
      wbsState.tableSapStatuses = new Set();
    }

    if (wbsState.tableSapStatuses.has(status)) {
      wbsState.tableSapStatuses.delete(status);
    } else {
      wbsState.tableSapStatuses.add(status);
    }

    wbsState.page = 1;
    renderWbsTab();

    // Re-render dropdown list if panel is open and keep it anchored right under the button
    const panel = document.getElementById('wbsSapThDropdownPanel');
    if (panel && panel.style.display !== 'none') {
      renderWbsSapThDropdownList();
      repositionWbsSapDropdown();
      const btn = document.getElementById('btnWbsSapThDropdown');
      if (btn) btn.classList.add('is-open');
    }
  };

  /**
   * Clear WBS Table SAP Status Filter via Header Eraser Button (ยางลบ ล้างตัวกรองสถานะ SAP ในตาราง)
   */
  window.clearWbsTableSapFilter = function (evt) {
    if (evt) evt.stopPropagation();
    if (wbsState.tableSapStatuses) {
      wbsState.tableSapStatuses.clear();
    }
    wbsState.page = 1;
    renderWbsTab();

    // ปิดหน้าต่างตัวกรองหากเปิดอยู่
    window.closeWbsSapThDropdown();

    if (window.showToast) {
      window.showToast('ล้างตัวกรองสถานะ SAP ในตารางเรียบร้อยแล้ว (แสดงทุกสถานะ)', 'info');
    }
  };

  /**
   * Select All or Clear All SAP Statuses from Dropdown Actions (กรองเฉพาะในตาราง WBS เท่านั้น)
   */
  window.selectAllWbsSapDropdownStatuses = function (selectAll) {
    if (!wbsState.tableSapStatuses) {
      wbsState.tableSapStatuses = new Set();
    }

    if (selectAll) {
      const sapFiltered = getFilteredWbsData(false, true, true);
      const distinct = new Set();
      (sapFiltered || []).forEach(item => {
        const sap = item.statusSap || formatSapStatusShort(item.status) || 'ไม่ระบุ';
        if (sap) distinct.add(sap);
      });
      wbsState.tableSapStatuses.clear();
      distinct.forEach(s => wbsState.tableSapStatuses.add(s));
      if (window.showToast) window.showToast(`เลือกทุกสถานะ SAP ในตาราง (${distinct.size} สถานะ)`, 'success');
    } else {
      wbsState.tableSapStatuses.clear();
      if (window.showToast) window.showToast('ล้างการเลือกสถานะ (แสดงทุกสถานะ SAP ในตาราง)', 'info');
    }

    wbsState.page = 1;
    renderWbsTab();

    const panel = document.getElementById('wbsSapThDropdownPanel');
    if (panel && panel.style.display !== 'none') {
      renderWbsSapThDropdownList();
    }
  };

  /**
   * Clear All WBS Selection
   * ล้างทั้งสถานะการ์ด กราฟแท่ง และรายการ Checkbox ที่เลือกทั้งหมดตามคำสั่งผู้ใช้งาน
   */
  window.clearAllWbsSelection = function () {
    // 1. ล้างการเลือก Checkbox งาน WBS ทั้งหมด
    wbsState.selectedWbs.clear();

    // 2. ล้างการเลือกสถานะการ์ด SAP และตัวกรองสถานะ SAP ในตารางทั้งหมด (คืนค่าเป็นการแสดงผลทุกสถานะ)
    if (wbsState.selectedSapStatuses) {
      wbsState.selectedSapStatuses.clear();
    }
    if (wbsState.tableSapStatuses) {
      wbsState.tableSapStatuses.clear();
    }
    wbsState.sapStatus = 'ALL';

    // 3. ล้างการเลือกหน่วยงานจากกราฟแท่ง (คืนค่าแสดงทุกหน่วยงาน)
    wbsState.office = 'ALL';
    const oSelect = document.getElementById('wbsOfficeFilterSelect');
    if (oSelect) oSelect.value = 'ALL';

    // 4. รีเซ็ตสถานะ hover/focus และ tooltip ของกราฟ
    wbsChartHoverIdx = -1;
    const tooltipEl = document.getElementById('wbsChartTooltip');
    if (tooltipEl) tooltipEl.style.display = 'none';

    // 5. รีเซ็ตหน้าตารางเป็นหน้า 1 และเรนเดอร์ใหม่ทั้งหมด
    wbsState.page = 1;
    renderWbsTab();

    if (window.showToast) window.showToast('ล้างข้อมูลสถานะการ์ด กราฟ และรายการที่เลือกเรียบร้อยแล้ว', 'info');
  };

  /**
   * Clear WBS Checkbox Selection Only (ล้างข้อมูลเฉพาะที่เลือกจาก Checkbox เท่านั้น)
   * ไม่ล้างการเลือกสถานะการ์ด SAP และไม่ล้างการเลือกหน่วยงานบนกราฟ
   */
  window.clearWbsCheckboxSelection = function () {
    const prevCount = wbsState.selectedWbs ? wbsState.selectedWbs.size : 0;
    if (!wbsState.selectedWbs || wbsState.selectedWbs.size === 0) return;

    // 1. ล้างเฉพาะ Set ของ WBS ที่ถูก Checkbox
    wbsState.selectedWbs.clear();

    // 2. ปลดเครื่องหมาย Master Checkbox ที่หัวตาราง
    const masterCb = document.getElementById('wbsMasterHeaderCb');
    if (masterCb) masterCb.checked = false;

    // 3. ปลด Checkbox ทุกช่องในตาราง
    document.querySelectorAll('.wbs-sap-row-cb').forEach(cb => {
      cb.checked = false;
    });

    // 4. เรนเดอร์อัปเดตหน้า WBS ใหม่ โดยคงตัวกรองสถานะการ์ด SAP และหน่วยงานไว้ตามเดิม
    renderWbsTab();

    if (window.showToast) {
      window.showToast(`ล้างรายการที่เลือกจาก Checkbox เรียบร้อยแล้ว (${prevCount.toLocaleString('th-TH')} งาน)`, 'info');
    }
  };

  /**
   * Toggle WBS selection by specific SAP Status
   */
  window.toggleWbsSapSelection = function (sapStatus) {
    const filtered = getFilteredWbsData(false, false);
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    const itemsOfSap = filtered.filter(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status);
      return !isWbsItemExcludedFromCheckbox(sap, currentCrit) && sap === sapStatus;
    });

    if (!itemsOfSap.length) return;

    const allSelected = itemsOfSap.every(item => wbsState.selectedWbs.has(item.wbs));

    if (allSelected) {
      itemsOfSap.forEach(item => wbsState.selectedWbs.delete(item.wbs));
      if (window.showToast) window.showToast(`ปลดการเลือกสถานะ ${sapStatus} (${itemsOfSap.length} งาน)`, 'info');
    } else {
      itemsOfSap.forEach(item => wbsState.selectedWbs.add(item.wbs));
      if (window.showToast) window.showToast(`เลือกสถานะ ${sapStatus} ทั้งหมด ${itemsOfSap.length} งาน`, 'success');
    }

    renderWbsTab();
  };

  /**
   * Toggle All WBS Selection (Switch between select-all and deselect-all)
   */
  window.toggleWbsAllSelection = function () {
    const filtered = getFilteredWbsData(false, false);
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const excludedSap = getExcludedSapForCriteria(currentCrit);

    const checkable = filtered.filter(item => {
      const sap = item.statusSap || formatSapStatusShort(item.status);
      return !isWbsItemExcludedFromCheckbox(sap, currentCrit);
    });

    const allSelected = checkable.length > 0 && checkable.every(item => wbsState.selectedWbs.has(item.wbs));
    if (allSelected) {
      window.clearAllWbsSelection();
    } else {
      window.selectAllWbs();
    }
  };

  /**
   * Render Selected WBS Items Summary Card
   * (นำการ์ดสรุปรายการที่เลือกด้านล่างออกตามคำสั่งผู้ใช้งาน โดยย้ายข้อมูลการเลือก Checkbox ไปแสดงอยู่ในการ์ดสรุปสถานะ SAP ด้านบนแล้ว)
   */
  function renderWbsSelectedSummaryCard(filtered, currentCrit, excludedSap) {
    const container = document.getElementById('wbsSelectedSummaryCard');
    if (!container) return;
    container.innerHTML = '';
    container.style.display = 'none';
  }

  /**
   * Render WBS Target Comparison Section (กราฟแนวนอน 2 ชั้น เปรียบเทียบเป้าหมาย KPI ระดับ 5 กับ CLSD SAP + Checkbox)
   */
  function renderWbsTargetComparisonSection(filtered, currentCrit, excludedSap) {
    const container = document.getElementById('wbsTargetComparisonSection');
    if (!container) return;

    // 1. Get KPI Simulation Target Months from window.getKpiSimulationTargetMonths
    const targetMonths = (typeof window.getKpiSimulationTargetMonths === 'function')
      ? window.getKpiSimulationTargetMonths(currentCrit)
      : [];

    if (!targetMonths || !targetMonths.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }
    container.style.display = '';

    // Determine default selected month (first non-achieved month e.g. ต.ค., per requirement 2)
    const availableMonths = targetMonths.filter(m => m.hasTarget !== false);
    if (!availableMonths.length) {
      container.innerHTML = '';
      container.style.display = 'none';
      return;
    }

    const selectableMonths = availableMonths.filter(m => !m.isAchieved);
    const isCurrentValid = wbsState.kpiTargetMonth && selectableMonths.some(m => m.monthNum === wbsState.kpiTargetMonth);

    if (!isCurrentValid) {
      wbsState.kpiTargetMonth = selectableMonths.length ? selectableMonths[0].monthNum : (availableMonths[0] ? availableMonths[0].monthNum : null);
    }

    const selectedMonth = availableMonths.find(m => m.monthNum === wbsState.kpiTargetMonth) || selectableMonths[0] || availableMonths[0];

    // Determine Criteria Type & Target SAP Status
    const isVal = selectedMonth.unit === 'val';
    const cStr = String(currentCrit || '').trim();
    let isCrit4 = false;
    let isCrit3 = false;
    let sapTargetStatus = 'CLSD F4';

    if (cStr.includes('ข้อ 4') || cStr.includes('ข้อ4') || cStr.includes('C02.2')) {
      isCrit4 = true;
      sapTargetStatus = 'CLSD F2';
    } else if (cStr.includes('ข้อ 3') || cStr.includes('ข้อ3') || cStr.includes('TECO') || cStr.includes('teco')) {
      isCrit3 = true;
      sapTargetStatus = 'CLSD F4';
    }

    // Compute SAP status amounts from filtered (which contains all records under current criteria)
    let clsdSapCount = 0;
    let clsdSapAuc = 0;

    (filtered || []).forEach(item => {
      const sap = (item.statusSap || formatSapStatusShort(item.status) || '').toUpperCase().trim();
      const auc = Number(item.cn41ActualCost) || 0;
      if (isCrit4) {
        if (sap === 'CLSD F2' || sap.includes('F2') || sap.includes('CLSD 2')) {
          clsdSapCount++;
          clsdSapAuc += auc;
        }
      } else {
        if (sap === 'CLSD F4' || sap.includes('F4') || sap.includes('CLSD 4')) {
          clsdSapCount++;
          clsdSapAuc += auc;
        }
      }
    });

    // Compute Selected from Checkbox
    let selectedCheckboxCount = 0;
    let selectedCheckboxAuc = 0;
    (filtered || []).forEach(item => {
      if (wbsState.selectedWbs.has(item.wbs)) {
        selectedCheckboxCount++;
        selectedCheckboxAuc += (Number(item.cn41ActualCost) || 0);
      }
    });

    // Determine quantities based on unit
    const targetAmount = Math.max(0, selectedMonth.amt || 0);
    const closedInSap = isVal ? clsdSapAuc : clsdSapCount;
    const selectedFromCheckbox = isVal ? selectedCheckboxAuc : selectedCheckboxCount;
    const currentProgress = closedInSap + selectedFromCheckbox;

    const diff = targetAmount - currentProgress;
    const isGoalReached = (diff <= 0);
    const overAmount = Math.max(0, currentProgress - targetAmount);
    const remainingAmount = Math.max(0, diff);

    const pctAchievedNum = targetAmount > 0 ? ((currentProgress / targetAmount) * 100) : (currentProgress > 0 ? 100 : 0);
    const pctAchievedStr = pctAchievedNum.toFixed(1);
    const progressPct = pctAchievedNum;

    // Scaling
    const maxVal = Math.max(targetAmount, currentProgress, 1);
    const targetBarPct = Math.min(100, Math.max(3, (targetAmount / maxVal) * 100));
    const progressBarPct = Math.min(100, Math.max(3, (currentProgress / maxVal) * 100));

    const sapSegPct = currentProgress > 0 ? ((closedInSap / currentProgress) * 100) : 0;
    const selectedSegPct = currentProgress > 0 ? ((selectedFromCheckbox / currentProgress) * 100) : 0;

    const formatFull = (val) => {
      if (isVal) {
        return `฿${formatMoney(val)} (${(val / 1e6).toFixed(2)} ลบ.)`;
      }
      return `${Number(val || 0).toLocaleString('th-TH')} งาน`;
    };

    const formatShort = (val) => {
      if (isVal) {
        return `${(val / 1e6).toFixed(2)} ลบ.`;
      }
      return `${Number(val || 0).toLocaleString('th-TH')} งาน`;
    };

    const formatCardVal = (val) => {
      if (isVal) {
        return `฿${formatMoney(val)}`;
      }
      return `${Number(val || 0).toLocaleString('th-TH')} งาน`;
    };

    const targetDisplay = formatFull(targetAmount);
    const progressDisplay = formatFull(currentProgress);
    const sapDisplay = formatFull(closedInSap);
    const selectedDisplay = formatFull(selectedFromCheckbox);
    const overDisplay = formatFull(overAmount);
    const remainingDisplay = formatFull(remainingAmount);

    const unitTitle = isVal ? 'มูลค่า' : 'จำนวนงาน';
    const sapBadgeLabel = isCrit4 ? 'CLSD F2' : 'CLSD F4';
    const critDisplay = currentCrit && currentCrit !== 'ALL' ? currentCrit : 'ทุกเกณฑ์วัด';

    // 1. Month Selector Buttons HTML (รูป 31: Chevron Segmented Arrow Track พร้อมกรอบสีเหลืองอร่าม)
    const monthButtonsHtml = availableMonths.map((m, idx) => {
      const isSelected = (m.monthNum === wbsState.kpiTargetMonth);
      const segClass = `m-seg-${idx + 1}`;
      if (m.isAchieved) {
        // ข้อ 2: หากเดือนไหนบรรลุเป้าให้แสดงด้วย แต่เลือกไม่ได้
        return `
          <button type="button" class="btn-wbs-kpi-month ${segClass} is-achieved" disabled
            title="เดือน ${m.shortName}: เป้า KPI ${m.kpiPct} (บรรลุเป้าหมายระดับ 5 แล้ว)">
            <span class="btn-wbs-kpi-inner">
              <span class="m-title">${m.shortName}</span>
              <span class="m-kpi-badge">เป้า KPI: ${m.kpiPct}</span>
              <span class="m-amt">(${m.amtStr})</span>
              <span class="m-achieved-pill">✓ บรรลุเป้า</span>
            </span>
          </button>
        `;
      } else {
        return `
          <button type="button" class="btn-wbs-kpi-month ${segClass} ${isSelected ? 'active' : ''}"
            onclick="window.setWbsKpiTargetMonth(${m.monthNum})"
            title="คลิกเพื่อเลือกเป้าหมายเดือน ${m.shortName} 69 (เป้า KPI: ${m.kpiPct} | ต้องปิดเพิ่ม ${m.amtStr})">
            <span class="btn-wbs-kpi-inner">
              <span class="m-title">${m.shortName}</span>
              <span class="m-kpi-badge">เป้า KPI: ${m.kpiPct}</span>
              <span class="m-amt">(${m.amtStr})</span>
              ${isSelected ? '<span class="m-active-dot"><span class="m-active-pulse-beacon"></span>กำลังเลือก</span>' : ''}
            </span>
          </button>
        `;
      }
    }).join('');

    // Target Marker Position on Progress Bar
    const targetMarkerLeft = `${targetBarPct}%`;
    const markerAlignClass = targetBarPct < 25 ? 'label-right' : 'label-left';

    container.innerHTML = `
      <div class="wbs-kpi-comparison-card" id="wbsTargetComparisonCard">
        <!-- Card Header -->
        <div class="wbs-kpi-comp-header">
          <div class="wbs-kpi-comp-title-group">
            <div class="wbs-kpi-comp-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="6"></circle>
                <circle cx="12" cy="12" r="2"></circle>
              </svg>
            </div>
            <div>
              <div class="wbs-kpi-comp-title">
                <span>เปรียบเทียบการปิด${unitTitle}ตามเป้าหมายระดับ KPI 5</span>
                <span class="wbs-kpi-crit-tag">${escapeHtml(critDisplay)}</span>
                <span class="wbs-kpi-unit-tag">${isVal ? '💰 มูลค่า (บาท)' : '⚡ จำนวนงาน (งาน)'}</span>
              </div>
            </div>
          </div>
          <div class="wbs-kpi-comp-meta-info">
            <span class="kpi-meta-chip">
              <span>ฐานเป้าหมาย:</span>
              <strong style="color:var(--pea-gold-400);">${selectedMonth.shortName} 69 (${selectedMonth.kpiPct})</strong>
            </span>
          </div>
        </div>

        <!-- Month Selection Buttons (Requirement 2: หากเดือนไหนบรรลุเป้าให้แสดงด้วย แต่เลือกไม่ได้) -->
        <div class="wbs-kpi-month-selector-strip">
          <div class="wbs-kpi-month-label">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>เลือกเดือนเป้าหมาย:</span>
          </div>
          <div class="wbs-kpi-month-btn-group">
            ${monthButtonsHtml}
          </div>
        </div>

        <!-- 2-Column KPI Comparison: Left Bars + Right Outcome Panel (ย้ายแถวล่างมาเป็นคอลัมน์ขวาตามคำขอ) -->
        <div class="wbs-kpi-main-grid">
          <!-- Left: 2-Layer Horizontal Graph (Requirement 1) -->
          <div class="wbs-kpi-bars-box">
            <!-- Top Bar: เป้าหมายปิดเพิ่ม (รูป 22) -->
            <div class="wbs-kpi-bar-block bar-top-target">
              <div class="wbs-kpi-bar-header">
                <div class="bar-header-left">
                  <span class="bar-tag tag-target">🎯 กราฟบน (เป้าหมายปิดเพิ่ม)</span>
                  <span class="bar-month-pill">${selectedMonth.shortName} 69</span>
                  <span class="bar-kpi-pill">เป้า KPI: ${selectedMonth.kpiPct}</span>
                </div>
                <div class="bar-header-right">
                  <span class="bar-amount-lbl">เป้าหมาย:</span>
                  <span class="bar-amount-main target-text">${targetDisplay}</span>
                </div>
              </div>
              <div class="wbs-kpi-track track-target" title="เป้าหมายปิดเพิ่มเดือน ${selectedMonth.shortName} 69: ${targetDisplay}">
                <div class="wbs-kpi-fill fill-target" style="width: ${targetBarPct}%;">
                  <div class="bar-inner-content">
                    <span class="bar-inner-label">เป้าหมาย KPI ระดับ 5 (${selectedMonth.shortName} 69)</span>
                    <span class="bar-inner-val">${formatShort(targetAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Bottom Bar: ปิดงาน SAP + รายการที่เลือก (รูป 23) -->
            <div class="wbs-kpi-bar-block bar-bottom-progress">
              <div class="wbs-kpi-bar-header">
                <div class="bar-header-left">
                  <span class="bar-tag tag-progress">⚡ กราฟล่าง (ยอดดำเนินการ)</span>
                  <span class="bar-month-pill">${selectedMonth.shortName} 69</span>
                  <span class="bar-selected-pill ${selectedFromCheckbox > 0 ? 'has-selected' : ''}">
                    ${selectedFromCheckbox > 0 ? `เลือกแล้ว ${selectedCheckboxCount.toLocaleString('th-TH')} งาน` : '+ ยังไม่ได้เลือก Checkbox'}
                  </span>
                </div>
                <div class="bar-header-right">
                  <!-- วงกลมให้เพิ่ม มูลค่า/งาน CLSD F4 / F2 สีเขียว (คำสั่งวงที่ 2 เพิ่มจำนวนงานด้วย) -->
                  <div class="bar-stat-group stat-sap">
                    <span class="bar-amount-lbl lbl-sap">${sapBadgeLabel}:</span>
                    <span class="bar-amount-main sap-text">${sapDisplay} ${isVal ? `<span style="font-size:0.88em; opacity:0.9; margin-left:2px;">(${clsdSapCount.toLocaleString('th-TH')} งาน)</span>` : ''}</span>
                  </div>
                  <span class="bar-stat-divider">|</span>
                  <!-- ส่วนที่เลือก: ตัวเลขสีฟ้า -->
                  <div class="bar-stat-group stat-selected">
                    <span class="bar-amount-lbl lbl-selected">ส่วนที่เลือก:</span>
                    <span class="bar-amount-main selected-text">${selectedFromCheckbox > 0 ? '+' : ''}${selectedDisplay}</span>
                  </div>
                  <span class="bar-stat-divider">|</span>
                  <!-- ตัวเลขรวม: สีเขียวอร่ามเรืองแสง -->
                  <div class="bar-stat-group stat-total">
                    <span class="bar-amount-lbl lbl-total">รวมทำได้:</span>
                    <span class="bar-amount-main progress-text">${progressDisplay}</span>
                  </div>
                </div>
              </div>
              <div class="wbs-kpi-track track-progress" title="ยอดดำเนินการรวม: ${progressDisplay}">
                <!-- Target Line Marker (รูป 32: เส้นบอกระดับเป้าหมายสีทองเปล่งประกายเรืองแสง ปลายมนสีขาว ทุกอัน) -->
                <div class="target-marker-line"
                  style="left: ${targetMarkerLeft};"
                  title="เส้นเป้าหมาย KPI ระดับ 5: ${targetDisplay}">
                  <span class="target-marker-label ${markerAlignClass}">▲ เส้นเป้าหมาย (${formatShort(targetAmount)})</span>
                </div>

                <!-- Multi-segment Fill -->
                <div class="wbs-kpi-fill-group" style="width: ${progressBarPct}%;">
                  <!-- Segment 1: Closed in SAP (คำสั่งวงที่ 2 เพิ่มจำนวนงานด้วย) -->
                  <div class="bar-segment seg-sap" style="width: ${sapSegPct}%;"
                    title="ปิดงานใน SAP (${sapBadgeLabel}): ${sapDisplay} (${clsdSapCount.toLocaleString('th-TH')} งาน)">
                    <span class="seg-title">SAP ${sapBadgeLabel}: ${formatShort(closedInSap)} ${isVal ? `(${clsdSapCount.toLocaleString('th-TH')} งาน)` : ''}</span>
                  </div>
                  <!-- Segment 2: Selected from Checkbox -->
                  ${selectedFromCheckbox > 0 ? `
                    <div class="bar-segment seg-selected" style="width: ${selectedSegPct}%;"
                      title="รายการที่เลือกจาก Checkbox: ${selectedDisplay} (${selectedCheckboxCount} งาน)">
                      <span class="seg-title">+ ที่เลือก: ${formatShort(selectedFromCheckbox)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- Right Column: Comparison Result & Action Column (ย้ายแถวล่างมาเป็นคอลัมน์ชิดขวา) -->
          <div class="wbs-kpi-outcome-col ${isGoalReached ? 'status-achieved' : 'status-pending'}">
            <div class="outcome-col-header">
              <span class="outcome-status-title">
                <span class="outcome-icon">${isGoalReached ? '🎉' : '⚠️'}</span>
                ${isGoalReached ? 'บรรลุเป้าหมายแล้ว!' : 'ยังต้องปิดเพิ่มอีก'}
              </span>
              <span class="outcome-month-badge">${selectedMonth.shortName} 69</span>
            </div>
            <div class="outcome-col-body">
              <span class="outcome-col-lbl">${isGoalReached ? 'ยอดเกินเป้าหมาย (+)' : 'คงเหลือต้องปิดเพิ่ม'}</span>
              <span class="outcome-col-val ${isGoalReached ? 'val-success' : 'val-pending'}">
                ${isGoalReached ? `+${formatCardVal(overAmount)}` : formatCardVal(remainingAmount)}
              </span>
              <span class="outcome-col-sub">
                ${isGoalReached ? `(เกินเป้า ${formatShort(overAmount)})` : `(ต้องปิดอีก ${formatShort(remainingAmount)})`}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.setWbsKpiTargetMonth = function (mNum) {
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    const targetMonths = (typeof window.getKpiSimulationTargetMonths === 'function')
      ? window.getKpiSimulationTargetMonths(currentCrit)
      : [];
    const targetM = (targetMonths || []).find(m => m.monthNum === mNum);
    if (targetM && targetM.isAchieved) return; // Month already achieved, cannot select per requirement 2

    wbsState.kpiTargetMonth = mNum;
    const sapFiltered = getFilteredWbsData(false, true);
    const excludedSap = getExcludedSapForCriteria(currentCrit);
    renderWbsTargetComparisonSection(sapFiltered, currentCrit, excludedSap);
  };

  /**
   * Render 4 KPI Stat Cards
   */
  function renderWbsStatCards(filtered, totalRawCount) {
    // 1. Total Jobs
    const totalEl = document.getElementById('wbsStatTotalJobs');
    const totalSubEl = document.getElementById('wbsStatTotalJobsSub');
    if (totalEl) totalEl.textContent = filtered.length.toLocaleString('th-TH');
    if (totalSubEl) {
      const pct = totalRawCount > 0 ? ((filtered.length / totalRawCount) * 100).toFixed(1) : '0';
      totalSubEl.textContent = `คิดเป็น ${pct}% จากงานทั้งหมด ${totalRawCount.toLocaleString('th-TH')} รายการ`;
    }

    // 2. Distinct Impacted Offices
    const officesSet = new Set(filtered.map(i => i.office).filter(Boolean));
    const officesEl = document.getElementById('wbsStatTotalOffices');
    const officesSubEl = document.getElementById('wbsStatTotalOfficesSub');
    if (officesEl) officesEl.textContent = `${officesSet.size} หน่วยงาน`;
    if (officesSubEl) {
      officesSubEl.textContent = `กระจายอยู่ใน ${new Set(filtered.map(i => i.province).filter(Boolean)).size} จังหวัด/กอง`;
    }

    // 3. Responsible Engineers
    const engSet = new Set(filtered.map(i => i.engineer).filter(Boolean));
    const engEl = document.getElementById('wbsStatTotalEngineers');
    const engSubEl = document.getElementById('wbsStatTotalEngineersSub');
    if (engEl) engEl.textContent = `${engSet.size} คน`;
    if (engSubEl) {
      const deptSet = new Set(filtered.map(i => i.department).filter(Boolean));
      engSubEl.textContent = `สังกัด ${deptSet.size} แผนก/หมวด`;
    }

    // 4. Budget Breakdown
    const bRow = document.getElementById('wbsStatBudgetBreakdown');
    if (bRow) {
      let cCount = 0, iCount = 0, pCount = 0, c02Count = 0, otherCount = 0;
      filtered.forEach(item => {
        const b = (item.budget || '').toUpperCase();
        if (b.includes('C02')) c02Count++;
        else if (b.includes('C.1') || b.includes('C')) cCount++;
        else if (b.includes('I')) iCount++;
        else if (b.includes('P')) pCount++;
        else otherCount++;
      });

      bRow.innerHTML = `
        <span class="budget-pill pill-c" title="งบ C.1">C.1: <strong>${cCount.toLocaleString('th-TH')}</strong></span>
        <span class="budget-pill pill-i" title="งบ I">I: <strong>${iCount.toLocaleString('th-TH')}</strong></span>
        <span class="budget-pill pill-p" title="งบ P">P: <strong>${pCount.toLocaleString('th-TH')}</strong></span>
        ${c02Count > 0 ? `<span class="budget-pill pill-c02" title="งบ C02.2">C02: <strong>${c02Count.toLocaleString('th-TH')}</strong></span>` : ''}
      `;
    }
  }

  /**
   * Update กอง/กฟฟ. Dropdown Filter Options
   */
  function updateWbsOfficeDropdown(records) {
    const select = document.getElementById('wbsOfficeFilterSelect');
    if (!select) return;

    const currentVal = wbsState.office || 'ALL';
    const offCounts = {};
    (records || []).forEach(item => {
      const off = (item.office || '').trim();
      if (off) offCounts[off] = (offCounts[off] || 0) + 1;
    });

    const sortedOffs = Object.keys(offCounts).sort((a, b) => a.localeCompare(b, 'th'));

    let html = `<option value="ALL">ทุกหน่วยงาน (ทั้งหมด ${sortedOffs.length})</option>`;
    sortedOffs.forEach(off => {
      const selected = (off === currentVal) ? 'selected' : '';
      html += `<option value="${escapeHtml(off)}" ${selected}>${escapeHtml(off)} (${offCounts[off]})</option>`;
    });

    select.innerHTML = html;
  }

  /**
   * Update Responsible Engineer Dropdown Filter Options
   */
  function updateWbsEngineerDropdown(filtered) {
    const select = document.getElementById('wbsEngineerFilterSelect');
    if (!select) return;

    const currentVal = wbsState.engineer;
    const engCounts = {};
    filtered.forEach(item => {
      const eng = item.engineer;
      if (eng) engCounts[eng] = (engCounts[eng] || 0) + 1;
    });

    const sortedEngs = Object.keys(engCounts).sort((a, b) => a.localeCompare(b, 'th'));

    let html = `<option value="ALL">ทุกคน (ทั้งหมด ${sortedEngs.length})</option>`;
    sortedEngs.forEach(eng => {
      const selected = (eng === currentVal) ? 'selected' : '';
      html += `<option value="${escapeHtml(eng)}" ${selected}>${escapeHtml(eng)} (${engCounts[eng]})</option>`;
    });

    select.innerHTML = html;
  }

  /**
   * Update Plan Close Dropdown Filter Options (File 06 Google Sheet)
   */
  function updateWbsPlanCloseDropdown(filtered) {
    const select = document.getElementById('wbsPlanCloseFilterSelect');
    if (!select) return;

    const currentVal = wbsState.planClose || 'ALL';
    const planCounts = {};
    let emptyCount = 0;

    filtered.forEach(item => {
      const p = (item.planClose || '').trim();
      if (!p) {
        emptyCount++;
      } else {
        const parts = p.split(/,\s*/);
        parts.forEach(part => {
          const pt = part.trim();
          if (pt) planCounts[pt] = (planCounts[pt] || 0) + 1;
        });
      }
    });

    const sortedPlans = Object.keys(planCounts).sort((a, b) => a.localeCompare(b, 'th'));

    let html = `<option value="ALL">ทุกแผนปิดงาน (ทั้งหมด ${sortedPlans.length})</option>`;
    if (emptyCount > 0) {
      const selected = (currentVal === 'EMPTY') ? 'selected' : '';
      html += `<option value="EMPTY" ${selected}>ยังไม่มีแผนปิดงาน (${emptyCount.toLocaleString('th-TH')})</option>`;
    }
    sortedPlans.forEach(plan => {
      const selected = (plan === currentVal) ? 'selected' : '';
      html += `<option value="${escapeHtml(plan)}" ${selected}>${escapeHtml(plan)} (${planCounts[plan].toLocaleString('th-TH')})</option>`;
    });

    select.innerHTML = html;
  }

  /**
   * Render Column Visibility Dropdown Checkbox List (Grouped or Order View, Searchable, Reorderable)
   */
  function renderWbsColDropdownList(searchQuery) {
    const listEl = document.getElementById('wbsColCheckboxList');
    const badgeEl = document.getElementById('wbsColCountBadge');
    if (!listEl) return;

    const q = (searchQuery !== undefined ? searchQuery : (wbsState.colSearchQuery || '')).trim().toLowerCase();
    const orderedDefs = getOrderedColDefs();

    let totalActiveCount = 0;
    orderedDefs.forEach(col => {
      if (wbsState.visibleColumns[col.id]) totalActiveCount++;
    });
    if (badgeEl) {
      badgeEl.textContent = `${totalActiveCount}/${WBS_COL_DEFS.length}`;
    }

    let html = '';

    if (wbsState.colViewMode === 'order') {
      // Mode: Display Order (1 to 41)
      const filteredCols = orderedDefs.filter(c => !q || c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.oldLabel && c.oldLabel.toLowerCase().includes(q)));

      html += `
        <div style="padding:0.25rem 0.5rem; font-size:0.75rem; color:var(--text-dim); display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,255,255,0.08); margin-bottom:0.35rem;">
          <span>ลำดับคอลัมน์ในตาราง (ซ้าย ➔ ขวา)</span>
          <span style="font-size:0.7rem; color:var(--sweet-pink, #FF79B8);">ลาก ⠿ หรือกด ▲ ▼ เพื่อเลื่อน</span>
        </div>
      `;

      filteredCols.forEach(col => {
        const isChecked = !!wbsState.visibleColumns[col.id];
        const is03 = col.group === '03';
        const is05 = col.group === '05_cn41';
        const is06 = col.group === '06_sheet';
        const isCustom = col.group === 'custom';
        const tagClass = isCustom ? 'col-tag-custom' : (is03 ? 'col-tag-03' : (is05 ? 'col-tag-05' : (is06 ? 'col-tag-06' : 'col-tag-04')));
        const tagText = isCustom ? 'CUSTOM' : (is03 ? '03 WBS' : (is05 ? '05 CN41' : (is06 ? '06 SHEET' : '04 ZBUDR')));

        const realOrderIdx = orderedDefs.findIndex(c => c.id === col.id);
        const isFirst = realOrderIdx === 0;
        const isLast = realOrderIdx === orderedDefs.length - 1;

        html += `
          <div class="col-check-item" 
               draggable="true"
               ondragstart="window.handleDropdownItemDragStart(event, '${col.id}')"
               ondragover="window.handleDropdownItemDragOver(event, '${col.id}')"
               ondragleave="window.handleDropdownItemDragLeave(event)"
               ondrop="window.handleDropdownItemDrop(event, '${col.id}')"
               ondragend="window.handleDropdownItemDragEnd(event)"
               title="${escapeHtml(col.label)}${col.oldLabel ? ' (เดิม: ' + escapeHtml(col.oldLabel) + ')' : ''} (${tagText}) - ลากหรือกดปุ่มเพื่อเลื่อนลำดับ">
            <div class="col-check-item-left">
              <span class="th-drag-handle" style="font-size:0.75rem;" title="คลิกค้างแล้วลากเพื่อสลับตำแหน่ง">⠿</span>
              <span class="col-order-num-badge">${realOrderIdx + 1}</span>
              <input type="checkbox" data-col-id="${col.id}" ${isChecked ? 'checked' : ''}
                onchange="window.toggleSingleWbsCol('${col.id}', this.checked)">
              <span style="${isChecked ? 'color:var(--text-main); font-weight:600;' : 'color:var(--text-dim);'}">
                ${escapeHtml(col.label)}${col.oldLabel ? `<span style="font-size:0.7rem; color:var(--pea-gold-400, #FBBF24); opacity:0.9; margin-left:4px; font-weight:normal;" title="ชื่อเดิม: ${escapeHtml(col.oldLabel)}">(เดิม: ${escapeHtml(col.oldLabel)})</span>` : ''}
              </span>
            </div>
            <div class="col-check-item-right">
              <span class="col-source-tag ${tagClass}">${tagText}</span>
              <div class="col-reorder-btns" onclick="event.stopPropagation();">
                <button type="button" class="btn-col-shift-item" title="เลื่อนขึ้น (ไปทางซ้ายของตาราง)" onclick="window.moveWbsColumnOrder('${col.id}', -1, event)" ${isFirst ? 'disabled' : ''}>▲</button>
                <button type="button" class="btn-col-shift-item" title="เลื่อนลง (ไปทางขวาของตาราง)" onclick="window.moveWbsColumnOrder('${col.id}', 1, event)" ${isLast ? 'disabled' : ''}>▼</button>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      // Mode: Grouped by category (with reorder buttons on each item)
      WBS_COL_GROUPS.forEach(grp => {
        const groupCols = orderedDefs.filter(c => c.group === grp.id);
        const filteredCols = groupCols.filter(c => !q || c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || (c.oldLabel && c.oldLabel.toLowerCase().includes(q)));
        if (!filteredCols.length) return;

        const groupActiveCount = groupCols.filter(c => wbsState.visibleColumns[c.id]).length;
        const allInGroupChecked = groupActiveCount === groupCols.length;

        html += `
          <div class="col-group-header">
            <span>${grp.icon} ${grp.label} <span style="font-size:0.7rem; opacity:0.85; font-weight:normal;">(${groupActiveCount}/${groupCols.length})</span></span>
            <button type="button" class="btn-group-toggle" onclick="window.toggleWbsColGroup('${grp.id}', ${!allInGroupChecked})">
              ${allInGroupChecked ? 'ซ่อนกลุ่มนี้' : 'เลือกทั้งกลุ่ม'}
            </button>
          </div>
        `;

        filteredCols.forEach(col => {
          const isChecked = !!wbsState.visibleColumns[col.id];
          const is03 = col.group === '03';
          const is05 = col.group === '05_cn41';
          const is06 = col.group === '06_sheet';
          const isCustom = col.group === 'custom';
          const tagClass = isCustom ? 'col-tag-custom' : (is03 ? 'col-tag-03' : (is05 ? 'col-tag-05' : (is06 ? 'col-tag-06' : 'col-tag-04')));
          const tagText = isCustom ? 'CUSTOM' : (is03 ? '03 WBS' : (is05 ? '05 CN41' : (is06 ? '06 SHEET' : '04 ZBUDR')));

          const realOrderIdx = orderedDefs.findIndex(c => c.id === col.id);
          const isFirst = realOrderIdx === 0;
          const isLast = realOrderIdx === orderedDefs.length - 1;

          html += `
            <div class="col-check-item" 
                 draggable="true"
                 ondragstart="window.handleDropdownItemDragStart(event, '${col.id}')"
                 ondragover="window.handleDropdownItemDragOver(event, '${col.id}')"
                 ondragleave="window.handleDropdownItemDragLeave(event)"
                 ondrop="window.handleDropdownItemDrop(event, '${col.id}')"
                 ondragend="window.handleDropdownItemDragEnd(event)"
                 title="${escapeHtml(col.label)}${col.oldLabel ? ' (เดิม: ' + escapeHtml(col.oldLabel) + ')' : ''} (${tagText}) - ลากหรือกดปุ่มเพื่อเลื่อนลำดับ">
              <div class="col-check-item-left">
                <span class="th-drag-handle" style="font-size:0.75rem;" title="คลิกค้างแล้วลากเพื่อสลับตำแหน่ง">⠿</span>
                <span class="col-order-num-badge">${realOrderIdx + 1}</span>
                <input type="checkbox" data-col-id="${col.id}" ${isChecked ? 'checked' : ''}
                  onchange="window.toggleSingleWbsCol('${col.id}', this.checked)">
                <span style="${isChecked ? 'color:var(--text-main); font-weight:600;' : 'color:var(--text-dim);'}">
                  ${escapeHtml(col.label)}${col.oldLabel ? `<span style="font-size:0.7rem; color:var(--pea-gold-400, #FBBF24); opacity:0.9; margin-left:4px; font-weight:normal;" title="ชื่อเดิม: ${escapeHtml(col.oldLabel)}">(เดิม: ${escapeHtml(col.oldLabel)})</span>` : ''}
                </span>
              </div>
              <div class="col-check-item-right">
                <span class="col-source-tag ${tagClass}">${tagText}</span>
                <div class="col-reorder-btns" onclick="event.stopPropagation();">
                  <button type="button" class="btn-col-shift-item" title="เลื่อนขึ้น" onclick="window.moveWbsColumnOrder('${col.id}', -1, event)" ${isFirst ? 'disabled' : ''}>▲</button>
                  <button type="button" class="btn-col-shift-item" title="เลื่อนลง" onclick="window.moveWbsColumnOrder('${col.id}', 1, event)" ${isLast ? 'disabled' : ''}>▼</button>
                </div>
              </div>
            </div>
          `;
        });
      });
    }

    listEl.innerHTML = html || '<div style="text-align:center; padding:1.5rem; color:var(--text-dim); font-size:0.8rem;">ไม่พบคอลัมน์ที่ตรงกับคำค้นหา</div>';
    if (badgeEl) {
      badgeEl.textContent = `${totalActiveCount}/${WBS_COL_DEFS.length}`;
    }
  }

  /**
   * Render Table Header (THEAD) dynamically based on visible columns (Drag & Drop + Shift Buttons)
   * ปรับตัวเลขผลรวม/ค่าเฉลี่ย ไปรวมกับเมนูด้านบน th เฉพาะ 5 คอลัมน์ที่ผู้ใช้ระบุในวงกลม:
   * 1. wbs: รวม {N} งาน
   * 2. office: 🏢 {N} กฟฟ.
   * 3. cn41ActualCost: รวม {val} บาท (ป้าย 'รวม' อยู่ด้านบน ตัวเลขอยู่ด้านล่าง สีทอง)
   * 4. pctMatWithdraw: เฉลี่ย {val}% (ป้าย 'เฉลี่ย' อยู่ด้านบน ตัวเลขอยู่ด้านล่าง สีทอง)
   * 5. pctExpenseWithdraw: เฉลี่ย {val}% (ป้าย 'เฉลี่ย' อยู่ด้านบน ตัวเลขอยู่ด้านล่าง สีทอง)
   */
  function renderWbsTableHead(data) {
    const thead = document.getElementById('wbsTableHead');
    if (!thead) return;

    const currentData = data || getFilteredWbsData(false);
    const totalFiltered = currentData.length;

    // 1. Calculate Accumulated Total AUC Value (ผลรวมสะสมมูลค่า AUC)
    let totalCn41Cost = 0;

    // 2. Calculate Average % for Materials and Expenses (% เบิกพัสดุ, % เบิก คชจ.)
    let sumMat = 0, countMat = 0;
    let sumExpense = 0, countExpense = 0;

    // Summary counts for offices
    const officesSet = new Set();

    currentData.forEach(item => {
      // AUC Sum
      const cost = Number(item.cn41ActualCost);
      if (!isNaN(cost)) {
        totalCn41Cost += cost;
      }

      // % เบิกพัสดุ
      const rawMat = Number(item.pctMatWithdraw);
      if (!isNaN(rawMat) && item.pctMatWithdraw !== null && item.pctMatWithdraw !== undefined && item.pctMatWithdraw !== '') {
        const valMat = (Math.abs(rawMat) <= 1.0 && rawMat !== 0) ? rawMat * 100 : rawMat;
        sumMat += valMat;
        countMat++;
      }

      // % เบิก คชจ.
      const rawExp = Number(item.pctExpenseWithdraw);
      if (!isNaN(rawExp) && item.pctExpenseWithdraw !== null && item.pctExpenseWithdraw !== undefined && item.pctExpenseWithdraw !== '') {
        const valExp = (Math.abs(rawExp) <= 1.0 && rawExp !== 0) ? rawExp * 100 : rawExp;
        sumExpense += valExp;
        countExpense++;
      }

      if (item.office) officesSet.add(item.office);
    });

    const avgPctMat = countMat > 0 ? (sumMat / countMat) : 0;
    const avgPctExpense = countExpense > 0 ? (sumExpense / countExpense) : 0;

    const orderedDefs = getOrderedColDefs();
    const visibleOrdered = orderedDefs.filter(col => wbsState.visibleColumns[col.id]);

    let thHtml = '<tr class="wbs-header-row">';
    visibleOrdered.forEach((col) => {
      const isSorted = wbsState.sortCol === col.sortKey;
      const sortClass = isSorted ? (wbsState.sortAsc ? 'sort-active asc' : 'sort-active desc') : '';
      const sortArrow = isSorted ? (wbsState.sortAsc ? ' ▲' : ' ▼') : '';

      let styleStr = 'vertical-align: top; ';
      if (col.width) styleStr += `width:${col.width}; `;
      if (col.minWidth) styleStr += `min-width:${col.minWidth}; `;
      if (col.align) styleStr += `text-align:${col.align}; `;

      let justifyStyle = 'align-items: flex-start; text-align: left; justify-content: flex-start;';
      let rowJustify = 'justify-content: flex-start;';
      if (col.align === 'center') {
        justifyStyle = 'align-items: center; text-align: center; justify-content: flex-start;';
        rowJustify = 'justify-content: center;';
      } else if (col.align === 'right') {
        justifyStyle = 'align-items: flex-end; text-align: right; justify-content: flex-start;';
        rowJustify = 'justify-content: flex-end;';
      }

      // Build Header Metric HTML เฉพาะ 5 คอลัมน์ที่วงกลมไว้
      let headerMetricHtml = '';
      if (totalFiltered > 0) {
        switch (col.id) {
          case 'wbs':
            headerMetricHtml = `
              <div class="th-header-metric-badge">
                <span class="th-header-gold-pill" title="จำนวนงาน WBS ทั้งหมด: ${totalFiltered.toLocaleString('th-TH')} งาน">
                  รวม <strong>${totalFiltered.toLocaleString('th-TH')}</strong> งาน
                </span>
              </div>`;
            break;

          case 'office':
            headerMetricHtml = `
              <div class="th-header-metric-badge">
                <span class="th-header-gold-pill" title="จำนวนหน่วยงานทั้งหมด: ${officesSet.size.toLocaleString('th-TH')} กฟฟ.">
                  🏢 <strong>${officesSet.size.toLocaleString('th-TH')}</strong> กฟฟ.
                </span>
              </div>`;
            break;

          case 'cn41ActualCost':
            headerMetricHtml = `
              <div class="th-header-metric-badge th-header-stacked">
                <span class="th-header-type-badge">รวม</span>
                <span class="th-header-gold-val" title="ผลรวมสะสมมูลค่า AUC ทั้งหมด: ${formatMoney(totalCn41Cost)} บาท">
                  ${formatMoney(totalCn41Cost)}
                </span>
              </div>`;
            break;

          case 'pctMatWithdraw':
            headerMetricHtml = `
              <div class="th-header-metric-badge th-header-stacked">
                <span class="th-header-type-badge">เฉลี่ย</span>
                <span class="th-header-gold-pct" title="ค่าเฉลี่ย % เบิกพัสดุ: ${avgPctMat.toFixed(2)}%">
                  ${avgPctMat.toFixed(2)}%
                </span>
              </div>`;
            break;

          case 'pctExpenseWithdraw':
            headerMetricHtml = `
              <div class="th-header-metric-badge th-header-stacked">
                <span class="th-header-type-badge">เฉลี่ย</span>
                <span class="th-header-gold-pct" title="ค่าเฉลี่ย % เบิก คชจ.: ${avgPctExpense.toFixed(2)}%">
                  ${avgPctExpense.toFixed(2)}%
                </span>
              </div>`;
            break;

          case 'statusSap': {
            const activeSapList = wbsState.tableSapStatuses ? Array.from(wbsState.tableSapStatuses) : [];
            let labelText = 'ทุกสถานะ';
            let btnClass = 'th-sap-dropdown-btn';
            const hasActiveFilter = activeSapList.length > 0;
            if (activeSapList.length === 1) {
              labelText = activeSapList[0];
              btnClass += ' active';
            } else if (activeSapList.length > 1) {
              labelText = `เลือก ${activeSapList.length} สถานะ`;
              btnClass += ' active';
            }

            headerMetricHtml = `
              <div class="th-header-metric-badge th-header-sap-dropdown" onclick="event.stopPropagation()">
                <button type="button" class="${btnClass}" id="btnWbsSapThDropdown" 
                  onclick="window.toggleWbsSapThDropdown(event)" 
                  title="คลิกเพื่อเลือกกรองสถานะ SAP เฉพาะในตารางนี้ (เลือกได้หลายสถานะพร้อมกัน)">
                  <span class="th-sap-btn-text">${escapeHtml(labelText)}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" class="th-sap-btn-arrow">
                    <polygon points="6 9 12 15 18 9" />
                  </svg>
                </button>
                <button type="button" class="btn-th-sap-eraser ${hasActiveFilter ? 'is-active' : ''}" id="btnWbsSapThEraser"
                  onclick="window.clearWbsTableSapFilter(event)"
                  title="ยางลบ ล้างตัวกรองสถานะ SAP ในตาราง (คืนค่าแสดงทุกสถานะ)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"></path>
                    <path d="M22 21H7"></path>
                    <path d="m5 11 9 9"></path>
                  </svg>
                </button>
              </div>`;
            break;
          }

          default:
            headerMetricHtml = '';
            break;
        }
      }

      thHtml += `
        <th style="${styleStr}" class="${sortClass} th-draggable" 
            data-col-id="${col.id}"
            draggable="true"
            ondragstart="window.handleThDragStart(event, '${col.id}')"
            ondragover="window.handleThDragOver(event, '${col.id}')"
            ondragleave="window.handleThDragLeave(event)"
            ondrop="window.handleThDrop(event, '${col.id}')"
            ondragend="window.handleThDragEnd(event)"
            title="ลากเพื่อย้ายตำแหน่งคอลัมน์ หรือคลิกเพื่อเรียงลำดับ (${escapeHtml(col.label)})">
          <div class="th-content-wrapper" style="${justifyStyle}">
            <div class="th-top-row" style="${rowJustify}">
              <div class="th-label-group" onclick="window.sortWbsTable('${col.sortKey}')">
                <span class="th-drag-handle" title="คลิกค้างแล้วลากเพื่อย้ายลำดับคอลัมน์">⠿</span>
                <span class="th-label-text">${escapeHtml(col.label)}</span>
                ${col.id === 'statusSap' ? `<input type="checkbox" id="wbsMasterHeaderCb" class="wbs-sap-row-cb" style="margin-left: 6px; width: 15px; height: 15px;" title="เลือก / ปลด ทั้งหมดในชุดข้อมูลที่กรองได้" onclick="event.stopPropagation()" onchange="window.toggleMasterHeaderCheckbox(this.checked)">` : ''}
                <span class="sort-indicator" style="font-size:0.75rem; margin-left:2px; color:var(--pea-gold-400);">${sortArrow}</span>
              </div>
            </div>
            ${headerMetricHtml}
          </div>
        </th>
      `;
    });
    thHtml += '</tr>';

    thead.innerHTML = thHtml;

    // Synchronize Master Header Checkbox state
    const masterCb = document.getElementById('wbsMasterHeaderCb');
    if (masterCb && currentData && currentData.length > 0) {
      const globalState = window.state || {};
      const globalFilters = globalState.filters || {};
      const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
      const excludedSap = getExcludedSapForCriteria(currentCrit);

      const checkable = currentData.filter(i => {
        const sap = i.statusSap || formatSapStatusShort(i.status);
        return !isWbsItemExcludedFromCheckbox(sap, currentCrit);
      });
      masterCb.checked = checkable.length > 0 && checkable.every(i => wbsState.selectedWbs.has(i.wbs));
    }
  }

  /**
   * Helper: Build Summary Row Cells (รวม / ค่าเฉลี่ย)
   * 1. รวม/เฉลี่ย ให้แสดงด้านบน ตัวเลข (ป้าย 'รวม' / 'เฉลี่ย' อยู่ด้านบนตัวเลขเด่นชัด)
   * 2. ค่าแถวบนสุด ให้แสดงตลอด ไม่ขึ้นกับปุ่มสไลด์ (Sticky ใต้ Header ใน thead)
   * 3. อักษรสีทอง เด่นชัด (Gold Theme)
   */
  function buildWbsSummaryRowCellsHtml(sortedData, activeCols, position = 'top') {
    const totalFiltered = sortedData.length;
    if (totalFiltered === 0) return '';

    // 1. Calculate Accumulated Total AUC Value (ผลรวมสะสมมูลค่า AUC)
    let totalCn41Cost = 0;

    // 2. Calculate Average % for Materials and Expenses (% เบิกพัสดุ, % เบิก คชจ.)
    let sumMat = 0, countMat = 0;
    let sumExpense = 0, countExpense = 0;

    // Summary counts for offices and engineers
    const officesSet = new Set();
    const engSet = new Set();

    sortedData.forEach(item => {
      // AUC Sum
      const cost = Number(item.cn41ActualCost);
      if (!isNaN(cost)) {
        totalCn41Cost += cost;
      }

      // % เบิกพัสดุ
      const rawMat = Number(item.pctMatWithdraw);
      if (!isNaN(rawMat) && item.pctMatWithdraw !== null && item.pctMatWithdraw !== undefined && item.pctMatWithdraw !== '') {
        const valMat = (Math.abs(rawMat) <= 1.0 && rawMat !== 0) ? rawMat * 100 : rawMat;
        sumMat += valMat;
        countMat++;
      }

      // % เบิก คชจ.
      const rawExp = Number(item.pctExpenseWithdraw);
      if (!isNaN(rawExp) && item.pctExpenseWithdraw !== null && item.pctExpenseWithdraw !== undefined && item.pctExpenseWithdraw !== '') {
        const valExp = (Math.abs(rawExp) <= 1.0 && rawExp !== 0) ? rawExp * 100 : rawExp;
        sumExpense += valExp;
        countExpense++;
      }

      if (item.office) officesSet.add(item.office);
      if (item.engineer) engSet.add(item.engineer);
    });

    const avgPctMat = countMat > 0 ? (sumMat / countMat) : 0;
    const avgPctExpense = countExpense > 0 ? (sumExpense / countExpense) : 0;

    const posIcon = position === 'top' ? '▲' : '▼';
    const posBadgeTitle = position === 'top' ? 'แถวสรุปผลรวมและค่าเฉลี่ย (แถวบนสุด)' : 'แถวสรุปผลรวมและค่าเฉลี่ย (แถวล่างสุด)';

    let cellsHtml = '';

    activeCols.forEach(col => {
      switch (col.id) {
        case 'id':
          cellsHtml += `
            <td style="text-align: center; vertical-align: middle;">
              <span class="wbs-summary-badge" title="${posBadgeTitle}">
                ${posIcon} รวม/เฉลี่ย
              </span>
            </td>`;
          break;

        case 'wbs':
          cellsHtml += `
            <td style="vertical-align: middle;">
              <div class="wbs-summary-gold-label" title="จำนวนงาน WBS ทั้งหมดที่กรองได้">
                รวม <strong>${totalFiltered.toLocaleString('th-TH')}</strong> งาน
              </div>
            </td>`;
          break;

        case 'office':
          cellsHtml += `
            <td style="vertical-align: middle;">
              <span class="wbs-summary-gold-sub" title="จำนวนหน่วยงานที่เกี่ยวข้อง">
                🏢 <strong>${officesSet.size.toLocaleString('th-TH')}</strong> กฟฟ.
              </span>
            </td>`;
          break;

        case 'engineer':
          cellsHtml += `
            <td style="vertical-align: middle;">
              <span class="wbs-summary-gold-sub" title="จำนวนช่างคุมงานที่เกี่ยวข้อง">
                👷 <strong>${engSet.size.toLocaleString('th-TH')}</strong> คน
              </span>
            </td>`;
          break;

        case 'description':
          cellsHtml += `
            <td style="vertical-align: middle;">
              <div class="wbs-summary-desc" title="สรุปภาพรวมทั้งหมด ${totalFiltered.toLocaleString('th-TH')} รายการ">
                รวมมูลค่า AUC และ % เบิกเฉลี่ย (${totalFiltered.toLocaleString('th-TH')} รายการ)
              </div>
            </td>`;
          break;

        case 'cn41ActualCost':
          // Requirement: ป้าย 'รวม' อยู่ด้านบน ตัวเลขสะสมมูลค่า AUC อยู่ด้านล่าง อักษรสีทองเด่นชัด
          cellsHtml += `
            <td style="text-align: right; vertical-align: middle;">
              <div class="wbs-summary-cell-stacked">
                <span class="wbs-summary-cell-type">รวม</span>
                <span class="wbs-summary-gold-val" title="ผลรวมสะสมมูลค่า AUC ทั้งหมด (${totalFiltered.toLocaleString('th-TH')} รายการ): ${formatMoney(totalCn41Cost)} บาท">
                  ${formatMoney(totalCn41Cost)}
                </span>
              </div>
            </td>`;
          break;

        case 'pctMatWithdraw':
          // Requirement: ป้าย 'เฉลี่ย' อยู่ด้านบน ตัวเลขค่าเฉลี่ย % เบิกพัสดุ อยู่ด้านล่าง อักษรสีทองเด่นชัด
          cellsHtml += `
            <td style="text-align: right; vertical-align: middle;">
              <div class="wbs-summary-cell-stacked">
                <span class="wbs-summary-cell-type">เฉลี่ย</span>
                <span class="wbs-summary-gold-pct" title="ค่าเฉลี่ย % เบิกพัสดุ ทั้งหมด (${totalFiltered.toLocaleString('th-TH')} รายการ): ${avgPctMat.toFixed(2)}%">
                  ${avgPctMat.toFixed(2)}%
                </span>
              </div>
            </td>`;
          break;

        case 'pctExpenseWithdraw':
          // Requirement: ป้าย 'เฉลี่ย' อยู่ด้านบน ตัวเลขค่าเฉลี่ย % เบิก คชจ. อยู่ด้านล่าง อักษรสีทองเด่นชัด
          cellsHtml += `
            <td style="text-align: right; vertical-align: middle;">
              <div class="wbs-summary-cell-stacked">
                <span class="wbs-summary-cell-type">เฉลี่ย</span>
                <span class="wbs-summary-gold-pct" title="ค่าเฉลี่ย % เบิก คชจ. ทั้งหมด (${totalFiltered.toLocaleString('th-TH')} รายการ): ${avgPctExpense.toFixed(2)}%">
                  ${avgPctExpense.toFixed(2)}%
                </span>
              </div>
            </td>`;
          break;

        default:
          if (col.isMoney) {
            let colSum = 0;
            sortedData.forEach(it => {
              const v = Number(it[col.id]);
              if (!isNaN(v)) colSum += v;
            });
            cellsHtml += `
              <td style="text-align: right; vertical-align: middle;">
                <div class="wbs-summary-cell-stacked">
                  <span class="wbs-summary-cell-type">รวม</span>
                  <span class="wbs-summary-gold-val" style="font-size: 0.88rem;" title="ผลรวมสะสม ${escapeHtml(col.label)}: ${formatMoney(colSum)} บาท">
                    ${formatMoney(colSum)}
                  </span>
                </div>
              </td>`;
          } else if (col.isPercent) {
            let pSum = 0, pCount = 0;
            sortedData.forEach(it => {
              const raw = Number(it[col.id]);
              if (!isNaN(raw) && it[col.id] !== null && it[col.id] !== undefined && it[col.id] !== '') {
                const val = (Math.abs(raw) <= 1.0 && raw !== 0) ? raw * 100 : raw;
                pSum += val;
                pCount++;
              }
            });
            const pAvg = pCount > 0 ? (pSum / pCount) : 0;
            cellsHtml += `
              <td style="text-align: right; vertical-align: middle;">
                <div class="wbs-summary-cell-stacked">
                  <span class="wbs-summary-cell-type">เฉลี่ย</span>
                  <span class="wbs-summary-gold-pct" style="font-size: 0.88rem;" title="ค่าเฉลี่ย ${escapeHtml(col.label)}: ${pAvg.toFixed(2)}%">
                    ${pAvg.toFixed(2)}%
                  </span>
                </div>
              </td>`;
          } else {
            cellsHtml += `<td style="text-align: center; vertical-align: middle; color: var(--pea-gold-400); opacity: 0.5; font-size: 0.85rem;">-</td>`;
          }
          break;
      }
    });

    return cellsHtml;
  }

  /**
   * Render Master WBS Table (incorporating merged File 03, File 04, and File 05 columns)
   */
  function renderWbsTable(sortedData, totalFiltered) {
    const tbody = document.getElementById('wbsTableBody');
    const rangeEl = document.getElementById('wbsPageRange');
    const filteredCountEl = document.getElementById('wbsFilteredCount');

    if (filteredCountEl) filteredCountEl.textContent = totalFiltered.toLocaleString('th-TH');

    const orderedDefs = getOrderedColDefs();
    const activeCols = orderedDefs.filter(c => wbsState.visibleColumns[c.id]);
    const activeColsCount = activeCols.length || 1;

    if (!totalFiltered) {
      if (tbody) {
        tbody.innerHTML = `
          <tr>
            <td colspan="${activeColsCount}" style="text-align:center; padding: 3rem 1rem; color: var(--text-dim);">
              <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
              <div style="font-size: 1rem; font-weight: 600; color: var(--text-main);">ไม่พบข้อมูลงาน WBS ที่ตรงกับเงื่อนไขตัวกรอง</div>
              <div style="font-size: 0.825rem; margin-top: 0.25rem;">ลองปรับเปลี่ยนตัวกรอง หรือกดปุ่ม "รีเซ็ตตัวกรอง" เพื่อแสดงข้อมูลทั้งหมด</div>
            </td>
          </tr>
        `;
      }
      const topSummaryEl = document.getElementById('wbsTopSummaryRow');
      if (topSummaryEl) topSummaryEl.remove();
      const tfoot = document.getElementById('wbsTableFoot');
      if (tfoot) {
        tfoot.innerHTML = '';
        tfoot.style.display = 'none';
      }
      if (rangeEl) rangeEl.textContent = '0 - 0';
      renderPaginationControls(0, 0);
      return;
    }

    // Pagination slice
    const pageSize = Number(wbsState.pageSize) || 25;
    const totalPages = Math.ceil(totalFiltered / pageSize);
    if (wbsState.page > totalPages) wbsState.page = totalPages || 1;
    if (wbsState.page < 1) wbsState.page = 1;

    const startIdx = (wbsState.page - 1) * pageSize;
    const endIdx = Math.min(startIdx + pageSize, totalFiltered);
    const pageItems = sortedData.slice(startIdx, endIdx);

    if (rangeEl) {
      rangeEl.textContent = `${(startIdx + 1).toLocaleString('th-TH')} - ${endIdx.toLocaleString('th-TH')}`;
    }

    // ลบแถวสรุปบนสุดออก (เอาออก 2 แถว ตามที่ผู้ใช้สั่ง โดยย้ายตัวเลขไปรวมกับเมนูหัวตารางด้านบนแล้ว)
    const existingTopSummary = document.getElementById('wbsTopSummaryRow');
    if (existingTopSummary) {
      existingTopSummary.remove();
    }

    // 2. Render Data Rows in tbody (เฉพาะรายการข้อมูลงาน ไม่มีแถวสรุปปะปนใน tbody)
    if (tbody) {
      const globalState = window.state || {};
      const globalFilters = globalState.filters || {};
      const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
      const excludedSap = getExcludedSapForCriteria(currentCrit);

      let rowsHtml = '';
      pageItems.forEach((item, index) => {
        const rowNo = startIdx + index + 1;
        const wbsCode = escapeHtml(item.wbs);
        const safeWbsAttr = wbsCode.replace(/'/g, "\\'");

        // Budget badge style
        let budgetClass = 'pill-c';
        const b = (item.budget || '').toUpperCase();
        if (b.includes('C02')) budgetClass = 'pill-c02';
        else if (b.includes('I')) budgetClass = 'pill-i';
        else if (b.includes('P')) budgetClass = 'pill-p';

        // Avatar initial
        const engName = item.engineer || '-';
        const engInitial = engName.replace(/^(นาย|นางสาว|นาง|ว่าที่\s*ร\.ต\.|ดร\.)\s*/, '').charAt(0) || 'ช';

        let rowHtml = '<tr>';
        activeCols.forEach(col => {
          switch (col.id) {
            case 'id':
              rowHtml += `<td style="text-align: center; color: var(--text-dim); font-size: 0.85rem;">${rowNo}</td>`;
              break;
            case 'wbs':
              rowHtml += `<td><span class="wbs-code-val" onclick="window.copyWbsCode('${safeWbsAttr}')" title="กดเพื่อคัดลอกรหัส WBS" style="cursor:pointer;">${wbsCode}</span></td>`;
              break;
            case 'criteria':
              rowHtml += `<td><span class="badge-criteria-pill" title="${escapeHtml(item.criteria)}">${escapeHtml(item.criteria)}</span></td>`;
              break;
            case 'province':
              rowHtml += `<td><span class="badge-province-pill">${escapeHtml(item.province)}</span></td>`;
              break;
            case 'office':
              rowHtml += `<td><span class="badge-office-pill">🏢 <span>${escapeHtml(item.office)}</span></span></td>`;
              break;
            case 'budget':
              rowHtml += `<td style="text-align: center;"><span class="budget-pill ${budgetClass}">${escapeHtml(item.budget)}</span></td>`;
              break;
            case 'engineer':
              rowHtml += `<td><div class="wbs-engineer-text" title="${escapeHtml(item.engineer)}"><span>${escapeHtml(item.engineer || '-')}</span></div></td>`;
              break;
            case 'department':
              rowHtml += `<td><span style="font-size: 0.825rem; color: var(--text-muted);">${escapeHtml(item.department || '-')}</span></td>`;
              break;
            case 'type':
              rowHtml += `<td style="text-align: center;"><span style="font-size: 0.8rem; color: var(--pea-purple-300);">${escapeHtml(item.type || '-')}</span></td>`;
              break;
            case 'description':
              rowHtml += `<td><div style="font-size: 0.85rem; color: var(--text-main); font-weight: 500; min-width: 220px; line-height: 1.35;" title="${escapeHtml(item.description)}">${escapeHtml(item.description || '-')}</div></td>`;
              break;
            case 'statusSap': {
              const sapVal = item.statusSap || formatSapStatusShort(item.status);
              const badgeClass = getSapBadgeClass(sapVal);
              const isExcluded = isWbsItemExcludedFromCheckbox(sapVal, currentCrit);
              const isChecked = !isExcluded && wbsState.selectedWbs && wbsState.selectedWbs.has(item.wbs);
              rowHtml += `<td style="text-align: center;">
                <div class="wbs-sap-cell-wrap">
                  <span class="badge-sap-short ${badgeClass}" title="สถานะ SAP เต็ม: ${escapeHtml(item.status || sapVal)}${isExcluded ? ` (ยกเว้นสถานะ ${escapeHtml(sapVal)} - ไม่แสดง Checkbox)` : ''}">${escapeHtml(sapVal || '-')}</span>
                  ${!isExcluded ? `
                    <input type="checkbox" class="wbs-sap-row-cb" data-wbs="${escapeHtml(item.wbs)}" ${isChecked ? 'checked' : ''} onchange="window.toggleWbsRowCheckbox('${escapeHtml(item.wbs)}', this.checked)" title="${isChecked ? 'คลิกเพื่อยกเลิกการเลือกงานนี้' : 'คลิกเพื่อเลือกงานนี้'}">
                  ` : ''}
                </div>
              </td>`;
              break;
            }
            case 'status': {
              const fullStatus = item.status || '';
              const badgeClass = getSapBadgeClass(fullStatus);
              rowHtml += `<td><span class="badge-sap-status ${badgeClass}" title="${escapeHtml(fullStatus)}">${escapeHtml(fullStatus || '-')}</span></td>`;
              break;
            }
            case 'level':
              rowHtml += `<td style="text-align: center; font-size: 0.825rem; color: var(--text-dim);">${item.level !== undefined && item.level !== null && item.level !== '' ? item.level : '-'}</td>`;
              break;
            case 'budgetCurrent':
              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: 600; color: #FDE047;">${formatMoney(item.budgetCurrent)}</td>`;
              break;
            case 'budgetRemain': {
              const remVal = Number(item.budgetRemain);
              const color = remVal > 0 ? '#10B981' : (remVal < 0 ? '#F43F5E' : 'var(--text-muted)');
              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: 600; color: ${color};">${formatMoney(item.budgetRemain)}</td>`;
              break;
            }
            case 'actTotalCtrl':
              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: 600; color: #FF79B8;">${formatMoney(item.actTotalCtrl)}</td>`;
              break;
            case 'actMatNoCheck': {
              const nVal = Number(item.actMatNoCheck);
              const color = nVal < 0 ? '#F43F5E' : 'var(--text-muted)';
              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; color: ${color};">${formatMoney(item.actMatNoCheck)}</td>`;
              break;
            }
            case 'pctMatWithdraw': {
              const raw = Number(item.pctMatWithdraw);
              const val = isNaN(raw) ? 0 : (Math.abs(raw) <= 1.0 && raw !== 0 ? raw * 100 : raw);
              let color = '#EF4444';
              let bg = 'rgba(239, 68, 68, 0.14)';
              let border = 'rgba(239, 68, 68, 0.35)';

              if (val < 0) {
                // ขาว ติดลบ
                color = '#FFFFFF';
                bg = 'rgba(255, 255, 255, 0.14)';
                border = 'rgba(255, 255, 255, 0.35)';
              } else if (val >= 80) {
                // เขียว >= 80%
                color = '#10B981';
                bg = 'rgba(16, 185, 129, 0.14)';
                border = 'rgba(16, 185, 129, 0.35)';
              } else {
                // แดง < 80%
                color = '#EF4444';
                bg = 'rgba(239, 68, 68, 0.14)';
                border = 'rgba(239, 68, 68, 0.35)';
              }

              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 600; color: ${color}; background: ${bg}; border: 1px solid ${border}; min-width: 65px; text-align: right;" title="% เบิกพัสดุ: ${val.toFixed(2)}%">
                  ${val.toFixed(2)}%
                </span>
              </td>`;
              break;
            }
            case 'pctExpenseWithdraw': {
              const raw = Number(item.pctExpenseWithdraw);
              const val = isNaN(raw) ? 0 : (Math.abs(raw) <= 1.0 && raw !== 0 ? raw * 100 : raw);
              let color = '#EF4444';
              let bg = 'rgba(239, 68, 68, 0.14)';
              let border = 'rgba(239, 68, 68, 0.35)';

              if (val < 0) {
                // ขาว ติดลบ
                color = '#FFFFFF';
                bg = 'rgba(255, 255, 255, 0.14)';
                border = 'rgba(255, 255, 255, 0.35)';
              } else if (val >= 50) {
                // เขียว >= 50%
                color = '#10B981';
                bg = 'rgba(16, 185, 129, 0.14)';
                border = 'rgba(16, 185, 129, 0.35)';
              } else {
                // แดง < 50%
                color = '#EF4444';
                bg = 'rgba(239, 68, 68, 0.14)';
                border = 'rgba(239, 68, 68, 0.35)';
              }

              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 6px; font-weight: 600; color: ${color}; background: ${bg}; border: 1px solid ${border}; min-width: 65px; text-align: right;" title="% เบิก คชจ.: ${val.toFixed(2)}%">
                  ${val.toFixed(2)}%
                </span>
              </td>`;
              break;
            }
            // File 05 Columns
            case 'cn41ActualCost':
              rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; font-weight: 700; color: #38BDF8;">${formatMoney(item.cn41ActualCost)}</td>`;
              break;
            case 'cn41ObjDesc':
              rowHtml += `<td><div style="font-size: 0.85rem; color: var(--text-main); font-weight: 500; min-width: 220px; line-height: 1.35;" title="${escapeHtml(item.cn41ObjDesc)}">${escapeHtml(item.cn41ObjDesc || '-')}</div></td>`;
              break;
            case 'cn41Level':
              rowHtml += `<td style="text-align: center; font-size: 0.825rem; color: var(--text-dim);">${escapeHtml(item.cn41Level || '-')}</td>`;
              break;
            case 'cn41Currency':
              rowHtml += `<td style="text-align: center; font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">${escapeHtml(item.cn41Currency || '-')}</td>`;
              break;
            case 'cn41Row':
              rowHtml += `<td style="text-align: center; font-size: 0.825rem; color: var(--text-dim);">${escapeHtml(item.cn41Row || '-')}</td>`;
              break;
            // File 06 Columns (Google Sheet แผนงานแล้วเสร็จ)
            case 'planClose': {
              const pVal = item.planClose ? item.planClose.trim() : '';
              if (!pVal) {
                rowHtml += `<td style="text-align: center;"><span style="color: var(--text-dim); font-size: 0.8rem;">-</span></td>`;
              } else {
                rowHtml += `<td style="text-align: center;"><span class="badge-plan-close" title="${escapeHtml(pVal)}">📅 ${escapeHtml(pVal)}</span></td>`;
              }
              break;
            }
            case 'note': {
              const nVal = item.note ? item.note.trim() : '';
              rowHtml += `<td><div class="wbs-note-cell" title="${escapeHtml(nVal)}">${escapeHtml(nVal || '-')}</div></td>`;
              break;
            }
            default:
              if (col.isMoney) {
                rowHtml += `<td style="text-align: right; font-family: var(--font-mono, monospace); font-size: 0.85rem; color: var(--text-muted);">${formatMoney(item[col.id])}</td>`;
              } else {
                rowHtml += `<td style="text-align: ${col.align || 'left'}; font-size: 0.85rem;">${escapeHtml(item[col.id] || '-')}</td>`;
              }
              break;
          }
        });
        rowHtml += '</tr>';
        rowsHtml += rowHtml;
      });
      tbody.innerHTML = rowsHtml;
    }

    // 3. ลบแถวสรุปล่างสุดออก (เอาออก 2 แถว ตามที่ผู้ใช้สั่ง)
    const tfoot = document.getElementById('wbsTableFoot');
    if (tfoot) {
      tfoot.innerHTML = '';
      tfoot.style.display = 'none';
    }

    renderPaginationControls(totalPages, wbsState.page);

    // Refresh left scrollbar position
    setTimeout(() => {
      if (window.updateWbsLeftScrollbar) window.updateWbsLeftScrollbar();
    }, 40);
  }

  /**
   * Render Pagination Buttons
   */
  function renderPaginationControls(totalPages, currentPage) {
    const controls = document.getElementById('wbsPaginationControls');
    const infoText = document.getElementById('wbsPaginationInfoText');

    if (infoText) {
      infoText.textContent = totalPages > 0 ? `หน้า ${currentPage} จากทั้งหมด ${totalPages} หน้า` : 'ไม่มีหน้า';
    }

    if (!controls) return;
    if (totalPages <= 1) {
      controls.innerHTML = '';
      return;
    }

    let html = '';

    // Previous Button
    html += `<button type="button" class="wbs-page-btn" onclick="window.changeWbsPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>&laquo; ก่อนหน้า</button>`;

    // Page number window
    const maxBtns = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxBtns / 2));
    let endPage = Math.min(totalPages, startPage + maxBtns - 1);
    if (endPage - startPage + 1 < maxBtns) {
      startPage = Math.max(1, endPage - maxBtns + 1);
    }

    if (startPage > 1) {
      html += `<button type="button" class="wbs-page-btn" onclick="window.changeWbsPage(1)">1</button>`;
      if (startPage > 2) html += `<span style="color:var(--text-dim); padding:0 3px;">...</span>`;
    }

    for (let p = startPage; p <= endPage; p++) {
      html += `<button type="button" class="wbs-page-btn ${p === currentPage ? 'active' : ''}" onclick="window.changeWbsPage(${p})">${p}</button>`;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) html += `<span style="color:var(--text-dim); padding:0 3px;">...</span>`;
      html += `<button type="button" class="wbs-page-btn" onclick="window.changeWbsPage(${totalPages})">${totalPages}</button>`;
    }

    // Next Button
    html += `<button type="button" class="wbs-page-btn" onclick="window.changeWbsPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>ถัดไป &raquo;</button>`;

    controls.innerHTML = html;
  }

  /**
   * Render WBS Visual Analytics Charts
   */
  function renderWbsCharts(filtered) {
    renderTopOfficesChart(filtered || []);
  }

  /**
   * Helper: Classify item status into SAP Category (CLSD, TECO, REL)
   */
  function getItemSapCategory(item) {
    const sap = String(item.statusSap || item.status || '').toUpperCase().trim();
    if (sap.startsWith('CLSD') || sap.includes('CLSD')) return 'CLSD';
    if (sap.startsWith('TECO') || sap.includes('TECO')) return 'TECO';
    if (sap.startsWith('REL') || sap.includes('REL')) return 'REL';
    return 'REL';
  }

    let cachedWbsStripePattern = null;
  function getWbsStripePattern(ctx) {
    if (!cachedWbsStripePattern) {
      const patCanvas = document.createElement('canvas');
      patCanvas.width = 10;
      patCanvas.height = 10;
      const pctx = patCanvas.getContext('2d');
      pctx.strokeStyle = 'rgba(255, 255, 255, 0.44)';
      pctx.lineWidth = 2.0;
      pctx.beginPath();
      pctx.moveTo(0, 10);
      pctx.lineTo(10, 0);
      pctx.moveTo(-5, 5);
      pctx.lineTo(5, -5);
      pctx.moveTo(5, 15);
      pctx.lineTo(15, 5);
      pctx.stroke();
      cachedWbsStripePattern = ctx.createPattern(patCanvas, 'repeat');
    }
    return cachedWbsStripePattern;
  }

  /**
   * Helper: Draw rounded rectangle segment on canvas (เนเธเน Path2D เนเธฅเธฐ Stripe Pattern เนเธซเนเธฅเธฒเธขเธญเธขเธนเนเนเธเนเธ—เนเธ 100% เนเธกเนเธฅเนเธเน€เธเธดเธเธญเธญเธเธเธญเธเธเธฃเธฒเธ)
   */
  function drawCanvasBarSegment(ctx, x, y, w, h, fillStyle, strokeStyle, roundTop, roundBottom, hasPattern = false, strokeWidth = 1) {
    if (w <= 0 || h <= 0) return;
    const r = Math.min(4, w / 2, h / 2);
    const rT = roundTop ? r : 0;
    const rB = roundBottom ? r : 0;

    const p = new Path2D();
    if (p.roundRect) {
      p.roundRect(x, y, w, h, [rT, rT, rB, rB]);
    } else {
      p.moveTo(x + rT, y);
      p.lineTo(x + w - rT, y);
      if (rT > 0) p.quadraticCurveTo(x + w, y, x + w, y + rT);
      else p.lineTo(x + w, y);

      p.lineTo(x + w, y + h - rB);
      if (rB > 0) p.quadraticCurveTo(x + w, y + h, x + w - rB, y + h);
      else p.lineTo(x + w, y + h);

      p.lineTo(x + rB, y + h);
      if (rB > 0) p.quadraticCurveTo(x, y + h, x, y + h - rB);
      else p.lineTo(x, y + h);

      p.lineTo(x + rT);
      if (rT > 0) p.quadraticCurveTo(x, y, x + rT, y);
      else p.lineTo(x, y);
      p.closePath();
    }

    // 1. เธฃเธฐเธเธฒเธขเธชเธตเธเธทเนเธเธซเธฅเธฑเธ (Base Gradient)
    ctx.fillStyle = fillStyle;
    ctx.fill(p);

    // 2. เธฃเธฐเธเธฒเธขเธฅเธฒเธขเธ—เธฒเธเน€เธเธตเธขเธ 45 เธญเธเธจเธฒเธฅเธเธเธ Path เธเธญเธเนเธ—เนเธเนเธ”เธขเธ•เธฃเธ (เธฃเธฑเธเธเธฃเธฐเธเธฑเธเธฅเธฒเธขเธญเธขเธนเนเนเธเนเธ—เนเธ 100% เนเธกเนเธฅเนเธเน€เธเธดเธเธญเธญเธเธเธญเธเธเธฃเธฒเธ)
    if (hasPattern) {
      const pat = getWbsStripePattern(ctx);
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fill(p);
      }
    }

    // 3. เธงเธฒเธ”เน€เธชเนเธเธเธญเธเธกเธเธฃเธญเธเนเธ—เนเธ
    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = strokeWidth || 1;
      ctx.stroke(p);
    }
  }

  // Active chart cached state for hover & resize
  let activeWbsTopOffices = [];
  let wbsChartHoverIdx = -1;
  let wbsChartEventsBound = false;

  /**
   * Set Chart Mode for WBS Offices ('stacked' or 'grouped')
   */
  window.setWbsChartMode = function (mode) {
    wbsState.chartMode = mode || 'stacked';
    const btnStacked = document.getElementById('btnChartModeStacked');
    const btnGrouped = document.getElementById('btnChartModeGrouped');
    if (btnStacked) btnStacked.classList.toggle('active', wbsState.chartMode === 'stacked');
    if (btnGrouped) btnGrouped.classList.toggle('active', wbsState.chartMode === 'grouped');
    const hasSapFilter = (wbsState.selectedSapStatuses && wbsState.selectedSapStatuses.size > 0) || (wbsState.sapStatus && wbsState.sapStatus !== 'ALL');
    const chartFiltered = hasSapFilter ? getFilteredWbsData(true, false) : getFilteredWbsData(true, true);
    renderTopOfficesChart(chartFiltered);
  };

  /**
   * Set Chart Scope for WBS Offices ('all' or 'top10')
   */
  window.setWbsChartScope = function (scope) {
    wbsState.chartScope = scope || 'all';
    const btnAll = document.getElementById('btnChartScopeAll');
    const btnTop10 = document.getElementById('btnChartScopeTop10');
    if (btnAll) btnAll.classList.toggle('active', wbsState.chartScope === 'all');
    if (btnTop10) btnTop10.classList.toggle('active', wbsState.chartScope === 'top10');
    const hasSapFilter = (wbsState.selectedSapStatuses && wbsState.selectedSapStatuses.size > 0) || (wbsState.sapStatus && wbsState.sapStatus !== 'ALL');
    const chartFiltered = hasSapFilter ? getFilteredWbsData(true, false) : getFilteredWbsData(true, true);
    renderTopOfficesChart(chartFiltered);
  };

  /**
   * Helper: Determine exact visual styling, gradient, and glow for SAP Statuses in Bar Chart
   * 1. CLSD: สีเขียว ไล่ระดับสี โดย CLSD F4 เขียวเรืองแสง (เกณฑ์วัด 1, 2, 3, 5 และข้อ 4 หรือตามเป้าหมาย)
   *    และไล่ระดับความเข้มสีตามลำดับอักษรและตัวเลข (F -> E -> D ...)
   * 2. TECO: สีเหลืองเข้ม ตามลำดับอักษร F และตัวเลข ไปจนถึงอ่อน B
   * 3. REL: สีแดง ไล่ระดับตามอักษร และตัวเลข (F, D เข้มจัด/เข้ม -> C กลาง/สด -> B อ่อน)
   */
  function getSapSegmentStyle(sap, currentCrit) {
    const s = String(sap || '').toUpperCase().trim();
    const m = s.match(/^([A-Z]{3,4})\s*([A-Z])?(\d+)?/);
    const cat = m ? m[1] : (s.startsWith('CLSD') ? 'CLSD' : (s.startsWith('TECO') ? 'TECO' : 'REL'));
    const letter = m && m[2] ? m[2] : (s.match(/([A-Z])\s*0*\d*\s*$/) || [])[1] || '';
    const numMatch = s.match(/(\d+)\s*$/);
    const num = numMatch ? parseInt(numMatch[1], 10) : 0;

    const cStr = String(currentCrit || '').trim();
    const isCrit4 = (cStr.includes('ข้อ 4') || cStr.includes('ข้อ4') || cStr.includes('C02.2'));

    // 1. CLSD Group (สีเขียว: CLSD F4/F2 เป็นสีเขียวมีลายทางเฉียง คมชัด สวยงาม ไม่เรืองแสงแปลกตา)
    if (cat === 'CLSD') {
      const isTargetF4 = (s === 'CLSD F4' || s.includes('F4'));
      const isTargetF2 = isCrit4 && (s === 'CLSD F2' || s.includes('F2'));
      if (isTargetF4 || isTargetF2) {
        return {
          bgTop: '#CBFCE6',       // เขียวมิ้นท์พาสเทลสว่าง (ตามรูป 4)
          bgMiddle: '#48D0A2',    // เขียวมิ้นท์สดใส (ตามรูป 4)
          bgBottom: '#10B981',    // เขียวมรกต (ตามรูป 4)
          stroke: '#A1FCDB',      // เส้นขอบสีมิ้นท์สว่างมนสวย (ตามรูป 4)
          strokeWidth: 1.5,
          textColor: '#022C22',  // สีเข้มคมชัด ตัดกับพื้นมิ้นท์ลายเฉียง ชัดเจน 100%
          glow: false,
          hasPattern: true,       // สีเขียวมีลายทางเฉียงตามรูป 4
          label: s,
          cat: 'CLSD'
        };
      }
      if (letter >= 'F') {
        return {
          bgTop: '#059669',       // เขียวหยกสดใส
          bgBottom: '#047857',
          stroke: 'rgba(5, 150, 105, 0.8)',
          textColor: '#FFFFFF',
          glow: false,
          hasPattern: false,
          label: s,
          cat: 'CLSD'
        };
      }
      if (letter === 'E') {
        return {
          bgTop: '#047857',       // เขียวหยกเข้ม
          bgBottom: '#064E3B',
          stroke: 'rgba(4, 120, 87, 0.8)',
          textColor: '#FFFFFF',
          glow: false,
          hasPattern: false,
          label: s,
          cat: 'CLSD'
        };
      }
      return {
        bgTop: '#047857',         // เขียวเข้มจัด
        bgBottom: '#064E3B',
        stroke: 'rgba(4, 120, 87, 0.8)',
        textColor: '#FFFFFF',
        glow: false,
        hasPattern: false,
        label: s,
        cat: 'CLSD'
      };
    }

    // 2. TECO Group (สีเหลืองเข้ม F ไปจนถึงอ่อน B)
    if (cat === 'TECO') {
      if (letter >= 'F') {
        // F4, F2, F0: สีเหลืองเข้มจัด / อำพันทองเข้ม (Dark Golden Amber)
        return {
          bgTop: '#D97706',
          bgBottom: '#B45309',
          stroke: 'rgba(180, 83, 9, 0.85)',
          textColor: '#FFFFFF',
          glow: false,
          label: s,
          cat: 'TECO'
        };
      }
      if (letter === 'E') {
        return {
          bgTop: '#EAB308',
          bgBottom: '#D97706',
          stroke: 'rgba(217, 119, 6, 0.85)',
          textColor: '#FFFFFF',
          glow: false,
          label: s,
          cat: 'TECO'
        };
      }
      if (letter === 'D') {
        // D9, D3, D2: สีเหลืองทองอุ่น (Medium Golden Amber) - TECO D2 มีลายเส้นเหมือน CLSD F4 แต่สีคงเดิม
        const isD2 = (num === 2 || s.includes('D2'));
        const topCol = num >= 5 ? '#F59E0B' : '#FBBF24';
        const botCol = num >= 5 ? '#D97706' : '#F59E0B';
        return {
          bgTop: topCol,
          bgBottom: botCol,
          stroke: isD2 ? '#FDE047' : 'rgba(245, 158, 11, 0.85)',
          strokeWidth: isD2 ? 1.5 : 1,
          textColor: '#451A03',   // สีน้ำตาลเข้ม คอนทราสต์สูงบนเหลือง
          glow: false,
          hasPattern: isD2,       // เพิ่มลายเส้นเฉียงเหมือน CLSD F4 แต่สีเหลืองทองคงเดิม
          label: s,
          cat: 'TECO'
        };
      }
      if (letter === 'C') {
        return {
          bgTop: '#FDE047',
          bgBottom: '#FACC15',
          stroke: 'rgba(234, 179, 8, 0.85)',
          textColor: '#713F12',
          glow: false,
          label: s,
          cat: 'TECO'
        };
      }
      // B หรือต่ำกว่า: สีเหลืองอ่อน (Pale Soft Yellow)
      return {
        bgTop: '#FEF08A',
        bgBottom: '#FDE047',
        stroke: 'rgba(250, 204, 21, 0.85)',
        textColor: '#713F12',
        glow: false,
        label: s,
        cat: 'TECO'
      };
    }

    // 3. REL Group (สีแดง ไล่ระดับตามอักษร และตัวเลข)
    // F (เข้มจัด) -> D (เข้ม) -> C (กลาง/สด) -> B (อ่อน)
    if (letter >= 'F') {
      return {
        bgTop: '#991B1B',         // แดงเข้มจัด / แดงทับทิม
        bgBottom: '#7F1D1D',
        stroke: 'rgba(153, 27, 27, 0.85)',
        textColor: '#FFFFFF',
        glow: false,
        label: s,
        cat: 'REL'
      };
    }
    if (letter === 'D') {
      // D2, D1: แดงเข้ม
      const topCol = num >= 2 ? '#B91C1C' : '#DC2626';
      const botCol = num >= 2 ? '#991B1B' : '#B91C1C';
      return {
        bgTop: topCol,
        bgBottom: botCol,
        stroke: 'rgba(220, 38, 38, 0.85)',
        textColor: '#FFFFFF',
        glow: false,
        label: s,
        cat: 'REL'
      };
    }
    if (letter === 'C') {
      // C9, C6, C5, C4: แดงปานกลาง
      // C3, C2, C1: แดงสดสว่าง (Coral Red) - REL C3 มีลายเส้นเหมือน CLSD F4 แต่สีคงเดิม
      if (num >= 4) {
        return {
          bgTop: '#EF4444',
          bgBottom: '#DC2626',
          stroke: 'rgba(239, 68, 68, 0.85)',
          textColor: '#FFFFFF',
          glow: false,
          label: s,
          cat: 'REL'
        };
      } else {
        const isC3 = (num === 3 || s.includes('C3'));
        return {
          bgTop: '#F87171',
          bgBottom: '#EF4444',
          stroke: isC3 ? '#FCA5A5' : 'rgba(248, 113, 113, 0.85)',
          strokeWidth: isC3 ? 1.5 : 1,
          textColor: '#FFFFFF',
          glow: false,
          hasPattern: isC3,       // เพิ่มลายเส้นเฉียงเหมือน CLSD F4 แต่สีแดงคอรัลคงเดิม
          label: s,
          cat: 'REL'
        };
      }
    }
    // B หรือต่ำกว่า: แดงอ่อน / แดงพาสเทล (Soft Rose Coral)
    return {
      bgTop: '#FCA5A5',
      bgBottom: '#F87171',
      stroke: 'rgba(252, 165, 165, 0.85)',
      textColor: '#7F1D1D',       // สีแดงเข้ม คอนทราสต์สูงมากบนพื้นแดงอ่อน
      glow: false,
      label: s,
      cat: 'REL'
    };
  }

  /**
   * Helper: Rank for stacking order from bottom to top:
   * Bottom: REL (B -> C -> D -> F)
   * Middle: TECO (B -> C -> D -> F)
   * Top: CLSD (E -> F2 -> F4)
   */
  function getSapSegmentOrderRank(sap) {
    const s = String(sap || '').toUpperCase().trim();
    const cat = s.startsWith('CLSD') ? 2 : (s.startsWith('TECO') ? 1 : 0);
    const m = s.match(/\b([A-Z])\s*0*(\d+)\s*$/);
    const letterCode = m ? m[1].charCodeAt(0) : 65; // A=65
    const num = m ? parseInt(m[2], 10) : 0;
    return cat * 10000 + letterCode * 100 + num;
  }

  /**
   * Helper: ดึงรหัสสถานะ SAP เฉพาะประโยคท้าย (เช่น F4, F2, C1, D1, D2, D3, B1 ฯลฯ)
   * ตามคำสั่งผู้ใช้งาน สำหรับแสดงในเซกเมนต์ของกราฟแท่ง
   */
  function getSapSuffix(sap) {
    if (!sap || typeof sap !== 'string') return '';
    const s = sap.trim();
    if (!s) return '';
    // 1. ตรวจหารหัสลงท้ายมาตรฐานตัวอักษร 1 ตัว + ตัวเลข (เช่น C1, F4, F2, D1, D2, E2, B1)
    const m = s.match(/(?:^|\s|\/)+([A-Za-z]\d+)\b/);
    if (m) return m[1].toUpperCase();
    // 2. ตรวจหาตัวอักษร 2 ตัวท้ายที่ไม่ใช่ชื่อกลุ่มหลัก (เช่น F4, C1)
    const mEnd = s.match(/([A-Za-z0-9]{2})\s*$/);
    if (mEnd && !['EL', 'CO', 'SD'].includes(mEnd[1].toUpperCase())) {
      return mEnd[1].toUpperCase();
    }
    // 3. หากมีหลายคำให้เลือกคำสุดท้าย
    const parts = s.split(/\s+/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1].toUpperCase();
      if (!['EL', 'CO', 'SD'].includes(last)) return last;
    }
    return s.toUpperCase();
  }

  /**
   * Helper: จัดสรรความสูงของแต่ละเซกเมนต์สถานะ SAP ในแท่งด้วยอัลกอริทึม Water-filling
   * ให้สัดส่วนความสูงแท่งตรงตามจำนวนงานจริงอย่างแม่นยำ (ดูสัดส่วนให้เห็นชัด)
   * และมีพื้นที่ขั้นต่ำ (minSegH) เพียงพอสำหรับแสดงรหัสสถานะ SAP ประโยคท้ายและตัวเลขจำนวนงาน
   */
  function allocateSegmentHeights(segments, totalBarH, minSegH = 13.5) {
    const k = segments.length;
    if (k === 0) return;
    if (k === 1) {
      segments[0].h = totalBarH;
      return;
    }
    const effMinH = Math.min(minSegH, (totalBarH * 0.94) / k);
    const totalCount = segments.reduce((acc, s) => acc + s.count, 0) || 1;

    let remainingH = totalBarH;
    let remainingCount = totalCount;
    const isClamped = new Array(k).fill(false);

    let changed = true;
    while (changed) {
      changed = false;
      for (let i = 0; i < k; i++) {
        if (!isClamped[i]) {
          const rawH = (segments[i].count / remainingCount) * remainingH;
          if (rawH < effMinH) {
            segments[i].h = effMinH;
            remainingH -= effMinH;
            remainingCount -= segments[i].count;
            isClamped[i] = true;
            changed = true;
          }
        }
      }
    }

    for (let i = 0; i < k; i++) {
      if (!isClamped[i]) {
        segments[i].h = Math.max((segments[i].count / remainingCount) * remainingH, effMinH);
      }
    }
  }

  /**
   * Chart: Offices with Remaining WBS Bar Chart (CLSD Green, TECO Yellow, REL Red, Height ~296px)
   */
  function renderTopOfficesChart(filtered) {
    const canvas = document.getElementById('wbsOfficesBarChart');
    if (!canvas) return;

    // Get current criteria for glow rule: ข้อ 1,2,3,5 -> CLSD F4 glow, ข้อ 4 -> CLSD F2/F4 glow
    const globalState = window.state || {};
    const globalFilters = globalState.filters || {};
    const currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');

    // Aggregate by Office with detailed SAP statuses breakdown & AUC cost
    const officeMap = {};
    (filtered || []).forEach(item => {
      const off = (item.office || 'ไม่ระบุ').trim();
      const auc = Number(item.cn41ActualCost) || 0;
      if (!officeMap[off]) {
        officeMap[off] = { office: off, total: 0, auc: 0, clsd: 0, teco: 0, rel: 0, sapDetails: {} };
      }
      officeMap[off].total++;
      officeMap[off].auc += auc;
      const cat = getItemSapCategory(item);
      if (cat === 'CLSD') officeMap[off].clsd++;
      else if (cat === 'TECO') officeMap[off].teco++;
      else officeMap[off].rel++;

      const sapShort = item.statusSap || formatSapStatusShort(item.status) || 'ไม่ระบุ';
      officeMap[off].sapDetails[sapShort] = (officeMap[off].sapDetails[sapShort] || 0) + 1;
    });

    // Sort all offices with remaining jobs descending
    const sortedOffices = Object.values(officeMap)
      .filter(o => o.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        if (b.rel !== a.rel) return b.rel - a.rel;
        if (b.teco !== a.teco) return b.teco - a.teco;
        return a.office.localeCompare(b.office, 'th');
      });

    const isTop10 = wbsState.chartScope === 'top10';
    const displayOffices = isTop10 ? sortedOffices.slice(0, 10) : sortedOffices;

    activeWbsTopOffices = displayOffices;

    if (!displayOffices.length) {
      wbsChartHoverIdx = -1;
      const tooltipEl = document.getElementById('wbsChartTooltip');
      if (tooltipEl) tooltipEl.style.display = 'none';
    }

    // Update Title & Badge: แสดงชื่อสถานะ SAP และมูลค่ารวมเมื่อมีการเลือกสถานะตามคำสั่งผู้ใช้งาน
    const titleEl = document.getElementById('wbsOfficesChartTitle');
    const badgeEl = document.getElementById('wbsOfficesChartCountBadge');
    const aucBadgeEl = document.getElementById('wbsOfficesChartAucBadge');
    const activeSapList = wbsState.selectedSapStatuses ? Array.from(wbsState.selectedSapStatuses) : [];

    if (titleEl) {
      if (activeSapList.length > 0) {
        const sapLabel = activeSapList.length >= 9 ? 'ทุกสถานะ' : activeSapList.join(', ');
        titleEl.textContent = isTop10 ? `10 หน่วยงานที่มีงานสถานะ: ${sapLabel}` : `กอง/กฟฟ. ที่มีงานสถานะ: ${sapLabel}`;
      } else {
        titleEl.textContent = isTop10 ? '10 หน่วยงานที่มีงาน WBS คงเหลือสูงสุด' : 'กอง/กฟฟ. ที่มีงาน WBS คงเหลือ';
      }
    }

    const displayTotalJobs = displayOffices.reduce((acc, cur) => acc + cur.total, 0);
    const displayTotalAuc = displayOffices.reduce((acc, cur) => acc + (cur.auc || 0), 0);

    if (badgeEl) {
      badgeEl.textContent = `${displayOffices.length} หน่วยงาน (คงเหลือ ${displayTotalJobs.toLocaleString('th-TH')} งาน)`;
    }

    if (aucBadgeEl) {
      aucBadgeEl.textContent = `มูลค่ารวม: ฿${formatMoney(displayTotalAuc)}`;
      aucBadgeEl.title = `มูลค่าต้นทุนจริง AUC (จากไฟล์ 05 CN41) รวมของงานที่แสดง: ฿${formatMoney(displayTotalAuc)} บาท (${(displayTotalAuc / 1e6).toFixed(2)} ล้านบาท)`;
    }

    // Update Legend Counts: แสดงจำนวนงานคงเหลือแยกตามสถานะ CLSD, TECO, REL
    const sumClsd = displayOffices.reduce((acc, cur) => acc + (cur.clsd || 0), 0);
    const sumTeco = displayOffices.reduce((acc, cur) => acc + (cur.teco || 0), 0);
    const sumRel = displayOffices.reduce((acc, cur) => acc + (cur.rel || 0), 0);

    const elClsdCount = document.getElementById('wbsLegendClsdCount');
    const elTecoCount = document.getElementById('wbsLegendTecoCount');
    const elRelCount = document.getElementById('wbsLegendRelCount');

    if (elClsdCount) elClsdCount.textContent = sumClsd.toLocaleString('th-TH');
    if (elTecoCount) elTecoCount.textContent = sumTeco.toLocaleString('th-TH');
    if (elRelCount) elRelCount.textContent = sumRel.toLocaleString('th-TH');

    // Bind canvas hover, click & resize events once (เอาตัวเมาเลื่อนแล้วแสดง Popup ออกไปตามคำสั่งผู้ใช้งาน)
    if (!wbsChartEventsBound) {
      wbsChartEventsBound = true;

      canvas.style.cursor = 'pointer';

      canvas.addEventListener('mousemove', function (e) {
        if (!activeWbsTopOffices.length) return;
        const rect = canvas.getBoundingClientRect();
        const padLeft = 42;
        const padRight = 16;
        const plotW = rect.width - padLeft - padRight;
        const slotW = plotW / activeWbsTopOffices.length;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const idx = Math.floor((mouseX - padLeft) / slotW);
        if (idx >= 0 && idx < activeWbsTopOffices.length && mouseY >= 8 && mouseY <= (canvas._wbsPlotBottom || (rect.height - 35))) {
          if (wbsChartHoverIdx !== idx) {
            wbsChartHoverIdx = idx;
            drawTopOfficesCanvas(canvas, activeWbsTopOffices, wbsState.chartMode || 'stacked', wbsChartHoverIdx, currentCrit);
          }
        } else {
          if (wbsChartHoverIdx !== -1) {
            wbsChartHoverIdx = -1;
            drawTopOfficesCanvas(canvas, activeWbsTopOffices, wbsState.chartMode || 'stacked', -1, currentCrit);
          }
        }
      });

      canvas.addEventListener('click', function (e) {
        if (!activeWbsTopOffices.length) return;
        const rect = canvas.getBoundingClientRect();
        const padLeft = 42;
        const padRight = 16;
        const plotW = rect.width - padLeft - padRight;
        const slotW = plotW / activeWbsTopOffices.length;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const idx = Math.floor((mouseX - padLeft) / slotW);
        if (idx >= 0 && idx < activeWbsTopOffices.length && mouseY >= 8 && mouseY <= (canvas._wbsPlotBottom || (rect.height - 35))) {
          const off = activeWbsTopOffices[idx];
          if (wbsState.office === off.office) {
            wbsState.office = 'ALL';
            if (window.showToast) window.showToast('แสดงข้อมูลทุกหน่วยงาน', 'info');
          } else {
            wbsState.office = off.office;
            if (window.showToast) window.showToast(`กรองเฉพาะ ${off.office} (${off.total} งาน)`, 'success');
          }
          const oSelect = document.getElementById('wbsOfficeFilterSelect');
          if (oSelect) oSelect.value = wbsState.office;
          wbsState.page = 1;
          renderWbsTab();
        }
      });

      canvas.addEventListener('mouseleave', function () {
        wbsChartHoverIdx = -1;
        drawTopOfficesCanvas(canvas, activeWbsTopOffices, wbsState.chartMode || 'stacked', -1, currentCrit);
      });

      window.addEventListener('resize', function () {
        if (activeWbsTopOffices.length) {
          drawTopOfficesCanvas(canvas, activeWbsTopOffices, wbsState.chartMode || 'stacked', wbsChartHoverIdx, currentCrit);
        }
      });
    }

    drawTopOfficesCanvas(canvas, displayOffices, wbsState.chartMode || 'stacked', wbsChartHoverIdx, currentCrit);
  }

  /**
   * Core Canvas Drawing for Offices Bar Chart (Height 268px, CLSD Green, TECO Yellow, REL Red)
   * กราฟสมส่วน ความสูงพอเหมาะ มองเห็นตัวเลขชัดเจน และไล่ระดับสีตามสถานะ SAP
   */
  function drawTopOfficesCanvas(canvas, data, mode, hoveredIdx, currentCrit) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!currentCrit) {
      const globalState = window.state || {};
      const globalFilters = globalState.filters || {};
      currentCrit = globalFilters.criteria || (document.getElementById('filterCriteria') ? document.getElementById('filterCriteria').value : 'ALL');
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const dpr = window.devicePixelRatio || 1;
    const container = canvas.parentElement;
    const containerW = container ? container.getBoundingClientRect().width : 800;
    const height0 = 296; // ความสูงกราฟสมส่วน สวยงาม กว้างและชัดเจน

    const count = (data || []).length;
    const fitOnePage = mode !== 'grouped';
    const minSlotW = mode === 'grouped' ? 60 : 48;
    const pad = { top: 26, right: 16, bottom: 52, left: 42 };
    const slotEst = (containerW - pad.left - pad.right) / Math.max(count, 1);
    const dense = fitOnePage && slotEst < 44;
    const labelAngleDeg = dense ? -58 : -28;
    const labelFontPx = dense ? 10 : 10.5;

    if (dense) {
      // คำนวณพื้นที่ด้านล่างให้พอดีกับชื่อหน่วยงาน
      ctx.font = `500 ${labelFontPx}px Prompt, sans-serif`;
      const maxLabelW = Math.max(...data.map(o => ctx.measureText(o.office || '').width), 0);
      pad.bottom = Math.min(84, Math.ceil(maxLabelW * Math.sin(Math.abs(labelAngleDeg) * Math.PI / 180)) + 16);
    }
    const plotHBase = 196; // ความสูงพื้นที่วาดกราฟกะทัดรัด สมส่วน ชัดเจน
    const height = dense ? pad.top + plotHBase + pad.bottom : height0;

    const minRequiredW = pad.left + pad.right + Math.max(count, 1) * minSlotW;
    const width = fitOnePage ? containerW : Math.max(containerW, minRequiredW);

    canvas._wbsPlotBottom = height - pad.bottom + 10;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    if (!data || !data.length) {
      ctx.fillStyle = isLight ? '#6B7280' : '#A692BA';
      ctx.font = '12px Prompt, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ไม่พบข้อมูลหน่วยงานสำหรับเงื่อนไขตัวกรองนี้', width / 2, height / 2);
      return;
    }

    const plotW = Math.max(10, width - pad.left - pad.right);
    const plotH = Math.max(10, height - pad.top - pad.bottom);
    const slotW = plotW / count;

    // Calculate scale
    let maxVal;
    if (mode === 'grouped') {
      maxVal = Math.max(...data.map(o => Math.max(o.clsd, o.teco, o.rel)), 1);
    } else {
      maxVal = Math.max(...data.map(o => o.total), 1);
    }

    const minTotal = Math.min(...data.map(o => o.total), 1);
    const maxTotal = Math.max(...data.map(o => o.total), 1);

    const stepBase = maxVal <= 30 ? 10 : (maxVal <= 100 ? 25 : (maxVal <= 250 ? 50 : 100));
    const niceMax = Math.ceil((maxVal * 1.12) / stepBase) * stepBase || stepBase;

    // 1. Draw Grid Lines & Y-Axis Scale
    ctx.save();
    ctx.strokeStyle = isLight ? 'rgba(104, 44, 145, 0.14)' : 'rgba(168, 85, 247, 0.12)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.font = '600 10.5px Prompt, sans-serif';
    ctx.fillStyle = isLight ? '#6B7280' : '#A692BA';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const gridSteps = 2; // 0%, 50%, 100%
    for (let s = 0; s <= gridSteps; s++) {
      const y = pad.top + plotH - (s / gridSteps) * plotH;
      const val = Math.round((s / gridSteps) * niceMax);

      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();

      ctx.fillText(val.toLocaleString('th-TH'), pad.left - 5, y);
    }
    ctx.restore();

    // 2. Draw Office Bars
    data.forEach((off, i) => {
      const centerX = pad.left + (i + 0.5) * slotW;
      const isHovered = hoveredIdx === i;
      const isSelected = (wbsState.office && wbsState.office !== 'ALL' && wbsState.office === off.office);

      if (mode === 'stacked') {
        // --- STACKED BAR MODE ---
        // ปรับความกว้างแท่งกราฟให้สมส่วน มีพื้นที่เพียงพอสำหรับแสดงรหัสสถานะ SAP ประโยคท้าย และตัวเลขจำนวนงานในบรรทัดเดียว
        const barW = Math.max(26, Math.min(44, Math.round(slotW * 0.70)));
        const barX = centerX - barW / 2;

        // 1. Gather all active SAP status segments for this office
        const segments = Object.entries(off.sapDetails || {})
          .filter(([_, cnt]) => cnt > 0)
          .map(([sap, cnt]) => ({
            sap,
            suffix: getSapSuffix(sap),
            count: cnt,
            style: getSapSegmentStyle(sap, currentCrit),
            orderRank: getSapSegmentOrderRank(sap),
            h: 0
          }))
          .sort((a, b) => a.orderRank - b.orderRank);

        // Fallback if sapDetails wasn't populated
        if (!segments.length && off.total > 0) {
          if (off.rel > 0) segments.push({ sap: 'REL', suffix: 'REL', count: off.rel, style: getSapSegmentStyle('REL C1', currentCrit), orderRank: 1000, h: 0 });
          if (off.teco > 0) segments.push({ sap: 'TECO', suffix: 'TECO', count: off.teco, style: getSapSegmentStyle('TECO D2', currentCrit), orderRank: 15000, h: 0 });
          if (off.clsd > 0) segments.push({ sap: 'CLSD', suffix: 'CLSD', count: off.clsd, style: getSapSegmentStyle('CLSD F4', currentCrit), orderRank: 27000, h: 0 });
        }

        // Highlight selection border if active
        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#FFD25A';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(255, 210, 90, 0.9)';
          ctx.shadowBlur = 8;
          ctx.strokeRect(barX - 3, pad.top + 5, barW + 6, plotH - 5);
          ctx.restore();
        }

        // 6. ไล่ความสูงกราฟแท่งตามสัดส่วนจำนวนงานจริงอย่างแม่นยำ (Strict Proportional & Monotonic)
        // รับประกัน: หน่วยงานที่งานเยอะสุดจะต้องมีความสูงกราฟมากสุดเสมอ และลดหลั่นลงมาตามจำนวนงานอย่างแม่นยำ
        const maxBarH = plotH - 16;
        const minBarH = 20; // งาน 1 งานมีความสูง 20px พอดีสำหรับแสดงข้อความสถานะและจำนวนงาน
        let totalBarH = minBarH;
        if (maxTotal > minTotal) {
          const t = (off.total - minTotal) / (maxTotal - minTotal);
          totalBarH = minBarH + t * (maxBarH - minBarH);
        } else {
          totalBarH = (maxBarH + minBarH) / 2;
        }

        // จัดสรรความสูงของแต่ละเซกเมนต์สถานะ SAP ในแท่งด้วยอัลกอริทึม Water-filling:
        // ให้เซกเมนต์ขนาดใหญ่มีสัดส่วนตรงตามจำนวนงานจริง และทุกเซกเมนต์มีพื้นที่พอแสดงรหัสสถานะ SAP
        if (off.total > 0 && segments.length > 0) {
          allocateSegmentHeights(segments, totalBarH, 13.5);
        }

        let curBaseY = pad.top + plotH;

        // วาดแต่ละเซกเมนต์สถานะ SAP เรียงจากล่างขึ้นบน
        segments.forEach((seg, sIdx) => {
          if (seg.h <= 0) return;
          const segY = curBaseY - seg.h;
          const isBottom = (sIdx === 0);
          const isTop = (sIdx === segments.length - 1);

          const grad = ctx.createLinearGradient(0, segY, 0, curBaseY);
          grad.addColorStop(0, seg.style.bgTop);
          if (seg.style.bgMiddle) {
            grad.addColorStop(0.5, seg.style.bgMiddle);
          }
          grad.addColorStop(1, seg.style.bgBottom);

          // วาดเซกเมนต์ (มีลายทางเฉียง 45 องศาสำหรับ CLSD F4/F2, TECO D2, REL C3)
          drawCanvasBarSegment(ctx, barX, segY, barW, seg.h, grad, seg.style.stroke, isTop, isBottom, seg.style.hasPattern, seg.style.strokeWidth || 1);

          // แสดงรหัสสถานะ SAP ประโยคท้ายและจำนวนงานในบรรทัดเดียวกัน เช่น "F4 : 4" ตามคำสั่งผู้ใช้งาน
          if (seg.count > 0 && seg.h >= 9) {
            ctx.save();
            const textCol = seg.style.textColor || '#FFFFFF';
            ctx.fillStyle = textCol;
            const isDark = (textCol !== '#FFFFFF');
            if (isDark) {
              ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
              ctx.shadowBlur = 2.5;
            } else {
              ctx.shadowColor = 'rgba(0, 0, 0, 0.92)';
              ctx.shadowBlur = 3;
            }
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const suffix = seg.suffix || getSapSuffix(seg.sap);
            const countStr = seg.count.toLocaleString('th-TH');

            // รูปแบบบรรทัดเดียวตามคำสั่งผู้ใช้งาน เช่น "F4 : 4" หรือ "C1 : 35"
            const labelStandard = `${suffix} : ${countStr}`;
            const labelCompact = `${suffix}:${countStr}`;

            let fSize = seg.h >= 22 ? 10 : (seg.h >= 14 ? 9.2 : 8.2);
            ctx.font = `bold ${fSize}px Prompt, sans-serif`;

            let textToDraw = labelStandard;
            if (ctx.measureText(textToDraw).width > barW - 3) {
              ctx.font = `bold ${fSize - 0.8}px Prompt, sans-serif`;
              if (ctx.measureText(textToDraw).width > barW - 3) {
                textToDraw = labelCompact;
                if (ctx.measureText(textToDraw).width > barW - 2) {
                  ctx.font = 'bold 8px Prompt, sans-serif';
                }
              }
            }

            if (ctx.measureText(textToDraw).width > barW) {
              textToDraw = suffix;
              ctx.font = 'bold 8.5px Prompt, sans-serif';
            }

            ctx.fillText(textToDraw, centerX, segY + seg.h / 2);
            ctx.restore();
          }

          curBaseY = segY;
        });

        // 4. Total Job Count on Top of Stack (Bold Gold/Theme text)
        ctx.save();
        ctx.fillStyle = (isHovered || isSelected) ? (isLight ? '#682C91' : '#FFFFFF') : (isLight ? '#92400E' : '#FFD25A');
        ctx.font = 'bold 12px Prompt, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = isLight ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 1;
        ctx.fillText(off.total.toLocaleString('th-TH'), centerX, curBaseY - 3);
        ctx.restore();

      } else {
        // --- GROUPED BARS MODE ---
        const subBarW = Math.max(9, Math.min(16, Math.floor((slotW * 0.76 - 6) / 3)));
        const gap = 2;
        const groupW = 3 * subBarW + 2 * gap;
        const startX = centerX - groupW / 2;

        if (isSelected) {
          ctx.save();
          ctx.strokeStyle = '#FFD25A';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = 'rgba(255, 210, 90, 0.9)';
          ctx.shadowBlur = 8;
          ctx.strokeRect(startX - 3, pad.top + 5, groupW + 6, plotH - 5);
          ctx.restore();
        }

        const series = [
          { val: off.clsd, col1: '#10B981', col2: '#059669', stroke: 'rgba(16, 185, 129, 0.8)', textCol: '#34D399' },
          { val: off.teco, col1: '#F59E0B', col2: '#D97706', stroke: 'rgba(245, 158, 11, 0.8)', textCol: '#FFD25A' },
          { val: off.rel, col1: '#EF4444', col2: '#DC2626', stroke: 'rgba(239, 68, 68, 0.8)', textCol: '#F87171' }
        ];

        series.forEach((s, sIdx) => {
          const bx = startX + sIdx * (subBarW + gap);
          const bh = s.val > 0 ? Math.max(3, (s.val / niceMax) * plotH) : 2;
          const by = pad.top + plotH - bh;

          const g = ctx.createLinearGradient(0, by, 0, by + bh);
          g.addColorStop(0, s.col1);
          g.addColorStop(1, s.col2);

          drawCanvasBarSegment(ctx, bx, by, subBarW, bh, g, s.stroke, true, false);

          // Display number for EVERY color
          ctx.save();
          ctx.fillStyle = s.val > 0 ? s.textCol : (isLight ? '#9CA3AF' : 'rgba(255, 255, 255, 0.38)');
          ctx.font = s.val > 0 ? 'bold 10px Prompt, sans-serif' : '500 9px Prompt, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'bottom';
          ctx.shadowColor = isLight ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.85)';
          ctx.shadowBlur = 2;
          ctx.fillText(s.val.toLocaleString('th-TH'), bx + subBarW / 2, by - 2);
          ctx.restore();
        });
      }

      // X-Axis Office Name
      ctx.save();
      ctx.translate(centerX, pad.top + plotH + 8);
      ctx.rotate(labelAngleDeg * Math.PI / 180);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const lblBold = dense ? 10.5 : 11;
      ctx.font = isSelected ? `700 ${lblBold}px Prompt, sans-serif` : (isHovered ? `600 ${lblBold}px Prompt, sans-serif` : `500 ${labelFontPx}px Prompt, sans-serif`);
      ctx.fillStyle = isSelected ? '#FFD25A' : (isHovered ? (isLight ? '#682C91' : '#FFFFFF') : (isLight ? '#4B5563' : '#A692BA'));
      if (isSelected || isHovered) {
        ctx.shadowColor = isSelected ? 'rgba(255, 210, 90, 0.7)' : (isLight ? 'rgba(104, 44, 145, 0.3)' : 'rgba(255, 255, 255, 0.4)');
        ctx.shadowBlur = 4;
      }
      ctx.fillText(off.office, 0, 0);
      ctx.restore();
    });
  }

  /**
   * Sort column click handler
   */
  window.sortWbsTable = function (col) {
    if (wbsState.sortCol === col) {
      wbsState.sortAsc = !wbsState.sortAsc;
    } else {
      wbsState.sortCol = col;
      wbsState.sortAsc = true;
    }

    renderWbsTab();
  };

  /**
   * Toggle Column Selector Dropdown Menu
   */
  window.toggleWbsColDropdown = function (evt) {
    if (evt) evt.stopPropagation();
    const panel = document.getElementById('wbsColDropdownPanel');
    if (!panel) return;
    const isShowing = panel.style.display !== 'none';
    panel.style.display = isShowing ? 'none' : 'block';
    if (!isShowing) {
      const searchInput = document.getElementById('wbsColSearchInput');
      if (searchInput) {
        setTimeout(() => searchInput.focus(), 80);
      }
    }
  };

  /**
   * Filter Column checkboxes in real time
   */
  window.filterWbsColCheckboxes = function (query) {
    wbsState.colSearchQuery = query;
    renderWbsColDropdownList(query);
  };

  /**
   * Toggle single column visibility
   */
  window.toggleSingleWbsCol = function (colId, isChecked) {
    const willHaveActive = Object.keys(wbsState.visibleColumns).some(k => k === colId ? isChecked : wbsState.visibleColumns[k]);
    if (!willHaveActive && !isChecked) {
      if (window.showToast) window.showToast('ต้องมีอย่างน้อย 1 คอลัมน์ที่แสดงผล', 'warning');
      renderWbsColDropdownList(wbsState.colSearchQuery);
      return;
    }

    wbsState.visibleColumns[colId] = isChecked;
    saveVisibleColumns();
    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
  };

  /**
   * Toggle an entire group of columns on/off
   */
  window.toggleWbsColGroup = function (groupId, checkAll) {
    WBS_COL_DEFS.forEach(c => {
      if (c.group === groupId) {
        wbsState.visibleColumns[c.id] = checkAll;
      }
    });

    const hasActive = Object.values(wbsState.visibleColumns).some(Boolean);
    if (!hasActive) {
      wbsState.visibleColumns.id = true;
      wbsState.visibleColumns.wbs = true;
    }

    saveVisibleColumns();
    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
  };

  /**
   * Apply presets for column visibility
   */
  window.setWbsColsPreset = function (presetName) {
    if (presetName === 'all') {
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = true; });
    } else if (presetName === 'core') {
      const coreIds = new Set([
        'id', 'wbs', 'description', 'statusSap', 'province', 'office', 'budget',
        'engineer', 'department', 'type', 'budgetCurrent', 'actTotalCtrl', 'budgetRemain',
        'pctMatWithdraw', 'pctExpenseWithdraw', 'cn41ActualCost'
      ]);
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = coreIds.has(c.id); });
    } else if (presetName === 'budget') {
      const budgetIds = new Set([
        'id', 'wbs', 'description', 'budget', 'office', 'budgetOrigin', 'budgetCurrent',
        'budgetAlloc', 'budgetDist', 'budgetRemain', 'actTotalCtrl', 'actMatCheck', 'actOtherSite',
        'planMat', 'pctMatWithdraw', 'planSite', 'pctExpenseWithdraw', 'cn41ActualCost'
      ]);
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = budgetIds.has(c.id); });
    } else if (presetName === 'cn41') {
      const cn41Ids = new Set([
        'id', 'wbs', 'province', 'office', 'budget', 'engineer',
        'cn41ActualCost', 'cn41ObjDesc', 'cn41Level', 'cn41Currency', 'budgetRemain'
      ]);
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = cn41Ids.has(c.id); });
    } else if (presetName === 'file03') {
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = (c.group === '03' && c.id !== 'criteria'); });
    } else if (presetName === 'plan06') {
      const plan06Ids = new Set([
        'id', 'wbs', 'description', 'statusSap', 'office', 'engineer',
        'planClose', 'note', 'budgetRemain', 'cn41ActualCost'
      ]);
      WBS_COL_DEFS.forEach(c => { wbsState.visibleColumns[c.id] = plan06Ids.has(c.id); });
    }

    saveVisibleColumns();
    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);

    const presetNamesTh = {
      all: `ทั้งหมด (${WBS_COL_DEFS.length} คอลัมน์)`,
      core: 'คอลัมน์หลัก',
      budget: 'เน้นงบประมาณ & AUC',
      cn41: 'เฉพาะ CN41',
      file03: 'ไฟล์ 03 เดิม',
      plan06: 'แผนงานไฟล์ 06'
    };
    if (window.showToast) window.showToast(`ปรับมุมมองคอลัมน์เป็น "${presetNamesTh[presetName] || presetName}" เรียบร้อยแล้ว`, 'info');
  };

  /**
   * Set all columns visible or hidden
   */
  window.setAllWbsCols = function (selectAll) {
    WBS_COL_DEFS.forEach(c => {
      wbsState.visibleColumns[c.id] = selectAll;
    });
    if (!selectAll) {
      wbsState.visibleColumns.id = true;
      wbsState.visibleColumns.wbs = true;
    }
    saveVisibleColumns();
    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
    if (window.showToast) {
      window.showToast(selectAll ? 'เปิดแสดงคอลัมน์ทั้งหมดแล้ว' : 'ปิดคอลัมน์ทั้งหมดแล้ว (คงเหลือ ลำดับ และ WBS)', 'info');
    }
  };

  /**
   * Set columns visibility and order to Default view (11 columns according to รูปที่ 16)
   */
  window.setWbsColsDefaultPreset = function () {
    const defaultSet = new Set(DEFAULT_WBS_COL_ORDER);
    WBS_COL_DEFS.forEach(c => {
      wbsState.visibleColumns[c.id] = defaultSet.has(c.id);
    });
    wbsState.columnOrder = getDefaultColumnOrder();
    saveVisibleColumns();
    saveColumnOrder();

    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);

    if (window.showToast) {
      window.showToast('ตั้งค่าคอลัมน์และลำดับเป็นค่า Default (11 คอลัมน์) เรียบร้อยแล้ว', 'info');
    }
  };

  /**
   * Reset columns to default visibility
   */
  window.resetWbsColsDefault = function () {
    window.setWbsColsDefaultPreset();
  };

  /**
   * Set View Mode for Column Dropdown ('group' or 'order')
   */
  window.setWbsColViewMode = function (mode) {
    wbsState.colViewMode = mode;
    const btnGroup = document.getElementById('btnModeGroup');
    const btnOrder = document.getElementById('btnModeOrder');
    if (btnGroup) btnGroup.classList.toggle('active', mode === 'group');
    if (btnOrder) btnOrder.classList.toggle('active', mode === 'order');
    renderWbsColDropdownList(wbsState.colSearchQuery);
  };

  /**
   * Reset Column Order back to default schema
   */
  window.resetWbsColumnOrder = function () {
    wbsState.columnOrder = getDefaultColumnOrder();
    saveColumnOrder();

    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
    if (window.showToast) {
      window.showToast('รีเซ็ตลำดับการแสดงคอลัมน์กลับสู่ค่ามาตรฐานเรียบร้อยแล้ว', 'info');
    }
  };

  /**
   * Move Column Order in Dropdown panel (▲ -1 / ▼ +1)
   */
  window.moveWbsColumnOrder = function (colId, direction, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const order = [...wbsState.columnOrder];
    const idx = order.indexOf(colId);
    if (idx === -1) return;

    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= order.length) return;

    const tmp = order[idx];
    order[idx] = order[newIdx];
    order[newIdx] = tmp;

    wbsState.columnOrder = order;
    saveColumnOrder();

    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
  };

  /**
   * Shift Visible Column on Table Header (◀ Left -1 / ▶ Right +1)
   */
  window.shiftVisibleWbsCol = function (colId, direction, e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }

    const orderedDefs = getOrderedColDefs();
    const visibleOrdered = orderedDefs.filter(c => wbsState.visibleColumns[c.id]);
    const curIdx = visibleOrdered.findIndex(c => c.id === colId);
    if (curIdx === -1) return;

    const newIdx = curIdx + direction;
    if (newIdx < 0 || newIdx >= visibleOrdered.length) return;

    const otherColId = visibleOrdered[newIdx].id;

    // Shift in columnOrder array
    const order = [...wbsState.columnOrder];
    const srcIdx = order.indexOf(colId);
    if (srcIdx === -1) return;
    order.splice(srcIdx, 1);

    const tgtIdx = order.indexOf(otherColId);
    if (tgtIdx === -1) return;

    if (direction < 0) {
      order.splice(tgtIdx, 0, colId); // insert before
    } else {
      order.splice(tgtIdx + 1, 0, colId); // insert after
    }

    wbsState.columnOrder = order;
    saveColumnOrder();

    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
    renderWbsColDropdownList(wbsState.colSearchQuery);
  };

  // --- Table Header Drag & Drop Handlers ---
  let draggedThColId = null;

  window.handleThDragStart = function (e, colId) {
    draggedThColId = colId;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', colId);
      e.dataTransfer.effectAllowed = 'move';
    }
    const th = e.currentTarget;
    setTimeout(() => {
      if (th) th.classList.add('th-dragging');
    }, 10);
  };

  window.handleThDragOver = function (e, targetColId) {
    if (!draggedThColId || draggedThColId === targetColId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const th = e.currentTarget;
    const rect = th.getBoundingClientRect();
    const midpoint = rect.left + rect.width / 2;
    const isLeft = e.clientX < midpoint;

    if (isLeft) {
      th.classList.add('th-drag-over-left');
      th.classList.remove('th-drag-over-right');
    } else {
      th.classList.add('th-drag-over-right');
      th.classList.remove('th-drag-over-left');
    }
  };

  window.handleThDragLeave = function (e) {
    const th = e.currentTarget;
    th.classList.remove('th-drag-over-left', 'th-drag-over-right');
  };

  window.handleThDrop = function (e, targetColId) {
    e.preventDefault();
    e.stopPropagation();

    const th = e.currentTarget;
    const isLeft = th.classList.contains('th-drag-over-left') || (!th.classList.contains('th-drag-over-right') && e.clientX < (th.getBoundingClientRect().left + th.getBoundingClientRect().width / 2));

    document.querySelectorAll('#wbsDataTable th').forEach(el => {
      el.classList.remove('th-dragging', 'th-drag-over-left', 'th-drag-over-right');
    });

    const sourceColId = draggedThColId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    draggedThColId = null;

    if (!sourceColId || sourceColId === targetColId) return;

    const order = [...wbsState.columnOrder];
    const srcIdx = order.indexOf(sourceColId);
    if (srcIdx === -1) return;
    order.splice(srcIdx, 1);

    const tgtIdx = order.indexOf(targetColId);
    if (tgtIdx === -1) return;

    if (isLeft) {
      order.splice(tgtIdx, 0, sourceColId);
    } else {
      order.splice(tgtIdx + 1, 0, sourceColId);
    }

    wbsState.columnOrder = order;
    saveColumnOrder();

    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
    renderWbsColDropdownList(wbsState.colSearchQuery);

    const srcCol = WBS_COL_DEFS.find(c => c.id === sourceColId);
    if (window.showToast && srcCol) {
      window.showToast(`ย้ายคอลัมน์ "${srcCol.label}" เรียบร้อยแล้ว`, 'info');
    }
  };

  window.handleThDragEnd = function (e) {
    draggedThColId = null;
    document.querySelectorAll('#wbsDataTable th').forEach(el => {
      el.classList.remove('th-dragging', 'th-drag-over-left', 'th-drag-over-right');
    });
  };

  // --- Dropdown Panel Item Drag & Drop Handlers ---
  let draggedDropdownItemColId = null;

  window.handleDropdownItemDragStart = function (e, colId) {
    draggedDropdownItemColId = colId;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', colId);
      e.dataTransfer.effectAllowed = 'move';
    }
    const el = e.currentTarget;
    setTimeout(() => {
      if (el) el.classList.add('item-dragging');
    }, 10);
  };

  window.handleDropdownItemDragOver = function (e, targetColId) {
    if (!draggedDropdownItemColId || draggedDropdownItemColId === targetColId) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const isTop = e.clientY < (rect.top + rect.height / 2);

    if (isTop) {
      el.classList.add('item-drag-over-top');
      el.classList.remove('item-drag-over-bottom');
    } else {
      el.classList.add('item-drag-over-bottom');
      el.classList.remove('item-drag-over-top');
    }
  };

  window.handleDropdownItemDragLeave = function (e) {
    const el = e.currentTarget;
    el.classList.remove('item-drag-over-top', 'item-drag-over-bottom');
  };

  window.handleDropdownItemDrop = function (e, targetColId) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget;
    const isTop = el.classList.contains('item-drag-over-top') || (!el.classList.contains('item-drag-over-bottom') && e.clientY < (el.getBoundingClientRect().top + el.getBoundingClientRect().height / 2));

    document.querySelectorAll('.col-check-item').forEach(item => {
      item.classList.remove('item-dragging', 'item-drag-over-top', 'item-drag-over-bottom');
    });

    const sourceColId = draggedDropdownItemColId || (e.dataTransfer ? e.dataTransfer.getData('text/plain') : null);
    draggedDropdownItemColId = null;

    if (!sourceColId || sourceColId === targetColId) return;

    const order = [...wbsState.columnOrder];
    const srcIdx = order.indexOf(sourceColId);
    if (srcIdx === -1) return;
    order.splice(srcIdx, 1);

    const tgtIdx = order.indexOf(targetColId);
    if (tgtIdx === -1) return;

    if (isTop) {
      order.splice(tgtIdx, 0, sourceColId);
    } else {
      order.splice(tgtIdx + 1, 0, sourceColId);
    }

    wbsState.columnOrder = order;
    saveColumnOrder();

    renderWbsColDropdownList(wbsState.colSearchQuery);
    renderWbsTableHead();
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);
  };

  window.handleDropdownItemDragEnd = function (e) {
    draggedDropdownItemColId = null;
    document.querySelectorAll('.col-check-item').forEach(item => {
      item.classList.remove('item-dragging', 'item-drag-over-top', 'item-drag-over-bottom');
    });
  };

  // Close column dropdown & SAP status dropdown on click outside
  document.addEventListener('click', function (e) {
    const wrap = document.getElementById('wbsColDropdownWrap');
    const panel = document.getElementById('wbsColDropdownPanel');
    if (panel && panel.style.display !== 'none') {
      if (wrap && !wrap.contains(e.target)) {
        panel.style.display = 'none';
      }
    }

    const sapPanel = document.getElementById('wbsSapThDropdownPanel');
    const sapBtn = document.getElementById('btnWbsSapThDropdown');
    if (sapPanel && sapPanel.style.display !== 'none') {
      if (!sapPanel.contains(e.target) && (!sapBtn || !sapBtn.contains(e.target))) {
        window.closeWbsSapThDropdown();
      }
    }
  });

  /**
   * Toggle fullscreen mode for Data Table
   */
  window.toggleTableFullscreen = function (btn) {
    const card = btn ? (btn.closest('.table-card') || btn.closest('.content-card')) : document.getElementById('wbsTableCard');
    if (!card) return;

    const isFull = card.classList.toggle('is-fullscreen');
    document.body.classList.toggle('has-fullscreen-table', isFull);

    const allBtns = card.querySelectorAll('.btn-wbs-fullscreen, .btn-fullscreen');
    allBtns.forEach(b => {
      if (isFull) {
        b.setAttribute('title', 'ย่อขนาดปกติ (ESC)');
        b.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 14h6m0 0v6m0-6L3 21m17-7h-6m0 0v6m0-6l7 7M4 10h6m0 0V4m0 6L3 3m17 7h-6m0 0V4m0 6l7-7"></path>
          </svg>
          <span>ย่อขนาด</span>
        `;
      } else {
        b.setAttribute('title', 'ขยายตารางเต็มหน้าจอ');
        b.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          <span>ขยายเต็มจอ</span>
        `;
      }
    });

    if (window.showToast) {
      window.showToast(isFull ? 'ขยายตารางเต็มหน้าจอแล้ว (กด ESC เพื่อย่อ)' : 'ย่อตารางเป็นขนาดปกติแล้ว', 'info');
    }

    setTimeout(() => {
      if (window.updateWbsLeftScrollbar) window.updateWbsLeftScrollbar();
    }, 100);
  };

  // Listen for Escape key to exit table fullscreen or close dropdowns
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      const sapPanel = document.getElementById('wbsSapThDropdownPanel');
      if (sapPanel && sapPanel.style.display !== 'none') {
        window.closeWbsSapThDropdown();
        return;
      }
      const panel = document.getElementById('wbsColDropdownPanel');
      if (panel && panel.style.display !== 'none') {
        panel.style.display = 'none';
        return;
      }
      const fullTable = document.querySelector('.table-card.is-fullscreen');
      if (fullTable) {
        const btn = fullTable.querySelector('.btn-wbs-fullscreen, .btn-fullscreen');
        if (btn && window.toggleTableFullscreen) {
          window.toggleTableFullscreen(btn);
        }
      }
    }
  });

  /**
   * Pagination change page handler
   */
  window.changeWbsPage = function (page) {
    wbsState.page = page;
    const filtered = getFilteredWbsData();
    const sorted = sortWbsData(filtered);
    renderWbsTable(sorted, filtered.length);

    const tableCard = document.querySelector('#tab-wbs .table-card');
    if (tableCard) {
      tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  /**
   * Reset in-table sub-filters
   */
  window.resetWbsSubFilters = function () {
    wbsState.search = '';
    wbsState.budget = 'ALL';
    wbsState.office = 'ALL';
    wbsState.engineer = 'ALL';
    wbsState.planClose = 'ALL';
    wbsState.sapStatus = 'ALL';
    if (wbsState.selectedSapStatuses) wbsState.selectedSapStatuses.clear();
    wbsState.page = 1;

    const sInput = document.getElementById('wbsTableSearchInput');
    if (sInput) sInput.value = '';

    const bSelect = document.getElementById('wbsBudgetFilterSelect');
    if (bSelect) bSelect.value = 'ALL';

    const oSelect = document.getElementById('wbsOfficeFilterSelect');
    if (oSelect) oSelect.value = 'ALL';

    const eSelect = document.getElementById('wbsEngineerFilterSelect');
    if (eSelect) eSelect.value = 'ALL';

    const pcSelect = document.getElementById('wbsPlanCloseFilterSelect');
    if (pcSelect) pcSelect.value = 'ALL';

    renderWbsTab();
    if (window.showToast) window.showToast('รีเซ็ตตัวกรองในตาราง WBS เรียบร้อยแล้ว', 'info');
  };

  /**
   * Copy single WBS Code
   */
  window.copyWbsCode = function (code) {
    copyTextToClipboard(code, `คัดลอกรหัส WBS: ${code} เรียบร้อยแล้ว`);
  };

  /**
   * Copy All Filtered WBS Codes (Newline Separated)
   */
  window.copyFilteredWbsCodes = function () {
    const filtered = getFilteredWbsData();
    if (!filtered.length) {
      if (window.showToast) window.showToast('ไม่พบรายการ WBS ที่กรองไว้', 'warning');
      return;
    }

    const codes = filtered.map(i => i.wbs).filter(Boolean);
    const text = codes.join('\n');
    copyTextToClipboard(text, `คัดลอกรหัส WBS ทั้งหมด ${codes.length.toLocaleString('th-TH')} รายการ เรียบร้อยแล้ว`);
  };

  /**
   * Export Filtered WBS Records to CSV (with UTF-8 BOM for Thai support in Excel)
   */
  window.exportWbsToCsv = function () {
    const filtered = getFilteredWbsData();
    if (!filtered.length) {
      if (window.showToast) window.showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
      return;
    }

    const orderedDefs = getOrderedColDefs();
    const exportCols = orderedDefs.filter(c => wbsState.visibleColumns[c.id]);
    const headers = exportCols.map(c => `"${c.label.replace(/"/g, '""')}"`);

    const rows = filtered.map((item, idx) => {
      return exportCols.map(c => {
        if (c.id === 'id') return idx + 1;
        const val = item[c.id];
        if (val === null || val === undefined) return '""';
        if (c.isPercent || c.id === 'pctMatWithdraw' || c.id === 'pctExpenseWithdraw') {
          const raw = Number(val);
          const p = isNaN(raw) ? 0 : (raw <= 1 && raw > 0 ? raw * 100 : raw);
          return `"${p.toFixed(2)}%"`;
        }
        if (c.isMoney) {
          const num = Number(val);
          return isNaN(num) ? `"${String(val).replace(/"/g, '""')}"` : num.toFixed(2);
        }
        return `"${String(val).replace(/"/g, '""')}"`;
      }).join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    link.setAttribute('download', `PEA_AUC_WBS_Remaining_Merged_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (window.showToast) {
      window.showToast(`ส่งออกข้อมูล WBS สำเร็จ ${filtered.length.toLocaleString('th-TH')} รายการ (${exportCols.length} คอลัมน์)`, 'success');
    }
  };

  /**
   * Helper: Parse File 04 rows into a Map keyed by WBS code
   */
  function parseFile04RowsToMap(rows, headerRow, wbsIdx) {
    const toNum = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = Number(String(v).replace(/,/g, ''));
      return isNaN(n) ? 0 : Math.round(n * 100) / 100;
    };

    const descIdx = headerRow.findIndex(h => h.includes('คำอธิบาย') || h.includes('ภาษาไทย') || h.includes('ชื่อ'));
    const statusIdx = headerRow.findIndex(h => h.toUpperCase().includes('STATUS') || h.includes('สถานะ'));
    const lvIdx = headerRow.findIndex(h => h.toUpperCase() === 'LV' || h.includes('ระดับ'));
    const origBudgetIdx = headerRow.findIndex(h => h.includes('ต้นแบบ'));
    const currBudgetIdx = headerRow.findIndex(h => h.includes('ปัจจุบัน'));
    const allocIdx = headerRow.findIndex(h => h.includes('จัดสรร'));
    const distIdx = headerRow.findIndex(h => h.includes('กระจายได้'));
    const prPoIdx = headerRow.findIndex(h => h.toUpperCase().includes('PR/PO') || h.toUpperCase().includes('PR'));
    const act121Idx = headerRow.findIndex(h => h.includes('121'));
    const actCheckIdx = headerRow.findIndex(h => h.includes('เช็คงบ') && !h.includes('ไม่'));
    const actPostIdx = headerRow.findIndex(h => h.includes('Post') || h.includes('2016'));
    const actNoCheckIdx = headerRow.findIndex(h => h.includes('ไม่เช็คงบ'));
    const actSiteIdx = headerRow.findIndex(h => h.includes('วัสดุเข้างาน'));
    const actLaborIdx = headerRow.findIndex(h => h.includes('จ้างเหมา'));
    const actCoordIdx = headerRow.findIndex(h => h.includes('ประสานงาน'));
    const actOtherSiteIdx = headerRow.findIndex(h => h.includes('หน้างานอื่นๆ'));
    const actTotalIdx = headerRow.findIndex(h => h.includes('รวม Act') || h.includes('ทั้งหมดที่ควบคุม'));
    const remainIdx = headerRow.findIndex(h => h.includes('งบประมาณคงเหลือ'));
    const planMatIdx = headerRow.findIndex(h => h.includes('Plan') && h.includes('วัสดุ') && !h.includes('เข้างาน'));
    const pctMatIdx = headerRow.findIndex(h => h.includes('เบิกพัสดุ') || h.includes('% พัสดุ') || h.includes('%พัสดุ'));
    const planMatSiteIdx = headerRow.findIndex(h => h.includes('Plan') && h.includes('เข้างาน'));
    const planSiteIdx = headerRow.findIndex(h => h.includes('Plan') && h.includes('หน้างาน'));
    const pctExpenseIdx = headerRow.findIndex(h => h.includes('เบิก คชจ') || h.includes('เบิกคชจ') || h.includes('% คชจ') || h.includes('%คชจ'));
    const apprSiteIdx = headerRow.findIndex(h => h.includes('อนุมัติ'));

    const map = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const w = row[wbsIdx] ? String(row[wbsIdx]).trim() : '';
      if (!w) continue;

      const actNoCheck = actNoCheckIdx !== -1 ? toNum(row[actNoCheckIdx]) : 0;
      const planMat = planMatIdx !== -1 ? toNum(row[planMatIdx]) : 0;
      let pctMatWithdraw = 0;
      if (pctMatIdx !== -1 && row[pctMatIdx] !== null && row[pctMatIdx] !== undefined && row[pctMatIdx] !== '') {
        const rawPct = toNum(row[pctMatIdx]);
        pctMatWithdraw = rawPct <= 1.0 && rawPct > 0 ? Number((rawPct * 100).toFixed(2)) : Number(rawPct.toFixed(2));
      } else if (planMat > 0) {
        pctMatWithdraw = Number(((actNoCheck / planMat) * 100).toFixed(2));
      }

      const planSite = planSiteIdx !== -1 ? toNum(row[planSiteIdx]) : 0;
      const actTotalCtrl = actTotalIdx !== -1 ? toNum(row[actTotalIdx]) : 0;
      let pctExpenseWithdraw = 0;
      if (pctExpenseIdx !== -1 && row[pctExpenseIdx] !== null && row[pctExpenseIdx] !== undefined && row[pctExpenseIdx] !== '') {
        const rawPctE = toNum(row[pctExpenseIdx]);
        pctExpenseWithdraw = rawPctE <= 1.0 && rawPctE > 0 ? Number((rawPctE * 100).toFixed(2)) : Number(rawPctE.toFixed(2));
      } else if (planSite > 0) {
        pctExpenseWithdraw = Number(((actTotalCtrl / planSite) * 100).toFixed(2));
      }

      const rawStatus = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : '';
      map.set(w, {
        description: descIdx !== -1 && row[descIdx] ? String(row[descIdx]).trim() : '',
        statusSap: formatSapStatusShort(rawStatus),
        status: rawStatus,
        level: lvIdx !== -1 ? toNum(row[lvIdx]) : 3,
        budgetOrigin: origBudgetIdx !== -1 ? toNum(row[origBudgetIdx]) : 0,
        budgetCurrent: currBudgetIdx !== -1 ? toNum(row[currBudgetIdx]) : 0,
        budgetAlloc: allocIdx !== -1 ? toNum(row[allocIdx]) : 0,
        budgetDist: distIdx !== -1 ? toNum(row[distIdx]) : 0,
        prPo: prPoIdx !== -1 ? toNum(row[prPoIdx]) : 0,
        actMat121: act121Idx !== -1 ? toNum(row[act121Idx]) : 0,
        actMatCheck: actCheckIdx !== -1 ? toNum(row[actCheckIdx]) : 0,
        actMatPost: actPostIdx !== -1 ? toNum(row[actPostIdx]) : 0,
        actMatNoCheck: actNoCheck,
        actMatSite: actSiteIdx !== -1 ? toNum(row[actSiteIdx]) : 0,
        actLabor: actLaborIdx !== -1 ? toNum(row[actLaborIdx]) : 0,
        actCoord: actCoordIdx !== -1 ? toNum(row[actCoordIdx]) : 0,
        actOtherSite: actOtherSiteIdx !== -1 ? toNum(row[actOtherSiteIdx]) : 0,
        actTotalCtrl: actTotalCtrl,
        budgetRemain: remainIdx !== -1 ? toNum(row[remainIdx]) : 0,
        planMat: planMat,
        pctMatWithdraw: pctMatWithdraw,
        planMatSite: planMatSiteIdx !== -1 ? toNum(row[planMatSiteIdx]) : 0,
        planSite: planSite,
        pctExpenseWithdraw: pctExpenseWithdraw,
        apprSite: apprSiteIdx !== -1 ? toNum(row[apprSiteIdx]) : 0
      });
    }
    return map;
  }

  /**
   * Helper: Parse File 05 rows into a Map keyed by WBS code
   */
  function parseFile05RowsToMap(rows, headerRow, wbsIdx) {
    const toNum = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = Number(String(v).replace(/,/g, ''));
      return isNaN(n) ? 0 : Math.round(n * 100) / 100;
    };

    const rowIdx = headerRow.findIndex(h => h === '.' || h.includes('ลำดับ'));
    const lvIdx = headerRow.findIndex(h => h.includes('ระดับ'));
    const objDescIdx = headerRow.findIndex(h => h.includes('ออบเจค'));

    let costIdx = -1;
    let currIdx = -1;
    for (let c = 0; c < headerRow.length; c++) {
      const h = headerRow[c];
      if (h.includes('ต้นทุนจริง') || h.includes('มูลค่า') || h.includes('AUC')) {
        if (costIdx === -1) {
          costIdx = c;
        } else if (currIdx === -1) {
          currIdx = c;
        }
      }
    }
    if (currIdx === -1) {
      currIdx = headerRow.findIndex(h => h.includes('สกุล') || h.toUpperCase().includes('CURRENCY') || h === 'THB');
    }

    const map = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const w = row[wbsIdx] ? String(row[wbsIdx]).trim() : '';
      if (!w) continue;

      map.set(w, {
        cn41Row: rowIdx !== -1 && row[rowIdx] ? String(row[rowIdx]).trim() : '',
        cn41Level: lvIdx !== -1 && row[lvIdx] ? String(row[lvIdx]).trim() : '',
        cn41ObjDesc: objDescIdx !== -1 && row[objDescIdx] ? String(row[objDescIdx]).trim() : '',
        cn41ActualCost: costIdx !== -1 ? toNum(row[costIdx]) : 0,
        cn41Currency: currIdx !== -1 && row[currIdx] ? String(row[currIdx]).trim() : 'THB'
      });
    }
    return map;
  }

  /**
   * Helper: Parse File 06 rows into a Map keyed by WBS code (Google Sheet แผนงานแล้วเสร็จ)
   */
  function parseFile06RowsToMap(rows, headerRow, wbsIdx) {
    const planIdx = headerRow.findIndex(h => h.includes('แผนปิดงาน') || h.includes('แผนงานแล้วเสร็จ') || h.includes('แผนปิด'));
    const noteIdx = headerRow.findIndex(h => h.includes('หมายเหตุ') || h.includes('Remark') || h.includes('Note'));

    const map = new Map();
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const w = row[wbsIdx] ? String(row[wbsIdx]).trim() : '';
      if (!w) continue;

      const p = planIdx !== -1 && row[planIdx] ? String(row[planIdx]).trim() : '';
      const n = noteIdx !== -1 && row[noteIdx] ? String(row[noteIdx]).trim() : '';

      if (map.has(w)) {
        const ex = map.get(w);
        if (p && !ex.planClose.includes(p)) {
          ex.planClose = ex.planClose ? `${ex.planClose}, ${p}` : p;
        }
        if (n && !ex.note.includes(n)) {
          ex.note = ex.note ? `${ex.note}, ${n}` : n;
        }
      } else {
        map.set(w, {
          planClose: p,
          note: n
        });
      }
    }
    return map;
  }

  /**
   * Live Parse Uploaded WBS Excel File (Supports File 03, File 04 ZBUDR064, File 05 CN41, and File 06 Google Sheet)
   */
  window.handleWbsExcelBuffer = function (buffer, fileName) {
    if (!window.XLSX) {
      console.error('SheetJS (XLSX) library not found');
      return false;
    }

    try {
      const wb = window.XLSX.read(buffer, { type: 'array' });
      const firstSheetName = wb.SheetNames[0];
      const ws = wb.Sheets[firstSheetName];
      const rows = window.XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      if (!rows || rows.length < 2) {
        if (window.showToast) window.showToast('ไฟล์ Excel ไม่มีข้อมูลในแถว', 'warning');
        return false;
      }

      // Detect header row
      const headerRow = rows[0].map(h => String(h).trim());
      const wbsIdx = headerRow.findIndex(h => h.toUpperCase().includes('WBS') || h.includes('โครงการ'));
      if (wbsIdx === -1) {
        return false; // Not a WBS file
      }

      const lowerFile = (fileName || '').toLowerCase();

      // Case A: File 05 (CN41)
      const is05 = headerRow.some(h => h.includes('ออบเจคโครงการ') || h.includes('ต้นทุนจริง')) || lowerFile.includes('05') || lowerFile.includes('cn41');
      if (is05 && !headerRow.some(h => h.includes('งบประมาณต้นแบบ') || h.includes('121*'))) {
        const map05 = parseFile05RowsToMap(rows, headerRow, wbsIdx);
        window.AUC_WBS_05_MAP = map05;

        if (window.AUC_WBS_REMAINING_DATA && Array.isArray(window.AUC_WBS_REMAINING_DATA)) {
          let matched = 0;
          window.AUC_WBS_REMAINING_DATA.forEach(item => {
            const w = (item.wbs || '').trim();
            if (map05.has(w)) {
              Object.assign(item, map05.get(w));
              matched++;
            }
          });
          renderWbsTab();
          if (window.showToast) {
            window.showToast(`🎉 ผสานข้อมูลไฟล์ 05 WBS CN41 (${map05.size.toLocaleString()} รายการ) เข้ากับไฟล์ 03 WBS สำเร็จ (ตรงกัน ${matched.toLocaleString()} รายการ)`, 'success');
          }
          return true;
        }
      }

      // Case B: File 04 (ZBUDR064)
      const is04 = headerRow.some(h =>
        h.includes('Status') || h.includes('สถานะ') || h.includes('งบประมาณต้นแบบ') ||
        h.includes('121*') || h.includes('ZBUDR')
      ) || lowerFile.includes('04');

      if (is04) {
        const map04 = parseFile04RowsToMap(rows, headerRow, wbsIdx);
        window.AUC_WBS_04_MAP = map04;

        if (window.AUC_WBS_REMAINING_DATA && Array.isArray(window.AUC_WBS_REMAINING_DATA)) {
          let matched = 0;
          window.AUC_WBS_REMAINING_DATA.forEach(item => {
            const w = (item.wbs || '').trim();
            if (map04.has(w)) {
              Object.assign(item, map04.get(w));
              matched++;
            }
          });
          renderWbsTab();
          if (window.showToast) {
            window.showToast(`🎉 ผสานข้อมูลไฟล์ 04 WBS ZBUDR064 (${map04.size.toLocaleString()} รายการ) เข้ากับไฟล์ 03 WBS สำเร็จ (ตรงกัน ${matched.toLocaleString()} รายการ)`, 'success');
          }
          return true;
        }
      }

      // Case D: File 06 (Google Sheet แผนงานแล้วเสร็จ)
      const is06 = headerRow.some(h => h.includes('แผนปิดงาน') || h.includes('แผนงานแล้วเสร็จ')) || lowerFile.includes('06') || lowerFile.includes('google sheet') || lowerFile.includes('แผนงานแล้วเสร็จ');
      if (is06 && !headerRow.some(h => h.includes('งบประมาณต้นแบบ') || h.includes('ต้นทุนจริง'))) {
        const map06 = parseFile06RowsToMap(rows, headerRow, wbsIdx);
        window.AUC_WBS_06_MAP = map06;

        if (window.AUC_WBS_REMAINING_DATA && Array.isArray(window.AUC_WBS_REMAINING_DATA)) {
          let matched = 0;
          window.AUC_WBS_REMAINING_DATA.forEach(item => {
            const w = (item.wbs || '').trim();
            if (map06.has(w)) {
              Object.assign(item, map06.get(w));
              matched++;
            }
          });
          renderWbsTab();
          if (window.showToast) {
            window.showToast(`🎉 ผสานข้อมูลไฟล์ 06 แผนงานแล้วเสร็จ (${map06.size.toLocaleString()} รายการ) เข้ากับไฟล์ 03 WBS สำเร็จ (ตรงกัน ${matched.toLocaleString()} รายการ)`, 'success');
          }
          return true;
        }
      }

      // Case C: File 03 (Base Master Table)
      const critIdx = headerRow.findIndex(h => h.includes('เกณฑ์'));
      const provIdx = headerRow.findIndex(h => h.includes('พื้นที่'));
      const offIdx = headerRow.findIndex(h => h.includes('กอง') || h.includes('กฟฟ'));
      const budgetIdx = headerRow.findIndex(h => h === 'งบ' || h.includes('งบประมาณ'));
      const engIdx = headerRow.findIndex(h => h.includes('ช่าง'));
      const deptIdx = headerRow.findIndex(h => h.includes('สังกัด'));
      const typeIdx = headerRow.findIndex(h => h === 'ประเภท');

      const records = [];
      const map04 = window.AUC_WBS_04_MAP;
      const map05 = window.AUC_WBS_05_MAP;
      const map06 = window.AUC_WBS_06_MAP;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const wbs = row[wbsIdx] ? String(row[wbsIdx]).trim() : '';
        if (!wbs) continue;

        const baseItem = {
          id: records.length + 1,
          criteria: critIdx !== -1 && row[critIdx] ? String(row[critIdx]).trim() : '',
          province: provIdx !== -1 && row[provIdx] ? String(row[provIdx]).trim() : '',
          office: offIdx !== -1 && row[offIdx] ? String(row[offIdx]).trim() : '',
          budget: budgetIdx !== -1 && row[budgetIdx] ? String(row[budgetIdx]).trim() : '',
          wbs: wbs,
          engineer: engIdx !== -1 && row[engIdx] ? String(row[engIdx]).trim() : '',
          department: deptIdx !== -1 && row[deptIdx] ? String(row[deptIdx]).trim() : '',
          type: typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).trim() : ''
        };

        // Left Join File 04 if present
        if (map04 && map04.has(wbs)) {
          Object.assign(baseItem, map04.get(wbs));
        }

        // Left Join File 05 if present
        if (map05 && map05.has(wbs)) {
          Object.assign(baseItem, map05.get(wbs));
        }

        // Left Join File 06 if present
        if (map06 && map06.has(wbs)) {
          Object.assign(baseItem, map06.get(wbs));
        }

        records.push(baseItem);
      }

      if (records.length > 0) {
        window.AUC_WBS_REMAINING_DATA = records;
        renderWbsTab();
        if (window.showToast) {
          window.showToast(`🎉 โหลดไฟล์ 03 WBS สำเร็จ ${records.length.toLocaleString('th-TH')} รายการ จาก ${fileName}`, 'success');
        }
        return true;
      }
    } catch (err) {
      console.error('Error parsing WBS Excel buffer:', err);
    }
    return false;
  };

  /**
   * Setup Event Listeners
   */
  function setupWbsListeners() {
    // 1. In-table Search Input
    const sInput = document.getElementById('wbsTableSearchInput');
    if (sInput) {
      let debounceTimer = null;
      sInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          wbsState.search = e.target.value;
          wbsState.page = 1;
          renderWbsTab();
        }, 180);
      });
    }

    // 2. In-table Budget Dropdown
    const bSelect = document.getElementById('wbsBudgetFilterSelect');
    if (bSelect) {
      bSelect.addEventListener('change', (e) => {
        wbsState.budget = e.target.value;
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    // 2.1 In-table Office Dropdown (กอง / กฟฟ.)
    const oSelect = document.getElementById('wbsOfficeFilterSelect');
    if (oSelect) {
      oSelect.addEventListener('change', (e) => {
        wbsState.office = e.target.value;
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    // 3. In-table Engineer Dropdown
    const eSelect = document.getElementById('wbsEngineerFilterSelect');
    if (eSelect) {
      eSelect.addEventListener('change', (e) => {
        wbsState.engineer = e.target.value;
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    // 3.1. In-table Plan Close Dropdown (File 06)
    const pcSelect = document.getElementById('wbsPlanCloseFilterSelect');
    if (pcSelect) {
      pcSelect.addEventListener('change', (e) => {
        wbsState.planClose = e.target.value;
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    // 4. Page Size Dropdown
    const pSelect = document.getElementById('wbsPageSizeSelect');
    if (pSelect) {
      pSelect.addEventListener('change', (e) => {
        wbsState.pageSize = Number(e.target.value) || 25;
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    // 5. Connect to Top Global Filter Controls
    const topCrit = document.getElementById('filterCriteria');
    if (topCrit) {
      topCrit.addEventListener('change', () => {
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    const topProv = document.getElementById('filterProvince');
    if (topProv) {
      topProv.addEventListener('change', () => {
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    const topOff = document.getElementById('filterOffice');
    if (topOff) {
      topOff.addEventListener('change', () => {
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    const topSearch = document.getElementById('searchInput');
    if (topSearch) {
      topSearch.addEventListener('input', () => {
        wbsState.page = 1;
        renderWbsTab();
      });
    }

    const topMonth = document.getElementById('filterMonth');
    if (topMonth) {
      topMonth.addEventListener('change', () => {
        renderWbsTab();
      });
    }

    const btnResetTop = document.getElementById('btnResetFilters');
    if (btnResetTop) {
      btnResetTop.addEventListener('click', () => {
        wbsState.search = '';
        wbsState.budget = 'ALL';
        wbsState.office = 'ALL';
        wbsState.engineer = 'ALL';
        wbsState.page = 1;
        const sInput = document.getElementById('wbsTableSearchInput');
        if (sInput) sInput.value = '';
        const bSelect = document.getElementById('wbsBudgetFilterSelect');
        if (bSelect) bSelect.value = 'ALL';
        const oSelect = document.getElementById('wbsOfficeFilterSelect');
        if (oSelect) oSelect.value = 'ALL';
        const eSelect = document.getElementById('wbsEngineerFilterSelect');
        if (eSelect) eSelect.value = 'ALL';
        setTimeout(() => renderWbsTab(), 50);
      });
    }

    // Initialize Left-side Table Scrollbar
    initWbsLeftScrollbar();
  }

  /* ==========================================================================
   * 1. LEFT-SIDE TABLE SCROLLBAR (แถบสไลด์ฝั่งซ้ายของตาราง WBS)
   * ========================================================================== */
  function initWbsLeftScrollbar() {
    const wrapper = document.getElementById('wbsTableScrollWrapper');
    const scrollbar = document.getElementById('wbsLeftScrollbar');
    const track = document.getElementById('wbsLeftScrollbarTrack');
    const thumb = document.getElementById('wbsLeftScrollbarThumb');
    const btnToTop = document.getElementById('btnWbsLeftScrollToTop');
    const btnToBottomTop = document.getElementById('btnWbsLeftScrollToBottomTopGroup');
    const btnUp = document.getElementById('btnWbsLeftScrollUp');
    const btnDown = document.getElementById('btnWbsLeftScrollDown');
    const btnToTopBottom = document.getElementById('btnWbsLeftScrollToTopBottomGroup');
    const btnToBottom = document.getElementById('btnWbsLeftScrollToBottom');
    const tableEl = document.getElementById('wbsTableResponsive');

    if (!scrollbar || !track || !thumb || !tableEl) return;

    window.scrollWbsTableToTop = function () {
      const table = document.getElementById('wbsTableResponsive');
      if (table) table.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.scrollWbsTableToBottom = function () {
      const table = document.getElementById('wbsTableResponsive');
      if (table) table.scrollTo({ top: table.scrollHeight, behavior: 'smooth' });
    };

    window.scrollWbsTableStepUp = function () {
      const table = document.getElementById('wbsTableResponsive');
      if (table) table.scrollBy({ top: -160, behavior: 'smooth' });
    };

    window.scrollWbsTableStepDown = function () {
      const table = document.getElementById('wbsTableResponsive');
      if (table) table.scrollBy({ top: 160, behavior: 'smooth' });
    };

    let isDragging = false;
    let startY = 0;
    let startScrollTop = 0;

    function updateScrollbar() {
      const clientH = tableEl.clientHeight;
      const scrollH = tableEl.scrollHeight;
      const trackH = track.clientHeight;

      if (scrollH <= clientH || trackH <= 0) {
        scrollbar.classList.add('is-disabled');
        thumb.style.display = 'none';
        return;
      }

      scrollbar.classList.remove('is-disabled');
      thumb.style.display = 'flex';

      const thumbH = Math.max(26, Math.round((clientH / scrollH) * trackH));
      const maxScroll = scrollH - clientH;
      const maxTrack = Math.max(1, trackH - thumbH);
      const ratio = maxScroll > 0 ? Math.min(1, Math.max(0, tableEl.scrollTop / maxScroll)) : 0;

      thumb.style.height = `${thumbH}px`;
      thumb.style.top = `${ratio * maxTrack}px`;
    }

    window.updateWbsLeftScrollbar = updateScrollbar;

    // Listen to table scroll
    tableEl.addEventListener('scroll', () => {
      if (!isDragging) updateScrollbar();
    }, { passive: true });

    // Thumb dragging using Pointer Events (Mouse + Touch)
    thumb.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      isDragging = true;
      startY = e.clientY;
      startScrollTop = tableEl.scrollTop;
      thumb.classList.add('is-dragging');
      try { thumb.setPointerCapture(e.pointerId); } catch (_) {}
    });

    thumb.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const deltaY = e.clientY - startY;
      const clientH = tableEl.clientHeight;
      const scrollH = tableEl.scrollHeight;
      const trackH = track.clientHeight;
      const thumbH = thumb.offsetHeight;
      const maxScroll = scrollH - clientH;
      const maxTrack = trackH - thumbH;

      if (maxTrack > 0 && maxScroll > 0) {
        const scrollDelta = (deltaY / maxTrack) * maxScroll;
        tableEl.scrollTop = Math.min(maxScroll, Math.max(0, startScrollTop + scrollDelta));
        updateScrollbar();
      }
    });

    const stopDrag = (e) => {
      if (isDragging) {
        isDragging = false;
        thumb.classList.remove('is-dragging');
        try { thumb.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };
    thumb.addEventListener('pointerup', stopDrag);
    thumb.addEventListener('pointercancel', stopDrag);

    // Clicking track outside thumb jumps
    track.addEventListener('pointerdown', (e) => {
      if (e.target === thumb || thumb.contains(e.target)) return;
      e.preventDefault();
      const trackRect = track.getBoundingClientRect();
      const clickY = e.clientY - trackRect.top;
      const thumbH = thumb.offsetHeight;
      const trackH = trackRect.height;
      const maxTrack = trackH - thumbH;
      const targetRatio = Math.min(1, Math.max(0, (clickY - thumbH / 2) / maxTrack));
      const maxScroll = tableEl.scrollHeight - tableEl.clientHeight;
      tableEl.scrollTo({
        top: targetRatio * maxScroll,
        behavior: 'smooth'
      });
    });

    // 1. ปุ่มไปบนสุด (Top group)
    if (btnToTop) {
      btnToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableToTop();
      });
    }

    // 2. ปุ่มไปล่างสุด (Top group)
    if (btnToBottomTop) {
      btnToBottomTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableToBottom();
      });
    }

    // 3. Step up button
    if (btnUp) {
      btnUp.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableStepUp();
      });
    }

    // 4. Step down button
    if (btnDown) {
      btnDown.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableStepDown();
      });
    }

    // 5. ปุ่มไปบนสุด (Bottom group)
    if (btnToTopBottom) {
      btnToTopBottom.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableToTop();
      });
    }

    // 6. ปุ่มไปล่างสุด (Bottom group)
    if (btnToBottom) {
      btnToBottom.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollWbsTableToBottom();
      });
    }

    // Wheel event on scrollbar itself
    scrollbar.addEventListener('wheel', (e) => {
      e.preventDefault();
      tableEl.scrollTop += e.deltaY;
    }, { passive: false });

    // Initial update
    setTimeout(updateScrollbar, 60);

    // ResizeObserver on table and wrapper
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(() => updateScrollbar());
      ro.observe(tableEl);
      if (wrapper) ro.observe(wrapper);
    }
  }

  // Expose global functions
  window.renderWbsTab = renderWbsTab;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupWbsListeners();
      renderWbsTab();
    });
  } else {
    setupWbsListeners();
    renderWbsTab();
  }

})();
