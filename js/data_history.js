/**
 * PEA AUC Dashboard - Data Import & Modification History Module (Audit Log & Model View)
 * ระบบแสดงประวัติวันที่การนำเข้าข้อมูล บันทึกการแก้ไขข้อมูล และผัง Model View การจัดเก็บข้อมูล
 */

(function () {
  'use strict';

  // Storage key for persistent user-added or dynamic logs
  const STORAGE_CUSTOM_LOGS_KEY = 'AUC_DATA_HISTORY_CUSTOM_LOGS_V1';

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
   * Helper: Copy text to clipboard
   */
  window.copyTextToClipboard = window.copyTextToClipboard || function (text, msg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast(msg || 'คัดลอกเรียบร้อยแล้ว', 'success');
      }).catch(() => fallbackCopy(text, msg));
    } else {
      fallbackCopy(text, msg);
    }
  };

  function copyTextToClipboard(text, msg) {
    if (window.copyTextToClipboard) window.copyTextToClipboard(text, msg);
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
   * Catalog of all Data Source Files and their mapped System Storage Files
   */
  const DATA_SOURCE_CATALOG = [
    {
      id: 'src_03',
      groupNo: '03',
      name: '03 WBSงานคงเหลือเดือนล่าสุด.xlsx',
      category: 'WBS Base Database',
      importDate: '2026-10-17 13:20:29',
      importDateTh: '17 ต.ค. 2569, 13:20 น.',
      lastModifiedTh: '17 ต.ค. 2569, 13:20 น.',
      sizeText: '5.74 MB',
      recordCount: 2968,
      status: 'active',
      statusText: 'ใช้งานอยู่ (หลัก)',
      storageFile: 'js/data_wbs.js',
      storageVar: 'window.AUC_WBS_REMAINING_DATA',
      icon: '📋',
      badgeColor: '#EC4899',
      description: 'ฐานข้อมูลงานก่อสร้าง WBS คงเหลือทั้งหมดของ กฟก.3 ผสานร่วมกับ ZBUDR064 และ CN41 เพื่อใช้ติดตามงาน AUC คงเหลือรายโครงการ',
      columns: [
        'id (ลำดับ)', 'wbs (เลขที่งาน WBS)', 'criteria (ประเภทเกณฑ์วัด)', 'province (พื้นที่/จังหวัด)',
        'office (กอง / กฟฟ.)', 'budget (ประเภทงบ)', 'engineer (ช่างคุมงาน)', 'department (สังกัด)', 'type (ประเภทงาน)'
      ],
      sampleProvider: () => (window.AUC_WBS_REMAINING_DATA || []).slice(0, 5).map(r => ({
        'WBS': r.wbs || '-',
        'กฟฟ.': r.office || '-',
        'ชื่องาน': r.description || '-',
        'สถานะ SAP': r.statusSap || '-',
        'มูลค่า AUC': (Number(r.cn41ActualCost) || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        'ช่างคุมงาน': r.engineer || '-'
      }))
    },
    {
      id: 'src_04',
      groupNo: '04',
      name: '04 WBS ZBUDR064 %พัสดุและค่าแรงและสถานะsap.xlsx',
      category: 'SAP ZBUDR064 & Costs',
      importDate: '2026-10-19 08:34:34',
      importDateTh: '19 ต.ค. 2569, 08:34 น.',
      lastModifiedTh: '19 ต.ค. 2569, 08:34 น.',
      sizeText: '731.4 KB',
      recordCount: 2968,
      status: 'active',
      statusText: 'ผสานข้อมูลสำเร็จ',
      storageFile: 'js/data_wbs.js',
      storageVar: 'window.AUC_WBS_REMAINING_DATA (Joined)',
      icon: '⚡',
      badgeColor: '#8B5CF6',
      description: 'ข้อมูลรายงาน SAP ZBUDR064 ประกอบด้วย งบประมาณต้นแบบ/ปัจจุบัน, ค่าใช้จ่ายจริง Actual (ค่าพัสดุ 121, ค่าจ้างเหมา, ค่าประสานงาน), แผนงาน Plan และสถานะ SAP เต็ม (REL, TECO, CLSD)',
      columns: [
        'description (ชื่องาน)', 'statusSap (สถานะ SAP ย่อ)', 'status (สถานะเต็ม SAP)', 'level (ระดับ)',
        'budgetOrigin', 'budgetCurrent', 'budgetAlloc', 'actTotalCtrl', 'actMat121', 'pctMatWithdraw', 'pctExpenseWithdraw'
      ],
      sampleProvider: () => (window.AUC_WBS_REMAINING_DATA || []).slice(0, 5).map(r => ({
        'WBS': r.wbs,
        'สถานะเต็ม': r.status || '-',
        'สถานะย่อ': r.statusSap || '-',
        '% เบิกพัสดุ': (r.pctMatWithdraw || 0).toFixed(2) + '%',
        '% เบิก คชจ.': (r.pctExpenseWithdraw || 0).toFixed(2) + '%',
        'งบปัจจุบัน': (r.budgetCurrent || 0).toLocaleString('th-TH')
      }))
    },
    {
      id: 'src_05',
      groupNo: '05',
      name: '05 WBS CN41 มูลค่า AUC new.xlsx',
      category: 'SAP CN41 AUC Values',
      importDate: '2026-09-22 10:20:29',
      importDateTh: '22 ก.ย. 2569, 10:20 น.',
      lastModifiedTh: '22 ก.ย. 2569, 10:20 น.',
      sizeText: '345.5 KB',
      recordCount: 2968,
      status: 'active',
      statusText: 'ผสานข้อมูลสำเร็จ',
      storageFile: 'js/data_wbs.js',
      storageVar: 'window.AUC_WBS_REMAINING_DATA.cn41ActualCost',
      icon: '📑',
      badgeColor: '#F59E0B',
      description: 'รายงาน SAP CN41 ระบุต้นทุนจริงและมูลค่า AUC สะสม (บาท) ของแต่ละโครงการ สำหรับวิเคราะห์มูลค่าสินทรัพย์ระหว่างก่อสร้าง',
      columns: [
        'cn41ActualCost (มูลค่า AUC บาท)', 'cn41ObjDesc (ออบเจคโครงการ)', 'cn41Level (ระดับ)',
        'cn41Currency (สกุลเงิน THB)', 'cn41Row (ลำดับแถว)'
      ],
      sampleProvider: () => (window.AUC_WBS_REMAINING_DATA || []).slice(0, 5).map(r => ({
        'WBS': r.wbs,
        'มูลค่า AUC (บาท)': (r.cn41ActualCost || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        'ออบเจค CN41': r.cn41ObjDesc || '-',
        'สกุลเงิน': r.cn41Currency || 'THB'
      }))
    },
    {
      id: 'src_06',
      groupNo: '06',
      name: '06  google sheet แผนงานแล้วเสร็จ.xlsx',
      category: 'Google Sheet Field Plans',
      importDate: '2026-09-22 10:17:00',
      importDateTh: '22 ก.ย. 2569, 10:17 น.',
      lastModifiedTh: '22 ก.ย. 2569, 10:17 น.',
      sizeText: '127.3 KB',
      recordCount: 2028,
      status: 'active',
      statusText: 'ผสานข้อมูลสำเร็จ',
      storageFile: 'js/data_wbs.js',
      storageVar: 'window.AUC_WBS_REMAINING_DATA (planClose & note)',
      icon: '📅',
      badgeColor: '#10B981',
      description: 'ข้อมูลแผนปิดงานและหมายเหตุความคืบหน้าหน้างานจาก Google Sheet แผนงานแล้วเสร็จของช่างคุมงานแต่ละ กฟฟ.',
      columns: [
        'planClose (แผนปิดงาน เช่น งวดบัญชี สค, กย, ตค)',
        'note (หมายเหตุข้อเท็จจริงหน้างาน/การส่งมอบพื้นที่/เบิกพัสดุ)'
      ],
      sampleProvider: () => (window.AUC_WBS_REMAINING_DATA || []).filter(r => r.planClose || r.note).slice(0, 5).map(r => ({
        'WBS': r.wbs,
        'แผนปิดงาน': r.planClose || 'ไม่ระบุ',
        'หมายเหตุหน้างาน': r.note || '-'
      }))
    },
    {
      id: 'src_02',
      groupNo: '02',
      name: '02 KPI.xlsx',
      category: 'KPI Targets & Matrix',
      importDate: '2026-10-03 09:30:00',
      importDateTh: '3 ต.ค. 2569, 09:30 น.',
      lastModifiedTh: '15 ต.ค. 2569, 17:52 น.',
      sizeText: '17.4 KB',
      recordCount: 8,
      status: 'active',
      statusText: 'เกณฑ์วัด 2569',
      storageFile: 'js/kpi_matrix.js',
      storageVar: 'window.KPI_MATRIX & localStorage (AUC_SAVED_KPI_MATRIX)',
      icon: '🎯',
      badgeColor: '#3B82F6',
      description: 'ตารางเกณฑ์วัด KPI ประจำปี 2569 ทั้ง 3 หมวด (ข้อ 1.1 - 1.3 งานก่อนปี 69, ข้อ 2.1 งานปี 69, ข้อ 3.1 - 3.3 งานปิด TECO)',
      columns: [
        'id', 'criteria (ชื่อเกณฑ์วัด)', 'targetPercentage (เป้าหมาย %)', 'weight (น้ำหนักคะแนน)',
        'monthlyTargets (เป้าสะสมรายเดือน ม.ค. - ธ.ค.)'
      ],
      sampleProvider: () => (window.KPI_MATRIX || []).slice(0, 5).map(k => ({
        'รหัส': k.id || '-',
        'เกณฑ์วัด': k.criteria || k.name || '-',
        'เป้าหมาย': (k.target || k.targetPercentage || 100) + '%',
        'น้ำหนัก': (k.weight || '-') + '%'
      }))
    },
    {
      id: 'src_01_aug',
      groupNo: '01',
      name: '01 รายงาน AUC เดือน 8ส.ค.  (3.2&3.3teco).xlsx',
      category: 'Monthly AUC Executive Report',
      importDate: '2026-09-29 16:55:00',
      importDateTh: '29 ก.ย. 2569, 16:55 น.',
      lastModifiedTh: '29 ก.ย. 2569, 16:55 น.',
      sizeText: '50.2 KB',
      recordCount: 368,
      status: 'active',
      statusText: 'ข้อมูลเดือนล่าสุด (ส.ค.)',
      storageFile: 'js/data_aug.js',
      storageVar: 'window.AUC_DATA_AUG (Active Month: ส.ค. 2569)',
      icon: '📊',
      badgeColor: '#6366F1',
      description: 'รายงานผลการติดตามงานก่อสร้างและขึ้นทะเบียนทรัพย์สิน AUC ประจำเดือน ส.ค. 2569 สรุปราย กฟฟ. ทั้ง 20 แห่ง',
      columns: [
        'criteria (เกณฑ์วัด)', 'province (พื้นที่)', 'office (กฟฟ.)', 'totalValue (ยอดรวม)',
        'closedValue (ปิดงานแล้ว)', 'remainingValue (คงเหลือ)', 'latestPercent (% ปิดงาน)', 'score (คะแนน KPI)'
      ],
      sampleProvider: () => (window.AUC_DATA_AUG || window.AUC_INITIAL_DATA || []).slice(0, 5).map(r => ({
        'กฟฟ.': r.office,
        'เกณฑ์วัด': r.criteria,
        'คงเหลือ (บาท)': (r.remainingValue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        '% ปิดงาน': ((r.latestPercent || 0) * 100).toFixed(2) + '%',
        'คะแนน KPI': (r.score || 0).toFixed(2)
      }))
    },
    {
      id: 'src_01_jul',
      groupNo: '01',
      name: '01 รายงาน AUC เดือน 7ก.ค.  (3.2teco).xlsx',
      category: 'Monthly AUC Executive Report',
      importDate: '2026-09-25 17:32:00',
      importDateTh: '25 ก.ย. 2569, 17:32 น.',
      lastModifiedTh: '25 ก.ย. 2569, 17:32 น.',
      sizeText: '632.5 KB',
      recordCount: 368,
      status: 'ready',
      statusText: 'ประวัติเดือน ก.ค.',
      storageFile: 'js/data.js',
      storageVar: 'window.AUC_INITIAL_DATA (เดือน ก.ค.)',
      icon: '📈',
      badgeColor: '#06B6D4',
      description: 'รายงานสรุปผลงาน AUC ประจำเดือน ก.ค. 2569 สำหรับเปรียบเทียบแนวโน้มผลงานกับเดือน ส.ค.',
      columns: ['criteria', 'province', 'office', 'totalValue', 'closedValue', 'remainingValue', 'latestPercent'],
      sampleProvider: () => (window.AUC_INITIAL_DATA || []).slice(0, 5).map(r => ({
        'กฟฟ.': r.office,
        'เกณฑ์วัด': r.criteria,
        'คงเหลือ (บาท)': (r.remainingValue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 }),
        '% ปิดงาน': ((r.latestPercent || 0) * 100).toFixed(2) + '%'
      }))
    },
    {
      id: 'src_01_prev',
      groupNo: '01',
      name: '01 รายงาน AUC เดือน 1ม.ค. - 6มิ.ย. 2569 (รวม 6 ไฟล์)',
      category: 'Monthly Historical Reports',
      importDate: '2026-09-25 17:32:00',
      importDateTh: '25 ก.ย. 2569, 17:32 น.',
      lastModifiedTh: '25 ก.ย. 2569, 17:32 น.',
      sizeText: '~270 KB รวม',
      recordCount: 2208,
      status: 'ready',
      statusText: 'ประวัติ ม.ค. - มิ.ย.',
      storageFile: 'js/data_jan.js ถึง js/data_jun.js',
      storageVar: 'window.AUC_DATA_JAN .. JUN',
      icon: '📁',
      badgeColor: '#14B8A6',
      description: 'ชุดไฟล์รายงานผลงาน AUC ย้อนหลังตั้งแต่เดือน ม.ค. - มิ.ย. 2569 ใช้ในการวิเคราะห์ Timeline และ Scenario Comparison',
      columns: ['criteria', 'province', 'office', 'totalValue', 'closedValue', 'remainingValue', 'latestPercent'],
      sampleProvider: () => (window.AUC_DATA_JAN || []).slice(0, 5).map(r => ({
        'กฟฟ.': r.office,
        'เกณฑ์วัด': r.criteria,
        'คงเหลือ (บาท)': (r.remainingValue || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })
      }))
    }
  ];

  /**
   * System Storage File Definitions (Physical JS Files & LocalStorage)
   */
  const SYSTEM_STORAGE_FILES = [
    {
      path: 'js/data_wbs.js',
      title: 'ฐานข้อมูลรวมงาน WBS คงเหลือ (Merged WBS Database)',
      role: 'จัดเก็บข้อมูลหลักงาน WBS (ไฟล์ 03 + 04 + 05 + 06)',
      recordsCount: '2,968 รายการ (41 คอลัมน์)',
      fileSize: '3.31 MB',
      updatedAt: '19 ต.ค. 2569, 08:48 น.',
      status: '100% พร้อมใช้งาน',
      variable: 'window.AUC_WBS_REMAINING_DATA'
    },
    {
      path: 'js/wbs.js',
      title: 'โมดูลจัดการหน้าตาราง WBS & ตัวกรอง',
      role: 'ตรรกะคำนวณตัวกรอง, ค้นหาสถานะ SAP, จัดกลุ่มสรุปผล',
      recordsCount: '4,055 บรรทัดคำสั่ง',
      fileSize: '184 KB',
      updatedAt: '17 ต.ค. 2569, 08:15 น.',
      status: 'อัปเดตล่าสุดวันนี้',
      variable: 'window.renderWbsTab, getFilteredWbsData'
    },
    {
      path: 'js/data_aug.js',
      title: 'ข้อมูลผลงาน AUC เดือน ส.ค. 2569 (ล่าสุด)',
      role: 'ฐานข้อมูลสรุปผลงานระดับผู้บริหารเดือน ส.ค. 2569',
      recordsCount: '368 รายการ',
      fileSize: '372 KB',
      updatedAt: '29 ก.ย. 2569, 16:55 น.',
      status: 'Active Month',
      variable: 'window.AUC_DATA_AUG'
    },
    {
      path: 'js/data.js',
      title: 'ข้อมูลผลงาน AUC เดือน ก.ค. 2569',
      role: 'ฐานข้อมูลสรุปผลงานสะสมเดือน ก.ค. 2569',
      recordsCount: '368 รายการ',
      fileSize: '370 KB',
      updatedAt: '25 ก.ย. 2569, 17:32 น.',
      status: 'Historical Baseline',
      variable: 'window.AUC_INITIAL_DATA'
    },
    {
      path: 'js/kpi_matrix.js',
      title: 'เกณฑ์ชี้วัด KPI และสูตรการคำนวณคะแนน',
      role: 'เกณฑ์ชี้วัดปี 2569 และเป้าหมายสะสมรายเดือน',
      recordsCount: '8 เกณฑ์วัด',
      fileSize: '12.5 KB',
      updatedAt: '15 ต.ค. 2569, 17:52 น.',
      status: 'KPI 2569 Active',
      variable: 'window.KPI_MATRIX'
    },
    {
      path: 'js/data_jan.js - data_jun.js',
      title: 'ข้อมูลผลงาน AUC ย้อนหลัง ม.ค. - มิ.ย. 2569',
      role: 'ฐานข้อมูลสะสม 6 เดือนแรกของปี 2569',
      recordsCount: '2,208 รายการรวม',
      fileSize: '~2.2 MB รวม',
      updatedAt: '25 ก.ย. 2569, 17:32 น.',
      status: 'Historical Baseline',
      variable: 'window.AUC_DATA_JAN ... JUN'
    },
    {
      path: 'localStorage (Browser Cache)',
      title: 'หน่วยความจำเบราว์เซอร์เครื่องผู้ใช้งาน',
      role: 'บันทึกการปรับแต่งสี, รายการคอลัมน์ที่เลือก, แผนจำลอง Scenario',
      recordsCount: '5 ตัวแปรคอนฟิก',
      fileSize: '~150 KB',
      updatedAt: 'เรียลไทม์ (บันทึกอัตโนมัติ)',
      status: 'Local Storage Ready',
      variable: 'auc_wbs_visible_cols, AUC_SIMULATION_SCENARIO'
    }
  ];

  /**
   * System Pre-defined Audit & Modification Log Entries
   */
  const BASE_AUDIT_LOGS = [
    {
      id: 'log_000_wbs_kpi_month_active_button_enhancement',
      timestamp: '2026-10-19 11:38:00',
      timestampTh: '19 ต.ค. 2569, 11:38 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปุ่มเลือกเดือนเป้าหมาย',
      badgeClass: 'badge-type-edit',
      title: 'ปรับแต่งปุ่มเลือกเดือนเป้าหมาย KPI ที่ถูกเลือก (Active) ให้ลอยเด่น 3D ขอบทองเรืองแสงประกายขาวและสวยงาม',
      targetSubject: 'แถบปุ่มเลือกเดือนเป้าหมาย KPI ในการ์ด WBS Comparison (.btn-wbs-kpi-month)',
      storageFile: 'css/styles.css, js/wbs.js & js/data_history.js',
      changeSummary: '1) ยกระดับปุ่มเดือนที่เลือกให้ลอยเด่นแบบ 3D (Elevation: translateY(-3.5px) scale(1.02)) 2) เพิ่มเส้นขอบสีทองเรืองแสงประกายขาวคอนทราสต์สูง (White-Gold Halo Border 3.5px) ไม่กลืนไปกับพื้นหลังสีส้มของเดือน ก.ย. 3) ปรับปุ่มเดือนอื่นที่ยังไม่ได้เลือกให้ซอฟต์ลง (Opacity 0.68) เพื่อสร้างจุดโฟกัสให้ปุ่มที่เลือกเด่นชัดทันที 4) ปรับปรุงป้าย "กำลังเลือก" เป็นสีขาวลักชัวรีพร้อมไฟสัญญาณสีเขียวมรกตเรืองแสงกะพริบสดใส',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ลองปรับปุ่มที่เลือก ให้แตกต่างขึ้นมา สวยงาม): 1) ใน css/styles.css ปรับสไตล์ .btn-wbs-kpi-month.active ให้มี z-index: 30, transform: translateY(-3.5px) scale(1.02), padding: 3.5px และกรอบพื้นหลัง linear-gradient(135deg, #FFFFFF 0%, #FFF59D 25%, #FFD700 50%, #FFFFFF 75%, #FFA000 100%) พร้อมเงา 3 ชั้น (drop-shadow สีขาวคมกริบ + ออร่าสีทองเรืองแสง 16px + เงาลึก 3D 16px) 2) เพิ่มมิติผิวกระจกเงา (Specular Inset Reflection) ภายใน .btn-wbs-kpi-inner และอัปเกรดการไล่เฉดสีเฉพาะของแต่ละเซกเมนต์เมื่อ active 3) ลดความเข้มของปุ่มที่ไม่ได้เลือก (:not(.active)) เหลือ opacity: 0.68 และ saturate(0.85) พร้อมเอฟเฟกต์ hover สว่างขึ้นอย่างนุ่มนวล 4) พัฒนาคอมโพเนนต์ไฟสัญญาณ .m-active-pulse-beacon สีเขียวมรกตกะพริบแบบมีจังหวะ (1.6s ease-in-out) บ่งบอกสถานะการเลือกปัจจุบันอย่างหรูหรา ชัดเจน',
      sourceFile: 'คำสั่งผู้ใช้งาน (ลองปรับปุ่มที่เลือก ให้แตกต่างขึ้นมา สวยงาม)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ'
    },
    {
      id: 'log_000_wbs_bar_chart_single_line_sap_label',
      timestamp: '2026-10-19 11:22:00',
      timestampTh: '19 ต.ค. 2569, 11:22 น.',
      type: 'EDIT',
      typeBadge: 'จัดข้อความบรรทัดเดียว',
      badgeClass: 'badge-type-edit',
      title: 'ปรับการแสดงรหัสสถานะ SAP และจำนวนงานในกราฟแท่งให้อยู่ในบรรทัดเดียวกัน (เช่น F4 : 4)',
      targetSubject: 'การแสดงผลข้อความในกราฟแท่ง WBS (#wbsOfficesBarChart)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'ปรับรูปแบบการแสดงข้อความในทุกเซกเมนต์ของกราฟแท่งให้อยู่ในบรรทัดเดียวกัน เช่น "F4 : 4", "C1 : 35", "D1 : 6" พร้อมเว้นวรรครอบเครื่องหมายโคลอนอย่างสวยงาม และปรับขนาดตัวอักษรแบบ Responsive อัตโนมัติ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ปรับแก้ให้อยู่บรรทัดเดียวกัน เช่น F4 : 4): ปรับแก้ใน drawTopOfficesCanvas() ให้ทุกเซกเมนต์แสดงผลแบบบรรทัดเดียวในรูปแบบ "${suffix} : ${countStr}" โดยไม่ตัดขึ้นบรรทัดใหม่ พร้อมระบบตรวจวัดความกว้างแบบยืดหยุ่น (Responsive text measurement) และปรับขนาดฟอนต์ให้พอดีกับความกว้างของแท่งกราฟอย่างสวยงาม สะอาดตา และอ่านง่าย',
      sourceFile: 'คำสั่งผู้ใช้งาน (ปรับแก้ให้อยู่บรรทัดเดียวกัน เช่น F4 : 4)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ'
    },
    {
      id: 'log_000_wbs_bar_chart_sap_suffix_and_proportions',
      timestamp: '2026-10-19 11:15:00',
      timestampTh: '19 ต.ค. 2569, 11:15 น.',
      type: 'EDIT',
      typeBadge: 'รหัสสถานะ SAP บนกราฟแท่ง',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มการแสดงรหัสสถานะ SAP ประโยคท้าย (F4, F2, C1 ฯลฯ) ในกราฟแท่ง และปรับสัดส่วนแท่งให้เห็นชัดเจน สวยงาม',
      targetSubject: 'กราฟแท่งหน่วยงานที่มีงาน WBS คงเหลือ (#wbsOfficesBarChart)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: '1) เพิ่มการแสดงรหัสสถานะ SAP เฉพาะประโยคท้าย (เช่น F4, F2, C1, D1, D2, D3, B1) ในทุกเซกเมนต์ของกราฟแท่ง พร้อมตัวเลขจำนวนงาน 2) ปรับสัดส่วนความสูงของแต่ละเซกเมนต์ด้วยอัลกอริทึม Water-filling ให้สะท้อนสัดส่วนจริงอย่างแม่นยำและไม่ถูกบีบอัด 3) เพิ่มความกว้างแท่ง (24-42px) และความสูงกราฟ (~296px) รองรับการแสดงผล 2 บรรทัดในเซกเมนต์ขนาดใหญ่',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ให้เพิ่ม สถานะ sap เฉพาะประโยคท้าย เช่น F4 F2 C1 เป็นต้น ในกราฟแท่ง และดูสัดส่วนให้เห็นชัด สวยงาน): 1) สร้างฟังก์ชัน getSapSuffix(sap) สำหรับสกัดรหัสประโยคท้าย 2 ตัว เช่น "CLSD F4" -> "F4", "LLSU F2" / "REL F2" -> "F2", "REL C1" -> "C1", "TECO D2" -> "D2" 2) พัฒนาฟังก์ชัน allocateSegmentHeights() จัดสรรความสูงของเซกเมนต์สถานะ SAP ด้วยอัลกอริทึม Water-filling เพื่อรักษาสัดส่วนแท่งกราฟจริง (Proportional Stacking) ไม่ให้เซกเมนต์ที่มีงานจำนวนมากถูกลดทอนความสูง ขณะเดียวกันยังรับประกันความสูงขั้นต่ำ (13.5px) ให้เซกเมนต์ขนาดเล็กแสดงข้อความได้ครบถ้วน 3) ปรับการจัดวางข้อความแบบ Responsive ในแต่ละเซกเมนต์: หากมีความสูง >= 26px จัดเป็น 2 บรรทัด (บรรทัดบนแสดงรหัสสถานะ SAP ประโยคท้ายขนาด 10px ตัวหนา, บรรทัดล่างแสดงจำนวนงานขนาด 9.5px ตัวหนา) หากความสูงปานกลางจัดเป็น 1 บรรทัด เช่น "F2: 3", "F4: 9", "C1: 5" พร้อม Text Shadow คอนทราสต์สูงทั้งธีมมืดและสว่าง 4) ปรับความกว้างแท่งกราฟ (barW) ให้มีความหนาแน่นสมส่วน (24-42px) และปรับพื้นที่วาด (plotHBase: 196px, height0: 296px) เพิ่มพื้นที่แนวตั้งให้อ่านง่าย สบายตา คมชัดทุกสถานะ',
      sourceFile: 'คำสั่งผู้ใช้งาน (ให้เพิ่ม สถานะ sap เฉพาะประโยคท้าย เช่น F4 F2 C1 เป็นต้น ในกราฟแท่ง และดูสัดส่วนให้เห็นชัด สวยงาน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_update_file_04_zbudr064',
      timestamp: '2026-10-19 08:48:00',
      timestampTh: '19 ต.ค. 2569, 08:48 น.',
      type: 'IMPORT',
      typeBadge: 'อัปเดตไฟล์ 04 WBS',
      badgeClass: 'badge-type-import',
      title: 'อัปเดตข้อมูลไฟล์ 04 WBS ZBUDR064 (%พัสดุ ค่าแรง และสถานะ SAP)',
      targetSubject: 'ฐานข้อมูล WBS คงเหลือ (js/data_wbs.js) และการแสดงผลสถานะ SAP',
      storageFile: 'js/data_wbs.js, js/wbs.js & js/data_history.js',
      changeSummary: 'อัปเดตฐานข้อมูล WBS จากไฟล์ 04 ZBUDR064 ฉบับล่าสุด (19 ต.ค. 2569, 08:34 น.): ปรับปรุงสถานะ SAP รวม 382 รายการ (CLSD F4 เพิ่มขึ้น +200 โครงการ, CLSD F2 +14 โครงการ, TECO D2 เปลี่ยนเป็น CLSD ลดลง -121 โครงการ, REL C1 -84 โครงการ) พร้อมปรับปรุงยอด Act ควบคุมและ % เบิกพัสดุ 101 รายการ',
      details: 'ดำเนินการรันสคริปต์ผสานข้อมูล WBS (merge_wbs_all.ps1) ผสานไฟล์ 03 (ฐานคงเหลือ 2,968 รายการ), ไฟล์ 04 (ZBUDR064 ฉบับแก้ไข 19 ต.ค. 2569), ไฟล์ 05 (CN41) และไฟล์ 06 (Google Sheet): 1) ผลการจับคู่ WBS สำเร็จ 100% (2,968/2,968 รายการ) 2) มีการปรับเปลี่ยนสถานะ SAP รวม 382 รายการ โดยสถานะปิดงานสมบูรณ์ (CLSD) เพิ่มขึ้นรวม +215 รายการ 3) มีการเปลี่ยนแปลงยอดค่าใช้จ่ายควบคุมจริงและ % การเบิกพัสดุ 101 รายการ 4) บันทึกลงใน js/data_wbs.js ขนาด 3.31 MB และอัปเดตป้ายเวลาไฟล์ 04 ที่หัวตาราง WBS เป็น 19 ต.ค. 2569, 08:34 น.',
      sourceFile: '04 WBS ZBUDR064 %พัสดุและค่าแรงและสถานะsap.xlsx (19 ต.ค. 2569, 08:34:34)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูง (อัปเดตสถานะโครงการก่อสร้างและมูลค่าเบิกจ่ายล่าสุด)'
    },
    {
      id: 'log_000_wbs_add_sap_eraser_btn_and_wbs_counts',
      timestamp: '2026-10-18 21:36:00',
      timestampTh: '18 ต.ค. 2569, 21:36 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มปุ่มยางลบ & จำนวน WBS',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มปุ่มยางลบล้างตัวกรองสถานะ SAP ที่หัวตาราง และแสดงจำนวนงาน WBS ในตัวเลือกสถานะ SAP',
      targetSubject: 'หัวคอลัมน์สถานะ SAP และรายการตัวกรองดรอปดาวน์ (#wbsSapThDropdownList)',
      storageFile: 'js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) เพิ่มปุ่มยางลบ (#btnWbsSapThEraser) ติดข้างปุ่มเลือกสถานะ SAP เพื่อให้ผู้ใช้คลิกล้างตัวกรองกลับสู่ "ทุกสถานะ" ได้ทันทีในคลิกเดียว 2) เพิ่มการแสดงผลจำนวนงาน WBS กำกับข้างแต่ละสถานะ SAP ในดรอปดาวน์ เช่น "118 งาน", "11 งาน" พร้อมสรุปจำนวนงานรวมที่ส่วนท้าย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ใน js/wbs.js ปรับปรุง renderWbsTableHead() เพิ่มปุ่มไอคอนยางลบ .btn-th-sap-eraser พร้อมฟังก์ชัน clearWbsTableSapFilter() สำหรับล้าง tableSapStatuses 2) ใน renderWbsSapThDropdownList() คำนวณจำนวนงาน WBS ใน sapMap และแสดงผล <span class="sap-dropdown-item-count">${statInfo.count} งาน</span> 3) ใน css/styles.css ตกแต่งปุ่มยางลบและปรับขนาด Panel เป็น 205px พร้อมจัดวางสถานะและจำนวนงานอย่างลงตัว',
      sourceFile: 'คำสั่งผู้ใช้งาน (เพิ่มปุ่มยางลบ เพื่อเคลียร์ตัวกรอง / เพิ่ม จำนวน WBS ในตัวกรอง สถานะsap)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_force_sap_dropdown_below_button_only',
      timestamp: '2026-10-18 21:32:00',
      timestampTh: '18 ต.ค. 2569, 21:32 น.',
      type: 'EDIT',
      typeBadge: 'ตำแหน่งตัวกรองสถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'ปรับตำแหน่งดรอปดาวน์สถานะ SAP ให้อยู่ด้านล่างปุ่มเสมอ ไม่พลิกไปเปิดด้านบน',
      targetSubject: 'การแสดงผลและคำนวณตำแหน่งป๊อปอัปตัวกรองสถานะ SAP (#wbsSapThDropdownPanel)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'ยกเลิกการพลิกป๊อปอัปตัวกรองสถานะ SAP ขึ้นไปเปิดด้านบนปุ่ม โดยกำหนดให้อยู่ชิดติดด้านล่างปุ่มตัวกรองเสมอ (top = rect.bottom + 4px) พร้อมปรับขนาดความสูงรายการให้พอดีกับจอภาพอัตโนมัติ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ให้ตัวกรอง อยู่ด้านล่างอย่างเดียว ไม่ให้ไปข้างบนแบบในรุป): ปรับปรุงฟังก์ชัน repositionWbsSapDropdown() ใน js/wbs.js โดยนำเงื่อนไขพลิกกลับขึ้นด้านบน (top = rect.top - panelHeight) ออก และกำหนดให้แสดงอยู่ด้านล่างปุ่ม [เลือก ... สถานะ] ตลอดเวลา พร้อมปรับ max-height ของ #wbsSapThDropdownList ให้พอดีกับความสูงจอภาพที่เหลืออยู่ด้านล่างอย่างแม่นยำ',
      sourceFile: 'คำสั่งผู้ใช้งาน (ให้ตัวกรอง อยู่ด้านล่างอย่างเดียว ไม่ให้ไปข้างบนแบบในรุป)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_remove_checkbox_from_sap_dropdown_items',
      timestamp: '2026-10-18 21:29:00',
      timestampTh: '18 ต.ค. 2569, 21:29 น.',
      type: 'EDIT',
      typeBadge: 'นำ Checkbox ดรอปดาวน์ออก',
      badgeClass: 'badge-type-edit',
      title: 'นำช่อง Checkbox ออกจากรายการตัวกรองสถานะ SAP คงเหลือเฉพาะป้ายสถานะแบบเลือก/ปลดอิสระ',
      targetSubject: 'รายการตัวเลือกในดรอปดาวน์สถานะ SAP (#wbsSapThDropdownList)',
      storageFile: 'js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: 'นำช่องสี่เหลี่ยม Checkbox ด้านหน้าสถานะ SAP ออกตามที่ผู้ใช้งานขีดกากบาทสีเหลืองระบุ คงเหลือเฉพาะป้ายสถานะ SAP ตรงกลางแถว โดยคลิกที่ตัวป้ายสถานะเพื่อเลือกหรือปลดการกรองได้ทันที',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ใน js/wbs.js ฟังก์ชัน renderWbsSapThDropdownList() นำแท็ก <input type="checkbox"> ออกจาก itemsHtml คงเหลือเฉพาะป้าย <span class="badge-sap-short"> 2) ใน css/styles.css ปรับแต่ง .sap-dropdown-item ให้จัดป้ายสถานะไว้กึ่งกลางพอดี (justify-content: center) และตกแต่งสถานะที่ถูกเลือก (.is-selected) ด้วยกรอบแสงสีฟ้า (#38BDF8) สวยงามชัดเจน 3) ปรับความกว้างของ Panel เป็น 180px พอดีกับเนื้อหา',
      sourceFile: 'คำสั่งผู้ใช้งาน (กากาบาท เอา checkbox ออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_fix_sap_dropdown_position_and_remove_buttons',
      timestamp: '2026-10-18 21:24:00',
      timestampTh: '18 ต.ค. 2569, 21:24 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปรุงดรอปดาวน์สถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'นำปุ่มกากบาท (✕), ข้อความสรุปหัวข้อ และปุ่มตกลงออก พร้อมแก้ไขตำแหน่งดรอปดาวน์ให้ชิดติดใต้ปุ่มตัวกรองเสมอ',
      targetSubject: 'ป๊อปอัปตัวกรองสถานะ SAP (#wbsSapThDropdownPanel) และปุ่มหัวตาราง (#btnWbsSapThDropdown)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) นำปุ่มกากบาท (✕) และปุ่ม "ตกลง" รวมถึงข้อความสรุปในแถบหัวข้อออก เพื่อความเรียบง่ายและคลีน 2) แก้ไขตำแหน่งป๊อปอัปตัวกรองที่ลอยหลุดไปอยู่ข้างล่าง ให้กลับมาแสดงชิดติดใต้ปุ่มตัวกรองหัวตารางอย่างแม่นยำทุกการเลื่อนและการคลิก',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ใน index.html และ css/styles.css นำ .btn-close-sap-dropdown (✕) และ .btn-sap-done (ตกลง) รวมถึง .sap-dropdown-count-badge ออกจาก #wbsSapThDropdownPanel 2) ใน js/wbs.js เพิ่มฟังก์ชัน repositionWbsSapDropdown() โดยย้าย panel ไปไว้ที่ document.body เพื่อป้องกันไม่ให้สไตล์ transform/filter ของตารางกระทบการคำนวณพิกัด และยึดตำแหน่งให้อยู่ใต้ปุ่ม #btnWbsSapThDropdown พอดี (rect.bottom + 4px) พร้อมดักจับ scroll/resize ให้เกาะติดตลอดเวลา',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.เอา กากบาทออก 2.แก้ไขตัวกรอง ลอยออกปุ่มตัวหรอง มาข้างล่างเลย / เอาปุ่ม ตกลง ออกด้วย)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_refine_sap_dropdown_clean_and_table_only_filter',
      timestamp: '2026-10-18 21:16:00',
      timestampTh: '18 ต.ค. 2569, 21:16 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปรุงตัวกรองสถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'ปรับแต่งดรอปดาวน์สถานะ SAP คงเหลือเฉพาะ Checkbox และป้ายสถานะ พร้อมจำกัดการกรองเฉพาะในตาราง WBS เท่านั้น',
      targetSubject: 'ป๊อปอัปดรอปดาวน์หัวตารางสถานะ SAP (#wbsSapThDropdownPanel) และการกรองตาราง WBS',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) นำปุ่ม "เลือกทั้งหมด" และ "ล้างค่า (ทุกสถานะ)" รวมถึงจำนวนงานและมูลค่าเงินออกจากแต่ละรายการตามที่ผู้ใช้กากบาทออก คงเหลือเฉพาะ Checkbox และป้ายสถานะ SAP แบบเรียบง่าย 2) ปรับปรุงให้การเลือกสถานะ SAP จากดรอปดาวน์หัวตารางกรองเฉพาะแถวในตาราง WBS เท่านั้น โดยไม่กระทบกราฟแท่งและการ์ดเป้าหมาย KPI ด้านบน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ใน index.html ลบ .sap-dropdown-actions ออกจาก #wbsSapThDropdownPanel 2) ใน js/wbs.js แยก state ตัวกรองเป็น wbsState.tableSapStatuses สำหรับการกรองเฉพาะตาราง WBS ไม่ให้กระทบ filtered data ของส่วนบน (กราฟแท่ง, KPI Cards, Target Comparison Section) 3) ใน renderWbsSapThDropdownList ปรับ HTML แต่ละแถวให้เหลือเพียง Checkbox และ Badge สถานะ SAP โดยนำจำนวนงานและจำนวนเงินออก 4) ใน css/styles.css ปรับขนาด panel ให้กะทัดรัดพอดี (width: 210px)',
      sourceFile: 'คำสั่งผู้ใช้งาน (กากบาทเอาออก คงเหลือสถานะ sap อย่างเดียว และเลือกแล้วให้กรองเฉพาะหน้านั้น เท่านั้น)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง'
    },
    {
      id: 'log_000_wbs_add_th_sap_multi_dropdown_and_remove_kpi_clear_btn',
      timestamp: '2026-10-18 21:04:00',
      timestampTh: '18 ต.ค. 2569, 21:04 น.',
      type: 'EDIT',
      typeBadge: 'ดรอปดาวน์สถานะ SAP & ลบปุ่ม',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มตัวกรอง Dropdown list สถานะ SAP เลือกได้หลายสถานะในหัวตาราง พร้อมนำปุ่มล้างข้อมูลในการ์ดเป้าหมายออก',
      targetSubject: 'คอลัมน์สถานะ SAP ในหัวตาราง WBS และการ์ดเป้าหมาย KPI (#wbsTargetComparisonSection)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) เพิ่มตัวกรอง Dropdown list ใต้หัวคอลัมน์ "สถานะ SAP" ให้สามารถเลือกติ๊กพร้อมกันได้หลายสถานะอย่างอิสระ พร้อมปุ่มเลือกทั้งหมดและล้างค่า 2) นำปุ่มสีแดง "ล้างข้อมูล" ออกจากการ์ดเป้าหมาย KPI ระดับ 5 ตามที่ผู้ใช้งานวงกลมระบุ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 ส่วน: 1) ใน js/wbs.js ปรับปรุง renderWbsTableHead เพิ่มปุ่ม Dropdown #btnWbsSapThDropdown ในคอลัมน์ statusSap แสดงป้ายสถานะที่เลือก และใน index.html เพิ่ม #wbsSapThDropdownPanel พร้อมฟังก์ชัน renderWbsSapThDropdownList, toggleWbsSapDropdownStatus, selectAllWbsSapDropdownStatuses รองรับการเลือกพร้อมกันหลายสถานะ 2) ใน js/wbs.js นำปุ่ม .btn-wbs-card-clear (ล้างข้อมูล) ออกจาก .wbs-kpi-comp-meta-info ในการ์ดเป้าหมาย KPI 3) เพิ่ม CSS ตกแต่ง Dropdown Panel และปุ่มหัวตารางให้สวยงามทั้ง Dark และ Light Theme',
      sourceFile: 'คำสั่งผู้ใช้งาน (เพิ่มตัวกรอง Dropdown list สถานะsap และสามารถเลือกพร้อมกันได้หลายสถานะsap / วงกลมเอาออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เพิ่มตัวกรองหลายสถานะ SAP ในหัวตาราง WBS และลบปุ่มล้างข้อมูลซ้ำซ้อนออก)'
    },
    {
      id: 'log_000_wbs_remove_engineer_circle_avatar_icon',
      timestamp: '2026-10-18 20:47:00',
      timestampTh: '18 ต.ค. 2569, 20:47 น.',
      type: 'EDIT',
      typeBadge: 'นำไอคอนวงกลมช่างคุมงานออก',
      badgeClass: 'badge-type-edit',
      title: 'นำไอคอนวงกลมตัวอักษรย่อหน้าชื่อช่างคุมงานออกจากตาราง WBS',
      targetSubject: 'คอลัมน์ช่างคุมงาน ในตารางรายงาน WBS (#wbsMasterDataTable)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'นำไอคอนวงกลมสีฟ้าพร้อมอักษรย่อ (.wbs-engineer-icon) ที่อยู่หน้าชื่อช่างคุมงานออกตามที่ผู้ใช้งานวงกลมระบุ โดยคงเหลือการแสดงผลชื่อช่างคุมงานชัดเจน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (วงกลม เอาออก - ภาพชี้ไอคอนวงกลมสีฟ้าหน้าชื่อช่างคุมงาน): ปรับปรุงในไฟล์ js/wbs.js ฟังก์ชันเรนเดอร์ตาราง WBS โดยนำ <span class="wbs-engineer-icon"> ออกจากการแสดงผลเซลล์คอลัมน์ engineer คงเหลือเฉพาะชื่อช่างคุมงานแบบคลีน สบายตา',
      sourceFile: 'คำสั่งผู้ใช้งาน (วงกลม เอาออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงการแสดงผลคอลัมน์ช่างคุมงานให้กระชับและตรงตามความต้องการ)'
    },
    {
      id: 'log_000_wbs_remove_plan_close_and_reset_subfilters_btn',
      timestamp: '2026-10-18 20:45:00',
      timestampTh: '18 ต.ค. 2569, 20:45 น.',
      type: 'EDIT',
      typeBadge: 'นำแผนปิดงาน & ปุ่มล้างออก',
      badgeClass: 'badge-type-edit',
      title: 'นำตัวกรองแผนปิดงานและปุ่มล้างตัวกรองในตารางออกจากหัวตาราง WBS',
      targetSubject: 'แถบเครื่องมือเหนือตารางรายงาน WBS (.table-header-bar)',
      storageFile: 'index.html & js/data_history.js',
      changeSummary: 'นำตัวเลือกแผนปิดงาน (#wbsPlanCloseFilterSelect) และปุ่ม "ล้างตัวกรองในตาราง" (#btnResetWbsSubFilters) ออกจากแถบเหนือตาราง WBS ตามภาพคำสั่งผู้ใช้งาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เอาออก - ภาพแสดงแผนปิดงานและปุ่มล้างตัวกรองในตาราง): ลบองค์ประกอบตัวกรองแผนปิดงานและปุ่มรีเซ็ตตัวกรองในตารางออกจาก index.html ในส่วน .table-header-bar โดยคงเหลือป้ายเกณฑ์วัด (📌 เกณฑ์วัด) ด้านซ้าย และปุ่มเลือกคอลัมน์/ข้อมูลแบ่งหน้าด้านขวาไว้อย่างเรียบง่าย สวยงาม ไม่เกะกะ',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก - แผนปิดงานและล้างตัวกรองในตาราง)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ลบตัวกรองแผนปิดงานและปุ่มล้างตัวกรองในตารางเพื่อความเรียบง่ายของ UI)'
    },
    {
      id: 'log_000_wbs_remove_table_search_budget_office_filters',
      timestamp: '2026-10-18 20:43:00',
      timestampTh: '18 ต.ค. 2569, 20:43 น.',
      type: 'EDIT',
      typeBadge: 'นำตัวกรองตาราง 3 ช่องออก',
      badgeClass: 'badge-type-edit',
      title: 'นำตัวกรองเหนือตาราง WBS ออก 3 รายการ (ค้นหาเลข WBS, ตัวกรองงบ, ตัวกรองกอง/กฟฟ.)',
      targetSubject: 'แถบเครื่องมือตัวกรองเหนือตารางรายงาน WBS (.table-header-bar)',
      storageFile: 'index.html & js/data_history.js',
      changeSummary: 'นำช่องค้นหาข้อความ WBS (#wbsTableSearchInput), กล่องเลือกตัวกรองงบ (#wbsBudgetFilterSelect) และกล่องเลือกกอง/กฟฟ. (#wbsOfficeFilterSelect) ออกจากแถบตัวกรองเหนือตาราง WBS ตามที่ผู้ใช้งานวงกลมระบุ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ที่วงกลมเอาออก): ทำการลบ 3 ส่วนออกจาก index.html ในส่วน .table-header-bar ได้แก่ 1) ช่องค้นหาเลข WBS / ช่างคุมงาน 2) ตัวกรองงบ (ALL, C.1, I, P, C02.2) 3) ตัวกรองกอง/กฟฟ. โดยคงเหลือส่วนตัวกรองแผนปิดงาน, ปุ่มล้างตัวกรองในตาราง และป้ายเกณฑ์วัดไว้ ทำให้แถบเครื่องมือกระชับและไม่ซ้ำซ้อนกับการกรองผ่านกราฟแท่งหน่วยงานด้านบน',
      sourceFile: 'คำสั่งผู้ใช้งาน (ที่วงกลมเอาออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงเลย์เอาต์แถบตัวกรองตาราง WBS ให้กระชับขึ้น)'
    },
    {
      id: 'log_000_wbs_file_timestamps_and_checkbox_clear_btn_red_blue_text',
      timestamp: '2026-10-18 20:31:00',
      timestampTh: '18 ต.ค. 2569, 20:31 น.',
      type: 'EDIT',
      typeBadge: 'เวลาไฟล์ 03-06 & ปุ่มแดงฟ้า',
      badgeClass: 'badge-type-edit',
      title: 'นำป้ายเดิมที่กากบาทออกและแสดงวันที่เวลาแก้ไขไฟล์ 03-06 พร้อมปรับปุ่มล้าง Check Box เป็นพื้นหลังสีแดง อักษรสีฟ้า',
      targetSubject: 'แถบสรุปหัวตาราง WBS (#wbsActiveFilterPills) และปุ่มล้างข้อมูลที่เลือกจาก Check Box (#wbsCheckboxClearBtn)',
      storageFile: 'js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) นำป้ายสถานะเดิม 4 รายการ (รอบข้อมูล, เกณฑ์วัด, มูลค่า AUC รวม, คงเหลือ) ออกจากหัวตาราง WBS ตามกากบาทสีเหลืองของผู้ใช้งาน 2) แสดงป้ายระบุวันที่และเวลาแก้ไขจริงของไฟล์ 03 (17 ต.ค. 2569, 13:20 น.), 04 (14 ต.ค. 2569, 20:27 น.), 05 (22 ก.ย. 2569, 10:20 น.), 06 (22 ก.ย. 2569, 10:17 น.) สวยงามแยกสีเฉพาะ 3) แก้ไขข้อความปุ่มใต้การ์ดสถานะ SAP เป็น "ล้างข้อมูลที่เลือกจาก Check Box" พร้อมปรับพื้นหลังเป็นสีแดงเข้ม อักษรสีฟ้า (#38BDF8) ตามคำสั่งผู้ใช้งาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ใน js/wbs.js ปรับปรุง renderActiveFilterPills นำ 4 ป้ายเดิมออกและแทนที่ด้วยป้ายแสดงวันเวลาแก้ไขล่าสุดของไฟล์ 03, 04, 05, 06 คลิกแล้วเปิด Modal ผังข้อมูลได้ พร้อมเพิ่มคลาส .pill-file-03 ถึง 06 ใน css/styles.css รองรับ Dark และ Light theme 2) ใน js/wbs.js ปรับปรุง footerHtml เปลี่ยนข้อความเป็น "ล้างข้อมูลที่เลือกจาก Check Box" และใน css/styles.css ปรับ .btn-clear-wbs-checkbox เป็น background: linear-gradient โทนสีแดงสด และ color / svg stroke เป็นสีฟ้า (#38BDF8) 3) ปรับปรุง DATA_SOURCE_CATALOG ใน js/data_history.js ให้ตรงกับเวลาไฟล์จริง',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาที่กากาบาทออก / แสดงวันที่ และเวลา ที่แก้ไขไฟล์ 03 04 05 06 / แก้ไขข้อความ ล้างข้อมูลที่เลือกจาก Check Box และเปลี่ยนสีพื้นหลังเป็นสีแดง อักษรสีฟ้า)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงเลย์เอาต์หัวตาราง WBS แสดงเวลาแก้ไขไฟล์จริง และตกแต่งปุ่ม Check Box ใหม่)'
    },
    {
      id: 'log_000_wbs_clear_buttons_blue_and_no_numbers',
      timestamp: '2026-10-18 20:25:00',
      timestampTh: '18 ต.ค. 2569, 20:25 น.',
      type: 'EDIT',
      typeBadge: 'ปุ่มสีฟ้า & ไม่มีตัวเลข',
      badgeClass: 'badge-type-edit',
      title: 'ปรับปุ่มล้างข้อมูลทุกสถานะ (ไม่มีตัวเลข) และเปลี่ยนปุ่มล้างข้อมูลที่เลือกเป็นสีฟ้าพร้อมนำตัวเลขนับออก',
      targetSubject: 'ปุ่มล้างข้อมูลหัวการ์ดกราฟ WBS (#wbsOfficeChartClearBtn) และปุ่มล้างข้อมูลที่เลือก Checkbox (#wbsCheckboxClearBtn)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) แก้ไขปุ่มล้างข้อมูลหัวการ์ดกราฟ WBS เป็น "ล้างข้อมูลทุกสถานะ" และนำการแสดงตัวเลขนับออกทั้งหมด 2) ปรับปุ่ม "ล้างข้อมูลที่เลือก" ใต้การ์ดสรุปสถานะ SAP ให้เป็นสีฟ้า Gradient (#2563EB - #1D4ED8) พร้อมเรืองแสงสีฟ้าแทนสีแดงเดิม และนำตัวเลขนับจำนวนงาน (1) ออกตามภาพคำสั่งผู้ใช้งาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 คำสั่งต่อเนื่อง (วงกลม แก้เป็น ล้างข้อมูลทุกสถานะ และไม่ต้องมีตัวเลข / เอาตัวเลขออก และเปลี่ยนปุ่มสีฟ้า): 1) ใน index.html และ js/wbs.js ปรับข้อความปุ่มล้างข้อมูลมุมบนขวาเป็น "ล้างข้อมูลทุกสถานะ" และปิดการแสดงผลตัวเลขนับ (#wbsOfficeChartClearCount) 2) ใน js/wbs.js ปรับปรุง footerHtml ของ renderWbsSapSummary โดยนำสแปนตัวเลขนับจำนวนงาน (#wbsCheckboxClearCount) ออกจากปุ่ม #wbsCheckboxClearBtn 3) ใน css/styles.css ปรับแต่งคลาส .btn-clear-wbs-checkbox จากเดิมที่เป็นโทนสีแดง ให้เป็นโทนสีฟ้าน้ำเงินสดใส (Gradient Blue) ทั้งสถานะปกติ, Hover, Active และ Light Theme อย่างสมบูรณ์แบบ',
      sourceFile: 'คำสั่งผู้ใช้งาน (วงกลม แก้เป็น ล้างข้อมูลทุกสถานะ และไม่ต้องมีตัวเลข / เอาตัวเลขออก และเปลี่ยนปุ่มสีฟ้า)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงข้อความปุ่ม เลิกแสดงตัวเลขนับ และเปลี่ยนชุดสีปุ่มล้างข้อมูล Checkbox เป็นสีฟ้า)'
    },
    {
      id: 'log_000_wbs_remove_budget_summary_pill',
      timestamp: '2026-10-18 20:16:00',
      timestampTh: '18 ต.ค. 2569, 20:16 น.',
      type: 'EDIT',
      typeBadge: 'นำป้ายงบปัจจุบันออก',
      badgeClass: 'badge-type-edit',
      title: 'นำป้ายสรุปงบปัจจุบันรวมออกจากแถบสถานะหัวตาราง WBS ตามคำสั่งผู้ใช้งาน',
      targetSubject: 'แถบแสดงตัวกรองและสรุปผลหัวตาราง WBS (#wbsActiveFilterPills)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'นำป้าย "💰 งบปัจจุบันรวม: ฿..." ออกจากส่วนหัวตารางรายงานติดตามงาน WBS คงเหลือ (#wbsActiveFilterPills) โดยคงเหลือเฉพาะป้ายรอบข้อมูล, เกณฑ์วัด, มูลค่า AUC รวม, จำนวนงานคงเหลือ และสถานะ SAP ตามที่ผู้ใช้งานกาเครื่องหมายระบุในภาพ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เอาที่วงกลม/กากบาทออก): ใน js/wbs.js ปรับปรุงฟังก์ชัน renderActiveFilterPills โดยนำบล็อกการแสดงผลป้าย Budget Summary Pill (งบปัจจุบันรวมจากไฟล์ 04) ออก เพื่อให้แถบสรุปข้อมูลกระชับและมุ่งเน้นที่มูลค่า AUC รวมจริงของงาน WBS คงเหลือ',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาที่วงกลม ออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'เล็กน้อย (ปรับปรุงหน้าตา UI แถบสรุปสถานะ WBS โดยนำป้ายงบปัจจุบันรวมออก)'
    },
    {
      id: 'log_000_wbs_clear_all_btn_show_sap_status_count_only',
      timestamp: '2026-10-18 16:22:00',
      timestampTh: '18 ต.ค. 2569, 16:22 น.',
      type: 'EDIT',
      typeBadge: 'นับเฉพาะสถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'แก้ไขปุ่มล้างข้อมูลทั้งหมดด้านบน ให้แสดงเฉพาะจำนวนประเภทสถานะ SAP ที่ถูกเลือกเท่านั้น',
      targetSubject: 'ป้ายนับจำนวนบนปุ่มล้างข้อมูลทั้งหมด (#wbsOfficeChartClearBtn & #wbsOfficeChartClearCount)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'แก้ไขการแสดงผลตัวเลขนับบนปุ่ม "ล้างข้อมูลทั้งหมด" (#wbsOfficeChartClearBtn) ที่มุมบนขวา ให้แสดงเฉพาะจำนวนประเภทสถานะ SAP ที่ถูกเลือกเท่านั้น (เช่น (1), (3)) โดยไม่นำจำนวนงานที่เลือกจาก Checkbox (65 งาน) มาแสดงปนกันอีกต่อไป เพื่อแยกแยะความแตกต่างจากปุ่ม "ล้างข้อมูลที่เลือก" ด้านล่างได้อย่างชัดเจน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (แก้ไขให้ แสดงจำนวนประเภท สถานะ sap ที่เลือก เท่านั้น): 1) ใน js/wbs.js ปรับปรุงฟังก์ชัน renderWbsSapSummary ในส่วนการอัปเดต #wbsOfficeChartClearCount โดยตัดเงื่อนไขการนำ selWbsCount มาแสดงผลออก 2) กำหนดให้แสดงตัวเลข (selSapCount) เฉพาะเมื่อมีการเลือกสถานะการ์ด SAP (selSapCount > 0) เช่น กรอง 1 สถานะแสดง (1) หรือเลือกทุกสถานะแสดง (9) 3) หากไม่มีการเลือกการ์ด SAP ให้ซ่อนป้ายนับ (display: none) ปล่อยให้ปุ่มแสดงเฉพาะข้อความ "ล้างข้อมูลทั้งหมด" 4) คงการแสดงตัวเลขนับจำนวนงาน Checkbox ไว้ที่ปุ่ม "ล้างข้อมูลที่เลือก" (#wbsCheckboxClearBtn) ด้านล่างเท่านั้น',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขให้ แสดงจำนวนประเภท สถานะ sap ที่เลือก เท่านั้น)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'เล็กน้อย (แก้ไขตัวเลขนับบนปุ่มล้างข้อมูลด้านบนให้สะท้อนเฉพาะจำนวนประเภทสถานะ SAP ที่เลือก)'
    },
    {
      id: 'log_000_wbs_add_clear_checkbox_only_button',
      timestamp: '2026-10-18 16:15:00',
      timestampTh: '18 ต.ค. 2569, 16:15 น.',
      type: 'EDIT',
      typeBadge: 'ปุ่มล้างเฉพาะ Checkbox',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มปุ่มล้างข้อมูล เฉพาะที่เลือกจาก Checkbox เท่านั้น ใต้การ์ดสรุปสถานะ SAP ตามกรอบตำแหน่งที่ระบุ',
      targetSubject: 'ส่วนสรุปสถานะ SAP (#wbsSapSummarySection) และปุ่มล้างข้อมูลเฉพาะ Checkbox (#wbsCheckboxClearBtn)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) เพิ่มปุ่ม "ล้างข้อมูลที่เลือก" (#wbsCheckboxClearBtn) ไว้ใต้การ์ดสรุปสถานะ SAP ชิดขวาตรงตามกรอบสีแดงที่ผู้ใช้งานกำหนด 2) ฟังก์ชัน window.clearWbsCheckboxSelection จะล้างเฉพาะรายการที่เลือกจาก Checkbox ในตาราง (wbsState.selectedWbs) โดยไม่ล้างการเลือกสถานะการ์ด SAP และไม่ล้างการเลือกหน่วยงานบนกราฟ 3) ปรับปุ่มบนขวาหัวการ์ดกราฟ (#wbsOfficeChartClearBtn) เป็น "ล้างข้อมูลทั้งหมด" เพื่อให้ผู้ใช้งานแยกแยะการล้างทั้งหมดกับการล้างเฉพาะ Checkbox ได้อย่างชัดเจน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เพิ่มปุ่มล้างข้อมูล เฉพาะที่เลือกจาก checkbox เทานั้น): 1) ใน js/wbs.js เพิ่มฟังก์ชัน window.clearWbsCheckboxSelection สำหรับปลด wbsState.selectedWbs และปลด Checkbox ในตารางทั้งหมดโดยคงค่า wbsState.selectedSapStatuses และ wbsState.office ไว้ตามเดิม 2) ใน renderWbsSapSummary เพิ่ม footerHtml (.wbs-sap-summary-footer-bar) จัดวางปุ่ม #wbsCheckboxClearBtn ชิดขวาใต้การ์ด SAP ตามกรอบสีแดงในภาพ แสดงตัวเลขนับ (X) และเปลี่ยนเป็นปุ่มสีแดง Gradient เรืองแสงเมื่อมีรายการ Checkbox ถูกเลือก พร้อมสถานะ disabled เมื่อไม่มีรายการเลือก 3) ใน css/styles.css กำหนดคลาส .btn-clear-wbs-checkbox และ .wbs-sap-summary-footer-bar รองรับทั้ง Dark และ Light Theme 4) ใน index.html กำหนดป้ายปุ่มมุมขวาบนเป็น "ล้างข้อมูลทั้งหมด" เพื่อความชัดเจน',
      sourceFile: 'คำสั่งผู้ใช้งาน (เพิ่มปุ่มล้างข้อมูล เฉพาะที่เลือกจาก checkbox เทานั้น)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เพิ่มปุ่มล้างเฉพาะรายการ Checkbox ใต้การ์ดสถานะ SAP ตามตำแหน่งที่กำหนด)'
    },
    {
      id: 'log_000_wbs_remove_bottom_summary_move_clear_btn_no_decimals',
      timestamp: '2026-10-18 16:05:00',
      timestampTh: '18 ต.ค. 2569, 16:05 น.',
      type: 'EDIT',
      typeBadge: 'ย้ายปุ่มล้าง & มูลค่าไม่มีทศนิยม',
      badgeClass: 'badge-type-edit',
      title: 'นำกล่องสรุปรายการที่เลือกด้านล่างออก, ย้ายปุ่มล้างข้อมูลที่เลือกขึ้นมุมบนขวา และปรับมูลค่าในการ์ดไม่มีจุดทศนิยม',
      targetSubject: 'กล่องสรุปรายการที่เลือก (#wbsSelectedSummaryCard), ปุ่มล้างข้อมูลบนหัวการ์ด (#wbsOfficeChartClearBtn) และมูลค่าในการ์ดสรุปสถานะ SAP (#wbsSapSummarySection)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) นำกล่องสรุปรายการที่เลือกด้านล่าง (#wbsSelectedSummaryCard) ออกตามรูปคำสั่งผู้ใช้งาน 2) ย้ายและปรับแต่งปุ่ม "ล้างข้อมูลที่เลือก" ขึ้นไปไว้ที่มุมขวาบนของหัวการ์ดกราฟ WBS แสดงจำนวนงานที่เลือกสีแดงเด่นชัด 3) ปรับปรุงการแสดงผลมูลค่า (AUC) ภายในการ์ดสรุปสถานะ SAP ทุกใบ ไม่ให้มีจุดทศนิยม (ปัดเป็นจำนวนเต็มและคั่นหลักพัน)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 ข้อ: 1) "เอาออก และย้ายตำแหน่งล้างข้อมูลที่เลือกตามรูป": ปรับปรุง index.html และ renderWbsSelectedSummaryCard ใน js/wbs.js ให้ปิดการแสดงผลของกล่องล่างอย่างสมบูรณ์ และย้ายปุ่มล้างข้อมูลที่เลือกขึ้นไปไว้ที่มุมบนขวา (#wbsOfficeChartClearBtn) พร้อมแสดงชื่อ "ล้างข้อมูลที่เลือก" และนับจำนวนรายการที่เลือก (เช่น ล้างข้อมูลที่เลือก (65)) 2) "มูลค่า ในการ์ด ไม่ต้องมีจุดทศนิยม": สร้างฟังก์ชัน formatMoneyNoDecimals ใน js/wbs.js และนำมาใช้จัดรูปแบบมูลค่า AUC ทั้งหมดในการ์ดสถานะ SAP (ทั้งการ์ด "ทั้งหมด" และการ์ดแต่ละสถานะ) รวมถึงมูลค่าของงานที่เลือก Checkbox ให้เป็นตัวเลขจำนวนเต็ม ไม่มีจุดทศนิยม (.00) อ่านง่ายและกะทัดรัดยิ่งขึ้น 3) ใน css/styles.css เพิ่มสถานะ :disabled สำหรับปุ่มล้างข้อมูลเมื่อไม่มีรายการเลือก',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก และย้ายตำแหน่งล้างข้อมูลที่เลือกตามรูป / มูลค่า ในการ์ด ไม่ต้องมีจุดทศนิยม)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงเลย์เอาต์การนำกล่องล่างออก ย้ายปุ่มล้างข้อมูล และจัดรูปแบบตัวเลขจำนวนเต็มในการ์ด)'
    },
    {
      id: 'log_000_wbs_sap_card_cb_remove_pct_lock_2_rows_bright_bg',
      timestamp: '2026-10-18 15:55:00',
      timestampTh: '18 ต.ค. 2569, 15:55 น.',
      type: 'EDIT',
      typeBadge: 'ล็อค 2 บรรทัด & สีใสสว่าง',
      badgeClass: 'badge-type-edit',
      title: 'นำ % ออกจากการ์ดส่วนที่เลือก, ล็อคการแสดงผลตายตัว 2 บรรทัด (จำนวนงาน/มูลค่า) ตัวเลขไม่โดนบัง และปรับสีพื้นหลังที่เลือกให้สีใสสว่างไม่ทึบ',
      targetSubject: 'กล่องสรุปผล Checkbox ด้านล่างการ์ดสรุปสถานะ SAP (#wbsSapSummarySection .wbs-sap-card-cb-box)',
      storageFile: 'css/styles.css, js/wbs.js & js/data_history.js',
      changeSummary: '1) นำ % สัดส่วนออกจากการ์ดส่วนที่เลือกทั้งหมด 2) ล็อคโครงสร้างการแสดงผลให้อยู่ 2 บรรทัดพอดี: บรรทัดที่ 1 แสดงไอคอนพร้อมจำนวนงาน (เช่น "✓ เลือก 11 งาน") บรรทัดที่ 2 แสดงป้ายมูลค่าพร้อมตัวเลขอักษรสีฟ้าเต็มจำนวนไม่โดนบัง 3) ปรับขนาดการ์ด min-width 165px และปรับ white-space: nowrap ป้องกันตัวเลขตกบรรทัด 4) ปรับสีพื้นหลังที่เลือกให้เป็นสีใสๆ สว่างๆ กระจกเรืองแสง (Translucent Glow) ไม่มืดทึบ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 คำสั่งต่อเนื่อง (เอา % ออก และเลือกแล้วตัวเลขต้องไม่โดนบัง ให้ล็อคอยู่ 2 บรรทัด บรรทัดจำนวนงาน บรรทัดมูลค่า / ปรับสีพื้นหลังที่เลือกให้ สีใสๆ สว่างง ไม่ทึบ แบบนี้): 1) ใน js/wbs.js ตัดสัดส่วน % ออกจากการ์ด "ทั้งหมด" และการ์ดทุกสถานะ SAP 2) ปรับโครงสร้าง HTML เป็น 2 แถวตายตัว: .wbs-sap-cb-row-jobs สำหรับบรรทัดจำนวนงาน และ .wbs-sap-cb-row-auc สำหรับบรรทัดมูลค่า 3) ใน css/styles.css ปรับความกว้าง .wbs-sap-card เป็น min-width: 165px พร้อมจัดวางตัวเลขมูลค่าให้แสดงผลได้เต็มจำนวน 100% ไม่โดนขอบตัด 4) ปรับสีพื้นหลังเมื่อมีรายการเลือก (.has-selection) ให้เป็น Gradient โปร่งแสงสว่างใส ไม่เข้มทึบดำ พร้อม Inner/Outer Glow นุ่มนวลสวยงามทั้ง Dark และ Light Theme',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอา % ออก และเลือกแล้วตัวเลขต้องไม่โดนบัง ให้ล็อคอยู่ 2 บรรทัด บรรทัดจำนวนงาน บรรทัดมูลค่า / ปรับสีพื้นหลังที่เลือกให้ สีใสๆ สว่างง ไม่ทึบ แบบนี้)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุง Typography และความสว่างใสของพื้นหลังกล่อง Checkbox ภายในการ์ด SAP)'
    },
    {
      id: 'log_000_wbs_full_bleed_sap_card_checkbox_status_bg',
      timestamp: '2026-10-18 15:45:00',
      timestampTh: '18 ต.ค. 2569, 15:45 น.',
      type: 'EDIT',
      typeBadge: 'ปรับสีพื้นหลังภาวะปกติตามสถานะ',
      badgeClass: 'badge-type-edit',
      title: 'เปลี่ยนสีพื้นหลังภาวะปกติในส่วนที่เลือกของการ์ดสรุปสถานะ SAP ตามสี CLSD, TECO, REL และแผ่เต็มพื้นที่การ์ดส่วนล่าง',
      targetSubject: 'การ์ดสรุปสถานะ SAP (#wbsSapSummarySection) ในส่วนแสดงผล Checkbox ด้านล่างการ์ด',
      storageFile: 'css/styles.css & js/data_history.js',
      changeSummary: '1) ปรับสีพื้นหลังในภาวะปกติ (Idle State / ยังไม่มีการเลือก) ของส่วน Checkbox ด้านล่างการ์ดให้แสดงสีตามกลุ่มสถานะ SAP ทันที (CLSD โทนเขียวมิ้นท์, TECO โทนเหลืองอำพัน, REL โทนแดงคอรัล และ ALL โทนฟ้า) 2) ปรับแต่งเลย์เอาต์ให้กล่องส่วนที่เลือกแผ่ขยายเต็มความกว้างและชนขอบล่างของการ์ด (Full-bleed Bottom Flush) แนบสนิทสวยงามไร้รอยต่อ พร้อมเส้นคั่นด้านบนตามสีสถานะ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เปลี่ยนสีพื้นหลัง ภาวะปกติ ตามสี CLSD TECO REL ให้เต็มการ์ดส่วนที่เลือก): 1) ใน css/styles.css ปรับ .wbs-sap-card เป็น padding: 0 และ overflow: hidden เพื่อให้ส่วนล่างสามารถแผ่กว้างชนขอบซ้าย ขวา และล่างได้ 100% 2) กำหนด padding ของ .wbs-sap-card-main-info เป็น 0.65rem 0.75rem 0.45rem 0.75rem รักษาระยะตัวอักษรและ Badge ด้านบนให้เท่าเดิม 3) ปรับ .wbs-sap-card-cb-box ให้ margin: 0, width: 100%, border-radius: 0 0 9px 9px พร้อมเส้นขอบบน border-top 1px solid คั่นระหว่างส่วนบนกับส่วนล่างอย่างชัดเจน 4) กำหนดสีพื้นหลังภาวะปกติ (.cat-all, .cat-clsd, .cat-teco, .cat-rel) ให้เป็น Gradient สีโปร่งแสงตามเฉดสีของแต่ละสถานะ SAP ทันทีตั้งแต่เริ่มต้น และเรืองแสงสว่างเข้มข้นยิ่งขึ้นเมื่อมีรายการถูกเลือก (.has-selection) 5) รองรับ Light Theme อย่างสมบูรณ์แบบ',
      sourceFile: 'คำสั่งผู้ใช้งาน (เปลี่ยนสีพื้นหลัง ภาวะปกติ ตามสี CLSD TECO REL ให้เต็มการ์ดส่วนที่เลือก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุง UI ส่วน Checkbox ของการ์ดสรุปสถานะ SAP ให้เต็มพื้นที่และมีสีสันตามสถานะในภาวะปกติ)'
    },
    {
      id: 'log_000_wbs_integrate_checkbox_into_sap_summary_cards',
      timestamp: '2026-10-18 15:35:00',
      timestampTh: '18 ต.ค. 2569, 15:35 น.',
      type: 'EDIT',
      typeBadge: 'รวมการ์ด Checkbox ในการ์ด SAP',
      badgeClass: 'badge-type-edit',
      title: 'ย้ายข้อมูลรายการที่เลือก Checkbox มารวมอยู่ในการ์ดสรุปสถานะ SAP แต่ละสถานะและทั้งหมด พร้อมแสดงอักษรสีฟ้าและพื้นหลังสีพิเศษตามสีสถานะ SAP',
      targetSubject: 'การ์ดสรุปสถานะ SAP (#wbsSapSummarySection) และการ์ดสรุปรายการที่เลือก (#wbsSelectedSummaryCard)',
      storageFile: 'css/styles.css, js/wbs.js & js/data_history.js',
      changeSummary: '1) ย้ายข้อมูลการเลือก Checkbox จากการ์ดด้านล่างขึ้นมารวมไว้ในการ์ดสรุปสถานะ SAP ด้านบน ทั้งการ์ด "ทั้งหมด" และการ์ดแยกแต่ละสถานะตรงตามสี 2) เพิ่มกล่องแสดงผลด้านล่างของการ์ดแต่ละใบ ด้วยอักษรสีฟ้า (#38BDF8) แสดงจำนวนงานและมูลค่า AUC ที่เลือก และมีพื้นหลังสีพิเศษสว่างเด่นขึ้นมาตามสีสถานะ SAP เมื่อมีรายการเลือก (ALL สีฟ้า, CLSD สีเขียวมิ้นท์, TECO สีเหลืองอำพัน, REL สีแดง) 3) ปรับปรุงให้การ์ดสรุป Checkbox ด้านล่างซ่อนการ์ดย่อยที่ซ้ำซ้อน คงไว้เฉพาะแถบ Progress Bar สรุปภาพรวมแบบกะทัดรัดเมื่อมีงานที่เลือก และซ่อนอัตโนมัติเมื่อไม่มีการเลือก',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 3 ข้ออย่างสมบูรณ์แบบ: 1) ใน js/wbs.js ปรับปรุงฟังก์ชัน renderWbsSapSummary ให้ตรวจนับรายการที่ถูกเลือก Checkbox (wbsState.selectedWbs) ทั้งยอดรวมทั้งหมดและแยกตามแต่ละสถานะ SAP 2) เพิ่มกล่องย่อย .wbs-sap-card-cb-box ภายในการ์ดแต่ละใบ โดยใช้ตัวอักษรสีฟ้า (#38BDF8 / #67E8F9) แสดงจำนวนงานและมูลค่าที่เลือก พร้อมป้ายแท็กไอคอนเลือกกะทัดรัด 3) ใน css/styles.css กำหนดคลาส .has-selection และ .no-selection โดยเมื่อมีงานถูกเลือกจะแสดงพื้นหลัง Gradient สีพิเศษ ขอบเรืองแสง และเงา Box-shadow ตามสีของแต่ละสถานะ SAP (cat-all, cat-clsd, cat-teco, cat-rel) พร้อมรองรับทั้ง Dark และ Light Theme 4) ปรับปรุง toggleWbsRowCheckbox ให้เรียก renderWbsSapSummary แบบ Reactive อัปเดตการ์ด SAP ทันทีที่คลิก Checkbox ในตาราง 5) ปรับปรุง renderWbsSelectedSummaryCard ให้นำ cardsHtml ซ้ำซ้อนออก คงไว้เฉพาะแถบสรุป Progress Bar ที่เพรียวบางสวยงาม และซ่อนเมื่อไม่มีการเลือก (selectedCount === 0)',
      sourceFile: 'คำสั่งผู้ใช้งาน (1..ให้ย้ายข้อมูลในการ์ด ที่เลือก check box ไปไว้ในการ์ด สรุปสถานะ sap ให้ตรงตามการ์ดสถานะ sap และสถานะทั้งหมดด้วย 2.เมื่อรวมในการ์ดเดียวกันแล้ว ให้ข้างล่างการ์ดแสดงข้อมูลที่เลือก check box ด้วยอักษรสีฟ้า มีจำนวนงาน/มูลค่า และมีพื้นหลังสีพิเศษขึ้นมาตามสีสถานะ sap 3.จัดรูปแบบสีสวยงาม สมส่วน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงโครงสร้างการ์ดสรุปสถานะ SAP ให้แสดงผลรวมรายการ Checkbox แบบ All-in-one)'
    },
    {
      id: 'log_000_wbs_show_selected_auc_total_and_move_status_to_title',
      timestamp: '2026-10-18 14:10:00',
      timestampTh: '18 ต.ค. 2569, 14:10 น.',
      type: 'EDIT',
      typeBadge: 'แสดงมูลค่ารวมที่เลือก',
      badgeClass: 'badge-type-edit',
      title: 'แสดงป้ายมูลค่ารวม (AUC) ที่เลือกบนหัวการ์ดกราฟแท่ง WBS และแสดงชื่อสถานะที่เลือกครบถ้วนด้านบน',
      targetSubject: 'หัวการ์ดกราฟแท่ง WBS (#wbsOfficesChartTitle & #wbsOfficesChartAucBadge)',
      storageFile: 'index.html, js/wbs.js & js/data_history.js',
      changeSummary: '1) เพิ่มป้ายแท็กสีฟ้าสดใส (#wbsOfficesChartAucBadge) แสดง "มูลค่ารวม: ฿..." ต่อท้ายป้ายจำนวนหน่วยงานและงานคงเหลือบนหัวการ์ดกราฟแท่ง WBS แบบ Real-time ตามสถานะที่ถูกเลือก 2) ปรับปรุงชื่อหัวเรื่องการ์ดกราฟ (#wbsOfficesChartTitle) ให้แสดงรายชื่อสถานะ SAP ที่ถูกเลือกทั้งหมดอย่างครบถ้วนตามคำสั่งผู้ใช้งาน (ย้ายด้านบน) โดยไม่ตัดทอนด้วยเครื่องหมาย ... 3) นำป้ายสถานะซ้ำซ้อนออกจากแถวคำแนะนำด้านล่างการ์ด เพื่อรักษาความสะอาดตาและเป็นระเบียบของหน้าจอ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 ส่วน: 1) ใน index.html เพิ่มแท็ก <span id="wbsOfficesChartAucBadge" class="tab-badge"> สไตล์สีฟ้าเรืองแสง (rgba(56,189,248,0.18)) ไว้ข้างขวาของป้ายจำนวนงานคงเหลือ 2) ใน js/wbs.js ปรับฟังก์ชัน renderTopOfficesChart ให้อ่านและรวมยอด cn41ActualCost แยกตามหน่วยงานและยอดรวมทั้งหมดของรายการที่กำลังกรอง จากนั้นอัปเดต aucBadgeEl แสดงผล เช่น "มูลค่ารวม: ฿1,554,614.97" ทันที 3) ปรับปรุงการกำหนด titleEl.textContent ให้นำ activeSapList มาเชื่อมด้วยเครื่องหมายจุลภาคแบบครบถ้วน ("กอง/กฟฟ. ที่มีงานสถานะ: TECO D3, TECO D2") 4) ปรับปรุง renderWbsSapSummary ให้แถบ actions แสดงข้อความแนะนำอย่างคงที่ คลีน สวยงาม',
      sourceFile: 'คำสั่งผู้ใช้งาน (ย้ายด้านบน, แสดงมูลค่ารวม ที่เลือกด้วย)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เพิ่มการแสดงผลมูลค่าเงินรวมที่เลือกบนหัวการ์ดกราฟแท่งแบบไดนามิก)'
    },
    {
      id: 'log_000_wbs_add_select_all_sap_cards_btn_and_reorder_sections',
      timestamp: '2026-10-18 14:00:00',
      timestampTh: '18 ต.ค. 2569, 14:00 น.',
      type: 'EDIT',
      typeBadge: 'ปุ่มเลือกทุกสถานะ & จัดลำดับการ์ด',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มปุ่มเลือกการ์ดทุกสถานะ, ปรับปุ่มล้างข้อมูลล้างทั้งการ์ดและกราฟ, ย้ายแถบเปรียบเทียบ KPI 5 ไว้บนสุด และย้ายหัวข้อสรุปสถานะ SAP กลับไว้บนการ์ด',
      targetSubject: 'แถบเครื่องมือหัวการ์ดกราฟ (#wbsOfficeChartSelectAllBtn), การ์ดสรุปเป้าหมาย KPI 5 (#wbsTargetComparisonSection) และส่วนสรุปสถานะ SAP (#wbsSapSummarySection)',
      storageFile: 'index.html, css/styles.css, js/wbs.js & js/data_history.js',
      changeSummary: '1) เพิ่มปุ่ม "เลือกทุกสถานะ" สีฟ้าสดใส (.btn-wbs-card-select-all) ไว้ด้านบนขวาข้างปุ่มล้างข้อมูล เมื่อคลิกจะเลือกการ์ดสถานะ SAP ทุกใบให้ Active ทันที 2) ปรับปรุงฟังก์ชัน clearAllWbsSelection ให้ปุ่มล้างข้อมูลทำการล้างทั้งการเลือกสถานะการ์ด, กรองหน่วยงานบนกราฟ และรายการ Checkbox พร้อมกันในคลิกเดียว 3) ย้ายการ์ดเปรียบเทียบการปิดมูลค่าตามเป้าหมายระดับ KPI 5 ขึ้นไปไว้ด้านบนสุดเหนือการ์ดกราฟแท่ง WBS 4) ย้ายแถบหัวข้อและคำแนะนำสรุปสถานะ SAP กลับขึ้นไปไว้ด้านบนการ์ดสถานะเหมือนเดิม',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 4 ส่วน: 1) ใน index.html และ css/styles.css เพิ่มปุ่ม .btn-wbs-card-select-all สีฟ้า Gradient (#2563EB - #1D4ED8) ขอบเรืองแสงพร้อมไอคอน Check-check สั่งฟังก์ชัน selectAllWbsSapStatuses เลือกสถานะ SAP ทุกประเภทที่พบในระบบ 2) ปรับปรุง clearAllWbsSelection ใน js/wbs.js ให้ล้าง wbsState.selectedSapStatuses, wbsState.sapStatus = "ALL", wbsState.office = "ALL", wbsOfficeFilterSelect.value = "ALL" และ wbsState.selectedWbs.clear() ทำให้ทั้งการ์ดและกราฟคืนค่ากลับสู่ค่าเริ่มต้นทั้งหมด 3) ย้าย #wbsTargetComparisonSection ขึ้นไปอยู่ด้านบนสุดใต้แถบตัวกรองหลัก 4) ปรับปรุง renderWbsSapSummary ให้ headerHtml แสดงผลก่อน cardsHtml ทำให้หัวเรื่องและคำแนะนำอยู่ด้านบนการ์ดสถานะตามเดิม',
      sourceFile: 'คำสั่งผู้ใช้งาน (เพืมปุ่มเลือกการ์ด ทุกสถานะทั้งหมด ไว้ด่านบน, ปุ่มล้างข้อมูล ให้ล้างทั้งสถานะการ์ด และกราฟ, ย้าย เปรียบเทียบการปิดมูลค่าตามเป้าหมายระดับ KPI 5 ไว้ด้านบน, ย้ายไว้ด้านบนเหมือนเดิม)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงฟังก์ชันการเลือก/ล้างสถานะ และการจัดวางโครงสร้าง Layout บนหน้าจอ WBS คงเหลือ)'
    },
    {
      id: 'log_000_wbs_chart_filter_by_selected_sap_status_card',
      timestamp: '2026-10-18 13:45:00',
      timestampTh: '18 ต.ค. 2569, 13:45 น.',
      type: 'EDIT',
      typeBadge: 'กรองกราฟตามการ์ด SAP',
      badgeClass: 'badge-type-edit',
      title: 'ปรับปรุงให้กราฟแท่ง WBS แสดงเฉพาะสถานะ SAP ที่ถูกเลือกจากการ์ดสรุปสถานะทุกๆ สถานะ',
      targetSubject: 'กราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (#wbsOfficesBarChart)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'เมื่อผู้ใช้งานคลิกเลือกการ์ดสถานะ SAP ใดๆ (เช่น TECO D3, CLSD F4, หรือหลายสถานะพร้อมกัน) กราฟแท่ง WBS จะกรองและแสดงผลเฉพาะข้อมูลงานและหน่วยงานที่มีสถานะ SAP ตามที่เลือกในการ์ดเท่านั้น พร้อมอัปเดตหัวเรื่องและป้ายสรุปจำนวนหน่วยงาน/งานคงเหลือให้สอดคล้องกันแบบ Real-time',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (หากเลือกสถานะsapที่การ์ด ให้กราฟแสดงเฉพาะที่เลือกในการ์ด ทุกๆ สถานะ): 1) ในฟังก์ชัน renderWbsTab ปรับการส่งข้อมูลให้ renderWbsCharts โดยตรวจสอบเงื่อนไข hasSapFilter หากมีการเลือกสถานะ SAP ให้ใช้ getFilteredWbsData(true, false) เพื่อส่งเฉพาะชุดข้อมูลที่ผ่านการกรองสถานะ SAP เข้าสู่กราฟแท่ง 2) ปรับปรุงฟังก์ชัน renderTopOfficesChart ให้หัวเรื่องการ์ด (#wbsOfficesChartTitle) แสดงชื่อสถานะ SAP ที่กำลังกรองอย่างชัดเจน (เช่น "กอง/กฟฟ. ที่มีงานสถานะ TECO D3") และอัปเดตป้ายตัวเลขจำนวนหน่วยงานและงานคงเหลือให้ตรงกับข้อมูลที่แสดง 3) รองรับการเลือกพร้อมกันหลายสถานะ (Multi-selection) และเมื่อคลิกการ์ด "ทั้งหมด" หรือปุ่ม "ล้างข้อมูล" กราฟจะกลับมาแสดงผลครบทุกหน่วยงานและทุกสถานะทันที',
      sourceFile: 'คำสั่งผู้ใช้งาน (หากเลือกสถานะsapที่การ์ด ให้กราฟแสดงเฉพาะที่เลือกในการ์ด ทุกๆ สถานะ)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงฟังก์ชันการเชื่อมโยงการกรองข้อมูลระหว่างการ์ดสรุปสถานะ SAP และกราฟแท่ง WBS)'
    },
    {
      id: 'log_000_wbs_remove_btn_clear_sap_all',
      timestamp: '2026-10-18 13:38:00',
      timestampTh: '18 ต.ค. 2569, 13:38 น.',
      type: 'EDIT',
      typeBadge: 'นำปุ่มแสดงทั้งหมดออก',
      badgeClass: 'badge-type-edit',
      title: 'นำปุ่ม "✕ แสดงทั้งหมด" ในแถบสรุปสถานะ SAP ออกตามคำสั่งผู้ใช้งาน',
      targetSubject: 'แถบสรุปสถานะ SAP (#wbsSapSummarySection) ในแท็บ WBS คงเหลือ',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'นำปุ่ม "✕ แสดงทั้งหมด" (.btn-wbs-sap-clear) ออกจากแถบคำแนะนำใต้การ์ดสรุปสถานะ SAP เพื่อลดความซ้ำซ้อน เนื่องจากระบบมีปุ่ม "ล้างข้อมูล" สีแดงหลักบนหัวการ์ด และการ์ด "ทั้งหมด" ให้คลิกใช้งานได้อย่างสะดวกอยู่แล้ว',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เอาออก - พร้อมรูปปุ่ม "✕ แสดงทั้งหมด"): ลบปุ่ม .btn-wbs-sap-clear ใน headerHtml ของฟังก์ชัน renderWbsSapSummary คงเหลือเฉพาะป้ายแจ้งสถานะการกรอง (.wbs-sap-active-pill) ทำให้แถบคำแนะนำด้านล่างการ์ดกระชับ คลีน และสวยงามลงตัว',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก - ภาพปุ่ม ✕ แสดงทั้งหมด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่ง UI นำปุ่มซ้ำซ้อนออก)'
    },
    {
      id: 'log_000_wbs_stripes_teco_d2_rel_c3_and_move_sap_title_below_cards',
      timestamp: '2026-10-18 13:35:00',
      timestampTh: '18 ต.ค. 2569, 13:35 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มลายเส้น TECO D2/REL C3 & ย้ายข้อความใต้การ์ด',
      badgeClass: 'badge-type-edit',
      title: 'ย้ายแถบหัวข้อ/คำแนะนำสถานะ SAP ไว้ด้านล่างการ์ด และเพิ่มลายเส้นทางเฉียงให้ TECO D2 และ REL C3 เหมือน CLSD F4 โดยคงสีเดิม',
      targetSubject: 'การ์ดสรุปสถานะ SAP (#wbsSapSummarySection) และกราฟแท่ง WBS (#wbsOfficesBarChart)',
      storageFile: 'js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) ย้ายแถวข้อความหัวข้อและคำแนะนำการคลิกกรองไปไว้ด้านล่างแถวการ์ดสรุปสถานะ SAP ตามแนวลูกศรสีแดง 2) เพิ่มลวดลายทางเฉียง 45 องศา (Stripe Pattern) ให้กับสถานะ TECO D2 (สีเหลืองอำพันคงเดิม) และ REL C3 (สีแดงคอรัลคงเดิม) ทั้งในแท่งกราฟ Canvas และบนป้าย Badge ของการ์ด ให้เหมือนกับสถานะ CLSD F4',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 2 ส่วน: 1) ปรับปรุงลำดับการแสดงผลใน renderWbsSapSummary ให้ cardsHtml แสดงผลก่อน headerHtml พร้อมปรับแต่งเส้นคั่นประและระยะห่าง CSS ทำให้การ์ดทั้ง 10 ใบอยู่ติดกับหัวการ์ดหลัก และมีคำอธิบายพร้อมคำแนะนำกรองกำกับอยู่ด้านล่างอย่างเป็นระเบียบ 2) ปรับปรุงฟังก์ชัน getSapSegmentStyle ให้สถานะ TECO D2 และ REL C3 มีคุณสมบัติ hasPattern: true และเส้นขอบหนา 1.5px (เหมือน CLSD F4) 3) ในกราฟแท่ง Canvas (drawCanvasBarSegment) นำ CanvasPattern ลายทางเฉียงมาระบายทับบน Base Gradient ของ TECO D2 และ REL C3 โดยไม่เปลี่ยนแปลงสีเดิม 4) ในการ์ดสรุปสถานะ SAP ปรับ badgeStyleAttr ของ TECO D2 ให้เป็น repeating-linear-gradient สีเหลืองทอง และ REL C3 เป็น repeating-linear-gradient สีแดงสด สวยงาม คมชัด และสอดคล้องกันทั้งระบบ',
      sourceFile: 'คำสั่งผู้ใช้งาน (ย้ายไว้ด้านล่างการ์ด / เพิ่มกราฟ teco d2 และ rel c3 ให้มีลายเส้นเหมือน clsd f4 แต่มีสีคงเดิม)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุง UI สรุปสถานะ SAP และลวดลายกราฟิกในกราฟแท่ง WBS)'
    },
    {
      id: 'log_000_wbs_integrate_sap_cards_match_colors_red_clear_btn_remove_share',
      timestamp: '2026-10-18 13:25:00',
      timestampTh: '18 ต.ค. 2569, 13:25 น.',
      type: 'EDIT',
      typeBadge: 'รวมการ์ด SAP และปุ่มล้างข้อมูล',
      badgeClass: 'badge-type-edit',
      title: 'ย้ายการ์ดสรุปสถานะ SAP รวมในการ์ดกราฟแท่ง, ปรับสีการ์ดให้ตรงกับกราฟ, เพิ่มปุ่มล้างข้อมูลสีแดงบนขวา, นำ % สัดส่วนออก และปรับขนาดการ์ดแคบลงสมสัดส่วน',
      targetSubject: 'การ์ดกราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (#wbsSapSummarySection & #wbsOfficesBarChart)',
      storageFile: 'index.html, js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: '1) ย้ายแถวการ์ดสรุปสถานะ SAP ขึ้นไปรวมอยู่ในการ์ดกราฟแท่งด้านบน (ตำแหน่งกรอบสีน้ำเงิน) 2) ปรับสี ป้ายกำกับ และเส้นขอบของการ์ดแต่ละสถานะให้ตรงกับสีกราฟแท่ง (CLSD F4 เขียวมิ้นท์ลายทางเฉียง, TECO เหลืองทอง, REL แดงลดหลั่น) 3) เพิ่มปุ่มล้างข้อมูลสีแดงเด่นชัด (.btn-wbs-card-clear) บนมุมขวาของการ์ด 4) นำ % สัดส่วนมูลค่าออกจากการ์ดทั้งหมด 5) ปรับขนาดการ์ดให้แคบลงและสมส่วน (flex 102px) จัดวางเรียงแถวเดียวอย่างสวยงามพอดีหน้าจอ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ย้ายโครงสร้าง DOM ของ #wbsSapSummarySection เข้าไปอยู่ใน .content-card ระหว่างหัวการ์ดกับ Canvas กราฟแท่ง รวมการ์ดเป็นหนึ่งเดียวประหยัดพื้นที่แนวตั้ง 2) เชื่อมโยงฟังก์ชัน getSapSegmentStyle เข้ากับ renderWbsSapSummary เพื่อให้สีพื้นหลัง ป้ายกำกับ เส้นขอบ และลายทางเฉียง 45 องศาของ CLSD F4 ตรงกับเซกเมนต์ของกราฟแท่ง 100% 3) เพิ่มปุ่ม "ล้างข้อมูล" สีแดงสด (.btn-wbs-card-clear) พร้อมไอคอนถังขยะที่มุมบนขวาของ Header การ์ด สั่งล้างทั้งการเลือก Checkbox และตัวกรองสถานะ SAP (clearAllWbsSelection) 4) นำแท็ก <span class="wbs-sap-card-share"> ออกจากการ์ดทุกใบ 5) ปรับ CSS .wbs-sap-summary-integrated ให้การ์ดมีขนาดแคบลงและยืดหยุ่น (min-width: 102px, max-width: 155px, flex: 1 1 0) ทำให้การ์ดทั้ง 10 ใบเรียงตัวสวยงามในแถวเดียวพอดีกับจอภาพ',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.ให้ย้าย การ์ดสรุปสถานะ sap ไปไว้กรอบสีน้ำเงิน อยู่รวมกับกราฟด้านบน ให้สมส่วนในหน้าเดียว 2.ปรับสี สถานะกราฟในการ์ด ให้ตรงกับสีกราฟแท่ง / เพิ่มปุ่มล้างข้อมูล บนขวาสีแดง / % สัดส่วนมูลค่าเอาออก และปรับขนาดการ์ดให้แคบลง สมสัดส่วน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงโครงสร้าง Layout, UI สรุปสถานะ SAP, พาเลตต์สี และเพิ่มปุ่มล้างข้อมูล)'
    },
    {
      id: 'log_000_wbs_cancel_donut_chart_addition',
      timestamp: '2026-10-18 13:06:00',
      timestampTh: '18 ต.ค. 2569, 13:06 น.',
      type: 'CONFIG',
      typeBadge: 'ยกเลิกเพิ่มกราฟวงกลม',
      badgeClass: 'badge-type-config',
      title: 'ยกเลิกคำสั่งเพิ่มกราฟวงกลม และคงการแสดงผลสรุปสถานะ SAP ตามรูปแบบการ์ดแนวนอนเดิม',
      targetSubject: 'ส่วนสรุปสถานะ SAP (#wbsSapSummarySection) ในแท็บ WBS คงเหลือ',
      storageFile: 'js/wbs.js, css/styles.css & js/data_history.js',
      changeSummary: 'ยกเลิกการเพิ่มกราฟวงกลมตามคำสั่งผู้ใช้งาน โดยคงรูปแบบการ์ดสรุปสถานะ SAP และเปอร์เซ็นต์สัดส่วนมูลค่าทั้งหมดไว้ตามโครงสร้างเดิม',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (ยกเลิกคำสั่ง เพิ่มกราฟวงกลม ให้ชัดเจนทุกตัวเลข โดยใช้ข้อมูลตามรูป 7): 1) คืนค่าฟังก์ชัน renderWbsSapSummary ใน js/wbs.js สู่รูปแบบเดิม 2) คงการแสดงผลการ์ดสถานะ SAP แนวนอนพร้อมตัวเลขและสัดส่วน % ไว้อย่างครบถ้วน 3) นำสไตล์ CSS ส่วนเกินออกจาก css/styles.css เพื่อรักษาความกระชับของระบบ',
      sourceFile: 'คำสั่งผู้ใช้งาน (ยกเลิกคำสั่ง เพิ่มกราฟวงกลม ให้ชัดเจนทุกตัวเลข โดยใช้ข้อมูลตามรูป 7)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ'
    },
    {
      id: 'log_000_wbs_chart_remove_header_legend_and_action_buttons',
      timestamp: '2026-10-18 12:45:00',
      timestampTh: '18 ต.ค. 2569, 12:45 น.',
      type: 'EDIT',
      typeBadge: 'นำ Legend & ปุ่มหัวการ์ดออก',
      badgeClass: 'badge-type-edit',
      title: 'นำแถบ Legend สรุปสถานะ และปุ่มเลือกมุมมองกราฟ ออกจากหัวการ์ดกราฟ WBS',
      targetSubject: 'หัวการ์ดกราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'index.html, js/wbs.js & js/data_history.js',
      changeSummary: 'นำส่วนแสดงผลที่อยู่ในกรอบสีแดงทั้งหมดตามรูปภาพ ได้แก่ แถบ Legend สรุปยอดคงเหลือสถานะ CLSD/TECO/REL, สัญลักษณ์คำอธิบายสีและลวดลาย, และปุ่มสลับมุมมอง (ทั้งหมด/10 อันดับแรก, แบบซ้อน/แบบแยก) ออกจากหัวการ์ดกราฟ เพื่อความเรียบง่าย คลีน และสวยงาม',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน (เอาออก) พร้อมรูปภาพระบุกรอบสีแดง: 1) นำองค์ประกอบ <div id="wbsChartLegend"> ทั้งหมดออกจาก index.html 2) นำกลุ่มปุ่ม <div class="card-actions"> (wbsChartScopeBtnAll, wbsChartScopeBtnTop10, wbsChartModeBtnStacked, wbsChartModeBtnGrouped) ออกจาก index.html 3) คงเหลือเฉพาะหัวข้อการ์ดและป้ายสรุปจำนวนหน่วยงานและงานคงเหลือ (20 หน่วยงาน คงเหลือ 287 งาน) เพื่อให้หัวการ์ดดูโปร่ง สะอาดตา และไม่เกะกะสายตา',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก - พร้อมภาพระบุกรอบสีแดงบริเวณหัวการ์ด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับปรุงความเรียบง่ายของ UI หัวการ์ดกราฟแท่ง WBS)'
    },
    {
      id: 'log_000_wbs_chart_striped_green_containment_fix',
      timestamp: '2026-10-18 12:25:00',
      timestampTh: '18 ต.ค. 2569, 12:25 น.',
      type: 'EDIT',
      typeBadge: 'แก้ไขลวดลายให้อยู่ในกราฟ',
      badgeClass: 'badge-type-edit',
      title: 'แก้ไขลวดลายทางเฉียงสีเขียวให้อยู่เฉพาะในแท่งกราฟ ไม่ให้ล้นเกินออกมานอกกราฟ',
      targetSubject: 'กราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js & js/data_history.js',
      changeSummary: 'เปลี่ยนการวาดลายทางเฉียงจากเดิมที่ใช้การขีดเส้นข้ามพิกัดแล้ว clip ซึ่งเกิดการรั่วไหลของเส้น ออกมานอกกรอบแท่ง เป็นการใช้ Path2D ร่วมกับ CanvasPattern (createPattern) ระบายลวดลายลงบน Path ของแท่งโดยตรง ทำให้ลวดลายถูกจำกัดอยู่ภายในแท่ง 100% ไม่ล้นเกินออกมานอกแท่งกราฟอีกต่อไป',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) สร้างฟังก์ชัน getWbsStripePattern เพื่อสร้าง CanvasPattern ลายทางเฉียง 45 องศาแบบแคช 2) ปรับปรุงฟังก์ชัน drawCanvasBarSegment ให้ใช้ Path2D.roundRect และระบายสีพื้นหลักด้วย ctx.fill(p) จากนั้นระบายลวดลายด้วย ctx.fillStyle = pat; ctx.fill(p) ทำให้ลวดลายถูกกักอยู่เฉพาะในรูปทรงของแท่งกราฟอย่างแม่นยำ 100% แก้ไขปัญหาเส้นลายทางเฉียงแลบออกมาระหว่างแท่งกราฟได้อย่างถาวร',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขลวดลายสีเขียว ให้อยู่ในกราฟ ไม่ให้เกินกราฟออกมาแบบนี้)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (แก้ไขข้อบกพร่องการเรนเดอร์ลวดลายกราฟิกใน Canvas)'
    },
    {
      id: 'log_000_wbs_chart_striped_green_match_user_img4',
      timestamp: '2026-10-18 12:15:00',
      timestampTh: '18 ต.ค. 2569, 12:15 น.',
      type: 'EDIT',
      typeBadge: 'ปรับสีเขียวมีลายรูป 4',
      badgeClass: 'badge-type-edit',
      title: 'ปรับเฉดสีและเส้นขอบสถานะ CLSD F4/F2 ให้เป็นสีเขียวมิ้นท์มีลายทางเฉียงตามรูป 4',
      targetSubject: 'กราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js, index.html & js/data_history.js',
      changeSummary: 'ปรับเฉดสี CLSD F4/F2 ตามเกณฑ์วัดให้ตรงตามรูป 4: ไล่ระดับสีเขียวมิ้นท์พาสเทลด้านบน (#CBFCE6) ผ่านสีเขียวมิ้นท์สดใส (#48D0A2) สู่สีเขียวมรกต (#10B981) พร้อมเส้นขอบสีมิ้นท์สว่างมนสวย (#A1FCDB ขนาด 1.5px) และตัวเลขสีเข้ม #022C22 คมชัดเด่นชัด 100%',
      details: 'วิเคราะห์ค่าสีจากรูป 4 ของผู้ใช้งาน (media_1792300221405.jpg) พบว่า: 1) สีด้านบนสุดเป็นสีเขียวมิ้นท์พาสเทลสว่าง #CBFCE6 ไล่ลงมายัง #48D0A2 และ #10B981 2) ขอบมนเป็นสีมิ้นท์สว่าง #A1FCDB ความหนา 1.5px 3) ลายทางเฉียง 45 องศา สีขาวโปร่งใสความกว้าง 2px ระยะห่าง step 7px 4) ตัวเลขแสดงจำนวนงานเป็นสีเข้ม #022C22 พร้อม drop shadow สีขาว ทำให้อ่านง่าย คอนทราสต์สูงและสวยงามตรงตามรูป 4 ทุกประการ',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขสี CLSD F4/F2 ตามเกณวัด ให้เป็นสีเขียวตามรูป 4)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่งพาเลตต์สีและสไตล์ภาพกราฟิกสถานะ CLSD F4/F2 ตามที่ผู้ใช้ระบุ)'
    },
    {
      id: 'log_000_wbs_chart_striped_green_all_numbers_and_remove_hover_tooltip',
      timestamp: '2026-10-18 12:05:00',
      timestampTh: '18 ต.ค. 2569, 12:05 น.',
      type: 'EDIT',
      typeBadge: 'ปรับแต่งกราฟ WBS',
      badgeClass: 'badge-type-edit',
      title: 'เปลี่ยน CLSD F4/F2 เป็นสีเขียวมีลาย (ไม่เรืองแสงนีออน), แสดงตัวเลขจำนวนงานครบถ้วนทุกสถานะในแท่งกราฟ, และนำ Popup เมาส์เลื่อนออก',
      targetSubject: 'กราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js, index.html, css/styles.css & js/data_history.js',
      changeSummary: '1) เปลี่ยนสีสถานะ CLSD F4/F2 เป้าหมายปิดงาน จากสีเขียวนีออนเรืองแสง เป็นสีเขียวมีลายทางเฉียง 45 องศา (Striped Green Pattern) คมชัด สวยงาม กลมกลืนกับกราฟ 2) แก้ไขความสูงเซกเมนต์และการแสดงผลตัวเลข ให้แสดงจำนวนงานครบถ้วนทุกสถานะย่อยในแท่งกราฟ (รวมยอดภายในแท่งตรงกับยอดรวมด้านบน 100%) 3) นำกล่อง Popup ที่แสดงเมื่อเลื่อนเมาส์ (Hover Tooltip) ออกตามคำสั่งผู้ใช้งาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน 3 ข้อ: 1) ปรับปรุงฟังก์ชัน drawCanvasBarSegment ให้รองรับการตัดระนาบ (Clip Path) และวาดลายทางเฉียง 45 องศา พร้อมเส้นขอบสีเขียวมรกตคมชัด สำหรับสถานะ CLSD F4 และ CLSD F2 และยกเลิกเอฟเฟกต์เรืองแสงนีออน ทำให้ดูสวยงาม เรียบหรู กลมกลืน ไม่แปลกตา 2) คำนวณความสูงขั้นต่ำฐาน (Base Height 8.5-12.5px) ให้ทุกเซกเมนต์ที่มีงานคงเหลือ และเกลี่ยความสูงส่วนเกินตามสัดส่วนจำนวนงาน ทำให้สถานะย่อยทุกรายการมีพื้นที่เพียงพอ พร้อมยกเลิกเงื่อนไขการตัดทิ้ง ทำให้ตัวเลขจำนวนงานแสดงครบทุกสถานะในแท่งกราฟ 3) ปิดการแสดงผลกล่อง Popup (Tooltip) เมื่อเลื่อนเมาส์ผ่านแท่งกราฟ โดยยังคงฟังก์ชันการคลิกที่แท่งกราฟเพื่อกรองตารางตามหน่วยงานไว้อย่างสมบูรณ์ 4) ปรับปรุง Legend ป้ายกำกับบนหัวการ์ดให้แสดงสัญลักษณ์ "F4/F2 ลายเขียว"',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.แก้ไขสีเขียวนีออนเรืองแสงCLSD F4/F2 ให้เป็นสีเขียวมีลาย ดูแล้วแปลกจากอันอื่นๆ 2.แก้ไข กราฟยังแสดงจำนวนงาน ไม่ครบ ตามรูป 2 3.เอาตัวเมาเลื่อนแล้วแสดงออกไป)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงการแสดงผลกราฟแท่ง WBS ความครบถ้วนของข้อมูล และประสบการณ์ผู้ใช้งาน)'
    },
    {
      id: 'log_000_wbs_chart_sap_color_gradients',
      timestamp: '2026-10-18 11:35:00',
      timestampTh: '18 ต.ค. 2569, 11:35 น.',
      type: 'EDIT',
      typeBadge: 'ปรับสีกราฟตามสถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มรายละเอียดกราฟแท่ง WBS แยกและไล่ระดับสีตามสถานะ SAP (CLSD F4 เรืองแสง, TECO เหลืองเข้ม-อ่อน, REL แดงเข้ม-อ่อน) และไล่ระดับความสูงกราฟตามจำนวนงานคงเหลือมากสุดไปน้อยสุด',
      targetSubject: 'กราฟ กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js, index.html, css/styles.css & js/data_history.js',
      changeSummary: 'แสดงจำนวนงานและสีแยกตามสถานะ SAP ทุกรายการ: CLSD F4 เขียวเรืองแสง, TECO ไล่เหลืองเข้ม F ถึงอ่อน B, REL ไล่แดงเข้ม F ถึงอ่อน B, ไล่ระดับความสูงแท่งกราฟให้งานเยอะสุดมีความสูงมากสุดเสมอ และลดหลั่นลงตามจำนวนงานอย่างแม่นยำ 100%',
      details: 'ดำเนินการตามข้อกำหนด 6 ข้อของผู้ใช้งาน: 1) ปรับปรุงกราฟแท่งแบบซ้อนให้แบ่งเซกเมนต์ตามรหัสสถานะ SAP ย่อยจริง (CLSD F4, CLSD F2, TECO D2, REL C1, REL D1 ฯลฯ) 2) กำหนดสี CLSD เป็นสีเขียว โดย CLSD F4 มีเอฟเฟกต์สีเขียวนีออนเรืองแสง (ในเกณฑ์วัด 1, 2, 3, 5 และข้อ 4) และไล่ระดับความเข้มตามลำดับตัวอักษรและตัวเลข 3) TECO ใช้สีเหลืองเข้มโทนอำพันตามอักษร F ไปจนถึงสีเหลืองอ่อนโทน B 4) REL ใช้สีแดงเข้มจัด F/D ไปจนถึงสีแดงสว่าง C และแดงอ่อน B 5) ปรับสัดส่วนกราฟ (ความสูง 268px, plotH 168px) ให้กะทัดรัด ไม่สูงเกินไป แสดงตัวเลขจำนวนงานครบถ้วนชัดเจนในทุกเซกเมนต์ และอัปเกรด Tooltip แสดงรายละเอียดแยกสถานะ SAP อย่างละเอียด 6) คำนวณความสูงแท่งกราฟแบบ Strict Monotonic Cascading ให้หน่วยงานที่งานคงเหลือเยอะสุดกราฟสูงที่สุด และลดหลั่นลงมาตามจำนวนงานอย่างแม่นยำ ไม่ถูกดันด้วยจำนวนเซกเมนต์ย่อย',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.เพิ่มรายละเอียดกราฟแสดงจำนวนงานไล่ระดับสีตามสถานะ sap 2.CLSD เขียว F4 เรืองแสง 3.TECO เหลืองเข้ม F ถึงอ่อน B 4.REL แดงไล่ตามอักษรตัวเลข 5.จัดรูปแบบสมส่วนตัวเลขชัดเจน ความสูงกราฟไม่มาก 6.ให้ไล่ความสูงกราฟ ให้งานเยอะสุดความสูงกราฟมากสุด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงระบบการแสดงผลกราฟแท่งและการวิเคราะห์สถานะ SAP)'
    },
    {
      id: 'log_000_wbs_checkbox_rules_clsd_f2_and_clsd_e2',
      timestamp: '2026-10-18 00:15:00',
      timestampTh: '18 ต.ค. 2569, 00:15 น.',
      type: 'CONFIG',
      typeBadge: 'ปรับเงื่อนไข Checkbox WBS',
      badgeClass: 'badge-type-config',
      title: 'ปรับเงื่อนไข Checkbox: เกณฑ์วัดข้อ 1, 2, 3, 5 เพิ่ม Checkbox หากเป็น CLSD F2 และยกเว้น CLSD E2 ไม่แสดง Checkbox ทั้งหมด',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - เงื่อนไขการแสดงผล Checkbox และการเลือกจำลองเป้าหมาย',
      storageFile: 'js/wbs.js, js/data_history.js, index.html',
      changeSummary: '1) ในเกณฑ์วัดข้อ 1, 2, 3, 5 ปรับให้สถานะ CLSD F2 มี Checkbox ให้ผู้ใช้สามารถเลือกเพื่อคำนวณจำลองยอดปิดงานได้ (ยกเว้นเฉพาะ CLSD F4 ที่ปิดงานตามเป้าหมายแล้ว) 2) สถานะ CLSD E2 ให้เอา Checkbox ออกทั้งหมดทุกเกณฑ์วัด 3) เกณฑ์วัดข้อ 4 (งบ C02.2) ยังคงยกเว้น CLSD F2 ตามเป้าหมายปิดงานของข้อ 4',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) สร้างฟังก์ชัน isWbsItemExcludedFromCheckbox(sapVal, currentCrit) รวมศูนย์การตรวจสอบการยกเว้น Checkbox 2) สำหรับสถานะ CLSD E2 กำหนดให้ถูกยกเว้นทั้งหมด ไม่แสดง Checkbox ในทุกเกณฑ์วัด 3) สำหรับเกณฑ์วัดข้อ 1, 2, 3, 5 (เป้าหมายปิดงานคือ CLSD F4) กำหนดให้ยกเว้นเฉพาะ CLSD F4 เท่านั้น ดังนั้นงานที่มีสถานะ CLSD F2 จะมี Checkbox ปรากฏในตารางและสามารถเลือก Checkbox ได้อย่างถูกต้อง 4) สำหรับเกณฑ์วัดข้อ 4 กำหนดให้ยกเว้น CLSD F2 (ไม่มี Checkbox) 5) ซิงค์ฟังก์ชันการเลือกทั้งตาราง (Master Checkbox), การเลือกตามประเภทสถานะ SAP, และการสรุปผลการเลือกให้ทำงานสอดคล้องกัน 100%',
      sourceFile: 'คำสั่งผู้ใช้งาน (ให้ตรวจสอบ เลือกเกณวัดข้อ 1 2 3 5 เพิ่ม check box ถ้า CLSD F2 / หาก CLSD E2 ให้เอา check box ออกทั้งหมด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงตรรกะเงื่อนไข Checkbox ตาราง WBS และระบบจำลองยอดปิดงาน)'
    },
    {
      id: 'log_000_wbs_remove_outcome_footer_and_enlarge_top_row_font',
      timestamp: '2026-10-17 23:55:00',
      timestampTh: '17 ต.ค. 2569, 23:55 น.',
      type: 'EDIT',
      typeBadge: 'ปรับแต่งการ์ดผลลัพธ์ขวา',
      badgeClass: 'badge-type-edit',
      title: 'นำแถบเปอร์เซ็นต์ผลดำเนินการด้านล่างออกตามที่วงกลม และเพิ่มขนาดตัวอักษรแถวบนให้ชัดเจนโดดเด่น',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - การ์ดผลลัพธ์สถานะขวามือ (.wbs-kpi-outcome-col)',
      storageFile: 'js/wbs.js, css/styles.css, js/data_history.js, index.html',
      changeSummary: '1) นำบล็อกแสดง "ผลดำเนินการ XXX%" และหลอด Mini Progress Bar ล่างสุดออกตามภาพที่ผู้ใช้วงกลมสีแดง 2) เพิ่มขนาดตัวอักษรของแถวบน (ไอคอน, สถานะเป้าหมาย, และป้ายเดือน) ให้ใหญ่และอ่านง่ายเด่นชัดยิ่งขึ้น พร้อมจัดกึ่งกลางแนวตั้งของการ์ดให้สมดุลสวยงาม',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ลบ .outcome-col-footer ใน js/wbs.js ซึ่งแสดง "ผลดำเนินการ XXX%" และหลอดความคืบหน้าออกตามที่วงกลมสีแดง 2) ปรับขนาดฟอนต์แถวบน (.outcome-status-title) จาก 0.88rem เป็น 1.05rem (font-weight: 900) ปรับไอคอน (.outcome-icon) จาก 1.15rem เป็น 1.35rem และปรับป้ายเดือน (.outcome-month-badge) จาก 0.72rem เป็น 0.82rem 3) ปรับขนาดป้ายกำกับ (.outcome-col-lbl) เป็น 0.92rem และตัวเลขหลัก (.outcome-col-val) เป็น 1.55rem 4) กำหนด flex: 1 ใน .outcome-col-body ทำให้เนื้อหาตรงกลางถูกจัดวางกึ่งกลางแนวตั้งอย่างสมส่วน สวยงามลงตัวระดับพรีเมียม',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก ที่วงกลม / และเพิ่มขนาดตัวอักษรแถวบน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่ง UI การ์ดแสดงผลลัพธ์ KPI)'
    },
    {
      id: 'log_000_wbs_fix_progress_pct_reference_error',
      timestamp: '2026-10-17 23:48:00',
      timestampTh: '17 ต.ค. 2569, 23:48 น.',
      type: 'EDIT',
      typeBadge: 'แก้ไขตัวแปรแสดงผล WBS',
      badgeClass: 'badge-type-edit',
      title: 'แก้ไขข้อผิดพลาดตัวแปร progressPct ในการ์ดคอลัมน์ขวา ทำให้ข้อมูล WBS กลับมาแสดงผลอย่างถูกต้องสมบูรณ์',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - ฟังก์ชัน renderWbsTargetComparisonSection',
      storageFile: 'js/wbs.js, js/data_history.js, index.html',
      changeSummary: 'แก้ไข ReferenceError ของตัวแปร progressPct ภายในหลอด Mini Progress Bar ของคอลัมน์ผลลัพธ์ขวามือ โดยกำหนดตัวแปรให้ตรงกับ pctAchievedNum พร้อมใส่ค่าป้องกัน fallback ทำให้กราฟ ตาราง และตัวเลข WBS ทั้งหมดกลับมาแสดงผลทันที',
      details: 'ตรวจสอบพบว่าหลังจากจัดวางเลย์เอาต์คอลัมน์ขวามือ ในส่วนของ outcome-col-footer มีการเรียกใช้ตัวแปร progressPct โดยที่สโคปเดิมใช้ชื่อ pctAchievedNum ส่งผลให้เกิด ReferenceError ระหว่างการประมวลผลฟังก์ชัน renderWbsTargetComparisonSection จึงได้ทำการ: 1) ประกาศ const progressPct = pctAchievedNum 2) ใส่การป้องกัน null/NaN ด้วย (progressPct || 0).toFixed(1) และ Math.min(100, Math.max(0, progressPct || 0)) 3) ทดสอบเรนเดอร์ข้อมูลจริงผ่าน Headless Browser ยืนยันว่าประมวลผลผ่าน 100% ข้อมูล WBS ทั้งหมดกลับมาแสดงผลครบถ้วน',
      sourceFile: 'คำสั่งผู้ใช้งาน (ข้อมูลหาย / แก้ไข)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูง (แก้ไขบั๊กการแสดงผลข้อมูล WBS ทั้งระบบ)'
    },
    {
      id: 'log_000_wbs_kpi_move_banner_to_right_column_layout',
      timestamp: '2026-10-17 23:42:00',
      timestampTh: '17 ต.ค. 2569, 23:42 น.',
      type: 'EDIT',
      typeBadge: 'จัดเลย์เอาต์คอลัมน์ขวา',
      badgeClass: 'badge-type-edit',
      title: 'เปลี่ยนแถวสถานะล่างสุดเป็นคอลัมน์ชิดขวา (.wbs-kpi-outcome-col) วางประกบกราฟแท่ง 2 ชั้นอย่างสมส่วนและสวยงาม',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - การ์ดเปรียบเทียบเป้าหมาย KPI ระดับ 5 (.wbs-kpi-main-grid)',
      storageFile: 'js/wbs.js, css/styles.css, js/data_history.js, index.html',
      changeSummary: 'ยกเลิกแบนเนอร์แนวนอนล่างสุด (ที่ตีกรอบสีแดง) และปรับโครงสร้างเป็น Grid 2 คอลัมน์ โดยย้ายการ์ดผลลัพธ์และสรุปสถานะไปเป็นคอลัมน์แนวตั้งชิดขวา (ในกรอบสีน้ำเงิน) ประกบข้างกับกราฟแท่ง 2 ชั้นอย่างลงตัว ได้สัดส่วน และสวยงามระดับพรีเมียม',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) สร้างคอนเทนเนอร์ .wbs-kpi-main-grid ใช้ flexbox จัดวางกราฟ 2 ชั้น (.wbs-kpi-bars-box) ทางซ้าย (flex: 1) ประกบคู่กับการ์ดสรุปผลลัพธ์ (.wbs-kpi-outcome-col) ทางขวามือ (ความกว้าง 260px) 2) ตกแต่งคอลัมน์ผลลัพธ์ด้วยดีไซน์พรีเมียม ประกอบด้วย: หัวการ์ดแสดงไอคอนสถานะ (⚠️ ยังต้องปิดเพิ่มอีก หรือ 🎉 บรรลุเป้าหมายแล้ว!) พร้อมป้ายเดือนเป้าหมาย, ส่วนกลางแสดงตัวเลขคงเหลือ/เกินเป้าหมายขนาดใหญ่เด่นชัด (สีแดงเรืองแสง #FF6B6B หรือสีเขียวเรืองแสง #00FF88) พร้อมตัวเลขล้านบาทกำกับ, และส่วนล่างแสดงหลอด Mini Progress Bar และเปอร์เซ็นต์ผลดำเนินการ 3) ปรับย่อข้อความตัวเลขบนหัวกราฟล่างให้กระชับโดยตัดคำว่า "บาท" ออก (฿XX,XXX,XXX.XX (XX.XX ลบ.)) เพื่อให้อยู่ในบรรทัดเดียวอย่างสวยงาม ไม่ตกบรรทัด 4) รองรับ Responsive Design ปรับเป็นแนวตั้งอัตโนมัติบนหน้าจอขนาดเล็กกว่า 992px',
      sourceFile: 'คำสั่งผู้ใช้งาน (เปลี่ยนแถวล่าง เส้นสีแดง ไปคอลัม ชิดขวา (สีสีนำ่เงิน)แทน อออกแบบให้ได้สัดส่วน สวยงาน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงโครงสร้าง Layout และ UI กราฟเปรียบเทียบเป้าหมาย KPI)'
    },
    {
      id: 'log_000_wbs_kpi_remove_redundant_target_progress_cards_from_banner',
      timestamp: '2026-10-17 23:30:00',
      timestampTh: '17 ต.ค. 2569, 23:30 น.',
      type: 'EDIT',
      typeBadge: 'เอาการ์ดสรุปซ้ำซ้อนออก',
      badgeClass: 'badge-type-edit',
      title: 'นำการ์ดเป้าหมาย และการ์ดรวมดำเนินการ ออกจากแบนเนอร์สรุปผลตามที่วงกลม',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - แบนเนอร์สรุปผลลัพธ์การเปรียบเทียบ KPI 5 (.wbs-kpi-status-banner)',
      storageFile: 'js/wbs.js, js/data_history.js, index.html',
      changeSummary: 'นำการ์ด "เป้าหมาย (เดือน)" และการ์ด "รวมดำเนินการ (SAP + เลือก)" ออกจากแบนเนอร์สรุปผลลัพธ์ล่างสุดตามตำแหน่งที่ผู้ใช้วงกลมสีแดง เนื่องจากตัวเลขทั้งสองชุดมีแสดงชัดเจนอยู่บนหัวกราฟแท่งทั้งสองชั้นแล้ว ทำให้แบนเนอร์กระชับและคงเหลือเฉพาะการ์ดผลลัพธ์สำคัญ (เกินเป้าหมาย หรือ คงเหลือต้องปิดเพิ่ม)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: ตัดการ์ดสรุปสองใบใน .status-banner-metrics ออก ได้แก่ 1) การ์ดเป้าหมาย (${selectedMonth.shortName}) 2) การ์ดรวมดำเนินการ (SAP + เลือก) คงเหลือเฉพาะการ์ดสถานะผลลัพธ์สุทธิ (.status-metric-card.card-success / card-warn) ซึ่งระบุยอดเกินเป้าหมาย (+) หรือยอดคงเหลือต้องปิดเพิ่ม ทำให้แถบแบนเนอร์สรุปดูโปร่งตา สวยงาม และไม่ซ้ำซ้อนกับตัวเลขที่แสดงบนหัวกราฟด้านบน',
      sourceFile: 'คำสั่งผู้ใช้งาน (วงกลมเอาออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่ง UI แบนเนอร์สรุปผล KPI)',
    },
    {
      id: 'log_000_wbs_kpi_add_clsd_f4_f2_green_and_remove_small_clear_btn',
      timestamp: '2026-10-17 23:25:00',
      timestampTh: '17 ต.ค. 2569, 23:25 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มยอด CLSD F4/F2 และลบปุ่มกากบาท',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มการแสดงมูลค่า/งาน CLSD F4/F2 สีเขียว และลบปุ่มล้างข้อมูลเล็กที่กากบาทออกตามคำสั่ง',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - หัวกราฟล่างแสดงยอดดำเนินการ (#wbsTargetComparisonCard)',
      storageFile: 'js/wbs.js, css/styles.css, js/data_history.js, index.html',
      changeSummary: '1) ลบปุ่มล้างข้อมูลขนาดเล็กในส่วนหัวกราฟล่าง (ตำแหน่งที่กากบาท) ออก โดยคงปุ่มล้างข้อมูลสีแดงหลักไว้บนสุดขวามือของการ์ด 2) เพิ่มการแสดงตัวเลขมูลค่า/จำนวนงานของสถานะปิดงานใน SAP (CLSD F4 หรือ CLSD F2) ด้วยตัวเลขสีเขียวสดใส เพื่อให้เห็นตัวเลขครบทุกองค์ประกอบก่อนรวมเป็นยอดรวมทำได้',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) นำปุ่มล้างข้อมูลขนาดเล็ก (.btn-wbs-kpi-clear) ที่อยู่ข้างตัวเลขส่วนที่เลือกออกตามตำแหน่งที่ผู้ใช้กากบาทสีแดงในภาพ 2) เพิ่มบล็อกแสดงข้อมูล CLSD F4: หรือ CLSD F2: (.stat-sap) ในตำแหน่งที่ผู้ใช้วงกลมสีแดง แสดงตัวเลขมูลค่าหรือจำนวนงาน (.sap-text) ด้วยสีเขียว #34D399 พร้อมเงาเรืองแสง text-shadow ให้สอดคล้องกับธีม ทำให้โครงสร้างตัวเลขบนแถบหัวกราฟล่างแสดงครบ 3 ส่วนสมบูรณ์แบบ ได้แก่ [CLSD F4/F2 (สีเขียว)] | [ส่วนที่เลือก (สีฟ้า)] | [รวมทำได้ (สีเขียวอร่ามเรืองแสง)]',
      sourceFile: 'คำสั่งผู้ใช้งาน (กากบาท เอาออก และวงกลมให้เพิ่ม มูลค่า/งาน CLSD F4 /F2 สีเขียว)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่งการแสดงผลตัวเลขบนหัวกราฟ WBS)'
    },
    {
      id: 'log_000_wbs_kpi_golden_border_cyan_selected_green_total_red_clear_btn',
      timestamp: '2026-10-17 23:15:00',
      timestampTh: '17 ต.ค. 2569, 23:15 น.',
      type: 'EDIT',
      typeBadge: 'ปรับแต่งปุ่มเลือกเดือนและตัวเลข KPI',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มเส้นขอบสีเหลืองอร่ามของปุ่มเลือกเดือน, แสดงตัวเลขส่วนที่เลือกเป็นสีฟ้าและตัวเลขรวมเป็นสีเขียวอร่ามเรืองแสง, พร้อมเพิ่มปุ่มล้างข้อมูลสีแดงบนสุดขวามือของการ์ด',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - การ์ดเปรียบเทียบเป้าหมาย KPI ระดับ 5 (#wbsTargetComparisonCard)',
      storageFile: 'js/wbs.js, css/styles.css, js/data_history.js, index.html',
      changeSummary: '1) แสดงเส้นขอบสีเหลืองอร่ามเรืองแสงรอบปุ่มเลือกเดือนทรงลูกศร (Chevron) ทั้งขณะชี้เมาส์ (:hover) และขณะเลือก (.active) 2) แสดงตัวเลขส่วนที่เลือก (ส่วนที่เลือกจาก Checkbox) ในรูปแบบสีฟ้าครามสดใสเรืองแสง (.selected-text) 3) ปรับตัวเลขรวม (รวมทำได้) ให้แสดงเป็นสีเขียวอร่ามเรืองแสงโดดเด่น (.progress-text) 4) เพิ่มปุ่มล้างข้อมูลสีแดงเด่นชัด (.btn-wbs-card-clear) ไว้บนการ์ดด้านบนสุดขวามือ เพื่อให้ผู้ใช้สามารถกดล้างการเลือก Checkbox ได้สะดวกรวดเร็วในคลิกเดียว',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ปรับโครงสร้าง CSS ซ้อนเลเยอร์ (Double Chevron Architecture) ให้ปุ่มนอก (.btn-wbs-kpi-month) มี clip-path polygon พร้อม padding 2.5px และพื้นหลังเป็น gradient สีเหลืองทองอร่าม (#FFF700, #FFD700, #FFA000) ร่วมกับ drop-shadow สีเหลืองทองเรืองแสง (filter: drop-shadow 10px-14px) เมื่อนำเมาส์ไปชี้ (:hover) และเมื่อถูกเลือก (.active) ทำให้เส้นขอบสีเหลืองทองวิ่งตามแนวขอบทรงลูกศรอย่างคมกริบ 2) ในส่วนหัวกราฟล่าง ปรับให้แสดงตัวเลข "ส่วนที่เลือก:" ใช้สีฟ้าสดใสเรืองแสง (#00E5FF พร้อม text-shadow สีฟ้า) และตัวเลข "รวมทำได้:" ใช้สีเขียวอร่ามเรืองแสง (#00FF88 พร้อม text-shadow เขียวนีออน) พร้อมปุ่มล้างข้อมูลกะทัดรัด 3) เพิ่มปุ่ม "ล้างข้อมูล" สีแดงสด (.btn-wbs-card-clear) ที่มุมบนสุดขวามือของการ์ด (ใน .wbs-kpi-comp-meta-info) แสดงไอคอนถังขยะและจำนวนรายการที่เลือกสีแดงเด่นชัด สั่งล้างข้อมูลรายการที่เลือกทั้งหมด (wbsState.selectedWbs.clear()) และอัปเดตกราฟแบบ Real-time ทันที',
      sourceFile: 'คำสั่งผู้ใช้งาน (ขณะลากเมาส์ไปชี้ และตอนเลือก ให้แสดงเส้นขอบสีเหลืองอร่ามของปุ่มด้วย / ตัวเลขให้แสดง ส่วนที่เลือกด้วย ใช้สีฟ้า และตัวเลขรวมใช้สีเขียวอร่ามเรืองแสง / เพิ่มปุ่มล้างข้อมูล / เพิ่มปุ่มล้างข้อมูล ไว้บนการ์ด บนสุดขวามือ สีแดง)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุง UI กราฟ KPI จำลองเป้าหมาย และเพิ่มปุ่มคำสั่งล้างข้อมูลบนการ์ด)'
    },
    {
      id: 'log_000_wbs_chevron_buttons_and_golden_marker_style_and_remove_pct',
      timestamp: '2026-10-17 22:48:00',
      timestampTh: '17 ต.ค. 2569, 22:48 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปุ่มเลือกเดือนลูกศรและเส้นเป้าหมาย',
      badgeClass: 'badge-type-edit',
      title: 'ปรับปุ่มเลือกเดือนเป็นแถบลูกศรตามรูป 31, ปรับเส้นเป้าหมายตามรูป 32 ทุกอัน, และเอาป้าย % ออก',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - ปุ่มเลือกเดือนเป้าหมาย, เส้นบอกระดับเป้าหมาย, และหัวแถบดำเนินการ',
      storageFile: 'js/wbs.js, css/styles.css, index.html',
      changeSummary: '1) เปลี่ยนปุ่มเลือกเดือนจากแบบเดิม (รูป 30) เป็นแถบลูกศรต่อเนื่อง (Chevron Segmented Arrow Track ตามรูป 31) โทนสีสดใสเฉพาะแต่ละเดือน พร้อมเอฟเฟกต์สีเด่นชัดเมื่อชี้เมาส์และเมื่อเลือก 2) ปรับเส้นเป้าหมายเป็นเสาสีทองนีออนเปล่งประกายปลายมนสีขาวเรืองแสงและป้าย ▲ เส้นเป้าหมาย ตามรูป 32 ให้เหมือนกันทุกอัน 3) เอาป้ายเปอร์เซ็นต์ (117.2%) ออกตามคำสั่ง',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ปรับปรุงปุ่มเลือกเดือนเป้าหมาย (.btn-wbs-kpi-month) ให้เป็นรูปทรงลูกศรต่อเนื่อง (clip-path polygon chevron) 4 ช่วงเดือนตามสไตล์รูป 31 (ก.ย. สีส้มทอง seg-1, ต.ค. สีเขียวมรกต seg-2, พ.ย. สีฟ้าคราม seg-3, ธ.ค. สีม่วง seg-4) เพิ่มเอฟเฟกต์ขณะชี้เมาส์ (:hover) ให้สีสว่างสดใสเด่นชัดขึ้นมา และขณะเลือก (.active) มีกรอบขาวสว่างเรืองแสงรอบปุ่ม 2) ปรับปรุงเส้นเป้าหมาย (.target-marker-line) ให้แสดงเป็นเสาสีทองเรืองแสงหัวมนสีขาว (linear-gradient #FFFFFF, #FFF566, #FFB81C, #F59E0B) หนา 6px พร้อมเอฟเฟกต์เรืองแสง 22px และป้าย ▲ เส้นเป้าหมาย ตามรูป 32 ครบทุกเดือน (ทั้งบรรลุแล้วและยังไม่บรรลุ) 3) ลบป้ายเปอร์เซ็นต์ (.bar-pct-badge) 117.2% ที่ส่วนหัวกราฟล่างออกตามรูปที่ส่งมา',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.เปลี่ยนปุ่มรูป 30 เป็นแบบรูปที่ 31 และขณะลากเม้าไปสีเด่นชัดชึ้นมา และตอนเลือกด้วย / 2.เส้นชัย ให้เปลี่ยนเป็นตามรูป 32 ทุกอัน / เอาออก [ป้าย 117.2%])',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงโครงสร้าง UI ปุ่มเลือกเดือน แถบลูกศร และเส้นเป้าหมายตามแบบอ้างอิง)'
    },
    {
      id: 'log_000_wbs_passed_target_as_finish_line_checkered',
      timestamp: '2026-10-17 22:38:00',
      timestampTh: '17 ต.ค. 2569, 22:38 น.',
      type: 'EDIT',
      typeBadge: 'เปลี่ยนเฉพาะเส้นเขียวเป็นลายเส้นชัย',
      badgeClass: 'badge-type-edit',
      title: 'เปลี่ยนเฉพาะเส้นเป้าหมายกรณีบรรลุเป้า (ที่เคยเป็นสีเขียว) ให้แสดงเป็นลายเสาเส้นชัยแทน',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - กราฟเปรียบเทียบการปิดงานตามเป้าหมายระดับ KPI 5',
      storageFile: 'js/wbs.js, css/styles.css, index.html',
      changeSummary: 'คงเส้นเป้าหมายสีทองนีออนเดิมไว้สำหรับเดือนที่ยังไม่บรรลุเป้าหมาย แต่เปลี่ยนเฉพาะเส้นเป้าหมายกรณีบรรลุเป้าหมายแล้ว (ที่เคยเป็นสีเขียว) ให้แสดงเป็นลายเสาตารางหมากรุกเส้นชัย (Finish Line 🏁) ขอบทองเรืองแสง และป้าย 🏁 เส้นชัย อย่างลงตัว',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ปรับปรุงสไตล์ของเส้นเป้าหมายเมื่อบรรลุเป้า (target-marker-line.is-passed) จากเดิมที่เป็นสีเขียว ให้เปลี่ยนเป็นลายเสาตารางหมากรุกขาว-ดำของเส้นชัย (repeating-linear-gradient) ความหนา 7px พร้อมขอบสีทองเรืองแสง 2) ปรับข้อความป้ายกำกับของเส้นเป็น "🏁 เส้นชัย (XX.XX ลบ.)" พร้อมกรอบสีทองนีออน 3) ส่วนเดือนที่ยังไม่ถึงเป้าหมายยังคงแสดงเป็นเส้นทองหนา 6px ▲ เส้นเป้าหมาย ตามดีไซน์เดิม',
      sourceFile: 'คำสั่งผู้ใช้งาน (เปลี่ยนเฉพาะสีเขียวเป็นสีเส้นชัยแทน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับปรุง UI กราฟเปรียบเทียบเป้าหมาย KPI)'
    },
    {
      id: 'log_000_wbs_revert_finish_line_prominent_target_marker',
      timestamp: '2026-10-17 22:33:00',
      timestampTh: '17 ต.ค. 2569, 22:33 น.',
      type: 'EDIT',
      typeBadge: 'ปรับขนาดเส้นเป้าหมายเดิมให้เด่นชัด',
      badgeClass: 'badge-type-edit',
      title: 'ยกเลิกเส้นชัย หันกลับมาใช้เส้นเป้าหมายแบบเดิม พร้อมเพิ่มขนาดเส้นให้หนาใหญ่ขึ้นและส่องสว่างเด่นชัด',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - กราฟเปรียบเทียบการปิดงานตามเป้าหมายระดับ KPI 5',
      storageFile: 'js/wbs.js, css/styles.css, index.html',
      changeSummary: 'ยกเลิกดีไซน์เส้นชัย (ธงและเสาหมากรุก) กลับมาใช้เส้นเป้าหมายแบบเดิม พร้อมขยายความหนาของเส้นเป็น 5px สีทองนีออนเปล่งประกายเรืองแสงโดดเด่นสะดุดตา และคงป้ายกำกับเดิม ▲ เส้นเป้าหมาย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ยกเลิกองค์ประกอบเส้นชัย (Finish Line 🏁) ทั้งเสาหมากรุกและธงลอย 2) นำเส้นเป้าหมาย (target-marker-line) และป้ายเดิม (target-marker-label: ▲ เส้นเป้าหมาย (XX.XX ลบ.)) กลับมาใช้งาน 3) ขยายความหนาของเส้นเป้าหมายจากเดิม ~2px เพิ่มเป็น 5px พร้อมไล่เฉดสีทองสว่าง (gradient #FFFFFF ถึง #FFD700 และ #F59E0B) ขอบสีขาวสะท้อนแสง และใส่เอฟเฟกต์เรืองแสง (box-shadow neon glow) สูงถึง 20px ให้มองเห็นชัดเจนสะดุดตา 4) ป้ายกำกับวางชิดด้านข้างเส้นอย่างเป็นระเบียบตามตำแหน่งเปอร์เซ็นต์ของเป้าหมาย',
      sourceFile: 'คำสั่งผู้ใช้งาน (undo เส้นชัย ใช้แบบเดิม เพิ่มขนาดเส้นให้ใหญ่ขึ้น เด่นชัด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับปรุง UI/UX ความชัดเจนของเส้นเป้าหมายตามความต้องการ)'
    },
    {
      id: 'log_000_wbs_finish_line_and_month_style',
      timestamp: '2026-10-17 22:25:00',
      timestampTh: '17 ต.ค. 2569, 22:25 น.',
      type: 'EDIT',
      typeBadge: 'ปรับเส้นชัยและปุ่มเลือกเดือน',
      badgeClass: 'badge-type-edit',
      title: 'ปรับเส้นเป้าหมายเป็นเส้นชัย (Finish Line 🏁) โดดเด่นชัดเจน และปรับพื้นหลังปุ่มเลือกเดือนตามป้ายหน่วยวัด',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - การ์ดเปรียบเทียบเป้าหมาย KPI ระดับ 5',
      storageFile: 'js/wbs.js, css/styles.css, index.html',
      changeSummary: 'ลบข้อความอธิบายใต้หัวข้อออกตามที่กากบาท, ปรับสีพื้นหลังปุ่มเลือกเดือนเป้าหมายเป็นโทนสีม่วงเหมือนป้ายหน่วยวัดมูลค่า, และเปลี่ยนเส้นเป้าหมายบนหลอดกราฟเป็นเสาเส้นชัยลายธงหมากรุกขาว-ดำขอบทองเรืองแสงพร้อมธงลอยเด่น 🏁 เส้นชัยเป้าหมาย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) เอาข้อความอธิบาย (wbs-kpi-comp-subtitle) ออกตามตำแหน่งที่กากบาท 2) ปรับสีพื้นหลังและขอบของปุ่มเลือกเดือน (.btn-wbs-kpi-month) ให้เป็นสีม่วง rgba(168, 85, 247, 0.2) ขอบ rgba(168, 85, 247, 0.45) ตรงตามสไตล์ป้ายหน่วยวัด [💰 มูลค่า (บาท)] ที่ชี้ลูกศร 3) ปรับปรุงเส้นเป้าหมายบนกราฟแท่งล่างให้โดดเด่น โดยเปลี่ยนเป็นเส้นชัยเป้าหมาย (target-finish-line): เสาหมากรุกขาว-ดำขอบทองเรืองแสง (finish-line-pole) พร้อมธงเส้นชัยลอยตัว (finish-line-flag) แสดงป้าย "🏁 เส้นชัย (XX.XX ลบ.)" อย่างเด่นชัด พร้อมแอนิเมชันลอยตัวเบาๆ และเปลี่ยนเป็นสีเขียวมรกตเมื่อผ่านเส้นชัยแล้ว',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออกที่กากบาท และวงกลมปุ่มเลือกเดือนให้เปลี่ยนสีพื้นหลังเหมือนกับที่ชี้ลูกศร / แก้ไขให้โดดเด่น หรือใช้เส้นชัยแทนก้ได้)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับปรุง UI/UX ความโดดเด่นและความสวยงาม)'
    },
    {
      id: 'log_000_target_projection_add_december',
      timestamp: '2026-10-17 22:10:00',
      timestampTh: '17 ต.ค. 2569, 22:10 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มเป้าหมายเดือน ธ.ค. รวม 4 เดือน',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มการแสดงเป้าหมายที่ต้องปิดงานเพิ่มเดือน ธ.ค. รวม 4 เดือน ทั้งเมนูภาพรวมและ WBS คงเหลือ',
      targetSubject: 'เมนูภาพรวมผู้บริหาร (แผนเป้าหมายปิดงานเพิ่ม) และ เมนู WBS คงเหลือ (กราฟเปรียบเทียบ KPI 5)',
      storageFile: 'js/app.js, css/styles.css, index.html',
      changeSummary: 'ขยายช่วงการคำนวณและแสดงผลเป้าหมายที่ต้องปิดงานเพิ่มระดับ KPI 5 ให้ครอบคลุมถึงเดือน ธ.ค. 2569 รวมทั้งสิ้น 4 เดือน (ก.ย., ต.ค., พ.ย., ธ.ค.) ทั้งในเมนูภาพรวมผู้บริหารและเมนู WBS คงเหลือ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) ปรับ maxOffsets ใน renderNext3MonthsProjection เป็น 4 เพื่อให้คำนวณเป้าหมายระดับ 5 ครอบคลุมถึงสิ้นปี 2569 (ธ.ค. 69 เป้า KPI 100%) 2) เมนูภาพรวม: แสดงการ์ดเป้าหมาย 4 เดือนในกริด 4 คอลัมน์, แสดงตารางเป้าหมายและแถบรวมสัดส่วน 4 ช่วงเดือน 3) เมนู WBS คงเหลือ: แถบเลือกเดือนเป้าหมายแสดงครบ 4 เดือน (ก.ย. บรรลุเป้า, ต.ค., พ.ย., ธ.ค.) สามารถคลิกเลือกเดือน ธ.ค. เพื่อเปรียบเทียบกับยอด SAP + รายการที่เลือกแบบ Real-time',
      sourceFile: 'คำสั่งผู้ใช้งาน (เป้าหมายที่ต้องปิดเพิ่ม ให้เพิ่มเดือน ธ.ค. ด้วย รวม 4 เดือน ทั้งเมนูภาพรวม และเมนู WBS คงเหลือ)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ขยายขอบเขตช่วงเวลาการจำลองเป้าหมาย KPI)'
    },
    {
      id: 'log_000_wbs_kpi5_target_comparison_bars',
      timestamp: '2026-10-17 21:40:00',
      timestampTh: '17 ต.ค. 2569, 21:40 น.',
      type: 'EDIT',
      typeBadge: 'กราฟเปรียบเทียบเป้าหมาย KPI 5',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มการแสดงกราฟแนวนอน 2 ชั้น เปรียบเทียบเป้าหมาย KPI ระดับ 5 ในเมนู WBS คงเหลือ',
      targetSubject: 'เมนู WBS คงเหลือ (#tab-wbs) - ส่วนเปรียบเทียบเป้าหมาย KPI 5 และการปิดงาน',
      storageFile: 'js/wbs.js, js/app.js, css/styles.css, index.html',
      changeSummary: 'เพิ่มกราฟแนวนอน 2 ชั้นเปรียบเทียบเป้าหมาย KPI ระดับ 5 (กราฟบน: ยอดต้องปิดเพิ่มตามเดือนที่เลือก) กับยอดดำเนินการ (กราฟล่าง: CLSD F4/F2 + รายการที่เลือกจาก Checkbox) พร้อมปุ่มเลือกเดือนเป้าหมาย (หากบรรลุเป้าหมายแสดง ✓ บรรลุเป้า แต่เลือกไม่ได้) และแบนเนอร์แสดงยอดที่ต้องปิดเพิ่มหรือเกินเป้าหมาย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: 1) กราฟบนแสดงเป้าหมายมูลค่า/งานที่ต้องปิดเพิ่มระดับ KPI 5 ตามเกณฑ์วัดที่เลือกและเดือนที่เลือก (ดึงข้อมูลจำลอง 3 เดือนถัดไปผ่าน window.getKpiSimulationTargetMonths) 2) กราฟล่างแสดงยอดสะสมปิดงาน CLSD F4 สำหรับเกณฑ์ข้อ 1, 2, 5 (มูลค่า AUC) หรือ เกณฑ์ข้อ 3 (จำนวนงาน) หรือ CLSD F2 สำหรับเกณฑ์ข้อ 4 (จำนวนงาน) รวมกับยอดจาก Checkbox ตาราง WBS แบบ Real-time 3) คำนวณส่วนต่าง แสดงป้ายสถานะบรรลุเป้าหมาย/ยังต้องปิดเพิ่ม พร้อมยอดคงเหลือหรือยอดเกินเป้าหมาย 4) แถบปุ่มเลือกเดือนเป้าหมาย (ก.ย., ต.ค., พ.ย.) หากเดือนไหนบรรลุเป้าหมายแล้วจะแสดงป้าย ✓ บรรลุเป้า และปิดการคลิกเลือก (disabled) 5) ออกแบบสไตล์ Luxury Dark/Light Theme มีเอฟเฟกต์แอนิเมชัน และรองรับ Responsive',
      sourceFile: 'คำสั่งผู้ใช้งาน (ในเมนู WBS คงเหลือ ให้เพิ่มการแสดง การปิดมูลค่า/งาน ที่ต้องทำเพิ่ม ให้ได้ตามเป้าหมายระดับ KPI 5)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูง (เพิ่มฟีเจอร์การวิเคราะห์เป้าหมายเชิงเปรียบเทียบใน WBS)'
    },
    {
      id: 'log_000_criteria_font_color_match',
      timestamp: '2026-10-17 21:10:00',
      timestampTh: '17 ต.ค. 2569, 21:10 น.',
      type: 'EDIT',
      typeBadge: 'ปรับฟอนต์และสีตัวกรองเกณฑ์วัด',
      badgeClass: 'badge-type-edit',
      title: 'ปรับตัวอักษรและสีของตัวกรองเกณฑ์วัดให้เหมือนกับตัวกรองอื่นๆ',
      targetSubject: 'รายการตัวเลือกเกณฑ์วัด (dropdown แถบตัวกรองด้านบน)',
      storageFile: 'css/styles.css, index.html',
      changeSummary: 'ปรับขนาดตัวอักษร (0.94rem) น้ำหนักตัวอักษร (500) และโทนสี (#FFB81C ใน Dark Mode, #111827 ใน Light Mode) ของรายการตัวเลือกเกณฑ์วัดให้เท่ากันและตรงตามรายการตัวเลือกของตัวกรองอื่นๆ ทุกประการ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: กำหนด .crit-dd-option และ .crit-dd-name ให้ใช้ font-family: inherit, font-size: 0.94rem, font-weight: 500, color: #FFB81C ในธีมมืด และ color: #111827 ในธีมสว่าง สำหรับทั้งสถานะปกติและสถานะที่ถูกเลือก (.selected) โดยยังคงป้ายหน่วยวัด (มูลค่า/งาน) ชิดขวาและไฮไลต์เมื่อ hover/focus ตามเดิม พร้อม bump เวอร์ชันแคช',
      sourceFile: 'คำสั่งผู้ใช้งาน (ใช้ตัวอักษร และสี เหมือนกับตัวกรองอื่นๆ)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่ง UI/Typography)'
    },
    {
      id: 'log_000_criteria_option_hover_highlight',
      timestamp: '2026-10-17 21:05:00',
      timestampTh: '17 ต.ค. 2569, 21:05 น.',
      type: 'EDIT',
      typeBadge: 'สีไฮไลต์ตัวเลือกเกณฑ์วัด',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มสีไฮไลต์ตอนเลื่อนชี้ตัวเลือกเกณฑ์วัดให้เหมือนตัวกรองอื่นๆ',
      targetSubject: 'รายการตัวเลือกเกณฑ์วัด (dropdown แถบตัวกรองด้านบน)',
      storageFile: 'css/styles.css, index.html',
      changeSummary: 'ตอนเลื่อนเมาส์ชี้หรือใช้คีย์บอร์ดเลือกแถวข้อ 1.1 - 5 จะมีพื้นหลังสีไฮไลต์ (Highlight system color / #1E90FF) และตัวอักษรเปลี่ยนเป็นสีขาว เหมือนรายการตัวเลือก native ของตัวกรองอื่นๆ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: ปรับ .crit-dd-option:hover และ .crit-dd-option.focused ให้มี background-color: Highlight (#1E90FF) พร้อม color: HighlightText (#FFFFFF) ทั้งใน Dark Mode และ Light Mode เมื่อไม่ได้ชี้หรือเลือกคงสีทอง #FFB81C โดยไม่มีเงาพื้นหลัง และ bump เวอร์ชันแคช css',
      sourceFile: 'คำสั่งผู้ใช้งาน (อยากให้แก้ตัวกรองเกฯวัด ให้ตอนชี้มีสีไฮไลต์เหมือนตัวกรองอื่น)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับแต่ง UI/UX การชี้เลือกตัวกรอง)'
    },
    {
      id: 'log_000_chart_xlabel_click',
      timestamp: '2026-10-17 21:00:00',
      timestampTh: '17 ต.ค. 2569, 21:00 น.',
      type: 'EDIT',
      typeBadge: 'คลิกชื่อหน่วยงานบนกราฟ',
      badgeClass: 'badge-type-edit',
      title: 'คลิกชื่อหน่วยงานบนแกน X ของกราฟแท่งเพื่อเลือกหน่วยงานได้ เหมือนคลิกที่แท่งกราฟ',
      targetSubject: 'กราฟผลการดำเนินงาน % ปิดงานราย กฟฟ. (PeaChart แบบ bar)',
      storageFile: 'js/chart.js, index.html',
      changeSummary: 'ชื่อหน่วยงานที่หมุนเอียงใต้กราฟคลิกได้ เมาส์เปลี่ยนเป็นรูปมือเมื่อชี้ที่ชื่อ และเรียก onClick เดียวกับการคลิกแท่ง (เลือก/ยกเลิกหน่วยงาน, คลิกกฟก.3 ทั้งหมด = ALL)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: ใน renderBarChart เก็บพิกัด/มุม/ความกว้างข้อความของป้ายแกน X ลง this.renderedXLabels แล้ว hit-test ตำแหน่งเมาส์ด้วยการหมุนพิกัดย้อนตามมุมป้าย (เลือกป้ายที่ใกล้สุดเมื่อซ้อนกัน) ได้ this.lastHoveredLabelItem ที่มีรูปแบบเดียวกับ item ของแท่ง (label, gIdx, extra) ตัวจัดการ click ใช้ lastHoveredItem || lastHoveredLabelItem และปรับ cursor เป็น pointer บนป้ายชื่อ ไม่กระทบการแสดงผล/เส้นเป้าหมาย และ bump เวอร์ชันแคช chart.js',
      sourceFile: 'คำสั่งผู้ใช้งาน (คลิกตัวอักษรหน่วยงาน สามารถเปลี่ยนตามที่เลือกได้ เหมือนกับคลิกที่กราฟ)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (เพิ่มการโต้ตอบบนกราฟ)'
    },
    {
      id: 'log_000_criteria_panel_bg_match',
      timestamp: '2026-10-17 20:55:00',
      timestampTh: '17 ต.ค. 2569, 20:55 น.',
      type: 'EDIT',
      typeBadge: 'ปรับพื้นหลังรายการเกณฑ์วัด',
      badgeClass: 'badge-type-edit',
      title: 'ให้รายการตัวเลือกเกณฑ์วัดมีพื้นหลังเหมือนรายการของตัวกรองอื่นๆ',
      targetSubject: 'รายการตัวเลือกเกณฑ์วัด (dropdown แถบตัวกรองด้านบน)',
      storageFile: 'css/styles.css, index.html',
      changeSummary: 'เปลี่ยนพื้นหลังรายการจากไล่สีม่วงเข้ม+กรอบทอง+เงาเรืองแสง เป็นสีทึบ #2D0A45 เท่ากับ option ของตัวกรองเดือน/พื้นที่/กอง (ธีมสว่างเป็นสีขาว)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: แก้ .crit-dd-panel ใช้ background ทึบ #2D0A45 กรอบบางโปร่งแสง มุมโค้งน้อย เงาเบา ไม่มีแอนิเมชันเปิด และปรับ padding ของแถวเป็น 6px 12px ให้เท่ากับ .top-filter-select option พร้อมปรับธีมสว่าง และ bump เวอร์ชันแคช css',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขตอนเลื่อนเพื่อเลือก ให้พื้นหลังเหมือนกับตัวกรองอื่นๆ)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับสี UI)'
    },
    {
      id: 'log_000_criteria_option_gold_no_highlight',
      timestamp: '2026-10-17 20:50:00',
      timestampTh: '17 ต.ค. 2569, 20:50 น.',
      type: 'EDIT',
      typeBadge: 'ปรับสีตัวเลือกเกณฑ์วัด',
      badgeClass: 'badge-type-edit',
      title: 'ตัวเลือกเกณฑ์วัดข้อ 1.1 - 5 กลับเป็นสีทอง และเอาพื้นหลัง/เงาตอนชี้-เลือกออก',
      targetSubject: 'รายการตัวเลือกเกณฑ์วัด (dropdown แถบตัวกรองด้านบน)',
      storageFile: 'css/styles.css, index.html',
      changeSummary: 'ข้อความตัวเลือกทุกข้อเป็นสีทอง #FFB81C เหมือนเดิม ตอนชี้/เลือกไม่มีพื้นหลังหรือเงา (inset shadow) เหลือเพียงทองสว่างขึ้นและตัวหนา',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: แก้ .crit-dd-option เป็นสีทอง ปรับ .focused/.selected เป็น background:none, box-shadow:none พร้อมปรับธีมสว่างให้สอดคล้อง และ bump เวอร์ชันแคช css',
      sourceFile: 'คำสั่งผู้ใช้งาน (ตัวเลือกเปลี่ยนสีทองเหมือนเดิม ข้อ 1.1 - 5 และตอนเลือกไม่ต้องมีเงาพื้นหลัง)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับสี UI)'
    },
    {
      id: 'log_000_criteria_dropdown_unit_right',
      timestamp: '2026-10-17 20:45:00',
      timestampTh: '17 ต.ค. 2569, 20:45 น.',
      type: 'EDIT',
      typeBadge: 'ปรับตัวเลือกเกณฑ์วัด',
      badgeClass: 'badge-type-edit',
      title: 'เอาป้ายหน่วยวัดแคปซูลออก และแสดงหน่วย มูลค่า/งาน ชิดขวาในทุกตัวเลือกเกณฑ์วัด พร้อมสีพื้นหลังโดดเด่น',
      targetSubject: 'ตัวกรองเกณฑ์วัด ข้อ 1.1 - 5 (แถบตัวกรองด้านบน)',
      storageFile: 'index.html, css/styles.css, js/app.js, js/criteria_dropdown.js',
      changeSummary: 'ลบป้าย "หน่วยวัด [มูลค่า]/[งาน]" ด้านขวาของช่องเลือก และเปลี่ยนรายการตัวเลือกเป็น dropdown แบบกำหนดเองที่วางหน่วยชิดขวาสุดทุกแถว: มูลค่า = ทอง, งาน = ฟ้าคราม, มูลค่า/งาน (เลือกทั้งหมด) = ชมพู-ม่วง',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: (1) ลบ #criteriaUnitBadge ใน index.html, CSS .criteria-unit-badge และฟังก์ชัน updateCriteriaUnitBadge ใน app.js (2) populateFilterDropdowns ใส่ data-unit (value|job|all) ให้ option และใช้ชื่อเกณฑ์เดิมไม่ต่อท้ายหน่วย (3) เพิ่ม js/criteria_dropdown.js สร้าง UI dropdown (ปุ่ม + panel แบบ fixed ไม่ถูกตัดโดยแถบตัวกรอง) ซ่อน select#filterCriteria ไว้เป็นแหล่งข้อมูลหลัก ซิงก์ value/options ด้วย MutationObserver และ setter ของ value และยิง change event เมื่อเลือก จึงไม่กระทบการกรอง รองรับคีย์บอร์ด ธีมสว่าง (4) เพิ่มสไตล์ .crit-dd-* และ .crit-unit-pill ใน styles.css (5) bump เวอร์ชันแคช css/app.js',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.ให้เอาออก 2.หน่วยวัดที่แสดงในตัวเลือกให้ชิดด้านหลังสุดทุกอัน(ชิดขวา) และเปลี่ยนสีโดดเด่น เปลี่ยนเฉพาะพื้นหลัง มูลค่า/งาน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เปลี่ยนรูปแบบ UI ตัวกรองเกณฑ์วัด)'
    },
    {
      id: 'log_000_criteria_option_unit_suffix',
      timestamp: '2026-10-17 20:40:00',
      timestampTh: '17 ต.ค. 2569, 20:40 น.',
      type: 'EDIT',
      typeBadge: 'แสดงหน่วยวัดในตัวเลือกเกณฑ์',
      badgeClass: 'badge-type-edit',
      title: 'แสดงหน่วยการวัด (มูลค่า/งาน) ต่อท้ายตัวเลือกเกณฑ์วัดข้อ 1.1 - 5 โดยตรง',
      targetSubject: 'รายการตัวเลือกเกณฑ์วัด (select#filterCriteria และตัวเลือกบนกราฟที่ซิงก์กัน)',
      storageFile: 'js/app.js',
      changeSummary: 'ทุกตัวเลือกแสดงหน่วยต่อท้าย เช่น "ข้อ 1.1 งบ C.1 ก่อน 69 · มูลค่า", "ข้อ 3.1 TECO D2 · งาน", "เลือกทั้งหมด · มูลค่า/งาน"',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: เพิ่มฟังก์ชัน getCriteriaUnitKind (อ่านหน่วยจากข้อมูลเดือนที่เลือก มี fallback ตามชื่อเกณฑ์) ใช้สร้างข้อความตัวเลือกใน populateFilterDropdowns โดย value ของ option ยังเป็นชื่อเกณฑ์เดิม จึงไม่กระทบการกรอง และปรับ updateCriteriaUnitBadge ให้ใช้ฟังก์ชันเดียวกัน',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขให้แสดงที่หน้าจอ ตัวเลือกข้อ 1.1 - 5 เลย)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับการแสดงผล)'
    },
    {
      id: 'log_000_criteria_unit_badge',
      timestamp: '2026-10-17 20:30:00',
      timestampTh: '17 ต.ค. 2569, 20:30 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มป้ายหน่วยการวัด',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มป้ายหน่วยการวัด มูลค่า / งาน ด้านขวาของตัวกรองเกณฑ์วัด (ข้อ 1.1 - 5)',
      targetSubject: 'แถบตัวกรองด้านบน (ตัวกรองเกณฑ์วัด)',
      storageFile: 'index.html, css/styles.css, js/app.js',
      changeSummary: 'เพิ่มป้าย "หน่วยวัด [มูลค่า / งาน]" แบบ segmented pill เรืองแสง ไฮไลต์หน่วยตามเกณฑ์ที่เลือก (มูลค่า = ทอง, งาน = ฟ้าคราม) ถ้าเลือกทั้งหมดจะไฮไลต์ทั้งสองหน่วย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: (1) index.html เพิ่ม #criteriaUnitBadge ต่อท้าย select#filterCriteria (2) styles.css เพิ่มสไตล์ .criteria-unit-badge/.unit-seg พร้อม animation เรืองแสงและรองรับธีมสว่าง/prefers-reduced-motion (3) app.js เพิ่มฟังก์ชัน updateCriteriaUnitBadge เรียกจาก updateTopSelectionDisplay โดยอ่านหน่วย (unit) จากข้อมูลของเกณฑ์ที่เลือก (ข้อ 3.x = งาน, ข้ออื่น = มูลค่า(บาท)) และมี fallback ตามชื่อเกณฑ์ ไม่กระทบการกรองข้อมูล',
      sourceFile: 'คำสั่งผู้ใช้งาน (ตัวกรองเกณฑ์วัด ข้อ 1.1 - 5 ด้านขวา ให้เพิ่มหน่วยการวัด มูลค่า/งาน ให้สวยงามโดดเด่น)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับหน้าตา UI)'
    },
    {
      id: 'log_000_filter_bar_glow_single_row',
      timestamp: '2026-10-17 20:20:00',
      timestampTh: '17 ต.ค. 2569, 20:20 น.',
      type: 'EDIT',
      typeBadge: 'ปรับแถบตัวกรองบนสุด',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มพื้นหลังเรืองแสงให้แถบตัวกรอง และจัดตัวกรองทั้งหมดให้อยู่บรรทัดเดียวกัน',
      targetSubject: 'แถบตัวกรองด้านบน (Top Sticky Filter Bar)',
      storageFile: 'css/styles.css',
      changeSummary: 'เพิ่มลูกแสงม่วง/ทองเคลื่อนไหวช้าๆ และเส้นเรืองแสงขอบล่าง พร้อมเปลี่ยนจาก flex-wrap เป็น nowrap ให้ตัวกรองทุกตัวอยู่บรรทัดเดียว',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: ใน .top-sticky-filter-bar เพิ่ม ::before (radial-gradient หลายชั้น + blur + animation topFilterGlowDrift) และ ::after (เส้นทองเรืองแสง animation topFilterEdgePulse) รองรับ prefers-reduced-motion และธีมสว่าง ส่วน .top-filter-inner ปรับเป็น flex-wrap: nowrap ให้กลุ่มตัวกรอง/ช่องค้นหาย่อขนาดได้ (min-width: 0, text-overflow: ellipsis) และลดขนาดฟอนต์/ระยะห่างเล็กน้อยเพื่อให้พอดีบรรทัดเดียว ปุ่มรีเซ็ตและหัวข้อ "ตัวกรอง:" ไม่ถูกบีบ',
      sourceFile: 'คำสั่งผู้ใช้งาน (เพิ่มพื้นหลังเรืองแสง และตัวกรองอยู่บรรทัดเดียวกันทั้งหมด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับหน้าตา UI)'
    },
    {
      id: 'log_000_wbs_sap_order_by_code',
      timestamp: '2026-10-17 15:30:00',
      timestampTh: '17 ต.ค. 2569, 15:30 น.',
      type: 'EDIT',
      typeBadge: 'เรียงสถานะ SAP ตามรหัสท้าย',
      badgeClass: 'badge-type-edit',
      title: 'เรียงสถานะ SAP ในกลุ่ม CLSD / TECO / REL ตามรหัสท้าย (F4 แรกสุด, B1 ท้ายสุด)',
      targetSubject: 'การ์ดสรุปสถานะ SAP (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js',
      changeSummary: 'ภายในกลุ่มเดียวกัน เรียงตามตัวอักษรอังกฤษท้ายสถานะจาก F ไป B และตัวเลขจากมากไปน้อย แทนการเรียงตามมูลค่า AUC',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: เพิ่มฟังก์ชัน parseSapCode ดึงรหัสท้ายสถานะ (ตัวอักษร+ตัวเลข) ใน renderWbsSapSummary แล้วเรียงกลุ่ม CLSD → TECO → REL จากนั้นเรียงตัวอักษร Z→A และตัวเลขมาก→น้อย ทำให้ F4 อยู่แรกสุด และ B1 อยู่ท้ายสุดของกลุ่ม สถานะที่ไม่มีรหัสท้ายอยู่ท้ายกลุ่ม',
      sourceFile: 'คำสั่งผู้ใช้งาน (ให้แก้ไขลำดับ หากกลุ่มเดียวกันให้ดูภาษาอังกฤษและตัวเลขด้านหลัง F4 แรกสุด และ B1 ท้ายสุด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับลำดับการแสดงผล)'
    },
    {
      id: 'log_000_wbs_sap_order',
      timestamp: '2026-10-17 15:25:00',
      timestampTh: '17 ต.ค. 2569, 15:25 น.',
      type: 'EDIT',
      typeBadge: 'ปรับลำดับสถานะ SAP',
      badgeClass: 'badge-type-edit',
      title: 'ปรับลำดับการ์ดสรุปสถานะ SAP เป็น CLSD F4 → CLSD อื่น → TECO → REL',
      targetSubject: 'การ์ดสรุปสถานะ SAP (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js',
      changeSummary: 'จากเดิมเรียงตามมูลค่า AUC เปลี่ยนเป็นแสดงต่อจากการ์ดทั้งหมด: CLSD F4 ก่อน ตามด้วย CLSD อื่น, TECO และ REL ท้ายสุด',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: แก้ renderWbsSapSummary ให้จัดกลุ่มลำดับ CLSD (F4 มาก่อน) → TECO → REL/อื่นๆ โดยภายในแต่ละกลุ่มยังเรียงตามมูลค่า AUC มากไปน้อย ไม่กระทบการกรองและตัวเลขสรุป',
      sourceFile: 'คำสั่งผู้ใช้งาน (แก้ไขลำดับสถานะ sap ให้ CLSD F4 ก่อน ต่อด้วย TECO และ REL ท้ายสุด)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับลำดับการแสดงผล)'
    },
    {
      id: 'log_000_wbs_chart_fit_all_offices',
      timestamp: '2026-10-17 15:20:00',
      timestampTh: '17 ต.ค. 2569, 15:20 น.',
      type: 'EDIT',
      typeBadge: 'แสดงครบทุกหน่วยงานในหน้าเดียว',
      badgeClass: 'badge-type-edit',
      title: 'กราฟ กอง/กฟฟ. ที่มีงาน WBS คงเหลือ: เลือก "ทั้งหมด" แสดงครบทุกหน่วยงานในหน้าเดียว',
      targetSubject: 'กราฟแท่ง กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'js/wbs.js, css/styles.css & index.html',
      changeSummary: 'โหมดแบบซ้อนบีบกราฟให้พอดีความกว้างการ์ด ไม่ต้องเลื่อนแนวนอน เมื่อหน่วยงานมาก ปรับชื่อเป็นเอียง 62° และเพิ่มพื้นที่ด้านล่างอัตโนมัติ',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: (1) drawTopOfficesCanvas ในโหมดแบบซ้อน ใช้ความกว้างเท่า container แทนความกว้างขั้นต่ำต่อหน่วยงาน (2) เมื่อช่องต่อหน่วยงานแคบกว่า 44px ลดฟอนต์ชื่อเป็น 10px เอียง -62° และคำนวณ padding ล่างจากความยาวชื่อที่ยาวที่สุด (3) ปรับความกว้างแท่งให้ลดได้ตามช่อง (4) ปรับพื้นที่ hover/คลิกให้อิงขอบล่างของกราฟจริง (5) ปรับ CSS/HTML ของ #wbsOfficesChartContainer จากความสูงคงที่เป็น min-height เพื่อรองรับกราฟที่สูงขึ้น (6) โหมดแบบแยกยังเลื่อนแนวนอนได้เหมือนเดิม เพราะ 3 แท่งต่อหน่วยงานบีบแล้วอ่านไม่ออก',
      sourceFile: 'คำสั่งผู้ใช้งาน (เลือกทั้งหมด ให้แสดงครบทุกหน่วยงาน ในหน้าเดียว)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับการวาดกราฟและเลย์เอาต์)'
    },
    {
      id: 'log_000_move_wbs_legend',
      timestamp: '2026-10-17 15:12:00',
      timestampTh: '17 ต.ค. 2569, 15:12 น.',
      type: 'EDIT',
      typeBadge: 'ย้ายตำแหน่งป้าย CLSD/TECO/REL',
      badgeClass: 'badge-type-edit',
      title: 'ย้ายป้ายสถานะ CLSD / TECO / REL ไปชิดป้าย "หน่วยงาน (คงเหลือ งาน)"',
      targetSubject: 'การ์ดกราฟ กอง/กฟฟ. ที่มีงาน WBS คงเหลือ (แท็บ WBS คงเหลือ)',
      storageFile: 'index.html',
      changeSummary: 'ย้ายกลุ่มป้าย CLSD, TECO, REL จากฝั่งขวาของหัวการ์ด มาอยู่ติดกับป้ายสรุปจำนวนหน่วยงานและงานคงเหลือด้านซ้าย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: ย้าย div#wbsChartLegend เข้าไปใน .card-title ต่อจาก span#wbsOfficesChartCountBadge โดยคง id เดิมทั้งหมด (wbsLegendClsdCount / wbsLegendTecoCount / wbsLegendRelCount) จึงไม่กระทบการอัปเดตตัวเลขใน wbs.js ปุ่มสลับ ทั้งหมด/10 อันดับแรก และแบบซ้อน/แบบแยก ยังอยู่ฝั่งขวาตามเดิม',
      sourceFile: 'คำสั่งผู้ใช้งาน (ย้ายที่วงกลม ไปชิด คงเหลืองาน)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับตำแหน่ง UI)'
    },
    {
      id: 'log_000_remove_wbs_kpi_cards',
      timestamp: '2026-10-17 15:05:00',
      timestampTh: '17 ต.ค. 2569, 15:05 น.',
      type: 'EDIT',
      typeBadge: 'นำการ์ดสรุป WBS ออก',
      badgeClass: 'badge-type-edit',
      title: 'นำการ์ดสรุป KPI 4 ใบ ออกจากหน้า WBS คงเหลือ',
      targetSubject: 'แท็บ WBS คงเหลือ (การ์ดสรุป 4 ใบ)',
      storageFile: 'index.html',
      changeSummary: 'นำการ์ด งาน WBS คงเหลือรวม, หน่วยงานที่เกี่ยวข้อง, ช่างคุมงานผู้รับผิดชอบ และสัดส่วนหมวดงบประมาณ ออกจากหน้าจอ (คอมเมนต์ปิดไว้)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน "เอาออก": คอมเมนต์ปิดบล็อก .wbs-stats-grid ทั้ง 4 การ์ดใน index.html โดยไม่ลบโค้ดเดิม ฟังก์ชัน renderWbsStatCards ใน js/wbs.js ตรวจสอบ null ก่อนเขียนค่า จึงไม่เกิด error',
      sourceFile: 'คำสั่งผู้ใช้งาน (เอาออก)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับการแสดงผล UI)'
    },
    {
      id: 'log_000_separate_growth_tables_pct_and_amount',
      timestamp: '2026-10-17 14:52:00',
      timestampTh: '17 ต.ค. 2569, 14:52 น.',
      type: 'EDIT',
      typeBadge: 'ปรับตารางกราฟ % ให้มีเฉพาะปิดงาน',
      badgeClass: 'badge-type-edit',
      title: 'ปรับตารางด้านขวากราฟร้อยละ % ปิดงานสะสม ไม่ให้มีคอลัมน์ %ภาพรวม (คงตาราง 2 คอลัมน์: เดือน และ %)',
      targetSubject: 'ตารางวิเคราะห์อัตราการเติบโตรายเดือนของกราฟร้อยละ % (แท็บ Timeline)',
      storageFile: 'js/app.js, css/styles.css & js/data_history.js',
      changeSummary: 'ถอดคอลัมน์ %ภาพรวม ออกจากตารางด้านขวาของกราฟ % ปิดงานมูลค่า AUC สะสม (คงไว้ 2 คอลัมน์: เดือน และ %) และคง 3 คอลัมน์ (เดือน, ภาพรวม, ปิดงาน) เฉพาะในกราฟจำนวนเงิน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน "อันนี้ไม่ต้องเพิ่ม %ภาพรวม": (1) ปรับฟังก์ชัน renderTimelineGrowthTable ให้รองรับตัวเลือก showTotal เพื่อแยกตาราง 2 คอลัมน์ และ 3 คอลัมน์ได้อย่างอิสระ (2) กำหนดให้ตารางของกราฟร้อยละ % ปิดงานสะสม (timelinePctGrowthTableWrap) แสดง 2 คอลัมน์ คือ "เดือน" และ "%" (ปิดงาน) พร้อมแถวค่าเฉลี่ยในแถวสุดท้าย โดยไม่มีคอลัมน์ภาพรวม (3) กำหนดให้ตารางของกราฟจำนวนเงิน/จำนวนงาน (timelineAmountGrowthTableWrap) แสดง 3 คอลัมน์ คือ "เดือน", "● ภาพรวม" (MoM Growth %) และ "● ปิดงาน" (%) ตามคำสั่งข้อก่อนหน้า (4) ปรับความกว้างตารางให้เหมาะสม 195px สำหรับ 2 คอลัมน์ และ 255px สำหรับ 3 คอลัมน์',
      sourceFile: 'คำสั่งผู้ใช้งาน (อันนี้ไม่ต้องเพิ่ม %ภาพรวม)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ต่ำ (ปรับปรุงการแสดงผลคอลัมน์ตารางให้ตรงตามความต้องการผู้ใช้งานเฉพาะจุด)'
    },
    {
      id: 'log_000_growth_pct_and_total_column',
      timestamp: '2026-10-17 14:48:00',
      timestampTh: '17 ต.ค. 2569, 14:48 น.',
      type: 'EDIT',
      typeBadge: 'ปรับตารางเป็น % & เพิ่มคอลัมน์ภาพรวม',
      badgeClass: 'badge-type-edit',
      title: 'ปรับการแสดงผลค่าเพิ่ม/ลดลงเป็น % แทนงาน/ลบ. และเพิ่มคอลัมน์ภาพรวมมูลค่า/งาน',
      targetSubject: 'ตารางวิเคราะห์อัตราการเติบโตรายเดือน ด้านขวากราฟ Timeline',
      storageFile: 'js/app.js, css/styles.css & js/data_history.js',
      changeSummary: 'เปลี่ยนค่าเพิ่ม/ลดลงในตารางจากจำนวนงาน/ล้านบาท เป็น % แทน พร้อมเพิ่มคอลัมน์ภาพรวมมูลค่า/งาน (เพิ่ม/ลดลง เป็น %) คู่กับคอลัมน์ปิดงาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: (1) ปรับการคำนวณและแสดงผลในตารางด้านขวาของกราฟ Timeline จากหน่วยงาน/ลบ. ให้แสดงเป็นสัดส่วนร้อยละ (%) ทั้งหมด (2) เพิ่มคอลัมน์ "● ภาพรวม" แสดงอัตราการเปลี่ยนแปลงภาพรวมมูลค่า/งาน AUC รายเดือน (MoM Growth %) เทียบกับเดือนก่อนหน้า (3) คงคอลัมน์ "● ปิดงาน" แสดงอัตราการปิดงานที่เพิ่มขึ้นหรือลดลงในแต่ละเดือน (%) (4) ปรับความกว้างตารางเป็น 255px ให้รองรับ 3 คอลัมน์ (เดือน, ภาพรวม, ปิดงาน) พร้อมสีสัญลักษณ์ที่ตรงกับเส้นกราฟ (เหลือง = ภาพรวม, เขียว = ปิดงาน) (5) คำนวณค่าเฉลี่ยในแถวสุดท้าย (Footer) ของทั้งคอลัมน์ภาพรวมและปิดงานอย่างถูกต้องแม่นยำ',
      sourceFile: 'คำสั่งผู้ใช้งาน (1.ให้แก้ไข เพิ่ม/ลดลง จากงาน/ลบ. เป็น % แทน 2.ให้เพิ่มคอลัม ภาพรวมมูล่า/งาน เพิ่ม/ลดลง เป็น % ด้วย 3.ให้เพิ่มประวัติในเมนูแก้ไขด้วย ทุกครั้ง)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงรูปแบบการวิเคราะห์อัตราการเติบโตรายเดือนและการแสดงผลตารางเปรียบเทียบ)'
    },
    {
      id: 'log_000_timeline_growth_table',
      timestamp: '2026-10-17 14:27:00',
      timestampTh: '17 ต.ค. 2569, 14:27 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มตาราง % เพิ่ม/ลด รายเดือน',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มตารางแสดงค่า % และจำนวนเงินที่เพิ่มขึ้น/ลดลงรายเดือน (ม.ค. - ธ.ค.) และค่าเฉลี่ย ด้านขวากราฟ Timeline',
      targetSubject: 'กราฟวิเคราะห์เปรียบเทียบ & Timeline (แท็บ Timeline)',
      storageFile: 'index.html, js/app.js & css/styles.css',
      changeSummary: 'แสดงตาราง 2 คอลัมน์ (เดือน และ %) ด้านขวาของกราฟ แสดงค่าการปิดงานที่เพิ่มขึ้นหรือลดลงแต่ละเดือน พร้อมค่าเฉลี่ยในแถวสุดท้าย',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: (1) ออกแบบตาราง 2 คอลัมน์ (คอลัมน์เดือน และคอลัมน์ %) จัดวางด้านขวาของกราฟ Timeline ใน Section ร้อยละ % ปิดงานสะสม และ Section จำนวนเงิน (2) คำนวณส่วนต่างที่เพิ่มขึ้น/ลดลง (MoM Growth) ของแต่ละเดือนตั้งแต่ ม.ค. - ธ.ค. พร้อมแสดงสัญลักษณ์สีเขียว/แดง (3) คำนวณค่าเฉลี่ยในแถวสุดท้าย (Footer Row) ของตารางอย่างแม่นยำ (4) รองรับการอัปเดตแบบเรียลไทม์เมื่อเปลี่ยนตัวกรองเกณฑ์วัด พื้นที่ หรือหน่วยงาน',
      sourceFile: 'คำสั่งผู้ใช้งาน (แสดงค่าที่เพิ่มขึ้นหรือลดลงเป็น % แต่ละเดือน และค่าเฉลี่ยในตารางด้านขวา 2 คอลัมน์)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เพิ่มฟังก์ชันวิเคราะห์อัตราการเติบโตรายเดือนและการแสดงผลข้อมูล)'
    },
    {
      id: 'log_000_fix_model_view',
      timestamp: '2026-10-17 13:45:00',
      timestampTh: '17 ต.ค. 2569, 13:45 น.',
      type: 'EDIT',
      typeBadge: 'แก้ไขการแสดงผล Model View',
      badgeClass: 'badge-type-edit',
      title: 'แก้ไขหน้าต่าง Model View & ตัวอย่างข้อมูล ไม่แสดงผลเมื่อคลิก',
      targetSubject: 'หน้าต่างป๊อปอัป Model View & การ์ดไฟล์ต้นทาง',
      storageFile: 'js/data_history.js, index.html & css/styles.css',
      changeSummary: 'แก้ไขให้หน้าต่าง Model View แสดงผลสมบูรณ์ 100% ทันทีที่คลิกดูตัวอย่างข้อมูลไฟล์และประวัติ พร้อมปรับ z-index และย้าย DOM สู่ Root',
      details: 'แก้ไข 5 จุดสำคัญ: (1) ปรับ openModelViewModal ให้ใส่คลาส .show และ display:flex แบบ Synchronous ไม่ดีเลย์ requestAnimationFrame (2) ย้าย DOM ของ dhModelViewModal และ dhAddLogModal ไปไว้ระดับ Root ใน index.html ข้าง drilldownModal เพื่อป้องกันปัญหา Stacking context/Transform (3) ปรับ .modal-backdrop ให้มี z-index: 10050 และ .show มี display: flex !important; opacity: 1 !important; (4) ปรับปุ่มคลิกดู Model View บนการ์ดไฟล์ให้เป็น Button ที่รองรับการคลิกแยกโดยตรง (5) เพิ่ม try-catch และความปลอดภัยในการแปลงตัวเลขของ sampleProvider ทุกไฟล์',
      sourceFile: 'js/data_history.js (openModelViewModal, closeDhModelModal & sampleProvider)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูง (แก้ไขฟังก์ชันการตรวจสอบข้อมูล Model View ของระบบ)'
    },
    {
      id: 'log_000_workflow',
      timestamp: '2026-10-17 13:08:00',
      timestampTh: '17 ต.ค. 2569, 13:08 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปรุงเมนูนำทาง',
      badgeClass: 'badge-type-edit',
      title: 'นำเมนู "ขั้นตอนงานก่อสร้าง & ขึ้นทะเบียน" ออกจากแถบเมนูหลัก',
      targetSubject: 'แถบเมนูนำทาง (Navigation Bar) & แท็บขั้นตอนงานก่อสร้าง',
      storageFile: 'index.html',
      changeSummary: 'นำปุ่มเมนูแท็บ ขั้นตอนงานก่อสร้าง & ขึ้นทะเบียน ออกจากแถบเมนูหลักด้านบน และคอมเมนต์ปิดส่วน Tab Pane (tab-workflow)',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: นำแท็บบน Navigation bar (<button class="nav-tab-btn" data-tab="tab-workflow">) ออก และคอมเมนต์ปิดแท็บเนื้อหา <div id="tab-workflow" class="tab-pane"> เพื่อลดความซ้ำซ้อนและกระชับแถบเมนูนำทาง โดยยังคงโครงสร้างโค้ดไว้หากต้องการนำกลับมาใช้งานในอนาคต',
      sourceFile: 'index.html (Navigation Tabs Bar & Tab Pane Workflow)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงหน้าจอเมนูนำทางให้ตรงตามความต้องการผู้ใช้งาน)'
    },
    {
      id: 'log_000',
      timestamp: '2026-10-17 12:57:00',
      timestampTh: '17 ต.ค. 2569, 12:57 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปรุงเมนูนำทาง',
      badgeClass: 'badge-type-edit',
      title: 'นำเมนู "ตารางสืบค้นข้อมูล & แผนรายเดือน" ออกจากแถบเมนูหลัก',
      targetSubject: 'แถบเมนูนำทาง (Navigation Bar) & แท็บตารางสืบค้นข้อมูล',
      storageFile: 'index.html',
      changeSummary: 'นำปุ่มเมนูแท็บ ตารางสืบค้นข้อมูล & แผนรายเดือน ออกจากแถบเมนูหลักด้านบน และคอมเมนต์ปิดส่วน Tab Pane (tab-table) เพื่อความกระชับในการใช้งาน',
      details: 'ดำเนินการตามคำสั่งผู้ใช้งาน: นำแท็บบน Navigation bar (<button class="nav-tab-btn" data-tab="tab-table">) ออก และคอมเมนต์ปิดแท็บเนื้อหา <div id="tab-table" class="tab-pane"> เพื่อไม่ให้แสดงผลในหน้าจอหลัก แต่ยังคงโครงสร้างไว้ในโค้ดหากต้องการนำกลับมาใช้งานในอนาคต',
      sourceFile: 'index.html (Navigation Tabs Bar & Tab Pane Matrix)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ปรับปรุงหน้าจอเมนูนำทางให้ตรงตามความต้องการผู้ใช้งาน)'
    },
    {
      id: 'log_001',
      timestamp: '2026-10-17 08:15:00',
      timestampTh: '17 ต.ค. 2569, 08:15 น.',
      type: 'EDIT',
      typeBadge: 'แก้ไขตัวกรองค้นหา',
      badgeClass: 'badge-type-edit',
      title: 'แก้ไขระบบตัวกรองค้นหาในตาราง WBS ให้ตรงตามสถานะ SAP จริง 100%',
      targetSubject: 'ตาราง WBS (ตัวกรองค้นหาข้อความ)',
      storageFile: 'js/wbs.js & index.html',
      changeSummary: 'แยกการค้นหาสถานะ SAP (TECO, REL, CLSD, CRTD) ไม่ให้คำว่า TECO ในช่องหมายเหตุ (note) ของงานที่สถานะ SAP ยังเป็น REL ปะปนขึ้นมา',
      details: 'เพิ่มฟังก์ชัน isStatusKeyword ตรวจจับคีย์เวิร์ดสถานะ SAP และกำหนดไม่ให้ช่อง note มาร่วมจับคู่เมื่อค้นหาสถานะ SAP งาน C-68-I-NPMSR.0215.02.1 (REL D1) จึงไม่แสดงปะปนเมื่อค้นหา "teco" พร้อมทั้งเพิ่มการล้างค่าสถานะ SAP เมื่อกดล้างตัวกรองในตาราง',
      sourceFile: '06 google sheet แผนงานแล้วเสร็จ.xlsx (คอลัมน์ note)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูงมาก (แก้ไขความถูกต้องของการนับจำนวนงานและยอดเงิน)'
    },
    {
      id: 'log_002',
      timestamp: '2026-10-17 07:45:00',
      timestampTh: '17 ต.ค. 2569, 07:45 น.',
      type: 'EDIT',
      typeBadge: 'เพิ่มฟังก์ชันปุ่มล้างข้อมูล',
      badgeClass: 'badge-type-edit',
      title: 'เพิ่มปุ่มล้างข้อมูลที่เลือก Checkbox และคงสถานะ Checkbox ข้ามการคลิกการ์ดสถานะ SAP',
      targetSubject: 'การ์ดสรุปผลรวมรายการที่เลือก & Checkbox',
      storageFile: 'js/wbs.js',
      changeSummary: 'เพิ่มปุ่ม 🗑️ ล้างข้อมูลที่เลือก ใน Header ของการ์ด และแก้ไขให้ระบบคงสถานะที่ติ๊ก Checkbox ไว้แม้จะคลิกสลับดูสถานะ SAP ใดๆ',
      details: 'ปรับปรุงตัวแปร selectedWbsCodes ให้คำนวณสรุปผลตามรายการที่เลือกจริงทั้งหมด (wbsSelectedItems) โดยไม่ถูกตัดทอนจากการกรองด้วยการ์ดสถานะ SAP ย่อย',
      sourceFile: 'ระบบส่วนหน้า (UI Interaction)',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (เพิ่มความสะดวกในการใช้งาน)'
    },
    {
      id: 'log_003',
      timestamp: '2026-10-16 23:30:00',
      timestampTh: '16 ต.ค. 2569, 23:30 น.',
      type: 'EDIT',
      typeBadge: 'ปรับปรุงการ์ดสรุปผล',
      badgeClass: 'badge-type-edit',
      title: 'ปรับปรุงการ์ดสรุปผลรวมรายการที่เลือกให้แสดงเฉพาะสถานะ SAP ที่ติ๊ก Checkbox',
      targetSubject: 'WBS Selected Summary Cards',
      storageFile: 'js/wbs.js & css/styles.css',
      changeSummary: 'ปรับขนาดการ์ดให้เท่ากับการ์ดสรุปสถานะ SAP ซ่อนการ์ด CLSD ซ่อนการ์ดสถานะที่ไม่ได้ติ๊ก และเอาปุ่มเลือกทั้งหมด/ปลดทั้งหมดออก',
      details: 'แสดงการ์ดสรุปประเภทสถานะ SAP เฉพาะที่มีรายการ Checkbox ถูกเลือกอยู่จริงเท่านั้น หากไม่มีการเลือกจะแสดงการ์ด "ทั้งหมด" เพียงใบเดียว',
      sourceFile: 'ระบบแสดงผลสรุปตาราง WBS',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'ปานกลาง (ความสวยงามและใช้งานง่าย)'
    },
    {
      id: 'log_004',
      timestamp: '2026-10-15 17:52:00',
      timestampTh: '15 ต.ค. 2569, 17:52 น.',
      type: 'EDIT',
      typeBadge: 'จำลองแผน Scenario & ธีม',
      badgeClass: 'badge-type-config',
      title: 'เพิ่มเครื่องมือจำลองแผนปิดงาน Scenario Calculator และพาเลทปรับแต่งสี & ธีม',
      targetSubject: 'Scenario Calculator & Color Palette Widget',
      storageFile: 'js/app.js & localStorage',
      changeSummary: 'เพิ่ม Modal Scenario จำลองผลลัพธ์การปรับยอดแผนปิดงานรายเดือน พร้อมคำนวณ Gap เทียบเป้าหมายสะสม',
      details: 'บันทึกค่าที่ผู้ใช้ทดลองแก้ไขลง localStorage (AUC_SIMULATION_SCENARIO) เพื่อให้สามารถจำลองเป้าหมาย KPI ได้แบบเรียลไทม์',
      sourceFile: '02 KPI.xlsx & แผนปิดงาน',
      author: 'ผู้ดูแลระบบ (System Admin)',
      impactLevel: 'สูง (ฟีเจอร์ช่วยวางแผนปิดงานผู้บริหาร)'
    },
    {
      id: 'log_005',
      timestamp: '2026-10-13 19:05:00',
      timestampTh: '13 ต.ค. 2569, 19:05 น.',
      type: 'MERGE',
      typeBadge: 'ผสานข้อมูล 4 ไฟล์หลัก',
      badgeClass: 'badge-type-merge',
      title: 'นำเข้าและผสานรวมไฟล์งานคงเหลือ WBS: ไฟล์ 03 + 04 + 05 + 06',
      targetSubject: 'ฐานข้อมูล WBS คงเหลือ (Full Database)',
      storageFile: 'js/data_wbs.js',
      changeSummary: 'ผสานรวมไฟล์ Excel 03, 04, 05, 06 ด้วยรหัส WBS เดียวกัน ได้ฐานข้อมูลครบ 41 คอลัมน์ 2,968 รายการ',
      details: 'รันสคริปต์ merge_wbs_all.ps1 อ่านไฟล์ 03 WBSงานคงเหลือ (2,968 รายการ), ผสานไฟล์ 04 ZBUDR064 (%เบิกพัสดุ/คชจ.), ผสานไฟล์ 05 CN41 (มูลค่า AUC บาท), และไฟล์ 06 Google Sheet (แผนปิดงาน/หมายเหตุ) จัดเก็บเป็นตัวแปร window.AUC_WBS_REMAINING_DATA',
      sourceFile: '03 WBSงานคงเหลือ, 04 ZBUDR064, 05 CN41, 06 Google Sheet',
      author: 'Script Data Merge Engine',
      impactLevel: 'วิกฤต (ฐานข้อมูลหลักของทั้งระบบ)'
    },
    {
      id: 'log_006',
      timestamp: '2026-10-03 09:30:00',
      timestampTh: '3 ต.ค. 2569, 09:30 น.',
      type: 'IMPORT',
      typeBadge: 'นำเข้าเกณฑ์วัด KPI',
      badgeClass: 'badge-type-import',
      title: 'นำเข้าตารางเกณฑ์วัด KPI ประจำปี 2569 จากไฟล์ 02 KPI.xlsx',
      targetSubject: 'เกณฑ์วัด KPI ปี 2569 (ข้อ 1.1 - 3.3)',
      storageFile: 'js/kpi_matrix.js & localStorage',
      changeSummary: 'นำเข้าเป้าหมายสะสมรายเดือนและค่าน้ำหนักคะแนน KPI ประจำปี 2569 ทั้ง 8 เกณฑ์วัด',
      details: 'แปลงข้อมูลจากไฟล์ 02 KPI.xlsx เป็นโครงสร้าง JSON จัดเก็บในตัวแปร window.KPI_MATRIX รองรับการคำนวณผลงานสะสมอัตโนมัติ',
      sourceFile: '02 KPI.xlsx',
      author: 'ผู้นำเข้าข้อมูล (Data Officer)',
      impactLevel: 'สูง (กำหนดสูตรและเป้าหมาย KPI)'
    },
    {
      id: 'log_007',
      timestamp: '2026-09-29 16:55:00',
      timestampTh: '29 ก.ย. 2569, 16:55 น.',
      type: 'IMPORT',
      typeBadge: 'นำเข้าผลงานเดือน ส.ค.',
      badgeClass: 'badge-type-import',
      title: 'นำเข้าข้อมูลรายงานผลงาน AUC ประจำเดือน ส.ค. 2569',
      targetSubject: 'รายงาน AUC รายเดือน (ส.ค. 2569)',
      storageFile: 'js/data_aug.js',
      changeSummary: 'นำเข้าผลงานราย กฟฟ. 20 แห่ง เดือน ส.ค. 2569 จำนวน 368 แถวข้อมูล',
      details: 'บันทึกยอดรวม AUC, ปิดงานแล้ว, คงเหลือ, % ปิดงาน และคะแนน KPI ประจำเดือน ส.ค. เป็น Active Month ของแดชบอร์ดผู้บริหาร',
      sourceFile: '01 รายงาน AUC เดือน 8ส.ค.  (3.2&3.3teco).xlsx',
      author: 'ผู้นำเข้าข้อมูล (Data Officer)',
      impactLevel: 'สูง (ข้อมูลรอบประเมินล่าสุด)'
    },
    {
      id: 'log_008',
      timestamp: '2026-09-25 17:32:00',
      timestampTh: '25 ก.ย. 2569, 17:32 น.',
      type: 'IMPORT',
      typeBadge: 'นำเข้าประวัติ ม.ค. - ก.ค.',
      badgeClass: 'badge-type-import',
      title: 'นำเข้าข้อมูลผลงานย้อนหลังเดือน ม.ค. - ก.ค. 2569 (รวม 7 เดือน)',
      targetSubject: 'รายงาน AUC ย้อนหลัง ม.ค. - ก.ค.',
      storageFile: 'js/data.js และ js/data_jan.js ถึง data_jun.js',
      changeSummary: 'นำเข้าฐานข้อมูลผลงานรายเดือนย้อนหลังรวม 2,576 รายการ',
      details: 'จัดเก็บสถิติผลงานสะสมเพื่อใช้ในการพล็อตกราฟเปรียบเทียบแนวโน้ม (Timeline Analysis) และการประเมินผลการดำเนินงาน',
      sourceFile: '01 รายงาน AUC เดือน 1ม.ค. ถึง 7ก.ค. 2569',
      author: 'ผู้นำเข้าข้อมูล (Data Officer)',
      impactLevel: 'ปานกลาง (ข้อมูลสถิติย้อนหลัง)'
    }
  ];

  /**
   * Helper: Get all custom logs from localStorage
   */
  function getCustomLogs() {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_LOGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('Error reading custom logs from localStorage:', e);
    }
    return [];
  }

  /**
   * Helper: Save custom logs
   */
  function saveCustomLog(entry) {
    try {
      const current = getCustomLogs();
      current.unshift(entry);
      localStorage.setItem(STORAGE_CUSTOM_LOGS_KEY, JSON.stringify(current));
      return true;
    } catch (e) {
      console.error('Error saving custom log:', e);
      return false;
    }
  }

  /**
   * Helper: Combine base logs + custom logs
   */
  function getAllAuditLogs() {
    const custom = getCustomLogs();
    const combined = [...custom, ...BASE_AUDIT_LOGS];
    // Sort descending by timestamp
    return combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Main Render Function for Tab: ประวัติการนำเข้า & แก้ไขข้อมูล
   */
  window.renderDataHistoryTab = function () {
    const container = document.getElementById('tab-data-history');
    if (!container) return;

    try {
      const allLogs = getAllAuditLogs();
      const totalFiles = DATA_SOURCE_CATALOG.length;
      const totalStorageFiles = SYSTEM_STORAGE_FILES.length;
      const lastImportTh = DATA_SOURCE_CATALOG[0].importDateTh;
      const lastEditTh = allLogs[0] ? allLogs[0].timestampTh : '17 ต.ค. 2569, 08:15 น.';

    container.innerHTML = `
      <div class="data-history-wrapper">
        
        <!-- Header Banner & Top Stats -->
        <div class="dh-header-card">
          <div class="dh-header-info">
            <div class="dh-badge-pill">
              <span class="dh-pulse-dot"></span>
              <span>ศูนย์บันทึกประวัติข้อมูล & แหล่งจัดเก็บ (Data Audit & Model View)</span>
            </div>
            <h2 class="dh-main-title">
              ประวัติการนำเข้าข้อมูล แหล่งจัดเก็บ และบันทึกการแก้ไขข้อมูล
            </h2>
            <p class="dh-subtitle">
              ตรวจสอบวัน-เวลาที่นำเข้าไฟล์ต้นฉบับ Excel 01 - 06, แหล่งที่ตั้งไฟล์จัดเก็บข้อมูลในระบบ, บันทึกการเปลี่ยนแปลง (Change Log), และผัง Model View การเชื่อมโยงข้อมูล
            </p>
          </div>
          <div class="dh-header-actions">
            <button class="btn btn-outline" id="btnDhAddManualLog" title="บันทึกโน้ตประวัติการแก้ไขข้อมูลเพิ่มเติม">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ บันทึกประวัติการแก้ไข</span>
            </button>
            <button class="btn btn-gold" onclick="document.getElementById('excelFileInput').click()" title="นำเข้าไฟล์ Excel อัปเดตเข้าระบบ">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              <span>นำเข้าไฟล์ใหม่</span>
            </button>
          </div>
        </div>

        <!-- 4 Top KPI Stat Cards -->
        <div class="dh-stats-grid">
          <div class="dh-stat-card">
            <div class="dh-stat-icon" style="background:rgba(236,72,153,0.15); color:#F472B6;">📁</div>
            <div class="dh-stat-body">
              <div class="dh-stat-val">${totalFiles} ไฟล์หลัก</div>
              <div class="dh-stat-label">ไฟล์ Excel ต้นทางทั้งหมด (01 - 06)</div>
              <div class="dh-stat-sub">รายงาน AUC, KPI, WBS, SAP, CN41, แผนงาน</div>
            </div>
          </div>

          <div class="dh-stat-card">
            <div class="dh-stat-icon" style="background:rgba(139,92,246,0.15); color:#A78BFA;">📅</div>
            <div class="dh-stat-body">
              <div class="dh-stat-val">13 ต.ค. 2569</div>
              <div class="dh-stat-label">นำเข้าข้อมูล WBS คงเหลือล่าสุด</div>
              <div class="dh-stat-sub">2,968 รายการ WBS (ผสานไฟล์ 03, 04, 05, 06)</div>
            </div>
          </div>

          <div class="dh-stat-card">
            <div class="dh-stat-icon" style="background:rgba(245,158,11,0.15); color:#FBBF24;">✏️</div>
            <div class="dh-stat-body">
              <div class="dh-stat-val">17 ต.ค. 2569</div>
              <div class="dh-stat-label">แก้ไขข้อมูล / ตัวกรองล่าสุด</div>
              <div class="dh-stat-sub">แยก TECO กับ REL D1 & บันทึก Checkbox</div>
            </div>
          </div>

          <div class="dh-stat-card">
            <div class="dh-stat-icon" style="background:rgba(16,185,129,0.15); color:#34D399;">💾</div>
            <div class="dh-stat-body">
              <div class="dh-stat-val">${totalStorageFiles} แหล่งจัดเก็บ</div>
              <div class="dh-stat-label">ไฟล์จัดเก็บในระบบ (System Storage)</div>
              <div class="dh-stat-sub">js/data_wbs.js, js/data_aug.js, kpi_matrix.js</div>
            </div>
          </div>
        </div>

        <!-- View Mode Navigation Tabs -->
        <div class="dh-view-selector">
          <button class="dh-view-tab-btn active" data-dh-view="model-flow" id="dhBtnViewModelFlow">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
              <line x1="6" y1="6" x2="6.01" y2="6"></line>
              <line x1="6" y1="18" x2="6.01" y2="18"></line>
            </svg>
            <span>ผังการไหลของข้อมูล & แหล่งจัดเก็บ (Model View & Storage Map)</span>
          </button>

          <button class="dh-view-tab-btn" data-dh-view="timeline-log" id="dhBtnViewTimelineLog">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>ประวัติการนำเข้าและแก้ไขข้อมูล (Timeline & Change Log)</span>
            <span class="dh-counter-badge">${allLogs.length} รายการ</span>
          </button>

          <button class="dh-view-tab-btn" data-dh-view="storage-files" id="dhBtnViewStorageFiles">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
            </svg>
            <span>ไฟล์ที่จัดเก็บข้อมูลในระบบ (System Storage Inspector)</span>
          </button>
        </div>

        <!-- VIEW 1: DATA FLOW ARCHITECTURE & MODEL VIEW -->
        <div class="dh-view-content active" id="dhContentModelFlow">
          
          <!-- Interactive Architecture Diagram Flow -->
          <div class="dh-diagram-card">
            <div class="dh-diagram-header">
              <div class="dh-diagram-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <span>ผังจำลองสถาปัตยกรรม Model View การนำเข้า ผสาน และจัดเก็บข้อมูล</span>
              </div>
              <div class="dh-diagram-desc">คลิกที่การ์ดไฟล์หรือกล่องประมวลผลเพื่อเปิดดูรายละเอียดเชิงลึก (Model View Modal)</div>
            </div>

            <div class="dh-flow-container">
              
              <!-- Stage 1: Source Files -->
              <div class="dh-flow-stage">
                <div class="dh-stage-header">
                  <span class="dh-stage-num">1</span>
                  <span>ไฟล์ Excel ต้นฉบับ (Source Files)</span>
                </div>
                <div class="dh-stage-cards">
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_03', 'source')">
                    <div class="dh-node-badge" style="background:#EC4899;">ไฟล์ 03</div>
                    <div class="dh-node-title">WBS คงเหลือ (2,968 รายการ)</div>
                    <div class="dh-node-meta">นำเข้า: 13 ต.ค. 69 • 5.74 MB</div>
                  </div>
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_04', 'source')">
                    <div class="dh-node-badge" style="background:#8B5CF6;">ไฟล์ 04</div>
                    <div class="dh-node-title">ZBUDR064 (%พัสดุ/สถานะ SAP)</div>
                    <div class="dh-node-meta">นำเข้า: 13 ต.ค. 69 • 959 KB</div>
                  </div>
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_05', 'source')">
                    <div class="dh-node-badge" style="background:#F59E0B;">ไฟล์ 05</div>
                    <div class="dh-node-title">CN41 (มูลค่า AUC บาท)</div>
                    <div class="dh-node-meta">นำเข้า: 13 ต.ค. 69 • 345 KB</div>
                  </div>
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_06', 'source')">
                    <div class="dh-node-badge" style="background:#10B981;">ไฟล์ 06</div>
                    <div class="dh-node-title">Google Sheet (แผนปิดงาน/หมายเหตุ)</div>
                    <div class="dh-node-meta">นำเข้า: 13 ต.ค. 69 • 127 KB</div>
                  </div>
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_02', 'source')">
                    <div class="dh-node-badge" style="background:#3B82F6;">ไฟล์ 02</div>
                    <div class="dh-node-title">KPI Matrix (เกณฑ์วัด 8 ข้อ)</div>
                    <div class="dh-node-meta">นำเข้า: 3 ต.ค. 69 • 17.4 KB</div>
                  </div>
                  <div class="dh-flow-node" onclick="window.openModelViewModal('src_01_aug', 'source')">
                    <div class="dh-node-badge" style="background:#6366F1;">ไฟล์ 01</div>
                    <div class="dh-node-title">รายงาน AUC เดือน ส.ค. (ล่าสุด)</div>
                    <div class="dh-node-meta">นำเข้า: 29 ก.ย. 69 • 50.2 KB</div>
                  </div>
                </div>
              </div>

              <!-- Arrow Connector 1 -->
              <div class="dh-flow-arrow">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
                <span>ผสาน & Normalize</span>
              </div>

              <!-- Stage 2: Processing Engine -->
              <div class="dh-flow-stage">
                <div class="dh-stage-header">
                  <span class="dh-stage-num">2</span>
                  <span>ระบบประมวลผล (Data Engine)</span>
                </div>
                <div class="dh-stage-cards">
                  <div class="dh-flow-node highlight">
                    <div class="dh-node-badge" style="background:var(--pea-gold-400); color:#000;">Merge Engine</div>
                    <div class="dh-node-title">Left Join ด้วยเลขที่ WBS</div>
                    <div class="dh-node-meta">ผสานไฟล์ 03+04+05+06 เป็น 41 คอลัมน์</div>
                  </div>
                  <div class="dh-flow-node highlight">
                    <div class="dh-node-badge" style="background:#10B981; color:#fff;">Status Parser</div>
                    <div class="dh-node-title">จัดกลุ่มสถานะ SAP อัจฉริยะ</div>
                    <div class="dh-node-meta">แยก REL, TECO, CLSD ย่อเหลือ 2 อักษร</div>
                  </div>
                  <div class="dh-flow-node highlight">
                    <div class="dh-node-badge" style="background:#3B82F6; color:#fff;">KPI Calculator</div>
                    <div class="dh-node-title">คำนวณคะแนน KPI & Gap</div>
                    <div class="dh-node-meta">ประเมินคะแนนสะสม 20 กฟฟ. รายเดือน</div>
                  </div>
                </div>
              </div>

              <!-- Arrow Connector 2 -->
              <div class="dh-flow-arrow">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M5 12h14"></path>
                  <path d="M12 5l7 7-7 7"></path>
                </svg>
                <span>จัดเก็บข้อมูล</span>
              </div>

              <!-- Stage 3: System Storage Files -->
              <div class="dh-flow-stage">
                <div class="dh-stage-header">
                  <span class="dh-stage-num">3</span>
                  <span>ไฟล์ที่จัดเก็บข้อมูลในระบบ (Storage)</span>
                </div>
                <div class="dh-stage-cards">
                  <div class="dh-flow-node storage-node" onclick="window.openModelViewModal('src_03', 'source')">
                    <div class="dh-node-badge" style="background:#10B981;">js/data_wbs.js</div>
                    <div class="dh-node-title">window.AUC_WBS_REMAINING_DATA</div>
                    <div class="dh-node-meta">2,968 รายการ WBS • 3.47 MB</div>
                  </div>
                  <div class="dh-flow-node storage-node" onclick="window.openModelViewModal('src_01_aug', 'source')">
                    <div class="dh-node-badge" style="background:#6366F1;">js/data_aug.js</div>
                    <div class="dh-node-title">window.AUC_DATA_AUG (ส.ค.)</div>
                    <div class="dh-node-meta">368 รายการ • 372 KB</div>
                  </div>
                  <div class="dh-flow-node storage-node" onclick="window.openModelViewModal('src_02', 'source')">
                    <div class="dh-node-badge" style="background:#3B82F6;">js/kpi_matrix.js</div>
                    <div class="dh-node-title">window.KPI_MATRIX</div>
                    <div class="dh-node-meta">8 เกณฑ์วัด • 12.5 KB</div>
                  </div>
                  <div class="dh-flow-node storage-node">
                    <div class="dh-node-badge" style="background:#EC4899;">localStorage</div>
                    <div class="dh-node-title">AUC_SAVED_KPI, Scenario, Cols</div>
                    <div class="dh-node-meta">บันทึกเครื่องผู้ใช้ • Real-time</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <!-- File Cards Grid (Model View Trigger Cards) -->
          <div class="dh-section-header">
            <h3 class="dh-section-title">
              <span>รายละเอียดไฟล์ต้นทางและไฟล์จัดเก็บข้อมูล (คลิกดู Model View)</span>
            </h3>
            <span class="dh-section-count">ทั้งหมด ${DATA_SOURCE_CATALOG.length} ไฟล์หลัก</span>
          </div>

          <div class="dh-cards-grid">
            ${DATA_SOURCE_CATALOG.map(file => `
              <div class="dh-file-card" onclick="window.openModelViewModal('${file.id}', 'source')">
                <div class="dh-file-card-top">
                  <div class="dh-file-badge" style="background:${file.badgeColor}22; color:${file.badgeColor}; border:1px solid ${file.badgeColor}44;">
                    <span>ไฟล์ ${file.groupNo}</span>
                  </div>
                  <div class="dh-file-status ${file.status === 'active' ? 'status-active' : 'status-ready'}">
                    <span>${file.statusText}</span>
                  </div>
                </div>

                <div class="dh-file-title-group">
                  <div class="dh-file-icon">${file.icon}</div>
                  <div>
                    <h4 class="dh-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</h4>
                    <div class="dh-file-cat">${file.category}</div>
                  </div>
                </div>

                <p class="dh-file-desc">${escapeHtml(file.description)}</p>

                <div class="dh-file-meta-list">
                  <div class="dh-meta-row">
                    <span class="dh-meta-label">📅 วันที่นำเข้าข้อมูล:</span>
                    <span class="dh-meta-val">${file.importDateTh}</span>
                  </div>
                  <div class="dh-meta-row">
                    <span class="dh-meta-label">✏️ แก้ไขล่าสุด:</span>
                    <span class="dh-meta-val highlight-gold">${file.lastModifiedTh}</span>
                  </div>
                  <div class="dh-meta-row">
                    <span class="dh-meta-label">💾 ไฟล์จัดเก็บในระบบ:</span>
                    <span class="dh-meta-val file-tag"><code>${file.storageFile}</code></span>
                  </div>
                  <div class="dh-meta-row">
                    <span class="dh-meta-label">📊 จำนวนแถว / ขนาด:</span>
                    <span class="dh-meta-val">${file.recordCount.toLocaleString('th-TH')} แถว (${file.sizeText})</span>
                  </div>
                </div>

                <div class="dh-file-card-footer">
                  <button type="button" class="btn btn-sm btn-outline dh-btn-view-model" onclick="event.stopPropagation(); window.openModelViewModal('${file.id}', 'source')" style="cursor:pointer; width:100%; justify-content:center; padding:0.5rem 0.85rem; border-color:rgba(245,158,11,0.45); color:var(--pea-gold-400); font-weight:700;">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span>คลิกดู Model View &amp; ตัวอย่างข้อมูล</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>

        </div>

        <!-- VIEW 2: TIMELINE & CHANGE AUDIT LOG -->
        <div class="dh-view-content" id="dhContentTimelineLog">
          
          <!-- Filters & Search Toolbar for Logs -->
          <div class="dh-toolbar-card">
            <div class="dh-search-box">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input type="text" id="dhLogSearchInput" placeholder="ค้นหาประวัติการนำเข้า / แก้ไข / ชื่อไฟล์ / สิ่งที่แก้ไข..." />
            </div>

            <div class="dh-filter-group">
              <label>ประเภทประวัติ:</label>
              <select id="dhLogTypeFilter" class="form-select">
                <option value="ALL">ทั้งหมดทุกประเภท</option>
                <option value="EDIT">✏️ การแก้ไขข้อมูล (Data Modification)</option>
                <option value="IMPORT">📥 การนำเข้าข้อมูล (Data Import)</option>
                <option value="MERGE">🔄 การผสานรวมไฟล์ (Data Merge)</option>
                <option value="CONFIG">⚙️ การตั้งค่าระบบ (Configuration)</option>
              </select>
            </div>

            <div class="dh-toolbar-stats">
              แสดง <strong id="dhVisibleLogCount">${allLogs.length}</strong> จาก ${allLogs.length} รายการ
            </div>
          </div>

          <!-- Timeline Container -->
          <div class="dh-timeline-container" id="dhTimelineList">
            ${renderTimelineItemsHtml(allLogs)}
          </div>

        </div>

        <!-- VIEW 3: SYSTEM STORAGE FILES INSPECTOR -->
        <div class="dh-view-content" id="dhContentStorageFiles">
          <div class="content-card" style="margin-top:0;">
            <div class="card-header">
              <div class="card-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
                  <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
                  <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
                </svg>
                <span>ตารางไฟล์ที่จัดเก็บข้อมูลในระบบ (System Storage Files Location)</span>
              </div>
              <div style="font-size:0.8rem; color:var(--text-muted);">
                โครงสร้างไฟล์ JavaScript ภายในโฟลเดอร์ <code style="color:var(--pea-gold-400);">js/</code> และหน่วยความจำ LocalStorage
              </div>
            </div>

            <div class="table-responsive">
              <table class="data-table dh-storage-table">
                <thead>
                  <tr>
                    <th style="width:50px; text-align:center;">ลำดับ</th>
                    <th style="min-width:220px;">ไฟล์ที่จัดเก็บข้อมูล (File Path)</th>
                    <th style="min-width:240px;">หน้าที่ & ข้อมูลที่จัดเก็บ</th>
                    <th style="min-width:180px;">ตัวแปรในระบบ (Variable)</th>
                    <th style="min-width:140px; text-align:center;">จำนวนข้อมูล</th>
                    <th style="min-width:100px; text-align:center;">ขนาด</th>
                    <th style="min-width:150px; text-align:center;">แก้ไขล่าสุด</th>
                    <th style="min-width:130px; text-align:center;">สถานะ</th>
                    <th style="min-width:100px; text-align:center;">การจัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  ${SYSTEM_STORAGE_FILES.map((f, idx) => `
                    <tr>
                      <td style="text-align:center; font-weight:700; color:var(--text-muted);">${idx + 1}</td>
                      <td>
                        <div style="display:flex; align-items:center; gap:0.4rem;">
                          <span style="font-size:1.1rem;">📄</span>
                          <strong style="color:var(--text-main); font-family:monospace; font-size:0.88rem;">${escapeHtml(f.path)}</strong>
                        </div>
                        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">${escapeHtml(f.title)}</div>
                      </td>
                      <td style="font-size:0.82rem; color:var(--text-muted);">${escapeHtml(f.role)}</td>
                      <td><code style="font-size:0.78rem; background:rgba(0,0,0,0.35); padding:2px 6px; border-radius:4px; color:#A78BFA;">${escapeHtml(f.variable)}</code></td>
                      <td style="text-align:center; font-weight:700; color:var(--pea-gold-400); font-size:0.85rem;">${escapeHtml(f.recordsCount)}</td>
                      <td style="text-align:center; font-size:0.8rem; color:var(--text-muted);">${escapeHtml(f.fileSize)}</td>
                      <td style="text-align:center; font-size:0.8rem; color:var(--text-main);">${escapeHtml(f.updatedAt)}</td>
                      <td style="text-align:center;">
                        <span class="dh-status-badge ${f.status.includes('Active') || f.status.includes('100%') ? 'status-ok' : 'status-info'}">${escapeHtml(f.status)}</span>
                      </td>
                      <td style="text-align:center;">
                        <button class="btn btn-sm btn-outline" onclick="window.copyTextToClipboard('${f.path}', 'คัดลอกพาธไฟล์ ${f.path} สำเร็จ')" title="คัดลอก Path ไฟล์">
                          📋 คัดลอก
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    `;

    setupDhEventListeners();
    } catch (err) {
      console.error('Error rendering Data History Tab:', err);
      if (container) {
        container.innerHTML = `
          <div style="background:rgba(239,68,68,0.1); border:1px solid #EF4444; border-radius:12px; padding:2rem; text-align:center; color:#fff; margin:2rem;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">⚠️</div>
            <h3 style="color:#F87171;">เกิดข้อผิดพลาดในการโหลดหน้าประวัติ</h3>
            <p style="color:#CBD5E1; font-family:monospace; margin-top:0.5rem;">${escapeHtml(err.message)}</p>
            <button class="btn btn-primary" onclick="window.renderDataHistoryTab()" style="margin-top:1rem;">ลองใหม่อีกครั้ง</button>
          </div>
        `;
      }
    }
  };

  /**
   * Helper: Render Timeline Items HTML
   */
  function renderTimelineItemsHtml(logs) {
    if (!logs || logs.length === 0) {
      return `
        <div style="text-align:center; padding:3rem 1rem; color:var(--text-muted);">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">🔍</div>
          <div>ไม่พบรายการประวัติที่ตรงกับเงื่อนไขค้นหา</div>
        </div>
      `;
    }

    return logs.map((log, index) => {
      const typeIcons = {
        EDIT: '✏️',
        IMPORT: '📥',
        MERGE: '🔄',
        CONFIG: '⚙️'
      };
      const icon = typeIcons[log.type] || '📑';
      const badgeClass = log.badgeClass || (log.type === 'IMPORT' ? 'badge-type-import' : 'badge-type-edit');

      return `
        <div class="dh-timeline-item" id="dhLogItem_${log.id}">
          <div class="dh-tl-marker">
            <span class="dh-tl-dot"></span>
            <span class="dh-tl-line"></span>
          </div>

          <div class="dh-tl-card">
            <div class="dh-tl-header">
              <div class="dh-tl-meta-left">
                <span class="dh-tl-icon">${icon}</span>
                <span class="dh-type-badge ${badgeClass}">${escapeHtml(log.typeBadge || log.type)}</span>
                <span class="dh-tl-time">🕒 ${escapeHtml(log.timestampTh)}</span>
              </div>
              <div class="dh-tl-meta-right">
                <span class="dh-author-badge">👤 ${escapeHtml(log.author || 'ระบบ')}</span>
              </div>
            </div>

            <h4 class="dh-tl-title">${escapeHtml(log.title)}</h4>

            <div class="dh-tl-summary-box">
              <div class="dh-summary-row">
                <span class="dh-summary-label">🎯 สิ่งที่แก้ไข / นำเข้า:</span>
                <span class="dh-summary-content">${escapeHtml(log.changeSummary)}</span>
              </div>
              <div class="dh-summary-row">
                <span class="dh-summary-label">💾 ไฟล์ที่จัดเก็บข้อมูล:</span>
                <span class="dh-summary-file"><code>${escapeHtml(log.storageFile)}</code></span>
              </div>
              ${log.sourceFile ? `
                <div class="dh-summary-row">
                  <span class="dh-summary-label">📁 ไฟล์ต้นฉบับ:</span>
                  <span class="dh-summary-src">${escapeHtml(log.sourceFile)}</span>
                </div>
              ` : ''}
            </div>

            ${log.details ? `
              <div class="dh-tl-details-text">
                <strong>รายละเอียดเชิงลึก:</strong> ${escapeHtml(log.details)}
              </div>
            ` : ''}

            <div class="dh-tl-footer">
              <span class="dh-impact-pill">ผลกระทบ: ${escapeHtml(log.impactLevel || 'ข้อมูลได้รับการอัปเดต')}</span>
              <button class="btn btn-sm btn-outline dh-btn-model-trigger" onclick="window.openModelViewModal('${log.id}', 'log')">
                🔍 ดู Model View รายการนี้
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Open Model View Modal (for both Source File and Audit Log entry)
   */
  window.openModelViewModal = function (itemId, itemType) {
    const modalEl = document.getElementById('dhModelViewModal');
    const bodyEl = document.getElementById('dhModelModalBody');
    if (!modalEl || !bodyEl) return;

    if (itemType === 'source') {
      const file = DATA_SOURCE_CATALOG.find(f => f.id === itemId);
      if (!file) return;

      let sampleRows = [];
      try {
        if (typeof file.sampleProvider === 'function') {
          sampleRows = file.sampleProvider() || [];
        }
      } catch (err) {
        console.warn('Error in sampleProvider for', file.id, err);
        sampleRows = [];
      }
      const sampleHeaders = sampleRows.length > 0 ? Object.keys(sampleRows[0]) : [];

      bodyEl.innerHTML = `
        <div class="modal-header dh-model-header">
          <div class="dh-model-title-group">
            <div class="dh-model-avatar" style="background:${file.badgeColor}22; color:${file.badgeColor};">
              ${file.icon}
            </div>
            <div>
              <div class="dh-model-badge-top">MODEL VIEW • แหล่งข้อมูลกลุ่ม ${file.groupNo}</div>
              <h3 class="dh-model-title">${escapeHtml(file.name)}</h3>
              <div class="dh-model-cat">${file.category}</div>
            </div>
          </div>
          <button class="modal-btn-close" onclick="window.closeDhModelModal()">✕</button>
        </div>

        <div class="modal-body dh-model-body">
          
          <!-- Key Meta Properties -->
          <div class="dh-model-meta-grid">
            <div class="dh-meta-box">
              <div class="dh-mb-label">📅 วันที่นำเข้าข้อมูล</div>
              <div class="dh-mb-val">${file.importDateTh}</div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">✏️ แก้ไขข้อมูลล่าสุด</div>
              <div class="dh-mb-val highlight-gold">${file.lastModifiedTh}</div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">💾 ไฟล์ที่จัดเก็บข้อมูลในระบบ</div>
              <div class="dh-mb-val"><code>${file.storageFile}</code></div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">📊 จำนวนข้อมูล / ขนาด</div>
              <div class="dh-mb-val">${file.recordCount.toLocaleString('th-TH')} รายการ (${file.sizeText})</div>
            </div>
          </div>

          <!-- Description Box -->
          <div class="dh-model-desc-box">
            <div class="dh-box-title">📝 คำอธิบายบทบาทและข้อมูลในไฟล์:</div>
            <p>${escapeHtml(file.description)}</p>
            <div class="dh-var-mapping">
              <strong>ตัวแปรจัดเก็บในระบบ:</strong> <code>${escapeHtml(file.storageVar)}</code>
            </div>
          </div>

          <!-- Mapped Columns Structure -->
          <div style="margin-top:1rem;">
            <div class="dh-box-title">🏷️ โครงสร้างคอลัมน์สำคัญที่ผสานเข้าระบบ (${file.columns.length} ฟิลด์):</div>
            <div class="dh-columns-pill-container">
              ${file.columns.map(col => `<span class="dh-col-pill">${escapeHtml(col)}</span>`).join('')}
            </div>
          </div>

          <!-- Live Sample Data Preview Table -->
          <div style="margin-top:1.25rem;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div class="dh-box-title" style="margin:0;">
                👀 ตัวอย่างข้อมูลจริงที่โหลดอยู่ในระบบ (Live Data Preview 5 รายการแรก):
              </div>
              <span style="font-size:0.75rem; color:var(--text-muted);">อ่านตรงจากตัวแปรหน่วยความจำ</span>
            </div>

            <div class="table-responsive dh-sample-table-wrap">
              ${sampleRows.length > 0 ? `
                <table class="data-table dh-preview-table">
                  <thead>
                    <tr>
                      <th style="width:40px; text-align:center;">#</th>
                      ${sampleHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('')}
                    </tr>
                  </thead>
                  <tbody>
                    ${sampleRows.map((row, idx) => `
                      <tr>
                        <td style="text-align:center; color:var(--text-muted); font-size:0.8rem;">${idx + 1}</td>
                        ${sampleHeaders.map(h => `<td>${escapeHtml(row[h] || '-')}</td>`).join('')}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : `
                <div style="text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.85rem;">
                  ไม่มีตัวอย่างข้อมูลแสดงผล
                </div>
              `}
            </div>
          </div>

        </div>

        <div class="modal-footer dh-model-footer">
          <button class="btn btn-outline" onclick="window.copyTextToClipboard('${file.storageFile}', 'คัดลอกตำแหน่งจัดเก็บสำเร็จ')">
            📋 คัดลอกตำแหน่งไฟล์จัดเก็บ
          </button>
          <button class="btn btn-primary" onclick="window.closeDhModelModal()">ปิดหน้าต่าง Model View</button>
        </div>
      `;
    } else if (itemType === 'log') {
      const allLogs = getAllAuditLogs();
      const log = allLogs.find(l => l.id === itemId);
      if (!log) return;

      bodyEl.innerHTML = `
        <div class="modal-header dh-model-header">
          <div class="dh-model-title-group">
            <div class="dh-model-avatar" style="background:rgba(245,158,11,0.2); color:#FBBF24;">
              ✏️
            </div>
            <div>
              <div class="dh-model-badge-top">AUDIT LOG MODEL VIEW • รหัสประวัติ ${log.id}</div>
              <h3 class="dh-model-title">${escapeHtml(log.title)}</h3>
              <div class="dh-model-cat">${escapeHtml(log.typeBadge || log.type)}</div>
            </div>
          </div>
          <button class="modal-btn-close" onclick="window.closeDhModelModal()">✕</button>
        </div>

        <div class="modal-body dh-model-body">
          <div class="dh-model-meta-grid">
            <div class="dh-meta-box">
              <div class="dh-mb-label">🕒 วัน-เวลาที่มีการดำเนินการ</div>
              <div class="dh-mb-val highlight-gold">${log.timestampTh}</div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">👤 ผู้ดำเนินการ / ระบบ</div>
              <div class="dh-mb-val">${escapeHtml(log.author || 'ระบบ')}</div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">💾 ไฟล์ที่จัดเก็บข้อมูล</div>
              <div class="dh-mb-val"><code>${escapeHtml(log.storageFile)}</code></div>
            </div>
            <div class="dh-meta-box">
              <div class="dh-mb-label">📁 ไฟล์ต้นฉบับที่เกี่ยวข้อง</div>
              <div class="dh-mb-val">${escapeHtml(log.sourceFile || '-')}</div>
            </div>
          </div>

          <div class="dh-model-desc-box" style="margin-top:1rem;">
            <div class="dh-box-title">🎯 สรุปรายการสิ่งที่แก้ไข / นำเข้า:</div>
            <p style="font-size:0.95rem; font-weight:600; color:var(--text-main); margin-bottom:0.75rem;">
              ${escapeHtml(log.changeSummary)}
            </p>

            <div class="dh-box-title" style="margin-top:0.75rem;">🔍 รายละเอียดเชิงลึก:</div>
            <p style="color:var(--text-muted); line-height:1.6;">${escapeHtml(log.details)}</p>
          </div>

          <div style="background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:0.85rem; margin-top:1rem;">
            <div style="font-size:0.8rem; font-weight:700; color:#34D399; margin-bottom:0.25rem;">
              🛡️ ผลกระทบและการตรวจสอบความสมบูรณ์:
            </div>
            <div style="font-size:0.85rem; color:var(--text-main);">
              ${escapeHtml(log.impactLevel || 'ข้อมูลได้รับการบันทึกและตรวจสอบเรียบร้อยแล้ว')}
            </div>
          </div>
        </div>

        <div class="modal-footer dh-model-footer">
          <button class="btn btn-outline" onclick="window.copyTextToClipboard('${log.storageFile}', 'คัดลอกตำแหน่งจัดเก็บสำเร็จ')">
            📋 คัดลอกตำแหน่งไฟล์จัดเก็บ
          </button>
          <button class="btn btn-primary" onclick="window.closeDhModelModal()">ปิดหน้าต่าง Model View</button>
        </div>
      `;
    }

    modalEl.classList.add('show');
    modalEl.style.display = 'flex';
  };

  window.closeDhModelModal = function () {
    const modalEl = document.getElementById('dhModelViewModal');
    if (modalEl) {
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
    }
  };

  window.openDhAddLogModal = function () {
    const modalEl = document.getElementById('dhAddLogModal');
    if (modalEl) {
      modalEl.classList.add('show');
      modalEl.style.display = 'flex';
    }
  };

  window.closeDhAddLogModal = function () {
    const modalEl = document.getElementById('dhAddLogModal');
    if (modalEl) {
      modalEl.classList.remove('show');
      modalEl.style.display = 'none';
    }
  };

  /**
   * Submit Custom Log from Modal
   */
  window.submitCustomLog = function () {
    const type = document.getElementById('dhInputLogType').value;
    const title = (document.getElementById('dhInputTitle').value || '').trim();
    const storageFile = (document.getElementById('dhInputStorageFile').value || '').trim();
    const changeSummary = (document.getElementById('dhInputSummary').value || '').trim();
    const details = (document.getElementById('dhInputDetails').value || '').trim();
    const author = (document.getElementById('dhInputAuthor').value || '').trim();

    if (!title || !changeSummary) {
      if (window.showToast) window.showToast('กรุณากรอกหัวข้อและสรุปสิ่งที่แก้ไข', 'warning');
      return;
    }

    const now = new Date();
    const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} น.`;
    const dateStr = `${now.getDate()} ${monthsTh[now.getMonth()]} ${now.getFullYear() + 543}, ${timeStr}`;

    const typeBadges = {
      EDIT: 'แก้ไขข้อมูล',
      IMPORT: 'นำเข้าข้อมูล',
      MERGE: 'ผสานรวมไฟล์',
      CONFIG: 'ตั้งค่าระบบ'
    };

    const newLog = {
      id: 'log_custom_' + Date.now(),
      timestamp: now.toISOString(),
      timestampTh: dateStr,
      type: type,
      typeBadge: typeBadges[type] || type,
      badgeClass: type === 'IMPORT' ? 'badge-type-import' : 'badge-type-edit',
      title: title,
      targetSubject: title,
      storageFile: storageFile || 'js/data_wbs.js',
      changeSummary: changeSummary,
      details: details || changeSummary,
      sourceFile: 'บันทึกด้วยตนเองผ่านแดชบอร์ด',
      author: author || 'ผู้ใช้งาน',
      impactLevel: 'บันทึกประวัติการแก้ไขข้อมูลเรียบร้อย'
    };

    if (saveCustomLog(newLog)) {
      window.closeDhAddLogModal();
      if (window.showToast) window.showToast('บันทึกประวัติการแก้ไขข้อมูลสำเร็จ', 'success');
      window.renderDataHistoryTab();
      // Switch to timeline view to see newly added log
      setTimeout(() => {
        const btn = document.getElementById('dhBtnViewTimelineLog');
        if (btn) btn.click();
      }, 50);
    }
  };

  /**
   * Setup Event Listeners for Tab
   */
  function setupDhEventListeners() {
    // 1. Sub-view Switcher (Model Flow vs Timeline vs Storage Files)
    const viewBtns = document.querySelectorAll('.dh-view-tab-btn');
    viewBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-dh-view');
        viewBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.dh-view-content').forEach(c => c.classList.remove('active'));
        if (targetView === 'model-flow') {
          const el = document.getElementById('dhContentModelFlow');
          if (el) el.classList.add('active');
        } else if (targetView === 'timeline-log') {
          const el = document.getElementById('dhContentTimelineLog');
          if (el) el.classList.add('active');
        } else if (targetView === 'storage-files') {
          const el = document.getElementById('dhContentStorageFiles');
          if (el) el.classList.add('active');
        }
      });
    });

    // 2. Search & Filter in Timeline Log
    const searchInput = document.getElementById('dhLogSearchInput');
    const typeSelect = document.getElementById('dhLogTypeFilter');

    function applyLogFilters() {
      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const type = typeSelect ? typeSelect.value : 'ALL';
      const allLogs = getAllAuditLogs();

      const filtered = allLogs.filter(log => {
        if (type !== 'ALL' && log.type !== type) return false;
        if (q) {
          const str = `${log.title} ${log.changeSummary} ${log.details} ${log.storageFile} ${log.sourceFile} ${log.author} ${log.timestampTh}`.toLowerCase();
          if (!str.includes(q)) return false;
        }
        return true;
      });

      const listContainer = document.getElementById('dhTimelineList');
      const countEl = document.getElementById('dhVisibleLogCount');
      if (listContainer) listContainer.innerHTML = renderTimelineItemsHtml(filtered);
      if (countEl) countEl.innerText = filtered.length;
    }

    if (searchInput) searchInput.addEventListener('input', applyLogFilters);
    if (typeSelect) typeSelect.addEventListener('change', applyLogFilters);

    // 3. Add Manual Log Button
    const btnAddLog = document.getElementById('btnDhAddManualLog');
    if (btnAddLog) {
      btnAddLog.addEventListener('click', window.openDhAddLogModal);
    }

    // 4. Modal Backdrop Clicks
    const modelBackdrop = document.getElementById('dhModelViewModal');
    if (modelBackdrop) {
      modelBackdrop.addEventListener('click', (e) => {
        if (e.target === modelBackdrop) window.closeDhModelModal();
      });
    }

    const addLogBackdrop = document.getElementById('dhAddLogModal');
    if (addLogBackdrop) {
      addLogBackdrop.addEventListener('click', (e) => {
        if (e.target === addLogBackdrop) window.closeDhAddLogModal();
      });
    }
  }

  /**
   * Hook into Live File Import to automatically register new logs
   */
  window.recordLiveImportAuditLog = function (fileName, recordCount, storageFile) {
    const now = new Date();
    const monthsTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} น.`;
    const dateStr = `${now.getDate()} ${monthsTh[now.getMonth()]} ${now.getFullYear() + 543}, ${timeStr}`;

    const newLog = {
      id: 'log_live_' + Date.now(),
      timestamp: now.toISOString(),
      timestampTh: dateStr,
      type: 'IMPORT',
      typeBadge: 'นำเข้าไฟล์ใหม่',
      badgeClass: 'badge-type-import',
      title: `นำเข้าไฟล์ ${fileName} สู่ระบบเรียบร้อย`,
      targetSubject: fileName,
      storageFile: storageFile || 'js/data_wbs.js',
      changeSummary: `อ่านข้อมูลจากไฟล์ ${fileName} สำเร็จ ${recordCount ? recordCount.toLocaleString('th-TH') + ' รายการ' : ''}`,
      details: `ไฟล์ ${fileName} ถูกอัปโหลดผ่านหน้าเว็บและบันทึกประวัติการนำเข้าในระบบอัตโนมัติ`,
      sourceFile: fileName,
      author: 'ผู้นำเข้าข้อมูลผ่านหน้าเว็บ',
      impactLevel: 'ข้อมูลในระบบได้รับการอัปเดตเป็นชุดข้อมูลล่าสุด'
    };

    saveCustomLog(newLog);
  };

  // Auto-render on page load so tab content is already in the DOM
  function initDataHistoryOnLoad() {
    if (window.renderDataHistoryTab) {
      try {
        window.renderDataHistoryTab();
      } catch (err) {
        console.error('Error auto-rendering data history tab:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(initDataHistoryOnLoad, 80);
    });
  } else {
    setTimeout(initDataHistoryOnLoad, 80);
  }

})();
