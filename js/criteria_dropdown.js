/**
 * Criteria Dropdown (ตัวเลือกเกณฑ์วัด ข้อ 1.1 - 5)
 * ------------------------------------------------------------
 * แทนการแสดงผลของ <select id="filterCriteria"> ด้วย dropdown แบบกำหนดเอง
 * เพื่อให้ป้ายหน่วยวัด (มูลค่า / งาน / มูลค่า/งาน) ชิดขวาสุดทุกตัวเลือก
 * และมีสีพื้นหลังโดดเด่น (<option> แบบ native จัดชิดขวา/ใส่สีเฉพาะส่วนไม่ได้)
 *
 * - <select> เดิมยังอยู่ใน DOM (ซ่อนด้วย CSS) เป็นแหล่งข้อมูลหลัก:
 *   value / change event / การ populate ใน app.js ทำงานเหมือนเดิมทุกอย่าง
 * - อ่านหน่วยจาก attribute data-unit ของ <option> (value | job | all)
 */
(function () {
  'use strict';

  var UNIT_LABEL = { value: 'มูลค่า', job: 'งาน', all: 'มูลค่า/งาน' };

  function unitOf(opt) {
    var u = opt.getAttribute('data-unit');
    if (u && UNIT_LABEL[u]) return u;
    if (opt.value === 'ALL') return 'all';
    if (/TECO/i.test(opt.value) || /(^|\D)3\.\d/.test(opt.value)) return 'job';
    return 'value';
  }

  function pillHtml(kind) {
    return '<span class="crit-unit-pill crit-unit-' + kind + '">' + UNIT_LABEL[kind] + '</span>';
  }

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  function init() {
    var sel = document.getElementById('filterCriteria');
    if (!sel || sel.getAttribute('data-dd-ready')) return;
    sel.setAttribute('data-dd-ready', '1');

    var group = sel.closest('.top-filter-group');

    // ---- โครงสร้าง: wrapper + ปุ่ม trigger (ในแถบตัวกรอง) / panel (ลอยบน body) ----
    var wrap = document.createElement('div');
    wrap.className = 'crit-dd';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(sel);
    sel.classList.add('crit-native-hidden');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'crit-dd-trigger';
    trigger.id = 'critDdTrigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    wrap.appendChild(trigger);

    var panel = document.createElement('div');
    panel.className = 'crit-dd-panel';
    panel.id = 'critDdPanel';
    panel.setAttribute('role', 'listbox');
    document.body.appendChild(panel);

    var focusIdx = -1;

    function selectedOption() {
      return sel.options[sel.selectedIndex] || sel.options[0] || null;
    }

    function refresh() {
      var opt = selectedOption();
      if (opt) {
        var kind = unitOf(opt);
        trigger.innerHTML =
          '<span class="crit-dd-text">' + escapeText(opt.textContent) + '</span>' +
          '<svg class="crit-dd-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"></path></svg>';
        trigger.title = opt.textContent + ' · หน่วยวัด: ' + UNIT_LABEL[kind];
      }
      var rows = panel.querySelectorAll('.crit-dd-option');
      for (var i = 0; i < rows.length; i++) {
        var on = rows[i].getAttribute('data-value') === sel.value;
        rows[i].classList.toggle('selected', on);
        rows[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
    }

    function buildPanel() {
      var html = '';
      for (var i = 0; i < sel.options.length; i++) {
        var o = sel.options[i];
        html += '<div class="crit-dd-option' + (o.value === 'ALL' ? ' crit-dd-all' : '') +
          '" role="option" data-idx="' + i + '" data-value="' + escapeText(o.value) + '">' +
          '<span class="crit-dd-name">' + escapeText(o.textContent) + '</span>' +
          pillHtml(unitOf(o)) + '</div>';
      }
      panel.innerHTML = html;
      refresh();
    }

    function isOpen() { return panel.classList.contains('open'); }

    function position() {
      var anchor = group || wrap;
      var r = anchor.getBoundingClientRect();
      panel.style.minWidth = Math.max(r.width, 400) + 'px';
      panel.style.left = r.left + 'px';
      panel.style.top = (r.bottom + 6) + 'px';
      panel.style.maxHeight = Math.max(160, window.innerHeight - r.bottom - 18) + 'px';
      var pw = panel.offsetWidth;
      var left = Math.max(8, Math.min(r.left, window.innerWidth - pw - 8));
      panel.style.left = left + 'px';
    }

    function setFocus(i) {
      var rows = panel.querySelectorAll('.crit-dd-option');
      if (!rows.length) return;
      focusIdx = Math.max(0, Math.min(rows.length - 1, i));
      for (var k = 0; k < rows.length; k++) rows[k].classList.toggle('focused', k === focusIdx);
      rows[focusIdx].scrollIntoView({ block: 'nearest' });
    }

    function open() {
      if (isOpen()) return;
      position();
      panel.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      group && group.classList.add('crit-dd-open');
      position();
      setFocus(sel.selectedIndex);
    }

    function close() {
      if (!isOpen()) return;
      panel.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      group && group.classList.remove('crit-dd-open');
    }

    function choose(idx) {
      var o = sel.options[idx];
      if (!o) return;
      var changed = sel.value !== o.value;
      sel.value = o.value;
      refresh();
      close();
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // ---- เหตุการณ์ ----
    trigger.addEventListener('click', function () { isOpen() ? close() : open(); });

    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen()) { open(); return; }
        setFocus(focusIdx + (e.key === 'ArrowDown' ? 1 : -1));
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (isOpen()) choose(focusIdx); else open();
      } else if (e.key === 'Escape') {
        close();
      }
    });

    panel.addEventListener('mousedown', function (e) { e.preventDefault(); });
    panel.addEventListener('click', function (e) {
      var row = e.target.closest('.crit-dd-option');
      if (row) choose(parseInt(row.getAttribute('data-idx'), 10));
    });
    panel.addEventListener('mousemove', function (e) {
      var row = e.target.closest('.crit-dd-option');
      if (row) setFocus(parseInt(row.getAttribute('data-idx'), 10));
    });

    document.addEventListener('mousedown', function (e) {
      if (isOpen() && !panel.contains(e.target) && !wrap.contains(e.target)) close();
    });
    window.addEventListener('resize', close);
    window.addEventListener('scroll', function (e) {
      if (isOpen() && !panel.contains(e.target)) close();
    }, true);

    // คลิกป้ายชื่อ "เกณฑ์วัด:" ให้เปิด/ปิดรายการ
    var label = group && group.querySelector('label[for="filterCriteria"]');
    if (label) {
      label.addEventListener('click', function (e) {
        e.preventDefault();
        trigger.focus();
        isOpen() ? close() : open();
      });
    }

    // ---- ซิงก์กับ <select> เดิม ----
    // 1) app.js เขียน options ใหม่ (innerHTML) -> สร้างรายการใหม่
    new MutationObserver(buildPanel).observe(sel, { childList: true });
    // 2) โค้ดเดิมกำหนด select.value ตรงๆ (ไม่มี event) -> รีเฟรชปุ่มแสดงผล
    var desc = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(sel, 'value', {
      configurable: true,
      get: function () { return desc.get.call(this); },
      set: function (v) { desc.set.call(this, v); refresh(); }
    });
    sel.addEventListener('change', refresh);

    buildPanel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
